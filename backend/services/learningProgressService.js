'use strict';
/**
 * services/learningProgressService.js  (MongoDB/Mongoose version)
 * Business logic for Task 13 Learning Progress Tracking.
 */
const learningProgressModel = require('../models/learningProgressModel');
const enrollmentModel       = require('../models/enrollmentModel');
const courseModel           = require('../models/courseModel');

/**
 * Update or initialize learning progress for the authenticated student.
 * @param {{ id: string, email: string, role: string }} user - Verified JWT student identity.
 * @param {{ courseId: string, completedLessons: number, totalLessons: number }} body
 * @returns {Promise<{ message: string, progress: object }>}
 */
async function updateProgress(user, body) {
  // 1. Authenticated user validation
  if (!user || (!user.email && !user.id)) {
    const err = new Error('Authentication required.');
    err.statusCode = 401;
    throw err;
  }

  const { courseId, completedLessons, totalLessons } = body || {};

  // 2. Validate courseId
  if (!courseId || typeof courseId !== 'string' || !courseId.trim()) {
    const err = new Error('A valid courseId is required in the request body.');
    err.statusCode = 400;
    throw err;
  }

  const cleanCourseId = courseId.trim();

  // 3. Check if course exists in the catalog
  const course = await courseModel.findById(cleanCourseId);
  if (!course) {
    const err = new Error(`Course with ID "${cleanCourseId}" does not exist.`);
    err.statusCode = 404;
    throw err;
  }

  // 4. Validate lesson counts (integers, non-negative, valid bounds)
  learningProgressModel.validateProgressData({ completedLessons, totalLessons });

  // 5. Verify active enrollment (student must be enrolled with status 'active')
  const studentRef = (user.email || user.id || '').toLowerCase().trim();
  const enrollment = await enrollmentModel.findByStudentAndCourse(studentRef, cleanCourseId);

  if (!enrollment) {
    const err = new Error(`Forbidden: You are not enrolled in course "${cleanCourseId}".`);
    err.statusCode = 403;
    throw err;
  }

  if (enrollment.status !== 'active') {
    const err = new Error(`Forbidden: You do not have an active enrollment in this course (current status: ${enrollment.status}).`);
    err.statusCode = 403;
    throw err;
  }

  // 6. Upsert the progress record
  const savedProgress = await learningProgressModel.upsert({
    studentId: user.id || '',
    studentEmail: user.email || '',
    courseId: cleanCourseId,
    completedLessons,
    totalLessons,
  });

  // 7. Automatic completion: when progress reaches 100%, mark enrollment as completed
  if (savedProgress.progressPercentage === 100) {
    await enrollmentModel.patch(enrollment.id, {
      status: 'completed',
      completedAt: Date.now(),
    });
  }

  // 8. Populate course details in the returned progress object
  const populated = {
    ...savedProgress,
    course: {
      _id:        course.id,
      id:         course.id,
      title:      course.title || course.name,
      name:       course.name || course.title,
      code:       course.code,
      domain:     course.domain || course.category,
      instructor: course.instructor,
      color:      course.color,
    },
  };

  return {
    message: 'Learning progress updated successfully',
    progress: populated,
  };
}

/**
 * Retrieve the authenticated student's progress records for enrolled courses (active or completed).
 * @param {{ id: string, email: string, role: string }} user - Verified JWT student identity.
 * @returns {Promise<{ message: string, totalCourses: number, progress: Array }>}
 */
async function getMyProgress(user) {
  if (!user || (!user.email && !user.id)) {
    const err = new Error('Authentication required.');
    err.statusCode = 401;
    throw err;
  }

  const studentRef = (user.email || user.id || '').toLowerCase().trim();

  // Retrieve student enrollments
  const allEnrollments = await enrollmentModel.findByStudent(studentRef);
  // Include only courses where enrollment status is 'active' or 'completed'
  const validEnrollments = allEnrollments.filter(e => e.status === 'active' || e.status === 'completed');
  const validCourseIds = new Set(validEnrollments.map(e => e.courseId));

  // Retrieve student progress records
  const allProgress = await learningProgressModel.findByStudent(studentRef);

  // Filter progress records to those belonging to active/completed enrolled courses
  const filteredProgress = allProgress.filter(p => validCourseIds.has(p.courseId));

  // Populate course details
  const populatedList = await Promise.all(
    filteredProgress.map(async (p) => {
      const course = (await courseModel.findById(p.courseId)) || {};
      const enrollment = validEnrollments.find((e) => e.courseId === p.courseId);

      return {
        ...p,
        enrollmentStatus: enrollment?.status || (p.progressPercentage === 100 ? 'completed' : 'active'),
        course: {
          _id:        course.id || p.courseId,
          id:         course.id || p.courseId,
          title:      course.title || course.name || p.courseId,
          name:       course.name || course.title || p.courseId,
          code:       course.code || p.courseId,
          domain:     course.domain || course.category || 'General',
          instructor: course.instructor,
          color:      course.color,
        },
      };
    })
  );

  // Sort by most recently updated / accessed (newest first)
  populatedList.sort((a, b) => {
    const timeA = a.updatedAt || a.lastAccessedAt || a.createdAt || 0;
    const timeB = b.updatedAt || b.lastAccessedAt || b.createdAt || 0;
    return timeB - timeA;
  });

  return {
    message: 'Learning progress fetched successfully',
    totalCourses: populatedList.length,
    progress: populatedList,
  };
}

module.exports = {
  updateProgress,
  getMyProgress,
};
