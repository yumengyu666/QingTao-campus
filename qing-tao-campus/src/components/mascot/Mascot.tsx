import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MascotProps {
  onClick: () => void;
  isChatOpen: boolean;
}

const MASCOT_SIZE = 64;
const STEP_SPEED = 0.8; // pixels per frame (lower = slower)
const DIRECTION_CHANGE_INTERVAL = 4000; // ms between random direction changes
const PAUSE_CHANCE = 0.2; // 20% chance to pause

export default function Mascot({ onClick, isChatOpen }: MascotProps) {
  const [x, setX] = useState(() => window.innerWidth / 2 - MASCOT_SIZE / 2);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isWalking, setIsWalking] = useState(true);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [walkFrame, setWalkFrame] = useState(0);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  // Bottom position: desktop (0.5rem) / mobile (above nav: 3.5rem + 0.25rem)
  const bottomPosition = isMobile
    ? 'calc(env(safe-area-inset-bottom, 0px) + 3.75rem)'
    : '0.5rem';
  const tooltipBottom = isMobile
    ? 'calc(env(safe-area-inset-bottom, 0px) + 8.75rem)'
    : '5.5rem';
  const [showTooltip, setShowTooltip] = useState(true);

  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const directionTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const walkTimerRef = useRef<ReturnType<typeof setInterval>>();

  // Blinking animation
  useEffect(() => {
    const blink = () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    };
    const interval = setInterval(() => {
      // Blink every 2-5 seconds
      if (Math.random() > 0.5) blink();
    }, 2500 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, []);

  // Hide tooltip after first interaction or 15 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowTooltip(false), 15000);
    return () => clearTimeout(timer);
  }, []);

  // Walking animation loop
  useEffect(() => {
    const maxWidth = window.innerWidth;

    const walk = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      if (isWalking && delta < 200) {
        const step = STEP_SPEED * (delta / 16);
        setX((prev) => {
          let next = prev + direction * step;
          // Bounce at edges
          if (next <= 0) {
            setDirection(1);
            return 0;
          }
          if (next >= maxWidth - MASCOT_SIZE) {
            setDirection(-1);
            return maxWidth - MASCOT_SIZE;
          }
          return next;
        });
      }
      animFrameRef.current = requestAnimationFrame(walk);
    };

    animFrameRef.current = requestAnimationFrame(walk);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isWalking, direction]);

  // Walk frame cycling for bob animation
  useEffect(() => {
    walkTimerRef.current = setInterval(() => {
      setWalkFrame((f) => (f + 1) % 4);
    }, 200);
    return () => {
      if (walkTimerRef.current) clearInterval(walkTimerRef.current);
    };
  }, []);

  // Random direction changes
  useEffect(() => {
    const changeBehavior = () => {
      // Sometimes pause
      if (Math.random() < PAUSE_CHANCE) {
        setIsWalking(false);
        // Maybe jump
        if (Math.random() < 0.4) {
          setIsJumping(true);
          setTimeout(() => setIsJumping(false), 500);
        }
        setTimeout(() => setIsWalking(true), 1500 + Math.random() * 2000);
        return;
      }
      // Change direction
      setDirection(Math.random() > 0.5 ? 1 : -1);
      setIsWalking(true);
    };

    directionTimerRef.current = setInterval(changeBehavior, DIRECTION_CHANGE_INTERVAL + Math.random() * 2000);

    return () => {
      if (directionTimerRef.current) clearInterval(directionTimerRef.current);
    };
  }, []);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const maxW = window.innerWidth;
      setIsMobile(maxW < 768);
      setX((prev) => Math.min(Math.max(prev, 0), maxW - MASCOT_SIZE));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleClick = useCallback(() => {
    setShowTooltip(false);
    onClick();
  }, [onClick]);

  const bobOffset = walkFrame % 2 === 0 ? -2 : 2;
  const jumpOffset = isJumping ? -12 : 0;

  return (
    <>
      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && !isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed z-[60] pointer-events-none"
            style={{
              left: x + MASCOT_SIZE / 2,
              bottom: tooltipBottom,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-xs px-3 py-1.5 rounded-xl shadow-lg whitespace-nowrap border border-gray-100 dark:border-gray-700">
              👋 点我聊天！有问题随时问～
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white dark:bg-gray-800 rotate-45 border-r border-b border-gray-100 dark:border-gray-700" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mascot */}
      <motion.div
        className="fixed z-[55] cursor-pointer select-none"
        style={{
          left: x,
          bottom: bottomPosition,
          width: MASCOT_SIZE,
          height: MASCOT_SIZE,
          scaleX: direction,
        }}
        animate={{
          y: [0, bobOffset + jumpOffset, 0],
        }}
        transition={{
          y: {
            duration: 0.35,
            ease: 'easeInOut',
          },
        }}
        onClick={handleClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <svg
          viewBox="0 0 80 80"
          width={MASCOT_SIZE}
          height={MASCOT_SIZE}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Body gradient */}
            <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" /> {/* cyan-500 */}
              <stop offset="50%" stopColor="#10b981" /> {/* emerald-500 */}
              <stop offset="100%" stopColor="#059669" /> {/* emerald-600 */}
            </linearGradient>
            {/* Belly gradient */}
            <linearGradient id="bellyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a7f3d0" /> {/* emerald-200 */}
              <stop offset="100%" stopColor="#6ee7b7" /> {/* emerald-300 */}
            </linearGradient>
            {/* Cheek blush */}
            <radialGradient id="blushGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f472b6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#f472b6" stopOpacity="0" />
            </radialGradient>
            {/* Shadow */}
            <radialGradient id="shadowGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#000" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>
            {/* Filter for glow */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Shadow on ground */}
          <ellipse cx="40" cy="76" rx="18" ry="3" fill="url(#shadowGrad)" />

          {/* Feet */}
          <motion.g
            animate={{
              rotate: walkFrame % 2 === 0 ? [0, -8, 0] : [0, 8, 0],
            }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {/* Left foot */}
            <ellipse
              cx={28 + (walkFrame % 2 === 0 ? 2 : -2)}
              cy={72 + (walkFrame % 2 === 0 ? 2 : 0)}
              rx="7"
              ry="4"
              fill="#059669"
              opacity="0.9"
            />
            {/* Right foot */}
            <ellipse
              cx={52 + (walkFrame % 2 === 0 ? -2 : 2)}
              cy={72 + (walkFrame % 2 === 1 ? 2 : 0)}
              rx="7"
              ry="4"
              fill="#059669"
              opacity="0.9"
            />
          </motion.g>

          {/* Body */}
          <ellipse cx="40" cy="48" rx="24" ry="22" fill="url(#bodyGrad)" filter="url(#glow)" />

          {/* Belly */}
          <ellipse cx="40" cy="52" rx="15" ry="13" fill="url(#bellyGrad)" opacity="0.8" />

          {/* Arms */}
          <motion.g
            animate={{
              rotate: walkFrame % 2 === 0 ? [0, 10, 0] : [0, -10, 0],
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ transformOrigin: '40px 45px' }}
          >
            {/* Left arm */}
            <path
              d="M18 42 Q10 50 14 58"
              stroke="#06b6d4"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Right arm */}
            <path
              d="M62 42 Q70 50 66 58"
              stroke="#06b6d4"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
          </motion.g>

          {/* Ears / Antenna */}
          <motion.g
            animate={isWalking ? { rotate: [0, -3, 0, 3, 0] } : {}}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '40px 50px' }}
          >
            {/* Left ear */}
            <ellipse cx="22" cy="30" rx="7" ry="10" fill="#06b6d4" opacity="0.9" />
            <ellipse cx="22" cy="30" rx="4" ry="7" fill="#a7f3d0" opacity="0.5" />
            {/* Right ear */}
            <ellipse cx="58" cy="30" rx="7" ry="10" fill="#10b981" opacity="0.9" />
            <ellipse cx="58" cy="30" rx="4" ry="7" fill="#a7f3d0" opacity="0.5" />
          </motion.g>

          {/* Antenna tuft */}
          <motion.g
            animate={isWalking ? { rotate: [0, 5, 0, -5, 0] } : {}}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '40px 26px' }}
          >
            <circle cx="40" cy="22" r="5" fill="#22d3ee" opacity="0.8" />
            <circle cx="40" cy="22" r="3" fill="#a5f3fc" opacity="0.6" />
          </motion.g>

          {/* Eyes */}
          <g>
            {/* Left eye */}
            <ellipse cx="31" cy="44" rx="7" ry={isBlinking ? 0.5 : 8} fill="white" />
            <ellipse
              cx={31 + (direction * 1.5)}
              cy="44"
              rx="3.5"
              ry={isBlinking ? 0.5 : 4}
              fill="#1e293b"
            />
            <circle cx={29} cy="42" r="2" fill="white" opacity="0.9" />

            {/* Right eye */}
            <ellipse cx="49" cy="44" rx="7" ry={isBlinking ? 0.5 : 8} fill="white" />
            <ellipse
              cx={49 + (direction * 1.5)}
              cy="44"
              rx="3.5"
              ry={isBlinking ? 0.5 : 4}
              fill="#1e293b"
            />
            <circle cx="47" cy="42" r="2" fill="white" opacity="0.9" />
          </g>

          {/* Blush */}
          <circle cx="24" cy="52" r="6" fill="url(#blushGrad)" />
          <circle cx="56" cy="52" r="6" fill="url(#blushGrad)" />

          {/* Mouth */}
          <motion.path
            d="M35 56 Q40 60 45 56"
            stroke="#047857"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            animate={isJumping ? { d: 'M33 56 Q40 64 47 56' } : { d: 'M35 56 Q40 60 45 56' }}
            transition={{ duration: 0.3 }}
          />

          {/* Sparkle effects (subtle) */}
          <motion.circle
            cx="65" cy="35" r="2"
            fill="#67e8f9"
            opacity="0"
            animate={{ opacity: [0, 0.8, 0], scale: [0.5, 1.2, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
          />
          <motion.circle
            cx="15" cy="38" r="1.5"
            fill="#67e8f9"
            opacity="0"
            animate={{ opacity: [0, 0.6, 0], scale: [0.5, 1, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3, delay: 0.8 }}
          />
        </svg>
      </motion.div>
    </>
  );
}
