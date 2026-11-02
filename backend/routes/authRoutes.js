'use strict';
/**
 * routes/authRoutes.js
 * Mounted at /api/v1/auth in server.js.
 *
 *   POST /api/v1/auth/register      — student registration (Task 9)
 *   POST /api/v1/auth/login         — student login + JWT issuance (Task 9 & 10)
 *   POST /api/v1/auth/admin-login   — admin login + JWT issuance (internal use)
 *   GET  /api/v1/auth/me            — authenticated user profile retrieval (Task 6)
 */
const router      = require('express').Router();
const controller  = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register',    controller.register);
router.post('/login',       controller.login);
router.post('/admin-login', controller.adminLogin);
router.get('/me',           protect, controller.getMe);

module.exports = router;
