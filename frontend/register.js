/**
 * EduPortal — register.js
 * Handles student registration: validation, password strength, department, and saving.
 */

'use strict';

/* ============================================================
   CONSTANTS
   ============================================================ */

const STRENGTH_LEVELS = [
  { label: 'Very Weak', color: '#ef4444', width: '20%' },
  { label: 'Weak',      color: '#f97316', width: '40%' },
  { label: 'Fair',      color: '#f59e0b', width: '60%' },
  { label: 'Strong',    color: '#22c55e', width: '80%' },
  { label: 'Very Strong', color: '#10b981', width: '100%' }
];

/* ============================================================
   INITIALIZATION
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  redirectIfAuthenticated();

  const form = document.getElementById('register-form');
  if (form) form.addEventListener('submit', handleRegister);

  const passInput = document.getElementById('reg-password');
  if (passInput) passInput.addEventListener('input', () => {
    updatePasswordStrength(passInput.value);
    updateProgress();
    if (passInput.classList.contains('error')) validateRegPassword();
  });

  setupRegisterListeners();
});

/* ============================================================
   PROGRESS BAR
   ============================================================ */

function updateProgress() {
  const fields = [
    document.getElementById('reg-fullname'),
    document.getElementById('reg-email'),
    document.getElementById('reg-username'),
    document.getElementById('reg-department'),
    document.getElementById('reg-password'),
    document.getElementById('reg-confirm'),
  ];

  const filled = fields.filter(f => f && f.value.trim().length > 0).length;
  const pct    = Math.round((filled / fields.length) * 100);

  const fill  = document.getElementById('progress-fill');
  const label = document.getElementById('progress-label');

  if (fill)  fill.style.width = `${pct}%`;
  if (label) label.textContent = `${pct}% Complete`;
}

/* ============================================================
   PASSWORD STRENGTH
   ============================================================ */

function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8)                        score++;
  if (password.length >= 12)                       score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password))                      score++;
  if (/[^A-Za-z0-9]/.test(password))               score++;
  return Math.min(score, 4);
}

function updatePasswordStrength(password) {
  const bar     = document.getElementById('pw-strength-fill');
  const label   = document.getElementById('pw-strength-label');
  const barWrap = document.getElementById('pw-strength-bar');

  if (!password) {
    if (bar)    { bar.style.width = '0%'; bar.style.background = ''; }
    if (label)  label.textContent = '';
    if (barWrap) barWrap.style.display = 'none';
    return;
  }

  if (barWrap) barWrap.style.display = 'block';

  const score = getPasswordStrength(password);
  const level = STRENGTH_LEVELS[score];

  if (bar) {
    bar.style.width      = level.width;
    bar.style.background = level.color;
  }
  if (label) {
    label.textContent = level.label;
    label.style.color = level.color;
  }
}

/* ============================================================
   FIELD VALIDATORS
   ============================================================ */

function validateFullName() {
  const input = document.getElementById('reg-fullname');
  const val   = input.value.trim();
  if (!val) {
    setFieldState(input, 'fullname-error', 'Full name is required.');
    return false;
  }
  if (val.length < 3) {
    setFieldState(input, 'fullname-error', 'Name must be at least 3 characters.');
    return false;
  }
  if (!/^[a-zA-Z\s'-]+$/.test(val)) {
    setFieldState(input, 'fullname-error', 'Name can only contain letters, spaces, hyphens, and apostrophes.');
    return false;
  }
  setFieldState(input, 'fullname-error', '');
  return true;
}

function validateRegEmail() {
  const input = document.getElementById('reg-email');
  const val   = input.value.trim();
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!val) {
    setFieldState(input, 'reg-email-error', 'Email address is required.');
    return false;
  }
  if (!regex.test(val)) {
    setFieldState(input, 'reg-email-error', 'Please enter a valid email address.');
    return false;
  }
  if (findStudentByEmail(val)) {
    setFieldState(input, 'reg-email-error', 'This email is already registered. Please login instead.');
    return false;
  }
  setFieldState(input, 'reg-email-error', '');
  return true;
}

function validateUsername() {
  const input = document.getElementById('reg-username');
  const val   = input.value.trim();
  if (!val) {
    setFieldState(input, 'username-error', 'Username is required.');
    return false;
  }
  if (val.length < 3) {
    setFieldState(input, 'username-error', 'Username must be at least 3 characters.');
    return false;
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(val)) {
    setFieldState(input, 'username-error', 'Username can only contain letters, numbers, underscores, hyphens, and dots.');
    return false;
  }
  if (findStudentByUsername(val)) {
    setFieldState(input, 'username-error', 'This username is already taken. Please choose another.');
    return false;
  }
  setFieldState(input, 'username-error', '');
  return true;
}

