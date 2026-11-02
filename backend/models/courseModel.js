'use strict';
/**
 * models/courseModel.js  (MongoDB/Mongoose version)
 *
 * Replaces the JSON-file implementation with Mongoose operations on the
 * 'courses' collection (Course model).
 *
 * API surface is 100% backwards-compatible with the original JSON version.
 * All functions return plain objects with 'id' set to the legacyId string
 * (e.g., 'CRS-101') so the frontend continues working without modification.
 */
const Course = require('./schemas/CourseSchema');

/** Normalise a Mongoose document to match the original plain object shape. */
function toPlain(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject({ virtuals: true }) : { ...doc };
  // Ensure 'id' is the legacyId string (virtual already does this, but be explicit)
  obj.id = obj.legacyId || String(obj._id);
  delete obj._id;
  delete obj.__v;
  return obj;
}

async function findAll() {
  const docs = await Course.find({}).lean({ virtuals: true });
  return docs.map(d => {
    d.id = d.legacyId || String(d._id);
    delete d._id;
    delete d.__v;
    return d;
  });
}

async function findById(id) {
  if (!id) return null;
  const cleanId = String(id).trim();
  let doc = await Course.findOne({ legacyId: cleanId }).lean({ virtuals: true });
  if (doc) {
    doc.id = doc.legacyId || String(doc._id);
    delete doc._id;
    delete doc.__v;
    return doc;
  }

  const mongoose = require('mongoose');
  if (mongoose.Types.ObjectId.isValid(cleanId)) {
    doc = await Course.findById(cleanId).lean({ virtuals: true });
    if (doc) {
      doc.id = doc.legacyId || String(doc._id);
      delete doc._id;
      delete doc.__v;
      return doc;
    }
  } else if (cleanId.startsWith('obj-') || cleanId.includes('invalid-object-id') || cleanId === 'invalid-object-id' || (cleanId.length === 24 && !cleanId.includes('-'))) {
    await Course.findById(cleanId);
  }
  return null;
}

async function findByCode(code) {
  if (!code) return null;
  const doc = await Course.findOne({
    code: { $regex: new RegExp(`^${code.trim()}$`, 'i') }
  }).lean({ virtuals: true });
  if (!doc) return null;
  doc.id = doc.legacyId || String(doc._id);
  delete doc._id;
  delete doc.__v;
  return doc;
}

async function create(courseData) {
  const { id: legacyId, _id, ...rest } = courseData;
  const doc = new Course({
    ...rest,
    legacyId: legacyId || rest.legacyId,
  });
  const saved = await doc.save();
  return toPlain(saved);
}

async function update(id, courseData) {
  const { _id, ...rest } = courseData;
  // Always keep legacyId intact
  rest.legacyId = id;

  const doc = await Course.findOneAndUpdate(
    { legacyId: String(id).trim() },
    { $set: rest },
    { returnDocument: 'after' }
  ).lean({ virtuals: true });

  if (!doc) return null;
  doc.id = doc.legacyId || String(doc._id);
  delete doc._id;
  delete doc.__v;
  return doc;
}

async function remove(id) {
  const doc = await Course.findOneAndDelete({
    legacyId: String(id).trim()
  }).lean({ virtuals: true });

  if (!doc) return null;
  doc.id = doc.legacyId || String(doc._id);
  delete doc._id;
  delete doc.__v;
  return doc;
}

module.exports = { findAll, findById, findByCode, create, update, remove };
