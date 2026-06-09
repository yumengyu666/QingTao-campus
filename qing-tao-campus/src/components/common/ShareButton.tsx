import { useState } from 'react';
import { FiShare2, FiCopy, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface ShareButtonProps {
  title: string;
  description?: string;
  className?: string;
}

export function ShareButton({ title, description, className = '' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareData = {
      title: `轻淘 · ${title}`,
      text: description || `查看「${title}」`,
      url: window.location.href,
    };

    // 优先使用 Web Share API（移动端原生分享）
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // 用户取消分享，继续使用复制链接方式
      }
    }

    // 降级：复制链接
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('链接已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败，请手动复制浏览器地址栏链接');
    }
  };

  return (
    <button
      onClick={handleShare}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
        bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300
        hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-500
        transition-all active:scale-95 ${className}`}
    >
      {copied ? <FiCheck className="text-green-500" /> : <FiShare2 />}
      <span>{copied ? '已复制' : '分享'}</span>
    </button>
  );
}
