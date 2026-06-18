import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMic, FiX, FiSend } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { apiFetch } from '@/utils/api';

interface VoiceRecorderProps {
  onSend: (voiceUrl: string, duration: number) => void;
  onClose: () => void;
}

export default function VoiceRecorder({ onSend, onClose }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };

      mediaRecorder.start();
      setRecording(true);
      setDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((d) => {
          if (d >= 60) {
            stopRecording();
            return 60;
          }
          return d + 1;
        });
      }, 1000);

      // Start waveform animation
      animateWaveform(stream);
    } catch (err) {
      toast.error('无法访问麦克风，请检查权限设置');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setRecording(false);
  }, []);

  const cancelRecording = useCallback(() => {
    stopRecording();
    setAudioBlob(null);
    setAudioUrl(null);
    onClose();
  }, [stopRecording, onClose]);

  const sendVoice = useCallback(async () => {
    if (!audioBlob) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('voice', audioBlob, `voice_${Date.now()}.webm`);

      const res = await apiFetch('/api/upload/voice', { method: 'POST', body: fd });
      const json = await res.json();

      if (json.code === 200 && json.data?.url) {
        onSend(json.data.url, duration);
        onClose();
      } else {
        toast.error(json.message || '上传失败');
      }
    } catch {
      toast.error('上传失败，请重试');
    }
    setUploading(false);
  }, [audioBlob, duration, onSend, onClose]);

  // Simple waveform animation using canvas
  const animateWaveform = (stream: MediaStream) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const canvas = canvasRef.current!;
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / dataArray.length) * 2.5;
      let x = 0;

      for (let i = 0; i < dataArray.length; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        gradient.addColorStop(0, '#95ec69');
        gradient.addColorStop(1, '#07c160');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    };

    draw();
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-0 z-50 bg-gray-900/95 flex flex-col items-center justify-center"
      >
        {!audioBlob ? (
          <>
            {/* Recording indicator */}
            <div className="text-white/60 text-sm mb-8">
              {recording ? '正在录音...' : '按住录音，松开发送'}
            </div>

            {/* Waveform canvas */}
            <canvas
              ref={canvasRef}
              width={280}
              height={100}
              className="w-[280px] h-[100px] rounded-xl mb-8"
            />

            {/* Timer */}
            <div className="text-white text-2xl font-mono mb-8">
              {formatTime(duration)}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-16">
              <button
                onClick={cancelRecording}
                className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center hover:bg-red-500/30 transition-colors"
              >
                <FiX className="text-2xl text-red-400" />
              </button>

              <motion.button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                whileTap={{ scale: 1.2 }}
                animate={recording ? { scale: [1, 1.05, 1] } : {}}
                transition={recording ? { repeat: Infinity, duration: 1.5 } : {}}
                className="w-20 h-20 rounded-full bg-[#07c160] flex items-center justify-center shadow-lg shadow-green-500/50"
              >
                <FiMic className="text-3xl text-white" />
              </motion.button>

              <div className="w-16" />
            </div>
          </>
        ) : (
          <>
            {/* Preview mode */}
            <div className="text-white/80 text-sm mb-4">语音录制完成</div>
            <div className="text-white text-3xl font-mono mb-8">{formatTime(duration)}</div>

            {/* Playback controls */}
            <audio src={audioUrl!} controls className="mb-8" />

            <div className="flex items-center gap-8">
              <button
                onClick={() => { setAudioBlob(null); setAudioUrl(null); }}
                className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-colors"
              >
                <FiX className="text-xl text-white" />
              </button>

              <button
                onClick={sendVoice}
                disabled={uploading}
                className="w-16 h-16 rounded-full bg-[#07c160] flex items-center justify-center shadow-lg shadow-green-500/50 hover:bg-green-500 disabled:opacity-50 transition-colors"
              >
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FiSend className="text-2xl text-white -rotate-45" />
                )}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
