import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Skeleton } from '@/components/common/Skeleton';
import { ShareButton } from '@/components/common/ShareButton';
import { useAuthStore } from '@/stores/authStore';
import { apiFetch } from '@/utils/api';
import { formatDate } from '@/utils/format';
import { FiDownload, FiHeart, FiFlag, FiArrowLeft, FiEdit2, FiSave, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function ResourceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [resource, setResource] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloadCount, setDownloadCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCourseName, setEditCourseName] = useState('');
  const [editCourseCode, setEditCourseCode] = useState('');
  const [editType, setEditType] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

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
        // Validate fileUrl is a safe relative path or same-origin URL
        const url = resource.fileUrl;
        if (/^(https?:)?\/\//i.test(url) && !url.startsWith(window.location.origin)) {
          toast.error('无效的下载链接');
          return;
        }
        window.open(url, '_blank');
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

  const handleReport = async () => {
    if (!reportReason.trim()) { toast.error('请填写举报原因'); return; }
    setReporting(true);
    try {
      const res = await apiFetch(`/api/resources/${id}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason: reportReason.trim() }),
      });
      const json = await res.json();
      if (json.code === 200) {
        toast.success('举报已提交，管理员处理后会通知你');
        setShowReport(false);
        setReportReason('');
      } else {
        toast.error(json.message || '举报失败');
      }
    } catch { toast.error('网络错误'); }
    setReporting(false);
  };

  const startEdit = () => {
    if (!resource) return;
    setEditTitle(resource.title || '');
    setEditCourseName(resource.courseName || '');
    setEditCourseCode(resource.courseCode || '');
    setEditType(resource.type || '');
    setEditDescription(resource.description || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editTitle.trim()) { toast.error('标题不能为空'); return; }
    setSaving(true);
    try {
      const res = await apiFetch(`/api/resources/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editTitle.trim(),
          courseName: editCourseName.trim(),
          courseCode: editCourseCode.trim(),
          type: editType,
          description: editDescription.trim(),
        }),
      });
      const json = await res.json();
      if (json.code === 200) {
        toast.success('资料已更新');
        setResource({ ...resource, ...json.data });
        setIsEditing(false);
      } else {
        toast.error(json.message || '保存失败');
      }
    } catch { toast.error('网络错误'); }
    setSaving(false);
  };

  if (loading) return <div><Header title="资料详情" /><div className="p-4"><Skeleton.Detail /></div></div>;
  if (!resource) return <div><Header title="资料详情" /><p className="text-center text-gray-400 py-20">资料不存在</p></div>;

  return (
    <div>
      <Header
        title="资料详情"
        rightAction={
          resource ? (
            <ShareButton title={resource.title} />
          ) : undefined
        }
      />
      <div className="p-4 md:max-w-2xl md:mx-auto">
        <div className="bg-white dark:bg-[var(--color-card)] rounded-2xl p-5 shadow-sm">
          {isEditing ? (
            /* ---- 编辑模式 ---- */
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">资料标题</label>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={100}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-[var(--color-card-hover)] border border-gray-200 dark:border-[var(--color-border)] text-sm outline-none focus:border-indigo-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">课程名称</label>
                  <input value={editCourseName} onChange={(e) => setEditCourseName(e.target.value)} maxLength={50}
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-[var(--color-card-hover)] border border-gray-200 dark:border-[var(--color-border)] text-sm outline-none focus:border-indigo-400" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">课程编号</label>
                  <input value={editCourseCode} onChange={(e) => setEditCourseCode(e.target.value)} maxLength={30}
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-[var(--color-card-hover)] border border-gray-200 dark:border-[var(--color-border)] text-sm outline-none focus:border-indigo-400" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">资料类型</label>
                <input value={editType} onChange={(e) => setEditType(e.target.value)} maxLength={30} placeholder="如：课件、笔记、试题"
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-[var(--color-card-hover)] border border-gray-200 dark:border-[var(--color-border)] text-sm outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">描述</label>
                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} maxLength={500} rows={3}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-[var(--color-card-hover)] border border-gray-200 dark:border-[var(--color-border)] text-sm outline-none focus:border-indigo-400 resize-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 disabled:opacity-50 transition-colors">
                  <FiSave className="text-sm" /> {saving ? '保存中...' : '保存修改'}
                </button>
                <button onClick={() => setIsEditing(false)} disabled={saving}
                  className="px-4 py-2.5 border border-gray-200 dark:border-[var(--color-border)] text-gray-500 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-[var(--color-card-hover)] transition-colors">
                  <FiX />
                </button>
              </div>
            </div>
          ) : (
          /* ---- 查看模式 ---- */
          <>
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
          {user && (
            <div className="mt-3 flex items-center justify-end gap-2">
              {Number(user.id) === Number(resource.userId) && (
                <button onClick={startEdit}
                  className="text-xs text-indigo-500 hover:text-indigo-600 transition-colors flex items-center gap-1">
                  <FiEdit2 className="text-[10px]" /> 编辑
                </button>
              )}
              <button onClick={() => setShowReport(true)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1">
                <FiFlag className="text-[10px]" /> 举报
              </button>
            </div>
          )}
          </>
          )}
        </div>

        {/* 举报弹窗 */}
        {showReport && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={() => setShowReport(false)}>
            <div className="absolute inset-0 bg-black/30" />
            <div className="relative bg-white dark:bg-[var(--color-card)] rounded-t-2xl md:rounded-2xl w-full md:max-w-sm p-5 z-10" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold mb-3">举报资料</h3>
              <textarea
                placeholder="请描述举报原因（虚假资料、过期内容、侵权等）"
                value={reportReason}
                onChange={e => setReportReason(e.target.value)}
                maxLength={500}
                className="w-full border rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-red-400 dark:bg-gray-800 dark:border-gray-600"
              />
              <div className="flex gap-2 mt-3 justify-end">
                <button onClick={() => { setShowReport(false); setReportReason(''); }}
                  className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  取消
                </button>
                <button onClick={handleReport} disabled={reporting}
                  className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50">
                  {reporting ? '提交中...' : '提交举报'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
