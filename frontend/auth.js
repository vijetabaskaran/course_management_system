/**
 * EduPortal — auth.js
 * Shared authentication utilities + data layer
 * Handles session management, user storage, courses, enrollments, and progress.
 */

'use strict';

/* ============================================================
   STORAGE KEYS
   ============================================================ */

const SESSION_KEY     = 'eduportal_session';
const USERS_KEY       = 'eduportal_users';
const COURSES_KEY     = 'eduportal_courses';
const ENROLLMENTS_KEY = 'eduportal_enrollments';
const PROGRESS_KEY    = 'eduportal_progress';

/**
 * Default admin credentials (hardcoded for demo).
 * In production, admin credentials should be managed server-side.
 */
const DEFAULT_ADMIN = {
  email:    'admin@eduportal.com',
  password: hashPassword('Admin@123'),
  username: 'admin',
  fullname: 'System Administrator',
  role:     'admin'
};

/**
 * Simple client-side password hash (for demo purposes only).
 * @param {string} password
 * @returns {string}
 */
function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return btoa(String(hash) + password.length + password.slice(-2));
}

/* ============================================================
   STUDENT / USER STORE
   ============================================================ */

function initUsersStore() {
  if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify([]));
  }
}

/** @returns {Array} */
function getStudents() {
  initUsersStore();
  return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
}

/** @param {Object} student */
function saveStudent(student) {
  const students = getStudents();
  students.push(student);
  localStorage.setItem(USERS_KEY, JSON.stringify(students));
}

/** @param {string} email @returns {Object|null} */
function findStudentByEmail(email) {
  return getStudents().find(s => s.email.toLowerCase() === email.toLowerCase()) || null;
}

/** @param {string} username @returns {Object|null} */
function findStudentByUsername(username) {
  return getStudents().find(s => s.username.toLowerCase() === username.toLowerCase()) || null;
}

/* ============================================================
   COURSE STORE
   ============================================================ */

const COURSE_GRADIENT_PALETTES = [
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#10b981,#059669)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
  'linear-gradient(135deg,#ef4444,#dc2626)',
  'linear-gradient(135deg,#06b6d4,#0891b2)',
  'linear-gradient(135deg,#ec4899,#db2777)',
  'linear-gradient(135deg,#84cc16,#65a30d)',
  'linear-gradient(135deg,#f97316,#ea580c)',
];

function initCoursesStore() {
  if (!localStorage.getItem(COURSES_KEY)) {
    localStorage.setItem(COURSES_KEY, JSON.stringify([]));
  }
}

/** @returns {Array} */
function getCourses() {
  initCoursesStore();
  return JSON.parse(localStorage.getItem(COURSES_KEY)) || [];
}

/** @param {Array} courses */
function saveCourses(courses) {
  localStorage.setItem(COURSES_KEY, JSON.stringify(courses));
}

/**
 * Create or update a course.
 * @param {Object} courseData
 * @returns {Object} saved course
 */
function upsertCourse(courseData) {
  const courses = getCourses();
  if (courseData.id) {
    // Update existing
    const idx = courses.findIndex(c => c.id === courseData.id);
    if (idx !== -1) {
      courses[idx] = { ...courses[idx], ...courseData, updatedAt: Date.now() };
      saveCourses(courses);
      return courses[idx];
    }
  }
  // Create new
  const newCourse = {
    ...courseData,
    id: 'CRS-' + Date.now(),
    color: COURSE_GRADIENT_PALETTES[courses.length % COURSE_GRADIENT_PALETTES.length],
    createdAt: Date.now()
  };
  courses.push(newCourse);
  saveCourses(courses);
  return newCourse;
}

/**
 * Delete a course and its enrollments/progress.
 * @param {string} courseId
 */
function deleteCourse(courseId) {
  saveCourses(getCourses().filter(c => c.id !== courseId));
  saveEnrollments(getEnrollments().filter(e => e.courseId !== courseId));
  saveProgress(getProgress().filter(p => p.courseId !== courseId));
}

/** @param {string} courseId @returns {Object|null} */
function getCourseById(courseId) {
  return getCourses().find(c => c.id === courseId) || null;
}

/* ============================================================
   ENROLLMENT STORE
   ============================================================ */

function initEnrollmentsStore() {
  if (!localStorage.getItem(ENROLLMENTS_KEY)) {
    localStorage.setItem(ENROLLMENTS_KEY, JSON.stringify([]));
  }
}

/** @returns {Array} */
function getEnrollments() {
  initEnrollmentsStore();
  return JSON.parse(localStorage.getItem(ENROLLMENTS_KEY)) || [];
}

/** @param {Array} enrollments */
function saveEnrollments(enrollments) {
  localStorage.setItem(ENROLLMENTS_KEY, JSON.stringify(enrollments));
}

/**
 * Enroll a student in a course. Prevents duplicates.
 * @param {string} studentEmail
 * @param {string} courseId
 * @returns {Object|null} enrollment record, or null if already enrolled
 */
function enrollStudent(studentEmail, courseId) {
  const enrollments = getEnrollments();
  const alreadyEnrolled = enrollments.some(
    e => e.studentEmail === studentEmail && e.courseId === courseId
  );
  if (alreadyEnrolled) return null;

  const record = {
    id: 'ENR-' + Date.now(),
    studentEmail,
    courseId,
    enrolledAt: Date.now()
  };
  enrollments.push(record);
  saveEnrollments(enrollments);

  // Initialize progress at 0
  setProgress(studentEmail, courseId, 0);
  return record;
}

/**
 * Get all enrollments for a specific student.
 * @param {string} studentEmail
 * @returns {Array}
 */
function getStudentEnrollments(studentEmail) {
  return getEnrollments().filter(e => e.studentEmail === studentEmail);
}

