'use strict';
/**
 * middleware/errorMiddleware.js
 * 404 handler + global error handler.
 * These two are Express conventions: 404 has no next(); error has (err, req, res, next).
 */

const isDev = process.env.NODE_ENV !== 'production';

/** Catch-all for unmatched routes — must be registered AFTER all routes. */
function notFound(req, res) {
  res.status(404).json({
    success: false,
    error:   'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
}

/** Global error handler — must have exactly 4 params so Express recognises it. */
// eslint-disable-next-line no-unused-vars
function globalError(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;

  // Log the full error in development; only the message in production.
  if (isDev) {
    console.error('[ERROR]', err);
  } else {
    console.error('[ERROR]', err.message);
  }

  const body = {
    success: false,
    error:   err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred.',
  };

  // Attach stack trace in development only — never leak internals to clients.
  if (isDev && err.stack) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
}

module.exports = { notFound, globalError };