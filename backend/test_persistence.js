'use strict';
/**
 * test_persistence.js
 * Validates Section 14 Persistence Requirements:
 * 1. Create a test student.
 * 2. Enroll the student in a course.
 * 3. Update progress.
 * 4. Stop the backend.
 * 5. Restart the backend.
 * 6. Log in again.
 * 7. Verify that enrollment and progress are still available.
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

function makeRequest(port, options, bodyData) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, json, raw: data });
      });
    });

    req.on('error', reject);
    if (bodyData) {
      req.write(typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData));
    }
    req.end();
  });
}

async function runPersistenceTest() {
  console.log('\n======================================================');
  console.log('   Testing Data Persistence across Server Restart');
  console.log('======================================================\n');

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

  const email = `persist_student_${Date.now()}@example.com`;
  const password = 'PersistPass123!';

  // Connect to MongoDB
  await connectDB();

  // ── Step 1 & 2: Start server 1 ──
  console.log('[Phase 1] Starting backend instance 1...');
  let server1 = app.listen(0);
  await new Promise(r => server1.once('listening', r));
  let port1 = server1.address().port;

  try {
    // 1. Create a test student
    console.log('[Phase 1] Registering test student...');
    const regRes = await makeRequest(port1, { path: '/api/v1/auth/register', method: 'POST' }, {
      fullname: 'Persistence Tester',
      email,
      department: 'Computer Science',
      password,
    });
    assert(regRes.status === 201 && regRes.json?.token, '1. Test student created successfully');
    const token1 = regRes.json?.token;

    // 2. Enroll the student in a course (CRS-101)
    console.log('[Phase 1] Enrolling student in course CRS-101...');
    const enrollRes = await makeRequest(port1, {
      path: '/api/v1/enrollments',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token1}` },
    }, { courseId: 'CRS-101' });
    assert(enrollRes.status === 201, '2. Enrolled student in course CRS-101');

    // 3. Update progress (6/10 -> 60%)
    console.log('[Phase 1] Updating progress to 6/10 lessons (60%)...');
    const progRes = await makeRequest(port1, {
      path: '/api/v1/progress',
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token1}` },
    }, { courseId: 'CRS-101', completedLessons: 6, totalLessons: 10 });
    assert(progRes.status === 200 && progRes.json?.progress?.progressPercentage === 60,
      '3. Updated progress to 6/10 (60%)');

    // 4. Stop the backend
    console.log('[Phase 1] Stopping backend instance 1...');
    await new Promise(r => server1.close(r));
    assert(true, '4. Stopped backend instance 1');

    // 5. Restart the backend (Instance 2 on a new port)
    console.log('\n[Phase 2] Restarting backend (Instance 2)...');
    let server2 = app.listen(0);
    await new Promise(r => server2.once('listening', r));
    let port2 = server2.address().port;
    assert(true, '5. Restarted backend instance 2');

    // 6. Log in again
    console.log('[Phase 2] Logging in again with student credentials...');
    const loginRes = await makeRequest(port2, { path: '/api/v1/auth/login', method: 'POST' }, {
      email,
      password,
    });
    assert(loginRes.status === 200 && loginRes.json?.token, '6. Logged in successfully after restart');
    const token2 = loginRes.json?.token;

    // 7. Verify that enrollment and progress are still available
    console.log('[Phase 2] Verifying enrollment and progress persist in MongoDB...');
    const myCoursesRes = await makeRequest(port2, {
      path: '/api/v1/enrollments/my-courses',
      headers: { 'Authorization': `Bearer ${token2}` },
    });
    assert(myCoursesRes.status === 200, '7a. GET /my-courses returns HTTP 200 after restart');
    const enrolledCRS101 = myCoursesRes.json?.enrollments.find(e => e.courseId === 'CRS-101');
    assert(enrolledCRS101 !== undefined, '7b. Enrollment in CRS-101 persisted and is found');
    assert(enrolledCRS101?.course?.title !== undefined, '7c. Populated course details persist');

    const progressRes = await makeRequest(port2, {
      path: '/api/v1/progress/my-progress',
      headers: { 'Authorization': `Bearer ${token2}` },
    });
    assert(progressRes.status === 200, '7d. GET /my-progress returns HTTP 200 after restart');
    const progCRS101 = progressRes.json?.progress.find(p => p.courseId === 'CRS-101');
    assert(progCRS101 !== undefined, '7e. Progress record for CRS-101 persisted and is found');
    assert(progCRS101?.completedLessons === 6 && progCRS101?.totalLessons === 10 && progCRS101?.progressPercentage === 60,
      '7f. Completed lessons (6), total lessons (10), and progress (60%) persisted accurately in MongoDB');

    // Clean up server 2
    await new Promise(r => server2.close(r));
  } catch (err) {
    console.error('Persistence test failed:', err);
    failed++;
  } finally {
    // Clean up test student
    try {
      await User.deleteMany({ email });
      await Enrollment.deleteMany({ studentEmail: email });
      await LearningProgress.deleteMany({ studentEmail: email });
    } catch (_) {}
    await disconnectDB();
  }

  console.log(`\n======================================================`);
  console.log(`Persistence Verification Results: ${passed} Passed, ${failed} Failed`);
  console.log(`======================================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runPersistenceTest();

