import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import { FiImage, FiVideo, FiMapPin, FiSend, FiPlay, FiX } from 'react-icons/fi';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { apiFetch } from '@/utils/api';
import toast from 'react-hot-toast';

export default function NoteEditorPage() {
  const navigate = useNavigate();
  const nav = useAppNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoCover, setVideoCover] = useState('');
  const [videoDuration, setVideoDuration] = useState(0);
  const [location, setLocation] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    if (images.length + files.length > 9) {
      toast.error('最多上传9张图片');
      return;
    }

    setUploading(true);
    const fd = new FormData();
    Array.from(files).forEach(f => fd.append('images', f));

    try {
      const res = await apiFetch('/api/upload/image', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.code === 200) {
        const urls = (json.data?.urls || []).map((u: any) => u.url || u);
        setImages(prev => [...prev, ...urls].slice(0, 9));
      }
    } catch { toast.error('上传失败'); }
    setUploading(false);
    e.target.value = '';
  };

  const removeImage = (idx: number) => setImages(prev => prev.filter((_, i) => i !== idx));

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) { toast.error('视频不能超过100MB'); return; }
    setUploadingVideo(true);
    const fd = new FormData();
    fd.append('video', file);
    try {
      const res = await apiFetch('/api/upload/video', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.code === 200) {
        const url = json.data?.url || json.data?.fileUrl || '';
        setVideoUrl(url);
        // 生成封面
        const v = document.createElement('video');
        v.src = url;
        v.preload = 'metadata';
        v.onloadedmetadata = () => {
          v.currentTime = 1;
          setVideoDuration(Math.round(v.duration || 0));
        };
        v.onseeked = () => {
          const c = document.createElement('canvas');
          c.width = v.videoWidth || 360;
          c.height = v.videoHeight || 640;
          c.getContext('2d')?.drawImage(v, 0, 0);
          setVideoCover(c.toDataURL('image/jpeg', 0.8));
        };
      }
    } catch { toast.error('视频上传失败'); }
    setUploadingVideo(false);
    e.target.value = '';
  };

  const removeVideo = () => { setVideoUrl(''); setVideoCover(''); setVideoDuration(0); };

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '');
    if (!t) return;
    if (tags.length >= 5) { toast.error('最多5个标签'); return; }
    if (tags.includes(t)) return;
    setTags(prev => [...prev, t]);
    setTagInput('');
  };

  const publish = async () => {
    if (!title.trim()) { toast.error('请输入标题'); return; }
    setPublishing(true);
    try {
      const res = await apiFetch('/api/notes', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(), content, images,
          postType: videoUrl ? 'video' : 'note',
          videoUrl: videoUrl || undefined,
          videoCover: videoCover || undefined,
          videoDuration: videoDuration || undefined,
          location, tags,
        }),
      });
      const json = await res.json();
      if (json.code === 201 || json.code === 200) {
        toast.success('发布成功');
        nav('/explore', { replace: true });
      } else {
        toast.error(json.message || '发布失败');
      }
    } catch { toast.error('发布失败'); }
    setPublishing(false);
  };

  return (
    <div className="min-h-screen bg-[var(--color-card)]">
      <MobileHeader
        title="发布笔记"
        rightAction={
          <button onClick={publish} disabled={!title.trim() || publishing}
            className="px-4 py-1.5 bg-[var(--color-explore-accent)] text-white text-sm rounded-full font-medium disabled:opacity-40">
            {publishing ? '发布中...' : '发布'}
          </button>
        }
      />

      <div className="p-4">
        {/* Media：图片 + 视频 */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {/* Video preview */}
          {videoUrl && (
            <div className="relative flex-shrink-0">
              <video src={videoUrl} className="w-20 h-20 rounded-lg object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                <FiPlay className="text-white text-xl" />
              </div>
              <button onClick={removeVideo}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white text-[10px]">✕</button>
            </div>
          )}
          {/* Image previews */}
          {images.map((url, i) => (
            <div key={i} className="relative flex-shrink-0">
              <img src={url} alt="" className="w-20 h-20 rounded-lg object-cover" />
              <button onClick={() => removeImage(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white text-[10px]">✕</button>
            </div>
          ))}
          {/* Add image button */}
          {!videoUrl && images.length < 9 && (
            <label className={`w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center cursor-pointer flex-shrink-0 ${uploading ? 'opacity-50' : ''}`}>
              {uploading ? <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                : <><FiImage className="text-xl text-gray-400" /><span className="text-[10px] text-gray-400 mt-0.5">图片</span></>}
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
          )}
          {/* Add video button */}
          {!videoUrl && images.length === 0 && (
            <label className={`w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center cursor-pointer flex-shrink-0 ${uploadingVideo ? 'opacity-50' : ''}`}>
              {uploadingVideo ? <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                : <><FiVideo className="text-xl text-gray-400" /><span className="text-[10px] text-gray-400 mt-0.5">视频</span></>}
              <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} disabled={uploadingVideo} />
            </label>
          )}
        </div>

        {/* Title */}
        <textarea value={title} onChange={e => setTitle(e.target.value.slice(0, 100))}
          placeholder="添加标题..."
          rows={2}
          className="w-full text-lg font-semibold bg-transparent outline-none resize-none text-gray-900 dark:text-gray-100 placeholder-gray-400 mb-2" />

        {/* Content */}
        <textarea value={content} onChange={e => setContent(e.target.value.slice(0, 2000))}
          placeholder="分享你的校园生活..."
          rows={8}
          className="w-full text-sm bg-transparent outline-none resize-none text-gray-700 dark:text-gray-300 placeholder-gray-400 leading-relaxed" />

        {/* Tags */}
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full">
                #{tag}
                <button onClick={() => setTags(prev => prev.filter(t => t !== tag))} className="text-blue-400">✕</button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              placeholder="添加话题..."
              maxLength={20}
              className="flex-1 text-sm bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-1.5 outline-none text-gray-700 dark:text-gray-300" />
            <button onClick={addTag} className="text-sm text-blue-500 font-medium">添加</button>
          </div>
        </div>

        {/* Location */}
        <div className="mt-4">
          <input value={location} onChange={e => setLocation(e.target.value)}
            placeholder="添加地点..."
            maxLength={50}
            className="w-full text-sm bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-1.5 outline-none text-gray-700 dark:text-gray-300" />
        </div>
      </div>
    </div>
  );
}
