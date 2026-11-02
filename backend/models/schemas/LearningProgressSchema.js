'use strict';
/**
 * models/schemas/LearningProgressSchema.js
 * Mongoose schema for the learningprogresses collection.
 */
const mongoose = require('mongoose');

const learningProgressSchema = new mongoose.Schema(
  {
    legacyId: {
      type:  String,
      sparse: true,
      index: true,
    },

    studentId: {
      type:  String,
      trim:  true,
    },

    studentEmail: {
      type:      String,
      required:  [true, 'Student email is required.'],
      trim:      true,
      lowercase: true,
      index:     true,
    },

    courseId: {
      type:     String,
      required: [true, 'Course ID is required.'],
      trim:     true,
      index:    true,
    },

    completedLessons: {
      type:    Number,
      default: 0,
      min:     [0, 'completedLessons cannot be negative.'],
      validate: {
        validator: Number.isInteger,
        message: 'completedLessons must be an integer.',
      },
    },

    totalLessons: {
      type:    Number,
      default: 1,
      min:     [1, 'totalLessons must be greater than zero.'],
      validate: {
        validator: Number.isInteger,
        message: 'totalLessons must be an integer.',
      },
    },

    completedUnits: {
      type:    Number,
      default: 0,
      min:     0,
    },

    totalUnits: {
      type:    Number,
      default: 1,
      min:     1,
    },

    completedUnitIds: [{
      type: String,
      trim: true,
    }],

    completedLessonIds: [{
      type: String,
      trim: true,
    }],

    progressPercentage: {
      type:    Number,
      default: 0,
      min:     0,
      max:     100,
    },

    lastAccessedAt: {
      type:    Number,
      default: () => Date.now(),
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

// Compound unique index: one progress record per student per course
learningProgressSchema.index(
  { studentEmail: 1, courseId: 1 },
  { unique: true, name: 'unique_student_course_progress' }
);

const LearningProgress = mongoose.model('LearningProgress', learningProgressSchema, 'learningprogress');
module.exports = LearningProgress;
