import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/common/Pagination';
import { EndOfList } from '@/components/common/EndOfList';
import { useAuthStore } from '@/stores/authStore';
import { apiFetch } from '@/utils/api';
import { formatTime } from '@/utils/format';
import { FiBookOpen, FiDownload, FiUpload, FiX, FiHeart } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const TYPES = [
  { key: '', label: '全部', color: 'bg-gray-100 dark:bg-[var(--color-card-hover)] text-gray-600 dark:text-[var(--color-text-secondary)]' },
  { key: 'exam', label: '📝 试卷', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
  { key: 'note', label: '📒 笔记', color: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' },
  { key: 'mindmap', label: '🧠 思维导图', color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' },
  { key: 'report', label: '📋 实验报告', color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' },
  { key: 'other', label: '📁 其他', color: 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400' },
];

const TYPE_MAP: Record<string, string> = {
  exam: '📝 试卷', note: '📒 笔记', mindmap: '🧠 思维导图', report: '📋 实验报告', other: '📁 其他',
};

export default function ResourceListPage() {
  const navigate = useNavigate();
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const currentUser = useAuthStore((s) => s.user);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sort, setSort] = useState<'hot' | 'newest'>('hot');
  const [showUpload, setShowUpload] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [editData, setEditData] = useState<any>(null);

  const fetchList = async (p: number, s: string, t: string, st: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: '20' });
      if (s) params.set('courseName', s);
      if (t) params.set('type', t);
      if (st) params.set('sort', st);
      const res = await apiFetch(`/api/resources?${params.toString()}`);
      const json = await res.json();
      if (json.code === 200) {
        setResources(json.data.list || []);
        setTotal(json.data.total || 0);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchList(page, search, typeFilter, sort); }, [page, typeFilter, sort]);

  const handleSearch = () => { setPage(1); fetchList(1, search, typeFilter, sort); };

  const handleCardClick = async (id: number) => {
    try {
      const res = await apiFetch(`/api/resources/${id}`);
      const json = await res.json();
      if (json.code === 200) setDetail(json.data);
    } catch { toast.error('加载失败'); }
  };

  return (
    <div>
      <Header title="考试资料" />

      <div className="px-4 pb-24 pt-2 max-w-2xl mx-auto">

        {/* Search */}
        <div className="flex gap-2 mb-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
            placeholder="搜索课程名..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] text-sm outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
          />
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleSearch}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-sky-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-200/30">
            搜索
          </motion.button>
        </div>

        {/* Type filter */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {TYPES.map(({ key, label, color }) => (
            <button key={key} onClick={() => { setTypeFilter(key); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                typeFilter === key
                  ? 'bg-blue-500 text-white shadow'
                  : `${color} hover:opacity-80`
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Sort toggle */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-gray-400">排序：</span>
          <button onClick={() => { setSort('hot'); setPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${sort === 'hot' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-[var(--color-card-hover)] text-gray-500'}`}>
            🔥 热门
          </button>
          <button onClick={() => { setSort('newest'); setPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${sort === 'newest' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-[var(--color-card-hover)] text-gray-500'}`}>
            🕐 最新
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white dark:bg-[var(--color-card)] rounded-2xl p-4 animate-pulse">
                <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-[var(--color-card-hover)]" /><div className="space-y-2 flex-1"><div className="h-4 bg-gray-100 dark:bg-[var(--color-card-hover)]/50 rounded w-3/4" /><div className="h-3 bg-gray-100 dark:bg-[var(--color-card-hover)]/50 rounded w-1/2" /></div></div>
              </div>
            ))}
          </div>
        ) : resources.length === 0 ? (
          <EmptyState message="暂无资料" description={search ? `没有找到"${search}"相关的资料` : '还没有人上传资料，来当第一个吧'} icon={<FiBookOpen className="text-3xl text-gray-300 dark:text-gray-600" />} />
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {resources.map((r, i) => (
                <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  onClick={() => handleCardClick(r.id)}
                  className="bg-white dark:bg-[var(--color-card)] rounded-2xl p-4 shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-[var(--color-border)]/50 cursor-pointer active:scale-[0.98]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-sky-100 dark:from-blue-900/30 dark:to-sky-900/30 flex items-center justify-center text-lg flex-shrink-0">
                      {TYPE_MAP[r.type]?.[0] || '📁'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{r.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{r.courseName}</span>
                        {r.courseCode && <span className="text-[10px] text-gray-300">{r.courseCode}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 flex-shrink-0">
                      {currentUser && r.userId === currentUser.id && (
                        <button onClick={(e) => { e.stopPropagation(); setEditData({ ...r }); }}
                          className="px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 text-[11px] hover:bg-indigo-100 transition-colors">
                          编辑
                        </button>
                      )}
                      <button onClick={async (e) => { e.stopPropagation(); try { const res = await apiFetch(`/api/resources/${r.id}/like`, { method: 'POST' }); const json = await res.json(); if (json.code === 200) { toast(json.message); fetchList(page, search, typeFilter, sort); } } catch {} }}
                        className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-400 transition-colors">
                        <FiHeart className="text-[10px]" /> {r.likeCount || 0}
                      </button>
                      <span className="px-2 py-1 rounded-full bg-gray-50 dark:bg-[var(--color-card-hover)]/50 text-[11px]">{TYPE_MAP[r.type] || r.type}</span>
                      <span className="flex items-center gap-1"><FiDownload className="text-[10px]" /> {r.downloadCount}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination */}
        <Pagination page={page} total={total} onPageChange={(p) => { setPage(p); fetchList(p, search, typeFilter, sort); }} />
        {!loading && resources.length > 0 && <EndOfList />}
      </div>

      {/* Upload FAB — only if logged in */}
      {isAuth && (
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.85 }}
          onClick={() => setShowUpload(true)}
          className="fixed bottom-20 right-5 w-14 h-14 bg-gradient-to-br from-blue-500 to-sky-500 text-white rounded-2xl shadow-2xl shadow-blue-300/50 flex items-center justify-center text-2xl z-30">
          <FiUpload />
        </motion.button>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {showUpload && <UploadModal onClose={() => setShowUpload(false)} onDone={() => { setShowUpload(false); fetchList(page, search, typeFilter, sort); }} />}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {detail && <DetailModal data={detail} onClose={() => setDetail(null)} />}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editData && <EditModal data={editData} onClose={() => setEditData(null)} onDone={() => { setEditData(null); fetchList(page, search, typeFilter, sort); }} />}
      </AnimatePresence>
    </div>
  );
}

function UploadModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('other');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) { toast.error('文件不能超过20MB'); return; }
    setFileName(f.name);
    setUploading(true);
    const fd = new FormData();
    fd.append('file', f);
    try {
      const res = await apiFetch('/api/upload/file', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.code === 200 && json.data?.url) {
        setFileUrl(json.data.url);
        toast.success(`上传成功 (${(f.size / 1024).toFixed(0)}KB)`);
      } else if (res.status === 401) {
        toast.error('请先登录');
      } else {
        toast.error(json.message || '上传失败');
      }
    } catch (e: any) { toast.error(e?.message || '网络错误，请重试'); }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!courseName.trim()) { toast.error('请输入课程名称'); return; }
    if (!title.trim()) { toast.error('请输入资料标题'); return; }
    if (!fileUrl) { toast.error('请上传文件'); return; }
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/resources', {
        method: 'POST',
        body: JSON.stringify({
          courseName: courseName.trim(),
          courseCode: courseCode.trim(),
          title: title.trim(),
          type,
          description: description.trim(),
          fileUrl,
          fileSize: null,
        }),
      });
      const json = await res.json();
      if (json.code === 201) { toast.success('上传成功'); onDone(); }
      else toast.error(json.message);
    } catch { toast.error('网络错误'); }
    setSubmitting(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
        className="bg-white dark:bg-[var(--color-card)] rounded-t-3xl md:rounded-3xl w-full md:max-w-md max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg">上传资料</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <FiX className="text-gray-400" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">课程名称 *</label>
            <input value={courseName} onChange={e => setCourseName(e.target.value)} maxLength={50} placeholder="如：高等数学"
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-[var(--color-card-hover)] text-sm outline-none focus:ring-2 focus:ring-blue-400/50" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">课程代码</label>
            <input value={courseCode} onChange={e => setCourseCode(e.target.value)} maxLength={20} placeholder="如：MATH101"
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-[var(--color-card-hover)] text-sm outline-none focus:ring-2 focus:ring-blue-400/50" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">资料标题 *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={100} placeholder="如：2023年期末试卷"
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-[var(--color-card-hover)] text-sm outline-none focus:ring-2 focus:ring-blue-400/50" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">类型</label>
            <div className="grid grid-cols-3 gap-1.5">
              {TYPES.filter(t => t.key).map(({ key, label }) => (
                <button key={key} onClick={() => setType(key)}
                  className={`py-2 rounded-xl text-xs font-medium transition-all ${type === key ? 'bg-blue-500 text-white' : 'bg-gray-50 dark:bg-[var(--color-card-hover)] text-gray-500'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">描述</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={500} rows={2} placeholder="选填"
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-[var(--color-card-hover)] text-sm outline-none resize-none focus:ring-2 focus:ring-blue-400/50" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">文件 *</label>
            <label className="block">
              <div className={`px-4 py-3 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all ${
                fileUrl ? 'border-green-300 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 dark:border-[var(--color-border)] hover:border-blue-300'
              }`}>
                {uploading ? '上传中...' : fileUrl ? `✅ ${fileName}` : '📎 点击选择文件'}
              </div>
              <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.txt,.md,.csv" />
            </label>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-[var(--color-border)] text-sm font-medium">取消</button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleSubmit} disabled={submitting}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-sky-500 text-white text-sm font-semibold shadow-lg disabled:opacity-40">
            {submitting ? '提交中...' : '发布资料'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DetailModal({ data, onClose }: { data: any; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
        className="relative bg-white dark:bg-[var(--color-card)] rounded-t-3xl md:rounded-3xl w-full md:max-w-md max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-[var(--color-card-hover)] flex items-center justify-center hover:bg-gray-200 dark:hover:bg-[var(--color-card-hover)] transition-colors">
          <FiX className="text-sm" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">{TYPE_MAP[data.type] || data.type}</span>
          {data.courseCode && <span className="text-xs text-gray-400">{data.courseCode}</span>}
        </div>

        <h2 className="text-lg font-bold mb-1">{data.title}</h2>
        <p className="text-sm text-gray-500 mb-2">{data.courseName}</p>

        {data.description && (
          <p className="text-sm text-gray-600 dark:text-[var(--color-text-secondary)] mb-4 bg-gray-50 dark:bg-[var(--color-card-hover)]/50 rounded-xl p-3">{data.description}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
          <span>上传者: {data.user?.nickname || '未知'}</span>
          <span className="flex items-center gap-1"><FiDownload className="text-[10px]" /> {data.downloadCount} 次下载</span>
          <span>{formatTime(data.createdAt)}</span>
        </div>

        <a href={data.fileUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-blue-500 to-sky-500 text-white rounded-2xl font-semibold text-sm shadow-lg shadow-blue-200/30 hover:shadow-xl transition-all">
          <FiDownload /> 下载文件
        </a>
      </motion.div>
    </motion.div>
  );
}

function EditModal({ data, onClose, onDone }: { data: any; onClose: () => void; onDone: () => void }) {
  const [courseName, setCourseName] = useState(data.courseName || '');
  const [courseCode, setCourseCode] = useState(data.courseCode || '');
  const [title, setTitle] = useState(data.title || '');
  const [type, setType] = useState(data.type || 'other');
  const [description, setDescription] = useState(data.description || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    if (!courseName.trim()) { toast.error('请输入课程名称'); return; }
    if (!title.trim()) { toast.error('请输入资料标题'); return; }
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/resources/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify({ courseName: courseName.trim(), courseCode: courseCode.trim(), title: title.trim(), type, description: description.trim() }),
      });
      const json = await res.json();
      if (json.code === 200) { toast.success('修改成功'); onDone(); }
      else toast.error(json.message);
    } catch { toast.error('网络错误'); }
    setSubmitting(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
        className="bg-white dark:bg-[var(--color-card)] rounded-t-2xl md:rounded-2xl w-full md:max-w-md p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">编辑资料</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <FiX className="text-gray-400" />
          </button>
        </div>
        <div className="space-y-3">
          <input value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="课程名称" className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-[var(--color-card-hover)] text-sm outline-none" />
          <input value={courseCode} onChange={e => setCourseCode(e.target.value)} placeholder="课程代码（选填）" className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-[var(--color-card-hover)] text-sm outline-none" />
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="资料标题" className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-[var(--color-card-hover)] text-sm outline-none" />
          <select value={type} onChange={e => setType(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-[var(--color-card-hover)] text-sm outline-none">
            <option value="exam">📝 试卷</option>
            <option value="note">📒 笔记</option>
            <option value="mindmap">🧠 思维导图</option>
            <option value="report">📋 实验报告</option>
            <option value="other">📁 其他</option>
          </select>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="描述（选填）" rows={2} maxLength={500} className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-[var(--color-card-hover)] text-sm outline-none resize-none" />
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-[var(--color-border)] text-sm">取消</button>
          <button onClick={handleSave} disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-medium disabled:opacity-50">{submitting ? '保存中...' : '保存'}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
