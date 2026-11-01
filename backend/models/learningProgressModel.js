'use strict';
/**
 * models/learningProgressModel.js  (MongoDB/Mongoose version)
 *
 * Replaces the JSON-file implementation with Mongoose operations on the
 * 'learningprogresses' collection (LearningProgress model).
 *
 * API surface is 100% backwards-compatible with the original JSON version.
 * Compound unique index on (studentEmail, courseId) enforced at database level.
 */
const LearningProgress = require('./schemas/LearningProgressSchema');
const { newId } = require('../utils/idGenerator');

function normalizeProgress(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  delete obj.__v;

  const id = obj.legacyId || String(obj._id);
  obj.id   = id;
  obj._id  = id;

  obj.student      = obj.studentEmail || obj.studentId || '';
  obj.course       = obj.courseId     || '';
  obj.completedLessons   = typeof obj.completedLessons === 'number' ? obj.completedLessons : 0;
  obj.totalLessons       = typeof obj.totalLessons === 'number' && obj.totalLessons > 0 ? obj.totalLessons : 1;
  obj.progressPercentage = typeof obj.progressPercentage === 'number' ? obj.progressPercentage : 0;
  obj.lastAccessedAt     = obj.lastAccessedAt || Date.now();
  return obj;
}

async function findAll() {
  const docs = await LearningProgress.find({}).lean();
  return docs.map(normalizeProgress);
}

async function findById(id) {
  if (!id) return null;
  let doc = await LearningProgress.findOne({ legacyId: String(id) }).lean();
  if (!doc) {
    const mongoose = require('mongoose');
    if (mongoose.Types.ObjectId.isValid(id)) {
      doc = await LearningProgress.findById(id).lean();
    }
  }
  return doc ? normalizeProgress(doc) : null;
}

/**
 * Retrieve all progress records for a given student (by email or student id).
 */
async function findByStudent(studentEmailOrId) {
  if (!studentEmailOrId) return [];
  const query = String(studentEmailOrId).toLowerCase().trim();
  const docs = await LearningProgress.find({
    $or: [
      { studentEmail: query },
      { studentId:    query },
    ],
  }).lean();
  return docs.map(normalizeProgress);
}

/**
 * Retrieve progress record for a specific student and course.
 */
async function findByStudentAndCourse(studentEmailOrId, courseId) {
  if (!studentEmailOrId || !courseId) return null;
  const sQuery = String(studentEmailOrId).toLowerCase().trim();
  const cQuery = String(courseId).trim();

  const doc = await LearningProgress.findOne({
    $or: [{ studentEmail: sQuery }, { studentId: sQuery }],
    courseId: cQuery,
  }).lean();

  return doc ? normalizeProgress(doc) : null;
}

/**
 * Validate progress metrics.
 * @throws {Error} if constraints are violated.
 */
function validateProgressData({ completedLessons, totalLessons }) {
  if (completedLessons === undefined || completedLessons === null) {
    const err = new Error('completedLessons is required.');
    err.statusCode = 400; throw err;
  }
  if (!Number.isInteger(completedLessons)) {
    const err = new Error('completedLessons must be an integer.');
    err.statusCode = 400; throw err;
  }
  if (completedLessons < 0) {
    const err = new Error('completedLessons cannot be negative.');
    err.statusCode = 400; throw err;
  }
  if (totalLessons === undefined || totalLessons === null) {
    const err = new Error('totalLessons is required.');
    err.statusCode = 400; throw err;
  }
  if (!Number.isInteger(totalLessons)) {
    const err = new Error('totalLessons must be an integer.');
    err.statusCode = 400; throw err;
  }
  if (totalLessons <= 0) {
    const err = new Error('totalLessons must be an integer greater than zero.');
    err.statusCode = 400; throw err;
  }
  if (completedLessons > totalLessons) {
    const err = new Error('completedLessons cannot exceed totalLessons.');
    err.statusCode = 400; throw err;
  }
}

/**
 * Upsert learning progress for (student, course).
 * Enforces compound uniqueness — updates existing record or creates a new one.
 */
async function upsert({ studentId, studentEmail, courseId, completedLessons, totalLessons }) {
  validateProgressData({ completedLessons, totalLessons });

  const progressPercentage = Math.round((completedLessons / totalLessons) * 100);
  const now = Date.now();
  const cleanCourseId  = String(courseId).trim();
  const cleanEmail     = (studentEmail || '').toLowerCase().trim();
  const cleanStudentId = String(studentId || '').trim();

  const filter = {
    $or: [{ studentEmail: cleanEmail }, ...(cleanStudentId ? [{ studentId: cleanStudentId }] : [])],
    courseId: cleanCourseId,
  };

  // Try to find existing record
  let existing = await LearningProgress.findOne(filter).lean();

  if (existing) {
    // Update existing record
    const updated = await LearningProgress.findByIdAndUpdate(
      existing._id,
      {
        $set: {
          completedLessons,
          totalLessons,
          progressPercentage,
          lastAccessedAt: now,
        },
      },
      { returnDocument: 'after' }
    ).lean();
    return normalizeProgress(updated);
  }

  // Create new record
  const recordId = newId();
  const record = new LearningProgress({
    legacyId:           recordId,
    studentId:          cleanStudentId,
    studentEmail:       cleanEmail,
    courseId:           cleanCourseId,
    completedLessons,
    totalLessons,
    progressPercentage,
    lastAccessedAt:     now,
  });

  const saved = await record.save();
  return normalizeProgress(saved);
}

async function remove(id) {
  let doc;
  const legacyMatch = await LearningProgress.findOne({ legacyId: String(id) });
  if (legacyMatch) {
    doc = await LearningProgress.findByIdAndDelete(legacyMatch._id).lean();
  } else {
    const mongoose = require('mongoose');
    if (mongoose.Types.ObjectId.isValid(id)) {
      doc = await LearningProgress.findByIdAndDelete(id).lean();
    }
  }
  return doc ? normalizeProgress(doc) : null;
}

async function removeByCourse(courseId) {
  const docs = await LearningProgress.find({ courseId: String(courseId) }).lean();
  await LearningProgress.deleteMany({ courseId: String(courseId) });
  return docs.map(normalizeProgress);
}

async function removeByStudentAndCourse(studentEmailOrId, courseId) {
  const existing = await findByStudentAndCourse(studentEmailOrId, courseId);
  if (!existing) return null;
  return remove(existing.id);
}

module.exports = {
  findAll,
  findById,
  findByStudent,
  findByStudentAndCourse,
  validateProgressData,
  upsert,
  remove,
  removeByCourse,
  removeByStudentAndCourse,
};
