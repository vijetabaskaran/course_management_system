import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setSubmitted(true);
  };

  return (
    <div className="auth-wrapper">
      <div className="brand-panel">
        <div className="brand-content">
          <div className="brand-logo">
            <div className="logo-mark">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
          </div>
          <h1 className="brand-title">Reset Password</h1>
          <p className="brand-tagline">We'll help you get back into your account securely.</p>
          <ul className="brand-features">
            <li><span className="feat-icon">◆</span> Enter your registered email</li>
            <li><span className="feat-icon">◆</span> Receive a reset confirmation</li>
            <li><span className="feat-icon">◆</span> Set a new secure password</li>
            <li><span className="feat-icon">◆</span> Regain full account access</li>
          </ul>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-card">
          {!submitted ? (
            <>
              <div className="form-header">
                <h2 className="form-title">Forgot Password?</h2>
                <p className="form-subtitle">Enter your email and we'll send you reset instructions.</p>
              </div>
              <form className="auth-form" onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                  <label htmlFor="forgot-email" className="form-label">Email Address <span className="required">*</span></label>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </span>
                    <input id="forgot-email" type="email" className={`form-input${error ? ' error' : ''}`} placeholder="you@university.edu" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} autoComplete="email"/>
                  </div>
                  {error && <span className="field-error">{error}</span>}
                </div>
                <button type="submit" className="btn btn-primary">
                  <span>Send Reset Instructions</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              </form>
              <div className="divider">remembered it?</div>
              <div className="register-cta"><p><Link to="/" className="register-link">Back to Sign In</Link></p></div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📬</div>
              <h2 className="form-title">Check Your Email</h2>
              <p className="form-subtitle" style={{ marginBottom: '1.5rem' }}>
                If <strong>{email}</strong> is registered, you'll receive reset instructions shortly.
              </p>
              <div className="auth-alert success" role="alert">
                This is a demo — no actual email is sent. Please return to login.
              </div>
              <div style={{ marginTop: '1.5rem' }}>
                <Link to="/" className="register-link">← Back to Sign In</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
