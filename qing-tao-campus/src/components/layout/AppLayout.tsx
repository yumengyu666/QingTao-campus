import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { SideNav } from './SideNav';
import { PageTransition } from '@/components/common/PageTransition';
import Mascot from '@/components/mascot/Mascot';
import MascotChat from '@/components/mascot/MascotChat';

export function AppLayout() {
  const location = useLocation();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <SideNav />
      <main className="md:ml-56 pb-16 md:pb-0">
        <div className="mx-auto md:max-w-7xl md:px-6 md:py-4">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </div>
      </main>

      {/* 吉祥物小轻 — 全局展示 */}
      <Mascot onClick={() => setChatOpen(true)} isChatOpen={chatOpen} />
      <MascotChat isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
