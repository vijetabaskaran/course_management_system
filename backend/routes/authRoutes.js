'use strict';
/**
 * routes/authRoutes.js
 * Mounted at /api/v1/auth in server.js.
 *
 *   POST /api/v1/auth/register      — student registration (Task 9)
 *   POST /api/v1/auth/login         — student login + JWT issuance (Task 9 & 10)
 *   POST /api/v1/auth/admin-login   — admin login + JWT issuance (internal use)
 */
const router     = require('express').Router();
const controller = require('../controllers/authController');

router.post('/register',    controller.register);
router.post('/login',       controller.login);
router.post('/admin-login', controller.adminLogin);

module.exports = router;
