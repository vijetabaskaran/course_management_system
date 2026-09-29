import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hashPassword } from '../services/storage';
import api from '../services/api';
import { useCourses } from '../context/CourseContext';
import '../styles/auth.css';

const DEPARTMENTS = [
  'Computer Science','Software Engineering','Information Technology',
  'Electrical Engineering','Mechanical Engineering','Business Administration',
  'Mathematics','Physics','Chemistry','Economics',
];

const STRENGTH_LEVELS = [
  { label: 'Very Weak', color: '#ef4444' },
  { label: 'Weak',      color: '#f97316' },
  { label: 'Fair',      color: '#f59e0b' },
  { label: 'Strong',    color: '#22c55e' },
  { label: 'Very Strong', color: '#10b981' },
];

function getStrength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}

export default function Register() {
  const { user } = useAuth();
  const { addStudent } = useCourses();
  const navigate = useNavigate();

  const [form, setForm] = useState({ fullname: '', email: '', username: '', department: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [terms, setTerms] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [strength, setStrength] = useState(-1);

  useEffect(() => { if (user) navigate(user.role === 'admin' ? '/admin-dashboard' : '/dashboard', { replace: true }); }, [user, navigate]);

  const filled = Object.values(form).filter(v => v.trim()).length;
  const progress = Math.round((filled / Object.keys(form).length) * 100);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }));
    if (k === 'password') setStrength(v ? getStrength(v) : -1);
  };

  const validateAll = async () => {
    // always check against the latest students stored in db.json
    const { data: existingStudents } = await api.get('/students');
    const e = {};
    const { fullname, email, username, department, password, confirm } = form;
    if (!fullname.trim()) e.fullname = 'Full name is required.';
    else if (fullname.trim().length < 3) e.fullname = 'Name must be at least 3 characters.';
    else if (!/^[a-zA-Z\s'-]+$/.test(fullname.trim())) e.fullname = 'Name can only contain letters, spaces, hyphens, and apostrophes.';

    if (!email.trim()) e.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Please enter a valid email address.';
    else if (existingStudents.some(s => s.email.toLowerCase() === email.trim().toLowerCase())) e.email = 'This email is already registered. Please login instead.';

    if (!username.trim()) e.username = 'Username is required.';
    else if (username.length < 3) e.username = 'Username must be at least 3 characters.';
    else if (!/^[a-zA-Z0-9_.-]+$/.test(username)) e.username = 'Username can only contain letters, numbers, underscores, hyphens, and dots.';
    else if (existingStudents.some(s => s.username.toLowerCase() === username.trim().toLowerCase())) e.username = 'This username is already taken.';

    if (!department) e.department = 'Please select your department.';
    if (!password) e.password = 'Password is required.';
    else if (password.length < 8) e.password = 'Password must be at least 8 characters.';
    else if (!/[A-Z]/.test(password)) e.password = 'Password must contain at least one uppercase letter.';
    else if (!/[0-9]/.test(password)) e.password = 'Password must contain at least one number.';

    if (!confirm) e.confirm = 'Please confirm your password.';
    else if (confirm !== password) e.confirm = 'Passwords do not match.';
    if (!terms) e.terms = 'You must agree to the Terms of Service.';

    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);
    setLoading(true);
    let valid = false;
    try {
      valid = await validateAll();
    } catch {
      setLoading(false);
      setAlert({ type: 'error', message: 'Cannot reach the server. Make sure the mock API is running (npm start in mock-api).' });
      return;
    }
    if (!valid) { setLoading(false); setAlert({ type: 'error', message: 'Please fix the errors above.' }); return; }
    await new Promise(r => setTimeout(r, 900));
    try {
      await addStudent({
        fullname:  form.fullname.trim(),
        email:     form.email.trim().toLowerCase(),
        username:  form.username.trim().toLowerCase(),
        department: form.department,
        password:  hashPassword(form.password),
        role:      'student',
        createdAt: Date.now(),
      });
      setAlert({ type: 'success', message: '🎉 Account created! Redirecting to login...' });
      setTimeout(() => navigate('/?registered=true', { replace: true }), 1400);
    } catch {
      setAlert({ type: 'error', message: 'An error occurred. Please try again.' });
    }
    setLoading(false);
  };

  const EyeIcon = ({ open }) => open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
  );

  return (
    <div className="auth-wrapper">
      <div className="brand-panel">
        <div className="brand-content">
          <div className="brand-logo">
            <div className="logo-mark"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div>
          </div>
          <h1 className="brand-title">Join EduPortal</h1>
          <p className="brand-tagline">Start your journey with a smarter, more connected learning experience.</p>
          <div className="brand-steps">
            <p className="steps-title">How it works</p>
            <div className="step-item"><span className="step-num">1</span>Create your account</div>
            <div className="step-item"><span className="step-num">2</span>Browse available courses</div>
            <div className="step-item"><span className="step-num">3</span>Enroll &amp; start learning</div>
            <div className="step-item"><span className="step-num">4</span>Track your progress</div>
          </div>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-card wide">
          <div className="reg-progress-bar"><div className="reg-progress-fill" style={{ width: `${progress}%` }}/></div>
          <p className="reg-progress-label">{progress}% Complete</p>

          <div className="form-header">
            <span className="register-badge">New Student</span>
            <h2 className="form-title">Create Your Account</h2>
            <p className="form-subtitle">Join thousands of students already learning.</p>
          </div>

          {alert && <div className={`auth-alert ${alert.type}`} role="alert">{alert.message}</div>}

          <form id="register-form" className="auth-form" onSubmit={handleSubmit} noValidate>
            {/* Full Name */}
            <div className="form-group">
              <label className="form-label">Full Name <span className="required">*</span></label>
              <div className="input-wrapper">
                <span className="input-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
                <input id="reg-fullname" type="text" className={`form-input${errors.fullname ? ' error' : ''}`} placeholder="John Doe" value={form.fullname} onChange={e => set('fullname', e.target.value)}/>
              </div>
              {errors.fullname && <span className="field-error">{errors.fullname}</span>}
            </div>
            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email Address <span className="required">*</span></label>
              <div className="input-wrapper">
                <span className="input-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span>
                <input id="reg-email" type="email" className={`form-input${errors.email ? ' error' : ''}`} placeholder="you@university.edu" value={form.email} onChange={e => set('email', e.target.value)}/>
              </div>
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>
            {/* Username */}
            <div className="form-group">
              <label className="form-label">Username <span className="required">*</span></label>
              <div className="input-wrapper">
                <span className="input-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg></span>
                <input id="reg-username" type="text" className={`form-input${errors.username ? ' error' : ''}`} placeholder="johndoe123" value={form.username} onChange={e => set('username', e.target.value)}/>
              </div>
              {errors.username && <span className="field-error">{errors.username}</span>}
            </div>
            {/* Department */}
            <div className="form-group">
              <label className="form-label">Department <span className="required">*</span></label>
              <div className="select-wrapper">
                <select id="reg-department" className={`form-select${errors.department ? ' error' : ''}`} value={form.department} onChange={e => set('department', e.target.value)}>
                  <option value="">Select your department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <span className="select-chevron"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg></span>
              </div>
              {errors.department && <span className="field-error">{errors.department}</span>}
            </div>
            {/* Password */}
            <div className="form-group">
              <label className="form-label">Password <span className="required">*</span></label>
              <div className="input-wrapper">
                <span className="input-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                <input id="reg-password" type={showPw ? 'text' : 'password'} className={`form-input${errors.password ? ' error' : ''}`} placeholder="Min 8 chars, uppercase & number" value={form.password} onChange={e => set('password', e.target.value)}/>
                <button type="button" className="toggle-pw" onClick={() => setShowPw(s => !s)}><EyeIcon open={showPw}/></button>
              </div>
              {form.password && (
                <>
                  <div id="pw-strength-bar" className="pw-strength"><div id="pw-strength-fill" className="pw-strength-fill" style={{ width: `${(strength + 1) * 20}%`, background: STRENGTH_LEVELS[strength]?.color }}/></div>
                  <span id="pw-strength-label" className="pw-strength-label" style={{ color: STRENGTH_LEVELS[strength]?.color }}>{STRENGTH_LEVELS[strength]?.label}</span>
                </>
              )}
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>
            {/* Confirm */}
            <div className="form-group">
              <label className="form-label">Confirm Password <span className="required">*</span></label>
              <div className="input-wrapper">
                <span className="input-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                <input id="reg-confirm" type={showConf ? 'text' : 'password'} className={`form-input${errors.confirm ? ' error' : ''}`} placeholder="Re-enter your password" value={form.confirm} onChange={e => set('confirm', e.target.value)}/>
                <button type="button" className="toggle-pw" onClick={() => setShowConf(s => !s)}><EyeIcon open={showConf}/></button>
              </div>
              {errors.confirm && <span className="field-error">{errors.confirm}</span>}
            </div>
            {/* Terms */}
            <div className="form-group">
              <label className="checkbox-label" onClick={() => setTerms(t => !t)}>
                <span className={`checkbox-custom${terms ? ' checked' : ''}`}/>
                I agree to the <a href="#" className="inline-link" onClick={e => e.stopPropagation()}>Terms of Service</a> and <a href="#" className="inline-link" onClick={e => e.stopPropagation()}>Privacy Policy</a>
              </label>
              {errors.terms && <span className="field-error">{errors.terms}</span>}
            </div>

            <button id="register-btn" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><div className="btn-spinner"/><span>Creating Account...</span></> : <><span>Create Account</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>}
            </button>
          </form>

          <div className="divider">already have an account?</div>
          <div className="register-cta"><p><Link to="/" className="register-link">Sign In</Link></p></div>
        </div>
      </div>
    </div>
  );
}
