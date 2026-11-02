'use strict';
/**
 * socket/socketServer.js
 * Socket.IO server initialization and real-time message handling (Activities 13.2–13.4).
 *
 * Security:
 * - JWT authentication on handshake (socket.handshake.auth.token).
 * - Sender identity derived strictly from verified JWT (never trusted from payload).
 * - Messages delivered only to recipient's private room and sender.
 * - MongoDB persistence before delivery.
 */
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const messageService = require('../services/messageService');

let ioInstance = null;

/**
 * Initialize and attach Socket.IO to the existing HTTP server.
 * @param {import('http').Server} httpServer
 */
function initSocket(httpServer) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`Socket CORS: origin "${origin}" is not allowed.`));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  // ── Handshake JWT Authentication Middleware (Activity 13.2) ─────────────────
  io.use((socket, next) => {
    try {
      const authHeader = socket.handshake.headers?.authorization;
      let token = socket.handshake.auth?.token;

      if (!token && authHeader) {
        const parts = authHeader.trim().split(/\s+/);
        if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
          token = parts[1];
        }
      }

      if (!token || typeof token !== 'string' || !token.trim()) {
        return next(new Error('Authentication error: JWT token is required.'));
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return next(new Error('Authentication error: Server JWT secret is not configured.'));
      }

      const payload = jwt.verify(token.trim(), secret);
      const userId = payload.sub || payload.id || payload.userId;

      if (!userId) {
        return next(new Error('Authentication error: Token is missing user subject.'));
      }

      // Attach strictly verified identity
      socket.user = {
        id:    String(userId),
        email: payload.email,
        role:  payload.role || 'student',
      };

      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new Error('Authentication error: Token expired.'));
      }
      return next(new Error('Authentication error: Invalid or malformed token.'));
    }
  });

  // ── Connection Event Handling ───────────────────────────────────────────────
  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    const userEmail = socket.user.email ? socket.user.email.toLowerCase() : null;

    let joinedRooms = [`user:${userId}`, ...(userEmail ? [`user:${userEmail}`] : [])];
    socket.join(`user:${userId}`);
    if (userEmail) {
      socket.join(`user:${userEmail}`);
    }

    // Resolve user document to join alias rooms (legacyId, _id, email)
    try {
      const User = require('../models/schemas/UserSchema');
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(userId);
      const userDoc = await User.findOne({
        $or: [
          ...(isObjectId ? [{ _id: userId }] : []),
          { legacyId: userId },
          ...(userEmail ? [{ email: userEmail }] : []),
        ],
      }).lean();

      if (userDoc) {
        socket.join(`user:${String(userDoc._id)}`);
        joinedRooms.push(`user:${String(userDoc._id)}`);
        if (userDoc.legacyId) {
          socket.join(`user:${userDoc.legacyId}`);
          joinedRooms.push(`user:${userDoc.legacyId}`);
        }
        if (userDoc.email) {
          socket.join(`user:${userDoc.email.toLowerCase()}`);
          joinedRooms.push(`user:${userDoc.email.toLowerCase()}`);
        }
      }
    } catch (_) {}

    joinedRooms = Array.from(new Set(joinedRooms));
    console.log(`[Socket.IO] Authenticated user connected: ${socket.user.email} (role: ${socket.user.role}, ID: ${socket.user.id}) | Joined rooms: [${joinedRooms.join(', ')}]`);

    // ── Real-Time Message Event (Activity 13.6) ──────────────────────────────
    socket.on('message:send', async (data, ack) => {
      try {
        const { receiverId, content } = data || {};
        console.log(`[Socket.IO] message:send event received from ${socket.user.email} (ID: ${socket.user.id}) for recipient "${receiverId}"`);

        // Persist to MongoDB FIRST (Activity 13.8)
        const saved = await messageService.sendMessage(socket.user, receiverId, content);

        const targetRooms = new Set([
          `user:${saved.receiverId}`,
          ...(saved.receiverEmail ? [`user:${saved.receiverEmail.toLowerCase()}`] : []),
        ]);

        // Deliver across all known aliases for recipient
        try {
          const User = require('../models/schemas/UserSchema');
          const isObjId = /^[0-9a-fA-F]{24}$/.test(saved.receiverId);
          const recDoc = await User.findOne({
            $or: [
              ...(isObjId ? [{ _id: saved.receiverId }] : []),
              { legacyId: saved.receiverId },
              ...(saved.receiverEmail ? [{ email: saved.receiverEmail.toLowerCase() }] : []),
            ],
          }).lean();
          if (recDoc) {
            targetRooms.add(`user:${String(recDoc._id)}`);
            if (recDoc.legacyId) targetRooms.add(`user:${recDoc.legacyId}`);
            if (recDoc.email) targetRooms.add(`user:${recDoc.email.toLowerCase()}`);
          }
        } catch (_) {}

        console.log(`[Socket.IO] Emitting message:receive to rooms:`, Array.from(targetRooms));
        io.to(Array.from(targetRooms)).emit('message:receive', saved);

        // Deliver to sender's socket (for immediate confirmation)
        socket.emit('message:receive', saved);

        if (typeof ack === 'function') {
          ack({ success: true, message: saved });
        }
      } catch (err) {
        console.error(`[Socket.IO] message:send error:`, err.message);
        socket.emit('message:error', {
          success: false,
          error:   err.name || 'MessageError',
          message: err.message || 'Failed to send message.',
        });
        if (typeof ack === 'function') {
          ack({ success: false, error: err.message });
        }
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] User disconnected: ${socket.user.email || socket.user.id} (reason: ${reason})`);
    });
  });

  ioInstance = io;
  return io;
}

function getIO() {
  return ioInstance;
}

function closeSocket() {
  if (ioInstance) {
    ioInstance.close();
    ioInstance = null;
  }
}

module.exports = {
  initSocket,
  getIO,
  closeSocket,
};

