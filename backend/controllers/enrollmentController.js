'use strict';
/**
 * controllers/enrollmentController.js
 * HTTP layer for enrollments.
 */
const enrollmentService = require('../services/enrollmentService');

/** GET /enrollments */
async function getAllEnrollments(req, res, next) {
  try {
    res.json(enrollmentService.getAll());
  } catch (err) { next(err); }
}

/** GET /enrollments/:id */
async function getEnrollmentById(req, res, next) {
  try {
    const enrollment = enrollmentService.getById(req.params.id);
    if (!enrollment) return res.status(404).json({ success: false, error: 'Not Found', message: 'Enrollment not found.' });
    res.json(enrollment);
  } catch (err) { next(err); }
}

/** POST /enrollments */
async function createEnrollment(req, res, next) {
  try {
    const enrollment = enrollmentService.create(req.body);
    res.status(201).json(enrollment);
  } catch (err) { next(err); }
}

/** PATCH /enrollments/:id */
async function patchEnrollment(req, res, next) {
  try {
    const enrollment = enrollmentService.patch(req.params.id, req.body);
    if (!enrollment) return res.status(404).json({ success: false, error: 'Not Found', message: 'Enrollment not found.' });
    res.json(enrollment);
  } catch (err) { next(err); }
}

/** DELETE /enrollments/:id */
async function deleteEnrollment(req, res, next) {
  try {
    const enrollment = enrollmentService.remove(req.params.id);
    if (!enrollment) return res.status(404).json({ success: false, error: 'Not Found', message: 'Enrollment not found.' });
    res.json(enrollment);
  } catch (err) { next(err); }
}

module.exports = { getAllEnrollments, getEnrollmentById, createEnrollment, patchEnrollment, deleteEnrollment };