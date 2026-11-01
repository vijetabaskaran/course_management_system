'use strict';
/**
 * routes/enrollmentRoutes.js
 * Express router for student course enrollments (Task 12).
 *
 * Middleware pipeline for student enrollment actions:
 *   1. protect (Authentication middleware — verifies JWT and populates req.user)
 *   2. authorizeRoles('student') (Student role authorization — rejects non-students with HTTP 403)
 *   3. Controller handler
 *
 * NOTE: /my-courses is explicitly registered BEFORE /:courseId or /:id to prevent route shadowing.
 */
const router          = require('express').Router();
const controller      = require('../controllers/enrollmentController');
const { protect }     = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// ── Task 12 Student Endpoints ─────────────────────────────────────
// 1. GET /my-courses — Retrieve authenticated student's courses (populated, newest first)
router.get('/my-courses', protect, authorizeRoles('student'), controller.getMyCourses);

// 2. POST / — Enroll in course (student identity from JWT, courseId from body)
router.post('/', protect, authorizeRoles('student'), controller.enrollInCourse);

// 3. DELETE /:courseId — Unenroll from course (permanent deletion)
router.delete('/:courseId', protect, authorizeRoles('student'), controller.unenrollCourse);

// ── General / Legacy Endpoints ─────────────────────────────────────
router.get('/', controller.getAllEnrollments);
router.get('/:id', controller.getEnrollmentById);
router.patch('/:id', controller.patchEnrollment);

module.exports = router;