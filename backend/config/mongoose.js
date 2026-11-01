'use strict';
/**
 * config/mongoose.js
 * MongoDB connection module using Mongoose.
 *
 * Reads MONGODB_URI from environment variables.
 * Connects once at server startup; never creates repeated connections per request.
 * Handles connection failures gracefully and stops server startup on failure.
 *
 * Usage:
 *   const { connectDB, disconnectDB } = require('./config/mongoose');
 *   await connectDB(); // call before starting the Express server
 */
const mongoose = require('mongoose');
const path     = require('path');

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/studentportal';

/**
 * Establish connection to MongoDB.
 * Throws if the connection cannot be established within the timeout.
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI || MONGODB_URI;

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // fail fast if MongoDB is not reachable
    });

    const db = mongoose.connection;
    console.log('');
    console.log('  ✅  MongoDB connected successfully');
    console.log(`  📦  Database : ${db.name}`);
    console.log(`  🔗  Host     : ${db.host}:${db.port}`);
    console.log('');

    // Log connection events for operational visibility
    db.on('disconnected', () =>
      console.warn('  ⚠️   MongoDB disconnected.')
    );
    db.on('error', (err) =>
      console.error('  ❌  MongoDB connection error:', err.message)
    );

    return db;
  } catch (err) {
    console.error('\n  ❌  FATAL: Failed to connect to MongoDB.');
    console.error(`  URI     : ${uri.replace(/\/\/.*@/, '//<credentials>@')}`);
    console.error(`  Reason  : ${err.message}`);
    console.error('');
    console.error('  Troubleshooting:');
    console.error('  1. Make sure MongoDB Community Server is running.');
    console.error('     Windows: net start MongoDB');
    console.error('     Or start it manually: mongod --config "C:\\Program Files\\MongoDB\\Server\\8.3\\bin\\mongod.cfg"');
    console.error('  2. Verify the MONGODB_URI in backend/.env is correct.');
    console.error('  3. Check that port 27017 is not blocked by a firewall.\n');
    // IMPORTANT: Stop server startup — never fall back silently to JSON
    throw err;
  }
}

/**
 * Close the MongoDB connection cleanefully (e.g. on process shutdown).
 */
async function disconnectDB() {
  try {
    await mongoose.disconnect();
    console.log('  MongoDB disconnected cleanly.');
  } catch (err) {
    console.error('  Error disconnecting MongoDB:', err.message);
  }
}

/**
 * Return the raw mongoose.connection for health checks.
 */
function getConnection() {
  return mongoose.connection;
}

/**
 * Health check — returns an object compatible with the existing server.js health endpoint.
 * Replaces checkDBHealth() from config/db.js.
 */
async function checkDBHealth() {
  const state = mongoose.connection.readyState;
  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  if (state !== 1) {
    return {
      ok: false,
      error: `MongoDB connection state: ${['disconnected', 'connected', 'connecting', 'disconnecting'][state] || state}`,
    };
  }

  try {
    // Count documents in each collection
    const db = mongoose.connection.db;
    const [users, courses, enrollments, learningProgress] = await Promise.all([
      db.collection('users').countDocuments().catch(() => 'error'),
      db.collection('courses').countDocuments().catch(() => 'error'),
      db.collection('enrollments').countDocuments().catch(() => 'error'),
      db.collection('learningprogress').countDocuments().catch(() => 0),
    ]);

    return {
      ok: true,
      collections: {
        students:         users,
        courses,
        enrollments,
        learningProgress,
      },
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { connectDB, disconnectDB, getConnection, checkDBHealth };

