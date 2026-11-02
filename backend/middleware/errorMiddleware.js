'use strict';
/**
 * middleware/errorMiddleware.js
 * 404 handler + global error handler (Activity 14.4 — enhanced).
 *
 * Handles specific Mongoose and JWT error types with appropriate HTTP codes.
 * Never exposes stack traces in production.
 */

const isDev = process.env.NODE_ENV !== 'production';

/** Catch-all for unmatched routes — must be registered AFTER all routes. */
function notFound(req, res) {
  res.status(404).json({
    success: false,
    error:   'Not Found',
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Global error handler — must have exactly 4 params so Express recognises it.
 *
 * Error type mapping:
 *   Mongoose ValidationError        → 400 Bad Request
 *   Mongoose CastError (ObjectId)   → 400 Bad Request
 *   MongoDB duplicate key (11000)   → 409 Conflict
 *   JsonWebTokenError               → 401 Unauthorized
 *   TokenExpiredError               → 401 Unauthorized
 *   err.statusCode / err.status     → used directly
 *   Everything else                 → 500 Internal Server Error
 */
// eslint-disable-next-line no-unused-vars
function globalError(err, req, res, next) {
  let statusCode = err.statusCode || err.status || 500;
  let errorName  = err.name || 'InternalServerError';
  let message    = err.message || 'An unexpected error occurred.';

  // ── Mongoose ValidationError ───────────────────────────────────────────────
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    errorName  = 'ValidationError';
    // Collect all field messages into one readable string
    const fields = Object.values(err.errors).map(e => e.message);
    message = fields.join(' ') || 'Validation failed.';
  }

  // ── Mongoose CastError (invalid ObjectId / field type mismatch) ────────────
  else if (err.name === 'CastError') {
    statusCode = 400;
    errorName  = 'CastError';
    message    = `Invalid value for field "${err.path}": "${err.value}".`;
  }

  // ── MongoDB duplicate key error ────────────────────────────────────────────
  else if (err.code === 11000) {
    statusCode = 409;
    errorName  = 'DuplicateKeyError';
    const field = err.keyValue ? Object.keys(err.keyValue)[0] : 'field';
    message = `Duplicate value: a record with this ${field} already exists.`;
  }

  // ── JWT — token is malformed, tampered, or has an invalid signature ────────
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorName  = 'Unauthorized';
    message    = 'Invalid token. Authentication failed.';
  }

  // ── JWT — token has expired ────────────────────────────────────────────────
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorName  = 'Unauthorized';
    message    = 'Token has expired. Please log in again.';
  }

  // ── CORS — untrusted origin rejected ───────────────────────────────────────
  else if (err.message && err.message.startsWith('CORS:')) {
    statusCode = 403;
    errorName  = 'Forbidden';
  }

  // Log: full error in development, message-only in production
  if (isDev) {
    console.error('[ERROR]', err);
  } else {
    console.error('[ERROR]', `${statusCode} ${errorName}: ${message}`);
  }

  const body = {
    success: false,
    error:   errorName,
    message,
  };

  // Stack trace only in development — never leak internals to clients
  if (isDev && err.stack) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
}

module.exports = { notFound, globalError };
