import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { SideNav } from './SideNav';
import { PageTransition } from '@/components/common/PageTransition';
import { BackToTop } from '@/components/common/BackToTop';
import Mascot from '@/components/mascot/Mascot';
import MascotChat from '@/components/mascot/MascotChat';
import { useKeyboardNav } from '@/hooks/useKeyboardNav';

export function AppLayout() {
  const location = useLocation();
  const [chatOpen, setChatOpen] = useState(false);

  // Keyboard navigation shortcuts
  useKeyboardNav();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  const showMascot = !location.pathname.startsWith('/messages') && !location.pathname.startsWith('/agent');

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Skip navigation for accessibility */}
      <a href="#main-content" className="skip-link">
        跳转到主要内容
      </a>

      <SideNav />

      <main
        id="main-content"
        className="md:ml-56 pb-16 md:pb-8 transition-all duration-300"
        tabIndex={-1}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </div>
      </main>

      <BackToTop />

      {/* Mascot — 吉祥物小轻 */}
      {showMascot && (
        <>
          <Mascot onClick={() => setChatOpen(true)} isChatOpen={chatOpen} />
          <MascotChat isOpen={chatOpen} onClose={() => setChatOpen(false)} />
        </>
      )}
    </div>
  );
}
