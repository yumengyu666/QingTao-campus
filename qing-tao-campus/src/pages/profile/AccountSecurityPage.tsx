import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { useAuthStore } from '@/stores/authStore';
import { apiFetch } from '@/utils/api';
import { FiShield, FiSave, FiBell, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const PRESET_QUESTIONS = [
  '我最喜欢的老师叫什么名字？',
  '我的小名是什么？',
  '我小时候最好的朋友叫什么？',
  '我第一只宠物的名字？',
  '我最喜欢的书籍是什么？',
  '我出生的城市是哪里？',
  '我的小学校名是什么？',
  '我最难忘的旅行目的地？',
];

const NOTIF_TYPES: { key: string; label: string; desc: string }[] = [
  { key: 'chat_message', label: '私信通知', desc: '收到新私信时通知' },
  { key: 'new_comment', label: '评论通知', desc: '有人评论你的内容时通知' },
  { key: 'new_follower', label: '关注通知', desc: '有人关注你时通知' },
  { key: 'goods_sold', label: '售出通知', desc: '收藏的商品售出时通知' },
  { key: 'price_drop', label: '降价通知', desc: '收藏的商品降价≥10%时通知' },
  { key: 'dating_request', label: '恋爱请求', desc: '收到恋爱请求时通知' },
  { key: 'review_result', label: '审核结果', desc: '内容审核结果通知' },
  { key: 'announcement', label: '系统公告', desc: '平台重要公告通知' },
];

export default function AccountSecurityPage() {
  const token = useAuthStore((s) => s.token);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [question1, setQuestion1] = useState(PRESET_QUESTIONS[0]);
  const [answer1, setAnswer1] = useState('');
  const [question2, setQuestion2] = useState(PRESET_QUESTIONS[1]);
  const [answer2, setAnswer2] = useState('');
  const [question3, setQuestion3] = useState(PRESET_QUESTIONS[2]);
  const [answer3, setAnswer3] = useState('');
  const [custom1, setCustom1] = useState('');
  const [custom2, setCustom2] = useState('');
  const [custom3, setCustom3] = useState('');
  const [hasSet, setHasSet] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({});
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiFetch('/api/users/security-questions')
      .then(r => r.json())
      .then(json => {
        if (json.code === 200 && json.data) {
          const d = json.data;
          if (d.hasSet) {
            setHasSet(true);
            setQuestion1(d.question1 || PRESET_QUESTIONS[0]);
            setQuestion2(d.question2 || PRESET_QUESTIONS[1]);
            setQuestion3(d.question3 || PRESET_QUESTIONS[2]);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // 加载通知偏好
    apiFetch('/api/users/me/notif-prefs')
      .then(r => r.json())
      .then(json => {
        if (json.code === 200 && json.data) setNotifPrefs(json.data);
      })
      .catch(() => {});
  }, [token]);

  const handleSave = async () => {
    const q1 = question1 === '__custom__' ? custom1.trim() : question1;
    const q2 = question2 === '__custom__' ? custom2.trim() : question2;
    const q3 = question3 === '__custom__' ? custom3.trim() : question3;
    if (!q1 || !answer1.trim()) { toast.error('请设置第1个问题及答案'); return; }
    if (answer1.trim().length < 2) { toast.error('答案至少需要2个字符'); return; }

    setSaving(true);
    try {
      const res = await apiFetch('/api/users/security-questions', {
        method: 'PUT',
        body: JSON.stringify({
          question1: q1, answer1: answer1.trim(),
          question2: q2, answer2: answer2.trim(),
          question3: q3, answer3: answer3.trim(),
        }),
      });
      const json = await res.json();
      if (json.code === 200) {
        toast.success('安全问题已保存');
        setHasSet(true);
      } else toast.error(json.message);
    } catch { toast.error('网络错误'); }
    setSaving(false);
  };

  return (
    <div>
      <Header title="账号安全" />
      <div className="px-4 pb-20 pt-2 max-w-lg mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-[var(--color-card)] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-[var(--color-border)]/50">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <FiShield className="text-indigo-500 text-sm" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">安全提问</h2>
              <p className="text-xs text-gray-400">设置3个问题用于找回密码，答案区分大小写</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-[var(--color-card-hover)] rounded-xl" />)}
            </div>
          ) : (
            <>
              {[{
                num: 1, question: question1, setQuestion: setQuestion1,
                answer: answer1, setAnswer: setAnswer1, custom: custom1, setCustom: setCustom1,
              }, {
                num: 2, question: question2, setQuestion: setQuestion2,
                answer: answer2, setAnswer: setAnswer2, custom: custom2, setCustom: setCustom2,
              }, {
                num: 3, question: question3, setQuestion: setQuestion3,
                answer: answer3, setAnswer: setAnswer3, custom: custom3, setCustom: setCustom3,
              }].map(({ num, question, setQuestion, answer, setAnswer, custom, setCustom }) => (
                <div key={num} className="mb-4 last:mb-0 p-4 rounded-xl bg-gray-50 dark:bg-[var(--color-card-hover)]/50">
                  <label className="text-xs font-medium text-gray-500 mb-2 block">问题 {num}</label>
                  <select
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-[var(--color-card)] text-sm outline-none border border-gray-100 dark:border-[var(--color-border)]/50 mb-2"
                  >
                    {PRESET_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                    <option value="__custom__">自定义问题...</option>
                  </select>
                  {question === '__custom__' && (
                    <input
                      value={custom}
                      onChange={e => setCustom(e.target.value)}
                      placeholder="输入你的问题"
                      maxLength={50}
                      className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-[var(--color-card)] text-sm outline-none border border-gray-100 dark:border-[var(--color-border)]/50 mb-2"
                    />
                  )}
                  <input
                    type="text"
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    placeholder={hasSet ? '输入答案（不修改则留空）' : '输入答案'}
                    maxLength={30}
                    className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-[var(--color-card)] text-sm outline-none border border-gray-100 dark:border-[var(--color-border)]/50"
                  />
                </div>
              ))}

              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving}
                className="w-full mt-4 py-3 rounded-xl bg-indigo-500 text-white font-medium text-sm hover:bg-indigo-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                <FiSave className="text-sm" />
                {saving ? '保存中...' : hasSet ? '更新安全问题' : '保存安全问题'}
              </motion.button>
              {hasSet && (
                <p className="text-xs text-gray-400 text-center mt-2">安全问题已设置 ✅ 可用于找回密码</p>
              )}
            </>
          )}
        </motion.div>

        {/* 通知偏好设置 */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white dark:bg-[var(--color-card)] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-[var(--color-border)]/50">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <FiBell className="text-amber-500 text-sm" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">通知偏好</h2>
              <p className="text-xs text-gray-400">选择你希望接收的通知类型</p>
            </div>
          </div>
          <div className="space-y-1">
            {NOTIF_TYPES.map(({ key, label, desc }) => (
              <label key={key} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-[var(--color-card-hover)]/50 cursor-pointer transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-gray-400 truncate">{desc}</p>
                </div>
                <button
                  onClick={() => setNotifPrefs(p => ({ ...p, [key]: !p[key] }))}
                  className="ml-3 flex-shrink-0 focus:outline-none"
                >
                  {notifPrefs[key] !== false ? (
                    <FiToggleRight className="text-xl text-indigo-500" />
                  ) : (
                    <FiToggleLeft className="text-xl text-gray-300" />
                  )}
                </button>
              </label>
            ))}
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={async () => {
              setSavingPrefs(true);
              try {
                const res = await apiFetch('/api/users/me/notif-prefs', {
                  method: 'PUT',
                  body: JSON.stringify(notifPrefs),
                });
                const json = await res.json();
                if (json.code === 200) toast.success('通知偏好已保存');
                else toast.error(json.message);
              } catch { toast.error('网络错误'); }
              setSavingPrefs(false);
            }}
            disabled={savingPrefs}
            className="w-full mt-4 py-3 rounded-xl bg-amber-500 text-white font-medium text-sm hover:bg-amber-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <FiSave className="text-sm" />
            {savingPrefs ? '保存中...' : '保存通知偏好'}
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
