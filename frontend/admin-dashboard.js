/**
 * EduPortal — admin-dashboard.js
 * Full admin dashboard: course CRUD, enrollment monitoring, student management.
 */

'use strict';

/* ============================================================
   INITIALIZATION
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const user = requireAuth('admin');
  if (!user) return;

  populateAdminUI(user);
  document.getElementById('current-date').textContent = formatCurrentDate();
  setAdminGreeting(user);
  setupMobileOverlay();
  renderAdminStats();
  renderRecentStudents();
  renderActivityLog();
  renderStudentsTable();
  renderCoursesGrid();
  renderEnrollmentMonitoring();

  // Course form submit
  const courseForm = document.getElementById('course-form');
  if (courseForm) courseForm.addEventListener('submit', handleCourseFormSubmit);
});

/* ============================================================
   UI POPULATION
   ============================================================ */

function populateAdminUI(user) {
  const avatarEl = document.getElementById('avatar-initials');
  if (avatarEl) avatarEl.textContent = getInitials(user.fullname);
}

function setAdminGreeting(user) {
  const hour      = new Date().getHours();
  const firstName = user.fullname.split(' ')[0];
  let time;
  if (hour < 12)       time = 'Morning';
  else if (hour < 17)  time = 'Afternoon';
  else                 time = 'Evening';
  const headingEl = document.getElementById('welcome-heading');
  if (headingEl) headingEl.textContent = `Good ${time}, ${firstName}! 🛡️`;
}

/* ============================================================
   OVERVIEW — STATS
   ============================================================ */

function renderAdminStats() {
  const students    = getStudents();
  const courses     = getCourses();
  const enrollments = getEnrollments();
  const progress    = getProgress();

  // Total students
  const statStudents = document.getElementById('stat-total-students');
  if (statStudents) statStudents.textContent = students.length;

  // Total courses
  const statCourses = document.getElementById('stat-total-courses');
  if (statCourses) statCourses.textContent = courses.length;

  // Total enrollments
  const statEnrollments = document.getElementById('stat-total-enrollments');
  if (statEnrollments) statEnrollments.textContent = enrollments.length;

  // Average progress across all records
  const statProgress = document.getElementById('stat-avg-progress');
  if (statProgress) {
    const avg = progress.length
      ? Math.round(progress.reduce((s, p) => s + p.percent, 0) / progress.length)
      : 0;
    statProgress.textContent = `${avg}%`;
  }
}

/* ============================================================
   OVERVIEW — RECENT STUDENTS
   ============================================================ */

function renderRecentStudents() {
  const container = document.getElementById('recent-students-list');
  if (!container) return;

  const students = getStudents()
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 6);

  if (!students.length) {
    container.innerHTML = '<div class="empty-state-sm">No students registered yet.</div>';
    return;
  }

  const AVATAR_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16','#f97316'];

  container.innerHTML = students.map((s, i) => `
    <div class="reg-item">
      <div class="reg-avatar" style="background:${AVATAR_COLORS[i % AVATAR_COLORS.length]};">${escapeHtml(getInitials(s.fullname))}</div>
      <div class="reg-info">
        <span class="reg-name">${escapeHtml(s.fullname)}</span>
        <span class="reg-meta">${escapeHtml(s.department || 'N/A')} · ${formatTimeAgo(s.createdAt)}</span>
      </div>
      <span class="status-pill status-good">Active</span>
    </div>
  `).join('');
}

/* ============================================================
   OVERVIEW — ACTIVITY LOG
   ============================================================ */

