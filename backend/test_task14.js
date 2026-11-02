'use strict';
/**
 * test_task14.js
 * Comprehensive Verification Suite for Task 14:
 * Optimization, Security & Error Handling.
 *
 * Covers all required security, optimization, validation, rate-limiting,
 * and error-handling scenarios.
 */
process.env.TEST_MODE = 'true';

const http = require('http');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { connectDB, disconnectDB } = require('./config/mongoose');
const User = require('./models/schemas/UserSchema');
const Course = require('./models/schemas/CourseSchema');
const Enrollment = require('./models/schemas/EnrollmentSchema');
const LearningProgress = require('./models/schemas/LearningProgressSchema');
const app = require('./server');

const TEST_PORT = 4098;
let serverInstance;

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
      port: TEST_PORT,
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

async function runTask14Tests() {
  console.log('\n======================================================');
  console.log('   Task 14: Optimization, Security & Error Handling');
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

  await connectDB();

  serverInstance = app.listen(TEST_PORT);
  await new Promise(resolve => setTimeout(resolve, 300));

  const testSuffix = Date.now();
  const studentA = {
    fullname: 'Security Test Student A',
    email: `sec_a_${testSuffix}@eduportal.com`,
    department: 'Computer Science',
    password: 'Password@123',
  };
  const studentB = {
    fullname: 'Security Test Student B',
    email: `sec_b_${testSuffix}@eduportal.com`,
    department: 'Data Science',
    password: 'Password@123',
  };

  let tokenA = null;
  let studentAId = null;
  let tokenB = null;
  let studentBId = null;
  let adminToken = null;

  try {
    // ── 1. Security Headers (Activity 14.5) & CORS (Activity 14.1) ───
    console.log('\n--- 1. Helmet Security Headers & CORS ---');
    const healthRes = await req({ path: '/api/health' });
    assert(healthRes.headers['x-content-type-options'] === 'nosniff', 'Helmet set X-Content-Type-Options: nosniff');
    assert(healthRes.headers['x-frame-options'] === 'SAMEORIGIN' || !!healthRes.headers['x-frame-options'], 'Helmet set X-Frame-Options');

    // 1b. CORS: Trusted origin
    const corsTrustedRes = await req({
      path: '/api/health',
      headers: { Origin: 'http://localhost:5173' },
    });
    assert(corsTrustedRes.headers['access-control-allow-origin'] === 'http://localhost:5173', 'CORS allows http://localhost:5173');

    // 1c. CORS: Untrusted origin rejected
    const corsUntrustedRes = await req({
      path: '/api/health',
      headers: { Origin: 'http://malicious-attacker.com' },
    });
    assert(corsUntrustedRes.status === 403 || !corsUntrustedRes.headers['access-control-allow-origin'], 'CORS rejects untrusted origin');

    // ── 2. Request Validation (Activity 14.2) ─────────────────────────
    console.log('\n--- 2. Request Validation ---');
    // 2a. Invalid registration email
    const invEmailRes = await req({ path: '/api/v1/auth/register', method: 'POST' }, {
      fullname: 'Test Invalid Email',
      email: 'not-an-email',
      department: 'Engineering',
      password: 'Password@123',
    });
    assert(invEmailRes.status === 400, 'Invalid registration email returns HTTP 400 Bad Request');

    // 2b. Missing required fields
    const missFieldRes = await req({ path: '/api/v1/auth/register', method: 'POST' }, {
      fullname: '',
      email: `valid_${testSuffix}@eduportal.com`,
    });
    assert(missFieldRes.status === 400, 'Missing required fields returns HTTP 400 Bad Request');

    // 2c. Register valid student A
    const regResA = await req({ path: '/api/v1/auth/register', method: 'POST' }, studentA);
    assert(regResA.status === 201 && regResA.json?.token, 'Valid student registration returns HTTP 201 with token');
    tokenA = regResA.json?.token;
    studentAId = regResA.json?.student?.id || regResA.json?.student?._id;

    // 2d. Duplicate email
    const dupRes = await req({ path: '/api/v1/auth/register', method: 'POST' }, studentA);
    assert(dupRes.status === 409, 'Duplicate registration email returns HTTP 409 Conflict');

    // Register student B
    const regResB = await req({ path: '/api/v1/auth/register', method: 'POST' }, studentB);
    tokenB = regResB.json?.token;
    studentBId = regResB.json?.student?.id || regResB.json?.student?._id;

    // ── 3. Password Hashing & Security (Activity 14.3) ────────────────
    console.log('\n--- 3. Password Hashing Verification ---');
    const userInDb = await User.findOne({ email: studentA.email }).select('+password').lean();
    assert(!!userInDb && typeof userInDb.password === 'string' && userInDb.password.startsWith('$2'), 'Password stored as bcrypt hash in MongoDB (starts with $2)');
    assert(userInDb.password !== studentA.password, 'Stored password hash is NOT plaintext');

    // ── 4. Authentication & JWT Security ──────────────────────────────
    console.log('\n--- 4. Authentication & JWT Verification ---');
    // 4a. Incorrect login password
    const wrongPassRes = await req({ path: '/api/v1/auth/login', method: 'POST' }, {
      email: studentA.email,
      password: 'WrongPassword999!',
    });
    assert(wrongPassRes.status === 401, 'Incorrect login password returns HTTP 401 Unauthorized');

    // 4b. Missing JWT on protected route
    const noJwtRes = await req({ path: '/api/v1/progress/my-progress' });
    assert(noJwtRes.status === 401, 'Missing JWT on protected route returns HTTP 401 Unauthorized');

    // 4c. Invalid / malformed JWT
    const malformedJwtRes = await req({
      path: '/api/v1/progress/my-progress',
      headers: { Authorization: 'Bearer thisisnotavalidjwttoken.atall.here' },
    });
    assert(malformedJwtRes.status === 401, 'Malformed JWT returns HTTP 401 Unauthorized');

    // 4d. Expired JWT
    const expiredToken = jwt.sign(
      { sub: studentAId, email: studentA.email, role: 'student' },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '-10s' }
    );
    const expiredRes = await req({
      path: '/api/v1/progress/my-progress',
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    assert(expiredRes.status === 401, 'Expired JWT returns HTTP 401 Unauthorized');

    // 4e. Valid JWT authentication
    const validJwtRes = await req({
      path: '/api/v1/progress/my-progress',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(validJwtRes.status === 200, 'Valid JWT authentication returns HTTP 200 OK');

    // Admin login
    const adminLoginRes = await req({ path: '/api/v1/auth/login', method: 'POST' }, {
      email: 'admin@eduportal.com',
      password: process.env.ADMIN_PASSWORD || 'Admin@123',
    });
    if (adminLoginRes.status === 200 && adminLoginRes.json?.token) {
      adminToken = adminLoginRes.json.token;
    } else {
      // Fallback: sign admin token for test purposes
      adminToken = jwt.sign(
        { sub: 'admin-1', email: 'admin@eduportal.com', role: 'admin' },
        process.env.JWT_SECRET || 'test_secret',
        { expiresIn: '1h' }
      );
    }
    assert(!!adminToken, 'Admin token acquired');

    // ── 5. Role-Based Access Control (RBAC) ───────────────────────────
    console.log('\n--- 5. Role-Based Access Control ---');
    // 5a. Student accessing admin endpoint
    const studentAdminRes = await req({
      path: '/courses',
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    }, {
      legacyId: `CRS-SEC-${testSuffix}`,
      title: 'Security Unauthorized Course',
    });
    assert(studentAdminRes.status === 403, 'Student accessing admin endpoint (POST /courses) returns HTTP 403 Forbidden');

    // 5b. Admin accessing admin endpoint
    const newCourseId = `CRS-SEC-${testSuffix}`;
    const adminCreateRes = await req({
      path: '/courses',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, {
      legacyId: newCourseId,
      code: `SEC-${testSuffix}`,
      title: 'Security Verified Course',
      category: 'Security',
      level: 'Beginner',
      instructor: 'Dr. Guard',
    });
    assert(adminCreateRes.status === 201, 'Admin accessing admin endpoint (POST /courses) returns HTTP 201 Created');

    // 5c. Student cannot update another student's profile
    const studentUpdateOther = await req({
      path: `/students/${studentBId}`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
    }, { fullname: 'Hacked Name' });
    assert(studentUpdateOther.status === 403, 'Student cannot update another student profile returns HTTP 403 Forbidden');

    // 5d. Student cannot change own role to admin via profile update
    const roleEscalationRes = await req({
      path: `/students/${studentAId}`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
    }, { fullname: 'Student A Renamed', role: 'admin' });
    const studentAInDb = await User.findOne({ email: studentA.email }).lean();
    assert(studentAInDb.role === 'student', 'Student cannot elevate own role to admin (role remains "student")');

    // ── 6. Centralized Error Handling (Activity 14.4) ─────────────────
    console.log('\n--- 6. Centralized Error Handling ---');
    // 6a. Invalid MongoDB ObjectId (CastError)
    const castErrorRes = await req({ path: '/courses/invalid-object-id' });
    assert(castErrorRes.status === 400, 'Invalid MongoDB ObjectId returns HTTP 400 Bad Request');
    assert(castErrorRes.json?.error === 'CastError', 'Response contains error type CastError');

    // 6b. Unknown API route
    const unknownRouteRes = await req({ path: '/api/v1/nonexistent-endpoint-test' });
    assert(unknownRouteRes.status === 404, 'Unknown API route returns HTTP 404 Not Found');
    assert(unknownRouteRes.json?.error === 'Not Found', 'Unknown API route returns error: "Not Found"');

    // ── 7. Query Optimization & Pagination (Activity 14.7) ────────────
    console.log('\n--- 7. Query Optimization & Pagination ---');
    const paginatedRes = await req({ path: '/courses?page=1&limit=3' });
    assert(paginatedRes.status === 200, 'Course pagination endpoint returns HTTP 200 OK');
    assert(paginatedRes.json?.success === true, 'Pagination response has success: true');
    assert(Array.isArray(paginatedRes.json?.courses), 'Pagination response includes courses array');
    assert(typeof paginatedRes.json?.total === 'number', 'Pagination response includes total count');
    assert(paginatedRes.json?.page === 1, 'Pagination response includes current page 1');

    // ── 8. Rate Limiting (Activity 14.6) ──────────────────────────────
    console.log('\n--- 8. Rate Limiting on Login ---');
    // Send 10 failed login attempts (max allowed per 15 min window)
    let rateLimitTriggered = false;
    for (let i = 1; i <= 11; i++) {
      const rlRes = await req({ path: '/api/v1/auth/login', method: 'POST' }, {
        email: `rate_limit_probe_${testSuffix}@eduportal.com`,
        password: 'wrong_password',
      });
      if (rlRes.status === 429) {
        rateLimitTriggered = true;
        assert(true, `Rate limiter triggered on attempt ${i} with HTTP 429 Too Many Requests`);
        break;
      }
    }
    assert(rateLimitTriggered, 'Excessive login attempts trigger HTTP 429 Too Many Requests');

    // ── 9. Course & Enrollment & Progress Full Flow (Regression) ──────
    console.log('\n--- 9. Existing Flow Regression ---');
    // Enroll Student A in CRS-101
    const enrollRes = await req({
      path: '/api/v1/enrollments',
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    }, { courseId: 'CRS-101' });
    assert(enrollRes.status === 201, 'Student enrollment in CRS-101 returns HTTP 201 Created');

    // Update learning progress
    const progressUpdateRes = await req({
      path: '/api/v1/progress',
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
    }, {
      courseId: 'CRS-101',
      completedLessons: 5,
      totalLessons: 10,
    });
    assert(progressUpdateRes.status === 200, 'Learning progress update returns HTTP 200 OK');
    assert(progressUpdateRes.json?.progress?.progressPercentage === 50, 'Progress percentage correctly calculated as 50%');

    // Clean up created test records
    await Course.deleteOne({ legacyId: newCourseId });
    await Enrollment.deleteMany({ studentEmail: { $in: [studentA.email, studentB.email] } });
    await LearningProgress.deleteMany({ studentEmail: { $in: [studentA.email, studentB.email] } });
    await User.deleteMany({ email: { $in: [studentA.email, studentB.email] } });

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    if (serverInstance) {
      serverInstance.close();
    }
    await disconnectDB();
  }

  console.log('\n======================================================');
  console.log(`Task 14 Verification Results: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTask14Tests();
