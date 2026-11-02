'use strict';
/**
 * test_progress.js
 * Regression suite for progress-bar data: unit/lesson consistency, completion
 * status transitions, enrollment progress joins, and re-enrollment resets.
 * Uses a throwaway course with 3 modules (2 + 3 + 1 = 6 lessons).
 */
process.env.TEST_MODE = 'true';

const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { connectDB, disconnectDB } = require('./config/mongoose');
const User             = require('./models/schemas/UserSchema');
const Course           = require('./models/schemas/CourseSchema');
const Enrollment       = require('./models/schemas/EnrollmentSchema');
const LearningProgress = require('./models/schemas/LearningProgressSchema');
const app              = require('./server');

let port = 0;

function call(method, urlPath, token, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    const r = http.request({ hostname: '127.0.0.1', port, path: urlPath, method, headers }, res => {
      let raw = '';
      res.on('data', c => { raw += c; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(raw); } catch { /* not json */ }
        resolve({ status: res.statusCode, json });
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function run() {
  await connectDB();
  const server = app.listen(0);
  await new Promise(r => server.once('listening', r));
  port = server.address().port;

  let passed = 0;
  let failed = 0;
  const assert = (cond, msg) => {
    if (cond) { console.log(`  ✓ ${msg}`); passed++; }
    else { console.error(`  ✗ FAIL: ${msg}`); failed++; }
  };

  const stamp    = Date.now();
  const courseId = `CRS-PBTEST-${stamp}`;
  const email    = `progress.${stamp}@example.com`;

  console.log('\n======================================================');
  console.log('   Progress Bar Consistency Test Suite');
  console.log('======================================================\n');

  try {
    const lesson = (t) => ({ title: t, content: 'x' });
    await Course.create({
      legacyId: courseId,
      title: 'Progress Bar Test Course',
      code: `PB-${stamp}`,
      modules: [
        { id: 'm1', title: 'Module 1', lessons: [lesson('1a'), lesson('1b')] },
        { id: 'm2', title: 'Module 2', lessons: [lesson('2a'), lesson('2b'), lesson('2c')] },
        { id: 'm3', title: 'Module 3', lessons: [lesson('3a')] },
      ],
    });

    const reg = await call('POST', '/api/v1/auth/register', null, {
      fullname: 'Progress Tester', email, password: 'Password123!', department: 'Computer Science',
    });
    const token = reg.json?.token;
    assert(!!token, 'Student registered and received a token');

    const enroll = await call('POST', '/api/v1/enrollments', token, { courseId });
    assert(enroll.status === 201, 'Student enrolls in the 3-module course');

    // ── Default state ──
    let mine = await call('GET', '/api/v1/progress/my-progress', token);
    let rec = mine.json?.progress?.find(p => p.courseId === courseId);
    assert(rec && rec.progressPercentage === 0 && rec.totalLessons === 6 && rec.totalUnits === 3,
      'Fresh enrollment reports 0% with 6 lessons / 3 units derived from modules');

    // ── Learning view: complete module 1 (sends unit data like CourseLearningView) ──
    let put = await call('PUT', '/api/v1/progress', token, {
      courseId, completedLessons: 2, totalLessons: 6, completedUnits: 1, totalUnits: 3, completedUnitIds: ['1'],
    });
    assert(put.status === 200 && put.json?.progress?.progressPercentage === 33, 'Module 1 complete -> 33%');
    assert(put.json?.progress?.completedUnits === 1 && put.json?.progress?.completedUnitIds.join() === '1',
      'Module 1 complete -> completedUnits 1, completedUnitIds ["1"]');
    assert(put.json?.progress?.enrollmentStatus === 'active', 'PUT response carries enrollmentStatus "active"');

    // ── GET /enrollments (used by admin + student overview bars) includes progress ──
    const all = await call('GET', '/enrollments');
    const enr = Array.isArray(all.json) ? all.json.find(e => e.studentEmail === email && e.courseId === courseId) : null;
    assert(all.status === 200, 'GET /enrollments returns 200');
    assert(enr && enr.progressPercentage === 33 && enr.completedUnits === 1 && enr.totalUnits === 3,
      'GET /enrollments annotates each enrollment with its real progress (33%, 1/3 units)');

    // ── My courses reflects the same numbers ──
    let myCourses = await call('GET', '/api/v1/enrollments/my-courses', token);
    let mc = myCourses.json?.enrollments?.find(e => e.courseId === courseId);
    assert(mc && mc.progressPercentage === 33 && mc.completedUnits === 1 && mc.totalUnits === 3,
      'my-courses reports 33% and 1/3 units');

    // ── Lesson-count-only update (MyLearningProgress form) keeps unit ids consistent ──
    put = await call('PUT', '/progress', token, { courseId, completedLessons: 5, totalLessons: 6 });
    assert(put.json?.progress?.progressPercentage === 83, 'Lesson-only update 5/6 -> 83%');
    assert(put.json?.progress?.completedUnits === 2 && put.json?.progress?.completedUnitIds.join() === '1,2',
      'Lesson-only update derives completedUnits 2 and completedUnitIds ["1","2"]');

    put = await call('PUT', '/progress', token, { courseId, completedLessons: 0, totalLessons: 6 });
    assert(put.json?.progress?.completedUnits === 0 && put.json?.progress?.completedUnitIds.length === 0,
      'Resetting lessons to 0 clears stale completedUnitIds (no phantom unlocked modules)');

    // ── Client cannot claim more units than exist ──
    put = await call('PUT', '/api/v1/progress', token, {
      courseId, completedLessons: 2, totalLessons: 6, completedUnits: 9, totalUnits: 3, completedUnitIds: ['1', '2', '3', '4'],
    });
    assert(put.json?.progress?.completedUnits === 3 && put.json?.progress?.completedUnitIds.length === 3,
      'completedUnits is clamped to totalUnits');

    // ── Full completion ──
    put = await call('PUT', '/api/v1/progress', token, {
      courseId, completedLessons: 6, totalLessons: 6, completedUnits: 3, totalUnits: 3, completedUnitIds: ['1', '2', '3'],
    });
    assert(put.json?.progress?.progressPercentage === 100 && put.json?.progress?.enrollmentStatus === 'completed',
      'All modules complete -> 100% and enrollmentStatus "completed"');
    let dbEnr = await Enrollment.findOne({ studentEmail: email, courseId }).lean();
    assert(dbEnr?.status === 'completed', 'Enrollment is marked completed in MongoDB');

    myCourses = await call('GET', '/api/v1/enrollments/my-courses', token);
    mc = myCourses.json?.enrollments?.find(e => e.courseId === courseId);
    assert(mc && mc.status === 'completed' && mc.progressPercentage === 100 && mc.completedUnits === 3,
      'my-courses shows completed, 100%, 3/3 units');

    // ── Progress lowered after completion reverts status ──
    put = await call('PUT', '/progress', token, { courseId, completedLessons: 3, totalLessons: 6 });
    assert(put.json?.progress?.progressPercentage === 50 && put.json?.progress?.enrollmentStatus === 'active',
      'Lowering progress to 50% reverts enrollmentStatus to "active"');
    dbEnr = await Enrollment.findOne({ studentEmail: email, courseId }).lean();
    assert(dbEnr?.status === 'active', 'Enrollment status reverts to active in MongoDB');
    mine = await call('GET', '/api/v1/progress/my-progress', token);
    rec = mine.json?.progress?.find(p => p.courseId === courseId);
    assert(rec && rec.enrollmentStatus === 'active' && rec.completedUnits === 1,
      'my-progress agrees: active, 1 completed unit at 3/6 lessons');

    // ── Rounding must never auto-complete ──
    put = await call('PUT', '/progress', token, { courseId, completedLessons: 199, totalLessons: 200 });
    assert(put.json?.progress?.progressPercentage === 99 && put.json?.progress?.enrollmentStatus === 'active',
      '199/200 lessons shows 99% and does not complete the course');

    // ── Unenroll keeps history hidden; re-enroll starts fresh ──
    const un = await call('DELETE', `/api/v1/enrollments/${courseId}`, token);
    assert(un.status === 200, 'Student unenrolls');
    mine = await call('GET', '/api/v1/progress/my-progress', token);
    assert(!mine.json?.progress?.some(p => p.courseId === courseId), 'Unenrolled course is hidden from my-progress');

    const re = await call('POST', '/api/v1/enrollments', token, { courseId });
    assert(re.status === 201, 'Student re-enrolls');
    mine = await call('GET', '/api/v1/progress/my-progress', token);
    rec = mine.json?.progress?.find(p => p.courseId === courseId);
    assert(rec && rec.progressPercentage === 0 && rec.completedUnits === 0,
      'Re-enrollment starts at 0% instead of inheriting stale progress');
  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    try {
      await User.deleteMany({ email });
      await Enrollment.deleteMany({ studentEmail: email });
      await LearningProgress.deleteMany({ studentEmail: email });
      await Course.deleteMany({ legacyId: courseId });
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr.message);
    }
    server.close();
    await disconnectDB();
  }

  console.log('\n======================================================');
  console.log(`Progress Bar Results: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');
  process.exit(failed > 0 ? 1 : 0);
}

run();
