'use strict';
/**
 * models/schemas/UserSchema.js
 * Mongoose schema for the users collection.
 *
 * Stores both students and admins.
 * Password hashes are NEVER returned in API responses (use .select('-password') or toSafeObject()).
 */
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    legacyId: {
      type: String,
      sparse: true,
      index: true,
    },

    fullname: {
      type:     String,
      required: [true, 'Full name is required.'],
      trim:     true,
      minlength: [2, 'Full name must be at least 2 characters.'],
    },

    email: {
      type:     String,
      required: [true, 'Email is required.'],
      unique:   true,
      trim:     true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email address is invalid.'],
    },

    username: {
      type:  String,
      trim:  true,
      lowercase: true,
    },

    department: {
      type:  String,
      trim:  true,
    },

    password: {
      type:     String,
      required: [true, 'Password is required.'],
      select:   false, // NEVER returned by default in queries
    },

    role: {
      type:    String,
      enum:    ['student', 'admin'],
      default: 'student',
    },

    authScheme: {
      type: String,
      enum: ['bcrypt', 'legacy'],
      default: 'bcrypt',
    },
  },
  {
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
    versionKey: false,
  }
);

// ── Instance helper: return safe object (no password) ─────────────────────────
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  obj.id = obj.legacyId || String(obj._id);
  return obj;
};

// ── Static helper: strip password from a plain object ─────────────────────────
userSchema.statics.strip = function (doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  delete obj.password;
  obj.id = obj.legacyId || String(obj._id);
  if (!obj.role) obj.role = 'student';
  return obj;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
