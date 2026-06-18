import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { validateUsername, validatePassword } from '@/utils/validators';
import { apiFetch } from '@/utils/api';
import { MathCaptcha } from '@/components/common/MathCaptcha';
import { FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [captchaId, setCaptchaId] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaReady, setCaptchaReady] = useState(false);
  const [captchaRefreshKey, setCaptchaRefreshKey] = useState(0);

  const canSubmit = username && password && confirmPwd && agreed && captchaReady;

  const handleCaptchaReady = useCallback((id: string, ans: string) => {
    setCaptchaId(id);
    setCaptchaAnswer(ans);
    setCaptchaReady(true);
  }, []);

  const handleCaptchaChange = useCallback(() => {
    setCaptchaReady(false);
  }, []);

  const handleRegister = async () => {
    const err = validateUsername(username) || validatePassword(password);
    if (err) { toast.error(err); return; }
    if (password !== confirmPwd) { toast.error('两次密码不一致'); return; }
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) { toast.error('请输入正确的手机号'); return; }
    if (!agreed) { toast.error('请阅读并同意用户责任告知书'); return; }
    if (!captchaReady) { toast.error('请完成安全验证'); return; }
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, phone: phone || undefined, captchaId, captchaAnswer }),
      });
      const json = await res.json();
      if (json.code !== 201 && json.code !== 200) {
        toast.error(json.message || '注册失败');
        setCaptchaReady(false);
        setCaptchaRefreshKey(k => k + 1);
        setLoading(false);
        return;
      }
      const { token, refreshToken, user } = json.data;
      setAuth(token, user, refreshToken);
      toast.success('注册成功');
      const preferLg = localStorage.getItem('prefer_lg') === '1';
      navigate(preferLg ? '/lg/' : '/', { replace: true });
    } catch {
      toast.error('网络错误');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex justify-center items-center relative overflow-hidden"
      style={{
        background: 'linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)',
        backgroundSize: '400% 400%',
        animation: 'gradientBG 15s ease infinite',
      }}>
      <style>{`
        @keyframes gradientBG {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <div className="absolute w-[300px] h-[300px] rounded-full bg-white/10 -top-[100px] -left-[100px]"
        style={{ backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }} />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-white/10 -bottom-[150px] -right-[100px]"
        style={{ backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }} />

      <div className="relative z-10 w-[90%] max-w-[420px] px-[30px] py-10 sm:px-10 rounded-[20px] max-h-[95dvh] overflow-y-auto"
        style={{
          background: 'rgba(255,255,255,0.15)',
          boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
          backdropFilter: 'blur(15px)',
          WebkitBackdropFilter: 'blur(15px)',
          border: '1px solid rgba(255,255,255,0.3)',
        }}>

        <div className="text-center mb-[30px]">
          <h1 className="text-white text-[28px] tracking-[2px] font-semibold" style={{ letterSpacing: '2px' }}>注册轻淘</h1>
          <p className="text-white/80 text-sm tracking-[1px] mt-[5px]" style={{ letterSpacing: '1px' }}>郑州轻工业大学 · 校园二手交易</p>
        </div>

        <form onSubmit={e => e.preventDefault()}>
          <div className="mb-5 relative">
            <input type="text" placeholder="用户名" value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-5 py-[15px] rounded-xl text-white text-[15px] outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
              onFocus={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(255,255,255,0.1)'; }}
              onBlur={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          <div className="mb-5 relative">
            <input type="password" placeholder="密码（至少6位）" value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-5 py-[15px] rounded-xl text-white text-[15px] outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
              onFocus={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(255,255,255,0.1)'; }}
              onBlur={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          <div className="mb-5 relative">
            <input type="password" placeholder="确认密码" value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              className="w-full px-5 py-[15px] rounded-xl text-white text-[15px] outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
              onFocus={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(255,255,255,0.1)'; }}
              onBlur={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          <div className="mb-5 relative">
            <input type="tel" placeholder="手机号（选填，用于账号找回）" value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              className="w-full px-5 py-[15px] rounded-xl text-white text-[15px] outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
              onFocus={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(255,255,255,0.1)'; }}
              onBlur={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          <div className="mb-5 relative">
            <div className="w-full px-5 py-[11px] rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <MathCaptcha onCaptchaReady={handleCaptchaReady} onCaptchaChange={handleCaptchaChange} className="text-white" refreshKey={captchaRefreshKey} />
            </div>
          </div>

          <div className="flex items-start gap-2 cursor-pointer mb-5 text-white/80 text-sm" onClick={() => { if (agreed) { setAgreed(false); } else { setShowDisclaimer(true); }}}>
            <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${agreed ? 'bg-white border-white' : 'border-white/40'}`}>
              {agreed && (
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" style={{ color: '#e73c7e' }}>
                  <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span>
              我已阅读并同意
              <span className="underline mx-0.5 cursor-pointer hover:opacity-80" onClick={e => { e.stopPropagation(); setShowDisclaimer(true); }}>《用户责任告知书》</span>
            </span>
          </div>

          <button onClick={handleRegister} disabled={!canSubmit || loading}
            className="w-full py-[15px] mt-[10px] rounded-xl text-base font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: '#ffffff', color: '#333', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }}
            onMouseEnter={e => { if (canSubmit) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)'; }}}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)'; }}
          >
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <div className="text-center mt-5">
          <Link to="/login" className="text-white/80 text-[13px] no-underline hover:text-white hover:underline transition-all">
            已有账号？去登录
          </Link>
        </div>
      </div>

      {/* Disclaimer Modal — 完整版，8秒倒计时 */}
      {showDisclaimer && (
        <DisclaimerModal onAgree={() => { setAgreed(true); setShowDisclaimer(false); }} onClose={() => setShowDisclaimer(false)} />
      )}
    </div>
  );
}

