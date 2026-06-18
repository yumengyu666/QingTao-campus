import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiX, FiFilter } from 'react-icons/fi';
import { apiFetch } from '@/utils/api';

interface ChatSearchPanelProps {
  userId: string | undefined;
  onClose: () => void;
  onJumpToMessage: (msgId: number) => void;
}

const MSG_TYPES = [
  { key: '', label: '全部' },
  { key: 'text', label: '文本' },
  { key: 'image', label: '图片' },
  { key: 'file', label: '文件' },
];

export default function ChatSearchPanel({ userId, onClose, onJumpToMessage }: ChatSearchPanelProps) {
  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const search = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams({ keyword: keyword.trim(), pageSize: '30' });
      if (filter) params.set('type', filter);
      const res = await apiFetch(`/api/messages/search/detail?${params.toString()}`);
      const json = await res.json();
      if (json.code === 200) setResults(json.data?.list || []);
    } catch {} finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-12 bg-gray-50 dark:bg-gray-800 border-b">
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input ref={inputRef} value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') search(); }}
            placeholder="搜索聊天记录"
            className="w-full pl-8 pr-8 py-1.5 bg-white dark:bg-gray-700 rounded-md text-sm outline-none text-gray-700 dark:text-gray-300" />
          {keyword && <button onClick={() => { setKeyword(''); setResults([]); }} className="absolute right-2 top-1/2 -translate-y-1/2"><FiX className="text-gray-400" /></button>}
        </div>
        <button onClick={onClose} className="text-sm text-gray-500">取消</button>
      </div>

      {/* Filters */}
      <div className="flex gap-1 px-4 py-2 border-b border-gray-100 dark:border-gray-800">
        {MSG_TYPES.map(t => (
          <button key={t.key} onClick={() => { setFilter(t.key); if (keyword) search(); }}
            className={`px-3 py-1 text-xs rounded-full ${filter === t.key ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {loading && <div className="text-center text-gray-400 py-8">搜索中...</div>}
        {!loading && searched && results.length === 0 && <div className="text-center text-gray-400 py-8">没有找到相关消息</div>}
        {results.map(msg => (
          <div key={msg.id} onClick={() => onJumpToMessage(msg.id)}
            className="px-4 py-3 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{msg.sender?.nickname || '用户'}</span>
              <span className="text-[10px] text-gray-400">{new Date(msg.createdAt).toLocaleString()}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {msg.type === 'image' ? '[图片]' : msg.type === 'file' ? `[文件] ${msg.fileName || ''}` : msg.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
