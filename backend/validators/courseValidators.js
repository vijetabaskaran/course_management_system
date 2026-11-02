'use strict';
/**
 * validators/courseValidators.js
 * express-validator chains for course endpoints (Activity 14.2).
 */
const { body, query } = require('express-validator');

/**
 * Validator for POST /courses (create course) — admin only
 */
const createCourseValidator = [
  body('title')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Course title must be at least 2 characters.'),

  body('legacyId')
    .exists({ checkFalsy: true })
    .withMessage('Course ID (legacyId) is required.')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Course ID cannot be empty.'),
];

/**
 * Validator for pagination query params: ?page=&limit=
 */
const paginationValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer.')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100.')
    .toInt(),
];

module.exports = { createCourseValidator, paginationValidator };

