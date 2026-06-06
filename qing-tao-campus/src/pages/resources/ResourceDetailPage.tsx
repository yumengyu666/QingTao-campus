import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Skeleton } from '@/components/common/Skeleton';
import { apiFetch } from '@/utils/api';
import { formatDate } from '@/utils/format';
import { FiDownload, FiHeart, FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function ResourceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resource, setResource] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloadCount, setDownloadCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    if (!id) return;
    apiFetch(`/api/resources/${id}`)
      .then(r => r.json())
      .then(json => {
        if (json.code === 200) {
          setResource(json.data);
          setDownloadCount(json.data.downloadCount || 0);
          setLikeCount(json.data.likeCount || 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownload = async () => {
    if (!resource?.fileUrl) return;
    try {
      const res = await apiFetch(`/api/resources/${id}/download`, { method: 'POST' });
      const json = await res.json();
      if (json.code === 200) {
        setDownloadCount(c => c + 1);
        window.open(resource.fileUrl, '_blank');
      } else toast.error(json.message);
    } catch { toast.error('下载失败'); }
  };

  const handleLike = async () => {
    try {
      const res = await apiFetch(`/api/resources/${id}/like`, { method: 'POST' });
      const json = await res.json();
      if (json.code === 200) setLikeCount(c => c + 1);
    } catch { toast.error('操作失败'); }
  };

  if (loading) return <div><Header title="资料详情" /><div className="p-4"><Skeleton.Detail /></div></div>;
  if (!resource) return <div><Header title="资料详情" /><p className="text-center text-gray-400 py-20">资料不存在</p></div>;

  return (
    <div>
      <Header title="资料详情" />
      <div className="p-4 md:max-w-2xl md:mx-auto">
        <div className="bg-white dark:bg-[var(--color-card)] rounded-2xl p-5 shadow-sm">
          <h1 className="text-lg font-bold">{resource.title}</h1>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
              {resource.courseName}
            </span>
            {resource.courseCode && (
              <span className="text-xs text-gray-400">{resource.courseCode}</span>
            )}
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500">
              {resource.type}
            </span>
          </div>
          {resource.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-4 leading-relaxed">{resource.description}</p>
          )}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <UserAvatar src={resource.user?.avatarUrl} nickname={resource.user?.nickname || '?'} size="sm" />
              <span className="text-sm text-gray-500">{resource.user?.nickname}</span>
            </div>
            <span className="text-xs text-gray-400">{formatDate(resource.createdAt)}</span>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors">
              <FiDownload /> 下载 ({downloadCount})
            </button>
            <button onClick={handleLike}
              className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <FiHeart /> {likeCount}
            </button>
          </div>
          {resource.fileSize && (
            <p className="text-xs text-gray-400 mt-3 text-center">
              文件大小：{(resource.fileSize / 1024 / 1024).toFixed(2)} MB
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
