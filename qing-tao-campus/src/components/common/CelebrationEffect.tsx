import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  angle: number;
  distance: number;
  duration: number;
  shape: 'heart' | 'star';
}

interface CelebrationEffectProps {
  trigger: boolean;
  origin: { x: number; y: number };
  intensity?: 'normal' | 'small';
}

const HEART_PATH =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';
const STAR_PATH =
  'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

const COLORS = [
  '#FF3366', // hot pink
  '#FF1493', // deep pink
  '#FF6B8A', // soft red
  '#FF4757', // red
  '#FFD700', // gold
  '#FFA502', // orange gold
  '#FF6348', // tomato
  '#FF69B4', // light pink
];

const SHAPES: ('heart' | 'star')[] = ['heart', 'heart', 'heart', 'star', 'star'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function CelebrationEffect({
  trigger,
  origin,
  intensity = 'normal',
}: CelebrationEffectProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const idCounter = useRef(0);

  const spawn = useCallback(() => {
    const count = intensity === 'small' ? 5 : Math.floor(Math.random() * 5) + 8; // 8-12
    const newParticles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: idCounter.current++,
        x: origin.x,
        y: origin.y,
        size: Math.random() * 8 + 8, // 8-16px
        color: pick(COLORS),
        angle: (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6,
        distance: Math.random() * 40 + 40, // 40-80px
        duration: Math.random() * 0.6 + 0.6, // 0.6-1.2s
        shape: pick(SHAPES),
      });
    }
    setParticles(newParticles);
  }, [origin.x, origin.y, intensity]);

  useEffect(() => {
    if (trigger) {
      spawn();
    }
  }, [trigger, spawn]);

  useEffect(() => {
    if (particles.length === 0) return;
    const maxDuration = Math.max(...particles.map((p) => p.duration));
    const timer = setTimeout(() => setParticles([]), maxDuration * 1000 + 200);
    return () => clearTimeout(timer);
  }, [particles]);

  // Reset when origin changes significantly (clean up stale particles)
  useEffect(() => {
    return () => setParticles([]);
  }, [origin.x, origin.y]);

  return (
    <AnimatePresence>
      {particles.map((p) => {
        const targetX = Math.cos(p.angle) * p.distance;
        const targetY = Math.sin(p.angle) * p.distance;

        return (
          <motion.div
            key={p.id}
            initial={{
              x: 0,
              y: 0,
              scale: 0,
              opacity: 1,
              rotate: 0,
            }}
            animate={{
              x: targetX,
              y: targetY - 20, // slight upward bias
              scale: [0, 1.3, 0],
              opacity: [1, 1, 0],
              rotate: (Math.random() - 0.5) * 180,
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{
              duration: p.duration,
              ease: 'easeOut',
              times: [0, 0.2, 1],
            }}
            style={{
              position: 'fixed',
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              pointerEvents: 'none',
              zIndex: 9999,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill={p.color}
              style={{
                width: '100%',
                height: '100%',
                filter: `drop-shadow(0 1px 2px ${p.color}44)`,
              }}
            >
              <path d={p.shape === 'heart' ? HEART_PATH : STAR_PATH} />
            </svg>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}
