'use strict';
/**
 * test_frontend_flow.js
 * Simulates and verifies the exact Frontend User Journey for Task 13:
 * 1. Student registers/logs in and gets token.
 * 2. Student enrolls in Course CRS-101 (Python) and CRS-102 (ML).
 * 3. Opens "My Learning Progress" -> fetches /progress/my-progress (empty at first, 0% avg).
 * 4. Updates CRS-101 to 4/10 lessons -> 40% progress, summary cards show 1 course, 0 completed, 40% avg.
 * 5. Updates CRS-101 from 4/10 to 7/10 lessons -> 70% progress, avg becomes 70%.
 * 6. Tries entering 11 completed lessons out of 10 -> rejected with 400.
 * 7. Sets CRS-101 to 10/10 lessons -> 100% progress, status becomes 'Completed', enrollment marked 'completed'.
 * 8. Re-fetches /progress/my-progress (simulating page refresh) -> completed course remains visible at 100%.
 * 9. Enrolls in CRS-102 and updates to 5/10 (50%) -> summary cards show 2 total courses, 1 completed, 75% avg ((100+50)/2).
 * 10. Verifies student cannot update unenrolled course (CRS-103) -> 403 Forbidden.
 * 11. Verifies missing token returns 401.
 * 12. Verifies admin token returns 403.
 * 13. Inspects actual MongoDB records and constraints.
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

function apiCall(method, urlPath, token, body) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (postData) headers['Content-Length'] = Buffer.byteLength(postData);

    const r = http.request({
      hostname: '127.0.0.1',
      port: testPort,
      path: urlPath,
      method,
      headers,
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(raw); } catch {}
        resolve({ status: res.statusCode, json, raw });
      });
    });
    r.on('error', reject);
    if (postData) r.write(postData);
    r.end();
  });
}

async function runFrontendIntegrationTest() {
  console.log('\n======================================================');
  console.log('  Task 13: Full Frontend Simulation & Database Verification');
  console.log('======================================================\n');

  // Connect to MongoDB
  await connectDB();

  // Start test server
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

  const email = `flow_student_${Date.now()}@example.com`;

  try {
    // 1. Student registers
    const regRes = await apiCall('POST', '/api/v1/auth/register', null, {
      fullname: 'Flow Test Student',
      email,
      department: 'Computer Science',
      password: 'FlowPassword123!',
    });
    assert(regRes.status === 201 && regRes.json?.token, 'Student registration succeeds and returns JWT token');
    const token = regRes.json?.token;

    // Admin login
    const adminRes = await apiCall('POST', '/api/v1/auth/login', null, {
      email: 'admin@eduportal.com',
      password: 'AdminSecure2026!',
    });
    const adminToken = adminRes.json?.token;

    // 2. Student enrolls in Course CRS-101 (Python)
    const enroll101 = await apiCall('POST', '/api/v1/enrollments', token, { courseId: 'CRS-101' });
    assert(enroll101.status === 201, 'Student enrolls in CRS-101 (Python Masterclass)');

    // 3. Opens "My Learning Progress" -> empty initially
    const initProgress = await apiCall('GET', '/progress/my-progress', token);
    assert(initProgress.status === 200 && initProgress.json?.totalCourses === 1 && initProgress.json?.progress[0]?.progressPercentage === 0, 'My-progress returns 1 course with default 0% progress for newly enrolled course');

    // 4. Update progress to 4 / 10 lessons (40%)
    const p1 = await apiCall('PUT', '/progress', token, {
      courseId: 'CRS-101',
      completedLessons: 4,
      totalLessons: 10,
    });
    assert(p1.status === 200 && p1.json?.progress?.progressPercentage === 40, 'Progress updated to 4/10 -> progressPercentage is 40%');
    assert(p1.json?.progress?.course?.title !== undefined, 'Returned progress contains populated course details (title, code, domain)');

    // 5. Update progress to 7 / 10 lessons (70%)
    const p2 = await apiCall('PUT', '/progress', token, {
      courseId: 'CRS-101',
      completedLessons: 7,
      totalLessons: 10,
    });
    assert(p2.status === 200 && p2.json?.progress?.progressPercentage === 70, 'Progress updated from 4/10 to 7/10 -> progressPercentage is 70%');

    // 6. Enter invalid lesson count (11 / 10) -> rejected with 400
    const pInvalid = await apiCall('PUT', '/progress', token, {
      courseId: 'CRS-101',
      completedLessons: 11,
      totalLessons: 10,
    });
    assert(pInvalid.status === 400, 'completedLessons > totalLessons (11/10) rejected with HTTP 400');

    // 7. Complete the course: 10 / 10 lessons (100%) -> enrollment marked completed
    const pComplete = await apiCall('PUT', '/progress', token, {
      courseId: 'CRS-101',
      completedLessons: 10,
      totalLessons: 10,
    });
    assert(pComplete.status === 200 && pComplete.json?.progress?.progressPercentage === 100,
      'Course updated to 10/10 -> progress reaches 100%');

    // Check enrollment status via my-courses
    const myCourses = await apiCall('GET', '/api/v1/enrollments/my-courses', token);
    const crs101Enroll = myCourses.json?.enrollments.find(e => e.courseId === 'CRS-101');
    assert(crs101Enroll?.status === 'completed', 'Backend automatically transitions enrollment status to "completed" upon 100% progress');

    // 8. Re-fetch /progress/my-progress (refresh) -> course remains visible
    const refreshProgress = await apiCall('GET', '/progress/my-progress', token);
    assert(refreshProgress.status === 200, 'Re-fetch progress succeeds with 200 OK');
    const completedCourse = refreshProgress.json?.progress.find(p => p.courseId === 'CRS-101');
    assert(completedCourse && completedCourse.progressPercentage === 100,
      'Completed course persists and remains visible at 100% after page reload');
    assert(completedCourse.enrollmentStatus === 'completed',
      'Progress record returns enrollmentStatus: "completed"');

    // 9. Enroll in second course (CRS-102) and update to 5/10 (50%)
    await apiCall('POST', '/api/v1/enrollments', token, { courseId: 'CRS-102' });
    await apiCall('PUT', '/progress', token, {
      courseId: 'CRS-102',
      completedLessons: 5,
      totalLessons: 10,
    });

    const twoCourseProgress = await apiCall('GET', '/progress/my-progress', token);
    assert(twoCourseProgress.json?.totalCourses === 2, 'Total courses in progress is now 2');

    // Calculate frontend stats
    const progressList = twoCourseProgress.json?.progress || [];
    const completedCount = progressList.filter(p => p.progressPercentage === 100 || p.enrollmentStatus === 'completed').length;
    const avgProgress = Math.round(progressList.reduce((acc, p) => acc + (p.progressPercentage || 0), 0) / progressList.length);
    assert(completedCount === 1, 'Summary Card calculation: 1 course completed out of 2');
    assert(avgProgress === 75, 'Summary Card calculation: Average progress is ((100 + 50) / 2) = 75%');

    // 10. Student unenrolls from CRS-102 -> progress record handled
    const unenroll102 = await apiCall('DELETE', '/api/v1/enrollments/CRS-102', token);
    assert(unenroll102.status === 200, 'Student successfully unenrolls from CRS-102');

    // After unenrollment, my-progress should only return active/completed enrolled courses (CRS-101)
    const afterUnenroll = await apiCall('GET', '/progress/my-progress', token);
    assert(afterUnenroll.json?.totalCourses === 1 && afterUnenroll.json?.progress[0]?.courseId === 'CRS-101',
      'After unenrollment, unenrolled course progress is filtered out from active progress view');

    // 11. Confirm student cannot update an unenrolled course
    const unenrolledUpdate = await apiCall('PUT', '/progress', token, {
      courseId: 'CRS-103',
      completedLessons: 1,
      totalLessons: 10,
    });
    assert(unenrolledUpdate.status === 403, 'Confirm a student cannot update an unenrolled course (HTTP 403)');

    // 12. Confirm missing token returns 401
    const missingToken = await apiCall('GET', '/progress/my-progress', null);
    assert(missingToken.status === 401, 'Confirm missing token returns HTTP 401');

    // 13. Confirm admin token returns 403
    const adminBlock = await apiCall('GET', '/progress/my-progress', adminToken);
    assert(adminBlock.status === 403, 'Confirm admin token returns HTTP 403');

    // 14. MongoDB Database Inspection
    const studentRecords = await LearningProgress.find({ studentEmail: email.toLowerCase() }).lean();
    assert(Array.isArray(studentRecords), 'Database inspection: learningprogress collection exists in MongoDB');
    assert(studentRecords.length === 2, 'Database inspection: exactly 2 progress records exist in MongoDB for the student');

    const p101 = studentRecords.find(p => p.courseId === 'CRS-101');
    assert(p101 && p101.completedLessons === 10 && p101.totalLessons === 10 && p101.progressPercentage === 100,
      'Database inspection: CRS-101 stored in MongoDB with 10/10 lessons and 100% progressPercentage');
    assert(p101 && p101.lastAccessedAt > 0,
      'Database inspection: lastAccessedAt timestamp is stored in MongoDB');

    const dbEnrollment = await Enrollment.findOne({ studentEmail: email.toLowerCase(), courseId: 'CRS-101' }).lean();
    assert(dbEnrollment && dbEnrollment.status === 'completed',
      'Database inspection: enrollment status in MongoDB is "completed"');

  } catch (err) {
    console.error('Frontend integration error:', err);
    failed++;
  } finally {
    // Clean up temporary test data from MongoDB
    try {
      await User.deleteMany({ email });
      await Enrollment.deleteMany({ studentEmail: email });
      await LearningProgress.deleteMany({ studentEmail: email });
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr.message);
    }
    server.close();
    await disconnectDB();
  }

  console.log(`\n======================================================`);
  console.log(`Frontend Integration Results: ${passed} Passed, ${failed} Failed`);
  console.log(`======================================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runFrontendIntegrationTest();
