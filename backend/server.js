'use strict';
/**
 * server.js  — EduPortal Express Backend
 *
 * Entry point. Loads env, configures middleware, mounts routes, starts listening.
 * Keep this file thin: configuration belongs in config/, routes in routes/.
 */
const path       = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express    = require('express');
const cors       = require('cors');
const morgan     = require('morgan');

const courseRoutes     = require('./routes/courseRoutes');
const studentRoutes    = require('./routes/studentRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const authRoutes       = require('./routes/authRoutes');
const { notFound, globalError } = require('./middleware/errorMiddleware');
const { checkDBHealth }         = require('./config/db');


const app  = express();
const PORT = process.env.PORT || 4000;
const isDev = process.env.NODE_ENV !== 'production';

// ── CORS ────────────────────────────────────────────────────────────────────
// In development, allow the Vite dev server (port 5173) by default.
// In production, restrict to origins listed in ALLOWED_ORIGINS env var.
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin "${origin}" is not allowed.`));
  },
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// ── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Request logging ──────────────────────────────────────────────────────────
app.use(morgan(isDev ? 'dev' : 'combined'));

// ── Root status endpoint ─────────────────────────────────────────────────────
app.get('/', (req, res) => {
  const db = checkDBHealth();
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8"/>
      <title>EduPortal Backend API</title>
      <style>
        body { font-family: sans-serif; max-width: 620px; margin: 60px auto; color: #1a1a2e; }
        h1   { color: #4361ee; }
        ul   { line-height: 2; }
        a    { color: #4361ee; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .badge { background: #e7ecff; color: #4361ee; border-radius: 12px;
                 padding: 1px 10px; font-size: 0.85rem; margin-left: 6px; }
        .ok   { color: #10b981; }
        .fail { color: #ef4444; }
        code  { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.9rem; }
      </style>
    </head>
    <body>
      <h1>&#127891; EduPortal Backend — port ${PORT}</h1>
      <p>Data store: <span class="${db.ok ? 'ok' : 'fail'}">${db.ok ? '&#10003; Healthy' : '&#10007; Error: ' + db.error}</span></p>
      ${db.ok ? `
      <p>Resources:</p>
      <ul>
        <li><a href="/courses">/courses</a>
            <span class="badge">${db.collections.courses} items</span></li>
        <li><a href="/students">/students</a>
            <span class="badge">${db.collections.students} items</span></li>
        <li><a href="/enrollments">/enrollments</a>
            <span class="badge">${db.collections.enrollments} items</span></li>
      </ul>` : ''}
      <p>Health check: <a href="/api/health"><code>/api/health</code></a></p>
    </body>
    </html>
  `);
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const db = checkDBHealth();
  res.status(db.ok ? 200 : 503).json({
    success:   db.ok,
    status:    db.ok ? 'healthy' : 'degraded',
    message:   db.ok ? 'EduPortal API is running.' : 'Data store is unreachable.',
    dataStore: db,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
// NOTE: We keep the existing flat paths (/courses, /students, /enrollments)
// so the React frontend (api.js baseURL http://localhost:4000) needs no changes.
// Task 9 & 10: Auth routes are mounted under /api/v1/auth.
app.use('/api/v1/auth',  authRoutes);
app.use('/courses',     courseRoutes);
app.use('/students',    studentRoutes);
app.use('/enrollments', enrollmentRoutes);

// ── Error handling (must be last) ─────────────────────────────────────────────
app.use(notFound);
app.use(globalError);

// ── Start ─────────────────────────────────────────────────────────────────────
function startServer(port = PORT) {
  return app.listen(port, () => {
    const line = '─'.repeat(50);
    console.log('\n' + line);
    console.log('  🎓  EduPortal Backend');
    console.log(line);
    console.log('  URL  : http://localhost:' + port);
    console.log('  ENV  : ' + (process.env.NODE_ENV || 'development'));
    console.log('');
    console.log('  GET  /courses');
    console.log('  GET  /students');
    console.log('  POST /students/login      (legacy)');
    console.log('  POST /api/v1/auth/register  (Task 9 — bcrypt + JWT)');
    console.log('  POST /api/v1/auth/login     (Task 9/10 — bcrypt + JWT)');
    console.log('  GET  /enrollments');
    console.log('  GET  /api/health');

    console.log(line + '\n');
  });
}

if (!process.env.TEST_MODE) {
  startServer();
}

module.exports = app;
module.exports.startServer = startServer;