'use strict';
/**
 * routes/enrollmentRoutes.js
 */
const router     = require('express').Router();
const controller = require('../controllers/enrollmentController');

router.get   ('/',    controller.getAllEnrollments);
router.get   ('/:id', controller.getEnrollmentById);
router.post  ('/',    controller.createEnrollment);
router.patch ('/:id', controller.patchEnrollment);
router.delete('/:id', controller.deleteEnrollment);

module.exports = router;