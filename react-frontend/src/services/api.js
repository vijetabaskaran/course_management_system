import axios from "axios";

/**
 * Shared Axios instance for EduPortal backend.
 * Base URL: VITE_API_URL env var, falls back to http://localhost:4000
 *
 * NOTE: sessionStorage["token"] is used to store JWTs as required by the
 * Task 10 assignment specification. sessionStorage is cleared when the browser
 * tab is closed, reducing persistent exposure compared to localStorage.
 * It is still accessible to JavaScript on the page, so it is NOT safe from
 * XSS. A HttpOnly cookie would be more secure in a production application,
 * but the assignment explicitly requires sessionStorage.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000",
});

// ── Request interceptor: attach JWT to protected requests ─────────────────────
// The token is read fresh from sessionStorage on every request so that
// a logout (which removes the token) is immediately effective.
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: surface meaningful backend error messages ───────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Preserve the original Axios error so callers can inspect .response.data
    return Promise.reject(error);
  }
);

// ── Auth API helpers (Task 9 & 10) ────────────────────────────────────────────

/**
 * Register a new student via POST /api/v1/auth/register.
 * @param {{ fullname, email, department, password, username? }} studentData
 * @returns {Promise<{ message, token, tokenType, expiresIn, student }>}
 */
export async function registerStudent(studentData) {
  const res = await api.post("/api/v1/auth/register", studentData);
  return res.data;
}

/**
 * Log in a student via POST /api/v1/auth/login.
 * @param {{ email, password }} credentials
 * @returns {Promise<{ message, token, tokenType, expiresIn, student }>}
 */
export async function loginStudent(credentials) {
  const res = await api.post("/api/v1/auth/login", credentials);
  return res.data;
}

export default api;