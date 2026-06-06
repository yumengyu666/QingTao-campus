import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' as const } },
};

interface Props {
  children: React.ReactNode;
}

export function PageTransition({ children }: Props) {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as any });
  }, [location.pathname]);

  return (
    <motion.div
      key={location.pathname}
      variants={pageVariants}
      initial="initial"
      animate="enter"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}
