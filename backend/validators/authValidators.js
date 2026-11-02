'use strict';
/**
 * validators/authValidators.js
 * express-validator chains for authentication endpoints (Activity 14.2).
 *
 * registerValidator: validates name, email, department, password for POST /register
 * loginValidator: validates email and password for POST /login
 */
const { body } = require('express-validator');

/**
 * Validator chain for POST /api/v1/auth/register
 */
const registerValidator = [
  body('fullname')
    .exists({ checkFalsy: true })
    .withMessage('Full name is required.')
    .isString()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Full name must be at least 2 characters.'),

  body('email')
    .exists({ checkFalsy: true })
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Email address is invalid.')
    .normalizeEmail({ gmail_remove_dots: false }),

  body('department')
    .exists({ checkFalsy: true })
    .withMessage('Department is required.')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Department cannot be empty.'),

  body('password')
    .exists({ checkFalsy: true })
    .withMessage('Password is required.')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long.')
    .isLength({ max: 72 })
    .withMessage('Password must not exceed 72 characters.'),
];

/**
 * Validator chain for POST /api/v1/auth/login
 */
const loginValidator = [
  body('email')
    .exists({ checkFalsy: true })
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Email address is invalid.'),

  body('password')
    .exists({ checkFalsy: true })
    .withMessage('Password is required.'),
];

/**
 * Validator chain for POST /api/v1/auth/admin-login
 */
const adminLoginValidator = [
  body('email')
    .exists({ checkFalsy: true })
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Email address is invalid.'),

  body('password')
    .exists({ checkFalsy: true })
    .withMessage('Password is required.'),
];

module.exports = { registerValidator, loginValidator, adminLoginValidator };

