'use strict';
/**
 * services/studentService.js  (MongoDB/Mongoose version)
 * Business logic for students.
 *
 * All model functions are now async (Mongoose). The service functions
 * are updated to be async/await accordingly.
 */
const studentModel  = require('../models/studentModel');
const { newId }     = require('../utils/idGenerator');

/** Mirror of frontend hashPassword from storage.js (for legacy auth) */
function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Buffer.from(String(hash) + password.length + password.slice(-2)).toString('base64');
}

async function getAll() {
  return studentModel.findAll();
}

async function getById(id) {
  return studentModel.findById(id);
}

async function create(body) {
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

  if (await studentModel.findByEmailRaw(email)) {
    const err = new Error('Email is already registered.'); err.statusCode = 409; throw err;
  }
  if (await studentModel.findByUsernameRaw(username)) {
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
  };

  return studentModel.create(student);
}

async function update(id, body) {
  const existing = await studentModel.findRaw(s => s.id === id || s.legacyId === id);
  if (!existing) return null;

  const updated = {
    ...existing,
    ...body,
    id,
    role: existing.role,
  };

  return studentModel.update(id, updated);
}

async function patch(id, fields) {
  const { id: _id, role: _role, password: _pw, ...safe } = fields;
  const existing = await studentModel.findRaw(s => s.id === id || s.legacyId === id);
  if (!existing) return null;
  return studentModel.patch(id, safe);
}

async function remove(id) {
  return studentModel.remove(id);
}

async function authenticate(email, password) {
  if (!email || !password) return null;
  const student = await studentModel.findByEmailRaw(email.trim());
  if (!student) return null;
  const hashed = hashPassword(password);
  if (student.password !== hashed && student.password !== password) return null;
  return studentModel.strip(student);
}

module.exports = { getAll, getById, create, update, patch, remove, authenticate, hashPassword };
