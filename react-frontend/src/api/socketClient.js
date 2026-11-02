import { io } from 'socket.io-client';

/**
 * api/socketClient.js
 * React Socket.IO client manager (Activity 13.5).
 *
 * Connects to backend Socket.IO server with JWT token in handshake auth.
 * Prevents duplicate connections and disconnects cleanly upon logout.
 */

let socketInstance = null;

export function getSocket() {
  return socketInstance;
}

export function connectSocket(tokenOverride = null) {
  const token = tokenOverride || sessionStorage.getItem('token') || localStorage.getItem('token');
  if (!token) {
    disconnectSocket();
    return null;
  }

  // If socket already exists: check if token matches
  if (socketInstance) {
    if (socketInstance.auth && socketInstance.auth.token === token) {
      if (socketInstance.connected) {
        return socketInstance;
      }
      socketInstance.connect();
      return socketInstance;
    }
    // Token changed (e.g. new user logged in) — disconnect old instance
    disconnectSocket();
  }

  const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

  socketInstance = io(socketUrl, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socketInstance.on('connect', () => {
    console.log('[SocketClient] Connected to backend Socket.IO server. Socket ID:', socketInstance.id);
  });

  socketInstance.on('disconnect', (reason) => {
    console.log('[SocketClient] Disconnected from Socket.IO server. Reason:', reason);
  });

  socketInstance.on('connect_error', (err) => {
    console.warn('[SocketClient] Connection error:', err.message);
  });

  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  }
}

