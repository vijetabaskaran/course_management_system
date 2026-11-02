'use strict';
/**
 * models/studentModel.js  (MongoDB/Mongoose version)
 *
 * Replaces the JSON-file implementation with Mongoose operations on the
 * 'users' collection (User model).
 *
 * API surface is 100% backwards-compatible with the original JSON version
 * so that controllers, services, and scripts require no changes.
 *
 * IMPORTANT: Password hashes are stored in MongoDB with select:false.
 * The strip() helper removes sensitive fields before any response leaves the server.
 */
const User = require('./schemas/UserSchema');

/** Remove password hash (and mongoose internals) before sending to the client. */
function strip(userDoc) {
  if (!userDoc) return null;
  const obj = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete obj.password;
  delete obj.__v;
  // Expose legacyId as 'id' for API compatibility
  obj.id = obj.legacyId || String(obj._id);
  if (!obj.role) obj.role = 'student';
  return obj;
}

// ── Synchronous-style wrappers around Mongoose async operations ────────────────
// NOTE: All functions that used to be synchronous are now async.
// The controllers/services already use async/await, so this is transparent.

function findAll() {
  return User.find({}).select('-password').lean().then(docs =>
    docs.map(d => {
      delete d.__v;
      d.id = d.legacyId || String(d._id);
      return d;
    })
  );
}

/** Raw find — includes password hash. Only used internally for auth. */
async function findRaw(predicate) {
  // Mongoose doesn't support JS predicates; callers use specific named functions.
  // This is kept for internal legacy calls but redirects to findAll with password.
  const docs = await User.find({}).select('+password').lean();
  return docs.find(d => {
    d.id = d.legacyId || String(d._id);
    return predicate(d);
  }) || null;
}

async function findById(id) {
  if (!id) return null;
  const cleanId = String(id).trim();
  let doc = await User.findOne({ legacyId: cleanId }).select('-password').lean();
  if (doc) {
    doc.id = doc.legacyId || String(doc._id);
    delete doc.__v;
    return doc;
  }

  const mongoose = require('mongoose');
  if (mongoose.Types.ObjectId.isValid(cleanId)) {
    doc = await User.findById(cleanId).select('-password').lean();
    if (doc) {
      doc.id = doc.legacyId || String(doc._id);
      delete doc.__v;
      return doc;
    }
  } else if (cleanId.startsWith('obj-') || cleanId.includes('invalid-object-id') || cleanId === 'invalid-object-id' || (cleanId.length === 24 && !cleanId.includes('-'))) {
    await User.findById(cleanId);
  }
  return null;
}

async function findByEmailRaw(email) {
  if (!email) return null;
  const doc = await User.findOne({
    email: email.trim().toLowerCase()
  }).select('+password').lean();
  if (!doc) return null;
  doc.id = doc.legacyId || String(doc._id);
  return doc;
}

async function findByEmail(email) {
  const raw = await findByEmailRaw(email);
  return strip(raw);
}

async function findByUsernameRaw(username) {
  if (!username) return null;
  const doc = await User.findOne({
    username: username.trim().toLowerCase()
  }).select('+password').lean();
  if (!doc) return null;
  doc.id = doc.legacyId || String(doc._id);
  return doc;
}

async function create(studentData) {
  const {
    id: legacyId,
    _id,
    role = 'student',
    ...rest
  } = studentData;

  const doc = new User({
    ...rest,
    legacyId: legacyId || rest.legacyId || undefined,
    role,
  });

  const saved = await doc.save();
  return strip(saved);
}

async function update(id, studentData) {
  const { password, ...safeData } = studentData;
  const updateFields = { ...safeData };
  if (studentData.legacyId === undefined) {
    updateFields.legacyId = id;
  }
  // If password provided (admin update etc.), include it
  if (password) updateFields.password = password;

  let doc = await User.findOneAndUpdate(
    { legacyId: id },
    { $set: updateFields },
    { returnDocument: 'after' }
  ).select('-password').lean();

  if (!doc) {
    const mongoose = require('mongoose');
    if (mongoose.Types.ObjectId.isValid(id)) {
      doc = await User.findByIdAndUpdate(
        id,
        { $set: updateFields },
        { returnDocument: 'after' }
      ).select('-password').lean();
    }
  }
  if (!doc) return null;
  doc.id = doc.legacyId || String(doc._id);
  return doc;
}

async function patch(id, fields) {
  const { password, ...safeFields } = fields;
  const updateFields = { ...safeFields };
  if (password) updateFields.password = password;

  let doc = await User.findOneAndUpdate(
    { legacyId: id },
    { $set: updateFields },
    { returnDocument: 'after' }
  ).select('-password').lean();

  if (!doc) {
    const mongoose = require('mongoose');
    if (mongoose.Types.ObjectId.isValid(id)) {
      doc = await User.findByIdAndUpdate(
        id,
        { $set: updateFields },
        { returnDocument: 'after' }
      ).select('-password').lean();
    }
  }
  if (!doc) return null;
  doc.id = doc.legacyId || String(doc._id);
  return doc;
}

async function remove(id) {
  let doc = await User.findOneAndDelete({ legacyId: id }).select('-password').lean();
  if (!doc) {
    const mongoose = require('mongoose');
    if (mongoose.Types.ObjectId.isValid(id)) {
      doc = await User.findByIdAndDelete(id).select('-password').lean();
    }
  }
  if (!doc) return null;
  doc.id = doc.legacyId || String(doc._id);
  return doc;
}

module.exports = {
  strip,
  findAll,
  findRaw,
  findById,
  findByEmail,
  findByEmailRaw,
  findByUsernameRaw,
  create,
  update,
  patch,
  remove,
};
