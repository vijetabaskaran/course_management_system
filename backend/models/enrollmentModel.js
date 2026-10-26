'use strict';
/**
 * models/enrollmentModel.js
 * Enrollment data-access functions.
 */
const { readDB, writeDB } = require('../config/db');

function findAll() {
  return readDB().enrollments;
}

function findById(id) {
  return readDB().enrollments.find(e => e.id === id) || null;
}

function findByStudentAndCourse(studentEmail, courseId) {
  return readDB().enrollments.find(
    e => e.studentEmail === studentEmail && e.courseId === courseId
  ) || null;
}

function create(enrollmentData) {
  const db = readDB();
  db.enrollments.push(enrollmentData);
  writeDB(db);
  return enrollmentData;
}

function patch(id, fields) {
  const db  = readDB();
  const idx = db.enrollments.findIndex(e => e.id === id);
  if (idx === -1) return null;
  db.enrollments[idx] = { ...db.enrollments[idx], ...fields };
  writeDB(db);
  return db.enrollments[idx];
}

function remove(id) {
  const db  = readDB();
  const idx = db.enrollments.findIndex(e => e.id === id);
  if (idx === -1) return null;
  const [deleted] = db.enrollments.splice(idx, 1);
  writeDB(db);
  return deleted;
}

/** Remove all enrollments for a given course (called on course deletion). */
function removeByCourse(courseId) {
  const db      = readDB();
  const removed = db.enrollments.filter(e => e.courseId === courseId);
  db.enrollments = db.enrollments.filter(e => e.courseId !== courseId);
  writeDB(db);
  return removed;
}

module.exports = { findAll, findById, findByStudentAndCourse, create, patch, remove, removeByCourse };