'use strict';
/**
 * routes/studentRoutes.js
 */
const router     = require('express').Router();
const controller = require('../controllers/studentController');

router.get   ('/',      controller.getAllStudents);
router.post  ('/login', controller.loginStudent);
router.get   ('/:id',   controller.getStudentById);
router.post  ('/',      controller.createStudent);
router.put   ('/:id',   controller.updateStudent);
router.patch ('/:id',   controller.patchStudent);
router.delete('/:id',   controller.deleteStudent);

module.exports = router;