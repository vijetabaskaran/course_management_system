'use strict';
/**
 * middleware/authMiddleware.js
 * JWT Bearer-token authentication middleware.
 *
 * Usage:  const { protect } = require('./authMiddleware');
 *         router.post('/', protect, controller.createSomething);
 *
 * Security notes:
 *  - The JWT payload NEVER contains passwords or password hashes.
 *  - Expired, malformed, or missing tokens all return HTTP 401.
 *  - A missing JWT_SECRET returns a controlled HTTP 500 (config error).
 *  - Stack traces are never exposed to clients.
 */
const jwt = require('jsonwebtoken');

/**
 * Protect a route: requires a valid JWT in the Authorization header.
 * On success, attaches { id, email } to req.user and calls next().
 */
function protect(req, res, next) {
  // 1. Guard: JWT_SECRET must be configured
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({
      success: false,
      error:   'ConfigurationError',
      message: 'Authentication is misconfigured on the server. Contact an administrator.',
    });
  }

  // 2. Read Authorization header
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error:   'Unauthorized',
      message: 'No authorization header provided. Please log in.',
    });
  }

  // 3. Require Bearer scheme
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error:   'Unauthorized',
      message: 'Authorization header must use the Bearer scheme.',
    });
  }

  // 4. Extract token
  const token = authHeader.slice(7).trim(); // remove "Bearer "
  if (!token) {
    return res.status(401).json({
      success: false,
      error:   'Unauthorized',
      message: 'Token is empty. Please log in again.',
    });
  }

  // 5. Verify token — rejects expired, malformed, or wrongly signed tokens
  let payload;
  try {
    payload = jwt.verify(token, secret);
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Your session has expired. Please log in again.'
        : 'Invalid or malformed token. Please log in again.';
    return res.status(401).json({
      success: false,
      error:   'Unauthorized',
      message,
    });
  }

  // 6. Trust only the verified payload — attach minimal identity to request
  // The payload contains { sub: studentId, email } (no passwords, no hashes).
  req.user = {
    id:    payload.sub,
    email: payload.email,
  };

  next();
}

module.exports = { protect };
