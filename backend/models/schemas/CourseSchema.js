'use strict';
/**
 * models/schemas/CourseSchema.js
 * Mongoose schema for the courses collection with full course content & quiz support.
 */
const mongoose = require('mongoose');

const quizQuestionSchema = new mongoose.Schema(
  {
    id: { type: String, trim: true },
    question: { type: String, required: true, trim: true },
    options: [{ type: String, trim: true }],
    correctAnswer: { type: Number, required: true, default: 0 },
    explanation: { type: String, trim: true },
    marks: { type: Number, default: 1 },
  },
  { _id: true }
);

const lessonSchema = new mongoose.Schema(
  {
    id: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    content: { type: String, trim: true },
    order: { type: Number, default: 1 },
    duration: { type: String, trim: true },
  },
  { _id: true }
);

const moduleSchema = new mongoose.Schema(
  {
    id: { type: String, trim: true },
    courseId: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    overview: { type: String, trim: true },
    order: { type: Number, default: 1 },
    lessons: [lessonSchema],
    quiz: [quizQuestionSchema],
  },
  { _id: true }
);

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

    modules: [moduleSchema],
    quiz: [quizQuestionSchema],
  },
  {
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
    versionKey: false,
    strict: false,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

courseSchema.virtual('id').get(function () {
  return this.legacyId;
});

const Course = mongoose.model('Course', courseSchema);
module.exports = Course;
