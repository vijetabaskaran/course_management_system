'use strict';
/**
 * models/enrollmentModel.js  (MongoDB/Mongoose version)
 *
 * Replaces the JSON-file implementation with Mongoose operations on the
 * 'enrollments' collection (Enrollment model).
 *
 * API surface is 100% backwards-compatible with the original JSON version.
 * Compound unique index on (studentEmail, courseId) is enforced at the database level.
 */
const Enrollment = require('./schemas/EnrollmentSchema');

function normalizeEnrollment(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  delete obj.__v;
  // Expose as 'id' (legacyId or ObjectId string) for API compatibility
  obj.id = obj.legacyId || String(obj._id);
  obj.status    = obj.status || 'active';
  obj.enrolledAt = obj.enrolledAt || obj.createdAt || Date.now();
  return obj;
}

async function findAll() {
  const docs = await Enrollment.find({}).lean();
  return docs.map(normalizeDoc);
}

function normalizeDoc(d) {
  if (!d) return null;
  d.id = d.legacyId || String(d._id);
  d.status = d.status || 'active';
  d.enrolledAt = d.enrolledAt || Date.now();
  delete d.__v;
  return d;
}

async function findById(id) {
  if (!id) return null;
  // Try legacyId first
  let doc = await Enrollment.findOne({ legacyId: String(id) }).lean();
  if (!doc) {
    const mongoose = require('mongoose');
    if (mongoose.Types.ObjectId.isValid(id)) {
      doc = await Enrollment.findById(id).lean();
    }
  }
  return doc ? normalizeDoc(doc) : null;
}

/**
 * Retrieve all enrollments belonging to a student (by email or user id).
 */
async function findByStudent(studentEmailOrId) {
  if (!studentEmailOrId) return [];
  const query = String(studentEmailOrId).toLowerCase().trim();
  const docs = await Enrollment.find({
    $or: [
      { studentEmail: query },
      { studentId: query },
    ],
  }).lean();
  return docs.map(normalizeDoc);
}

/**
 * Find enrollment for a specific student and course.
 */
async function findByStudentAndCourse(studentEmailOrId, courseId) {
  if (!studentEmailOrId || !courseId) return null;
  const sQuery = String(studentEmailOrId).toLowerCase().trim();
  const cQuery = String(courseId).trim();

  const doc = await Enrollment.findOne({
    $or: [{ studentEmail: sQuery }, { studentId: sQuery }],
    courseId: cQuery,
  }).lean();

  return doc ? normalizeDoc(doc) : null;
}

/**
 * Persist an enrollment record.
 * Enforces database-level uniqueness on (studentEmail, courseId).
 */
async function create(enrollmentData) {
  const {
    id: legacyId,
    _id,
    ...rest
  } = enrollmentData;

  const now = Date.now();
  const record = new Enrollment({
    ...rest,
    legacyId: legacyId || rest.legacyId || undefined,
    status:     rest.status || 'active',
    enrolledAt: rest.enrolledAt || now,
  });

  try {
    const saved = await record.save();
    return normalizeEnrollment(saved);
  } catch (err) {
    if (err.code === 11000) {
      const dupErr = new Error(
        `Duplicate enrollment: student "${rest.studentEmail}" is already enrolled in course "${rest.courseId}".`
      );
      dupErr.code = 11000;
      dupErr.statusCode = 409;
      throw dupErr;
    }
    throw err;
  }
}

async function patch(id, fields) {
  // Find by legacyId or ObjectId
  let doc;
  const legacyMatch = await Enrollment.findOne({ legacyId: String(id) });
  if (legacyMatch) {
    doc = await Enrollment.findByIdAndUpdate(
      legacyMatch._id,
      { $set: fields },
      { returnDocument: 'after' }
    ).lean();
  } else {
    const mongoose = require('mongoose');
    if (mongoose.Types.ObjectId.isValid(id)) {
      doc = await Enrollment.findByIdAndUpdate(
        id,
        { $set: fields },
        { returnDocument: 'after' }
      ).lean();
    }
  }
  return doc ? normalizeDoc(doc) : null;
}

async function remove(id) {
  let doc;
  const legacyMatch = await Enrollment.findOne({ legacyId: String(id) });
  if (legacyMatch) {
    doc = await Enrollment.findByIdAndDelete(legacyMatch._id).lean();
  } else {
    const mongoose = require('mongoose');
    if (mongoose.Types.ObjectId.isValid(id)) {
      doc = await Enrollment.findByIdAndDelete(id).lean();
    }
  }
  return doc ? normalizeDoc(doc) : null;
}

/**
 * Remove an enrollment by student identity and course ID.
 */
async function removeByStudentAndCourse(studentEmailOrId, courseId) {
  const existing = await findByStudentAndCourse(studentEmailOrId, courseId);
  if (!existing) return null;
  return remove(existing.id);
}

/** Remove all enrollments for a given course (called when a course is deleted). */
async function removeByCourse(courseId) {
  const docs = await Enrollment.find({ courseId: String(courseId) }).lean();
  await Enrollment.deleteMany({ courseId: String(courseId) });
  return docs.map(normalizeDoc);
}

module.exports = {
  findAll,
  findById,
  findByStudent,
  findByStudentAndCourse,
  create,
  patch,
  remove,
  removeByStudentAndCourse,
  removeByCourse,
};
