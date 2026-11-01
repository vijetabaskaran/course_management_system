'use strict';
/**
 * test_task13.js
 * Comprehensive end-to-end API test suite for Task 13: Learning Progress Tracking.
 * Validates all required scenarios from the assignment specifications.
 * Runs against local MongoDB via Mongoose.
 */
process.env.TEST_MODE = 'true';

const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { connectDB, disconnectDB } = require('./config/mongoose');
const User             = require('./models/schemas/UserSchema');
const Enrollment       = require('./models/schemas/EnrollmentSchema');
const LearningProgress = require('./models/schemas/LearningProgressSchema');
const app              = require('./server');

let testPort = 4000;

function req(options, body) {
  return new Promise((resolve, reject) => {
    const postData = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (postData) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const requestOptions = {
      hostname: '127.0.0.1',
      port: testPort,
      path: options.path,
      method: options.method || 'GET',
      headers,
    };

    const r = http.request(requestOptions, (res) => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(raw); } catch { /* not json */ }
        resolve({ status: res.statusCode, headers: res.headers, raw, json });
      });
    });

    r.on('error', reject);
    if (postData) r.write(postData);
    r.end();
  });
}

async function runTask13Tests() {
  console.log('\n======================================================');
  console.log('   Task 13: Learning Progress Tracking Test Suite');
  console.log('======================================================\n');

  // Connect to MongoDB
  await connectDB();

  // Start temporary server
  const server = app.listen(0);
  await new Promise(r => server.once('listening', r));
  testPort = server.address().port;

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  const studentAEmail = `task13.studentA.${Date.now()}@example.com`;
  const studentBEmail = `task13.studentB.${Date.now()}@example.com`;

  try {
    // ── Setup: Register Student A & Student B, and get Admin token ──
    const regARes = await req({ path: '/api/v1/auth/register', method: 'POST' }, {
      fullname: 'Student A',
      email: studentAEmail,
      password: 'Password123!',
      department: 'Computer Science',
    });
    const tokenA = regARes.json?.token;

    const regBRes = await req({ path: '/api/v1/auth/register', method: 'POST' }, {
      fullname: 'Student B',
      email: studentBEmail,
      password: 'Password123!',
      department: 'Data Science',
    });
    const tokenB = regBRes.json?.token;

    const adminRes = await req({ path: '/api/v1/auth/login', method: 'POST' }, {
      email: 'admin@eduportal.com',
      password: 'AdminSecure2026!',
    });
    const adminToken = adminRes.json?.token;

    // Enroll Student A in CRS-101 and CRS-102
    await req({ path: '/api/v1/enrollments', method: 'POST', headers: { 'Authorization': `Bearer ${tokenA}` } }, { courseId: 'CRS-101' });
    await req({ path: '/api/v1/enrollments', method: 'POST', headers: { 'Authorization': `Bearer ${tokenA}` } }, { courseId: 'CRS-102' });

    // Enroll Student B in CRS-102 only
    await req({ path: '/api/v1/enrollments', method: 'POST', headers: { 'Authorization': `Bearer ${tokenB}` } }, { courseId: 'CRS-102' });

    // ── Test 1: Student without progress records receives empty array (200 OK) ──
    const emptyProgRes = await req({ path: '/api/v1/progress/my-progress', headers: { 'Authorization': `Bearer ${tokenA}` } });
    assert(emptyProgRes.status === 200, 'Student without progress records receives HTTP 200');
    assert(emptyProgRes.json?.totalCourses === 0 && Array.isArray(emptyProgRes.json?.progress) && emptyProgRes.json?.progress.length === 0,
      'Progress response has totalCourses: 0 and empty progress array');

    // ── Test 2: Request without JWT returns HTTP 401 ──
    const unauthRes = await req({ path: '/api/v1/progress/my-progress' });
    assert(unauthRes.status === 401, 'Request to GET /my-progress without JWT returns HTTP 401');

    const unauthPut = await req({ path: '/api/v1/progress', method: 'PUT' }, { courseId: 'CRS-101', completedLessons: 1, totalLessons: 5 });
    assert(unauthPut.status === 401, 'Request to PUT /progress without JWT returns HTTP 401');

    // ── Test 3: Invalid or malformed JWT returns HTTP 401 ──
    const malformedRes = await req({ path: '/api/v1/progress/my-progress', headers: { 'Authorization': 'Bearer malformed.invalid.token' } });
    assert(malformedRes.status === 401, 'Request with invalid/malformed JWT returns HTTP 401');

    // ── Test 4: Administrator attempts to update progress returns HTTP 403 ──
    const adminPut = await req({ path: '/api/v1/progress', method: 'PUT', headers: { 'Authorization': `Bearer ${adminToken}` } }, {
      courseId: 'CRS-101',
      completedLessons: 4,
      totalLessons: 10,
    });
    assert(adminPut.status === 403, 'Administrator attempting to update progress returns HTTP 403 Forbidden');

    const adminGet = await req({ path: '/api/v1/progress/my-progress', headers: { 'Authorization': `Bearer ${adminToken}` } });
    assert(adminGet.status === 403, 'Administrator attempting to access /my-progress returns HTTP 403 Forbidden');

    // ── Test 5: Invalid course ID returns HTTP 400 ──
    const badCourseId = await req({ path: '/api/v1/progress', method: 'PUT', headers: { 'Authorization': `Bearer ${tokenA}` } }, {
      courseId: '',
      completedLessons: 1,
      totalLessons: 5,
    });
    assert(badCourseId.status === 400, 'Empty or invalid courseId returns HTTP 400');

    // ── Test 6: Nonexistent course returns HTTP 404 without creating progress ──
    const nonExistCourse = await req({ path: '/api/v1/progress', method: 'PUT', headers: { 'Authorization': `Bearer ${tokenA}` } }, {
      courseId: 'CRS-DOES-NOT-EXIST-999',
      completedLessons: 1,
      totalLessons: 5,
    });
    assert(nonExistCourse.status === 404, 'Nonexistent course returns HTTP 404');

    // ── Test 7: Student without an active enrollment tries to update progress returns HTTP 403 ──
    // Student B is NOT enrolled in CRS-101
    const unenrolledPut = await req({ path: '/api/v1/progress', method: 'PUT', headers: { 'Authorization': `Bearer ${tokenB}` } }, {
      courseId: 'CRS-101',
      completedLessons: 2,
      totalLessons: 10,
    });
    assert(unenrolledPut.status === 403, 'Student without enrollment tries to update progress returns HTTP 403 Forbidden');

    // ── Test 8: Negative completedLessons returns HTTP 400 ──
    const negLessons = await req({ path: '/api/v1/progress', method: 'PUT', headers: { 'Authorization': `Bearer ${tokenA}` } }, {
      courseId: 'CRS-101',
      completedLessons: -1,
      totalLessons: 10,
    });
    assert(negLessons.status === 400, 'Negative completedLessons returns HTTP 400');

    // ── Test 9: completedLessons greater than totalLessons returns HTTP 400 ──
    const excessLessons = await req({ path: '/api/v1/progress', method: 'PUT', headers: { 'Authorization': `Bearer ${tokenA}` } }, {
      courseId: 'CRS-101',
      completedLessons: 11,
      totalLessons: 10,
    });
    assert(excessLessons.status === 400, 'completedLessons greater than totalLessons returns HTTP 400');

    // ── Test 10: totalLessons equal to zero returns HTTP 400 ──
    const zeroTotal = await req({ path: '/api/v1/progress', method: 'PUT', headers: { 'Authorization': `Bearer ${tokenA}` } }, {
      courseId: 'CRS-101',
      completedLessons: 0,
      totalLessons: 0,
    });
    assert(zeroTotal.status === 400, 'totalLessons equal to zero returns HTTP 400');

    // ── Test 11: Decimal lesson counts return HTTP 400 ──
    const decimalLessons = await req({ path: '/api/v1/progress', method: 'PUT', headers: { 'Authorization': `Bearer ${tokenA}` } }, {
      courseId: 'CRS-101',
      completedLessons: 3.5,
      totalLessons: 10,
    });
    assert(decimalLessons.status === 400, 'Decimal completedLessons returns HTTP 400');

    const decimalTotal = await req({ path: '/api/v1/progress', method: 'PUT', headers: { 'Authorization': `Bearer ${tokenA}` } }, {
      courseId: 'CRS-101',
      completedLessons: 3,
      totalLessons: 9.5,
    });
    assert(decimalTotal.status === 400, 'Decimal totalLessons returns HTTP 400');

    // ── Test 12: Student updates an enrolled course from 4/10 to 7/10: HTTP 200, progressPercentage 70 ──
    // First, set 4/10
    const set4Res = await req({ path: '/api/v1/progress', method: 'PUT', headers: { 'Authorization': `Bearer ${tokenA}` } }, {
      courseId: 'CRS-101',
      completedLessons: 4,
      totalLessons: 10,
    });
    assert(set4Res.status === 200, 'Initial progress update (4/10) returns HTTP 200');
    assert(set4Res.json?.progress?.progressPercentage === 40, 'Progress percentage for 4/10 is 40%');

    // Now update to 7/10
    const set7Res = await req({ path: '/api/v1/progress', method: 'PUT', headers: { 'Authorization': `Bearer ${tokenA}` } }, {
      courseId: 'CRS-101',
      completedLessons: 7,
      totalLessons: 10,
    });
    assert(set7Res.status === 200, 'Update from 4/10 to 7/10 returns HTTP 200');
    assert(set7Res.json?.progress?.progressPercentage === 70, 'Calculated progressPercentage is 70%');
    assert(set7Res.json?.progress?.completedLessons === 7, 'Stored completedLessons is 7');
    assert(set7Res.json?.progress?.totalLessons === 10, 'Stored totalLessons is 10');

    // ── Test 13: Duplicate progress records are prevented (record is updated in-place) ──
    const checkDupList = await req({ path: '/api/v1/progress/my-progress', headers: { 'Authorization': `Bearer ${tokenA}` } });
    const crs101Records = (checkDupList.json?.progress || []).filter(p => p.courseId === 'CRS-101');
    assert(crs101Records.length === 1, 'Duplicate progress records are prevented (exactly 1 record exists for CRS-101)');

    // ── Test 14: Student retrieves their own progress: HTTP 200 with populated course information ──
    assert(checkDupList.status === 200, 'Student retrieves own progress with HTTP 200');
    assert(crs101Records[0]?.course?.title !== undefined, 'Course title is populated on progress record');
    assert(crs101Records[0]?.course?.id === 'CRS-101', 'Course ID is populated on progress record');

    // ── Test 15: Student A and Student B progress isolation ──
    // Student B updates CRS-102 to 2/10
    await req({ path: '/api/v1/progress', method: 'PUT', headers: { 'Authorization': `Bearer ${tokenB}` } }, {
      courseId: 'CRS-102',
      completedLessons: 2,
      totalLessons: 10,
    });
    const progBRes = await req({ path: '/api/v1/progress/my-progress', headers: { 'Authorization': `Bearer ${tokenB}` } });
    assert(progBRes.json?.totalCourses === 1, 'Student B sees only 1 progress record');
    assert(progBRes.json?.progress[0]?.courseId === 'CRS-102', 'Student B sees only their course');
    assert(progBRes.json?.progress[0]?.completedLessons === 2, 'Student B progress is independent of Student A');

    // Check Student A does not see Student B's progress
    const progARes = await req({ path: '/api/v1/progress/my-progress', headers: { 'Authorization': `Bearer ${tokenA}` } });
    const studentACRS102 = progARes.json?.progress.find(p => p.courseId === 'CRS-102');
    assert(studentACRS102 === undefined, 'Student A does not see progress on CRS-102 yet');

    // ── Test 16: Student updates a course to 10/10: HTTP 200, progressPercentage 100, enrollment becomes completed ──
    const completeRes = await req({ path: '/api/v1/progress', method: 'PUT', headers: { 'Authorization': `Bearer ${tokenA}` } }, {
      courseId: 'CRS-101',
      completedLessons: 10,
      totalLessons: 10,
    });
    assert(completeRes.status === 200, 'Student updates course to 10/10 returns HTTP 200');
    assert(completeRes.json?.progress?.progressPercentage === 100, 'Progress percentage reaches 100%');

    // Verify enrollment status in database is now "completed"
    const myCoursesRes = await req({ path: '/api/v1/enrollments/my-courses', headers: { 'Authorization': `Bearer ${tokenA}` } });
    const crs101Enrollment = myCoursesRes.json?.enrollments.find(e => e.courseId === 'CRS-101');
    assert(crs101Enrollment?.status === 'completed', 'Enrollment status in database becomes "completed" upon reaching 100%');

    // ── Test 17: Completed course remains visible after refreshing progress endpoint ──
    const refreshProg = await req({ path: '/api/v1/progress/my-progress', headers: { 'Authorization': `Bearer ${tokenA}` } });
    const completedRecord = refreshProg.json?.progress.find(p => p.courseId === 'CRS-101');
    assert(completedRecord !== undefined, 'Completed course remains visible in GET /my-progress');
    assert(completedRecord?.progressPercentage === 100, 'Completed course retains 100% progress percentage');

    // ── Test 18: Path prefix compatibility (/progress vs /api/v1/progress) ──
    const altRouteGet = await req({ path: '/progress/my-progress', headers: { 'Authorization': `Bearer ${tokenA}` } });
    assert(altRouteGet.status === 200, 'GET /progress/my-progress (alias route) returns HTTP 200');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    // Clean up temporary test data from MongoDB
    try {
      await User.deleteMany({ email: { $in: [studentAEmail, studentBEmail] } });
      await Enrollment.deleteMany({ studentEmail: { $in: [studentAEmail, studentBEmail] } });
      await LearningProgress.deleteMany({ studentEmail: { $in: [studentAEmail, studentBEmail] } });
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr.message);
    }
    server.close();
    await disconnectDB();
  }

  console.log(`\n======================================================`);
  console.log(`Task 13 Verification Results: ${passed} Passed, ${failed} Failed`);
  console.log(`======================================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTask13Tests();
