import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChatNotifications } from '../context/ChatNotificationContext';
import { getSocket, connectSocket } from '../api/socketClient';
import api from '../services/api';

export default function Chat() {
  const { user } = useAuth();
  const { markContactAsRead, setActiveChatContactId, unreadByContact } = useChatNotifications();
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const currentContactRef = useRef(null);

  // Keep ref updated for socket event callbacks
  useEffect(() => {
    currentContactRef.current = selectedContact;
  }, [selectedContact]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ── Fetch Available Contacts ──────────────────────────────────────────────
  const fetchContacts = useCallback(async () => {
    try {
      setLoadingContacts(true);
      const res = await api.get('/api/v1/messages/contacts');
      if (res.data?.contacts) {
        setContacts(res.data.contacts);
        if (res.data.contacts.length > 0 && !selectedContact) {
          // Default selection: student selects Admin, admin selects Student
          const preferred = user?.role === 'student'
            ? res.data.contacts.find(c => c.role === 'admin') || res.data.contacts[0]
            : res.data.contacts.find(c => c.role === 'student') || res.data.contacts[0];
          setSelectedContact(preferred);
        }
      }
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  }, [selectedContact, user]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // ── Fetch Conversation History ────────────────────────────────────────────
  const fetchMessages = useCallback(async (contactId) => {
    if (!contactId) return;
    try {
      setLoadingMessages(true);
      setSendError('');
      const res = await api.get(`/api/v1/messages/${contactId}`);
      if (res.data?.messages) {
        setMessages(res.data.messages);
      }
    } catch (err) {
      console.error('Failed to fetch conversation history:', err);
      setSendError('Unable to load message history.');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (selectedContact) {
      setActiveChatContactId(selectedContact.id);
      fetchMessages(selectedContact.id);
      markContactAsRead(selectedContact.id);
    }
    return () => {
      setActiveChatContactId(null);
    };
  }, [selectedContact, fetchMessages, setActiveChatContactId, markContactAsRead]);

  // ── Socket.IO Connection & Events ─────────────────────────────────────────
  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return;

    setIsConnected(socket.connected);

    const onConnect = () => {
      console.log('[Chat.jsx] Socket connected:', socket.id);
      setIsConnected(true);
    };
    const onDisconnect = (reason) => {
      console.log('[Chat.jsx] Socket disconnected. Reason:', reason);
      setIsConnected(false);
    };

    const onMessageReceive = (newMsg) => {
      console.log('[Chat.jsx] Received message:receive event:', newMsg);
      const activeContact = currentContactRef.current;
      if (!activeContact) {
        console.log('[Chat.jsx] No activeContact selected, skipping message display');
        return;
      }

      const matchesContact =
        (newMsg.senderId && (newMsg.senderId === activeContact.id || newMsg.senderId === activeContact._id)) ||
        (newMsg.receiverId && (newMsg.receiverId === activeContact.id || newMsg.receiverId === activeContact._id)) ||
        (newMsg.senderEmail && activeContact.email && newMsg.senderEmail.toLowerCase() === activeContact.email.toLowerCase()) ||
        (newMsg.receiverEmail && activeContact.email && newMsg.receiverEmail.toLowerCase() === activeContact.email.toLowerCase());

      const matchesUser =
        (user?.id && (newMsg.senderId === user.id || newMsg.receiverId === user.id)) ||
        (user?._id && (newMsg.senderId === user._id || newMsg.receiverId === user._id)) ||
        (user?.legacyId && (newMsg.senderId === user.legacyId || newMsg.receiverId === user.legacyId)) ||
        (user?.email && (
          (newMsg.senderEmail && newMsg.senderEmail.toLowerCase() === user.email.toLowerCase()) ||
          (newMsg.receiverEmail && newMsg.receiverEmail.toLowerCase() === user.email.toLowerCase())
        ));

      const isCurrentConversation = matchesContact && matchesUser;
      console.log('[Chat.jsx] isCurrentConversation:', isCurrentConversation, { matchesContact, matchesUser });

      if (isCurrentConversation) {
        markContactAsRead(activeContact.id);
        setMessages((prev) => {
          // Avoid duplicate messages
          if (prev.some((m) => m._id === newMsg._id || (m.createdAt === newMsg.createdAt && m.content === newMsg.content))) {
            return prev;
          }
          return [...prev, newMsg];
        });
      }
    };

    const onMessageError = (err) => {
      console.error('[Chat.jsx] Received message:error event:', err);
      setSendError(err.message || 'Error processing message.');
      setSending(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('message:receive', onMessageReceive);
    socket.on('message:error', onMessageError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('message:receive', onMessageReceive);
      socket.off('message:error', onMessageError);
    };
  }, [user]);

  // ── Send Message Handler ──────────────────────────────────────────────────
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedContact || sending) return;

    const content = inputText.trim();
    if (content.length > 2000) {
      setSendError('Message exceeds maximum 2000 characters limit.');
      return;
    }

    setSending(true);
    setSendError('');

    const socket = getSocket();

    if (socket && socket.connected) {
      socket.emit(
        'message:send',
        {
          receiverId: selectedContact.id,
          content,
        },
        (ack) => {
          setSending(false);
          if (ack && ack.success) {
            setInputText('');
          } else {
            setSendError(ack?.error || 'Failed to send message.');
          }
        }
      );
    } else {
      // Fallback via REST API if socket not active
      try {
        const res = await api.post('/api/v1/messages', {
          receiverId: selectedContact.id,
          content,
        });
        if (res.data?.message) {
          setMessages((prev) => [...prev, res.data.message]);
          setInputText('');
        }
      } catch (err) {
        setSendError(err.response?.data?.message || 'Failed to send message.');
      } finally {
        setSending(false);
      }
    }
  };

  const filteredContacts = contacts.filter((c) =>
    c.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-container-layout" style={{
      display: 'flex',
      height: 'calc(100vh - 120px)',
      background: 'var(--bg-card)',
      borderRadius: '12px',
      border: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      {/* ── Left Pane: Contact List ────────────────────────── */}
      <div style={{
        width: '320px',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-surface, var(--bg-card))',
      }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Conversations</h3>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              color: isConnected ? '#10b981' : '#f59e0b',
              fontWeight: 500,
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isConnected ? '#10b981' : '#f59e0b',
              }} />
              {isConnected ? 'Realtime Connected' : 'Connecting...'}
            </span>
          </div>
          <input
            type="text"
            className="form-control"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'var(--bg-input, #fff)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingContacts ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading contacts...
            </div>
          ) : filteredContacts.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              No contacts found.
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const isSelected = selectedContact?.id === contact.id;
              const unread = unreadByContact[contact.id] || unreadByContact[contact._id] || (contact.email ? unreadByContact[contact.email.toLowerCase()] : 0) || contact.unreadCount || 0;
              return (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: isSelected
                      ? 'rgba(168, 143, 112, 0.15)'
                      : (unread > 0 ? 'rgba(239, 68, 68, 0.05)' : 'transparent'),
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <div style={{
                    position: 'relative',
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: contact.role === 'admin' ? '#4361ee' : '#A88F70',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    flexShrink: 0,
                  }}>
                    {contact.fullname.charAt(0).toUpperCase()}
                    {unread > 0 && !isSelected && (
                      <span style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: '#ef4444',
                        border: '2px solid var(--bg-card, #fff)',
                      }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontWeight: unread > 0 ? 700 : (isSelected ? 600 : 500),
                        fontSize: '0.9rem',
                        color: unread > 0 && !isSelected ? '#ef4444' : 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {contact.fullname}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {unread > 0 && (
                          <span style={{
                            background: '#ef4444',
                            color: '#ffffff',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '10px',
                            minWidth: '18px',
                            textAlign: 'center',
                            lineHeight: 1.2,
                          }}>
                            {unread > 99 ? '99+' : unread}
                          </span>
                        )}
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: contact.role === 'admin' ? 'rgba(67, 97, 238, 0.1)' : 'rgba(168, 143, 112, 0.1)',
                          color: contact.role === 'admin' ? '#4361ee' : '#A88F70',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                        }}>
                          {contact.role}
                        </span>
                      </div>
                    </div>
                    <p style={{
                      margin: '2px 0 0 0',
                      fontSize: '0.75rem',
                      color: unread > 0 && !isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: unread > 0 && !isSelected ? 600 : 400,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {contact.department || contact.email}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right Pane: Active Chat ────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-card)' }}>
        {selectedContact ? (
          <>
            {/* Conversation Header */}
            <div style={{
              padding: '0.75rem 1.25rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-surface, var(--bg-card))',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: selectedContact.role === 'admin' ? '#4361ee' : '#A88F70',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                }}>
                  {selectedContact.fullname.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{selectedContact.fullname}</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {selectedContact.email} {selectedContact.department ? `• ${selectedContact.department}` : ''}
                  </p>
                </div>
              </div>

              {/* Real-time Socket Connection Status Pill */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '12px',
                background: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: isConnected ? '#10b981' : '#ef4444',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}>
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: isConnected ? '#10b981' : '#ef4444',
                  boxShadow: isConnected ? '0 0 6px #10b981' : 'none',
                }} />
                <span>{isConnected ? 'Real-Time Connected' : 'Disconnected'}</span>
              </div>
            </div>

            {/* Error Banner */}
            {sendError && (
              <div style={{
                padding: '0.5rem 1rem',
                background: '#fee2e2',
                color: '#ef4444',
                fontSize: '0.85rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span>{sendError}</span>
                <button
                  onClick={() => setSendError('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontWeight: 'bold' }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Message History Feed */}
            <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {loadingMessages ? (
                <div style={{ margin: 'auto', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Loading conversation history...
                </div>
              ) : messages.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>No messages yet.</p>
                  <span style={{ fontSize: '0.8rem' }}>Say hello to start the conversation!</span>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMine =
                    (user?.id && msg.senderId === user.id) ||
                    (user?._id && msg.senderId === user._id) ||
                    (user?.legacyId && msg.senderId === user.legacyId) ||
                    (user?.email && msg.senderEmail && msg.senderEmail.toLowerCase() === user.email.toLowerCase());
                  return (
                    <div
                      key={msg._id || idx}
                      style={{
                        alignSelf: isMine ? 'flex-end' : 'flex-start',
                        maxWidth: '70%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMine ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div style={{
                        padding: '0.6rem 0.9rem',
                        borderRadius: isMine ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        background: isMine ? '#A88F70' : 'var(--bg-input, #f1f5f9)',
                        color: isMine ? '#ffffff' : 'var(--text-primary, #1e293b)',
                        fontSize: '0.9rem',
                        lineHeight: 1.4,
                        wordBreak: 'break-word',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      }}>
                        {msg.content}
                      </div>
                      <span style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-secondary)',
                        marginTop: '3px',
                        padding: '0 2px',
                      }}>
                        {formatTimestamp(msg.createdAt)}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={handleSendMessage}
              style={{
                padding: '0.75rem 1rem',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                gap: '8px',
                background: 'var(--bg-surface, var(--bg-card))',
              }}
            >
              <input
                type="text"
                placeholder="Type your message..."
                value={inputText}
                maxLength={2000}
                onChange={(e) => setInputText(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.6rem 0.85rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-input, #fff)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              />
              <button
                type="submit"
                disabled={!inputText.trim() || sending}
                style={{
                  padding: '0 1.25rem',
                  background: '#A88F70',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: !inputText.trim() || sending ? 'not-allowed' : 'pointer',
                  opacity: !inputText.trim() || sending ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <h3>Welcome to EduPortal Chat</h3>
            <p>Select a contact from the list on the left to start messaging in real time.</p>
          </div>
        )}
      </div>
    </div>
  );
}

