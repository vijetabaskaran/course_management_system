'use strict';
/**
 * services/enrollmentService.js  (MongoDB/Mongoose version)
 * Business logic for student course enrollments (Task 12).
 * All model operations are now async/await.
 */
const enrollmentModel = require('../models/enrollmentModel');
const courseModel     = require('../models/courseModel');
const courseService   = require('./courseService');
const studentModel    = require('../models/studentModel');
const { newId }       = require('../utils/idGenerator');

async function getAll() {
  return enrollmentModel.findAll();
}

async function getById(id) {
  return enrollmentModel.findById(id);
}

/**
 * Enroll an authenticated student in a course.
 */
async function enroll(user, courseId) {
  if (!user || (!user.email && !user.id)) {
    const err = new Error('Authentication required. Invalid or missing student identity.');
    err.statusCode = 401;
    throw err;
  }

  if (!courseId || typeof courseId !== 'string' || !courseId.trim()) {
    const err = new Error('A valid courseId is required in the request body.');
    err.statusCode = 400;
    throw err;
  }

  const cleanCourseId = courseId.trim();

  const course = await courseModel.findById(cleanCourseId);
  if (!course) {
    const err = new Error(`Course with ID "${cleanCourseId}" does not exist.`);
    err.statusCode = 404;
    throw err;
  }

  const studentEmail = (user.email || '').toLowerCase().trim();
  const existing = await enrollmentModel.findByStudentAndCourse(studentEmail || user.id, cleanCourseId);
  if (existing) {
    const err = new Error(`You are already enrolled in course "${course.title || course.name}".`);
    err.statusCode = 409;
    throw err;
  }

  const now = Date.now();
  const enrollment = {
    id:           newId(),
    studentId:    user.id || '',
    studentEmail,
    courseId:     cleanCourseId,
    status:       'active',
    enrolledAt:   now,
    createdAt:    now,
    updatedAt:    now,
  };

  return enrollmentModel.create(enrollment);
}

/**
 * Retrieve the authenticated student's enrolled courses with populated course details.
 */
async function getMyCourses(user) {
  if (!user || (!user.email && !user.id)) {
    const err = new Error('Authentication required. Invalid or missing student identity.');
    err.statusCode = 401;
    throw err;
  }

  const studentRef = (user.email || user.id || '').toLowerCase().trim();
  const rawEnrollments = await enrollmentModel.findByStudent(studentRef);

  const populated = await Promise.all(rawEnrollments.map(async e => {
    const courseDetails = await courseService.getById(e.courseId)
      || await courseModel.findById(e.courseId)
      || null;
    return { ...e, course: courseDetails };
  }));

  populated.sort((a, b) => {
    const timeA = a.enrolledAt || a.createdAt || 0;
    const timeB = b.enrolledAt || b.createdAt || 0;
    return timeB - timeA;
  });

  return { count: populated.length, enrollments: populated };
}

/**
 * Permanently unenroll an authenticated student from a course.
 */
async function unenroll(user, courseIdOrParam) {
  if (!user || (!user.email && !user.id)) {
    const err = new Error('Authentication required. Invalid or missing student identity.');
    err.statusCode = 401;
    throw err;
  }

  if (!courseIdOrParam || !String(courseIdOrParam).trim()) {
    const err = new Error('Course identifier is required for unenrollment.');
    err.statusCode = 400;
    throw err;
  }

  const targetParam = String(courseIdOrParam).trim();
  const studentRef  = (user.email || user.id || '').toLowerCase().trim();

  let existing = await enrollmentModel.findByStudentAndCourse(studentRef, targetParam);

  if (!existing) {
    const byId = await enrollmentModel.findById(targetParam);
    if (byId && (
      (byId.studentEmail && byId.studentEmail.toLowerCase() === studentRef) ||
      (byId.studentId && String(byId.studentId) === String(user.id))
    )) {
      existing = byId;
    }
  }

  if (!existing) {
    const err = new Error(`You are not enrolled in course "${targetParam}".`);
    err.statusCode = 404;
    throw err;
  }

  const isOwner =
    (existing.studentEmail && existing.studentEmail.toLowerCase() === studentRef) ||
    (existing.studentId && String(existing.studentId) === String(user.id));

  if (!isOwner) {
    const err = new Error('Forbidden: You cannot modify another student\'s enrollment.');
    err.statusCode = 403;
    throw err;
  }

  const deleted = await enrollmentModel.remove(existing.id);

  return {
    message: 'Successfully unenrolled from course.',
    unregisteredCourseId: existing.courseId,
    deleted,
  };
}

/**
 * Legacy creation helper.
 */
async function create(body, user) {
  if (user) {
    return enroll(user, body.courseId);
  }
  const { studentEmail, courseId } = body || {};

  if (!studentEmail || !courseId) {
    const err = new Error('studentEmail and courseId are required.');
    err.statusCode = 400;
    throw err;
  }

  const student = await studentModel.findByEmailRaw(studentEmail);
  if (!student) {
    const err = new Error(`Student with email "${studentEmail}" not found.`);
    err.statusCode = 404;
    throw err;
  }

  const course = await courseModel.findById(courseId);
  if (!course) {
    const err = new Error(`Course with id "${courseId}" not found.`);
    err.statusCode = 404;
    throw err;
  }

  const existingEnrollment = await enrollmentModel.findByStudentAndCourse(studentEmail, courseId);
  if (existingEnrollment) {
    const err = new Error('Student is already enrolled in this course.');
    err.statusCode = 409;
    throw err;
  }

  const now = Date.now();
  const enrollment = {
    id:           body.id || newId(),
    studentId:    student.id || student.legacyId || '',
    studentEmail: studentEmail.toLowerCase(),
    courseId,
    status:       body.status || 'active',
    enrolledAt:   body.enrolledAt || now,
    createdAt:    now,
    updatedAt:    now,
  };

  return enrollmentModel.create(enrollment);
}

async function patch(id, fields) {
  const existing = await enrollmentModel.findById(id);
  if (!existing) return null;
  const { id: _id, studentEmail: _email, studentId: _sid, courseId: _cid, ...safe } = fields;
  return enrollmentModel.patch(id, safe);
}

async function remove(id) {
  return enrollmentModel.remove(id);
}

module.exports = {
  getAll,
  getById,
  enroll,
  getMyCourses,
  unenroll,
  create,
  patch,
  remove,
};
