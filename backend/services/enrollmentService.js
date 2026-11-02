'use strict';
/**
 * services/enrollmentService.js  (MongoDB/Mongoose version)
 *
 * Business logic for enrollments.
 */
const enrollmentModel       = require('../models/enrollmentModel');
const courseModel           = require('../models/courseModel');
const studentModel          = require('../models/studentModel');
const courseService         = require('./courseService');
const learningProgressModel = require('../models/learningProgressModel');

/**
 * All enrollments, each annotated with the student's stored learning progress.
 */
async function getAll() {
  const [enrollments, allProgress] = await Promise.all([
    enrollmentModel.findAll(),
    learningProgressModel.findAll(),
  ]);

  const progressMap = new Map();
  allProgress.forEach(p => {
    progressMap.set(`${(p.studentEmail || '').toLowerCase()}|${p.courseId}`, p);
  });

  return enrollments.map(e => {
    const p = progressMap.get(`${(e.studentEmail || '').toLowerCase()}|${e.courseId}`);
    if (p) {
      return {
        ...e,
        progressPercentage: p.progressPercentage,
        completedLessons:   p.completedLessons,
        totalLessons:       p.totalLessons,
        completedUnits:     p.completedUnits,
        totalUnits:         p.totalUnits,
      };
    }
    return { ...e, progressPercentage: e.status === 'completed' ? 100 : 0 };
  });
}

async function getById(id) {
  return enrollmentModel.findById(id);
}

async function patch(id, fields) {
  const existing = await enrollmentModel.findById(id);
  if (!existing) return null;
  const { id: _id, studentEmail: _email, studentId: _sid, courseId: _cid, ...safe } = fields || {};
  return enrollmentModel.patch(id, safe);
}

async function remove(id) {
  return enrollmentModel.remove(id);
}

/**
 * Enroll an authenticated student into a course.
 */
async function enroll(user, courseId) {
  if (!user || (!user.email && !user.id)) {
    const err = new Error('Authentication required. Invalid or missing student identity.');
    err.statusCode = 401;
    throw err;
  }

  if (!courseId || !String(courseId).trim()) {
    const err = new Error('courseId is required.');
    err.statusCode = 400;
    throw err;
  }

  const cleanCourseId = String(courseId).trim();

  // 1. Verify course exists
  const course = await courseModel.findById(cleanCourseId);
  if (!course) {
    const err = new Error(`Course with ID "${cleanCourseId}" does not exist.`);
    err.statusCode = 404;
    throw err;
  }

  // 2. Prevent duplicate enrollment
  const studentRef = (user.email || user.id || '').toLowerCase().trim();
  const existing = await enrollmentModel.findByStudentAndCourse(studentRef, cleanCourseId);
  if (existing) {
    const err = new Error(`Student is already enrolled in course "${cleanCourseId}".`);
    err.statusCode = 409;
    throw err;
  }

  // Progress left over from an earlier, since-removed enrollment must not carry over
  await learningProgressModel.removeByStudentAndCourse(studentRef, cleanCourseId);

  // 3. Create the enrollment
  const enrollment = {
    studentId:    user.id || '',
    studentEmail: (user.email || '').toLowerCase().trim(),
    courseId:     cleanCourseId,
    status:       'active',
    enrolledAt:   Date.now(),
  };

  return enrollmentModel.create(enrollment);
}

/**
 * Retrieve the authenticated student's enrolled courses with populated course details and progress.
 */
async function getMyCourses(user) {
  if (!user || (!user.email && !user.id)) {
    const err = new Error('Authentication required. Invalid or missing student identity.');
    err.statusCode = 401;
    throw err;
  }

  const studentRef = (user.email || user.id || '').toLowerCase().trim();
  const rawEnrollments = await enrollmentModel.findByStudent(studentRef);

  // Retrieve student progress records from MongoDB
  const allProgress = await learningProgressModel.findByStudent(studentRef);
  const progressMap = new Map();
  allProgress.forEach(p => progressMap.set(p.courseId, p));

  const populated = await Promise.all(rawEnrollments.map(async e => {
    const courseDetails = await courseService.getById(e.courseId)
      || await courseModel.findById(e.courseId)
      || null;

    const modules = (courseDetails && courseDetails.modules && courseDetails.modules.length > 0)
      ? courseDetails.modules
      : [];

    const totalUnits = modules.length > 0 ? modules.length : 1;
    let defaultTotalLessons = 10;
    if (modules.length > 0) {
      const sum = modules.reduce((acc, m) => acc + (m.lessons?.length || 1), 0);
      if (sum > 0) defaultTotalLessons = sum;
    }

    const p = progressMap.get(e.courseId);

    let progressPercentage = 0;
    let completedLessons = 0;
    let totalLessons = defaultTotalLessons;
    let completedUnits = 0;
    let unitsTotal = totalUnits;

    if (p) {
      progressPercentage = p.progressPercentage || 0;
      completedLessons = p.completedLessons || 0;
      totalLessons = p.totalLessons || defaultTotalLessons;
      completedUnits = p.completedUnits || 0;
      unitsTotal = p.totalUnits || totalUnits;
    } else if (e.status === 'completed') {
      progressPercentage = 100;
      completedLessons = totalLessons;
      completedUnits = totalUnits;
    }

    return {
      ...e,
      status: progressPercentage === 100 ? 'completed' : (e.status || 'active'),
      course: courseDetails,
      progressPercentage,
      completedLessons,
      totalLessons,
      completedUnits: Math.min(completedUnits, unitsTotal),
      totalUnits: unitsTotal,
    };
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

  return enroll({ email: studentEmail }, courseId);
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
