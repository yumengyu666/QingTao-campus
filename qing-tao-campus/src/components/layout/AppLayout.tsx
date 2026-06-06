import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { SideNav } from './SideNav';
import { PageTransition } from '@/components/common/PageTransition';

export function AppLayout() {
  const location = useLocation();

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
    </div>
  );
}
