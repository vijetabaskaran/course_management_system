'use strict';
/**
 * models/studentModel.js
 * Student data-access functions.
 * IMPORTANT: Password hashes are stored in the JSON file.
 * The strip() helper below removes sensitive fields before any response leaves the server.
 */
const { readDB, writeDB } = require('../config/db');

/** Remove password hash before sending to the client. */
function strip(student) {
  if (!student) return null;
  const { password: _pw, ...safe } = student;
  return safe;
}

function findAll() {
  return readDB().students.map(strip);
}

/** Raw find — includes password hash. Only used internally for auth. */
function findRaw(predicate) {
  return readDB().students.find(predicate) || null;
}

function findById(id) {
  return strip(readDB().students.find(s => s.id === id) || null);
}

function findByEmailRaw(email) {
  return findRaw(s => s.email.toLowerCase() === email.toLowerCase());
}

function findByEmail(email) {
  return strip(findByEmailRaw(email));
}

function findByUsernameRaw(username) {
  return findRaw(s => s.username.toLowerCase() === username.toLowerCase());
}

function create(studentData) {
  const db = readDB();
  db.students.push(studentData);
  writeDB(db);
  return strip(studentData);
}

function update(id, studentData) {
  const db  = readDB();
  const idx = db.students.findIndex(s => s.id === id);
  if (idx === -1) return null;
  db.students[idx] = studentData;
  writeDB(db);
  return strip(db.students[idx]);
}

function patch(id, fields) {
  const db  = readDB();
  const idx = db.students.findIndex(s => s.id === id);
  if (idx === -1) return null;
  db.students[idx] = { ...db.students[idx], ...fields };
  writeDB(db);
  return strip(db.students[idx]);
}

function remove(id) {
  const db  = readDB();
  const idx = db.students.findIndex(s => s.id === id);
  if (idx === -1) return null;
  const [deleted] = db.students.splice(idx, 1);
  writeDB(db);
  return strip(deleted);
}

module.exports = {
  strip,
  findAll,
  findRaw,
  findById,
  findByEmail,
  findByEmailRaw,
  findByUsernameRaw,
  create,
  update,
  patch,
  remove,
};