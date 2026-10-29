'use strict';
/**
 * services/authService.js
 * Business logic for Task 9 (registration/login) and Task 10 (JWT issuance).
 *
 * Password strategy:
 *   New registrations via /api/v1/auth/register use bcrypt (secure).
 *   The existing student records in db.json use the legacy djb2+btoa hash,
 *   which only the legacy /students/login endpoint still handles for
 *   backwards compatibility with existing users.
 *
 * Security notes:
 *   - Passwords are NEVER returned in responses.
 *   - Password hashes are NEVER placed in JWT payloads.
 *   - JWT_SECRET must be set in .env; the service throws a config error if missing.
 *   - Emails are normalised to lowercase on both register and login.
 */
const bcrypt        = require('bcryptjs');
const jwt           = require('jsonwebtoken');
const studentModel  = require('../models/studentModel');
const { newId }     = require('../utils/idGenerator');

const BCRYPT_ROUNDS = 12; // secure salt rounds

/**
 * Sign and return a JWT for the given student.
 * Payload: { sub: id, email }  — no passwords, no hashes.
 */
function signToken(student) {
  const secret    = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '1h';

  if (!secret) {
    const err = new Error('JWT_SECRET environment variable is not configured.');
    err.statusCode = 500;
    throw err;
  }

  return jwt.sign(
    { sub: student.id, email: student.email },
    secret,
    { expiresIn }
  );
}

/**
 * Register a new student.
 * Accepts: { fullname, email, department, password }
 * Optionally: { username } — falls back to email local-part if not provided.
 *
 * Returns: { student (safe), token, tokenType, expiresIn }
 */
async function register(body) {
  const { fullname, email, department, password, username } = body || {};

  // ── Field presence checks ─────────────────────────────────
  if (!fullname || !fullname.trim()) {
    const err = new Error('Full name is required.'); err.statusCode = 400; throw err;
  }
  if (fullname.trim().length < 2) {
    const err = new Error('Full name must be at least 2 characters.'); err.statusCode = 400; throw err;
  }

  if (!email || !email.trim()) {
    const err = new Error('Email is required.'); err.statusCode = 400; throw err;
  }
  const normEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) {
    const err = new Error('Email address is invalid.'); err.statusCode = 400; throw err;
  }

  if (!department || !department.trim()) {
    const err = new Error('Department is required.'); err.statusCode = 400; throw err;
  }

  if (!password) {
    const err = new Error('Password is required.'); err.statusCode = 400; throw err;
  }
  if (password.length < 8) {
    const err = new Error('Password must be at least 8 characters long.'); err.statusCode = 400; throw err;
  }
  if (password.length > 72) {
    const err = new Error('Password must not exceed 72 characters.'); err.statusCode = 400; throw err;
  }

  // ── Duplicate email check ──────────────────────────────────
  if (studentModel.findByEmailRaw(normEmail)) {
    const err = new Error('An account with this email already exists.'); err.statusCode = 409; throw err;
  }

  // ── Derive username from email local-part if not provided ──
  // (The existing student model requires a username field)
  let resolvedUsername = username ? username.trim().toLowerCase() : normEmail.split('@')[0];
  // If username already taken, append a random suffix
  if (studentModel.findByUsernameRaw(resolvedUsername)) {
    resolvedUsername = resolvedUsername + '_' + Math.random().toString(36).slice(2, 6);
  }

  // ── Hash password with bcrypt ──────────────────────────────
  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // ── Build student record ───────────────────────────────────
  const student = {
    id:         newId(),
    fullname:   fullname.trim(),
    email:      normEmail,
    username:   resolvedUsername,
    department: department.trim(),
    password:   hashedPassword,   // bcrypt hash — stored in db.json, never returned
    role:       'student',
    authScheme: 'bcrypt',         // distinguishes new registrations from legacy records
    createdAt:  Date.now(),
  };

  // Persist and get back the safe (password-stripped) version
  const safeStudent = studentModel.create(student);

  // ── Issue JWT ──────────────────────────────────────────────
  const token = signToken(safeStudent.id ? safeStudent : student);
  const expiresIn = process.env.JWT_EXPIRES_IN || '1h';

  return {
    message:   'Registration successful.',
    token,
    tokenType: 'Bearer',
    expiresIn,
    student:   safeStudent,  // no password field
  };
}

