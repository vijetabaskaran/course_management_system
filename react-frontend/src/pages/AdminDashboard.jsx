import { useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import Toast from '../components/Toast';
import {
  getStudents, getCourses, getEnrollments, getProgress,
  getCourseById, getCourseEnrollments, getCourseAverageProgress,
  getStudentCourseProgress, deleteCourse, upsertCourse,
  getInitials, generateStudentId, formatCurrentDate,
  getGreeting, getProgressColor, formatTimeAgo,
} from '../services/storage';
import '../styles/dashboard.css';

/* ── Sidebar sections ─────────────────────────── */
const ADMIN_SECTIONS = [
  { key: 'overview', label: 'Overview', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  { key: 'courses', label: 'Courses', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
  { key: 'students', label: 'Students', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { key: 'enrollments', label: 'Enrollments', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { key: 'settings', label: 'Settings', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
];

const DEPARTMENTS = [
  'Computer Science','Software Engineering','Information Technology',
  'Electrical Engineering','Mechanical Engineering','Business Administration',
  'Mathematics','Physics','Chemistry','Economics',
];

const AVATAR_COLORS = ['#A88F70','#8C7358','#6B5D50','#5C4E43','#9C8B7A','#7A6855','#C4A882','#D8C3A5'];

import { LEARNING_DOMAINS } from '../data/coursesData';

/* ── Course Modal ─────────────────────────────── */
function CourseModal({ course, onClose, onSave }) {
  const isEdit = !!course?.id;
  const [form, setForm] = useState({
    id:          course?.id          || '',
    name:        course?.name || course?.title || '',
    code:        course?.code        || '',
    domain:      course?.domain || course?.category || 'Python',
    description: course?.description || '',
    department:  course?.department  || '',
    duration:    course?.duration    || '',
    instructor:  course?.instructor  || '',
  });
  const [errors, setErrors] = useState({});

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: '' })); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Course name is required.';
    if (!form.code.trim()) errs.code = 'Course code is required.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave({ ...form, id: form.id || null, title: form.name, category: form.domain });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p id="modal-title" className="modal-title">{isEdit ? 'Edit Course' : 'Create New Course'}</p>
            <p className="modal-subtitle">{isEdit ? 'Update course information' : 'Fill in the details below'}</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form id="course-form" onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="modal-grid">
              <div className="modal-full">
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Course Name <span className="required">*</span></label>
                  <input id="course-name" type="text" className={`form-input no-icon${errors.name ? ' error' : ''}`} placeholder="e.g. Python Programming Masterclass" value={form.name} onChange={e => set('name', e.target.value)}/>
                  {errors.name && <span id="course-name-error" className="field-error">{errors.name}</span>}
                </div>
              </div>

              <div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Learning Domain <span className="required">*</span></label>
                  <div className="select-wrapper">
                    <select id="course-domain" className="form-select" value={form.domain} onChange={e => set('domain', e.target.value)}>
                      {LEARNING_DOMAINS.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                    <span className="select-chevron"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg></span>
                  </div>
                </div>
              </div>

              <div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Course Code <span className="required">*</span></label>
                  <input id="course-code" type="text" className={`form-input no-icon${errors.code ? ' error' : ''}`} placeholder="CS101" value={form.code} onChange={e => set('code', e.target.value)}/>
                  {errors.code && <span id="course-code-error" className="field-error">{errors.code}</span>}
                </div>
              </div>

              <div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Duration</label>
                  <input id="course-duration" type="text" className="form-input no-icon" placeholder="e.g. 12 Weeks" value={form.duration} onChange={e => set('duration', e.target.value)}/>
                </div>
              </div>

              <div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Department</label>
                  <div className="select-wrapper">
                    <select id="course-department" className="form-select" value={form.department} onChange={e => set('department', e.target.value)}>
                      <option value="">Select department</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <span className="select-chevron"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg></span>
                  </div>
                </div>
              </div>

              <div className="modal-full">
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Instructor</label>
                  <input id="course-instructor" type="text" className="form-input no-icon" placeholder="Dr. Jane Smith" value={form.instructor} onChange={e => set('instructor', e.target.value)}/>
                </div>
              </div>
              
              <div className="modal-full">
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea id="course-description" className="form-input no-icon" placeholder="Brief course overview..." rows="3" style={{ resize: 'vertical', paddingTop: '0.72rem' }} value={form.description} onChange={e => set('description', e.target.value)}/>
                </div>
              </div>
              <input type="hidden" id="course-id" value={form.id}/>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button id="course-save-btn" type="submit" className="btn-action">{isEdit ? 'Update Course' : 'Save Course'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Course Detail Modal ──────────────────────── */
function CourseDetailModal({ courseId, onClose }) {
  if (!courseId) return null;
  const course = getCourseById(courseId);
  if (!course) return null;
  const students = getStudents();
  const enrollments = getCourseEnrollments(courseId);
  const avgProg = getCourseAverageProgress(courseId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p id="detail-title" className="modal-title">{course.name}</p>
            <p id="detail-subtitle" className="modal-subtitle">{course.code}{course.instructor ? ` · ${course.instructor}` : ''}</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div id="detail-stats-row" className="detail-stats-row">
          <div className="detail-stat"><span className="detail-stat-num">{enrollments.length}</span><span className="detail-stat-label">Enrolled</span></div>
          <div className="detail-stat"><span className="detail-stat-num">{avgProg}%</span><span className="detail-stat-label">Avg Progress</span></div>
          {course.department && <div className="detail-stat"><span className="detail-stat-num" style={{ fontSize: '1rem' }}>{course.department}</span><span className="detail-stat-label">Department</span></div>}
          {course.duration && <div className="detail-stat"><span className="detail-stat-num" style={{ fontSize: '1rem' }}>{course.duration}</span><span className="detail-stat-label">Duration</span></div>}
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr><th>Student</th><th>Department</th><th>Enrolled On</th><th>Progress</th></tr>
            </thead>
            <tbody id="detail-students-tbody">
              {enrollments.length === 0 ? (
                <tr><td colSpan="4" className="table-empty">No students enrolled yet.</td></tr>
              ) : enrollments.map(e => {
                const student = students.find(s => s.email === e.studentEmail);
                if (!student) return null;
                const prog = getStudentCourseProgress(e.studentEmail, courseId);
                const joined = new Date(e.enrolledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                return (
                  <tr key={e.id}>
                    <td><strong>{student.fullname}</strong><br/><small style={{ color: 'var(--text-muted)' }}>{student.email}</small></td>
                    <td><span className="dept-badge">{student.department || 'N/A'}</span></td>
                    <td>{joined}</td>
                    <td>
                      <div className="progress-cell">
                        <div className="cprogress-bar" style={{ minWidth: 80 }}>
                          <div className="cprogress-fill" style={{ width: `${prog}%`, background: getProgressColor(prog) }}/>
                        </div>
                        <span className="progress-pct">{prog}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="modal-footer"><button className="btn-secondary" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

/* ── Delete Confirmation Modal ────────────────── */
function DeleteModal({ courseId, onCancel, onConfirm }) {
  if (!courseId) return null;
  const course = getCourseById(courseId);
  if (!course) return null;
  const count = getCourseEnrollments(courseId).length;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <p className="modal-title">Delete Course</p>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Are you sure you want to delete <strong>"{course.name}"</strong>?
            {count > 0 && <> This will also remove <strong>{count} enrollment record(s)</strong>.</>}
            {' '}This action cannot be undone.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-action" style={{ background: 'linear-gradient(135deg,#9B3A3A,#C04545)' }} onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

/* ── Overview Section ─────────────────────────── */
function OverviewSection({ refresh }) {
  const students    = getStudents();
  const courses     = getCourses();
  const enrollments = getEnrollments();
  const progressAll = getProgress();
  const avg = progressAll.length ? Math.round(progressAll.reduce((s, p) => s + p.percent, 0) / progressAll.length) : 0;

  const recentStudents = students.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);

  // Activity log
  const events = [];
  students.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 3)
    .forEach(s => events.push({ text: `${s.fullname} registered`, ts: s.createdAt, color: 'blue-dot' }));
  courses.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 3)
    .forEach(c => events.push({ text: `Course "${c.name}" created`, ts: c.createdAt, color: 'green-dot' }));
  enrollments.slice().sort((a, b) => b.enrolledAt - a.enrolledAt).slice(0, 3).forEach(e => {
    const st = students.find(s => s.email === e.studentEmail);
    const co = getCourseById(e.courseId);
    if (st && co) events.push({ text: `${st.fullname} enrolled in "${co.name}"`, ts: e.enrolledAt, color: 'orange-dot' });
  });
  events.sort((a, b) => b.ts - a.ts);

  return (
    <>
      <div className="section-header">
        <div>
          <h2 id="welcome-heading" className="section-title">{getGreeting('Admin')}</h2>
          <p className="section-subtitle" id="current-date">{formatCurrentDate()}</p>
        </div>
        <span className="header-date">System Administrator</span>
      </div>

      <div className="stats-grid">
        <StatCard icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} number={students.length} label="TOTAL STUDENTS" badge="Registered"/>
        <StatCard icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>} number={courses.length} label="TOTAL COURSES" badge="Active Courses"/>
        <StatCard icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>} number={enrollments.length} label="TOTAL ENROLLMENTS" badge="All Time"/>
        <StatCard icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} number={`${avg}%`} label="AVG. PROGRESS" badge="Across All Courses"/>
      </div>

      <div className="content-grid">
        <div className="content-card">
          <h3 className="card-title">Recently Registered Students</h3>
          {recentStudents.length === 0 ? <p className="empty-state-sm">No students registered yet.</p> : (
            <div className="reg-list" id="recent-students-list">
              {recentStudents.map((s, i) => (
                <div key={s.email} className="reg-item">
                  <div className="reg-avatar" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>{getInitials(s.fullname)}</div>
                  <div className="reg-info">
                    <span className="reg-name">{s.fullname}</span>
                    <span className="reg-meta">{s.department || 'N/A'} · {formatTimeAgo(s.createdAt)}</span>
                  </div>
                  <span className="status-pill status-good">Active</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="content-card">
          <h3 className="card-title">Recent Activity</h3>
          {events.length === 0 ? <p className="empty-state-sm">No recent activity.</p> : (
            <div className="activity-log" id="activity-log">
              {events.slice(0, 7).map((ev, i) => (
                <div key={i} className="activity-item">
                  <span className={`activity-dot ${ev.color}`}/>
                  <div className="activity-info">
                    <span>{ev.text}</span>
                    <span className="activity-time">{formatTimeAgo(ev.ts)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Courses Section ──────────────────────────── */
function CoursesSection({ onAdd, onEdit, onView, onDelete }) {
  const courses = getCourses();
  const enrollments = getEnrollments();

  return (
    <>
      <div className="section-header">
        <div><h2 className="section-title">Course Management</h2><p className="section-subtitle">Create, edit and manage all courses.</p></div>
        <button className="btn-action" onClick={() => onAdd()}>+ New Course</button>
      </div>
      {courses.length === 0 ? (
        <div className="empty-state"><h3>No courses yet</h3><p>Create your first course to get started.</p></div>
      ) : (
        <div id="admin-courses-grid" className="courses-grid">
          {courses.map(course => {
            const count = enrollments.filter(e => e.courseId === course.id).length;
            const avgProg = getCourseAverageProgress(course.id);
            return (
              <div key={course.id} className="course-card admin-course-card">
                <div className="course-card-banner" style={{ background: course.color }}/>
                <div className="course-card-body">
                  <span className="course-card-code">{course.code}</span>
                  <h4 className="course-card-name">{course.name}</h4>
                  <p className="course-card-instructor">{course.instructor || <span className="text-muted">No instructor assigned</span>}</p>
                  {course.department && <span className="dept-badge" style={{ marginBottom: '.5rem', display: 'inline-block' }}>{course.department}</span>}
                  <div className="admin-course-meta">
                    <span>👥 {count} Student{count !== 1 ? 's' : ''}</span>
                    {course.duration && <span>⏱ {course.duration}</span>}
                  </div>
                  <div className="course-card-progress" style={{ marginBottom: '.75rem' }}>
                    <div className="cprogress-bar" style={{ flex: 1 }}>
                      <div className="cprogress-fill" style={{ width: `${avgProg}%`, background: getProgressColor(avgProg) }}/>
                    </div>
                    <span>{avgProg}% avg</span>
                  </div>
                  <div className="course-card-footer">
                    <button className="action-btn" onClick={() => onView(course.id)}>👁 View</button>
                    <button className="action-btn" onClick={() => onEdit(course)}>✏ Edit</button>
                    <button className="action-btn danger" onClick={() => onDelete(course.id)}>🗑 Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ── Students Section ─────────────────────────── */
function StudentsSection() {
  const [search, setSearch] = useState('');
  const students = getStudents();
  const enrollments = getEnrollments();

  const filtered = students.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${s.fullname} ${s.email} ${s.department || ''}`.toLowerCase().includes(q);
  }).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <>
      <div className="section-header">
        <div><h2 className="section-title">Student Management</h2><p className="section-subtitle">View and manage all registered students.</p></div>
      </div>
      <div className="table-card">
        <div className="table-toolbar">
          <input className="table-search" type="search" placeholder="Search students…" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead><tr><th>Student ID</th><th>Name</th><th>Department</th><th>Email</th><th>Enrolled</th><th>Joined</th><th>Status</th></tr></thead>
            <tbody id="students-tbody">
              {filtered.length === 0 ? (
                <tr id="students-empty-row"><td colSpan="7" className="table-empty">{search ? 'No students match your search.' : 'No students registered yet.'}</td></tr>
              ) : filtered.map(student => {
                const enrolledCount = enrollments.filter(e => e.studentEmail === student.email).length;
                const joined = new Date(student.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                return (
                  <tr key={student.email} data-search={`${student.fullname} ${student.email} ${student.department || ''}`.toLowerCase()}>
                    <td>{generateStudentId(student.username)}</td>
                    <td><strong>{student.fullname}</strong></td>
                    <td><span className="dept-badge">{student.department || 'N/A'}</span></td>
                    <td>{student.email}</td>
                    <td><span className="enroll-count">{enrolledCount}</span></td>
                    <td>{joined}</td>
                    <td><span className="status-pill status-good">Active</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ── Enrollments Section ──────────────────────── */
function EnrollmentsSection() {
  const courses     = getCourses();
  const students    = getStudents();
  const enrollments = getEnrollments();

  return (
    <>
      <div className="section-header">
        <div><h2 className="section-title">Enrollment Monitoring</h2><p className="section-subtitle">Track student enrollment and progress per course.</p></div>
      </div>
      {courses.length === 0 ? (
        <div className="empty-state"><h3>No courses yet</h3><p>Create courses to monitor enrollments.</p></div>
      ) : (
        <div id="enrollment-courses-list">
          {courses.map(course => {
            const courseEnrollments = enrollments.filter(e => e.courseId === course.id);
            const avgProg = getCourseAverageProgress(course.id);
            const enrolledStudents = courseEnrollments.map(e => {
              const student = students.find(s => s.email === e.studentEmail);
              const prog = getStudentCourseProgress(e.studentEmail, course.id);
              return { student, prog, enrolledAt: e.enrolledAt };
            }).filter(item => item.student);

            return (
              <div key={course.id} className="enrollment-course-card">
                <div className="enrollment-card-header">
                  <div className="enrollment-card-title-row">
                    <div>
                      <span className="course-card-code">{course.code}</span>
                      <h3 className="enrollment-course-name">{course.name}</h3>
                      {course.instructor && <p className="course-card-instructor">{course.instructor}</p>}
                    </div>
                    <div className="enrollment-summary">
                      <div className="enrollment-stat"><span className="enrollment-stat-num">{courseEnrollments.length}</span><span className="enrollment-stat-label">Students</span></div>
                      <div className="enrollment-stat"><span className="enrollment-stat-num">{avgProg}%</span><span className="enrollment-stat-label">Avg Progress</span></div>
                    </div>
                  </div>
                  <div className="course-card-progress" style={{ marginTop: '.5rem' }}>
                    <div className="cprogress-bar" style={{ flex: 1 }}>
                      <div className="cprogress-fill" style={{ width: `${avgProg}%`, background: getProgressColor(avgProg) }}/>
                    </div>
                  </div>
                </div>
                {enrolledStudents.length > 0 ? (
                  <div className="table-responsive">
                    <table className="data-table enrollment-inner-table" style={{ fontSize: '0.83rem' }}>
                      <thead><tr><th>Student</th><th>Department</th><th>Enrolled On</th><th>Progress</th></tr></thead>
                      <tbody>
                        {enrolledStudents.map((item, i) => (
                          <tr key={i}>
                            <td><strong>{item.student.fullname}</strong></td>
                            <td><span className="dept-badge">{item.student.department || 'N/A'}</span></td>
                            <td>{new Date(item.enrolledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                            <td>
                              <div className="progress-cell">
                                <div className="cprogress-bar" style={{ minWidth: 80 }}>
                                  <div className="cprogress-fill" style={{ width: `${item.prog}%`, background: getProgressColor(item.prog) }}/>
                                </div>
                                <span className="progress-pct">{item.prog}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="no-enrollments-msg">No students enrolled yet.</p>}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ── Settings Section ─────────────────────────── */
function SettingsSection({ toast }) {
  const cards = [
    { title: 'Security Settings', desc: 'Configure password policies, session timeouts, and two-factor authentication.' },
    { title: 'Email Notifications', desc: 'Manage automated email notifications for students and faculty.' },
    { title: 'Academic Calendar', desc: 'Set semester dates, holidays, and important academic milestones.' },
    { title: 'Data Backup', desc: 'Schedule automated backups and manage data retention policies.' },
  ];
  return (
    <>
      <div className="section-header"><div><h2 className="section-title">System Settings</h2><p className="section-subtitle">Configure portal preferences and system options.</p></div></div>
      <div className="settings-grid">
        {cards.map(c => (
          <div key={c.title} className="settings-card">
            <h4>{c.title}</h4>
            <p>{c.desc}</p>
            <button className="btn-action" onClick={() => toast(`${c.title} — coming soon!`)}>Configure</button>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── Main AdminDashboard ──────────────────────── */
export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');
  const [toastMsg, setToastMsg] = useState('');
  const [courseModal, setCourseModal] = useState(null);   // null | course object (null id = new)
  const [detailCourseId, setDetailCourseId] = useState(null);
  const [deleteCourseId, setDeleteCourseId] = useState(null);
  const [, forceUpdate] = useState(0);

  const showToast = useCallback((msg) => setToastMsg(msg), []);
  const clearToast = useCallback(() => setToastMsg(''), []);
  const refresh = useCallback(() => forceUpdate(n => n + 1), []);

  const breadcrumbLabels = {
    overview: 'Overview', courses: 'Course Management',
    students: 'Student Management', enrollments: 'Enrollment Monitoring', settings: 'System Settings',
  };

  if (loading) return null;
  if (!user || user.role !== 'admin') return <Navigate to="/" replace/>;

  const handleCourseModalSave = (data) => {
    upsertCourse(data);
    setCourseModal(null);
    refresh();
    showToast(data.id ? '✅ Course updated successfully!' : '✅ Course created successfully!');
  };

  const handleDeleteConfirm = () => {
    if (!deleteCourseId) return;
    deleteCourse(deleteCourseId);
    setDeleteCourseId(null);
    refresh();
    showToast('🗑️ Course deleted.');
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':    return <OverviewSection key={activeSection} refresh={refresh}/>;
      case 'courses':     return <CoursesSection key={activeSection} onAdd={() => setCourseModal({})} onEdit={c => setCourseModal(c)} onView={id => setDetailCourseId(id)} onDelete={id => setDeleteCourseId(id)}/>;
      case 'students':    return <StudentsSection key={activeSection}/>;
      case 'enrollments': return <EnrollmentsSection key={activeSection}/>;
      case 'settings':    return <SettingsSection key={activeSection} toast={showToast}/>;
      default:            return null;
    }
  };

  return (
    <div className="dashboard-layout admin-theme">
      <Sidebar
        sections={ADMIN_SECTIONS}
        activeSection={activeSection}
        onNavigate={setActiveSection}
        theme="admin-theme"
      />

      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <span className="admin-label">Administrator</span>
            <span className="breadcrumb">{breadcrumbLabels[activeSection]}</span>
          </div>
          <div className="topbar-right">
            <div className="user-avatar" style={{ background: 'linear-gradient(135deg,#5C4E43,#3F352C)', borderColor: 'rgba(255,253,248,0.15)' }} title="Admin">
              AD
            </div>
          </div>
        </header>

        <div className="dashboard-section active">
          {renderSection()}
        </div>
      </div>

      {/* Modals */}
      {courseModal !== null && (
        <CourseModal course={courseModal} onClose={() => setCourseModal(null)} onSave={handleCourseModalSave}/>
      )}
      {detailCourseId && (
        <CourseDetailModal courseId={detailCourseId} onClose={() => setDetailCourseId(null)}/>
      )}
      {deleteCourseId && (
        <DeleteModal courseId={deleteCourseId} onCancel={() => setDeleteCourseId(null)} onConfirm={handleDeleteConfirm}/>
      )}

      <Toast message={toastMsg} onHide={clearToast}/>
    </div>
  );
}
