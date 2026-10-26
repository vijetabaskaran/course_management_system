'use strict';
/**
 * controllers/studentController.js
 * HTTP layer for students.
 * SECURITY: studentModel always strips passwords before returning data.
 *           Passwords are NEVER included in any response from this controller.
 */
const studentService = require('../services/studentService');

/** GET /students */
async function getAllStudents(req, res, next) {
  try {
    res.json(studentService.getAll()); // passwords already stripped
  } catch (err) { next(err); }
}

/** GET /students/:id */
async function getStudentById(req, res, next) {
  try {
    const student = studentService.getById(req.params.id);
    if (!student) return res.status(404).json({ success: false, error: 'Not Found', message: 'Student not found.' });
    res.json(student);
  } catch (err) { next(err); }
}

/** POST /students */
async function createStudent(req, res, next) {
  try {
    const student = studentService.create(req.body);
    res.status(201).json(student);
  } catch (err) { next(err); }
}

/** PUT /students/:id */
async function updateStudent(req, res, next) {
  try {
    const student = studentService.update(req.params.id, req.body);
    if (!student) return res.status(404).json({ success: false, error: 'Not Found', message: 'Student not found.' });
    res.json(student);
  } catch (err) { next(err); }
}

/** PATCH /students/:id */
async function patchStudent(req, res, next) {
  try {
    const student = studentService.patch(req.params.id, req.body);
    if (!student) return res.status(404).json({ success: false, error: 'Not Found', message: 'Student not found.' });
    res.json(student);
  } catch (err) { next(err); }
}

/** DELETE /students/:id */
async function deleteStudent(req, res, next) {
  try {
    const student = studentService.remove(req.params.id);
    if (!student) return res.status(404).json({ success: false, error: 'Not Found', message: 'Student not found.' });
    res.json(student);
  } catch (err) { next(err); }
}

/** POST /students/login */
async function loginStudent(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'BadRequest', message: 'Email and password are required.' });
    }
    const student = studentService.authenticate(email, password);
    if (!student) {
      return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Invalid email or password.' });
    }
    res.json({ success: true, student });
  } catch (err) { next(err); }
}

module.exports = { getAllStudents, getStudentById, createStudent, updateStudent, patchStudent, deleteStudent, loginStudent };