'use strict';
/**
 * routes/courseRoutes.js
 *
 * Access policy (Task 10):
 *   GET  /courses       — Public (no token required)
 *   GET  /courses/:id   — Public (no token required)
 *   POST /courses       — Protected: valid JWT required
 *   PUT  /courses/:id   — Protected: valid JWT required
 *   DELETE /courses/:id — Protected: valid JWT required
 *
 * Existing controller function names are preserved.
 */
const router     = require('express').Router();
const controller = require('../controllers/courseController');
const { protect } = require('../middleware/authMiddleware');

// ── Public routes ─────────────────────────────────────────────────
router.get   ('/',    controller.getAllCourses);
router.get   ('/:id', controller.getCourseById);

// ── Protected routes (valid JWT required) ─────────────────────────
router.post  ('/',    protect, controller.createCourse);
router.put   ('/:id', protect, controller.updateCourse);
router.delete('/:id', protect, controller.deleteCourse);

module.exports = router;