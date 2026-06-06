import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { validatePassword } from '@/utils/validators';
import { apiFetch } from '@/utils/api';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (!oldPwd) { toast.error('请输入旧密码'); return; }
    const err = validatePassword(newPwd);
    if (err) { toast.error(err); return; }
    if (newPwd !== confirmPwd) { toast.error('两次密码不一致'); return; }

    setLoading(true);
    try {
      const res = await apiFetch('/api/users/password', {
        method: 'PUT',
        body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd }),
      });
      const json = await res.json();
      if (json.code === 200) {
        toast.success('密码修改成功，请重新登录');
        logout();
        navigate('/login');
      } else {
        toast.error(json.message || '修改失败');
      }
    } catch {
      toast.error('网络错误');
    }
    setLoading(false);
  };

  return (
    <div>
      <Header title="修改密码" />
      <div className="p-4 md:p-0 space-y-4 mt-4">
        <input type="password" placeholder="旧密码" value={oldPwd}
          onChange={(e) => setOldPwd(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] focus:border-indigo-500 outline-none transition-colors" />
        <input type="password" placeholder="新密码（至少6位）" value={newPwd}
          onChange={(e) => setNewPwd(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] focus:border-indigo-500 outline-none transition-colors" />
        <input type="password" placeholder="确认新密码" value={confirmPwd}
          onChange={(e) => setConfirmPwd(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleChange()}
          className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[var(--color-card)] border border-gray-200 dark:border-[var(--color-border)] focus:border-indigo-500 outline-none transition-colors" />
        <button onClick={handleChange} disabled={loading}
          className="w-full py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 disabled:opacity-50 transition-colors">
          {loading ? '修改中...' : '确认修改'}
        </button>
      </div>
    </div>
  );
}
