'use strict';
/**
 * test_suite.js — End-to-end verification script for EduPortal Backend
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
  console.log('Starting EduPortal Backend Verification Suite...\n');
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

  try {
    // 1. Root endpoint
    const rootRes = await makeRequest(server, { path: '/' });
    assert(rootRes.status === 200 && rootRes.raw.includes('EduPortal Backend'), 'GET / returns 200 with EduPortal HTML page');

    // 2. Health check
    const healthRes = await makeRequest(server, { path: '/api/health' });
    assert(healthRes.status === 200 && healthRes.json?.status === 'healthy' && healthRes.json?.dataStore?.ok === true, 'GET /api/health reports healthy with accessible dataStore');

    // 3. GET /courses
    const coursesRes = await makeRequest(server, { path: '/courses' });
    assert(coursesRes.status === 200 && Array.isArray(coursesRes.json) && coursesRes.json.length > 0, 'GET /courses returns course array');

    // 4. GET /courses/:id
    const firstCourseId = coursesRes.json[0].id;
    const courseRes = await makeRequest(server, { path: `/courses/${firstCourseId}` });
    assert(courseRes.status === 200 && courseRes.json.id === firstCourseId, `GET /courses/${firstCourseId} returns matching course`);

    // 5. GET /courses/invalid-id -> 404
    const notFoundCourse = await makeRequest(server, { path: '/courses/NON_EXISTENT_ID' });
    assert(notFoundCourse.status === 404, 'GET /courses/NON_EXISTENT_ID returns 404 Not Found');

    // 6. POST /courses invalid data -> 400
    const badCourse = await makeRequest(server, { path: '/courses', method: 'POST' }, { title: '' });
    assert(badCourse.status === 400, 'POST /courses without title/code returns 400 Bad Request');

    // 7. POST /courses valid data -> 201
    const testCourseData = {
      title: 'Automated Test Course',
      code: 'TEST-' + Math.floor(1000 + Math.random() * 9000),
      domain: 'Testing',
      level: 'Beginner',
      instructor: 'Test Bot',
      duration: '4 Weeks'
    };
    const newCourseRes = await makeRequest(server, { path: '/courses', method: 'POST' }, testCourseData);
    assert(newCourseRes.status === 201 && newCourseRes.json.id && newCourseRes.json.title === testCourseData.title, 'POST /courses creates new course and returns 201');
    const createdCourseId = newCourseRes.json?.id;

    // 8. Course persistence in db.json
    const diskDB1 = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    assert(diskDB1.courses.some(c => c.id === createdCourseId), 'Newly created course persists to db.json file');

    // 9. PUT /courses/:id update
    const putRes = await makeRequest(server, { path: `/courses/${createdCourseId}`, method: 'PUT' }, {
      ...testCourseData,
      title: 'Automated Test Course (Updated)'
    });
    assert(putRes.status === 200 && putRes.json.title.includes('Updated'), 'PUT /courses/:id updates course successfully');

    // 10. DELETE /courses/:id
    const delRes = await makeRequest(server, { path: `/courses/${createdCourseId}`, method: 'DELETE' });
    assert(delRes.status === 200, 'DELETE /courses/:id deletes course successfully');

    // 11. GET /students password stripping
    const studentsRes = await makeRequest(server, { path: '/students' });
    assert(studentsRes.status === 200 && Array.isArray(studentsRes.json), 'GET /students returns students list');
    const hasAnyPassword = studentsRes.json.some(s => s.password !== undefined);
    assert(!hasAnyPassword, 'GET /students NEVER exposes passwords or password hashes in response');

    // 12. GET /students/:id
    const firstStudent = studentsRes.json[0];
    const studentSingleRes = await makeRequest(server, { path: `/students/${firstStudent.id}` });
    assert(studentSingleRes.status === 200 && studentSingleRes.json.password === undefined, 'GET /students/:id returns student without exposing password');

    // 13. POST /students/login with valid student credentials
    const loginRes = await makeRequest(server, { path: '/students/login', method: 'POST' }, {
      email: 'student@eduportal.com',
      password: 'Student@123'
    });
    assert(loginRes.status === 200 && loginRes.json.success === true && loginRes.json.student.email === 'student@eduportal.com' && loginRes.json.student.password === undefined, 'POST /students/login authenticates existing student correctly and strips password');

    // 14. POST /students/login with wrong password -> 401
    const badLoginRes = await makeRequest(server, { path: '/students/login', method: 'POST' }, {
      email: 'student@eduportal.com',
      password: 'WrongPassword999'
    });
    assert(badLoginRes.status === 401, 'POST /students/login rejects invalid credentials with 401');

    // 15. POST /students duplicate email -> 409
    const dupStudentRes = await makeRequest(server, { path: '/students', method: 'POST' }, {
      fullname: 'Duplicate User',
      email: 'student@eduportal.com',
      username: 'uniqueusername123',
      password: 'Password123'
    });
    assert(dupStudentRes.status === 409, 'POST /students rejects duplicate email with 409 Conflict');

    // 16. GET /enrollments
    const enrollmentsRes = await makeRequest(server, { path: '/enrollments' });
    assert(enrollmentsRes.status === 200 && Array.isArray(enrollmentsRes.json), 'GET /enrollments returns enrollments list');

    // 17. POST /enrollments invalid student or course -> 404
    const badEnrollment = await makeRequest(server, { path: '/enrollments', method: 'POST' }, {
      studentEmail: 'nonexistent@nobody.com',
      courseId: firstCourseId
    });
    assert(badEnrollment.status === 404, 'POST /enrollments with non-existent student rejects with 404');

    // 18. POST /enrollments valid creation
    const enrollCourseId = coursesRes.json[0].id;
    const testEnrollEmail = 'student@eduportal.com';
    // Remove if already enrolled in this one to test cleanly
    const existingEnroll = enrollmentsRes.json.find(e => e.studentEmail === testEnrollEmail && e.courseId === enrollCourseId);
    if (existingEnroll) {
      await makeRequest(server, { path: `/enrollments/${existingEnroll.id}`, method: 'DELETE' });
    }
    const createEnrollRes = await makeRequest(server, { path: '/enrollments', method: 'POST' }, {
      studentEmail: testEnrollEmail,
      courseId: enrollCourseId
    });
    assert(createEnrollRes.status === 201 && createEnrollRes.json.courseId === enrollCourseId, 'POST /enrollments creates valid enrollment');

    // 19. POST /enrollments duplicate enrollment -> 409
    const dupEnrollRes = await makeRequest(server, { path: '/enrollments', method: 'POST' }, {
      studentEmail: testEnrollEmail,
      courseId: enrollCourseId
    });
    assert(dupEnrollRes.status === 409, 'POST /enrollments prevents duplicate enrollment with 409');

    // 20. Unknown endpoint -> 404
    const unknownRes = await makeRequest(server, { path: '/api/unknown/random/endpoint' });
    assert(unknownRes.status === 404 && unknownRes.json?.error === 'Not Found', 'Unknown routes return consistent JSON 404 response');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    // Restore original db.json
    fs.writeFileSync(DB_PATH, originalDB, 'utf8');
    server.close();
  }

  console.log(`\n================================`);
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log(`================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
