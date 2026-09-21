import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/auth.css';

const EyeIcon = ({ open }) => open ? (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin-dashboard' : '/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Show registration success
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('registered') === 'true') {
      setAlert({ type: 'success', message: '🎉 Registration successful! You can now log in.' });
    }
  }, [location]);

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Please enter a valid email address.';
    if (!password) e.password = 'Password is required.';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters.';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);
    if (!validate()) return;
    setLoading(true);
    const result = await login(email.trim(), password, role, remember);
    setLoading(false);
    if (!result.success) {
      setAlert({ type: 'error', message: role === 'admin' ? 'Invalid admin credentials.' : 'Invalid email or password.' });
    } else {
      setAlert({ type: 'success', message: `Welcome back, ${result.user.fullname}! Redirecting...` });
      setTimeout(() => {
        navigate(role === 'admin' ? '/admin-dashboard' : '/dashboard', { replace: true });
      }, 600);
    }
  };

  return (
    <div className="auth-wrapper">
      {/* Brand Panel */}
      <div className="brand-panel">
        <div className="brand-content">
          <div className="brand-logo">
            <div className="logo-mark" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
            </div>
          </div>
          <h1 className="brand-title">EduPortal</h1>
          <p className="brand-tagline">Your gateway to smarter learning and seamless administration.</p>
          <ul className="brand-features">
            <li><span className="feat-icon">◆</span> Enroll in courses instantly</li>
            <li><span className="feat-icon">◆</span> Track your learning progress</li>
            <li><span className="feat-icon">◆</span> Manage students & courses</li>
            <li><span className="feat-icon">◆</span> Role-based access control</li>
          </ul>
          <div className="brand-stats">
            <div className="stat-item"><span className="stat-num">10+</span><span className="stat-label">Departments</span></div>
            <div className="stat-divider"/>
            <div className="stat-item"><span className="stat-num">100%</span><span className="stat-label">Progress Tracking</span></div>
            <div className="stat-divider"/>
            <div className="stat-item"><span className="stat-num">2</span><span className="stat-label">Roles</span></div>
          </div>
        </div>
      </div>

      {/* Auth Panel */}
      <div className="auth-panel">
        <div className="auth-card">
          {/* Role Toggle */}
          <div className="role-toggle" role="tablist">
            <button id="tab-student" role="tab" className={`role-btn${role === 'student' ? ' active' : ''}`} onClick={() => { setRole('student'); setErrors({}); setAlert(null); }} aria-selected={role === 'student'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/></svg>
              Student
            </button>
            <button id="tab-admin" role="tab" className={`role-btn${role === 'admin' ? ' active' : ''}`} onClick={() => { setRole('admin'); setErrors({}); setAlert(null); }} aria-selected={role === 'admin'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Admin
            </button>
            <div className={`toggle-slider${role === 'admin' ? ' admin-side' : ''}`} aria-hidden="true"/>
          </div>

          <div className="form-header">
            <h2 id="form-title" className="form-title">{role === 'student' ? 'Student Login' : 'Admin Login'}</h2>
            <p id="form-subtitle" className="form-subtitle">
              {role === 'student' ? 'Welcome back! Please enter your credentials.' : 'Restricted access. Authorized personnel only.'}
            </p>
          </div>

          {alert && <div className={`auth-alert ${alert.type}`} role="alert">{alert.message}</div>}

          <form id="login-form" className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="login-email" className="form-label">Email Address <span className="required">*</span></label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </span>
                <input id="login-email" type="email" className={`form-input${errors.email ? ' error' : email ? ' success' : ''}`} placeholder="you@university.edu" value={email} onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: '' })); }} autoComplete="email"/>
              </div>
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="login-password" className="form-label">Password <span className="required">*</span></label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <input id="login-password" type={showPw ? 'text' : 'password'} className={`form-input${errors.password ? ' error' : password ? ' success' : ''}`} placeholder="Enter your password" value={password} onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password: '' })); }} autoComplete="current-password"/>
                <button type="button" className="toggle-pw" onClick={() => setShowPw(s => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                  <EyeIcon open={showPw}/>
                </button>
              </div>
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            <div className="form-options">
              <label className="checkbox-label" onClick={() => setRemember(r => !r)}>
                <span className={`checkbox-custom${remember ? ' checked' : ''}`}/>
                Remember me
              </label>
              <Link to="/forgot-password" className="forgot-link">Forgot Password?</Link>
            </div>

            <button id="login-btn" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><div className="btn-spinner"/><span>Please wait...</span></> : <><span>Sign In</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>}
            </button>
          </form>

          {role === 'student' && (
            <>
              <div className="divider">or</div>
              <div className="register-cta">
                <p>Don't have an account? <Link to="/register" className="register-link">Create one free</Link></p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
