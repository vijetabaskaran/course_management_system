'use strict';
/**
 * services/courseService.js  (MongoDB/Mongoose version)
 * Business logic for courses, course-specific modules, lessons, and quizzes.
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

function sanitizeCourseContent(courseId, modules, quiz) {
  let cleanModules = [];
  if (Array.isArray(modules)) {
    cleanModules = modules.map((m, mIdx) => {
      const modId = m.id || `mod-${courseId}-${mIdx + 1}`;
      const lessons = Array.isArray(m.lessons) ? m.lessons.map((l, lIdx) => ({
        id: l.id || `les-${modId}-${lIdx + 1}`,
        title: l.title || `Lesson ${lIdx + 1}`,
        description: l.description || '',
        content: l.content || '',
        order: typeof l.order === 'number' ? l.order : lIdx + 1,
        duration: l.duration || '15 mins',
      })) : [];

      const modQuiz = Array.isArray(m.quiz) ? m.quiz.map((q, qIdx) => ({
        id: q.id || `q-${modId}-${qIdx + 1}`,
        question: q.question || '',
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
        explanation: q.explanation || '',
        marks: typeof q.marks === 'number' ? q.marks : 1,
      })) : [];

      return {
        id: modId,
        courseId,
        title: m.title || `Module ${mIdx + 1}`,
        description: m.description || '',
        overview: m.overview || '',
        order: typeof m.order === 'number' ? m.order : mIdx + 1,
        lessons,
        quiz: modQuiz,
      };
    });
  }

  let cleanQuiz = [];
  if (Array.isArray(quiz)) {
    cleanQuiz = quiz.map((q, qIdx) => ({
      id: q.id || `q-${courseId}-${qIdx + 1}`,
      question: q.question || '',
      options: Array.isArray(q.options) ? q.options : [],
      correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
      explanation: q.explanation || '',
      marks: typeof q.marks === 'number' ? q.marks : 1,
    }));
  }

  return { modules: cleanModules, quiz: cleanQuiz };
}

/** Normalise title/name/domain/code so both old and new frontend fields work. */
function normalize(c) {
  if (!c) return null;
  return {
    ...c,
    name:   c.name  || c.title,
    title:  c.title || c.name,
    domain: c.domain || c.category || 'General',
    code:   c.code  || `CRS-${c.id}`,
    id:     c.id || c.legacyId,
    modules: Array.isArray(c.modules) ? c.modules : [],
    quiz:    Array.isArray(c.quiz) ? c.quiz : [],
  };
}

async function getAll() {
  const courses = await courseModel.findAll();
  return courses.map(normalize);
}

async function getById(id) {
  const course = await courseModel.findById(id);
  if (!course) return null;
  return normalize(course);
}

/** Create a course, assigning defaults for missing fields. */
async function create(body) {
  const { id: _ignored, ...rest } = body;
  const title = rest.title || rest.name;
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

  const allCourses = await courseModel.findAll();

  const duplicate = allCourses.find(
    c => c.code && c.code.toLowerCase() === rest.code.trim().toLowerCase()
  );
  if (duplicate) {
    const err = new Error(`A course with code "${rest.code}" already exists.`);
    err.statusCode = 409;
    throw err;
  }

  const generatedId = newCourseId();
  const domain = rest.domain || rest.category || 'General';
  const { modules, quiz } = sanitizeCourseContent(generatedId, rest.modules, rest.quiz);

  const course = {
    ...rest,
    id:        generatedId,
    title:     title.trim(),
    name:      title.trim(),
    domain,
    category:  rest.category || domain,
    code:      rest.code.trim(),
    color:     rest.color || GRADIENT_PALETTES[allCourses.length % GRADIENT_PALETTES.length],
    modules,
    quiz,
    createdAt: rest.createdAt || Date.now(),
  };

  await courseModel.create(course);
  return normalize(course);
}

/** Replace a course's fields while preserving its ID. */
async function update(id, body) {
  const existing = await courseModel.findById(id);
  if (!existing) return null;

  const title  = body.title || body.name || existing.title || existing.name;
  const domain = body.domain || body.category || existing.domain || 'General';

  if (body.code && body.code.trim().toLowerCase() !== (existing.code || '').toLowerCase()) {
    const dup = await courseModel.findByCode(body.code.trim());
    if (dup && dup.id !== id) {
      const err = new Error(`A course with code "${body.code}" already exists.`);
      err.statusCode = 409;
      throw err;
    }
  }

  const incomingModules = body.modules !== undefined ? body.modules : existing.modules;
  const incomingQuiz    = body.quiz !== undefined ? body.quiz : existing.quiz;
  const { modules, quiz } = sanitizeCourseContent(id, incomingModules, incomingQuiz);

  const updated = {
    ...existing,
    ...body,
    id,           // never change the ID
    legacyId: id, // keep legacyId in sync
    title:    title ? title.trim() : existing.title,
    name:     title ? title.trim() : existing.name,
    domain,
    category: body.category || domain,
    modules,
    quiz,
    updatedAt: Date.now(),
  };

  await courseModel.update(id, updated);
  return normalize(updated);
}

/**
 * Delete a course AND its related enrollments (and learning progress).
 */
async function remove(id) {
  const existing = await courseModel.findById(id);
  if (!existing) return null;
  const deleted = await courseModel.remove(id);
  const removedEnrollments = await enrollmentModel.removeByCourse(id);
  // Also remove learning progress records for this course
  try {
    const learningProgressModel = require('../models/learningProgressModel');
    await learningProgressModel.removeByCourse(id);
  } catch (e) { /* non-critical */ }
  return { deleted, removedEnrollments };
}

module.exports = { getAll, getById, create, update, remove };
