import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getSocket, connectSocket } from '../api/socketClient';
import api from '../services/api';

const ChatNotificationContext = createContext({
  unreadCount: 0,
  unreadByContact: {},
  activeChatContactId: null,
  setActiveChatContactId: () => {},
  markContactAsRead: () => {},
  fetchUnreadCounts: () => {},
});

export function ChatNotificationProvider({ children }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadByContact, setUnreadByContact] = useState({});
  const [activeChatContactId, setActiveChatContactId] = useState(null);

  const activeContactRef = useRef(activeChatContactId);
  useEffect(() => {
    activeContactRef.current = activeChatContactId;
  }, [activeChatContactId]);

  // ── Fetch Initial Unread Counts ───────────────────────────────────────────
  const fetchUnreadCounts = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      setUnreadByContact({});
      return;
    }
    try {
      const res = await api.get('/api/v1/messages/unread');
      if (res.data?.success) {
        setUnreadCount(res.data.total || 0);
        setUnreadByContact(res.data.bySender || {});
      }
    } catch (err) {
      // Ignore if offline / unauthenticated
    }
  }, [user]);

  // Fetch when user logs in or reloads
  useEffect(() => {
    fetchUnreadCounts();
  }, [fetchUnreadCounts]);

  // ── Mark Contact As Read ──────────────────────────────────────────────────
  const markContactAsRead = useCallback(async (contactId) => {
    if (!contactId || !user) return;
    try {
      // 1. Update backend via REST
      const res = await api.patch(`/api/v1/messages/${contactId}/read`);
      if (res.data?.success) {
        setUnreadCount(res.data.remainingUnread || 0);
        setUnreadByContact(prev => ({
          ...prev,
          [contactId]: 0,
        }));
      }

      // 2. Also emit via Socket.IO
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit('message:mark_read', { senderId: contactId });
      }
    } catch (err) {
      console.warn('Failed to mark conversation as read:', err);
    }
  }, [user]);

  // ── Socket.IO Real-time Events ────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const socket = connectSocket();
    if (!socket) return;

    // 1. Direct unread:count event from server
    const onUnreadCount = (data) => {
      if (data && typeof data.total === 'number') {
        setUnreadCount(data.total);
        if (data.bySender) {
          setUnreadByContact(data.bySender);
        }
      }
    };

    // 2. Incoming new message
    const onMessageReceive = (newMsg) => {
      // Check if message was sent TO current user
      const isForMe =
        (newMsg.receiverId && (newMsg.receiverId === user.id || newMsg.receiverId === user.legacyId || newMsg.receiverId === user._id)) ||
        (newMsg.receiverEmail && user.email && newMsg.receiverEmail.toLowerCase() === user.email.toLowerCase());

      if (!isForMe) return;

      const senderId = newMsg.senderId;
      const currentActiveContact = activeContactRef.current;

      // If user is currently looking at this sender's conversation, mark as read immediately
      if (currentActiveContact && (currentActiveContact === senderId || currentActiveContact === newMsg.senderEmail)) {
        markContactAsRead(senderId);
        return;
      }

      // Otherwise increment unread count
      setUnreadCount(prev => prev + 1);
      setUnreadByContact(prev => ({
        ...prev,
        [senderId]: (prev[senderId] || 0) + 1,
      }));
    };

    socket.on('unread:count', onUnreadCount);
    socket.on('message:receive', onMessageReceive);

    return () => {
      socket.off('unread:count', onUnreadCount);
      socket.off('message:receive', onMessageReceive);
    };
  }, [user, markContactAsRead]);

  return (
    <ChatNotificationContext.Provider
      value={{
        unreadCount,
        unreadByContact,
        activeChatContactId,
        setActiveChatContactId,
        markContactAsRead,
        fetchUnreadCounts,
      }}
    >
      {children}
    </ChatNotificationContext.Provider>
  );
}

export function useChatNotifications() {
  return useContext(ChatNotificationContext);
}