function renderActivityLog() {
  const container = document.getElementById('activity-log');
  if (!container) return;

  const students    = getStudents();
  const courses     = getCourses();
  const enrollments = getEnrollments();

  const events = [];

  students.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 3).forEach(s => {
    events.push({ type: 'student', text: `${s.fullname} registered`, ts: s.createdAt, color: 'blue-dot' });
  });

  courses.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 3).forEach(c => {
    events.push({ type: 'course', text: `Course "${c.name}" created`, ts: c.createdAt, color: 'green-dot' });
  });

  enrollments.slice().sort((a, b) => b.enrolledAt - a.enrolledAt).slice(0, 3).forEach(e => {
    const student = students.find(s => s.email === e.studentEmail);
    const course  = getCourseById(e.courseId);
    if (student && course) {
      events.push({ type: 'enrollment', text: `${student.fullname} enrolled in "${course.name}"`, ts: e.enrolledAt, color: 'orange-dot' });
    }
  });

  events.sort((a, b) => b.ts - a.ts);

  if (!events.length) {
    container.innerHTML = '<div class="empty-state-sm">No recent activity.</div>';
    return;
  }

  container.innerHTML = events.slice(0, 7).map(ev => `
    <div class="activity-item">
      <span class="activity-dot ${escapeHtml(ev.color)}"></span>
      <div class="activity-info">
        <span>${escapeHtml(ev.text)}</span>
        <span class="activity-time">${formatTimeAgo(ev.ts)}</span>
      </div>
    </div>
  `).join('');
}

/* ============================================================
   STUDENTS TABLE
   ============================================================ */

