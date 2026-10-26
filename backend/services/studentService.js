'use strict';
/**
 * services/studentService.js
 * Business logic for students.
 *
 * PASSWORD STRATEGY
 * =================
 * The existing frontend uses a custom weak hash stored as a Base64 string.
 * We keep that scheme intact on the backend for full compatibility with
 * existing student records in db.json — NO existing user is locked out.
 *
 * The hash function (mirrored from storage.js/hashPassword):
 *   hash = djb2 of the string, then btoa(hash + length + last2chars)
 *
 * Security note: This is not a cryptographically secure hash. Acceptable for
 * a local development / course management demo. If this were production-facing,
 * bcrypt or Argon2 would be required and a migration script would re-hash all
 * existing passwords on first login.
 */
const studentModel  = require('../models/studentModel');
const { newId }     = require('../utils/idGenerator');

/** Mirror of frontend hashPassword from storage.js */
function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Buffer.from(String(hash) + password.length + password.slice(-2)).toString('base64');
}

function getAll() {
  // studentModel.findAll() already strips passwords
  return studentModel.findAll();
}

function getById(id) {
  return studentModel.findById(id);
}

/**
 * Create a new student.
 * The frontend pre-hashes the password before sending it; we accept the hash as-is
 * so no double-hashing occurs. If the frontend sends plaintext (future migration),
 * the backend would hash it here.
 */
function create(body) {
  // Required field validation
  const { fullname, email, username, password } = body;
  if (!fullname || !fullname.trim()) {
    const err = new Error('Full name is required.'); err.statusCode = 400; throw err;
  }
  if (!email || !email.trim()) {
    const err = new Error('Email is required.'); err.statusCode = 400; throw err;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const err = new Error('Email address is invalid.'); err.statusCode = 400; throw err;
  }
  if (!username || !username.trim()) {
    const err = new Error('Username is required.'); err.statusCode = 400; throw err;
  }
  if (!password) {
    const err = new Error('Password is required.'); err.statusCode = 400; throw err;
  }

  // Duplicate checks (case-insensitive)
  if (studentModel.findByEmailRaw(email)) {
    const err = new Error('Email is already registered.'); err.statusCode = 409; throw err;
  }
  if (studentModel.findByUsernameRaw(username)) {
    const err = new Error('Username is already taken.'); err.statusCode = 409; throw err;
  }

  const student = {
    ...body,
    id:        body.id  || newId(),
    fullname:  fullname.trim(),
    email:     email.trim().toLowerCase(),
    username:  username.trim().toLowerCase(),
    role:      body.role || 'student',
    createdAt: body.createdAt || Date.now(),
    // password is accepted as-is (pre-hashed by frontend)
  };

  return studentModel.create(student); // returns stripped (no password)
}

function update(id, body) {
  const existing = studentModel.findRaw(s => s.id === id);
  if (!existing) return null;

  // Don't let callers change the id or role arbitrarily
  const updated = {
    ...existing,
    ...body,
    id,
    role: existing.role, // preserve role
  };

  return studentModel.update(id, updated);
}

function patch(id, fields) {
  // Prevent patching sensitive or immutable fields
  const { id: _id, role: _role, password: _pw, ...safe } = fields;
  const existing = studentModel.findRaw(s => s.id === id);
  if (!existing) return null;
  return studentModel.patch(id, safe);
}

function remove(id) {
  return studentModel.remove(id);
}

/**
 * Authenticate a student.
 * Called by the frontend's login flow via GET /students (it fetches all and
 * compares client-side). We expose this service function for future use if
 * login is moved server-side.
 */
function authenticate(email, password) {
  if (!email || !password) return null;
  const student = studentModel.findByEmailRaw(email.trim());
  if (!student) return null;
  const hashed = hashPassword(password);
  // Match either hashed plaintext or pre-hashed password
  if (student.password !== hashed && student.password !== password) return null;
  return studentModel.strip(student); // safe object, no password
}

module.exports = { getAll, getById, create, update, patch, remove, authenticate, hashPassword };