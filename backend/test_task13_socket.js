'use strict';
/**
 * test_task13_socket.js
 * Verification Suite for Task 13:
 * Real-Time Notification and Chat using Socket.IO (Activities 13.1–13.8).
 *
 * Validates:
 * A. Dependency & Server Checks
 * B. Socket Handshake JWT Authentication
 * C. Real-Time Message Delivery (User A -> User B)
 * D. Message Persistence in MongoDB
 * E. Privacy, Authorization & Error Handling
 * F. Persistence across Server Restart
 */
process.env.TEST_MODE = 'true';

const http = require('http');
const path = require('path');
const jwt = require('jsonwebtoken');
const { io: ClientIO } = require('socket.io-client');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { connectDB, disconnectDB } = require('./config/mongoose');
const User = require('./models/schemas/UserSchema');
const Message = require('./models/schemas/MessageSchema');
const app = require('./server');
const { initSocket, closeSocket } = require('./socket/socketServer');

const TEST_PORT = 4097;
let testHttpServer;

function req(options, body) {
  return new Promise((resolve, reject) => {
    const postData = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (postData) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const requestOptions = {
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: options.path,
      method: options.method || 'GET',
      headers,
    };

    const r = http.request(requestOptions, (res) => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(raw); } catch { /* not json */ }
        resolve({ status: res.statusCode, headers: res.headers, raw, json });
      });
    });

    r.on('error', reject);
    if (postData) r.write(postData);
    r.end();
  });
}

function connectClientSocket(token, options = {}) {
  return new Promise((resolve, reject) => {
    const socket = ClientIO(`http://127.0.0.1:${TEST_PORT}`, {
      auth: token ? { token } : {},
      transports: ['websocket'],
      reconnection: false,
      timeout: 3000,
      ...options,
    });

    socket.on('connect', () => {
      resolve(socket);
    });

    socket.on('connect_error', (err) => {
      resolve({ error: err, socket });
    });
  });
}

