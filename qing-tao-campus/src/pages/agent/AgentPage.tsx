import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiMessageCircle, FiZap, FiHelpCircle, FiBookOpen, FiHeart, FiUsers } from 'react-icons/fi';

const PLATFORM_FEATURES = [
  {
    icon: FiMessageCircle,
    color: 'from-emerald-400 to-cyan-400',
    title: '二手交易',
    desc: '买卖闲置物品，安全便捷的校园二手市场',
  },
  {
    icon: FiUsers,
    color: 'from-blue-400 to-indigo-400',
    title: '校园广场',
    desc: '发帖交流、失物招领，连接每一个同学',
  },
  {
    icon: FiHelpCircle,
    color: 'from-amber-400 to-orange-400',
    title: '校园答疑',
    desc: '学习互助社区，提问解答分享经验',
  },
  {
    icon: FiZap,
    color: 'from-purple-400 to-pink-400',
    title: '树洞',
    desc: '匿名倾诉空间，自由表达真实想法',
  },
  {
    icon: FiBookOpen,
    color: 'from-teal-400 to-green-400',
    title: '考试资料',
    desc: '学习资源共享，历年试卷笔记',
  },
  {
    icon: FiHeart,
    color: 'from-rose-400 to-red-400',
    title: '恋爱交友',
    desc: '认识志同道合的朋友，真诚交友',
  },
];

export default function AgentPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 to-cyan-50/30 dark:from-gray-900 dark:to-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          {/* Mascot large display */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-block mb-4"
          >
            <svg viewBox="0 0 120 120" width="100" height="100">
              <defs>
                <linearGradient id="pageGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="50%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <filter id="pageGlow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* Body */}
              <ellipse cx="60" cy="70" rx="38" ry="34" fill="url(#pageGrad)" filter="url(#pageGlow)" />
              <ellipse cx="60" cy="76" rx="24" ry="20" fill="#a7f3d0" opacity="0.35" />
              {/* Ears */}
              <ellipse cx="32" cy="40" rx="12" ry="16" fill="#06b6d4" opacity="0.85" />
              <ellipse cx="32" cy="40" rx="7" ry="11" fill="#a7f3d0" opacity="0.4" />
              <ellipse cx="88" cy="40" rx="12" ry="16" fill="#10b981" opacity="0.85" />
              <ellipse cx="88" cy="40" rx="7" ry="11" fill="#a7f3d0" opacity="0.4" />
              {/* Antenna */}
              <circle cx="60" cy="28" r="8" fill="#22d3ee" opacity="0.8" />
              <circle cx="60" cy="28" r="5" fill="#a5f3fc" opacity="0.5" />
              {/* Eyes */}
              <ellipse cx="48" cy="62" rx="11" ry="13" fill="white" />
              <circle cx="50" cy="60" r="5.5" fill="#1e293b" />
              <circle cx="47" cy="58" r="2.5" fill="white" opacity="0.9" />
              <ellipse cx="72" cy="62" rx="11" ry="13" fill="white" />
              <circle cx="74" cy="60" r="5.5" fill="#1e293b" />
              <circle cx="71" cy="58" r="2.5" fill="white" opacity="0.9" />
              {/* Blush */}
              <circle cx="36" cy="74" r="8" fill="#f472b6" opacity="0.2" />
              <circle cx="84" cy="74" r="8" fill="#f472b6" opacity="0.2" />
              {/* Mouth */}
              <path d="M52 82 Q60 88 68 82" stroke="#047857" strokeWidth="2" strokeLinecap="round" fill="none" />
              {/* Sparkles */}
              <motion.circle cx="95" cy="50" r="3" fill="#67e8f9" animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
              <motion.circle cx="20" cy="55" r="2.5" fill="#67e8f9" animate={{ opacity: [0, 0.8, 0], scale: [0.5, 1.2, 0.5] }} transition={{ duration: 2.5, repeat: Infinity, delay: 0.8 }} />
            </svg>
          </motion.div>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            你好，我是小轻
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            轻淘校园平台的智能助手，随时为你解答问题
          </p>
        </motion.div>

        {/* Feature Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {PLATFORM_FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-2.5`}>
                <feature.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{feature.title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm"
        >
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
            💡 在页面右下角找到小轻，点击即可随时提问！
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            小轻会走路、会眨眼，还会跳起来跟你打招呼哦～
          </p>
        </motion.div>
      </div>
    </div>
  );
}
