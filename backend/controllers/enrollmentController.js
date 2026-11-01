'use strict';
/**
 * controllers/enrollmentController.js  (MongoDB/Mongoose version)
 * HTTP layer for student course enrollments (Task 12).
 */
const enrollmentService = require('../services/enrollmentService');

/**
 * POST /api/v1/enrollments & POST /enrollments
 * Enrolls the authenticated student in a course.
 * Student identity is derived exclusively from req.user (verified JWT).
 */
async function enrollInCourse(req, res, next) {
  try {
    const courseId = req.body.courseId || req.body.id;
    const user = req.user;

    const enrollment = await enrollmentService.enroll(user, courseId);
    res.status(201).json({
      success: true,
      message: 'Successfully enrolled in course.',
      enrollment,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: err.message || 'Student is already enrolled in this course.',
      });
    }
    next(err);
  }
}

/**
 * GET /api/v1/enrollments/my-courses & GET /enrollments/my-courses
 * Returns the authenticated student's enrolled courses, populated with course details.
 */
async function getMyCourses(req, res, next) {
  try {
    const user = req.user;
    const result = await enrollmentService.getMyCourses(user);
    res.status(200).json({
      success: true,
      count: result.count,
      enrollments: result.enrollments,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/enrollments/:courseId & DELETE /enrollments/:courseId
 * Permanently removes the authenticated student's enrollment for the specified course.
 */
async function unenrollCourse(req, res, next) {
  try {
    const courseId = req.params.courseId || req.params.id;
    const user = req.user;
    const result = await enrollmentService.unenroll(user, courseId);
    res.status(200).json({
      success: true,
      message: result.message,
      unregisteredCourseId: result.unregisteredCourseId,
      deleted: result.deleted,
    });
  } catch (err) {
    next(err);
  }
}

/** GET /enrollments (legacy & general read endpoint) */
async function getAllEnrollments(req, res, next) {
  try {
    const data = await enrollmentService.getAll();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

/** GET /enrollments/:id */
async function getEnrollmentById(req, res, next) {
  try {
    const enrollment = await enrollmentService.getById(req.params.id);
    if (!enrollment) {
      return res.status(404).json({ success: false, error: 'Not Found', message: 'Enrollment not found.' });
    }
    res.json(enrollment);
  } catch (err) {
    next(err);
  }
}

/** POST /enrollments (hybrid handler for backward compatibility) */
async function createEnrollment(req, res, next) {
  try {
    if (req.user) {
      return enrollInCourse(req, res, next);
    }
    // Legacy fallback (e.g. unauthenticated legacy scripts)
    const enrollment = await enrollmentService.create(req.body);
    res.status(201).json(enrollment);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: err.message || 'Student is already enrolled in this course.',
      });
    }
    next(err);
  }
}

/** PATCH /enrollments/:id */
async function patchEnrollment(req, res, next) {
  try {
    const enrollment = await enrollmentService.patch(req.params.id, req.body);
    if (!enrollment) {
      return res.status(404).json({ success: false, error: 'Not Found', message: 'Enrollment not found.' });
    }
    res.json(enrollment);
  } catch (err) {
    next(err);
  }
}

/** DELETE /enrollments/:id (hybrid handler) */
async function deleteEnrollment(req, res, next) {
  try {
    if (req.user && req.user.role === 'student') {
      return unenrollCourse(req, res, next);
    }
    const enrollment = await enrollmentService.remove(req.params.id);
    if (!enrollment) {
      return res.status(404).json({ success: false, error: 'Not Found', message: 'Enrollment not found.' });
    }
    res.json(enrollment);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  enrollInCourse,
  getMyCourses,
  unenrollCourse,
  getAllEnrollments,
  getEnrollmentById,
  createEnrollment,
  patchEnrollment,
  deleteEnrollment,
};
