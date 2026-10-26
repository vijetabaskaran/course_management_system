'use strict';
/**
 * controllers/courseController.js
 * HTTP request/response handling for courses.
 * Business logic lives in courseService.js.
 */
const courseService = require('../services/courseService');

/** GET /courses */
async function getAllCourses(req, res, next) {
  try {
    const courses = courseService.getAll();
    res.json(courses);
  } catch (err) { next(err); }
}

/** GET /courses/:id */
async function getCourseById(req, res, next) {
  try {
    const course = courseService.getById(req.params.id);
    if (!course) return res.status(404).json({ success: false, error: 'Not Found', message: 'Course not found.' });
    res.json(course);
  } catch (err) { next(err); }
}

/** POST /courses */
async function createCourse(req, res, next) {
  try {
    const course = courseService.create(req.body);
    res.status(201).json(course);
  } catch (err) { next(err); }
}

/** PUT /courses/:id */
async function updateCourse(req, res, next) {
  try {
    const course = courseService.update(req.params.id, req.body);
    if (!course) return res.status(404).json({ success: false, error: 'Not Found', message: 'Course not found.' });
    res.json(course);
  } catch (err) { next(err); }
}

/** DELETE /courses/:id */
async function deleteCourse(req, res, next) {
  try {
    const result = courseService.remove(req.params.id);
    if (!result) return res.status(404).json({ success: false, error: 'Not Found', message: 'Course not found.' });
    res.json(result.deleted);
  } catch (err) { next(err); }
}

module.exports = { getAllCourses, getCourseById, createCourse, updateCourse, deleteCourse };