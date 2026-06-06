import { useState, useEffect, useCallback } from 'react';
import { FiRefreshCw } from 'react-icons/fi';

interface Props {
  onCaptchaReady: (captchaId: string, answer: string) => void;
  onCaptchaChange: () => void;
  className?: string;
  refreshKey?: number;
}

export function MathCaptcha({ onCaptchaReady, onCaptchaChange, className = '', refreshKey = 0 }: Props) {
  const [captchaId, setCaptchaId] = useState('');
  const [svgContent, setSvgContent] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCaptcha = useCallback(async () => {
    setLoading(true);
    setAnswer('');
    onCaptchaChange();
    try {
      const res = await fetch('/api/captcha/generate');
      const json = await res.json();
      if (json.code === 200) {
        setCaptchaId(json.data.captchaId);
        setSvgContent(json.data.svg);
      }
    } catch {
      try {
        const res = await fetch('/api/captcha/generate');
        const json = await res.json();
        if (json.code === 200) {
          setCaptchaId(json.data.captchaId);
          setSvgContent(json.data.svg);
        }
      } catch {
        setSvgContent('');
      }
    }
    setLoading(false);
  }, [onCaptchaChange]);

  useEffect(() => { fetchCaptcha(); }, []);
  useEffect(() => { if (refreshKey > 0) fetchCaptcha(); }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (captchaId && answer.trim().length === 4) {
      onCaptchaReady(captchaId, answer.trim().toUpperCase());
    }
  }, [captchaId, answer, onCaptchaReady]);

  const svgDataUri = svgContent
    ? `data:image/svg+xml;base64,${btoa(String.fromCharCode(...new TextEncoder().encode(svgContent)))}`
    : '';

  const isGlass = className.includes('text-white');

  return (
    <div className={`flex items-center gap-3 w-full ${className}`}>
      <div className={`flex-1 flex items-center gap-3 min-w-0 ${className}`}>
        {loading ? (
          <div className="h-[42px] w-[130px] rounded animate-pulse flex-shrink-0"
            style={isGlass ? { background: 'rgba(255,255,255,0.1)' } : {}} />
        ) : svgDataUri ? (
          <img src={svgDataUri} alt="验证码" className="h-[42px] rounded select-none flex-shrink-0" />
        ) : (
          <span className="text-xs text-white/40 flex-shrink-0">加载失败</span>
        )}
        <input
          type="text"
          inputMode="text"
          placeholder="输入验证码"
          value={answer}
          onChange={(e) => setAnswer(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase())}
          maxLength={4}
          className="flex-1 min-w-0 bg-transparent outline-none text-sm font-mono tracking-widest"
          style={{ color: isGlass ? '#fff' : undefined }}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <button type="button" onClick={fetchCaptcha}
        className="p-2.5 rounded-xl transition-colors flex-shrink-0"
        style={isGlass ? { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' } : {}}
        title="换一张">
        <FiRefreshCw className="text-sm" />
      </button>
    </div>
  );
}
