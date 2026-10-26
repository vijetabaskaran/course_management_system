'use strict';
/**
 * services/enrollmentService.js
 * Business logic for enrollments.
 */
const enrollmentModel = require('../models/enrollmentModel');
const courseModel     = require('../models/courseModel');
const studentModel    = require('../models/studentModel');
const { newId }       = require('../utils/idGenerator');

function getAll() {
  return enrollmentModel.findAll();
}

function getById(id) {
  return enrollmentModel.findById(id);
}

function create(body) {
  const { studentEmail, courseId } = body;

  if (!studentEmail || !courseId) {
    const err = new Error('studentEmail and courseId are required.'); err.statusCode = 400; throw err;
  }

  // Validate referenced student exists (case-insensitive)
  const student = studentModel.findByEmailRaw(studentEmail);
  if (!student) {
    const err = new Error(`Student with email "${studentEmail}" not found.`); err.statusCode = 404; throw err;
  }

  // Validate referenced course exists
  const course = courseModel.findById(courseId);
  if (!course) {
    const err = new Error(`Course with id "${courseId}" not found.`); err.statusCode = 404; throw err;
  }

  // Prevent duplicate enrollment
  const existing = enrollmentModel.findByStudentAndCourse(studentEmail, courseId);
  if (existing) {
    const err = new Error('Student is already enrolled in this course.'); err.statusCode = 409; throw err;
  }

  const enrollment = {
    id:           body.id || newId(),
    studentEmail: studentEmail.toLowerCase(),
    courseId,
    enrolledAt:   body.enrolledAt || Date.now(),
  };

  return enrollmentModel.create(enrollment);
}

function patch(id, fields) {
  const existing = enrollmentModel.findById(id);
  if (!existing) return null;
  // Prevent changing the core references
  const { id: _id, studentEmail: _email, courseId: _cid, ...safe } = fields;
  return enrollmentModel.patch(id, safe);
}

function remove(id) {
  return enrollmentModel.remove(id);
}

module.exports = { getAll, getById, create, patch, remove };