'use strict';
/**
 * routes/courseRoutes.js
 */
const router     = require('express').Router();
const controller = require('../controllers/courseController');

router.get   ('/',    controller.getAllCourses);
router.get   ('/:id', controller.getCourseById);
router.post  ('/',    controller.createCourse);
router.put   ('/:id', controller.updateCourse);
router.delete('/:id', controller.deleteCourse);

module.exports = router;