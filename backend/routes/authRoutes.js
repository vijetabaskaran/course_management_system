'use strict';
/**
 * routes/authRoutes.js
 * Mounted at /api/v1/auth in server.js.
 *
 *   POST /api/v1/auth/register      — student registration (Task 9)
 *   POST /api/v1/auth/login         — student login + JWT issuance (Task 9 & 10)
 *   POST /api/v1/auth/admin-login   — admin login + JWT issuance (internal use)
 *   GET  /api/v1/auth/me            — authenticated user profile retrieval (Task 6)
 *
 * Security (Activity 14.6): loginLimiter rate-limits /login and /admin-login.
 * Validation (Activity 14.2): express-validator chains on register and login.
 */
const router      = require('express').Router();
const controller  = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const loginLimiter = require('../middleware/loginLimiter');
const { validateRequest } = require('../middleware/validateRequest');
const { registerValidator, loginValidator, adminLoginValidator } = require('../validators/authValidators');

router.post('/register',    registerValidator,    validateRequest, controller.register);
router.post('/login',       loginLimiter, loginValidator,     validateRequest, controller.login);
router.post('/admin-login', loginLimiter, adminLoginValidator, validateRequest, controller.adminLogin);
router.get ('/me',          protect, controller.getMe);

module.exports = router;
