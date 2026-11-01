'use strict';
/**
 * models/schemas/CourseSchema.js
 * Mongoose schema for the courses collection.
 */
const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    legacyId: {
      type:  String,
      required: [true, 'Course ID is required.'],
      unique: true,
      trim:  true,
    },

    title: {
      type:  String,
      trim:  true,
    },

    name: {
      type:  String,
      trim:  true,
    },

    code: {
      type:  String,
      unique: true,
      sparse: true,
      trim:  true,
    },

    domain: {
      type:  String,
      trim:  true,
      default: 'General',
    },

    category: {
      type:  String,
      trim:  true,
    },

    level: {
      type:  String,
      trim:  true,
    },

    instructor: {
      type:  String,
      trim:  true,
    },

    department: {
      type:  String,
      trim:  true,
    },

    duration: {
      type:  String,
      trim:  true,
    },

    seats: {
      type: Number,
    },

    description: {
      type:  String,
      trim:  true,
    },

    skills: {
      type:  String,
      trim:  true,
    },

    color: {
      type:  String,
      trim:  true,
    },
  },
  {
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
    versionKey: false,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

courseSchema.virtual('id').get(function () {
  return this.legacyId;
});

const Course = mongoose.model('Course', courseSchema);
module.exports = Course;
