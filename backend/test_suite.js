'use strict';
/**
 * test_suite.js — End-to-end verification script for EduPortal Backend
 * Covers: original course/student/enrollment tests + Task 9 & Task 10 requirements.
 */
process.env.TEST_MODE = 'true';
process.env.PORT = '4001';

const http = require('http');
const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'db.json');
const originalDB = fs.readFileSync(DB_PATH, 'utf8');

const app = require('./server');

function makeRequest(server, options, bodyData) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch { /* not json */ }
        resolve({ status: res.statusCode, headers: res.headers, raw: data, json });
      });
    });

    req.on('error', reject);
    if (bodyData) {
      req.write(typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('Starting EduPortal Backend Verification Suite (Task 9 & 10)...\n');
  const server = app.listen(0);
  await new Promise(r => server.once('listening', r));

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

  let jwtToken = null; // will be set after successful login

  try {
    // ── SECTION 1: Existing Functionality ────────────────────────────────────
    console.log('\n=== SECTION 1: Core Endpoints (regression) ===\n');

    // 1. Root endpoint
    const rootRes = await makeRequest(server, { path: '/' });
    assert(rootRes.status === 200 && rootRes.raw.includes('EduPortal Backend'), 'GET / returns 200 with EduPortal HTML page');

    // 2. Health check
    const healthRes = await makeRequest(server, { path: '/api/health' });
    assert(healthRes.status === 200 && healthRes.json?.status === 'healthy' && healthRes.json?.dataStore?.ok === true, 'GET /api/health reports healthy with accessible dataStore');

    // 3. GET /courses (public)
    const coursesRes = await makeRequest(server, { path: '/courses' });
    assert(coursesRes.status === 200 && Array.isArray(coursesRes.json) && coursesRes.json.length > 0, 'GET /courses returns course array (public — no token needed)');

    // 4. GET /courses/:id (public)
    const firstCourseId = coursesRes.json[0].id;
    const courseRes = await makeRequest(server, { path: `/courses/${firstCourseId}` });
    assert(courseRes.status === 200 && courseRes.json.id === firstCourseId, `GET /courses/:id returns matching course (public)`);

    // 5. GET /courses/invalid-id -> 404
    const notFoundCourse = await makeRequest(server, { path: '/courses/NON_EXISTENT_ID' });
    assert(notFoundCourse.status === 404, 'GET /courses/NON_EXISTENT_ID returns 404 Not Found');

    // 6. GET /students (password stripping)
    const studentsRes = await makeRequest(server, { path: '/students' });
    assert(studentsRes.status === 200 && Array.isArray(studentsRes.json), 'GET /students returns students list');
    const hasAnyPassword = studentsRes.json.some(s => s.password !== undefined);
    assert(!hasAnyPassword, 'GET /students NEVER exposes passwords or password hashes');

    // 7. GET /students/:id
    const firstStudent = studentsRes.json[0];
    const studentSingleRes = await makeRequest(server, { path: `/students/${firstStudent.id}` });
    assert(studentSingleRes.status === 200 && studentSingleRes.json.password === undefined, 'GET /students/:id returns student without exposing password');

    // 8. GET /enrollments
    const enrollmentsRes = await makeRequest(server, { path: '/enrollments' });
    assert(enrollmentsRes.status === 200 && Array.isArray(enrollmentsRes.json), 'GET /enrollments returns enrollments list');

    // ── SECTION 2: Task 9 — Registration ──────────────────────────────────────
    console.log('\n=== SECTION 2: Task 9 — Student Registration (/api/v1/auth/register) ===\n');

    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'TestPass@99';

    // 9. Register new student → 201
    const regRes = await makeRequest(server,
      { path: '/api/v1/auth/register', method: 'POST' },
      { fullname: 'Test Student', email: testEmail, department: 'Computer Science', password: testPassword }
    );
    assert(regRes.status === 201, 'POST /api/v1/auth/register — new student returns 201');
    assert(regRes.json?.student?.email === testEmail, 'Registration response contains correct email');
    assert(regRes.json?.student?.password === undefined, 'Registration response does NOT expose password');
    assert(regRes.json?.token && typeof regRes.json.token === 'string', 'Registration response contains JWT token');
    assert(regRes.json?.tokenType === 'Bearer', 'Registration response has tokenType: Bearer');
    assert(regRes.json?.message !== undefined, 'Registration response has message field');
    assert(regRes.json?.student?.id !== undefined, 'Registration response contains student id');

    // 10. Register same email → 409
    const dupRegRes = await makeRequest(server,
      { path: '/api/v1/auth/register', method: 'POST' },
      { fullname: 'Dup Student', email: testEmail, department: 'Physics', password: testPassword }
    );
    assert(dupRegRes.status === 409, 'POST /api/v1/auth/register — duplicate email returns 409');

    // 11. Missing fields → 400
    const missingFieldRes = await makeRequest(server,
      { path: '/api/v1/auth/register', method: 'POST' },
      { email: 'noname@test.com', password: 'Pass1234!' }
    );
    assert(missingFieldRes.status === 400, 'POST /api/v1/auth/register — missing fullname returns 400');

    // 12. Invalid email → 400
    const badEmailRes = await makeRequest(server,
      { path: '/api/v1/auth/register', method: 'POST' },
      { fullname: 'Bad Email', email: 'not-an-email', department: 'Physics', password: 'Pass1234!' }
    );
    assert(badEmailRes.status === 400, 'POST /api/v1/auth/register — invalid email returns 400');

    // 13. Password too short → 400
    const shortPwRes = await makeRequest(server,
      { path: '/api/v1/auth/register', method: 'POST' },
      { fullname: 'Short Pw', email: `shortpw_${Date.now()}@test.com`, department: 'Physics', password: 'abc' }
    );
    assert(shortPwRes.status === 400, 'POST /api/v1/auth/register — password < 8 chars returns 400');

    // ── SECTION 3: Task 9/10 — Login & JWT ────────────────────────────────────
    console.log('\n=== SECTION 3: Task 9/10 — Login & JWT (/api/v1/auth/login) ===\n');

    // 14. Login with correct credentials → 200 + JWT
    const loginRes = await makeRequest(server,
      { path: '/api/v1/auth/login', method: 'POST' },
      { email: testEmail, password: testPassword }
    );
    assert(loginRes.status === 200, 'POST /api/v1/auth/login — correct credentials returns 200');
    assert(loginRes.json?.token && typeof loginRes.json.token === 'string', 'Login response contains JWT token');
    assert(loginRes.json?.tokenType === 'Bearer', 'Login response has tokenType: Bearer');
    assert(loginRes.json?.expiresIn !== undefined, 'Login response has expiresIn field');
    assert(loginRes.json?.student?.email === testEmail, 'Login response contains safe student details');
    assert(loginRes.json?.student?.password === undefined, 'Login response does NOT expose password');

    jwtToken = loginRes.json?.token; // save for protected route tests

    // 15. Login with wrong password → 401
    const badPwLogin = await makeRequest(server,
      { path: '/api/v1/auth/login', method: 'POST' },
      { email: testEmail, password: 'WrongPassword999' }
    );
    assert(badPwLogin.status === 401, 'POST /api/v1/auth/login — wrong password returns 401');
    assert(badPwLogin.json?.student === undefined, 'Wrong password response does not expose student data');

    // 16. Login with unknown email → 401
    const unknownLogin = await makeRequest(server,
      { path: '/api/v1/auth/login', method: 'POST' },
      { email: 'nobody@nowhere.com', password: 'SomePass123' }
    );
    assert(unknownLogin.status === 401, 'POST /api/v1/auth/login — unknown email returns 401');

    // 17. Legacy login endpoint still works (existing student)
    const legacyLogin = await makeRequest(server,
      { path: '/students/login', method: 'POST' },
      { email: 'student@eduportal.com', password: 'Student@123' }
    );
    assert(legacyLogin.status === 200 && legacyLogin.json?.success === true && legacyLogin.json?.student?.email === 'student@eduportal.com', 'POST /students/login legacy endpoint still works for existing students');
    assert(legacyLogin.json?.student?.password === undefined, 'Legacy login strips password from response');

    // ── SECTION 4: Task 10 — JWT Middleware & Protected Routes ────────────────
    console.log('\n=== SECTION 4: Task 10 — Protected Course Routes ===\n');

    // 18. POST /courses without token → 401
    const noTokenCreate = await makeRequest(server,
      { path: '/courses', method: 'POST' },
      { title: 'Unauthorized Course', code: 'UNAUTH-001' }
    );
    assert(noTokenCreate.status === 401, 'POST /courses without token returns 401');

    // 19. PUT /courses/:id without token → 401
    const noTokenUpdate = await makeRequest(server,
      { path: `/courses/${firstCourseId}`, method: 'PUT' },
      { title: 'Unauthorized Update' }
    );
    assert(noTokenUpdate.status === 401, 'PUT /courses/:id without token returns 401');

    // 20. DELETE /courses/:id without token → 401
    const noTokenDelete = await makeRequest(server,
      { path: `/courses/${firstCourseId}`, method: 'DELETE' }
    );
    assert(noTokenDelete.status === 401, 'DELETE /courses/:id without token returns 401');

    // 21. POST /courses with malformed token → 401
    const malformedToken = await makeRequest(server,
      { path: '/courses', method: 'POST', headers: { 'Authorization': 'Bearer not_a_real_token' } },
      { title: 'Bad Token Course', code: 'MALFORMED-001' }
    );
    assert(malformedToken.status === 401, 'POST /courses with malformed token returns 401');

    // 22. POST /courses with valid JWT → 201
    const testCourseData = {
      title: 'JWT Protected Test Course',
      code: 'JWT-' + Math.floor(1000 + Math.random() * 9000),
      domain: 'Testing',
      level: 'Beginner',
      instructor: 'Test Bot',
      duration: '4 Weeks'
    };
    const authedCreate = await makeRequest(server,
      { path: '/courses', method: 'POST', headers: { 'Authorization': `Bearer ${jwtToken}` } },
      testCourseData
    );
    assert(authedCreate.status === 201 && authedCreate.json?.id && authedCreate.json?.title === testCourseData.title, 'POST /courses with valid JWT creates course (201)');
    const createdCourseId = authedCreate.json?.id;

    // 23. PUT /courses/:id with valid JWT → 200
    const authedUpdate = await makeRequest(server,
      { path: `/courses/${createdCourseId}`, method: 'PUT', headers: { 'Authorization': `Bearer ${jwtToken}` } },
      { ...testCourseData, title: 'JWT Protected Test Course (Updated)' }
    );
    assert(authedUpdate.status === 200 && authedUpdate.json?.title?.includes('Updated'), 'PUT /courses/:id with valid JWT updates course (200)');

    // 24. DELETE /courses/:id with valid JWT → 200
    const authedDelete = await makeRequest(server,
      { path: `/courses/${createdCourseId}`, method: 'DELETE', headers: { 'Authorization': `Bearer ${jwtToken}` } }
    );
    assert(authedDelete.status === 200, 'DELETE /courses/:id with valid JWT deletes course (200)');

    // 25. Verify GET /courses still public after changes
    const publicGetAfter = await makeRequest(server, { path: '/courses' });
    assert(publicGetAfter.status === 200 && Array.isArray(publicGetAfter.json), 'GET /courses still public after protecting write routes');

    // ── SECTION 5: Enrollment regression ──────────────────────────────────────
    console.log('\n=== SECTION 5: Enrollment Regression ===\n');

    // 26. POST /enrollments invalid student → 404
    const badEnrollment = await makeRequest(server,
      { path: '/enrollments', method: 'POST' },
      { studentEmail: 'nonexistent@nobody.com', courseId: firstCourseId }
    );
    assert(badEnrollment.status === 404, 'POST /enrollments with non-existent student returns 404');

    // 27. POST /enrollments valid creation
    const testEnrollEmail = 'student@eduportal.com';
    const enrollCourseId = coursesRes.json[0].id;
    const existingEnroll = enrollmentsRes.json.find(e => e.studentEmail === testEnrollEmail && e.courseId === enrollCourseId);
    if (existingEnroll) {
      await makeRequest(server, { path: `/enrollments/${existingEnroll.id}`, method: 'DELETE' });
    }
    const createEnrollRes = await makeRequest(server,
      { path: '/enrollments', method: 'POST' },
      { studentEmail: testEnrollEmail, courseId: enrollCourseId }
    );
    assert(createEnrollRes.status === 201 && createEnrollRes.json?.courseId === enrollCourseId, 'POST /enrollments creates valid enrollment');

    // 28. POST /enrollments duplicate → 409
    const dupEnrollRes = await makeRequest(server,
      { path: '/enrollments', method: 'POST' },
      { studentEmail: testEnrollEmail, courseId: enrollCourseId }
    );
    assert(dupEnrollRes.status === 409, 'POST /enrollments prevents duplicate enrollment (409)');

    // 29. Unknown endpoint → 404
    const unknownRes = await makeRequest(server, { path: '/api/unknown/random/endpoint' });
    assert(unknownRes.status === 404 && unknownRes.json?.error === 'Not Found', 'Unknown routes return consistent JSON 404');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    // Restore original db.json — never leave test data behind
    fs.writeFileSync(DB_PATH, originalDB, 'utf8');
    server.close();
  }

  console.log(`\n================================`);
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log(`================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
