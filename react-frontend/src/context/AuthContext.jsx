import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSession, createSession, destroySession, authenticateAdmin, authenticateStudent } from '../services/storage';

const AuthContext = createContext(null);

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
    if (role === 'admin') authenticated = authenticateAdmin(email, password);
    else authenticated = authenticateStudent(email, password);
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
