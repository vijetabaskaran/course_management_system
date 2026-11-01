'use strict';
/**
 * models/schemas/EnrollmentSchema.js
 * Mongoose schema for the enrollments collection.
 */
const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema(
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

    status: {
      type:    String,
      enum:    ['active', 'completed'],
      default: 'active',
    },

    enrolledAt: {
      type:    Number,
      default: () => Date.now(),
    },

    completedAt: {
      type: Number,
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

// Compound unique index: one enrollment per student per course
enrollmentSchema.index(
  { studentEmail: 1, courseId: 1 },
  { unique: true, name: 'unique_student_course' }
);

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
module.exports = Enrollment;
