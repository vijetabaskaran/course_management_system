import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getSocket, connectSocket } from '../api/socketClient';
import api from '../services/api';

const ChatNotificationContext = createContext({
  unreadCount: 0,
  unreadByContact: {},
  activeChatContactId: null,
  incomingToast: null,
  clearIncomingToast: () => {},
  setActiveChatContactId: () => {},
  markContactAsRead: () => {},
  fetchUnreadCounts: () => {},
});

export function ChatNotificationProvider({ children }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadByContact, setUnreadByContact] = useState({});
  const [activeChatContactId, setActiveChatContactId] = useState(null);
  const [incomingToast, setIncomingToast] = useState(null);

  const clearIncomingToast = useCallback(() => setIncomingToast(null), []);

  useEffect(() => {
    if (!incomingToast) return;
    const timer = setTimeout(() => {
      setIncomingToast(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [incomingToast]);

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

  // Update document title with unread message badge
  useEffect(() => {
    if (unreadCount > 0) {
      document.title = `(${unreadCount > 99 ? '99+' : unreadCount}) EduPortal`;
    } else {
      document.title = 'EduPortal';
    }
  }, [unreadCount]);

  // ── Mark Contact As Read ──────────────────────────────────────────────────
  const markContactAsRead = useCallback(async (contactId) => {
    if (!contactId || !user) return;
    try {
      // 1. Update backend via REST
      const res = await api.patch(`/api/v1/messages/${contactId}/read`);
      if (res.data?.success) {
        setUnreadCount(res.data.remainingUnread || 0);
        if (res.data.bySender) {
          setUnreadByContact(res.data.bySender);
        } else {
          setUnreadByContact(prev => ({
            ...prev,
            [contactId]: 0,
            [String(contactId)]: 0,
          }));
        }
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
      const myIds = [
        user.id ? String(user.id) : null,
        user._id ? String(user._id) : null,
        user.legacyId ? String(user.legacyId) : null,
      ].filter(Boolean);
      const myEmail = user.email ? user.email.toLowerCase() : '';

      const recIdStr = newMsg.receiverId ? String(newMsg.receiverId) : '';
      const recEmailStr = newMsg.receiverEmail ? newMsg.receiverEmail.toLowerCase() : '';

      const isForMe =
        (recIdStr && myIds.includes(recIdStr)) ||
        (recEmailStr && myEmail && recEmailStr === myEmail);

      if (!isForMe) return;

      const senderId = newMsg.senderId ? String(newMsg.senderId) : '';
      const senderEmail = newMsg.senderEmail ? newMsg.senderEmail.toLowerCase() : '';
      const currentActiveContact = activeContactRef.current ? String(activeContactRef.current) : null;

      // If user is currently looking at this sender's conversation, mark as read immediately
      if (
        currentActiveContact &&
        (currentActiveContact === senderId || (senderEmail && currentActiveContact.toLowerCase() === senderEmail))
      ) {
        markContactAsRead(senderId);
        return;
      }

      // Otherwise increment unread count and trigger in-app toast notification
      setUnreadCount(prev => prev + 1);
      setUnreadByContact(prev => {
        const next = { ...prev };
        const keys = [senderId, senderEmail].filter(Boolean);
        const currentCount = keys.reduce((max, k) => Math.max(max, prev[k] || 0), 0);
        const newCount = currentCount + 1;
        for (const k of keys) {
          next[k] = newCount;
        }
        return next;
      });

      setIncomingToast({
        id: newMsg._id || Date.now(),
        senderName: newMsg.senderName || 'New Message',
        content: newMsg.content && newMsg.content.length > 55 ? newMsg.content.slice(0, 52) + '...' : newMsg.content,
        senderId,
      });
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
        incomingToast,
        clearIncomingToast,
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

