import { useState, useEffect, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

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

const SquareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 16v-4M12 8h.01"/>
  </svg>
);

const PublishIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
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

const tabs: Tab[] = [
  { key: 'home', label: '首页', icon: <HomeIcon />, to: '/' },
  { key: 'square', label: '广场', icon: <SquareIcon />, to: '/square' },
  { key: 'publish', label: '发布', icon: <PublishIcon />, to: '/square/publish' },
  { key: 'messages', label: '消息', icon: <MessagesIcon />, to: '/messages' },
  { key: 'profile', label: '我的', icon: <ProfileIcon />, to: '/profile' },
];

export default function LiquidTabBar() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabKey>('home');

  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/square')) setActiveTab('square');
    else if (path.startsWith('/messages')) setActiveTab('messages');
    else if (path.startsWith('/profile')) setActiveTab('profile');
    else setActiveTab('home');
  }, [location.pathname]);

  return (
    <div className="lg-tabbar">
      <div className="lg-tabbar-pill">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const isPublish = tab.key === 'publish';
          return (
            <NavLink
              key={tab.key}
              to={tab.to}
              className={`lg-tabbar-item ${isActive && !isPublish ? 'lg-tabbar-item-active' : 'lg-tabbar-item-inactive'}`}
              style={{ textDecoration: 'none' }}
            >
              {isPublish ? (
                <div style={{
                  width: 36, height: 36, borderRadius: 12,
                  background: '#0066D6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <span style={{ color: '#FFF', fontSize: 20, fontWeight: 700, lineHeight: 1 }}>+</span>
                </div>
              ) : (
                <div className="lg-tabbar-icon" style={{ color: isActive ? '#FFFFFF' : '#888888' }}>
                  {tab.icon}
                </div>
              )}
              <span className={`lg-tabbar-label ${isActive && !isPublish ? 'lg-tabbar-label-active' : 'lg-tabbar-label-inactive'}`}>
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