function validateDepartment() {
  const input = document.getElementById('reg-department');
  const val   = input.value;
  if (!val) {
    input.classList.add('error');
    input.classList.remove('success');
    const errorEl = document.getElementById('department-error');
    if (errorEl) errorEl.textContent = 'Please select your department.';
    return false;
  }
  input.classList.remove('error');
  input.classList.add('success');
  const errorEl = document.getElementById('department-error');
  if (errorEl) errorEl.textContent = '';
  return true;
}

function validateRegPassword() {
  const input = document.getElementById('reg-password');
  const val   = input.value;
  if (!val) {
    setFieldState(input, 'reg-password-error', 'Password is required.');
    return false;
  }
  if (val.length < 8) {
    setFieldState(input, 'reg-password-error', 'Password must be at least 8 characters.');
    return false;
  }
  if (!/[A-Z]/.test(val)) {
    setFieldState(input, 'reg-password-error', 'Password must contain at least one uppercase letter.');
    return false;
  }
  if (!/[0-9]/.test(val)) {
    setFieldState(input, 'reg-password-error', 'Password must contain at least one number.');
    return false;
  }
  setFieldState(input, 'reg-password-error', '');
  return true;
}

function validateConfirm() {
  const passInput = document.getElementById('reg-password');
  const confInput = document.getElementById('reg-confirm');
  if (!confInput.value) {
    setFieldState(confInput, 'confirm-error', 'Please confirm your password.');
    return false;
  }
  if (confInput.value !== passInput.value) {
    setFieldState(confInput, 'confirm-error', 'Passwords do not match.');
    return false;
  }
  setFieldState(confInput, 'confirm-error', '');
  return true;
}

function validateTerms() {
  const checkbox = document.getElementById('terms');
  const errorEl  = document.getElementById('terms-error');
  if (!checkbox.checked) {
    if (errorEl) errorEl.textContent = 'You must agree to the Terms of Service to continue.';
    return false;
  }
  if (errorEl) errorEl.textContent = '';
  return true;
}

/* ============================================================
   REAL-TIME LISTENERS
   ============================================================ */

function setupRegisterListeners() {
  const fields = [
    { id: 'reg-fullname',   validator: validateFullName     },
    { id: 'reg-email',      validator: validateRegEmail     },
    { id: 'reg-username',   validator: validateUsername     },
    { id: 'reg-password',   validator: validateRegPassword  },
    { id: 'reg-confirm',    validator: validateConfirm      },
  ];

  fields.forEach(({ id, validator }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('blur',  validator);
    el.addEventListener('input', () => {
      updateProgress();
      hideAlert();
      if (el.classList.contains('error')) validator();
    });
  });

  // Department select
  const deptEl = document.getElementById('reg-department');
  if (deptEl) {
    deptEl.addEventListener('change', () => {
      updateProgress();
      validateDepartment();
    });
  }

  // Confirm re-validates when password changes
  const passEl = document.getElementById('reg-password');
  if (passEl) passEl.addEventListener('input', () => {
    const confirmEl = document.getElementById('reg-confirm');
    if (confirmEl && confirmEl.value) validateConfirm();
  });
}

/* ============================================================
   REGISTRATION HANDLER
   ============================================================ */

async function handleRegister(e) {
  e.preventDefault();

  const valid = [
    validateFullName(),
    validateRegEmail(),
    validateUsername(),
    validateDepartment(),
    validateRegPassword(),
    validateConfirm(),
    validateTerms()
  ].every(Boolean);

  if (!valid) {
    showAlert('Please fix the errors above before continuing.', 'error');
    return;
  }

  const btn = document.getElementById('register-btn');
  setButtonLoading(btn, true);

  await new Promise(r => setTimeout(r, 1000));

  try {
    const newStudent = {
      fullname:   document.getElementById('reg-fullname').value.trim(),
      email:      document.getElementById('reg-email').value.trim().toLowerCase(),
      username:   document.getElementById('reg-username').value.trim().toLowerCase(),
      department: document.getElementById('reg-department').value,
      password:   hashPassword(document.getElementById('reg-password').value),
      role:       'student',
      createdAt:  Date.now()
    };

    saveStudent(newStudent);

    showAlert(`🎉 Account created successfully! Redirecting to login...`, 'success');
    setButtonLoading(btn, false, '✓ Account Created');

    setTimeout(() => {
      window.location.href = 'index.html?registered=true';
    }, 1500);

  } catch (err) {
    showAlert('An error occurred during registration. Please try again.', 'error');
    setButtonLoading(btn, false, 'Create Account');
  }
}
