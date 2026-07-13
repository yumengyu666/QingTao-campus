import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronRight, FiX } from 'react-icons/fi';

const ONBOARDING_DONE_KEY = 'onboarding_done';

interface Step {
  targetSelector: string;
  title: string;
  description: string;
  /** Where to place the tooltip relative to the spotlight */
  placement: 'bottom' | 'right' | 'top' | 'left';
}

const STEPS: Step[] = [
  {
    targetSelector: '[data-onboarding="home-goods"]',
    title: '浏览商品',
    description: '在这里发现同学们发布的二手商品、求购和出租信息，支持按分类和校区筛选',
    placement: 'bottom',
  },
  {
    targetSelector: '[data-onboarding="publish-btn"]',
    title: '发布内容',
    description: '点击这里发布商品、帖子或失物招领，把你的好物分享给全校同学',
    placement: 'right',
  },
  {
    targetSelector: '[data-onboarding="messages-tab"]',
    title: '消息交流',
    description: '在这里查看和回复私信，与买卖双方实时沟通，完成校园交易',
    placement: 'right',
  },
  {
    targetSelector: '[data-onboarding="profile-tab"]',
    title: '个人中心',
    description: '管理你的个人信息、收藏、通知和历史记录，打造你的校园名片',
    placement: 'right',
  },
];

function getSpotlightRect(target: Element) {
  const r = target.getBoundingClientRect();
  const padding = 8;
  return {
    x: r.left - padding,
    y: r.top - padding,
    w: r.width + padding * 2,
    h: r.height + padding * 2,
  };
}

