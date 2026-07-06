/**
 * EduPortal — login.js
 * Handles login page logic: role toggling, form submission, and validation.
 */

'use strict';

/* ============================================================
   STATE
   ============================================================ */

/** Current selected role: 'student' | 'admin' */
let currentRole = 'student';

/* ============================================================
   INITIALIZATION
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Redirect if already logged in
  redirectIfAuthenticated();

  // Set up form submit handler
  const form = document.getElementById('login-form');
  if (form) form.addEventListener('submit', handleLogin);

  // Set current date in topbar if present
  const dateEl = document.getElementById('current-date');
  if (dateEl) dateEl.textContent = formatCurrentDate();

  // Show success message if redirected from registration
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('registered') === 'true') {
    showAlert('🎉 Registration successful! You can now log in with your credentials.', 'success');
    // Clean URL without reload
    window.history.replaceState({}, document.title, 'index.html');
  }

  // Real-time input clearing on typing
  setupInputListeners();
});

/* ============================================================
   ROLE SWITCHING
   ============================================================ */

/**
 * Switch between student and admin login modes.
 * @param {'student'|'admin'} role
 */
function switchRole(role) {
  currentRole = role;

  const studentBtn   = document.getElementById('tab-student');
  const adminBtn     = document.getElementById('tab-admin');
  const slider       = document.getElementById('toggle-slider');
  const title        = document.getElementById('form-title');
  const subtitle     = document.getElementById('form-subtitle');
  const registerDiv  = document.getElementById('register-divider');
  const registerCta  = document.getElementById('register-cta');

  if (role === 'student') {
    studentBtn.classList.add('active');
    studentBtn.setAttribute('aria-selected', 'true');
    adminBtn.classList.remove('active');
    adminBtn.setAttribute('aria-selected', 'false');
    slider.classList.remove('admin-side');
    title.textContent    = 'Student Login';
    subtitle.textContent = 'Welcome back! Please enter your credentials.';
    if (registerDiv) registerDiv.style.display = 'flex';
    if (registerCta) registerCta.style.display = 'block';
  } else {
    adminBtn.classList.add('active');
    adminBtn.setAttribute('aria-selected', 'true');
    studentBtn.classList.remove('active');
    studentBtn.setAttribute('aria-selected', 'false');
    slider.classList.add('admin-side');
    title.textContent    = 'Admin Login';
    subtitle.textContent = 'Restricted access. Authorized personnel only.';
    if (registerDiv) registerDiv.style.display = 'none';
    if (registerCta) registerCta.style.display = 'none';
  }

  // Clear form errors on role switch
  const form = document.getElementById('login-form');
  if (form) clearFormErrors(form);
}

/* ============================================================
   FORM VALIDATION
   ============================================================ */

/**
 * Validate email field.
 * @returns {boolean}
 */
function validateEmail() {
  const input = document.getElementById('login-email');
  const val   = input.value.trim();
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!val) {
    setFieldState(input, 'email-error', 'Email address is required.');
    return false;
  }
  if (!regex.test(val)) {
    setFieldState(input, 'email-error', 'Please enter a valid email address.');
    return false;
  }
  setFieldState(input, 'email-error', '');
  return true;
}

/**
 * Validate password field.
 * @returns {boolean}
 */
function validatePassword() {
  const input = document.getElementById('login-password');
  const val   = input.value;

  if (!val) {
    setFieldState(input, 'password-error', 'Password is required.');
    return false;
  }
  if (val.length < 6) {
    setFieldState(input, 'password-error', 'Password must be at least 6 characters.');
    return false;
  }
  setFieldState(input, 'password-error', '');
  return true;
}

/**
 * Attach real-time validation listeners.
 */
function setupInputListeners() {
  const emailInput = document.getElementById('login-email');
  const passInput  = document.getElementById('login-password');

  if (emailInput) {
    emailInput.addEventListener('blur',  validateEmail);
    emailInput.addEventListener('input', () => {
      if (emailInput.classList.contains('error')) validateEmail();
      hideAlert();
    });
  }

  if (passInput) {
    passInput.addEventListener('blur',  validatePassword);
    passInput.addEventListener('input', () => {
      if (passInput.classList.contains('error')) validatePassword();
      hideAlert();
    });
  }
}

/* ============================================================
   LOGIN HANDLER
   ============================================================ */

/**
 * Handle login form submission.
 * @param {Event} e
 */
async function handleLogin(e) {
  e.preventDefault();

  // Validate all fields
  const emailValid    = validateEmail();
  const passwordValid = validatePassword();

  if (!emailValid || !passwordValid) return;

  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const remember = document.getElementById('remember-me').checked;
  const btn      = document.getElementById('login-btn');

  // Show loading state
  setButtonLoading(btn, true);

  // Simulate async authentication (API call in production)
  await new Promise(r => setTimeout(r, 800));

  try {
    let authenticatedUser = null;

    if (currentRole === 'admin') {
      authenticatedUser = authenticateAdmin(email, password);
    } else {
      authenticatedUser = authenticateStudent(email, password);
    }

    if (!authenticatedUser) {
      showAlert(
        currentRole === 'admin'
          ? 'Invalid admin credentials. Please try again.'
          : 'Invalid email or password. Please check and try again.',
        'error'
      );
      setButtonLoading(btn, false, 'Sign In');
      return;
    }

    // Authentication successful — create session
    createSession(authenticatedUser, remember);

    // Show success briefly before redirect
    showAlert(`Welcome back, ${authenticatedUser.fullname}! Redirecting...`, 'success');
    setButtonLoading(btn, false, '✓ Success');

    setTimeout(() => {
      window.location.href = currentRole === 'admin'
        ? 'admin-dashboard.html'
        : 'student-dashboard.html';
    }, 800);

  } catch (err) {
    showAlert('An unexpected error occurred. Please try again.', 'error');
    setButtonLoading(btn, false, 'Sign In');
  }
}

/* ============================================================
   AUTHENTICATION LOGIC
   ============================================================ */

/**
 * Authenticate an admin user against the default credentials.
 * @param {string} email
 * @param {string} password
 * @returns {Object|null}
 */
function authenticateAdmin(email, password) {
  const hashed = hashPassword(password);
  if (
    email.toLowerCase() === DEFAULT_ADMIN.email.toLowerCase() &&
    hashed === DEFAULT_ADMIN.password
  ) {
    return {
      email:    DEFAULT_ADMIN.email,
      username: DEFAULT_ADMIN.username,
      fullname: DEFAULT_ADMIN.fullname,
      role:     'admin'
    };
  }
  return null;
}

/**
 * Authenticate a student against the registered users store.
 * @param {string} email
 * @param {string} password
 * @returns {Object|null}
 */
function authenticateStudent(email, password) {
  const student = findStudentByEmail(email);
  if (!student) return null;
  if (student.password !== hashPassword(password)) return null;
  return {
    email:      student.email,
    username:   student.username,
    fullname:   student.fullname,
    department: student.department || '',
    role:       'student',
    createdAt:  student.createdAt
  };
}
