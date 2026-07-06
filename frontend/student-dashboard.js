/**
 * EduPortal — student-dashboard.js
 * Full student dashboard: browse courses, enroll, track progress, view profile.
 */

'use strict';

/* ============================================================
   STATE
   ============================================================ */

let currentUser        = null;
let progressEditCourseId = null;

/* ============================================================
   INITIALIZATION
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  currentUser = requireAuth('student');
  if (!currentUser) return;

  populateStudentUI(currentUser);
  document.getElementById('current-date').textContent = formatCurrentDate();
  setGreeting(currentUser);
  setupMobileOverlay();

  renderStudentStats();
  renderRecentEnrolled();
  renderProgressOverview();
  renderBrowseCourses();
  renderMyCourses();
  renderProfile();
});

/* ============================================================
   UI POPULATION — HEADER
   ============================================================ */

function populateStudentUI(user) {
  const avatarEl = document.getElementById('avatar-initials');
  if (avatarEl) avatarEl.textContent = getInitials(user.fullname);
}

function setGreeting(user) {
  const hour      = new Date().getHours();
  const firstName = user.fullname.split(' ')[0];
  let greeting;
  if (hour < 12)       greeting = `Good morning, ${firstName}! ☀️`;
  else if (hour < 17)  greeting = `Good afternoon, ${firstName}! 🌤️`;
  else                 greeting = `Good evening, ${firstName}! 🌙`;
  const headingEl = document.getElementById('welcome-heading');
  if (headingEl) headingEl.textContent = greeting;
}

/* ============================================================
   OVERVIEW — STATS
   ============================================================ */

function renderStudentStats() {
  const myEnrollments   = getStudentEnrollments(currentUser.email);
  const overallProgress = getStudentOverallProgress(currentUser.email);
  const allCourses      = getCourses();

  const statEnrolled = document.getElementById('stat-enrolled-count');
  if (statEnrolled) statEnrolled.textContent = myEnrollments.length;

  const statProgress = document.getElementById('stat-overall-progress');
  if (statProgress) statProgress.textContent = `${overallProgress}%`;

  const statDept = document.getElementById('stat-dept');
  if (statDept) statDept.textContent = (currentUser.department || 'N/A').split(' ')[0]; // short display

  const statAvail = document.getElementById('stat-available-courses');
  if (statAvail) statAvail.textContent = allCourses.length;
}

/* ============================================================
   OVERVIEW — RECENTLY ENROLLED
   ============================================================ */

function renderRecentEnrolled() {
  const container  = document.getElementById('recent-enrolled-list');
  if (!container) return;

  const enrollments = getStudentEnrollments(currentUser.email)
    .slice()
    .sort((a, b) => b.enrolledAt - a.enrolledAt)
    .slice(0, 5);

  if (!enrollments.length) {
    container.innerHTML = `<div class="empty-state-sm">You haven't enrolled yet. <a href="#" onclick="showSection('browse');return false;" class="inline-link">Browse courses →</a></div>`;
    return;
  }

  container.innerHTML = enrollments.map(e => {
    const course = getCourseById(e.courseId);
    if (!course) return '';
    const prog = getStudentCourseProgress(currentUser.email, course.id);
    return `
      <div class="course-item">
        <div class="course-color" style="background:${escapeHtml(course.color)};"></div>
        <div class="course-info">
          <span class="course-name">${escapeHtml(course.name)}</span>
          <span class="course-code">${escapeHtml(course.code)}</span>
        </div>
        <span class="progress-badge" style="background:${getProgressColor(prog)}20;color:${getProgressColor(prog)};">${prog}%</span>
      </div>
    `;
  }).join('');
}

/* ============================================================
   OVERVIEW — PROGRESS OVERVIEW
   ============================================================ */

