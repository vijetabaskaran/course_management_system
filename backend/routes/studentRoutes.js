'use strict';
/**
 * routes/studentRoutes.js
 */
const router     = require('express').Router();
const controller = require('../controllers/studentController');
const { protect } = require('../middleware/authMiddleware');

/**
 * Middleware: only the account owner or an admin can modify/delete a student profile.
 */
function authorizeOwnerOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Authentication required.' });
  }
  if (req.user.role === 'admin') {
    return next();
  }
  const targetId = String(req.params.id);
  if (req.user.id === targetId || req.user.email === targetId) {
    return next();
  }
  return res.status(403).json({
    success: false,
    error: 'Forbidden',
    message: "Forbidden: You cannot modify another student's profile.",
  });
}

router.get   ('/',      controller.getAllStudents);
router.post  ('/login', controller.loginStudent);
router.get   ('/:id',   controller.getStudentById);
router.post  ('/',      controller.createStudent);
router.put   ('/:id',   protect, authorizeOwnerOrAdmin, controller.updateStudent);
router.patch ('/:id',   protect, authorizeOwnerOrAdmin, controller.patchStudent);
router.delete('/:id',   protect, authorizeOwnerOrAdmin, controller.deleteStudent);

module.exports = router;
