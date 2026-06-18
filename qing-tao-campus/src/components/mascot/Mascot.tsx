import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MascotProps {
  onClick: () => void;
  isChatOpen: boolean;
}

const MASCOT_SIZE = 64;
const STEP_SPEED = 0.8;
const DIRECTION_CHANGE_INTERVAL = 4000;
const PAUSE_CHANCE = 0.2;

export default function Mascot({ onClick, isChatOpen }: MascotProps) {
  const [x, setX] = useState(() => window.innerWidth / 2 - MASCOT_SIZE / 2);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isWalking, setIsWalking] = useState(true);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [walkFrame, setWalkFrame] = useState(0);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [showTooltip, setShowTooltip] = useState(true);

  const bottomPosition = isMobile
    ? 'calc(env(safe-area-inset-bottom, 0px) + 3.75rem)'
    : '0.5rem';
  const tooltipBottom = isMobile
    ? 'calc(env(safe-area-inset-bottom, 0px) + 8.75rem)'
    : '5.5rem';

  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const directionTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Blink
  useEffect(() => {
    const blink = () => { setIsBlinking(true); setTimeout(() => setIsBlinking(false), 150); };
    const t = setInterval(() => { if (Math.random() > 0.5) blink(); }, 2500 + Math.random() * 3000);
    return () => clearInterval(t);
  }, []);

  // Tooltip
  useEffect(() => {
    const t = setTimeout(() => setShowTooltip(false), 15000);
    return () => clearTimeout(t);
  }, []);

  // Pause when chat open
  useEffect(() => {
    if (isChatOpen) { setIsWalking(false); setShowTooltip(false); }
    else { const t = setTimeout(() => setIsWalking(true), 800); return () => clearTimeout(t); }
  }, [isChatOpen]);

  // Walking animation
  useEffect(() => {
    const maxW = window.innerWidth;
    const walk = (ts: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = ts;
      const delta = ts - lastTimeRef.current;
      lastTimeRef.current = ts;
      if (isWalking && delta < 200) {
        const step = STEP_SPEED * (delta / 16);
        setX(prev => {
          const n = prev + direction * step;
          if (n <= 0) { setDirection(1); return 0; }
          if (n >= maxW - MASCOT_SIZE) { setDirection(-1); return maxW - MASCOT_SIZE; }
          return n;
        });
      }
      animFrameRef.current = requestAnimationFrame(walk);
    };
    animFrameRef.current = requestAnimationFrame(walk);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [isWalking, direction]);

  // Random behavior
  useEffect(() => {
    const t = setInterval(() => {
      if (Math.random() < PAUSE_CHANCE) {
        setIsWalking(false);
        if (Math.random() < 0.4) setIsJumping(true);
        setTimeout(() => { setIsJumping(false); setIsWalking(true); }, 1500 + Math.random() * 2000);
      } else {
        setDirection(Math.random() > 0.5 ? 1 : -1);
        setIsWalking(true);
      }
    }, DIRECTION_CHANGE_INTERVAL + Math.random() * 2000);
    return () => clearInterval(t);
  }, []);

  // Resize
  useEffect(() => {
    const h = () => { setIsMobile(window.innerWidth < 768); setX(p => Math.min(Math.max(p, 0), window.innerWidth - MASCOT_SIZE)); };
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const handleClick = useCallback(() => { setShowTooltip(false); onClick(); }, [onClick]);

  const bobOffset = walkFrame % 2 === 0 ? -2 : 2;
  const jumpOffset = isJumping ? -12 : 0;

  // Quick walk frame toggle
  useEffect(() => {
    const t = setInterval(() => setWalkFrame(f => (f + 1) % 4), 200);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <AnimatePresence>
        {showTooltip && !isChatOpen && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
            className="fixed z-[60] pointer-events-none" style={{ left: x + MASCOT_SIZE / 2, bottom: tooltipBottom, transform: 'translateX(-50%)' }}>
            <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-xs px-3 py-1.5 rounded-xl shadow-lg whitespace-nowrap border border-gray-100 dark:border-gray-700">
              👋 点我聊天！
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white dark:bg-gray-800 rotate-45 border-r border-b border-gray-100 dark:border-gray-700" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div className="fixed z-[55] cursor-pointer select-none"
        style={{ left: x, bottom: bottomPosition, width: MASCOT_SIZE, height: MASCOT_SIZE, scaleX: direction }}
        animate={{ y: [0, bobOffset + jumpOffset, 0] }}
        transition={{ y: { duration: 0.35, ease: 'easeInOut' } }}
        onClick={handleClick} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
        <svg viewBox="0 0 80 80" width={MASCOT_SIZE} height={MASCOT_SIZE} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" /><stop offset="50%" stopColor="#10b981" /><stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="bellyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a7f3d0" /><stop offset="100%" stopColor="#6ee7b7" />
            </linearGradient>
            <radialGradient id="blushGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f472b6" stopOpacity="0.6" /><stop offset="100%" stopColor="#f472b6" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="shadowGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#000" stopOpacity="0.08" /><stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>
            <filter id="glow"><feGaussianBlur stdDeviation="1.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          <ellipse cx="40" cy="76" rx="18" ry="3" fill="url(#shadowGrad)" />
          <ellipse cx={28 + (walkFrame % 2 === 0 ? 2 : -2)} cy={72 + (walkFrame % 2 === 0 ? 2 : 0)} rx="7" ry="4" fill="#059669" opacity="0.9" />
          <ellipse cx={52 + (walkFrame % 2 === 0 ? -2 : 2)} cy={72 + (walkFrame % 2 === 1 ? 2 : 0)} rx="7" ry="4" fill="#059669" opacity="0.9" />
          <ellipse cx="40" cy="48" rx="24" ry="22" fill="url(#bodyGrad)" filter="url(#glow)" />
          <ellipse cx="40" cy="52" rx="15" ry="13" fill="url(#bellyGrad)" opacity="0.8" />
          <path d="M18 42 Q10 50 14 58" stroke="#06b6d4" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M62 42 Q70 50 66 58" stroke="#06b6d4" strokeWidth="5" strokeLinecap="round" fill="none" />
          <ellipse cx="22" cy="30" rx="7" ry="10" fill="#06b6d4" opacity="0.9" /><ellipse cx="22" cy="30" rx="4" ry="7" fill="#a7f3d0" opacity="0.5" />
          <ellipse cx="58" cy="30" rx="7" ry="10" fill="#10b981" opacity="0.9" /><ellipse cx="58" cy="30" rx="4" ry="7" fill="#a7f3d0" opacity="0.5" />
          <circle cx="40" cy="22" r="5" fill="#22d3ee" opacity="0.8" /><circle cx="40" cy="22" r="3" fill="#a5f3fc" opacity="0.6" />
          <ellipse cx="31" cy="44" rx="7" ry={isBlinking ? 0.5 : 8} fill="white" />
          <ellipse cx={31 + direction * 1.5} cy="44" rx="3.5" ry={isBlinking ? 0.5 : 4} fill="#1e293b" />
          <circle cx="29" cy="42" r="2" fill="white" opacity="0.9" />
          <ellipse cx="49" cy="44" rx="7" ry={isBlinking ? 0.5 : 8} fill="white" />
          <ellipse cx={49 + direction * 1.5} cy="44" rx="3.5" ry={isBlinking ? 0.5 : 4} fill="#1e293b" />
          <circle cx="47" cy="42" r="2" fill="white" opacity="0.9" />
          <circle cx="24" cy="52" r="6" fill="url(#blushGrad)" /><circle cx="56" cy="52" r="6" fill="url(#blushGrad)" />
          <path d={isChatOpen ? "M33 56 Q40 64 47 56" : isJumping ? "M33 56 Q40 64 47 56" : "M35 56 Q40 60 45 56"} stroke="#047857" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>
      </motion.div>
    </>
  );
}
