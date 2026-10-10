import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSession, createSession, destroySession, authenticateAdmin, hashPassword } from '../services/storage';
import api from '../services/api';

const AuthContext = createContext(null);

// Student login: check the students stored in db.json (mock API)
async function authenticateStudentFromApi(email, password) {
  const { data: students } = await api.get('/students');
  const student = students.find(s => s.email.toLowerCase() === email.toLowerCase());
  if (!student) return null;
  if (student.password !== hashPassword(password)) return null;
  return {
    email: student.email,
    username: student.username,
    fullname: student.fullname,
    department: student.department || '',
    role: 'student',
    createdAt: student.createdAt,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (session) setUser(session.user);
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password, role, remember = false) => {
    await new Promise(r => setTimeout(r, 600));
    let authenticated = null;
    try {
      if (role === 'admin') authenticated = authenticateAdmin(email, password); // admin stays hardcoded
      else authenticated = await authenticateStudentFromApi(email, password);
    } catch (err) {
      console.error('Login failed - is the backend running on port 4000?', err);
      return { success: false };
    }
    if (!authenticated) return { success: false };
    createSession(authenticated, remember);
    setUser(authenticated);
    return { success: true, user: authenticated };
  }, []);

  const logout = useCallback(() => {
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
