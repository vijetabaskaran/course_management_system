import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSession, createSession, destroySession, authenticateAdmin } from '../services/storage';
import api, { loginStudent } from '../services/api';

const AuthContext = createContext(null);

/**
 * Authenticate a student via the Task 10 JWT endpoint.
 *
 * On success:
 *  1. Stores the JWT in sessionStorage["token"] (required by Task 10 spec).
 *     Note: sessionStorage is accessible to JS and is not XSS-safe; a
 *     HttpOnly cookie would be more secure in production. The assignment
 *     explicitly requires sessionStorage.
 *  2. Returns a safe user object (no password, no hash).
 *
 * On failure:
 *  Falls back to the legacy /students/login endpoint so that existing
 *  students registered before the JWT migration can still log in.
 */
async function authenticateStudentJWT(email, password) {
  try {
    const data = await loginStudent({ email, password });
    // data = { message, token, tokenType, expiresIn, student }
    if (data && data.token && data.student) {
      // Store JWT in sessionStorage (Task 10 requirement)
      sessionStorage.setItem('token', data.token);
      const student = data.student;
      return {
        email:      student.email,
        username:   student.username || student.email.split('@')[0],
        fullname:   student.fullname,
        department: student.department || '',
        role:       'student',
        createdAt:  student.createdAt,
      };
    }
  } catch (jwtErr) {
    // If JWT login fails with 400/401, try legacy endpoint
    if (
      jwtErr.response &&
      (jwtErr.response.status === 401 || jwtErr.response.status === 400)
    ) {
      // Fall through to legacy endpoint below
    } else if (jwtErr.response) {
      // Other HTTP error — propagate
      return null;
    }
    // Network error or server config error — try legacy
  }

  // ── Legacy fallback: /students/login (existing djb2+btoa students) ──────────
  try {
    const res = await api.post('/students/login', { email, password });
    if (res.data && res.data.student) {
      // Legacy login doesn't return a JWT; clear any stale token
      sessionStorage.removeItem('token');
      const student = res.data.student;
      return {
        email:      student.email,
        username:   student.username,
        fullname:   student.fullname,
        department: student.department || '',
        role:       'student',
        createdAt:  student.createdAt,
      };
    }
  } catch (legacyErr) {
    if (
      legacyErr.response &&
      (legacyErr.response.status === 401 || legacyErr.response.status === 400)
    ) {
      return null;
    }
    // Network / server error
    return null;
  }
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const session = getSession();
    if (session) setUser(session.user);
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password, role, remember = false) => {
    await new Promise(r => setTimeout(r, 600));
    let authenticated = null;
    try {
      if (role === 'admin') {
        // Validate admin credentials client-side (existing behaviour)
        authenticated = authenticateAdmin(email, password);
        if (authenticated) {
          // Also get a JWT from the backend so admin can call protected course write routes
          try {
            const res = await api.post('/api/v1/auth/admin-login', { email, password });
            if (res.data && res.data.token) {
              sessionStorage.setItem('token', res.data.token);
            }
          } catch {
            // Non-fatal: admin dashboard still works without JWT for read operations
            sessionStorage.removeItem('token');
          }
        }
      } else {
        authenticated = await authenticateStudentJWT(email, password);
      }
    } catch (err) {
      console.error('Login failed — is the backend running on port 4000?', err);
      return { success: false };
    }
    if (!authenticated) return { success: false };
    createSession(authenticated, remember);
    setUser(authenticated);
    return { success: true, user: authenticated };
  }, []);

  const logout = useCallback(() => {
    // Remove JWT from sessionStorage (Task 10)
    sessionStorage.removeItem('token');
    // Remove session from localStorage
    destroySession();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