async function runSocketTests() {
  console.log('\n======================================================');
  console.log('   Task 13: Real-Time Notification & Chat Test Suite');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  await connectDB();

  testHttpServer = http.createServer(app);
  initSocket(testHttpServer);
  await new Promise(resolve => testHttpServer.listen(TEST_PORT, resolve));

  const suffix = Date.now();
  const userA = {
    fullname: 'Chat User A',
    email: `chata_${suffix}@eduportal.com`,
    department: 'Computer Science',
    password: 'Password@123',
  };
  const userB = {
    fullname: 'Chat User B',
    email: `chatb_${suffix}@eduportal.com`,
    department: 'Data Science',
    password: 'Password@123',
  };
  const userC = {
    fullname: 'Chat User C',
    email: `chatc_${suffix}@eduportal.com`,
    department: 'Cybersecurity',
    password: 'Password@123',
  };

  let tokenA = null;
  let tokenB = null;
  let tokenC = null;
  let idA = null;
  let idB = null;
  let idC = null;

  try {
    // ── SECTION A: Dependency & Server Checks ─────────────────────────
    console.log('\n--- Section A: Server & REST API Checks ---');
    const healthRes = await req({ path: '/api/health' });
    assert(healthRes.status === 200 && healthRes.json?.socket === 'enabled', 'Server is running with Socket.IO enabled');

    // Register 3 test users
    const regA = await req({ path: '/api/v1/auth/register', method: 'POST' }, userA);
    tokenA = regA.json?.token;
    idA = regA.json?.student?.id || regA.json?.student?._id;

    const regB = await req({ path: '/api/v1/auth/register', method: 'POST' }, userB);
    tokenB = regB.json?.token;
    idB = regB.json?.student?.id || regB.json?.student?._id;

    const regC = await req({ path: '/api/v1/auth/register', method: 'POST' }, userC);
    tokenC = regC.json?.token;
    idC = regC.json?.student?.id || regC.json?.student?._id;

    assert(!!tokenA && !!tokenB && !!tokenC, 'Test users registered and issued valid JWTs');

    // ── SECTION B: Socket Handshake JWT Authentication ────────────────
    console.log('\n--- Section B: Socket Handshake JWT Authentication ---');
    // B1. Valid JWT connects successfully
    const socketA = await connectClientSocket(tokenA);
    assert(socketA && !socketA.error && socketA.connected, 'Valid JWT connects to Socket.IO successfully');

    // B2. Missing JWT rejected
    const socketNoAuth = await connectClientSocket(null);
    assert(!!socketNoAuth.error, 'Connection without JWT is rejected on handshake');
    assert(socketNoAuth.error?.message?.includes('Authentication error'), 'Error specifies authentication failure');
    if (socketNoAuth.socket) socketNoAuth.socket.disconnect();

    // B3. Invalid / malformed JWT rejected
    const socketBadJwt = await connectClientSocket('invalid.malformed.jwttoken');
    assert(!!socketBadJwt.error, 'Connection with invalid/malformed JWT is rejected');
    if (socketBadJwt.socket) socketBadJwt.socket.disconnect();

    // B4. Expired JWT rejected
    const expiredToken = jwt.sign(
      { sub: idA, email: userA.email, role: 'student' },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '-5s' }
    );
    const socketExpired = await connectClientSocket(expiredToken);
    assert(!!socketExpired.error, 'Connection with expired JWT is rejected');
    if (socketExpired.socket) socketExpired.socket.disconnect();

    // ── SECTION C: Real-Time Message Delivery ─────────────────────────
    console.log('\n--- Section C: Real-Time Message Delivery ---');
    const socketB = await connectClientSocket(tokenB);
    const socketC = await connectClientSocket(tokenC);

    assert(socketB.connected && socketC.connected, 'User B and User C connected to Socket.IO');

    // Listen for incoming message on socketB and socketC
    let receivedByB = null;
    let receivedByC = null;

    socketB.on('message:receive', (msg) => {
      receivedByB = msg;
    });

    socketC.on('message:receive', (msg) => {
      receivedByC = msg;
    });

    // User A sends message to User B
    const testContent = `Hello User B! Realtime test message ${suffix}`;
    const sendAck = await new Promise((resolve) => {
      socketA.emit('message:send', { receiverId: idB, content: testContent }, (ack) => {
        resolve(ack);
      });
    });

    assert(sendAck && sendAck.success === true, 'User A receives positive acknowledgement on message:send');
    assert(sendAck?.message?.content === testContent, 'Acknowledged message matches sent content');

    // Wait 400ms for delivery
    await new Promise(r => setTimeout(r, 400));

    assert(!!receivedByB, 'User B receives the message in real time via Socket.IO');
    assert(receivedByB?.content === testContent, 'Received message content matches sent content');
    assert(receivedByB?.senderId === idA, 'Sender identity strictly matches authenticated User A');
    assert(receivedByC === null, 'Unrelated User C did NOT receive the private message');

    // ── SECTION D: Offline Message Persistence ────────────────────────
    console.log('\n--- Section D: Offline Delivery & Persistence ---');
    // Disconnect User B
    socketB.disconnect();

    const offlineContent = `Message sent while User B was offline ${suffix}`;
    const offlineAck = await new Promise((resolve) => {
      socketA.emit('message:send', { receiverId: idB, content: offlineContent }, (ack) => {
        resolve(ack);
      });
    });

    assert(offlineAck && offlineAck.success === true, 'Offline recipient does not prevent message persistence');

    // Check MongoDB directly
    const storedMsg = await Message.findOne({ content: offlineContent }).lean();
    assert(!!storedMsg, 'Offline message is successfully stored in MongoDB');
    assert(storedMsg?.senderId === idA && storedMsg?.receiverId === idB, 'MongoDB record reflects correct sender and receiver');

    // ── SECTION E: Message History API (Activity 13.8) ────────────────
    console.log('\n--- Section E: Message History API ---');
    // Missing JWT on history endpoint
    const noJwtHist = await req({ path: `/api/v1/messages/${idB}` });
    assert(noJwtHist.status === 401, 'GET /api/v1/messages/:userId without JWT returns HTTP 401');

    // User A retrieves conversation with User B
    const histResA = await req({
      path: `/api/v1/messages/${idB}`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(histResA.status === 200, 'User A retrieves conversation history with User B (HTTP 200)');
    assert(Array.isArray(histResA.json?.messages) && histResA.json.messages.length >= 2, 'History includes all sent messages');
    assert(histResA.json?.participant?.id === idB, 'History response identifies participant');

    // User C cannot access conversation between User A and User B
    // When User C queries /api/v1/messages/:idB, User C gets ONLY messages between User C and User B (empty)
    const histResC = await req({
      path: `/api/v1/messages/${idB}`,
      headers: { Authorization: `Bearer ${tokenC}` },
    });
    assert(histResC.status === 200, 'User C queries own conversation with User B');
    assert(histResC.json?.messages?.length === 0, 'User C does not see User A’s messages (conversation isolation)');

    // ── SECTION F: Message Validation & Security ──────────────────────
    console.log('\n--- Section F: Validation & Security Rules ---');
    // Empty message
    const emptyAck = await new Promise((resolve) => {
      socketA.emit('message:send', { receiverId: idB, content: '   ' }, (ack) => {
        resolve(ack);
      });
    });
    assert(emptyAck && emptyAck.success === false, 'Empty message rejected by backend');

    // Oversized message (> 2000 chars)
    const longContent = 'A'.repeat(2005);
    const longAck = await new Promise((resolve) => {
      socketA.emit('message:send', { receiverId: idB, content: longContent }, (ack) => {
        resolve(ack);
      });
    });
    assert(longAck && longAck.success === false, 'Oversized message (> 2000 chars) rejected by backend');

    // Nonexistent receiver
    const invalidRecAck = await new Promise((resolve) => {
      socketA.emit('message:send', { receiverId: 'nonexistent-user-999', content: 'Hi' }, (ack) => {
        resolve(ack);
      });
    });
    assert(invalidRecAck && invalidRecAck.success === false, 'Message to nonexistent recipient rejected');

    // Contacts endpoint
    const contactsRes = await req({
      path: '/api/v1/messages/contacts',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(contactsRes.status === 200, 'GET /api/v1/messages/contacts returns HTTP 200');
    assert(contactsRes.json?.contacts?.some(c => c.id === idB), 'Available contacts list includes registered peers');

    // Disconnect remaining sockets
    socketA.disconnect();
    socketC.disconnect();

    // ── SECTION G: Persistence Across Server Restart ──────────────────
    console.log('\n--- Section G: Persistence Across Server Restart ---');
    // Close current server
    closeSocket();
    await new Promise(resolve => testHttpServer.close(resolve));

    // Restart server instance
    testHttpServer = http.createServer(app);
    initSocket(testHttpServer);
    await new Promise(resolve => testHttpServer.listen(TEST_PORT, resolve));

    // Re-verify history after restart
    const postRestartHist = await req({
      path: `/api/v1/messages/${idB}`,
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(postRestartHist.status === 200, 'GET /messages/:userId returns HTTP 200 after server restart');
    assert(postRestartHist.json?.messages?.some(m => m.content === testContent), 'Messages persist across server restart');

    // Clean up test records
    await Message.deleteMany({
      $or: [
        { senderId: { $in: [idA, idB, idC] } },
        { receiverId: { $in: [idA, idB, idC] } },
      ],
    });
    await User.deleteMany({ email: { $in: [userA.email, userB.email, userC.email] } });

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    closeSocket();
    if (testHttpServer) {
      testHttpServer.close();
    }
    await disconnectDB();
  }

  console.log('\n======================================================');
  console.log(`Task 13 Socket Results: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSocketTests();

