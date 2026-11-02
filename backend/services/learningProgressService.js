'use strict';
/**
 * services/learningProgressService.js  (MongoDB/Mongoose version)
 * Business logic for Learning Progress Tracking.
 */
const learningProgressModel = require('../models/learningProgressModel');
const enrollmentModel       = require('../models/enrollmentModel');
const courseModel           = require('../models/courseModel');

/**
 * Update or initialize learning progress for the authenticated student.
 * @param {{ id: string, email: string, role: string }} user - Verified JWT student identity.
 * @param {{ courseId: string, completedLessons: number, totalLessons: number, completedUnits?: number, totalUnits?: number, completedUnitIds?: string[], completedLessonIds?: string[] }} body
 * @returns {Promise<{ message: string, progress: object }>}
 */
async function updateProgress(user, body) {
  // 1. Authenticated user validation
  if (!user || (!user.email && !user.id)) {
    const err = new Error('Authentication required.');
    err.statusCode = 401;
    throw err;
  }

  const {
    courseId,
    completedLessons,
    totalLessons,
    completedUnits: bodyCompletedUnits,
    totalUnits: bodyTotalUnits,
    completedUnitIds,
    completedLessonIds,
  } = body || {};

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

  // 5. Verify enrollment (student must be enrolled with status 'active' or 'completed')
  const studentRef = (user.email || user.id || '').toLowerCase().trim();
  const enrollment = await enrollmentModel.findByStudentAndCourse(studentRef, cleanCourseId);

  if (!enrollment) {
    const err = new Error(`Forbidden: You are not enrolled in course "${cleanCourseId}".`);
    err.statusCode = 403;
    throw err;
  }

  if (enrollment.status !== 'active' && enrollment.status !== 'completed') {
    const err = new Error(`Forbidden: You do not have an active enrollment in this course (current status: ${enrollment.status}).`);
    err.statusCode = 403;
    throw err;
  }

  // Calculate units dynamically
  const courseModules = (course.modules && course.modules.length > 0) ? course.modules : [];
  const dynamicTotalUnits = courseModules.length > 0 ? courseModules.length : 1;
  const totalUnits = typeof bodyTotalUnits === 'number' && bodyTotalUnits > 0 ? bodyTotalUnits : dynamicTotalUnits;

  const isFullyComplete = completedLessons === totalLessons;

  let completedUnits = 0;
  if (isFullyComplete) {
    completedUnits = totalUnits;
  } else if (Number.isInteger(bodyCompletedUnits) && bodyCompletedUnits >= 0) {
    completedUnits = Math.min(bodyCompletedUnits, totalUnits);
  } else if (courseModules.length > 0) {
    let remaining = completedLessons;
    for (const mod of courseModules) {
      const modLessonsCount = (mod.lessons && mod.lessons.length > 0) ? mod.lessons.length : 1;
      if (remaining >= modLessonsCount) {
        completedUnits++;
        remaining -= modLessonsCount;
      } else {
        break;
      }
    }
  }

  // Unit IDs drive which modules the learning view unlocks, so they must always
  // agree with completedUnits (e.g. after a lesson-count-only update).
  let unitIds;
  if (Array.isArray(completedUnitIds) && !isFullyComplete) {
    unitIds = completedUnitIds.map(String).slice(0, completedUnits);
  } else {
    unitIds = Array.from({ length: completedUnits }, (_, i) => String(i + 1));
  }

  // 6. Upsert the progress record
  const savedProgress = await learningProgressModel.upsert({
    studentId: user.id || '',
    studentEmail: user.email || '',
    courseId: cleanCourseId,
    completedLessons,
    totalLessons,
    completedUnits,
    totalUnits,
    completedUnitIds: unitIds,
    completedLessonIds,
  });

  // 7. Keep enrollment status in step with progress (completed at 100%, active otherwise)
  let enrollmentStatus = enrollment.status;
  if (savedProgress.progressPercentage === 100 && enrollment.status !== 'completed') {
    await enrollmentModel.patch(enrollment.id, {
      status: 'completed',
      completedAt: Date.now(),
    });
    enrollmentStatus = 'completed';
  } else if (savedProgress.progressPercentage < 100 && enrollment.status === 'completed') {
    await enrollmentModel.patch(enrollment.id, { status: 'active', completedAt: null });
    enrollmentStatus = 'active';
  }

  // 8. Populate course details in the returned progress object
  const populated = {
    ...savedProgress,
    enrollmentStatus,
    course: {
      _id:        course.id,
      id:         course.id,
      title:      course.title || course.name,
      name:       course.name || course.title,
      code:       course.code,
      domain:     course.domain || course.category,
      instructor: course.instructor,
      color:      course.color,
      modules:    course.modules,
    },
  };

  return {
    message: 'Learning progress updated successfully',
    progress: populated,
  };
}

