'use strict';
/**
 * config/db.js
 * Centralised JSON-file data access layer.
 * All reads and writes go through these two functions so the rest of the
 * codebase never touches fs directly.
 *
 * Limitation: writeDB() is synchronous and not atomic. Concurrent requests
 * that both read-then-write can produce a race condition. For this single-user
 * development application that risk is acceptable; document it clearly rather
 * than hide it.
 */
const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

/** Read and parse the JSON data file. Throws on parse failure. */
function readDB() {
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  return JSON.parse(raw);
}

/** Serialise and persist the data object. */
function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

/** Verify the data file is readable and returns expected collections. */
function checkDBHealth() {
  try {
    const db = readDB();
    return {
      ok: true,
      collections: {
        courses:     Array.isArray(db.courses)     ? db.courses.length     : 'missing',
        students:    Array.isArray(db.students)    ? db.students.length    : 'missing',
        enrollments: Array.isArray(db.enrollments) ? db.enrollments.length : 'missing',
      },
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { readDB, writeDB, checkDBHealth };