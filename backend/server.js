'use strict';
/**
 * server.js  — EduPortal Express Backend (MongoDB/Mongoose + Socket.IO edition)
 *
 * Entry point. Loads env, connects to MongoDB, configures middleware,
 * mounts routes, attaches Socket.IO, starts listening.
 * Keep this file thin: configuration belongs in config/, routes in routes/.
 */
const path = require('path');
const http = require('http');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');

const { connectDB, checkDBHealth, disconnectDB } = require('./config/mongoose');
const { initSocket, closeSocket, getIO } = require('./socket/socketServer');

const courseRoutes           = require('./routes/courseRoutes');
const studentRoutes          = require('./routes/studentRoutes');
const enrollmentRoutes       = require('./routes/enrollmentRoutes');
const authRoutes             = require('./routes/authRoutes');
const learningProgressRoutes = require('./routes/learningProgressRoutes');
const messageRoutes          = require('./routes/messageRoutes');
const { notFound, globalError } = require('./middleware/errorMiddleware');

const app  = express();
const PORT = process.env.PORT || 4000;
const isDev = process.env.NODE_ENV !== 'production';

// ── Security Headers (Activity 14.5) ─────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// ── CORS (Activity 14.1 & 13.4) ──────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, callback) => {
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

// ── Request logging (Activity 14.8) ──────────────────────────────────────────
app.use(morgan(isDev ? 'dev' : 'combined'));

// ── Root status endpoint ─────────────────────────────────────────────────────
app.get('/', async (req, res) => {
  const db = await checkDBHealth();
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
      <p>Data store: <strong>MongoDB</strong> <span class="${db.ok ? 'ok' : 'fail'}">${db.ok ? '&#10003; Healthy' : '&#10007; Error: ' + db.error}</span></p>
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
app.get('/api/health', async (req, res) => {
  const db = await checkDBHealth();
  res.status(db.ok ? 200 : 503).json({
    success:     db.ok,
    status:      db.ok ? 'healthy' : 'degraded',
    message:     db.ok ? 'EduPortal API is running.' : 'Database is unreachable.',
    dataStore:   db,
    database:    'MongoDB',
    timestamp:   new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    socket:      'enabled',
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/auth',        authRoutes);
app.use('/api/v1/enrollments', enrollmentRoutes);
app.use('/api/v1/progress',    learningProgressRoutes);
app.use('/api/v1/messages',    messageRoutes);
app.use('/api/v1/courses',     courseRoutes);
app.use('/api/v1/students',    studentRoutes);
app.use('/courses',            courseRoutes);
app.use('/students',           studentRoutes);
app.use('/enrollments',        enrollmentRoutes);
app.use('/progress',           learningProgressRoutes);

// ── Error handling (must be last) ─────────────────────────────────────────────
app.use(notFound);
app.use(globalError);

// ── Create HTTP Server & Attach Socket.IO (Activities 13.2 & 13.3) ────────────
const httpServer = http.createServer(app);
initSocket(httpServer);

let activeServer = null;

// ── Start ─────────────────────────────────────────────────────────────────────
async function startServer(port = PORT) {
  // Connect to MongoDB FIRST — if this fails, the server does NOT start.
  await connectDB();

  activeServer = httpServer.listen(port, () => {
    const line = '─'.repeat(50);
    console.log('\n' + line);
    console.log('  🎓  EduPortal Backend (HTTP + Socket.IO)');
    console.log(line);
    console.log('  URL      : http://localhost:' + port);
    console.log('  ENV      : ' + (process.env.NODE_ENV || 'development'));
    console.log('  Database : MongoDB (Mongoose)');
    console.log('  Realtime : Socket.IO enabled');
    console.log('');
    console.log('  GET  /courses');
    console.log('  GET  /students');
    console.log('  POST /api/v1/auth/register');
    console.log('  POST /api/v1/auth/login');
    console.log('  GET  /api/v1/enrollments/my-courses');
    console.log('  GET  /api/v1/progress/my-progress');
    console.log('  GET  /api/v1/messages/contacts');
    console.log('  GET  /api/health');
    console.log(line + '\n');
  });

  return activeServer;
}

if (!process.env.TEST_MODE) {
  startServer().catch(err => {
    console.error('  FATAL: Server failed to start:', err.message);
    process.exit(1);
  });
}

// ── Process Error Handling & Graceful Shutdown (Activities 14.10 & 13.3) ──────
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
  closeSocket();
  disconnectDB().finally(() => {
    process.exit(1);
  });
});

async function shutdownGracefully(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  closeSocket();
  if (activeServer) {
    activeServer.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  } else {
    await disconnectDB();
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdownGracefully('SIGTERM'));
process.on('SIGINT', () => shutdownGracefully('SIGINT'));

module.exports = app;
module.exports.httpServer = httpServer;
module.exports.startServer = startServer;
module.exports.getIO = getIO;
module.exports.closeSocket = closeSocket;
