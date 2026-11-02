'use strict';
/**
 * middleware/loginLimiter.js
 * Rate-limiting middleware for login endpoints (Activity 14.6).
 *
 * Limits each IP to 10 login attempts per 15-minute window.
 * Returns HTTP 429 on the 11th attempt with a clear retry-after message.
 * Applied ONLY to POST /api/v1/auth/login and POST /api/v1/auth/admin-login.
 */
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // max 10 requests per window per IP
  standardHeaders: true,     // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,      // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: 'TooManyRequests',
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.',
  },
  handler(req, res, next, options) {
    res.status(429).json(options.message);
  },
});

module.exports = loginLimiter;

