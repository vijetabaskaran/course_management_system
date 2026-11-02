import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChatNotifications } from '../context/ChatNotificationContext';
import { getInitials } from '../services/storage';

export default function Sidebar({ sections, activeSection, onNavigate, theme = 'student-theme', breadcrumb }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useChatNotifications();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleToggle = useCallback(() => {
    if (window.innerWidth <= 768) {
      setMobileOpen(o => !o);
    } else {
      setCollapsed(c => !c);
    }
  }, []);

  const handleNav = (key) => {
    onNavigate(key);
    if (window.innerWidth <= 768 && mobileOpen) setMobileOpen(false);
  };

  const sidebarClass = [
    'sidebar',
    collapsed ? 'collapsed' : '',
    mobileOpen ? 'mobile-open' : '',
  ].filter(Boolean).join(' ');

  const mainMargin = collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)';

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="sidebar-overlay active" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      {/* Sidebar */}
      <aside className={sidebarClass} role="navigation" aria-label="Main navigation">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon" aria-hidden="true">
              {theme === 'admin-theme' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                  <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                </svg>
              )}
            </div>
            <span className="logo-text">{theme === 'admin-theme' ? 'Admin Panel' : 'EduPortal'}</span>
          </div>
          <button className="sidebar-toggle" onClick={handleToggle} aria-label="Toggle sidebar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav">
          {sections.map(({ key, label, icon }) => {
            const isChat = key === 'chat';
            const showChatBadge = isChat && unreadCount > 0;
            return (
              <button
                key={key}
                id={`nav-${key}`}
                className={`nav-item${activeSection === key ? ' active' : ''}`}
                onClick={() => handleNav(key)}
                style={{ position: 'relative' }}
              >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  {icon}
                  {showChatBadge && collapsed && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-3px',
                        right: '-3px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#ef4444',
                        boxShadow: '0 0 6px rgba(239, 68, 68, 0.8)',
                        border: '1.5px solid var(--sidebar-bg, #ffffff)',
                      }}
                      title={`${unreadCount} unread message(s)`}
                    />
                  )}
                </div>
                <span className="nav-label">{label}</span>
                {showChatBadge && !collapsed && (
                  <span
                    className="sidebar-chat-badge"
                    style={{
                      marginLeft: 'auto',
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '10px',
                      minWidth: '20px',
                      textAlign: 'center',
                      lineHeight: '1.2',
                      boxShadow: '0 0 8px rgba(239, 68, 68, 0.45)',
                    }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={logout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span className="logout-label">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile menu button exposed via context — handled inside DashboardLayout */}
    </>
  );
}
