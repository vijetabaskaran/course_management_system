import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSession, createSession, destroySession, authenticateAdmin } from '../services/storage';
import api, { loginStudent } from '../services/api';
import { connectSocket, disconnectSocket } from '../api/socketClient';

const AuthContext = createContext(null);

/**
 * Authenticate a student via the Task 10/11 JWT endpoint.
 *
 * On success:
 *  1. Stores the JWT in sessionStorage["token"] (Task 10 requirement).
 *  2. Stores the verified role in sessionStorage["role"] (Task 11 RBAC requirement).
 *  3. Returns a safe user object (no password, no hash).
 *
 * On failure:
 *  Falls back to the legacy /students/login endpoint so that existing
 *  students registered before the JWT migration can still log in.
 */
async function authenticateStudentJWT(email, password) {
  try {
    const data = await loginStudent({ email, password });
    // data = { message, token, tokenType, expiresIn, student?, user?, role? }
    if (data && data.token) {
      sessionStorage.setItem('token', data.token);
      localStorage.setItem('token', data.token);
      const account = data.student || data.user || {};
      const verifiedRole = data.role || account.role || 'student';
      sessionStorage.setItem('role', verifiedRole);
      return {
        id:         account.id || account.legacyId || account._id,
        _id:        account._id ? String(account._id) : undefined,
        legacyId:   account.legacyId,
        email:      account.email || email,
        username:   account.username || (account.email ? account.email.split('@')[0] : email.split('@')[0]),
        fullname:   account.fullname || 'Student',
        department: account.department || '',
        role:       verifiedRole,
        createdAt:  account.createdAt || Date.now(),
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
  }

  // ── Legacy fallback: /students/login (existing djb2+btoa students) ──────────
  try {
    const res = await api.post('/students/login', { email, password });
    if (res.data && res.data.student) {
      if (res.data.token) {
        sessionStorage.setItem('token', res.data.token);
        localStorage.setItem('token', res.data.token);
      }
      const student = res.data.student;
      const verifiedRole = res.data.role || student.role || 'student';
      sessionStorage.setItem('role', verifiedRole);
      return {
        id:         student.id || student.legacyId || student._id,
        _id:        student._id ? String(student._id) : undefined,
        legacyId:   student.legacyId,
        email:      student.email,
        username:   student.username,
        fullname:   student.fullname,
        department: student.department || '',
        role:       verifiedRole,
        createdAt:  student.createdAt,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount (and sync sessionStorage role)
  useEffect(() => {
    const session = getSession();
    if (session && session.user) {
      setUser(session.user);
      if (session.user.role) {
        sessionStorage.setItem('role', session.user.role);
      }
      connectSocket();
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password, role, remember = false) => {
    await new Promise(r => setTimeout(r, 600));
    let authenticated = null;
    try {
      if (role === 'admin') {
        // 1. Try unified backend login endpoint (/api/v1/auth/login)
        try {
          const res = await api.post('/api/v1/auth/login', { email, password });
          const data = res.data;
          const account = data.user || data.student || {};
          const verifiedRole = data.role || account.role;
          if (data && data.token && verifiedRole === 'admin') {
            sessionStorage.setItem('token', data.token);
            localStorage.setItem('token', data.token);
            sessionStorage.setItem('role', 'admin');
            authenticated = {
              id:         account.id || account.legacyId || account._id || 'admin-1',
              _id:        account._id ? String(account._id) : undefined,
              legacyId:   account.legacyId,
              email:      account.email || email,
              username:   account.username || 'admin',
              fullname:   account.fullname || 'Administrator',
              role:       'admin',
              createdAt:  account.createdAt || Date.now(),
            };
          }
        } catch {
          // If /api/v1/auth/login fails, attempt admin-login endpoint
        }

        // 2. Try /api/v1/auth/admin-login endpoint
        if (!authenticated) {
          try {
            const res = await api.post('/api/v1/auth/admin-login', { email, password });
            const data = res.data;
            if (data && data.token) {
              sessionStorage.setItem('token', data.token);
              localStorage.setItem('token', data.token);
              const account = data.user || data.student || {};
              const verifiedRole = data.role || account.role || 'admin';
              sessionStorage.setItem('role', verifiedRole);
              authenticated = {
                id:         account.id || account.legacyId || account._id || 'admin-1',
                _id:        account._id ? String(account._id) : undefined,
                legacyId:   account.legacyId,
                email:      account.email || email,
                username:   account.username || 'admin',
                fullname:   account.fullname || 'Administrator',
                role:       verifiedRole,
                createdAt:  account.createdAt || Date.now(),
              };
            }
          } catch {
            // 3. Fallback: validate admin credentials client-side if offline
            const clientAdmin = authenticateAdmin(email, password);
            if (clientAdmin) {
              authenticated = clientAdmin;
              sessionStorage.setItem('role', 'admin');
            }
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
    connectSocket();
    return { success: true, user: authenticated };
  }, []);

  const logout = useCallback(() => {
    disconnectSocket();
    // Remove JWT and role from sessionStorage (Task 10 & 11) and localStorage
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    localStorage.removeItem('token');
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
