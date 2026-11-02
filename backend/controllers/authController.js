'use strict';
/**
 * controllers/authController.js
 * HTTP layer for Task 9 & Task 10 auth endpoints + profile retrieval.
 *
 * Routes (mounted at /api/v1/auth in server.js):
 *   POST /api/v1/auth/register
 *   POST /api/v1/auth/login
 *   GET  /api/v1/auth/me
 *
 * This controller intentionally keeps business logic in authService.js.
 * SECURITY: Passwords, password hashes, and JWT secrets are NEVER logged or returned.
 */
const authService  = require('../services/authService');
const studentModel = require('../models/studentModel');

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
    const result = await authService.adminLogin(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/auth/me
 * Retrieve the authenticated user's profile from MongoDB.
 */
async function getMe(req, res, next) {
  try {
    let user = null;
    if (req.user?.email) {
      user = await studentModel.findByEmail(req.user.email);
    }
    if (!user && req.user?.id) {
      user = await studentModel.findById(req.user.id);
    }
    if (!user) {
      user = {
        id: req.user?.id || 'admin',
        fullname: req.user?.role === 'admin' ? 'Administrator' : 'User',
        email: req.user?.email || '',
        username: req.user?.role === 'admin' ? 'admin' : '',
        role: req.user?.role || 'student',
        department: req.user?.role === 'admin' ? 'Administration' : '',
      };
    }
    const cleanUser = { ...user };
    delete cleanUser.password;
    delete cleanUser.__v;
    res.json({ success: true, user: cleanUser });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, adminLogin, getMe };
