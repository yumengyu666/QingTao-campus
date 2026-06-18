import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiBell, FiBellOff, FiImage, FiTrash2, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { apiFetch } from '@/utils/api';
import toast from 'react-hot-toast';

export default function ChatSettingsPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [isPinned, setIsPinned] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`/api/messages/conversations/settings/${userId}`);
        const json = await res.json();
        if (json.code === 200) {
          setIsPinned(json.data?.isPinned || false);
          setIsMuted(json.data?.isMuted || false);
        }
      } catch {} finally { setLoading(false); }
    })();
  }, [userId]);

  const updateSetting = async (key: 'isPinned' | 'isMuted', value: boolean) => {
    try {
      const res = await apiFetch(`/api/messages/conversations/settings/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ [key]: value }),
      });
      if (res.status !== 200) throw new Error();
      if (key === 'isPinned') setIsPinned(value);
      if (key === 'isMuted') setIsMuted(value);
      toast.success(value ? (key === 'isPinned' ? '已置顶' : '已免打扰') : (key === 'isPinned' ? '已取消置顶' : '已取消免打扰'));
    } catch { toast.error('设置失败'); }
  };

  return (
    <div className="min-h-screen bg-[var(--color-chat-bg)]">
      <MobileHeader title="聊天详情" />

      <div className="mt-3 mx-3 space-y-0.5">
        {/* Pinned */}
        <button onClick={() => updateSetting('isPinned', !isPinned)} disabled={loading}
          className="w-full flex items-center justify-between px-4 py-3.5 bg-white dark:bg-gray-800 first:rounded-t-xl last:rounded-b-xl">
          <span className="text-sm text-gray-900 dark:text-gray-100">置顶聊天</span>
          {isPinned ? <FiToggleRight className="text-xl text-green-500" /> : <FiToggleLeft className="text-xl text-gray-300" />}
        </button>

        {/* Muted */}
        <button onClick={() => updateSetting('isMuted', !isMuted)} disabled={loading}
          className="w-full flex items-center justify-between px-4 py-3.5 bg-white dark:bg-gray-800">
          {isMuted ? (
            <><FiBellOff className="text-base text-gray-400" /><span className="flex-1 text-sm text-gray-900 dark:text-gray-100 ml-3">消息免打扰</span></>
          ) : (
            <><FiBell className="text-base text-gray-400" /><span className="flex-1 text-sm text-gray-900 dark:text-gray-100 ml-3">消息免打扰</span></>
          )}
          {isMuted ? <FiToggleRight className="text-xl text-green-500" /> : <FiToggleLeft className="text-xl text-gray-300" />}
        </button>

        {/* Chat background */}
        <button className="w-full flex items-center justify-between px-4 py-3.5 bg-white dark:bg-gray-800">
          <span className="text-sm text-gray-900 dark:text-gray-100">设置当前聊天背景</span>
          <FiImage className="text-gray-400" />
        </button>

        {/* Clear chat history */}
        <button onClick={() => {
          if (confirm('确定清空聊天记录吗？此操作不可恢复。')) toast('功能开发中');
        }}
          className="w-full flex items-center justify-between px-4 py-3.5 bg-white dark:bg-gray-800 last:rounded-b-xl">
          <span className="text-sm text-red-500">清空聊天记录</span>
          <FiTrash2 className="text-red-400" />
        </button>

        {/* Report */}
        <div className="h-3" />
        <button className="w-full flex items-center justify-center px-4 py-3 bg-white dark:bg-gray-800 rounded-xl">
          <span className="text-sm text-red-500">投诉</span>
        </button>
      </div>
    </div>
  );
}
