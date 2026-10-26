'use strict';
/**
 * services/courseService.js
 * Business logic for courses.
 * Controllers call service functions; service functions call model functions.
 */
const courseModel     = require('../models/courseModel');
const enrollmentModel = require('../models/enrollmentModel');
const { newCourseId } = require('../utils/idGenerator');

const GRADIENT_PALETTES = [
  'linear-gradient(135deg,#A88F70,#8C7358)',
  'linear-gradient(135deg,#8C7358,#6B5D50)',
  'linear-gradient(135deg,#6B5D50,#5C4E43)',
  'linear-gradient(135deg,#D8C3A5,#A88F70)',
  'linear-gradient(135deg,#9C8B7A,#7A6855)',
  'linear-gradient(135deg,#A88F70,#3F352C)',
  'linear-gradient(135deg,#7A6855,#5C4E43)',
  'linear-gradient(135deg,#C4A882,#8C7358)',
];

/** Normalise title/name/domain/code so both old and new frontend fields work. */
function normalize(c) {
  return {
    ...c,
    name:   c.name  || c.title,
    title:  c.title || c.name,
    domain: c.domain || c.category || 'General',
    code:   c.code  || `CRS-${c.id}`,
  };
}

function getAll() {
  return courseModel.findAll().map(normalize);
}

function getById(id) {
  const course = courseModel.findById(id);
  if (!course) return null;
  return normalize(course);
}

/** Create a course, assigning defaults for missing fields. */
function create(body) {
  const { id: _ignored, ...rest } = body; // never let the client dictate the ID
  const title  = rest.title || rest.name;
  if (!title || !title.trim()) {
    const err = new Error('Course name / title is required.');
    err.statusCode = 400;
    throw err;
  }
  if (!rest.code || !rest.code.trim()) {
    const err = new Error('Course code is required.');
    err.statusCode = 400;
    throw err;
  }

  const allCourses = courseModel.findAll();

  // Duplicate code check
  const duplicate = allCourses.find(
    c => c.code && c.code.toLowerCase() === rest.code.trim().toLowerCase()
  );
  if (duplicate) {
    const err = new Error(`A course with code "${rest.code}" already exists.`);
    err.statusCode = 409;
    throw err;
  }

  const domain = rest.domain || rest.category || 'General';
  const course = {
    ...rest,
    id:        newCourseId(),
    title:     title.trim(),
    name:      title.trim(),
    domain,
    category:  rest.category || domain,
    code:      rest.code.trim(),
    color:     rest.color || GRADIENT_PALETTES[allCourses.length % GRADIENT_PALETTES.length],
    createdAt: rest.createdAt || Date.now(),
  };

  courseModel.create(course);
  return normalize(course);
}

/** Replace a course's fields while preserving its ID. */
function update(id, body) {
  const existing = courseModel.findById(id);
  if (!existing) return null;

  const title  = body.title || body.name || existing.title || existing.name;
  const domain = body.domain || body.category || existing.domain || 'General';

  // Duplicate code check (ignore the course being updated)
  if (body.code && body.code.trim().toLowerCase() !== (existing.code || '').toLowerCase()) {
    const dup = courseModel.findByCode(body.code.trim());
    if (dup && dup.id !== id) {
      const err = new Error(`A course with code "${body.code}" already exists.`);
      err.statusCode = 409;
      throw err;
    }
  }

  const updated = {
    ...existing,
    ...body,
    id,         // never change the ID
    title:      title ? title.trim() : existing.title,
    name:       title ? title.trim() : existing.name,
    domain,
    category:   body.category || domain,
    updatedAt:  Date.now(),
  };

  courseModel.update(id, updated);
  return normalize(updated);
}

/**
 * Delete a course AND its related enrollments.
 * The frontend's localStorage progress records are keyed per-student per-course;
 * they are not stored on the backend and will remain in the browser until manually cleared.
 */
function remove(id) {
  const existing = courseModel.findById(id);
  if (!existing) return null;
  const deleted     = courseModel.remove(id);
  const removedEnrollments = enrollmentModel.removeByCourse(id);
  return { deleted, removedEnrollments };
}

module.exports = { getAll, getById, create, update, remove };