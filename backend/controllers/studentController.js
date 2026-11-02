'use strict';
/**
 * controllers/studentController.js  (MongoDB/Mongoose version)
 * HTTP layer for students.
 * All service calls are async/await.
 * SECURITY: passwords are NEVER included in any response.
 * Supports pagination via ?page=1&limit=20 while remaining backward-compatible.
 */
const studentService = require('../services/studentService');

/** GET /students */
async function getAllStudents(req, res, next) {
  try {
    const { page, limit } = req.query;
    const allStudents = await studentService.getAll();

    // If pagination parameters are requested, return paginated envelope
    if (page !== undefined || limit !== undefined) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const total = allStudents.length;
      const startIndex = (pageNum - 1) * limitNum;
      const paginated = allStudents.slice(startIndex, startIndex + limitNum);

      return res.json({
        success: true,
        count: paginated.length,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum) || 1,
        students: paginated,
      });
    }

    res.json(allStudents);
  } catch (err) { next(err); }
}

/** GET /students/:id */
async function getStudentById(req, res, next) {
  try {
    const student = await studentService.getById(req.params.id);
    if (!student) return res.status(404).json({ success: false, error: 'Not Found', message: 'Student not found.' });
    res.json(student);
  } catch (err) { next(err); }
}

/** POST /students */
async function createStudent(req, res, next) {
  try {
    const student = await studentService.create(req.body);
    res.status(201).json(student);
  } catch (err) { next(err); }
}

/** PUT /students/:id */
async function updateStudent(req, res, next) {
  try {
    const student = await studentService.update(req.params.id, req.body);
    if (!student) return res.status(404).json({ success: false, error: 'Not Found', message: 'Student not found.' });
    res.json(student);
  } catch (err) { next(err); }
}

/** PATCH /students/:id */
async function patchStudent(req, res, next) {
  try {
    const student = await studentService.patch(req.params.id, req.body);
    if (!student) return res.status(404).json({ success: false, error: 'Not Found', message: 'Student not found.' });
    res.json(student);
  } catch (err) { next(err); }
}

/** DELETE /students/:id */
async function deleteStudent(req, res, next) {
  try {
    const student = await studentService.remove(req.params.id);
    if (!student) return res.status(404).json({ success: false, error: 'Not Found', message: 'Student not found.' });
    res.json(student);
  } catch (err) { next(err); }
}

/** POST /students/login (legacy endpoint) */
async function loginStudent(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'BadRequest', message: 'Email and password are required.' });
    }
    const student = await studentService.authenticate(email, password);
    if (!student) {
      return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Invalid email or password.' });
    }
    const { signToken } = require('../services/authService');
    const token = signToken(student);
    res.json({ success: true, token, student });
  } catch (err) { next(err); }
}

module.exports = { getAllStudents, getStudentById, createStudent, updateStudent, patchStudent, deleteStudent, loginStudent };