/**
 * Retrieve the authenticated student's progress records for enrolled courses (active or completed).
 * Guarantees every enrolled course is represented (defaulting to 0% if unstarted).
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
  const enrollmentMap = new Map();
  validEnrollments.forEach(e => enrollmentMap.set(e.courseId, e));

  // Retrieve student progress records from MongoDB
  const allProgress = await learningProgressModel.findByStudent(studentRef);
  const progressMap = new Map();
  allProgress.forEach(p => {
    if (enrollmentMap.has(p.courseId)) {
      progressMap.set(p.courseId, p);
    }
  });

  // For every valid enrolled course, build a comprehensive progress record
  const populatedList = await Promise.all(
    validEnrollments.map(async (enrollment) => {
      const courseId = enrollment.courseId;
      const course = (await courseModel.findById(courseId)) || {};
      const courseModules = (course.modules && course.modules.length > 0) ? course.modules : [];
      const totalUnits = courseModules.length > 0 ? courseModules.length : 1;

      // Count total lessons across modules, or fallback to default
      let defaultTotalLessons = 10;
      if (courseModules.length > 0) {
        const sum = courseModules.reduce((acc, m) => acc + (m.lessons?.length || 1), 0);
        if (sum > 0) defaultTotalLessons = sum;
      }

      const p = progressMap.get(courseId);

      if (p) {
        const recordTotalUnits = p.totalUnits || totalUnits;
        const recordCompletedUnits = p.progressPercentage === 100
          ? recordTotalUnits
          : Math.min(p.completedUnits || 0, recordTotalUnits);
        const recordUnitIds = p.completedUnitIds.length === recordCompletedUnits
          ? p.completedUnitIds
          : Array.from({ length: recordCompletedUnits }, (_, i) => String(i + 1));
        return {
          ...p,
          enrollmentStatus: p.progressPercentage === 100 ? 'completed' : 'active',
          totalUnits: recordTotalUnits,
          completedUnits: recordCompletedUnits,
          completedUnitIds: recordUnitIds,
          course: {
            _id:        course.id || courseId,
            id:         course.id || courseId,
            title:      course.title || course.name || courseId,
            name:       course.name || course.title || courseId,
            code:       course.code || courseId,
            domain:     course.domain || course.category || 'General',
            instructor: course.instructor,
            color:      course.color,
            modules:    course.modules,
          },
        };
      }

      // Default 0% record for enrolled course with no progress record yet
      const isCompleted = enrollment.status === 'completed';
      return {
        id:                 `prog-default-${courseId}`,
        studentId:          user.id || '',
        studentEmail:       studentRef,
        courseId:           courseId,
        completedLessons:   isCompleted ? defaultTotalLessons : 0,
        totalLessons:       defaultTotalLessons,
        completedUnits:     isCompleted ? totalUnits : 0,
        totalUnits:         totalUnits,
        completedUnitIds:   [],
        completedLessonIds: [],
        progressPercentage: isCompleted ? 100 : 0,
        enrollmentStatus:   enrollment.status || 'active',
        lastAccessedAt:     enrollment.enrolledAt || enrollment.createdAt || Date.now(),
        course: {
          _id:        course.id || courseId,
          id:         course.id || courseId,
          title:      course.title || course.name || courseId,
          name:       course.name || course.title || courseId,
          code:       course.code || courseId,
          domain:     course.domain || course.category || 'General',
          instructor: course.instructor,
          color:      course.color,
          modules:    course.modules,
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