function renderStudentsTable() {
  const tbody = document.getElementById('students-tbody');
  if (!tbody) return;

  const students    = getStudents();
  const enrollments = getEnrollments();

  const emptyRow = document.getElementById('students-empty-row');

  if (!students.length) {
    if (emptyRow) emptyRow.style.display = '';
    return;
  }
  if (emptyRow) emptyRow.style.display = 'none';

  // Remove previously rendered rows (non-empty)
  tbody.querySelectorAll('tr:not(#students-empty-row)').forEach(r => r.remove());

  students.slice().sort((a, b) => b.createdAt - a.createdAt).forEach(student => {
    const enrolledCount = enrollments.filter(e => e.studentEmail === student.email).length;
    const joined = new Date(student.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const row = document.createElement('tr');
    row.setAttribute('data-search', `${student.fullname} ${student.email} ${student.department || ''}`.toLowerCase());
    row.innerHTML = `
      <td>${escapeHtml(generateStudentId(student.username))}</td>
      <td><strong>${escapeHtml(student.fullname)}</strong></td>
      <td><span class="dept-badge">${escapeHtml(student.department || 'N/A')}</span></td>
      <td>${escapeHtml(student.email)}</td>
      <td><span class="enroll-count">${enrolledCount}</span></td>
      <td>${escapeHtml(joined)}</td>
      <td><span class="status-pill status-good">Active</span></td>
    `;
    tbody.appendChild(row);
  });
}

function filterStudentsTable(query) {
  const tbody = document.getElementById('students-tbody');
  if (!tbody) return;
  const lq = query.toLowerCase().trim();
  tbody.querySelectorAll('tr[data-search]').forEach(row => {
    const text = row.getAttribute('data-search');
    row.style.display = (!lq || text.includes(lq)) ? '' : 'none';
  });
}

/* ============================================================
   COURSES GRID
   ============================================================ */

function renderCoursesGrid() {
  const grid  = document.getElementById('admin-courses-grid');
  const empty = document.getElementById('courses-empty-state');
  if (!grid) return;

  const courses     = getCourses();
  const enrollments = getEnrollments();

  // Remove old course cards (not the empty state)
  grid.querySelectorAll('.admin-course-card').forEach(c => c.remove());

  if (!courses.length) {
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';

  courses.forEach(course => {
    const count = enrollments.filter(e => e.courseId === course.id).length;
    const avgProg = getCourseAverageProgress(course.id);
    const card = document.createElement('div');
    card.className = 'course-card admin-course-card';
    card.innerHTML = `
      <div class="course-card-banner" style="background:${escapeHtml(course.color)};"></div>
      <div class="course-card-body">
        <span class="course-card-code">${escapeHtml(course.code)}</span>
        <h4 class="course-card-name">${escapeHtml(course.name)}</h4>
        ${course.instructor ? `<p class="course-card-instructor">${escapeHtml(course.instructor)}</p>` : '<p class="course-card-instructor text-muted">No instructor assigned</p>'}
        ${course.department ? `<span class="dept-badge" style="margin-bottom:.5rem;display:inline-block;">${escapeHtml(course.department)}</span>` : ''}
        <div class="admin-course-meta">
          <span>👥 ${count} Student${count !== 1 ? 's' : ''}</span>
          ${course.duration ? `<span>⏱ ${escapeHtml(course.duration)}</span>` : ''}
        </div>
        <div class="course-card-progress" style="margin-bottom:.75rem;">
          <div class="cprogress-bar"><div class="cprogress-fill" style="width:${avgProg}%;"></div></div>
          <span>${avgProg}% avg completion</span>
        </div>
        <div class="course-card-footer">
          <button class="action-btn" onclick="viewCourseDetail('${escapeHtml(course.id)}')">👁 View</button>
          <button class="action-btn" onclick="openCourseModal('${escapeHtml(course.id)}')">✏ Edit</button>
          <button class="action-btn action-btn-danger" onclick="confirmDeleteCourse('${escapeHtml(course.id)}')">🗑 Delete</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

/* ============================================================
   ENROLLMENT MONITORING
   ============================================================ */

function renderEnrollmentMonitoring() {
  const container = document.getElementById('enrollment-courses-list');
  const emptyState = document.getElementById('enrollment-empty-state');
  if (!container) return;

  const courses     = getCourses();
  const students    = getStudents();
  const enrollments = getEnrollments();

  // Remove old cards
  container.querySelectorAll('.enrollment-course-card').forEach(c => c.remove());

  if (!courses.length) {
    if (emptyState) emptyState.style.display = 'flex';
    return;
  }
  if (emptyState) emptyState.style.display = 'none';

  courses.forEach(course => {
    const courseEnrollments = enrollments.filter(e => e.courseId === course.id);
    const avgProg = getCourseAverageProgress(course.id);
    const enrolledStudents = courseEnrollments.map(e => {
      const student = students.find(s => s.email === e.studentEmail);
      const prog = getStudentCourseProgress(e.studentEmail, course.id);
      return { student, prog, enrolledAt: e.enrolledAt };
    }).filter(item => item.student);

    const card = document.createElement('div');
    card.className = 'enrollment-course-card';
    card.innerHTML = `
      <div class="enrollment-card-header" style="border-left: 4px solid; border-image: ${escapeHtml(course.color)} 1;">
        <div class="enrollment-card-title-row">
          <div>
            <span class="course-card-code">${escapeHtml(course.code)}</span>
            <h3 class="enrollment-course-name">${escapeHtml(course.name)}</h3>
            ${course.instructor ? `<p class="course-card-instructor">${escapeHtml(course.instructor)}</p>` : ''}
          </div>
          <div class="enrollment-summary">
            <div class="enrollment-stat">
              <span class="enrollment-stat-num">${courseEnrollments.length}</span>
              <span class="enrollment-stat-label">Students</span>
            </div>
            <div class="enrollment-stat">
              <span class="enrollment-stat-num">${avgProg}%</span>
              <span class="enrollment-stat-label">Avg Progress</span>
            </div>
          </div>
        </div>
        <div class="course-card-progress" style="margin-top:.5rem;">
          <div class="cprogress-bar"><div class="cprogress-fill" style="width:${avgProg}%;background:${getProgressColor(avgProg)};"></div></div>
        </div>
      </div>
      ${enrolledStudents.length > 0 ? `
      <div class="table-responsive">
        <table class="data-table enrollment-inner-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Department</th>
              <th>Enrolled On</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            ${enrolledStudents.map(item => `
              <tr>
                <td><strong>${escapeHtml(item.student.fullname)}</strong></td>
                <td><span class="dept-badge">${escapeHtml(item.student.department || 'N/A')}</span></td>
                <td>${new Date(item.enrolledAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}</td>
                <td>
                  <div class="progress-cell">
                    <div class="cprogress-bar progress-bar-sm"><div class="cprogress-fill" style="width:${item.prog}%;background:${getProgressColor(item.prog)};"></div></div>
                    <span class="progress-pct">${item.prog}%</span>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>` : `<p class="no-enrollments-msg">No students enrolled yet.</p>`}
    `;
    container.appendChild(card);
  });
}

function getProgressColor(pct) {
  if (pct >= 75) return '#10b981';
  if (pct >= 40) return '#f59e0b';
  return '#ef4444';
}

/* ============================================================
   COURSE MODAL — CREATE / EDIT
   ============================================================ */

function openCourseModal(courseId = null) {
  const overlay  = document.getElementById('course-modal-overlay');
  const title    = document.getElementById('modal-title');
  const form     = document.getElementById('course-form');
  const saveBtn  = document.getElementById('course-save-btn');
  const idInput  = document.getElementById('course-id');

  // Reset form
  form.reset();
  clearCourseFormErrors();

  if (courseId) {
    const course = getCourseById(courseId);
    if (!course) return;
    title.textContent               = 'Edit Course';
    saveBtn.textContent             = 'Update Course';
    idInput.value                   = course.id;
    document.getElementById('course-name').value        = course.name || '';
    document.getElementById('course-code').value        = course.code || '';
    document.getElementById('course-description').value = course.description || '';
    document.getElementById('course-department').value  = course.department || '';
    document.getElementById('course-duration').value    = course.duration || '';
    document.getElementById('course-instructor').value  = course.instructor || '';
  } else {
    title.textContent   = 'Create New Course';
    saveBtn.textContent = 'Save Course';
    idInput.value       = '';
  }

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  document.getElementById('course-name').focus();
}

function closeCourseModal() {
  const overlay = document.getElementById('course-modal-overlay');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

function clearCourseFormErrors() {
  ['course-name-error', 'course-code-error'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
  ['course-name', 'course-code'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('error', 'success');
  });
}

function handleCourseFormSubmit(e) {
  e.preventDefault();
  clearCourseFormErrors();

  const name = document.getElementById('course-name').value.trim();
  const code = document.getElementById('course-code').value.trim();
  let valid  = true;

  if (!name) {
    const nameEl = document.getElementById('course-name');
    nameEl.classList.add('error');
    document.getElementById('course-name-error').textContent = 'Course name is required.';
    valid = false;
  }
  if (!code) {
    const codeEl = document.getElementById('course-code');
    codeEl.classList.add('error');
    document.getElementById('course-code-error').textContent = 'Course code is required.';
    valid = false;
  }
  if (!valid) return;

  const courseData = {
    id:          document.getElementById('course-id').value || null,
    name,
    code,
    description: document.getElementById('course-description').value.trim(),
    department:  document.getElementById('course-department').value,
    duration:    document.getElementById('course-duration').value.trim(),
    instructor:  document.getElementById('course-instructor').value.trim(),
  };

  upsertCourse(courseData);
  closeCourseModal();
  renderCoursesGrid();
  renderAdminStats();
  renderActivityLog();
  renderEnrollmentMonitoring();
  showToast(courseData.id ? '✅ Course updated successfully!' : '✅ Course created successfully!');
}

/* ============================================================
   COURSE DELETE
   ============================================================ */

function confirmDeleteCourse(courseId) {
  const course = getCourseById(courseId);
  if (!course) return;
  const enrolledCount = getCourseEnrollments(courseId).length;
  const msg = enrolledCount > 0
    ? `Delete "${course.name}"? This will also remove ${enrolledCount} enrollment record(s). This action cannot be undone.`
    : `Delete "${course.name}"? This action cannot be undone.`;

  if (confirm(msg)) {
    deleteCourse(courseId);
    renderCoursesGrid();
    renderAdminStats();
    renderEnrollmentMonitoring();
    renderStudentsTable();
    showToast('🗑️ Course deleted.');
  }
}

/* ============================================================
   COURSE DETAIL VIEW
   ============================================================ */

function viewCourseDetail(courseId) {
  const course    = getCourseById(courseId);
  if (!course) return;

  const students      = getStudents();
  const enrollments   = getCourseEnrollments(courseId);
  const avgProg       = getCourseAverageProgress(courseId);

  // Set header
  document.getElementById('detail-title').textContent    = course.name;
  document.getElementById('detail-subtitle').textContent = `${course.code}${course.instructor ? ' · ' + course.instructor : ''}`;

  // Stats row
  const statsRow = document.getElementById('detail-stats-row');
  statsRow.innerHTML = `
    <div class="detail-stat"><span class="detail-stat-num">${enrollments.length}</span><span class="detail-stat-label">Enrolled</span></div>
    <div class="detail-stat"><span class="detail-stat-num">${avgProg}%</span><span class="detail-stat-label">Avg Progress</span></div>
    ${course.department ? `<div class="detail-stat"><span class="detail-stat-num" style="font-size:1rem;">${escapeHtml(course.department)}</span><span class="detail-stat-label">Department</span></div>` : ''}
    ${course.duration ? `<div class="detail-stat"><span class="detail-stat-num" style="font-size:1rem;">${escapeHtml(course.duration)}</span><span class="detail-stat-label">Duration</span></div>` : ''}
  `;

  // Students table
  const tbody = document.getElementById('detail-students-tbody');
  if (!enrollments.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="table-empty">No students enrolled yet.</td></tr>';
  } else {
    tbody.innerHTML = enrollments.map(e => {
      const student = students.find(s => s.email === e.studentEmail);
      if (!student) return '';
      const prog    = getStudentCourseProgress(e.studentEmail, courseId);
      const joined  = new Date(e.enrolledAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
      return `
        <tr>
          <td><strong>${escapeHtml(student.fullname)}</strong><br><small style="color:var(--text-muted)">${escapeHtml(student.email)}</small></td>
          <td><span class="dept-badge">${escapeHtml(student.department || 'N/A')}</span></td>
          <td>${escapeHtml(joined)}</td>
          <td>
            <div class="progress-cell">
              <div class="cprogress-bar progress-bar-sm"><div class="cprogress-fill" style="width:${prog}%;background:${getProgressColor(prog)};"></div></div>
              <span class="progress-pct">${prog}%</span>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  document.getElementById('course-detail-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCourseDetail() {
  document.getElementById('course-detail-overlay').classList.remove('active');
  document.body.style.overflow = '';
}

/* ============================================================
   SIDEBAR TOGGLE
   ============================================================ */

let sidebarCollapsed  = false;
let sidebarMobileOpen = false;

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (window.innerWidth <= 768) {
    sidebarMobileOpen = !sidebarMobileOpen;
    sidebar.classList.toggle('mobile-open', sidebarMobileOpen);
    if (overlay) overlay.classList.toggle('active', sidebarMobileOpen);
  } else {
    sidebarCollapsed = !sidebarCollapsed;
    sidebar.classList.toggle('collapsed', sidebarCollapsed);
  }
}

function setupMobileOverlay() {
  let overlay = document.getElementById('sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    overlay.className = 'sidebar-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.addEventListener('click', toggleSidebar);
    document.body.appendChild(overlay);
  }
}

/* ============================================================
   SECTION NAVIGATION
   ============================================================ */

const ADMIN_SECTIONS = ['overview', 'courses', 'students', 'enrollments', 'settings'];

function showSection(sectionName) {
  ADMIN_SECTIONS.forEach(name => {
    const sec = document.getElementById(`section-${name}`);
    const nav = document.getElementById(`nav-${name}`);
    if (sec) sec.classList.remove('active');
    if (nav) nav.classList.remove('active');
  });

  const target    = document.getElementById(`section-${sectionName}`);
  const targetNav = document.getElementById(`nav-${sectionName}`);
  if (target)    target.classList.add('active');
  if (targetNav) targetNav.classList.add('active');

  const breadcrumb = document.getElementById('page-breadcrumb');
  if (breadcrumb) {
    const labels = {
      overview:    'Overview',
      courses:     'Course Management',
      students:    'Student Management',
      enrollments: 'Enrollment Monitoring',
      settings:    'System Settings'
    };
    breadcrumb.textContent = labels[sectionName] || sectionName;
  }

  // Re-render dynamic sections on navigation
  if (sectionName === 'overview')     { renderAdminStats(); renderRecentStudents(); renderActivityLog(); }
  if (sectionName === 'courses')      renderCoursesGrid();
  if (sectionName === 'students')     renderStudentsTable();
  if (sectionName === 'enrollments')  renderEnrollmentMonitoring();

  if (window.innerWidth <= 768 && sidebarMobileOpen) toggleSidebar();
  return false;
}

/* ============================================================
   TOAST NOTIFICATION
   ============================================================ */

let toastTimer = null;

function showToast(message) {
  const toast = document.getElementById('toast-notification');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('active');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('active'), 3000);
}
