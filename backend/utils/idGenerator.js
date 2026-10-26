'use strict';

/**
 * Generate a short alphanumeric ID (11 chars, same style as json-server).
 * Not cryptographically secure - fine for local JSON-file storage.
 */
function newId() {
  return Math.random().toString(36).slice(2, 13);
}

/**
 * Generate a prefixed course ID: CRS-<11-char-random>
 */
function newCourseId() {
  return 'CRS-' + newId();
}

module.exports = { newId, newCourseId };