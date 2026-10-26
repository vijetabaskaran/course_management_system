'use strict';
/**
 * models/courseModel.js
 * Course data-access functions. All reads/writes are through config/db.js.
 * Business logic lives in services/; this layer only handles persistence.
 */
const { readDB, writeDB } = require('../config/db');

function findAll() {
  return readDB().courses;
}

function findById(id) {
  return readDB().courses.find(c => c.id === id) || null;
}

function findByCode(code) {
  return readDB().courses.find(
    c => c.code && c.code.toLowerCase() === code.toLowerCase()
  ) || null;
}

function create(courseData) {
  const db = readDB();
  db.courses.push(courseData);
  writeDB(db);
  return courseData;
}

function update(id, courseData) {
  const db  = readDB();
  const idx = db.courses.findIndex(c => c.id === id);
  if (idx === -1) return null;
  db.courses[idx] = courseData;
  writeDB(db);
  return db.courses[idx];
}

function remove(id) {
  const db  = readDB();
  const idx = db.courses.findIndex(c => c.id === id);
  if (idx === -1) return null;
  const [deleted] = db.courses.splice(idx, 1);
  writeDB(db);
  return deleted;
}

module.exports = { findAll, findById, findByCode, create, update, remove };