/**
 * Authenticate a student and return a JWT.
 * Accepts: { email, password }
 *
 * Handles both:
 *  - bcrypt-hashed passwords (new registrations via /api/v1/auth/register)
 *  - Legacy djb2+btoa passwords (existing records from before this task)
 *
 * Returns: { student (safe), token, tokenType, expiresIn }
 */
async function login(body) {
  const { email, password } = body || {};

  if (!email || !email.trim()) {
    const err = new Error('Email is required.'); err.statusCode = 400; throw err;
  }
  if (!password) {
    const err = new Error('Password is required.'); err.statusCode = 400; throw err;
  }

  const normEmail = email.trim().toLowerCase();

  // Retrieve the raw student record (includes password hash)
  const raw = studentModel.findByEmailRaw(normEmail);

  // Use a generic message for both "not found" and "wrong password"
  // to avoid user-enumeration attacks.
  if (!raw) {
    const err = new Error('Invalid email or password.'); err.statusCode = 401; throw err;
  }

  let passwordMatch = false;

  if (raw.authScheme === 'bcrypt') {
    // New-style bcrypt hash
    passwordMatch = await bcrypt.compare(password, raw.password);
  } else {
    // Legacy djb2+btoa hash — mirror of frontend hashPassword()
    const legacyHash = legacyHashPassword(password);
    passwordMatch = (raw.password === legacyHash || raw.password === password);
  }

  if (!passwordMatch) {
    const err = new Error('Invalid email or password.'); err.statusCode = 401; throw err;
  }

  const safeStudent = studentModel.strip(raw);

  const token     = signToken(raw);
  const expiresIn = process.env.JWT_EXPIRES_IN || '1h';

  return {
    message:   'Login successful.',
    token,
    tokenType: 'Bearer',
    expiresIn,
    student:   safeStudent,  // no password field
  };
}

/**
 * Legacy password hashing (mirrors frontend storage.js hashPassword).
 * Used only to authenticate students registered before this update.
 */
function legacyHashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Buffer.from(String(hash) + password.length + password.slice(-2)).toString('base64');
}

/**
 * Authenticate the hardcoded admin and return a JWT.
 * Credentials: admin@eduportal.com / Admin@123 (mirrored from frontend DEFAULT_ADMIN).
 * SECURITY: Only for demo use. A production system would store bcrypt-hashed admin creds.
 */
function adminLogin(body) {
  const { email, password } = body || {};
  if (!email || !password) {
    const err = new Error('Email and password are required.'); err.statusCode = 400; throw err;
  }

  const ADMIN_EMAIL = 'admin@eduportal.com';
  const ADMIN_HASH  = legacyHashPassword('Admin@123');

  const normEmail = email.trim().toLowerCase();
  const inputHash = legacyHashPassword(password);

  if (normEmail !== ADMIN_EMAIL || inputHash !== ADMIN_HASH) {
    const err = new Error('Invalid admin credentials.'); err.statusCode = 401; throw err;
  }

  const adminRecord = { id: 'admin-1', email: ADMIN_EMAIL };
  const token     = signToken(adminRecord);
  const expiresIn = process.env.JWT_EXPIRES_IN || '1h';

  return {
    message:   'Admin login successful.',
    token,
    tokenType: 'Bearer',
    expiresIn,
    user: { id: 'admin-1', email: ADMIN_EMAIL, username: 'admin', fullname: 'Administrator', role: 'admin' },
  };
}

module.exports = { register, login, adminLogin };
