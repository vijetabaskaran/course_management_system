'use strict';
/**
 * controllers/authController.js
 * HTTP layer for Task 9 & Task 10 auth endpoints.
 *
 * Routes (mounted at /api/v1/auth in server.js):
 *   POST /api/v1/auth/register
 *   POST /api/v1/auth/login
 *
 * This controller intentionally keeps business logic in authService.js.
 * SECURITY: Passwords, password hashes, and JWT secrets are NEVER logged or returned.
 */
const authService = require('../services/authService');

/**
 * POST /api/v1/auth/register
 * Register a new student with bcrypt-hashed password.
 * Returns 201 with { message, token, tokenType, expiresIn, student }.
 */
async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/login
 * Authenticate a student and issue a JWT.
 * Returns 200 with { message, token, tokenType, expiresIn, student }.
 */
async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/admin-login
 * Validate hardcoded admin credentials and issue a JWT.
 */
async function adminLogin(req, res, next) {
  try {
    const result = authService.adminLogin(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, adminLogin };
