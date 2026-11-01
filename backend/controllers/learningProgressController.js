'use strict';
/**
 * controllers/learningProgressController.js
 * HTTP layer for Task 13 Learning Progress Tracking.
 */
const learningProgressService = require('../services/learningProgressService');

/**
 * PUT /api/v1/progress and PUT /progress
 * Updates learning progress for the authenticated student.
 */
async function updateProgress(req, res, next) {
  try {
    const result = await learningProgressService.updateProgress(req.user, req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/progress/my-progress and GET /progress/my-progress
 * Retrieves the authenticated student's progress records.
 */
async function getMyProgress(req, res, next) {
  try {
    const result = await learningProgressService.getMyProgress(req.user);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  updateProgress,
  getMyProgress,
};
