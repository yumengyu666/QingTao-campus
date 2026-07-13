import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Skeleton } from '@/components/common/Skeleton';
import { useAuthStore } from '@/stores/authStore';
import { apiFetch } from '@/utils/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

interface AcceptedPartner {
  nickname: string;
  gender: string;
  wechat: string;
  qq: string;
}

export default function DatingProfilePage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState('secret');
  const [bio, setBio] = useState('');
  const [wechat, setWechat] = useState('');
  const [qq, setQq] = useState('');
  const [avatar, setAvatar] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ postCount: 0, followingCount: 0, followerCount: 0 });

  // Accepted partner(s) — show their contact info
  const [partners, setPartners] = useState<AcceptedPartner[]>([]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      apiFetch('/api/dating/profile').then(r => r.json()),
      apiFetch('/api/dating/posts?pageSize=1').then(r => r.json()),
      apiFetch('/api/dating/following').then(r => r.json()),
    ]).then(([pJson, postsJson, followJson]) => {
        if (pJson.code === 200 && pJson.data) {
          const p = pJson.data;
          setNickname(p.nickname || '');
          setGender(p.gender || 'secret');
          setBio(p.bio || '');
          setWechat(p.contactWechat || '');
          setQq(p.contactQq || '');
          setAvatar(p.customAvatar || '');
          setStats(s => ({ ...s, followerCount: p.followerCount || 0 }));
        }
        if (postsJson.code === 200) setStats(s => ({ ...s, postCount: postsJson.data?.total || 0 }));
        if (followJson.code === 200) setStats(s => ({ ...s, followingCount: (followJson.data || []).length }));
      })
      .catch(() => { toast.error('加载失败'); })
      .finally(() => setLoading(false));
    // Fetch accepted partners
    apiFetch('/api/dating/requests')
      .then(r => r.json())
      .then(json => {
        if (json.code === 200) {
          const list: AcceptedPartner[] = [];
          // Received requests that were accepted: sender's contact is visible
          const received = json.data.received || [];
          received.forEach((r: any) => {
            if (r.status === 'accepted') {
              list.push({ nickname: r.sender.nickname, gender: r.sender.gender, wechat: r.sender.contactWechat || '', qq: r.sender.contactQq || '' });
            }
          });
          // Sent requests that were accepted: receiver's contact is visible
          const sent = json.data.sent || [];
          sent.forEach((r: any) => {
            if (r.status === 'accepted') {
              list.push({ nickname: r.receiver.nickname, gender: r.receiver.gender, wechat: r.receiver.contactWechat || '', qq: r.receiver.contactQq || '' });
            }
          });
          setPartners(list);
        }
      })
      .catch(() => {});
  }, [token]);

  const handleSave = async () => {
    if (!nickname.trim()) { toast.error('请输入昵称'); return; }
    if (nickname.trim().length > 12) { toast.error('昵称最多12字'); return; }
    setSaving(true);
    try {
      const res = await apiFetch('/api/dating/profile', {
        method: 'POST',
        body: JSON.stringify({ nickname, gender, bio, customAvatar: avatar, contactWechat: wechat, contactQq: qq }),
      });
      const json = await res.json();
      if (json.code === 200) { toast.success('保存成功'); navigate(-1); }
      else toast.error(json.message);
    } catch { toast.error('网络错误'); }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error('图片不能超过5MB'); return; }
    setAvatarUploading(true);
    const fd = new FormData();
    fd.append('avatar', f);
    try {
      const res = await apiFetch('/api/upload/avatar', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.code === 200 && json.data?.url) setAvatar(json.data.url);
    } catch { toast.error('上传失败'); }
    setAvatarUploading(false);
  };

  return (
    <div>
      <Header title="恋爱资料" />

      {loading ? (
        <div className="p-4"><Skeleton.Detail /></div>
      ) : (
      <div className="p-4 space-y-5 pb-20">
        {/* Profile Completeness */}
        {(() => {
          const fields = [nickname, bio, avatar, wechat || qq, gender !== 'secret'];
          const score = fields.filter(Boolean).length;
          const pct = Math.round((score / fields.length) * 100);
          const tips = [];
          if (!nickname) tips.push('设置昵称');
          if (!bio) tips.push('写一句个性签名');
          if (!avatar) tips.push('上传头像');
          if (!wechat && !qq) tips.push('填写联系方式');
          if (gender === 'secret') tips.push('选择性别');
          return (
            <div className="bg-white/80 dark:bg-[var(--color-card)]/80 rounded-2xl p-4 border border-gray-100 dark:border-[var(--color-border)]/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">资料完善度</span>
                <span className="text-sm font-bold text-pink-500">{pct}%</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-[var(--color-card-hover)] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-pink-400 to-rose-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              {tips.length > 0 && <p className="text-xs text-gray-400 mt-2">💡 {tips.join('、')}，让更多人认识你</p>}
              {pct === 100 && <p className="text-xs text-green-500 mt-2">✅ 资料已完善，更容易获得关注</p>}
            </div>
          );
        })()}

        {/* Pixel Avatar Preview */}
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-3xl shadow-2xl shadow-pink-300/50 overflow-hidden">
            {avatar ? <img src={avatar} className="w-full h-full object-cover" alt="" loading="lazy" decoding="async" /> : (nickname || '?')[0]}
          </div>
          <p className="text-xs text-gray-400 mt-2">默认像素头像，关注你的人才能看到自定义头像</p>
          <label className="mt-3 text-sm text-pink-500 cursor-pointer hover:text-pink-600 transition-colors">
            {avatarUploading ? '上传中...' : '上传自定义头像'}
            <input type="file" accept="image/*" className="hidden" disabled={avatarUploading} onChange={handleAvatarUpload} />
          </label>
        </div>

        {/* Stats Row */}
        <div className="flex justify-center gap-8 py-3">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-800 dark:text-[var(--color-text)]">{stats.postCount}</p>
            <p className="text-[11px] text-gray-400">动态</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-800 dark:text-[var(--color-text)]">{stats.followingCount}</p>
            <p className="text-[11px] text-gray-400">关注</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-800 dark:text-[var(--color-text)]">{stats.followerCount}</p>
            <p className="text-[11px] text-gray-400">粉丝</p>
          </div>
        </div>

        {/* Accepted Partner Contact Info */}
        {partners.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 rounded-2xl p-4 border border-rose-200/30 dark:border-rose-500/20">
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-3">💕 已解锁联系方式</p>
            {partners.map((p, i) => (
              <div key={i} className={i > 0 ? 'mt-3 pt-3 border-t border-rose-200/30 dark:border-rose-500/10' : ''}>
                <p className="text-sm font-medium text-gray-700 dark:text-[var(--color-text)]">{p.nickname} <span className="text-xs text-gray-400 ml-1">{p.gender === 'male' ? '♂' : p.gender === 'female' ? '♀' : ''}</span></p>
                {p.wechat && <p className="text-xs text-gray-500 mt-1">微信: {p.wechat}</p>}
                {p.qq && <p className="text-xs text-gray-500 mt-0.5">QQ: {p.qq}</p>}
                {!p.wechat && !p.qq && <p className="text-xs text-gray-400 mt-1">对方暂未填写联系方式</p>}
              </div>
            ))}
          </motion.div>
        )}

        {/* Nickname */}
        <div>
          <label className="text-sm font-medium mb-1 block">匿名昵称</label>
          <input value={nickname} onChange={e => setNickname(e.target.value)} maxLength={12} placeholder="取个好听的名字"
            className="w-full px-4 py-3 rounded-xl bg-white/80 dark:bg-[var(--color-card)]/80 backdrop-blur border border-gray-200/50 dark:border-[var(--color-border)]/50 focus:border-pink-400 outline-none" />
        </div>

        {/* Gender */}
        <div>
          <label className="text-sm font-medium mb-2 block">性别</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { k: 'male', l: '♂ 男生', c: 'from-blue-400 to-cyan-500' },
              { k: 'female', l: '♀ 女生', c: 'from-pink-400 to-rose-500' },
              { k: 'secret', l: '🤫 保密', c: 'from-purple-400 to-indigo-500' },
            ].map(({ k, l, c }) => (
              <button key={k} onClick={() => setGender(k)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                  gender === k ? `bg-gradient-to-r ${c} text-white shadow-lg` : 'bg-white/80 dark:bg-[var(--color-card)]/80 text-gray-500'
                }`}>{l}</button>
            ))}
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="text-sm font-medium mb-1 block">个性签名</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={50} rows={2} placeholder="用一句话介绍自己..."
            className="w-full px-4 py-3 rounded-xl bg-white/80 dark:bg-[var(--color-card)]/80 backdrop-blur border border-gray-200/50 dark:border-[var(--color-border)]/50 focus:border-pink-400 outline-none resize-none" />
        </div>

        {/* My Contact Info */}
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-3">🔒 联系方式（对方发送恋爱请求并通过后才可见）</p>
          <div className="space-y-3">
            <input value={wechat} onChange={e => setWechat(e.target.value)} maxLength={50} placeholder="微信（选填）"
              className="w-full px-4 py-3 rounded-xl bg-white/80 dark:bg-[var(--color-card)]/80 backdrop-blur border border-gray-200/50 dark:border-[var(--color-border)]/50 focus:border-pink-400 outline-none" />
            <input value={qq} onChange={e => setQq(e.target.value)} maxLength={20} placeholder="QQ（选填）"
              className="w-full px-4 py-3 rounded-xl bg-white/80 dark:bg-[var(--color-card)]/80 backdrop-blur border border-gray-200/50 dark:border-[var(--color-border)]/50 focus:border-pink-400 outline-none" />
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-medium text-lg shadow-xl shadow-pink-300/50 hover:shadow-2xl hover:shadow-pink-400/50 disabled:opacity-50 transition-all">
          {saving ? '保存中...' : '保存资料'}
        </button>
      </div>
      )}
    </div>
  );
}
