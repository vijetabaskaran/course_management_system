'use strict';
/**
 * scripts/createAdmin.js
 * Secure, backend-controlled administrator account setup script.
 *
 * Requirements:
 *  - Reads ADMIN_EMAIL and ADMIN_PASSWORD from environment variables (.env).
 *  - Requires a strong password of at least 12 characters.
 *  - Hashes the password using bcrypt (same mechanism as authService).
 *  - Creates the account with role: "admin".
 *  - Checks if required environment variables are set.
 *  - Checks if the account already exists.
 *  - NEVER automatically promotes an existing student account.
 *  - NEVER stores plaintext passwords.
 *  - Avoids double-hashing (studentModel.create stores given hash as-is).
 *  - Provides useful success and error messages without exposing credentials.
 *
 * Usage:
 *   node scripts/createAdmin.js
 *   npm run create-admin
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('../config/mongoose');
const studentModel = require('../models/studentModel');
const { newId } = require('../utils/idGenerator');

const BCRYPT_ROUNDS = 12;

async function createAdmin() {
  console.log('\n========================================');
  console.log('  EduPortal — Administrator Setup Script');
  console.log('========================================\n');

  const email = (process.argv[2] || process.env.ADMIN_EMAIL || '').trim();
  const password = process.argv[3] || process.env.ADMIN_PASSWORD || '';
  const fullname = (process.argv[4] || process.env.ADMIN_FULLNAME || 'System Administrator').trim();

  // 1. Guard: check required environment variables
  if (!email) {
    console.error('  [ERROR] Missing required environment variable: ADMIN_EMAIL');
    console.error('  Please set ADMIN_EMAIL in backend/.env or pass it as an argument.');
    process.exit(1);
  }

  const normEmail = email.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) {
    console.error(`  [ERROR] ADMIN_EMAIL "${email}" is not a valid email address.`);
    process.exit(1);
  }

  if (!password) {
    console.error('  [ERROR] Missing required environment variable: ADMIN_PASSWORD');
    console.error('  Please set ADMIN_PASSWORD in backend/.env or pass it as an argument.');
    process.exit(1);
  }

  // 2. Guard: password length >= 12
  if (password.length < 12) {
    console.error(`  [ERROR] Admin password must be at least 12 characters long for security.`);
    console.error(`  Provided password length: ${password.length} characters.`);
    process.exit(1);
  }

  // Connect to MongoDB
  await connectDB();

  // 3. Check whether account already exists
  const existing = await studentModel.findByEmailRaw(normEmail);
  if (existing) {
    if (existing.role === 'admin') {
      console.log(`  [INFO] Administrator account "${normEmail}" already exists.`);
      console.log('  No changes were made.\n');
      await disconnectDB();
      process.exit(0);
    } else {
      // SECURITY RULE: Never automatically promote an existing student account.
      console.error(`  [SECURITY ERROR] An account with email "${normEmail}" already exists with role "${existing.role || 'student'}".`);
      console.error('  Existing student accounts cannot be automatically promoted to administrator.');
      console.error('  Please specify a distinct email address for the administrator account.');
      await disconnectDB();
      process.exit(1);
    }
  }

  // 4. Hash password with bcrypt
  console.log(`  Hashing password with bcrypt (${BCRYPT_ROUNDS} rounds)...`);
  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // 5. Build administrator account record
  const adminUser = {
    id:         newId(),
    fullname,
    email:      normEmail,
    username:   normEmail.split('@')[0],
    department: 'Administration',
    password:   hashedPassword,
    role:       'admin',
    authScheme: 'bcrypt',
    createdAt:  Date.now(),
  };

  // 6. Persist to storage
  await studentModel.create(adminUser);

  console.log(`  [SUCCESS] Administrator account created successfully:`);
  console.log(`    Email : ${normEmail}`);
  console.log(`    Role  : admin`);
  console.log(`    Name  : ${fullname}`);
  console.log('\n  The administrator can now log in to manage courses.\n');

  await disconnectDB();
  process.exit(0);
}

createAdmin().catch(async (err) => {
  console.error('  [UNEXPECTED ERROR]', err.message);
  try {
    await disconnectDB();
  } catch (_) {}
  process.exit(1);
});
