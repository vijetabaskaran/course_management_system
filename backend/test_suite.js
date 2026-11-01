'use strict';
/**
 * test_suite.js — End-to-end verification script for EduPortal Backend
 * Covers: original course/student/enrollment tests + Task 9, 10 & 11 requirements.
 * Runs against local MongoDB via Mongoose.
 */
process.env.TEST_MODE = 'true';
process.env.PORT = '4001';

const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { connectDB, disconnectDB } = require('./config/mongoose');
const User       = require('./models/schemas/UserSchema');
const Course     = require('./models/schemas/CourseSchema');
const Enrollment = require('./models/schemas/EnrollmentSchema');

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
  console.log('Starting EduPortal Backend Verification Suite (Task 9, 10, 11, 12)...\n');

  // Ensure MongoDB is connected before tests start
  await connectDB();

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

  let testEmail = null;
  let studentBEmail = null;
  let testCourseCode = null;

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

    // ── SECTION 2: Task 9 & 11 — Student Registration & Role Protection ───────
    console.log('\n=== SECTION 2: Task 9 & 11 — Student Registration & RBAC Safe Roles ===\n');

    testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'TestPass@99';

    // 9. Register new student (attempting role escalation to admin) → 201 with role "student"
    const regRes = await makeRequest(server,
      { path: '/api/v1/auth/register', method: 'POST' },
      { fullname: 'Test Student', email: testEmail, department: 'Computer Science', password: testPassword, role: 'admin' }
    );
    assert(regRes.status === 201, 'POST /api/v1/auth/register — new student returns 201');
    assert(regRes.json?.student?.email === testEmail, 'Registration response contains correct email');
    assert(regRes.json?.student?.password === undefined, 'Registration response does NOT expose password');
    assert(regRes.json?.token && typeof regRes.json.token === 'string', 'Registration response contains JWT token');
    assert(regRes.json?.tokenType === 'Bearer', 'Registration response has tokenType: Bearer');
    assert(regRes.json?.message !== undefined, 'Registration response has message field');
    assert(regRes.json?.student?.id !== undefined, 'Registration response contains student id');
    assert(regRes.json?.student?.role === 'student' && regRes.json?.role === 'student', 'Registration securely assigns role "student" and ignores body.role="admin"');

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

    // ── SECTION 3: Task 9/10/11 — Login & JWT with RBAC Roles ─────────────────
    console.log('\n=== SECTION 3: Task 9/10/11 — Login & JWT with RBAC Roles (/api/v1/auth/login) ===\n');

    // 14. Login with correct student credentials → 200 + JWT with role "student"
    const loginRes = await makeRequest(server,
      { path: '/api/v1/auth/login', method: 'POST' },
      { email: testEmail, password: testPassword }
    );
    assert(loginRes.status === 200, 'POST /api/v1/auth/login — correct student credentials returns 200');
    assert(loginRes.json?.token && typeof loginRes.json.token === 'string', 'Login response contains JWT token');
    assert(loginRes.json?.tokenType === 'Bearer', 'Login response has tokenType: Bearer');
    assert(loginRes.json?.expiresIn !== undefined, 'Login response has expiresIn field');
    assert(loginRes.json?.student?.email === testEmail, 'Login response contains safe student details');
    assert(loginRes.json?.student?.password === undefined, 'Login response does NOT expose password');
    assert(loginRes.json?.student?.role === 'student' && loginRes.json?.role === 'student', 'Student login returns role "student"');

    const studentToken = loginRes.json?.token;

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

    // 18. Admin login via /api/v1/auth/login → 200 + role "admin"
    const adminLoginRes = await makeRequest(server,
      { path: '/api/v1/auth/login', method: 'POST' },
      { email: 'admin@eduportal.com', password: 'AdminSecure2026!' }
    );
    assert(adminLoginRes.status === 200, 'POST /api/v1/auth/login — admin credentials returns 200');
    assert(adminLoginRes.json?.token && typeof adminLoginRes.json.token === 'string', 'Admin login returns JWT token');
    assert(adminLoginRes.json?.role === 'admin' || adminLoginRes.json?.user?.role === 'admin', 'Admin login returns role "admin"');
    const adminToken = adminLoginRes.json?.token;

    // ── SECTION 4: Task 11 — RBAC Protected Course Routes ─────────────────────
    console.log('\n=== SECTION 4: Task 11 — Role-Based Access Control (RBAC) on Courses ===\n');

    // 19. POST /courses without token → 401
    const noTokenCreate = await makeRequest(server,
      { path: '/courses', method: 'POST' },
      { title: 'Unauthorized Course', code: 'UNAUTH-001' }
    );
    assert(noTokenCreate.status === 401, 'POST /courses without token returns 401 Unauthorized');

    // 20. PUT /courses/:id without token → 401
    const noTokenUpdate = await makeRequest(server,
      { path: `/courses/${firstCourseId}`, method: 'PUT' },
      { title: 'Unauthorized Update' }
    );
    assert(noTokenUpdate.status === 401, 'PUT /courses/:id without token returns 401 Unauthorized');

    // 21. DELETE /courses/:id without token → 401
    const noTokenDelete = await makeRequest(server,
      { path: `/courses/${firstCourseId}`, method: 'DELETE' }
    );
    assert(noTokenDelete.status === 401, 'DELETE /courses/:id without token returns 401 Unauthorized');

    // 22. POST /courses with malformed token → 401
    const malformedToken = await makeRequest(server,
      { path: '/courses', method: 'POST', headers: { 'Authorization': 'Bearer not_a_real_token' } },
      { title: 'Bad Token Course', code: 'MALFORMED-001' }
    );
    assert(malformedToken.status === 401, 'POST /courses with malformed token returns 401 Unauthorized');

    // 23. POST /courses with STUDENT token → 403 Forbidden (RBAC security boundary)
    const studentCreate = await makeRequest(server,
      { path: '/courses', method: 'POST', headers: { 'Authorization': `Bearer ${studentToken}` } },
      { title: 'Student Attempt Course', code: 'STU-FORBID-001' }
    );
    assert(studentCreate.status === 403, 'POST /courses with student token returns 403 Forbidden');

    // 24. PUT /courses/:id with STUDENT token → 403 Forbidden
    const studentUpdate = await makeRequest(server,
      { path: `/courses/${firstCourseId}`, method: 'PUT', headers: { 'Authorization': `Bearer ${studentToken}` } },
      { title: 'Student Attempt Update' }
    );
    assert(studentUpdate.status === 403, 'PUT /courses/:id with student token returns 403 Forbidden');

    // 25. DELETE /courses/:id with STUDENT token → 403 Forbidden
    const studentDelete = await makeRequest(server,
      { path: `/courses/${firstCourseId}`, method: 'DELETE', headers: { 'Authorization': `Bearer ${studentToken}` } }
    );
    assert(studentDelete.status === 403, 'DELETE /courses/:id with student token returns 403 Forbidden');

    // 26. POST /courses with ADMIN token → 201 Created
    testCourseCode = 'RBAC-' + Math.floor(1000 + Math.random() * 9000);
    const testCourseData = {
      title: 'Admin Created RBAC Test Course',
      code: testCourseCode,
      domain: 'Information Technology',
      level: 'Beginner',
      instructor: 'Admin Tester',
      duration: '6 Weeks'
    };
    const adminCreate = await makeRequest(server,
      { path: '/courses', method: 'POST', headers: { 'Authorization': `Bearer ${adminToken}` } },
      testCourseData
    );
    assert(adminCreate.status === 201 && adminCreate.json?.id && adminCreate.json?.title === testCourseData.title, 'POST /courses with admin token creates course (201 Created)');
    const createdCourseId = adminCreate.json?.id;

    // 27. PUT /courses/:id with ADMIN token → 200 OK
    const adminUpdate = await makeRequest(server,
      { path: `/courses/${createdCourseId}`, method: 'PUT', headers: { 'Authorization': `Bearer ${adminToken}` } },
      { ...testCourseData, title: 'Admin Created RBAC Test Course (Updated)' }
    );
    assert(adminUpdate.status === 200 && adminUpdate.json?.title?.includes('Updated'), 'PUT /courses/:id with admin token updates course (200 OK)');

    // 28. DELETE /courses/:id with ADMIN token → 200 OK
    const adminDelete = await makeRequest(server,
      { path: `/courses/${createdCourseId}`, method: 'DELETE', headers: { 'Authorization': `Bearer ${adminToken}` } }
    );
    assert(adminDelete.status === 200, 'DELETE /courses/:id with admin token deletes course (200 OK)');

    // 29. Verify GET /courses still public after changes
    const publicGetAfter = await makeRequest(server, { path: '/courses' });
    assert(publicGetAfter.status === 200 && Array.isArray(publicGetAfter.json), 'GET /courses still public after protecting write routes');

    // ── SECTION 5: Task 12 — Student Course Enrollment End-to-End ─────────────
    console.log('\n=== SECTION 5: Task 12 — Student Course Enrollment End-to-End ===\n');

    const enrollCourse = coursesRes.json[1] || coursesRes.json[0];
    const targetCourseId = enrollCourse.id;

    // 30. POST /api/v1/enrollments without token → 401 Unauthorized
    const unauthedEnroll = await makeRequest(server,
      { path: '/api/v1/enrollments', method: 'POST' },
      { courseId: targetCourseId }
    );
    assert(unauthedEnroll.status === 401, 'POST /api/v1/enrollments without token returns 401 Unauthorized');

    // 31. POST /api/v1/enrollments with invalid token → 401 Unauthorized
    const invalidTokenEnroll = await makeRequest(server,
      { path: '/api/v1/enrollments', method: 'POST', headers: { 'Authorization': 'Bearer invalid_token' } },
      { courseId: targetCourseId }
    );
    assert(invalidTokenEnroll.status === 401, 'POST /api/v1/enrollments with invalid token returns 401 Unauthorized');

    // 32. POST /api/v1/enrollments with admin token → 403 Forbidden (student-only endpoint)
    const adminEnroll = await makeRequest(server,
      { path: '/api/v1/enrollments', method: 'POST', headers: { 'Authorization': `Bearer ${adminToken}` } },
      { courseId: targetCourseId }
    );
    assert(adminEnroll.status === 403, 'POST /api/v1/enrollments with admin token returns 403 Forbidden');

    // 33. POST /api/v1/enrollments with nonexistent course ID → 404 Not Found
    const notFoundEnroll = await makeRequest(server,
      { path: '/api/v1/enrollments', method: 'POST', headers: { 'Authorization': `Bearer ${studentToken}` } },
      { courseId: 'NONEXISTENT_COURSE_999' }
    );
    assert(notFoundEnroll.status === 404, 'POST /api/v1/enrollments with nonexistent course ID returns 404 Not Found');

    // 34. POST /api/v1/enrollments with missing/empty course ID → 400 Bad Request
    const missingCourseEnroll = await makeRequest(server,
      { path: '/api/v1/enrollments', method: 'POST', headers: { 'Authorization': `Bearer ${studentToken}` } },
      {}
    );
    assert(missingCourseEnroll.status === 400, 'POST /api/v1/enrollments with missing course ID returns 400 Bad Request');

    // 35. POST /api/v1/enrollments with valid student token → 201 Created
    const validEnroll = await makeRequest(server,
      { path: '/api/v1/enrollments', method: 'POST', headers: { 'Authorization': `Bearer ${studentToken}` } },
      { courseId: targetCourseId }
    );
    assert(validEnroll.status === 201, 'POST /api/v1/enrollments with student token returns 201 Created');
    assert(validEnroll.json?.enrollment?.courseId === targetCourseId, 'Created enrollment record matches target courseId');
    assert(validEnroll.json?.enrollment?.studentEmail === testEmail, 'Created enrollment record matches authenticated student email');
    assert(validEnroll.json?.enrollment?.status === 'active', 'Created enrollment initial status is "active"');
    assert(validEnroll.json?.enrollment?.enrolledAt !== undefined, 'Created enrollment record contains enrolledAt timestamp');

    // 36. POST /api/v1/enrollments duplicate enrollment for same course → 409 Conflict
    const dupEnroll = await makeRequest(server,
      { path: '/api/v1/enrollments', method: 'POST', headers: { 'Authorization': `Bearer ${studentToken}` } },
      { courseId: targetCourseId }
    );
    assert(dupEnroll.status === 409, 'POST /api/v1/enrollments duplicate enrollment returns 409 Conflict');

    // 37. GET /api/v1/enrollments/my-courses without token → 401 Unauthorized
    const unauthedMyCourses = await makeRequest(server, { path: '/api/v1/enrollments/my-courses' });
    assert(unauthedMyCourses.status === 401, 'GET /api/v1/enrollments/my-courses without token returns 401 Unauthorized');

    // 38. GET /api/v1/enrollments/my-courses with admin token → 403 Forbidden
    const adminMyCourses = await makeRequest(server,
      { path: '/api/v1/enrollments/my-courses', headers: { 'Authorization': `Bearer ${adminToken}` } }
    );
    assert(adminMyCourses.status === 403, 'GET /api/v1/enrollments/my-courses with admin token returns 403 Forbidden');

    // 39. GET /api/v1/enrollments/my-courses with student token → 200 OK + populated course details
    const studentMyCourses = await makeRequest(server,
      { path: '/api/v1/enrollments/my-courses', headers: { 'Authorization': `Bearer ${studentToken}` } }
    );
    assert(studentMyCourses.status === 200, 'GET /api/v1/enrollments/my-courses returns 200 OK');
    assert(studentMyCourses.json?.count >= 1, 'My-courses response contains total enrollment count >= 1');
    assert(Array.isArray(studentMyCourses.json?.enrollments), 'My-courses response contains enrollments list');
    const myEnrolledItem = studentMyCourses.json?.enrollments.find(e => e.courseId === targetCourseId);
    assert(myEnrolledItem !== undefined, 'Enrolled course found in student my-courses list');
    assert(myEnrolledItem?.course?.id === targetCourseId && myEnrolledItem?.course?.title !== undefined, 'Course details are properly populated on enrollment record');

    // 40. Register Student B with no enrollments → GET /my-courses returns empty list
    studentBEmail = `student_b_${Date.now()}@example.com`;
    const regStudentB = await makeRequest(server,
      { path: '/api/v1/auth/register', method: 'POST' },
      { fullname: 'Student B', email: studentBEmail, department: 'Biology', password: 'StudentBPass123!' }
    );
    const studentBToken = regStudentB.json?.token;

    const studentBMyCourses = await makeRequest(server,
      { path: '/api/v1/enrollments/my-courses', headers: { 'Authorization': `Bearer ${studentBToken}` } }
    );
    assert(studentBMyCourses.status === 200 && studentBMyCourses.json?.count === 0 && studentBMyCourses.json?.enrollments?.length === 0, 'New student with no enrollments receives count: 0 and empty enrollments list');

    // 41. Student B tries to unenroll from Student A's course → 404 Not Found (cannot unenroll another student)
    const crossUnenroll = await makeRequest(server,
      { path: `/api/v1/enrollments/${targetCourseId}`, method: 'DELETE', headers: { 'Authorization': `Bearer ${studentBToken}` } }
    );
    assert(crossUnenroll.status === 404, 'Student B cannot unenroll from Student A\'s course (returns 404 Not Found)');

    // 42. DELETE /api/v1/enrollments/:courseId without token → 401 Unauthorized
    const unauthedDelete = await makeRequest(server,
      { path: `/api/v1/enrollments/${targetCourseId}`, method: 'DELETE' }
    );
    assert(unauthedDelete.status === 401, 'DELETE /api/v1/enrollments/:courseId without token returns 401 Unauthorized');

    // 43. DELETE /api/v1/enrollments/:courseId with admin token → 403 Forbidden
    const adminUnenroll = await makeRequest(server,
      { path: `/api/v1/enrollments/${targetCourseId}`, method: 'DELETE', headers: { 'Authorization': `Bearer ${adminToken}` } }
    );
    assert(adminUnenroll.status === 403, 'DELETE /api/v1/enrollments/:courseId with admin token returns 403 Forbidden');

    // 44. Student unenrolls from their course → 200 OK
    const unenrollRes = await makeRequest(server,
      { path: `/api/v1/enrollments/${targetCourseId}`, method: 'DELETE', headers: { 'Authorization': `Bearer ${studentToken}` } }
    );
    assert(unenrollRes.status === 200, 'DELETE /api/v1/enrollments/:courseId with student token returns 200 OK');
    assert(unenrollRes.json?.message !== undefined, 'Unenroll response contains confirmation message');

    // 45. Student tries to unenroll again → 404 Not Found
    const repeatUnenroll = await makeRequest(server,
      { path: `/api/v1/enrollments/${targetCourseId}`, method: 'DELETE', headers: { 'Authorization': `Bearer ${studentToken}` } }
    );
    assert(repeatUnenroll.status === 404, 'Subsequent unenroll request returns 404 Not Found');

    // 46. Course still exists after unenrollment (unenroll does not delete the course itself)
    const courseStillExists = await makeRequest(server, { path: `/courses/${targetCourseId}` });
    assert(courseStillExists.status === 200 && courseStillExists.json?.id === targetCourseId, 'Unenrollment does NOT delete the course record itself');

    // 47. Unknown route returns consistent JSON 404
    const unknownRes = await makeRequest(server, { path: '/api/unknown/random/endpoint' });
    assert(unknownRes.status === 404 && unknownRes.json?.error === 'Not Found', 'Unknown routes return consistent JSON 404');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    // Clean up temporary test data from MongoDB
    try {
      if (testEmail) {
        await User.deleteMany({ email: testEmail });
        await Enrollment.deleteMany({ studentEmail: testEmail });
      }
      if (studentBEmail) {
        await User.deleteMany({ email: studentBEmail });
        await Enrollment.deleteMany({ studentEmail: studentBEmail });
      }
      if (testCourseCode) {
        await Course.deleteMany({ code: testCourseCode });
      }
    } catch (cleanupErr) {
      console.error('Error cleaning up test data:', cleanupErr.message);
    }

    server.close();
    await disconnectDB();
  }

  console.log(`\n================================`);
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log(`================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