function renderProgressOverview() {
  const container = document.getElementById('progress-overview-list');
  if (!container) return;

  const enrollments = getStudentEnrollments(currentUser.email);

  if (!enrollments.length) {
    container.innerHTML = '<div class="empty-state-sm">Enroll in courses to see your progress here.</div>';
    return;
  }

  const overall = getStudentOverallProgress(currentUser.email);
  container.innerHTML = `
    <div class="overall-progress-wrap">
      <div class="overall-progress-header">
        <span>Overall Learning Progress</span>
        <strong>${overall}%</strong>
      </div>
      <div class="cprogress-bar overall-bar">
        <div class="cprogress-fill" style="width:${overall}%;background:${getProgressColor(overall)};"></div>
      </div>
    </div>
    <div class="progress-course-list">
      ${enrollments.map(e => {
        const course = getCourseById(e.courseId);
        if (!course) return '';
        const prog = getStudentCourseProgress(currentUser.email, course.id);
        return `
          <div class="progress-course-item">
            <div class="progress-course-label">
              <span class="progress-dot" style="background:${escapeHtml(course.color.split(',')[0].replace('linear-gradient(135deg','').trim())};"></span>
              <span>${escapeHtml(course.name)}</span>
            </div>
            <div class="progress-course-bar-wrap">
              <div class="cprogress-bar progress-bar-sm">
                <div class="cprogress-fill" style="width:${prog}%;background:${getProgressColor(prog)};"></div>
              </div>
              <span class="progress-pct">${prog}%</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/* ============================================================
   BROWSE COURSES
   ============================================================ */

function renderBrowseCourses(filterQuery = '') {
  const grid       = document.getElementById('browse-courses-grid');
  const emptyState = document.getElementById('browse-empty-state');
  if (!grid) return;

  let courses = getCourses();
  if (filterQuery) {
    const q = filterQuery.toLowerCase();
    courses = courses.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.department || '').toLowerCase().includes(q) ||
      (c.instructor || '').toLowerCase().includes(q)
    );
  }

  // Remove old cards
  grid.querySelectorAll('.course-card').forEach(c => c.remove());

  if (!courses.length) {
    if (emptyState) emptyState.style.display = 'flex';
    return;
  }
  if (emptyState) emptyState.style.display = 'none';

  courses.forEach(course => {
    const enrolled = isEnrolled(currentUser.email, course.id);
    const count    = getCourseEnrollments(course.id).length;

    const card = document.createElement('div');
    card.className = 'course-card browse-course-card';
    card.innerHTML = `
      <div class="course-card-banner" style="background:${escapeHtml(course.color)};"></div>
      <div class="course-card-body">
        <span class="course-card-code">${escapeHtml(course.code)}</span>
        <h4 class="course-card-name">${escapeHtml(course.name)}</h4>
        ${course.instructor ? `<p class="course-card-instructor">${escapeHtml(course.instructor)}</p>` : ''}
        ${course.description ? `<p class="course-description-text">${escapeHtml(course.description)}</p>` : ''}
        <div class="browse-course-meta">
          ${course.department ? `<span class="dept-badge">${escapeHtml(course.department)}</span>` : ''}
          ${course.duration   ? `<span class="meta-tag">⏱ ${escapeHtml(course.duration)}</span>` : ''}
          <span class="meta-tag">👥 ${count} enrolled</span>
        </div>
        <div class="course-card-footer">
          ${enrolled
            ? `<span class="enrolled-badge">✓ Enrolled</span>`
            : `<button class="btn-enroll" onclick="handleEnroll('${escapeHtml(course.id)}', this)">Enroll Now</button>`
          }
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function filterBrowseCourses(query) {
  renderBrowseCourses(query);
}

function handleEnroll(courseId, btn) {
  const course = getCourseById(courseId);
  if (!course) return;

  if (isEnrolled(currentUser.email, courseId)) {
    showToast('You are already enrolled in this course.');
    return;
  }

  // Animate button
  btn.disabled    = true;
  btn.textContent = 'Enrolling...';

  setTimeout(() => {
    const result = enrollStudent(currentUser.email, courseId);
    if (result) {
      btn.outerHTML = `<span class="enrolled-badge">✓ Enrolled</span>`;
      showToast(`🎉 Enrolled in "${course.name}"!`);
      renderStudentStats();
      renderRecentEnrolled();
      renderProgressOverview();
      renderMyCourses();
    }
  }, 500);
}

/* ============================================================
   MY COURSES
   ============================================================ */

function renderMyCourses() {
  const grid       = document.getElementById('my-courses-grid');
  const emptyState = document.getElementById('my-courses-empty-state');
  if (!grid) return;

  const enrollments = getStudentEnrollments(currentUser.email);
  grid.querySelectorAll('.course-card').forEach(c => c.remove());

  if (!enrollments.length) {
    if (emptyState) emptyState.style.display = 'flex';
    return;
  }
  if (emptyState) emptyState.style.display = 'none';

  enrollments.slice().sort((a, b) => b.enrolledAt - a.enrolledAt).forEach(e => {
    const course = getCourseById(e.courseId);
    if (!course) return;
    const prog = getStudentCourseProgress(currentUser.email, course.id);

    const card = document.createElement('div');
    card.className = 'course-card';
    card.innerHTML = `
      <div class="course-card-banner" style="background:${escapeHtml(course.color)};"></div>
      <div class="course-card-body">
        <span class="course-card-code">${escapeHtml(course.code)}</span>
        <h4 class="course-card-name">${escapeHtml(course.name)}</h4>
        ${course.instructor ? `<p class="course-card-instructor">${escapeHtml(course.instructor)}</p>` : ''}
        <div class="course-card-progress">
          <div class="cprogress-bar">
            <div class="cprogress-fill" id="prog-fill-${escapeHtml(course.id)}" style="width:${prog}%;background:${getProgressColor(prog)};"></div>
          </div>
          <span id="prog-label-${escapeHtml(course.id)}">${prog}% complete</span>
        </div>
        <div class="course-card-footer">
          <span class="progress-status-badge" style="color:${getProgressColor(prog)};">${getProgressLabel(prog)}</span>
          <button class="action-btn" onclick="openProgressModal('${escapeHtml(course.id)}', '${escapeHtml(course.name)}', ${prog})">Update Progress</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function getProgressLabel(pct) {
  if (pct === 100) return '🏆 Completed';
  if (pct >= 75)   return '🔥 Almost There';
  if (pct >= 40)   return '📖 In Progress';
  return '🚀 Just Started';
}

function getProgressColor(pct) {
  if (pct >= 75) return '#10b981';
  if (pct >= 40) return '#f59e0b';
  return '#6366f1';
}

/* ============================================================
   PROGRESS MODAL
   ============================================================ */

function openProgressModal(courseId, courseName, currentProg) {
  progressEditCourseId = courseId;

  document.getElementById('progress-modal-title').textContent  = 'Update Progress';
  document.getElementById('progress-course-display').textContent = courseName;
  document.getElementById('progress-slider').value             = currentProg;
  document.getElementById('progress-slider-val').textContent   = `${currentProg}%`;
  document.getElementById('progress-preview-bar').style.width  = `${currentProg}%`;
  document.getElementById('progress-preview-bar').style.background = getProgressColor(currentProg);

  document.getElementById('progress-modal-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeProgressModal() {
  document.getElementById('progress-modal-overlay').classList.remove('active');
  document.body.style.overflow = '';
  progressEditCourseId = null;
}

function updateProgressDisplay(value) {
  const pct = parseInt(value);
  document.getElementById('progress-slider-val').textContent  = `${pct}%`;
  const bar = document.getElementById('progress-preview-bar');
  bar.style.width      = `${pct}%`;
  bar.style.background = getProgressColor(pct);
}

function saveProgressUpdate() {
  if (!progressEditCourseId) return;

  const pct = parseInt(document.getElementById('progress-slider').value);
  setProgress(currentUser.email, progressEditCourseId, pct);

  // Update in-page progress bars without full re-render
  const fillEl  = document.getElementById(`prog-fill-${progressEditCourseId}`);
  const labelEl = document.getElementById(`prog-label-${progressEditCourseId}`);
  if (fillEl)  { fillEl.style.width = `${pct}%`; fillEl.style.background = getProgressColor(pct); }
  if (labelEl) labelEl.textContent = `${pct}% complete`;

  closeProgressModal();
  renderStudentStats();
  renderProgressOverview();
  renderRecentEnrolled();
  showToast(`✅ Progress updated to ${pct}%!`);
}

/* ============================================================
   PROFILE
   ============================================================ */

function renderProfile() {
  const user        = currentUser;
  const enrollments = getStudentEnrollments(user.email);
  const overall     = getStudentOverallProgress(user.email);

  const avatarEl = document.getElementById('profile-avatar');
  if (avatarEl) avatarEl.textContent = getInitials(user.fullname);

  const nameEl = document.getElementById('profile-name');
  if (nameEl) nameEl.textContent = user.fullname;

  const roleEl = document.getElementById('profile-role-tag');
  if (roleEl) roleEl.textContent = `Student${user.department ? ' — ' + user.department : ''}`;

  const emailTagEl = document.getElementById('profile-email-tag');
  if (emailTagEl) emailTagEl.textContent = user.email;

  const idEl = document.getElementById('profile-student-id');
  if (idEl) idEl.textContent = generateStudentId(user.username);

  const deptEl = document.getElementById('profile-department');
  if (deptEl) deptEl.textContent = user.department || 'Not specified';

  const usernameEl = document.getElementById('profile-username');
  if (usernameEl) usernameEl.textContent = user.username;

  const emailDetailEl = document.getElementById('profile-email-detail');
  if (emailDetailEl) emailDetailEl.textContent = user.email;

  const enrolledEl = document.getElementById('profile-enrolled-count');
  if (enrolledEl) enrolledEl.textContent = enrollments.length;

  const joinedEl = document.getElementById('profile-joined');
  if (joinedEl && user.createdAt) {
    joinedEl.textContent = new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  const progressEl = document.getElementById('profile-progress');
  if (progressEl) progressEl.textContent = `${overall}%`;
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

const SECTIONS = ['overview', 'browse', 'courses', 'profile'];

function showSection(sectionName) {
  SECTIONS.forEach(name => {
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
      overview: 'Overview',
      browse:   'Browse Courses',
      courses:  'My Courses',
      profile:  'My Profile'
    };
    breadcrumb.textContent = labels[sectionName] || sectionName;
  }

  // Re-render on navigate
  if (sectionName === 'overview') { renderStudentStats(); renderRecentEnrolled(); renderProgressOverview(); }
  if (sectionName === 'browse')   renderBrowseCourses();
  if (sectionName === 'courses')  renderMyCourses();
  if (sectionName === 'profile')  renderProfile();

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
  toastTimer = setTimeout(() => toast.classList.remove('active'), 3200);
}
