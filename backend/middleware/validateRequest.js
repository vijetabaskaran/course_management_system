'use strict';
/**
 * middleware/validateRequest.js
 * Extracts express-validator errors from the request and returns HTTP 400
 * if any validation errors are present.
 *
 * Usage:
 *   const { validateRequest } = require('../middleware/validateRequest');
 *   router.post('/register', registerValidator, validateRequest, controller.register);
 */
const { validationResult } = require('express-validator');

/**
 * Middleware that checks the result of express-validator chains.
 * If there are errors, responds with 400 and the first error message.
 * Otherwise calls next().
 */
function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array()[0];
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: first.msg,
      field: first.path || first.param,
      errors: errors.array().map(e => ({ field: e.path || e.param, message: e.msg })),
    });
  }
  next();
}

module.exports = { validateRequest };