/**
 * Get all enrollments for a specific course.
 * @param {string} courseId
 * @returns {Array}
 */
function getCourseEnrollments(courseId) {
  return getEnrollments().filter(e => e.courseId === courseId);
}

/**
 * Check if a student is enrolled in a course.
 * @param {string} studentEmail
 * @param {string} courseId
 * @returns {boolean}
 */
function isEnrolled(studentEmail, courseId) {
  return getEnrollments().some(
    e => e.studentEmail === studentEmail && e.courseId === courseId
  );
}

/* ============================================================
   PROGRESS STORE
   ============================================================ */

function initProgressStore() {
  if (!localStorage.getItem(PROGRESS_KEY)) {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify([]));
  }
}

/** @returns {Array} */
function getProgress() {
  initProgressStore();
  return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || [];
}

/** @param {Array} progress */
function saveProgress(progress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

/**
 * Set progress percentage for a student-course pair.
 * @param {string} studentEmail
 * @param {string} courseId
 * @param {number} percent - 0 to 100
 */
function setProgress(studentEmail, courseId, percent) {
  const all = getProgress();
  const idx = all.findIndex(p => p.studentEmail === studentEmail && p.courseId === courseId);
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  if (idx !== -1) {
    all[idx].percent = clamped;
    all[idx].updatedAt = Date.now();
  } else {
    all.push({ studentEmail, courseId, percent: clamped, updatedAt: Date.now() });
  }
  saveProgress(all);
}

/**
 * Get progress for a student-course pair.
 * @param {string} studentEmail
 * @param {string} courseId
 * @returns {number} 0-100
 */
function getStudentCourseProgress(studentEmail, courseId) {
  const record = getProgress().find(
    p => p.studentEmail === studentEmail && p.courseId === courseId
  );
  return record ? record.percent : 0;
}

/**
 * Get average progress for a student across all their enrollments.
 * @param {string} studentEmail
 * @returns {number} 0-100
 */
function getStudentOverallProgress(studentEmail) {
  const enrollments = getStudentEnrollments(studentEmail);
  if (!enrollments.length) return 0;
  const total = enrollments.reduce(
    (sum, e) => sum + getStudentCourseProgress(studentEmail, e.courseId), 0
  );
  return Math.round(total / enrollments.length);
}

/**
 * Get average progress across all students for a course.
 * @param {string} courseId
 * @returns {number} 0-100
 */
function getCourseAverageProgress(courseId) {
  const enrollments = getCourseEnrollments(courseId);
  if (!enrollments.length) return 0;
  const total = enrollments.reduce(
    (sum, e) => sum + getStudentCourseProgress(e.studentEmail, courseId), 0
  );
  return Math.round(total / enrollments.length);
}

/* ============================================================
   SESSION MANAGEMENT
   ============================================================ */

/**
 * Create a new session.
 * @param {Object} user
 * @param {boolean} remember
 */
function createSession(user, remember = false) {
  const session = {
    user:      { ...user, password: undefined },
    createdAt: Date.now(),
    expiresAt: Date.now() + (remember ? 7 * 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000),
    remember
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/** @returns {Object|null} */
function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      destroySession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function destroySession() {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Guard for dashboard pages.
 * @param {string} requiredRole - 'student' | 'admin'
 * @returns {Object|null}
 */
function requireAuth(requiredRole) {
  const session = getSession();
  if (!session) {
    window.location.href = 'index.html';
    return null;
  }
  if (session.user.role !== requiredRole) {
    window.location.href = 'index.html';
    return null;
  }
  return session.user;
}

function redirectIfAuthenticated() {
  const session = getSession();
  if (!session) return;
  if (session.user.role === 'admin') {
    window.location.href = 'admin-dashboard.html';
  } else {
    window.location.href = 'student-dashboard.html';
  }
}

function logout() {
  destroySession();
  window.location.href = 'index.html';
}

/* ============================================================
   UI HELPERS
   ============================================================ */

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  btn.innerHTML = isPassword
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}

function showAlert(message, type = 'error') {
  const el = document.getElementById('auth-alert');
  if (!el) return;
  el.textContent = message;
  el.className = `auth-alert ${type}`;
  el.style.display = 'flex';
  if (type === 'success') {
    setTimeout(() => { el.style.display = 'none'; }, 4000);
  }
}

function hideAlert() {
  const el = document.getElementById('auth-alert');
  if (el) el.style.display = 'none';
}

function setFieldState(input, errorElId, message) {
  const errorEl = document.getElementById(errorElId);
  if (message) {
    input.classList.add('error');
    input.classList.remove('success');
    if (errorEl) errorEl.textContent = message;
  } else {
    input.classList.remove('error');
    input.classList.add('success');
    if (errorEl) errorEl.textContent = '';
  }
}

function clearFormErrors(form) {
  form.querySelectorAll('.form-input, .form-select').forEach(inp => {
    inp.classList.remove('error', 'success');
  });
  form.querySelectorAll('.field-error').forEach(el => {
    el.textContent = '';
  });
  hideAlert();
}

function setButtonLoading(btn, loading, originalText = 'Submit') {
  if (loading) {
    btn.disabled = true;
    btn.innerHTML = `<div class="btn-spinner"></div><span>Please wait...</span>`;
  } else {
    btn.disabled = false;
    btn.innerHTML = `<span class="btn-text">${originalText}</span>
      <svg class="btn-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>`;
  }
}

function getInitials(fullname) {
  return fullname
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('');
}

function formatCurrentDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

function formatTimeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(text)));
  return div.innerHTML;
}

function generateStudentId(username) {
  const idNum = Math.abs(
    username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  ) % 9999;
  return `STU-${String(idNum).padStart(4, '0')}`;
}
