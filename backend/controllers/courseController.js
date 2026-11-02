'use strict';
/**
 * controllers/courseController.js  (MongoDB/Mongoose version)
 * HTTP request/response handling for courses.
 * All service calls are properly awaited.
 * Supports pagination via ?page=1&limit=20 while remaining backward-compatible.
 */
const courseService = require('../services/courseService');

/** GET /courses */
async function getAllCourses(req, res, next) {
  try {
    const { page, limit } = req.query;
    const allCourses = await courseService.getAll();

    // If pagination parameters are explicitly requested, return paginated envelope
    if (page !== undefined || limit !== undefined) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const total = allCourses.length;
      const startIndex = (pageNum - 1) * limitNum;
      const paginated = allCourses.slice(startIndex, startIndex + limitNum);

      return res.json({
        success: true,
        count: paginated.length,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum) || 1,
        courses: paginated,
      });
    }

    // Default backward-compatible response (plain array)
    res.json(allCourses);
  } catch (err) { next(err); }
}

/** GET /courses/:id */
async function getCourseById(req, res, next) {
  try {
    const course = await courseService.getById(req.params.id);
    if (!course) return res.status(404).json({ success: false, error: 'Not Found', message: 'Course not found.' });
    res.json(course);
  } catch (err) { next(err); }
}

/** POST /courses */
async function createCourse(req, res, next) {
  try {
    const course = await courseService.create(req.body);
    res.status(201).json(course);
  } catch (err) { next(err); }
}

/** PUT /courses/:id */
async function updateCourse(req, res, next) {
  try {
    const course = await courseService.update(req.params.id, req.body);
    if (!course) return res.status(404).json({ success: false, error: 'Not Found', message: 'Course not found.' });
    res.json(course);
  } catch (err) { next(err); }
}

/** DELETE /courses/:id */
async function deleteCourse(req, res, next) {
  try {
    const result = await courseService.remove(req.params.id);
    if (!result) return res.status(404).json({ success: false, error: 'Not Found', message: 'Course not found.' });
    res.json(result.deleted);
  } catch (err) { next(err); }
}

module.exports = { getAllCourses, getCourseById, createCourse, updateCourse, deleteCourse };
