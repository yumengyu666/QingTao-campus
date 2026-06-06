import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { useAuthStore } from '@/stores/authStore';
import { CAMPUS_OPTIONS } from '@/types/category';
import { apiFetch } from '@/utils/api';
import toast from 'react-hot-toast';

export default function EditProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);

  const [nickname, setNickname] = useState(user?.nickname || '');
  const [wechat, setWechat] = useState(user?.wechat || '');
  const [qq, setQq] = useState(user?.qq || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [campus, setCampus] = useState(user?.campusArea || '');
  const [avatar, setAvatar] = useState(user?.avatarUrl || '');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Only show status badge for fields with actual pending changes
  const [pendingFields, setPendingFields] = useState<string[]>([]);

  useEffect(() => {
    apiFetch('/api/users/profile/changes').then(res => res.json()).then(json => {
      if (json.code === 200) {
        const fields = (json.data || [])
          .filter((c: any) => c.status === 'pending')
          .map((c: any) => c.fieldName);
        setPendingFields(fields);
      }
    }).catch(() => {});
  }, []);

  const reviewStatus = (field: string): string | null => {
    if (pendingFields.includes(field)) return 'pending';
    // Don't show "已通过" for fields that haven't been submitted
    return null;
  };

  const handleSave = async () => {
    const changed: Record<string, string> = {};
    if (nickname !== (user?.nickname || '')) changed.nickname = nickname;
    if (wechat !== (user?.wechat || '')) changed.wechat = wechat;
    if (qq !== (user?.qq || '')) changed.qq = qq;
    if (bio !== (user?.bio || '')) changed.bio = bio;
    if (campus !== (user?.campusArea || '')) changed.campusArea = campus;
    if (avatar !== (user?.avatarUrl || '')) changed.avatarUrl = avatar;

    if (Object.keys(changed).length === 0) {
      toast.error('未检测到任何修改');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch('/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify(changed),
      });
      const json = await res.json();
      if (json.code === 200) {
        if (user) {
          setAuth(token!, { ...user, ...changed });
        }
        toast.success(json.message || '资料修改已提交');
        // Reload pending status
        const changesRes = await apiFetch('/api/users/profile/changes');
        const changesJson = await changesRes.json();
        if (changesJson.code === 200) {
          setPendingFields((changesJson.data || []).filter((c: any) => c.status === 'pending').map((c: any) => c.fieldName));
        }
      } else {
        toast.error(json.message || '保存失败');
      }
    } catch {
      toast.error('网络错误');
    }
    setSubmitting(false);
  };

  const statusBadge = (field: string) => {
    const s = reviewStatus(field);
    if (!s) return null; // Don't show badge for unchanged fields
    return (
      <span className={`ml-2 px-1.5 py-0.5 rounded text-xs text-white ${
        s === 'pending' ? 'bg-yellow-500' : 'bg-green-500'
      }`}>
        {s === 'pending' ? '审核中' : '已通过'}
      </span>
    );
  };

  return (
    <div>
      <Header title="编辑资料" />
      <div className="p-4 space-y-5">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-3xl font-medium overflow-hidden">
            {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : (nickname || user?.username || '?')[0]}
          </div>
          <label className="mt-2 text-sm text-indigo-500 cursor-pointer hover:text-indigo-600 transition-colors">
            {avatarUploading ? '上传中...' : '更换头像'}
            <input type="file" accept="image/*" className="hidden" disabled={avatarUploading} onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 5 * 1024 * 1024) { toast.error('图片不能超过5MB'); return; }
              setAvatarUploading(true);
              const fd = new FormData();
              fd.append('avatar', f);
              try {
                const res = await apiFetch('/api/upload/avatar', { method: 'POST', body: fd });
                const json = await res.json();
                if (json.code === 200 && json.data?.url) {
                  setAvatar(json.data.url);
                  toast.success('头像已更新');
                }
              } catch { toast.error('上传失败'); }
              setAvatarUploading(false);
            }} />
          </label>
        </div>

        {/* Nickname */}
        <div>
          <label className="text-sm font-medium mb-1 block">昵称</label>
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20}
            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] focus:border-indigo-500 outline-none" />
          <p className="text-xs mt-1">
            当前展示：{user?.nickname || '(空)'}
            {statusBadge('nickname')}
          </p>
        </div>

        {/* Wechat */}
        <div>
          <label className="text-sm font-medium mb-1 block">微信</label>
          <input value={wechat} onChange={(e) => setWechat(e.target.value)} maxLength={50} placeholder="选填"
            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] focus:border-indigo-500 outline-none" />
          <p className="text-xs mt-1">
            当前展示：{user?.wechat || '(空)'}
            {statusBadge('wechat')}
          </p>
        </div>

        {/* QQ */}
        <div>
          <label className="text-sm font-medium mb-1 block">QQ</label>
          <input value={qq} onChange={(e) => setQq(e.target.value)} maxLength={20} placeholder="选填"
            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] focus:border-indigo-500 outline-none" />
          <p className="text-xs mt-1">
            当前展示：{user?.qq || '(空)'}
            {statusBadge('qq')}
          </p>
        </div>

        {/* Bio */}
        <div>
          <label className="text-sm font-medium mb-1 block">个人简介</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={100} rows={3} placeholder="介绍一下自己..."
            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] focus:border-indigo-500 outline-none resize-none" />
          <p className="text-xs mt-1">
            当前展示：{user?.bio || '(空)'}
            {statusBadge('bio')}
          </p>
          <p className="text-xs text-gray-400 text-right">{bio.length}/100</p>
        </div>

        {/* Campus */}
        <div>
          <label className="text-sm font-medium mb-2 block">所在校区</label>
          <div className="flex gap-2">
            <button onClick={() => setCampus('')} className={`px-4 py-2 rounded-lg text-sm ${!campus ? 'bg-indigo-500 text-white' : 'bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)]'}`}>未设置</button>
            {CAMPUS_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setCampus(opt.value)}
                className={`px-4 py-2 rounded-lg text-sm ${campus === opt.value ? 'bg-indigo-500 text-white' : 'bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)]'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleSave} disabled={submitting}
          className="w-full py-3.5 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 disabled:opacity-50 transition-colors">
          {submitting ? '保存中...' : '保存修改'}
        </button>
        <p className="text-xs text-gray-400 text-center -mt-2">修改后立即生效</p>
      </div>
    </div>
  );
}
