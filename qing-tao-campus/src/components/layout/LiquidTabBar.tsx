import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUnreadStore } from '@/stores/unreadStore';
import { motion } from 'framer-motion';

type TabKey = 'home' | 'square' | 'publish' | 'messages' | 'profile';

interface Tab {
  key: TabKey;
  label: string;
  icon: ReactNode;
  to: string;
}

const HomeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

// Compass/explore icon — replaced warning circle
const SquareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M14.83 9.17l4.24-4.24M4.93 19.07l4.24-4.24"/>
  </svg>
);

const PublishIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);

const MessagesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const ProfileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

export default function LiquidTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const unreadCount = useUnreadStore((s) => s.msgCount);
  const [activeTab, setActiveTab] = useState<TabKey>('home');

  const basePath = location.pathname.startsWith('/lg') ? '/lg' : '';

  const tabs: Tab[] = [
    { key: 'home', label: '首页', icon: <HomeIcon />, to: `${basePath}/` },
    { key: 'square', label: '广场', icon: <SquareIcon />, to: `${basePath}/square` },
    { key: 'publish', label: '发布', icon: <PublishIcon />, to: `${basePath}/square/publish` },
    { key: 'messages', label: '消息', icon: <MessagesIcon />, to: `${basePath}/messages` },
    { key: 'profile', label: '我的', icon: <ProfileIcon />, to: `${basePath}/profile` },
  ];

  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith(`${basePath}/square`)) setActiveTab('square');
    else if (path.startsWith(`${basePath}/messages`)) setActiveTab('messages');
    else if (path.startsWith(`${basePath}/profile`)) setActiveTab('profile');
    else setActiveTab('home');
  }, [location.pathname, basePath]);

  const handleTab = useCallback((tab: Tab) => {
    if (tab.key === 'publish') {
      navigate(tab.to);
    } else {
      navigate(tab.to);
    }
  }, [navigate]);

  return (
    <div className="lg-tabbar">
      <div className="lg-tabbar-pill">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const isPublish = tab.key === 'publish';
          return (
            <motion.button
              key={tab.key}
              onClick={() => handleTab(tab)}
              className="lg-tabbar-item lg-tabbar-item-inactive"
              style={{
                position: 'relative',
                background: 'transparent',
              }}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              whileTap={{ scale: 0.9 }}
            >
              {/* Sliding pill background indicator for active tab */}
              {isActive && !isPublish && (
                <motion.div
                  layoutId="tab-pill-bg"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 26,
                    background: '#0066D6',
                    boxShadow: '0 2px 8px rgba(0,102,214,0.4)',
                    zIndex: 0,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 30,
                    mass: 0.8,
                  }}
                />
              )}
              {isPublish ? (
                <motion.div
                  style={{
                    width: 36, height: 36, borderRadius: 12,
                    background: '#0066D6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1,
                  }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 25 }}
                >
                  <span style={{ color: '#FFF', fontSize: 20, fontWeight: 700, lineHeight: 1 }}>+</span>
                </motion.div>
              ) : (
                <motion.div
                  className="lg-tabbar-icon"
                  style={{
                    color: isActive ? '#FFFFFF' : undefined,
                    zIndex: 1,
                    position: 'relative',
                  }}
                  animate={{
                    scale: isActive ? [0.8, 1.15, 1.0] : 1,
                  }}
                  transition={{
                    duration: 0.3,
                    ease: [0.34, 1.56, 0.64, 1], // spring-like cubic bezier
                  }}
                >
                  {tab.icon}
                  {tab.key === 'messages' && unreadCount > 0 && (
                    <span className="lg-tabbar-badge">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </motion.div>
              )}
              <motion.span
                className={`lg-tabbar-label ${isActive && !isPublish ? 'lg-tabbar-label-active' : 'lg-tabbar-label-inactive'}`}
                style={{ zIndex: 1 }}
                animate={{
                  color: isActive && !isPublish ? '#FFFFFF' : undefined,
                }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {tab.label}
              </motion.span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
