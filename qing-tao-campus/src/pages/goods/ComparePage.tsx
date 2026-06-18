import { useNavigate } from 'react-router-dom';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/common/EmptyState';
import { CAMPUS_MAP } from '@/utils/constants';
import { CONDITION_MAP } from '@/types/goods';
import { useCompareStore } from '@/stores/compareStore';
import { FiX, FiTrash2, FiChevronRight } from 'react-icons/fi';

export default function ComparePage() {
  const navigate = useNavigate();
  const nav = useAppNavigate();
  const { items, removeItem, clearAll } = useCompareStore();

  if (items.length === 0) {
    return (
      <div>
        <Header title="商品对比" />
        <EmptyState message="还没有添加对比商品" sub="在商品列表中点击对比按钮添加" />
      </div>
    );
  }

  return (
    <div>
      <Header title={`商品对比 (${items.length}/4)`} />
      <div className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm bg-white dark:bg-[var(--color-card)] rounded-xl overflow-hidden">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="p-3 text-left text-gray-400 font-normal w-16">操作</th>
                {items.map(item => (
                  <th key={item.id} className="p-3 text-center min-w-[160px]">
                    <div className="relative">
                      <img
                        src={item.images?.[0] || ''}
                        alt={item.title}
                        className="w-full h-32 object-cover rounded-lg mb-2 bg-gray-100"
                        onClick={() => nav(`/goods/${item.id}`)}
                      />
                      <button
                        onClick={() => removeItem(item.id)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px]"
                      >
                        <FiX />
                      </button>
                    </div>
                    <p className="text-xs font-medium mt-1 line-clamp-2 text-left">{item.title}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-50 dark:border-gray-700/50">
                <td className="p-3 text-gray-400">💰 价格</td>
                {items.map(item => (
                  <td key={item.id} className="p-3 text-center font-bold text-red-500">¥{item.price}</td>
                ))}
              </tr>
              <tr className="border-b border-gray-50 dark:border-gray-700/50">
                <td className="p-3 text-gray-400">📦 成色</td>
                {items.map(item => (
                  <td key={item.id} className="p-3 text-center text-gray-600 dark:text-gray-300">
                    {CONDITION_MAP[item.condition as keyof typeof CONDITION_MAP] || item.condition}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-50 dark:border-gray-700/50">
                <td className="p-3 text-gray-400">📍 校区</td>
                {items.map(item => (
                  <td key={item.id} className="p-3 text-center text-gray-600 dark:text-gray-300">
                    {CAMPUS_MAP[item.campus as keyof typeof CAMPUS_MAP] || item.campus}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-50 dark:border-gray-700/50">
                <td className="p-3 text-gray-400">📂 分类</td>
                {items.map(item => (
                  <td key={item.id} className="p-3 text-center text-gray-500 text-xs">{item.categoryName || '-'}</td>
                ))}
              </tr>
              <tr>
                <td className="p-3 text-gray-400">🔗 详情</td>
                {items.map(item => (
                  <td key={item.id} className="p-3 text-center">
                    <button onClick={() => nav(`/goods/${item.id}`)}
                      className="text-indigo-500 text-xs flex items-center justify-center gap-1">
                      查看详情 <FiChevronRight className="text-[10px]" />
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <button onClick={clearAll}
          className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-200 dark:border-red-800 text-red-500 text-sm font-medium">
          <FiTrash2 /> 清空对比列表
        </button>
      </div>
    </div>
  );
}
