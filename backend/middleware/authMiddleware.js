'use strict';
/**
 * middleware/authMiddleware.js
 *
 * Implements Task 10 Security Architecture:
 *   1. Extracts Bearer token from the standard Authorization header.
 *   2. Rejects requests with missing, malformed, or non-Bearer headers (HTTP 401).
 *   3. Verifies token signature and expiration via jsonwebtoken.verify() (Task 10.3).
 *   4. Rejects invalid, tampered, or expired tokens with clear error messages (HTTP 401).
 *   5. Never trusts client-supplied student/user IDs from request body or query params.
 *   6. Attaches the verified, minimal identity ({ id, email, role }) to req.user.
 *
 * Usage:
 *   const { protect } = require('../middleware/authMiddleware');
 *   router.get('/protected-route', protect, (req, res) => { ... });
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET environment variable is not set. Auth middleware cannot function.');
  // Do not crash here — let individual requests fail with 500 rather than killing the server.
}

/**
 * Express middleware to protect routes requiring JWT authentication.
 */
function protect(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  // 1. Missing header
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error:   'Unauthorized',
      message: 'Authorization header is required. Format: Bearer <token>',
    });
  }

  // 2. Malformed scheme (must be "Bearer <token>")
  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({
      success: false,
      error:   'Unauthorized',
      message: 'Invalid authorization format. Format must be: Bearer <token>',
    });
  }

  const token = parts[1];

  // 3. Empty token string
  if (!token || token.trim() === '') {
    return res.status(401).json({
      success: false,
      error:   'Unauthorized',
      message: 'Token is missing from Authorization header.',
    });
  }

  // 4. Verify signature, structure, and expiration
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    let message = 'Invalid or expired token.';
    if (err.name === 'TokenExpiredError') {
      message = 'Token has expired. Please log in again.';
    } else if (err.name === 'JsonWebTokenError') {
      message = 'Token verification failed: ' + err.message;
    }
    return res.status(401).json({
      success: false,
      error:   'Unauthorized',
      message,
    });
  }

  // 5. Trust only the verified payload — attach minimal identity to request
  // The payload contains { sub: userId, email, role } (no passwords, no hashes).
  req.user = {
    id:    payload.sub || payload.id || payload.userId,
    email: payload.email,
    role:  payload.role || 'student',
  };

  next();
}

module.exports = { protect };
