'use strict';
/**
 * scripts/migrateJsonToMongo.js
 * Dedicated, idempotent migration script to migrate records from db.json to local MongoDB.
 *
 * Rules:
 *  - Reads backend/data/db.json safely.
 *  - NEVER deletes, overwrites, empties, or modifies backend/data/db.json.
 *  - Safe to rerun without creating duplicates (uses upserts / duplicate checks).
 *  - Preserves already-hashed passwords as-is without double-hashing.
 *  - Preserves user roles (admin, student).
 *  - Preserves all course attributes and legacy IDs.
 *  - Preserves enrollment and progress records and updates their references correctly.
 *  - Prints a comprehensive migration summary.
 */
const fs   = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { connectDB, disconnectDB } = require('../config/mongoose');
const User             = require('../models/schemas/UserSchema');
const Course           = require('../models/schemas/CourseSchema');
const Enrollment       = require('../models/schemas/EnrollmentSchema');
const LearningProgress = require('../models/schemas/LearningProgressSchema');

const DB_JSON_PATH = path.join(__dirname, '..', 'data', 'db.json');

async function migrate() {
  console.log('\n======================================================');
  console.log('  EduPortal — JSON to MongoDB Migration Script');
  console.log('======================================================\n');

  // 1. Verify JSON file exists
  if (!fs.existsSync(DB_JSON_PATH)) {
    throw new Error(`Original JSON database not found at ${DB_JSON_PATH}`);
  }

  // 2. Read and parse db.json
  console.log(`[1/5] Reading original JSON data from ${DB_JSON_PATH}...`);
  const rawContent = fs.readFileSync(DB_JSON_PATH, 'utf8');
  let data;
  try {
    data = JSON.parse(rawContent);
  } catch (parseErr) {
    throw new Error(`Failed to parse db.json: ${parseErr.message}`);
  }

  const rawStudents   = Array.isArray(data.students) ? data.students : [];
  const rawCourses    = Array.isArray(data.courses) ? data.courses : [];
  const rawEnrollments = Array.isArray(data.enrollments) ? data.enrollments : [];
  const rawProgress   = Array.isArray(data.learningProgress) ? data.learningProgress : [];

  console.log(`      Found in JSON:`);
  console.log(`      - Users/Students : ${rawStudents.length}`);
  console.log(`      - Courses        : ${rawCourses.length}`);
  console.log(`      - Enrollments    : ${rawEnrollments.length}`);
  console.log(`      - Progress items : ${rawProgress.length}\n`);

  // 3. Connect to MongoDB
  console.log('[2/5] Connecting to MongoDB...');
  await connectDB();

  const summary = {
    users:       { total: rawStudents.length, imported: 0, skipped: 0, failed: 0 },
    courses:     { total: rawCourses.length, imported: 0, skipped: 0, failed: 0 },
    enrollments: { total: rawEnrollments.length, imported: 0, skipped: 0, failed: 0 },
    progress:    { total: rawProgress.length, imported: 0, skipped: 0, failed: 0 },
    errors:      [],
  };

  // Mapping tables for relational integrity
  // oldStudentId/email -> User document
  const studentMap = new Map();
  // oldCourseId/code -> Course document
  const courseMap = new Map();

  // 4. Migrate Users / Students
  console.log('[3/5] Migrating Users/Students to MongoDB "users" collection...');
  for (const s of rawStudents) {
    try {
      if (!s.email) {
        summary.users.failed++;
        summary.errors.push(`Student missing email: ${JSON.stringify(s)}`);
        continue;
      }

      const normEmail = s.email.trim().toLowerCase();
      // Check if user already exists in MongoDB
      let existingUser = await User.findOne({ email: normEmail }).select('+password');

      if (existingUser) {
        summary.users.skipped++;
        studentMap.set(normEmail, existingUser);
        if (s.id) studentMap.set(String(s.id), existingUser);
      } else {
        const authScheme = s.authScheme || (s.password && s.password.startsWith('$2') ? 'bcrypt' : 'legacy');
        const newUser = new User({
          legacyId:   s.id ? String(s.id) : undefined,
          fullname:   s.fullname || s.username || 'Student',
          email:      normEmail,
          username:   s.username ? s.username.trim().toLowerCase() : normEmail.split('@')[0],
          department: s.department || 'General',
          password:   s.password, // preserve already-hashed password as-is
          role:       s.role || 'student',
          authScheme,
          createdAt:  s.createdAt ? new Date(s.createdAt) : new Date(),
        });

        const savedUser = await newUser.save();
        summary.users.imported++;
        studentMap.set(normEmail, savedUser);
        if (s.id) studentMap.set(String(s.id), savedUser);
      }
    } catch (err) {
      summary.users.failed++;
      summary.errors.push(`User error (${s.email}): ${err.message}`);
    }
  }

  // Also query any other existing users in MongoDB to populate studentMap
  const allDbUsers = await User.find({}).lean();
  for (const u of allDbUsers) {
    studentMap.set(u.email.toLowerCase(), u);
    if (u.legacyId) studentMap.set(String(u.legacyId), u);
  }

  // 5. Migrate Courses
  console.log('[4/5] Migrating Courses to MongoDB "courses" collection...');
  for (const c of rawCourses) {
    try {
      const courseId = c.id ? String(c.id).trim() : null;
      if (!courseId) {
        summary.courses.failed++;
        summary.errors.push(`Course missing id: ${JSON.stringify(c)}`);
        continue;
      }

      let existingCourse = await Course.findOne({
        $or: [
          { legacyId: courseId },
          ...(c.code ? [{ code: c.code.trim() }] : []),
        ],
      });

      if (existingCourse) {
        summary.courses.skipped++;
        courseMap.set(courseId, existingCourse);
        if (existingCourse.code) courseMap.set(existingCourse.code.toLowerCase(), existingCourse);
      } else {
        const title = (c.title || c.name || 'Untitled Course').trim();
        const newCourse = new Course({
          legacyId:    courseId,
          title,
          name:        c.name || title,
          code:        c.code ? c.code.trim() : `CRS-${courseId}`,
          domain:      c.domain || c.category || 'General',
          category:    c.category || c.domain || 'General',
          level:       c.level || 'Beginner',
          instructor:  c.instructor || 'Staff',
          department:  c.department || '',
          duration:    c.duration || '8 Weeks',
          seats:       typeof c.seats === 'number' ? c.seats : 40,
          description: c.description || '',
          skills:      c.skills || '',
          color:       c.color || 'linear-gradient(135deg, #3776AB, #1E415E)',
          createdAt:   c.createdAt ? new Date(c.createdAt) : new Date(),
          updatedAt:   c.updatedAt ? new Date(c.updatedAt) : new Date(),
        });

        const savedCourse = await newCourse.save();
        summary.courses.imported++;
        courseMap.set(courseId, savedCourse);
        if (savedCourse.code) courseMap.set(savedCourse.code.toLowerCase(), savedCourse);
      }
    } catch (err) {
      summary.courses.failed++;
      summary.errors.push(`Course error (${c.id}): ${err.message}`);
    }
  }

  // Also query any other existing courses in MongoDB to populate courseMap
  const allDbCourses = await Course.find({}).lean();
  for (const c of allDbCourses) {
    courseMap.set(c.legacyId, c);
    if (c.code) courseMap.set(c.code.toLowerCase(), c);
  }

  // 6. Migrate Enrollments
  console.log('[5/5] Migrating Enrollments to MongoDB "enrollments" collection...');
  for (const e of rawEnrollments) {
    try {
      const studentEmail = (e.studentEmail || '').trim().toLowerCase();
      const courseId     = (e.courseId || '').trim();

      if (!studentEmail || !courseId) {
        summary.enrollments.failed++;
        summary.errors.push(`Enrollment missing studentEmail or courseId: ${JSON.stringify(e)}`);
        continue;
      }

      // Resolve student reference
      const userRef = studentMap.get(studentEmail) || studentMap.get(String(e.studentId));
      const studentId = userRef ? (userRef.legacyId || String(userRef._id)) : (e.studentId || '');

      // Check if enrollment already exists in MongoDB
      const existingEnrollment = await Enrollment.findOne({
        studentEmail,
        courseId,
      });

      if (existingEnrollment) {
        summary.enrollments.skipped++;
      } else {
        const newEnrollment = new Enrollment({
          legacyId:   e.id ? String(e.id) : undefined,
          studentId,
          studentEmail,
          courseId,
          status:     e.status || 'active',
          enrolledAt: e.enrolledAt || e.createdAt || Date.now(),
          completedAt: e.completedAt || undefined,
          createdAt:  e.createdAt ? new Date(e.createdAt) : new Date(),
          updatedAt:  e.updatedAt ? new Date(e.updatedAt) : new Date(),
        });

        await newEnrollment.save();
        summary.enrollments.imported++;
      }
    } catch (err) {
      if (err.code === 11000) {
        summary.enrollments.skipped++;
      } else {
        summary.enrollments.failed++;
        summary.errors.push(`Enrollment error (${e.id}): ${err.message}`);
      }
    }
  }

  // 7. Migrate Learning Progress (if any exist in db.json)
  for (const p of rawProgress) {
    try {
      const studentEmail = (p.studentEmail || p.student || '').trim().toLowerCase();
      const courseId     = (p.courseId || p.course || '').trim();

      if (!studentEmail || !courseId) {
        summary.progress.failed++;
        summary.errors.push(`Progress missing studentEmail or courseId: ${JSON.stringify(p)}`);
        continue;
      }

      const existingProgress = await LearningProgress.findOne({
        studentEmail,
        courseId,
      });

      if (existingProgress) {
        summary.progress.skipped++;
      } else {
        const completed = typeof p.completedLessons === 'number' ? p.completedLessons : 0;
        const total     = typeof p.totalLessons === 'number' && p.totalLessons > 0 ? p.totalLessons : 1;
        const pct       = typeof p.progressPercentage === 'number' ? p.progressPercentage : Math.round((completed / total) * 100);

        const newProgress = new LearningProgress({
          legacyId:           p.id ? String(p.id) : undefined,
          studentId:          p.studentId || '',
          studentEmail,
          courseId,
          completedLessons:   completed,
          totalLessons:       total,
          progressPercentage: pct,
          lastAccessedAt:     p.lastAccessedAt || Date.now(),
          createdAt:          p.createdAt ? new Date(p.createdAt) : new Date(),
          updatedAt:          p.updatedAt ? new Date(p.updatedAt) : new Date(),
        });

        await newProgress.save();
        summary.progress.imported++;
      }
    } catch (err) {
      if (err.code === 11000) {
        summary.progress.skipped++;
      } else {
        summary.progress.failed++;
        summary.errors.push(`Progress error (${p.id}): ${err.message}`);
      }
    }
  }

  // 8. Print Migration Summary
  console.log('\n======================================================');
  console.log('                 MIGRATION SUMMARY');
  console.log('======================================================');
  console.log(`Users:`);
  console.log(`  - Total found    : ${summary.users.total}`);
  console.log(`  - Imported       : ${summary.users.imported}`);
  console.log(`  - Skipped (exist): ${summary.users.skipped}`);
  console.log(`  - Failed         : ${summary.users.failed}`);
  console.log(`Courses:`);
  console.log(`  - Total found    : ${summary.courses.total}`);
  console.log(`  - Imported       : ${summary.courses.imported}`);
  console.log(`  - Skipped (exist): ${summary.courses.skipped}`);
  console.log(`  - Failed         : ${summary.courses.failed}`);
  console.log(`Enrollments:`);
  console.log(`  - Total found    : ${summary.enrollments.total}`);
  console.log(`  - Imported       : ${summary.enrollments.imported}`);
  console.log(`  - Skipped (exist): ${summary.enrollments.skipped}`);
  console.log(`  - Failed         : ${summary.enrollments.failed}`);
  console.log(`Learning Progress:`);
  console.log(`  - Total found    : ${summary.progress.total}`);
  console.log(`  - Imported       : ${summary.progress.imported}`);
  console.log(`  - Skipped (exist): ${summary.progress.skipped}`);
  console.log(`  - Failed         : ${summary.progress.failed}`);

  if (summary.errors.length > 0) {
    console.log('\nWarnings / Errors:');
    summary.errors.forEach(e => console.log(`  ! ${e}`));
  }

  console.log('\nVerification:');
  const [dbUserCount, dbCourseCount, dbEnrollCount, dbProgCount] = await Promise.all([
    User.countDocuments(),
    Course.countDocuments(),
    Enrollment.countDocuments(),
    LearningProgress.countDocuments(),
  ]);

  console.log(`  MongoDB "users" document count            : ${dbUserCount}`);
  console.log(`  MongoDB "courses" document count          : ${dbCourseCount}`);
  console.log(`  MongoDB "enrollments" document count      : ${dbEnrollCount}`);
  console.log(`  MongoDB "learningprogresses" document count: ${dbProgCount}`);
  console.log('======================================================\n');

  await disconnectDB();
  return summary;
}

if (require.main === module) {
  migrate().catch(async (err) => {
    console.error('\n❌ Fatal Migration Error:', err.message);
    try {
      await disconnectDB();
    } catch (_) {}
    process.exit(1);
  });
}

module.exports = migrate;

