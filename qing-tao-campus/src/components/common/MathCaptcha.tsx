import { useState, useEffect, useCallback, useRef } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { apiFetch } from '@/utils/api';

interface Props {
  onCaptchaReady: (captchaId: string, answer: string) => void;
  onCaptchaChange: () => void;
  className?: string;
  refreshKey?: number;
}

export function MathCaptcha({ onCaptchaReady, onCaptchaChange, className, refreshKey }: Props) {
  const [captchaId, setCaptchaId] = useState('');
  const [svgDataUri, setSvgDataUri] = useState('');
  const [error, setError] = useState('');
  const [userInput, setUserInput] = useState('');
  const retryTimestamps = useRef<number[]>([]);
  const [rateLimited, setRateLimited] = useState(false);

  const svgToDataUri = (svg: string) =>
    'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));

  const generate = useCallback(async () => {
    // 清理过期记录（超过60秒的）
    const now = Date.now();
    retryTimestamps.current = retryTimestamps.current.filter(ts => now - ts < 60000);

    if (retryTimestamps.current.length >= 3) {
      setRateLimited(true);
      setError('验证码刷新过于频繁，请1分钟后再试');
      return;
    }

    setRateLimited(false);
    setError('');
    setUserInput('');
    retryTimestamps.current.push(now);

    try {
      const res = await apiFetch('/api/captcha/generate');
      const json = await res.json();
      if (json.code === 200) {
        const data = json.data;
        setCaptchaId(data.captchaId);
        if (data.svg) {
          setSvgDataUri(svgToDataUri(data.svg));
        }
        onCaptchaReady(data.captchaId, '');
      }
    } catch {
      setError('验证码加载失败');
    }
  }, [onCaptchaReady]);

  useEffect(() => { generate(); }, [generate, refreshKey]);

  // 用户输入变化时同步到父组件
  const handleInput = useCallback((val: string) => {
    const clean = val.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
    setUserInput(clean);
    if (captchaId) onCaptchaReady(captchaId, clean);
  }, [captchaId, onCaptchaReady]);

  return (
    <div className={`flex items-center justify-between ${className || ''}`}>
      {svgDataUri ? (
        <>
          <div className="flex items-center gap-2 flex-shrink-0">
            <img
              src={svgDataUri}
              alt="验证码"
              className={`h-11 rounded-lg border border-white/20 select-none bg-white ${rateLimited ? 'opacity-30 pointer-events-none' : 'cursor-pointer'}`}
              onClick={() => { onCaptchaChange(); generate(); }}
            />
            <button
              type="button"
              onClick={() => { onCaptchaChange(); generate(); }}
              disabled={rateLimited}
              className={`p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all ${rateLimited ? 'opacity-30 cursor-not-allowed' : ''}`}
              title="换一个"
            >
              <FiRefreshCw className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            value={userInput}
            onChange={e => handleInput(e.target.value)}
            placeholder="输入验证码"
            maxLength={4}
            autoComplete="off"
            className="w-28 px-3 py-2.5 rounded-lg text-sm outline-none text-white text-center font-mono tracking-[0.3em] placeholder-white/30"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
            onFocus={e => {
              e.target.style.background = 'rgba(255,255,255,0.2)';
              e.target.style.borderColor = 'rgba(255,255,255,0.5)';
              e.target.style.boxShadow = '0 0 8px rgba(255,255,255,0.1)';
            }}
            onBlur={e => {
              e.target.style.background = 'rgba(255,255,255,0.1)';
              e.target.style.borderColor = 'rgba(255,255,255,0.2)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </>
      ) : (
        <span className="text-sm text-white/50 py-2">验证码加载中...</span>
      )}
      {error && <span className="text-xs text-red-400 ml-1">{error}</span>}
    </div>
  );
}
