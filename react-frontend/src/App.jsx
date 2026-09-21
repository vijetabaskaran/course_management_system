import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';

/** Redirect already-authenticated users away from auth pages */
function AuthRedirect({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={user.role === 'admin' ? '/admin-dashboard' : '/dashboard'} replace/>;
  return children;
}

/** Guard dashboard routes */
function PrivateRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/" replace/>;
  if (user.role !== requiredRole) return <Navigate to="/" replace/>;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/"               element={<AuthRedirect><Login/></AuthRedirect>}/>
      <Route path="/login"          element={<Navigate to="/" replace/>}/>
      <Route path="/register"       element={<AuthRedirect><Register/></AuthRedirect>}/>
      <Route path="/forgot-password" element={<AuthRedirect><ForgotPassword/></AuthRedirect>}/>

      {/* Student */}
      <Route path="/dashboard" element={
        <PrivateRoute requiredRole="student"><StudentDashboard/></PrivateRoute>
      }/>

      {/* Admin */}
      <Route path="/admin-dashboard" element={
        <PrivateRoute requiredRole="admin"><AdminDashboard/></PrivateRoute>
      }/>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes/>
      </AuthProvider>
    </BrowserRouter>
  );
}