export default function OnboardingWalkthrough() {
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [spotlight, setSpotlight] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const stepRef = useRef(currentStep);
  stepRef.current = currentStep;

  // Check if onboarding is already done
  const isDone = localStorage.getItem(ONBOARDING_DONE_KEY) === '1';

  // Initialize — only show on home page for first-time users
  useEffect(() => {
    if (isDone) return;
    // Only show onboarding on the home page
    if (location.pathname !== '/' && location.pathname !== '/lg') return;

    // Delay to let the page fully render
    const timer = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(timer);
  }, [isDone, location.pathname]);

  // Position the spotlight and tooltip for the current step
  const positionStep = useCallback(() => {
    const step = STEPS[stepRef.current];
    if (!step) return;

    const target = document.querySelector(step.targetSelector);
    if (!target) {
      // Target not found — skip this step
      setCurrentStep((prev) => {
        if (prev < STEPS.length - 1) return prev + 1;
        finishOnboarding();
        return prev;
      });
      return;
    }

    const rect = getSpotlightRect(target);
    setSpotlight(rect);

    // Calculate tooltip position based on placement
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let tx: number, ty: number;

    switch (step.placement) {
      case 'bottom':
        tx = Math.max(16, Math.min(rect.x + rect.w / 2 - 140, vw - 296));
        ty = rect.y + rect.h + 16;
        // If tooltip would go off bottom, place on top
        if (ty + 140 > vh) {
          ty = rect.y - 156;
        }
        break;
      case 'top':
        tx = Math.max(16, Math.min(rect.x + rect.w / 2 - 140, vw - 296));
        ty = rect.y - 156;
        if (ty < 16) {
          ty = rect.y + rect.h + 16;
        }
        break;
      case 'right':
        tx = Math.min(rect.x + rect.w + 16, vw - 296);
        ty = Math.max(16, Math.min(rect.y + rect.h / 2 - 60, vh - 136));
        break;
      case 'left':
        tx = Math.max(16, rect.x - 296);
        ty = Math.max(16, Math.min(rect.y + rect.h / 2 - 60, vh - 136));
        break;
      default:
        tx = rect.x;
        ty = rect.y + rect.h + 16;
    }

    setTooltipPos({ x: tx, y: ty });
  }, []);

  // Reposition on step change or resize
  useEffect(() => {
    if (!visible) return;
    positionStep();
    window.addEventListener('resize', positionStep);
    window.addEventListener('scroll', positionStep);
    return () => {
      window.removeEventListener('resize', positionStep);
      window.removeEventListener('scroll', positionStep);
    };
  }, [visible, currentStep, positionStep]);

  function finishOnboarding() {
    localStorage.setItem(ONBOARDING_DONE_KEY, '1');
    setVisible(false);
  }

  function handleNext() {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      finishOnboarding();
    }
  }

  function handleSkip() {
    finishOnboarding();
  }

  if (!visible || !spotlight || !tooltipPos) return null;

  const currentStepData = STEPS[currentStep];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[9999]"
        style={{ pointerEvents: 'none' }}
      >
        {/* Overlay rectangles around the spotlight */}
        {/* Top */}
        <div
          className="absolute left-0 right-0 bg-black/60 backdrop-blur-[2px]"
          style={{ top: 0, height: Math.max(0, spotlight.y) }}
        />
        {/* Bottom */}
        <div
          className="absolute left-0 right-0 bg-black/60 backdrop-blur-[2px]"
          style={{ top: spotlight.y + spotlight.h, height: `calc(100vh - ${spotlight.y + spotlight.h}px)` }}
        />
        {/* Left */}
        <div
          className="absolute bg-black/60 backdrop-blur-[2px]"
          style={{ top: spotlight.y, left: 0, width: Math.max(0, spotlight.x), height: spotlight.h }}
        />
        {/* Right */}
        <div
          className="absolute bg-black/60 backdrop-blur-[2px]"
          style={{ top: spotlight.y, left: spotlight.x + spotlight.w, width: `calc(100vw - ${spotlight.x + spotlight.w}px)`, height: spotlight.h }}
        />

        {/* Spotlight border glow */}
        <motion.div
          layoutId="onboarding-spotlight"
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="absolute rounded-xl pointer-events-none"
          style={{
            left: spotlight.x - 4,
            top: spotlight.y - 4,
            width: spotlight.w + 8,
            height: spotlight.h + 8,
            border: '3px solid rgba(99, 102, 241, 0.7)',
            boxShadow: '0 0 30px rgba(99, 102, 241, 0.25), 0 0 8px rgba(99, 102, 241, 0.15)',
            borderRadius: 16,
          }}
        />

        {/* Tooltip */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="absolute w-[280px] pointer-events-auto"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div
            className="rounded-2xl p-5 shadow-2xl"
            style={{
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.6)',
            }}
          >
            {/* Step indicator */}
            <div className="flex items-center gap-1.5 mb-3">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === currentStep ? 'w-5 bg-indigo-500' : i < currentStep ? 'w-2 bg-indigo-300' : 'w-2 bg-gray-200'
                  }`}
                />
              ))}
            </div>

            <h3 className="text-base font-bold text-gray-900 mb-1.5">
              {currentStepData.title}
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-5">
              {currentStepData.description}
            </p>

            <div className="flex items-center justify-between">
              <button
                onClick={handleSkip}
                className="text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors px-2 py-1"
              >
                跳过
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-xl hover:bg-indigo-600 active:scale-95 transition-all shadow-md shadow-indigo-500/20"
              >
                {currentStep === STEPS.length - 1 ? '完成' : '下一步'}
                <FiChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Arrow pointing toward spotlight */}
          {currentStepData.placement === 'bottom' && (
            <div className="flex justify-center -mt-px">
              <div className="w-3 h-3 bg-white/95 rotate-45 -mt-1.5 border-l border-t border-white/60" />
            </div>
          )}
          {currentStepData.placement === 'top' && (
            <div className="flex justify-center">
              <div className="w-3 h-3 bg-white/95 rotate-45 -mb-1.5 border-r border-b border-white/60" />
            </div>
          )}
        </motion.div>

        {/* Step counter */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto">
          <span className="text-xs text-white/50 font-medium">
            {currentStep + 1} / {STEPS.length}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