function DisclaimerModal({ onAgree, onClose }: { onAgree: () => void; onClose: () => void }) {
  const [countdown, setCountdown] = useState(8);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white dark:bg-[var(--color-card)] rounded-t-2xl md:rounded-2xl w-full md:max-w-md max-h-[80dvh] overflow-y-auto p-6 z-10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">用户责任告知书</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <FiX className="text-gray-400" />
          </button>
        </div>

        <div className="text-sm text-gray-600 dark:text-[var(--color-text-secondary)] space-y-3 leading-relaxed">
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs p-3 rounded-lg">
            <b>⚠ 重要提示：</b>本平台为个人学习项目，<b>不具备任何经营资质，不提供任何线上交易服务</b>。请务必仔细阅读以下全部条款。使用本平台即视为您已充分理解并<b>自愿承担全部相关法律责任及风险</b>。
          </div>
          <p><b>一、平台性质与法律地位</b><br/>轻淘（以下简称"本平台"）系郑州轻工业大学学生个人学习实践项目，<b>非商业运营网站，非经营性互联网信息服务提供者，不具备电子商务经营者主体资格</b>。本平台<b>仅提供信息发布与浏览的技术功能</b>，不设立线上交易市场，不提供支付结算、担保交易、物流配送等任何交易配套服务。本平台运营者与用户之间<b>不构成任何形式的居间、行纪、代理或担保法律关系</b>。</p>
          <p><b>二、内容审核的性质与限度</b><br/>用户发布的所有内容均需经管理员人工审核后方可公开展示。该审核仅为<b>形式上的合法性检查</b>（排除明显的违法、违规内容），<b>不对内容的真实性、准确性、完整性、商品质量、权利归属作任何明示或默示的保证</b>。审核通过的行为不构成平台对内容的推荐、认可或背书。本平台保留随时修改或删除任何内容的权利，且无需事先通知。</p>
          <p><b>三、交易风险完全由用户自行承担</b><br/>本平台<b>不参与、不介入、不撮合任何交易</b>。用户之间通过本平台展示的个人联系方式（微信、QQ等）自行联系并进行线下见面、验货、交易等一切行为，<b>均属用户个人行为，与本平台无关</b>。用户应自行对交易对方的身份真实性、商品状况、交易安全性进行独立判断，<b>完全自行承担</b>因线下交易产生的一切风险和后果，包括但不限于：商品质量瑕疵、假冒伪劣、价格争议、货款纠纷、人身伤害、财产损失、诈骗犯罪、隐私泄露等。</p>
          <p><b>四、免责范围</b><br/>在适用法律允许的最大范围内，<b>本平台及运营者对以下情形不承担任何形式的责任</b>（无论是合同责任、侵权责任还是其他责任）：（1）用户之间因线下交易产生的任何纠纷、争议、损失或损害；（2）用户发布的信息存在虚假、误导、侵权等情形给任何第三方造成的损失；（3）用户的微信、QQ等联系方式被第三方获取后遭受的骚扰、诈骗或其他侵害；（4）因网络故障、服务器维护、不可抗力等原因导致的服务中断或数据丢失；（5）任何间接损失、附带损失或结果性损失。</p>
          <p><b>五、用户义务与承诺</b><br/>用户承诺并保证：（1）发布的所有信息真实、准确、合法、有效；（2）拥有所发布商品的所有权或合法的处分权；（3）不发布任何违反《中华人民共和国网络安全法》《中华人民共和国治安管理处罚法》等法律法规的内容；（4）线下交易时确保人身和财产安全，建议在白天、校内公共区域进行；（5）不利用本平台从事诈骗、传销、走私等任何违法犯罪活动。</p>
          <p><b>六、违规处理与法律责任</b><br/>本平台有权不经事先通知即删除任何内容、暂停或永久封禁任何账号。用户因违反上述条款或相关法律法规而产生的任何法律责任，<b>由用户自行承担</b>。如用户行为导致本平台或运营者遭受任何索赔、处罚或损失，本平台及运营者保留向该用户追偿的权利。用户行为涉嫌违法犯罪的，本平台将主动向公安机关等有关部门提供相关全部信息。</p>
        </div>

        <button
          onClick={onAgree}
          disabled={countdown > 0}
          className={`w-full mt-6 py-3 rounded-xl font-medium transition-all ${
            countdown > 0
              ? 'bg-gray-200 dark:bg-[var(--color-card-hover)] text-gray-400 cursor-not-allowed'
              : 'bg-indigo-500 text-white hover:bg-indigo-600 active:scale-[0.98]'
          }`}
        >
          {countdown > 0 ? `请仔细阅读（${countdown}s）` : '我已仔细阅读并同意全部条款'}
        </button>
      </div>
    </div>
  );
}
