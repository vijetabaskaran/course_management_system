'use strict';
/**
 * routes/learningProgressRoutes.js
 * Express router for Learning Progress Tracking (Task 13).
 *
 * Middleware pipeline:
 *  1. protect (Authentication middleware — verifies JWT and populates req.user)
 *  2. authorizeRoles('student') (Student role authorization — rejects non-students with HTTP 403)
 *  3. Controller handler
 *
 * NOTE: /my-progress is registered before any generic parameterized route.
 */
const router          = require('express').Router();
const controller      = require('../controllers/learningProgressController');
const { protect }     = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// 1. GET /my-progress — Retrieve authenticated student's learning progress
router.get('/my-progress', protect, authorizeRoles('student'), controller.getMyProgress);

// 2. PUT / — Update authenticated student's learning progress for an enrolled course
router.put('/', protect, authorizeRoles('student'), controller.updateProgress);

module.exports = router;
