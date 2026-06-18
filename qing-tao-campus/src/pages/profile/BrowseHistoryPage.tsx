import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/common/EmptyState';
import { DEFAULT_CATEGORIES, CAMPUS_MAP } from '@/utils/constants';
import { formatTime } from '@/utils/format';
import { FiClock, FiTrash2, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

const HISTORY_KEY = 'browse_history';
const MAX_HISTORY = 50;

interface BrowseItem {
  goodsId: number;
  title: string;
  price: number;
  condition: string;
  campus: string;
  categoryId: number;
  viewedAt: string;
}

export function saveBrowseHistory(goods: { id: number; title: string; price: number; condition: string; campus: string; categoryId: number }) {
  try {
    const raw = localStorage.getItem(HISTORY_KEY) || '[]';
    const list: BrowseItem[] = JSON.parse(raw);
    const filtered = list.filter(h => h.goodsId !== goods.id);
    filtered.unshift({
      goodsId: goods.id,
      title: goods.title,
      price: goods.price,
      condition: goods.condition,
      campus: goods.campus,
      categoryId: goods.categoryId,
      viewedAt: new Date().toISOString(),
    });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, MAX_HISTORY)));
  } catch { /* ignore */ }
}

export default function BrowseHistoryPage() {
  const navigate = useNavigate();
  const nav = useAppNavigate();
  const [list, setList] = useState<BrowseItem[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY) || '[]';
      setList(JSON.parse(raw));
    } catch { setList([]); }
  }, []);

  const getKey = (h: BrowseItem) => `${h.goodsId}_${h.viewedAt}`;

  const toggleSelect = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const deleteSelected = () => {
    if (selected.size === 0) return;
    const newList = list.filter(h => !selected.has(getKey(h)));
    setList(newList);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newList));
    setSelected(new Set());
    setSelectMode(false);
    toast.success(`已删除${selected.size}条`);
  };

  const deleteOne = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    const newList = list.filter(h => getKey(h) !== key);
    setList(newList);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newList));
    toast.success('已删除');
  };

  return (
    <div>
      <Header title="浏览记录" rightAction={list.length > 0 ? <span className="text-xs text-gray-400 font-normal">{list.length} 条</span> : undefined} />
      {list.length > 0 && (
        <div className="px-4 py-2 flex justify-between">
          {selectMode ? (
            <div className="flex gap-2">
              <button onClick={deleteSelected} disabled={selected.size === 0}
                className="px-3 py-1.5 text-sm text-red-500 border border-red-300 rounded-lg disabled:opacity-30">删除({selected.size})</button>
              <button onClick={() => { setSelectMode(false); setSelected(new Set()); }}
                className="px-3 py-1.5 text-sm text-gray-500 border border-gray-200 dark:border-[var(--color-border)] rounded-lg">取消</button>
            </div>
          ) : (
            <button onClick={() => setSelectMode(true)}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-[var(--color-text-secondary)] border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">多选</button>
          )}
        </div>
      )}
      {list.length === 0 ? (
        <EmptyState message="暂无浏览记录" icon={<FiClock className="text-5xl mb-4" />} />
      ) : (
        <div className="p-4 md:p-0 space-y-2">
          {list.map((h) => {
            const key = getKey(h);
            return (
              <div key={key}
                onClick={() => selectMode ? toggleSelect(key) : nav(`/goods/${h.goodsId}`)}
                className={`bg-white dark:bg-[var(--color-card)] rounded-xl p-4 flex items-center gap-3 ${selectMode ? 'cursor-pointer' : 'cursor-pointer active:scale-[0.98] md:hover:shadow-md transition-all'}`}>
                {selectMode && (
                  <button onClick={(e) => { e.stopPropagation(); toggleSelect(key); }}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selected.has(key) ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-300 dark:border-gray-500'}`}>
                    {selected.has(key) && <FiCheckCircle className="text-xs" />}
                  </button>
                )}
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-2xl flex-shrink-0">
                  {DEFAULT_CATEGORIES[(h.categoryId - 1) % 8]?.icon || '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium truncate">{h.title}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                    <span className="text-red-500 font-bold">¥{h.price}</span>
                    <span>{CAMPUS_MAP[h.campus as keyof typeof CAMPUS_MAP]}</span>
                  </div>
                </div>
                {!selectMode ? (
                  <button onClick={(e) => deleteOne(e, key)}
                    className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 p-1">
                    <FiTrash2 className="text-sm" />
                  </button>
                ) : (
                  <span className="text-xs text-gray-400 flex-shrink-0">{formatTime(h.viewedAt)}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
