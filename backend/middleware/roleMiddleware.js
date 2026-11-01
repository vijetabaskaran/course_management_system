'use strict';
/**
 * middleware/roleMiddleware.js
 * Role-Based Access Control (RBAC) authorization middleware.
 *
 * Usage:
 *   const { authorizeRoles } = require('./roleMiddleware');
 *   router.post('/courses', protect, authorizeRoles('admin'), controller.createCourse);
 *
 * Security requirements:
 *   - Accept one or more allowed roles: authorizeRoles('admin') or authorizeRoles('admin', 'editor')
 *   - Check that authentication middleware has already populated req.user (HTTP 401 if not).
 *   - Return HTTP 403 when the authenticated user's role is not permitted.
 *   - Call next() when authorization succeeds.
 *   - Use the role supplied by the verified authentication system (req.user.role),
 *     never a role supplied by an untrusted request body (req.body.role).
 */

function authorizeRoles(...allowedRoles) {
  // Support both authorizeRoles('admin', 'staff') and authorizeRoles(['admin'])
  const roles = allowedRoles.flat();

  return function (req, res, next) {
    // 1. Check that authentication middleware has already populated req.user
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error:   'Unauthorized',
        message: 'Authentication required. No authenticated user found.',
      });
    }

    // 2. Verified role from req.user (trusted from JWT verification, NEVER req.body)
    const userRole = req.user.role || 'student';

    // 3. Check if user's role is permitted
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error:   'Forbidden',
        message: `Forbidden: role "${userRole}" is not authorized to access this resource.`,
      });
    }

    // 4. Authorized — proceed to controller
    next();
  };
}

module.exports = { authorizeRoles };
