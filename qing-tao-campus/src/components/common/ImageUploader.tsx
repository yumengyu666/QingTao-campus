import { useState, useRef, useEffect } from 'react';
import { FiX, FiLoader, FiUpload, FiAlertCircle, FiMove } from 'react-icons/fi';
import { apiFetch } from '@/utils/api';

interface ImageItem {
  url: string;
  blurredUrl: string;
  reviewId: number;
  status?: 'pending' | 'approved' | 'rejected';
}

export type { ImageItem };

interface Props {
  images: ImageItem[];
  onChange: (images: ImageItem[]) => void;
  max?: number;
  showStatus?: boolean;
}

export function ImageUploader({ images, onChange, max = 9, showStatus = false }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Drag-to-reorder state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!showStatus) return;
    const pending = images.filter((img) => img.status === 'pending');
    if (pending.length === 0) return;

    const poll = async () => {
      const ids = pending.map((img) => img.reviewId).join(',');
      try {
        const res = await apiFetch(`/api/images/status?ids=${ids}`);
        const json = await res.json();
        if (json.code === 200 && Array.isArray(json.data)) {
          const statusMap: Record<number, string> = {};
          json.data.forEach((item: any) => { statusMap[item.id] = item.status; });
          let changed = false;
          const updated = images.map((img) => {
            if (statusMap[img.reviewId] && statusMap[img.reviewId] !== img.status) {
              changed = true;
              return { ...img, status: statusMap[img.reviewId] as 'pending' | 'approved' | 'rejected' };
            }
            return img;
          });
          if (changed) onChange(updated);
        }
      } catch { /* ignore */ }
    };

    poll();
    const timer = setInterval(poll, 5000);
    return () => clearInterval(timer);
  }, [showStatus, images.filter((i) => i.status === 'pending').map((i) => i.reviewId).join(',')]);

  const uploadWithProgress = (formData: FormData): Promise<any> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload/image');
      const token = localStorage.getItem('qingtao_token');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      });
      xhr.addEventListener('load', () => {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch { reject(new Error('Invalid response')); }
      });
      xhr.addEventListener('error', () => reject(new Error('Network error')));
      xhr.send(formData);
    });
  };

  const processFiles = async (fileList: FileList) => {
    const files = Array.from(fileList).slice(0, max - images.length);
    if (files.length === 0) return;
    const oversize = files.find((f) => f.size > 5 * 1024 * 1024);
    if (oversize) { setError(`图片 "${oversize.name}" 超过5MB限制`); return; }
    setError('');
    setUploadProgress(0);
    setUploading(true);
    const formData = new FormData();
    files.forEach((f) => formData.append('images', f));
    try {
      const json = await uploadWithProgress(formData);
      if (json.code === 200 && json.data?.urls) {
        const items: ImageItem[] = json.data.urls.map((u: any) => ({
          url: u.url, blurredUrl: u.blurredUrl, reviewId: u.reviewId, status: 'pending' as const,
        }));
        onChange([...images, ...items]);
      }
    } catch { setError('上传失败，请重试'); }
    setUploading(false);
    setUploadProgress(0);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleAdd = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) processFiles(e.target.files); };
  const handleRemove = (idx: number) => { onChange(images.filter((_, i) => i !== idx)); setError(''); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files) processFiles(e.dataTransfer.files); };

  // Reorder drag handlers
  const handleReorderDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleReorderDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleReorderDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleReorderDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newImages = [...images];
    const [moved] = newImages.splice(dragIndex, 1);
    newImages.splice(targetIndex, 0, moved);
    onChange(newImages);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleReorderDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2.5">
        {images.map((img, i) => {
          const isPending = showStatus && img.status === 'pending';
          const isRejected = showStatus && img.status === 'rejected';
          const displayUrl = isPending ? img.blurredUrl : img.url;
          const isDragging = dragIndex === i;
          const isOver = dragOverIndex === i;

          return (
            <div key={i}
              draggable
              onDragStart={(e) => handleReorderDragStart(e, i)}
              onDragOver={(e) => handleReorderDragOver(e, i)}
              onDragLeave={handleReorderDragLeave}
              onDrop={(e) => handleReorderDrop(e, i)}
              onDragEnd={handleReorderDragEnd}
              className={`relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-[var(--color-card-hover)] group cursor-grab active:cursor-grabbing transition-all ${
                isDragging ? 'opacity-40 scale-90' : ''
              } ${isOver ? 'ring-2 ring-indigo-400 scale-105' : ''}`}
            >
              <img src={displayUrl} alt="" className={`w-full h-full object-cover ${isPending ? 'blur-sm' : ''}`} loading="lazy" />
              {isPending && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <span className="text-[9px] text-white bg-black/50 px-1.5 py-0.5 rounded">待审核</span>
                </div>
              )}
              {isRejected && (
                <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                  <span className="text-[9px] text-white bg-red-500 px-1.5 py-0.5 rounded">已拒绝</span>
                </div>
              )}
              {/* Reorder handle */}
              <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-md bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <FiMove className="text-white text-[10px]" />
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <button onClick={() => handleRemove(i)} className="w-6 h-6 rounded-full bg-white/90 text-gray-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white">
                  <FiX className="text-xs" />
                </button>
              </div>
            </div>
          );
        })}

        {images.length < max && (
          <label
            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
            className={`w-20 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer select-none ${
              dragOver ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 scale-105'
                : uploading ? 'border-indigo-200 bg-indigo-50/50 dark:bg-indigo-900/10 cursor-wait'
                : 'border-gray-200 dark:border-[var(--color-border)] hover:border-indigo-300 dark:hover:border-indigo-500'
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-1">
                <FiLoader className="text-lg text-indigo-400 animate-spin" />
                <span className="text-[10px] text-indigo-400 font-medium">{uploadProgress}%</span>
              </div>
            ) : (
              <>
                <FiUpload className="text-lg text-gray-400" />
                <span className="text-[10px] text-gray-400 mt-0.5">{images.length}/{max}</span>
              </>
            )}
            <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleAdd} disabled={uploading} className="hidden" />
          </label>
        )}
      </div>

      {uploading && uploadProgress > 0 && (
        <div className="mt-2 w-full h-1.5 bg-gray-200 dark:bg-[var(--color-card-hover)] rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
        </div>
      )}

      {error && <p className="flex items-center gap-1.5 text-xs text-red-500 mt-2"><FiAlertCircle />{error}</p>}
      <p className="text-xs text-gray-400 mt-2">支持拖拽上传和排序，单张不超过5MB，最多{max}张{showStatus ? ' · 上传后需管理员审核' : ''}</p>
    </div>
  );
}
