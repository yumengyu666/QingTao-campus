import { useState, useRef } from 'react';

interface VoicePlayerProps {
  url: string;
  duration: number;
  isMine: boolean;
}

export default function VoicePlayer({ url, duration, isMine }: VoicePlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) {
          setProgress(audioRef.current.currentTime / (audioRef.current.duration || duration));
        }
      };
      audioRef.current.onended = () => { setPlaying(false); setProgress(0); };
    }

    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const formatTime = (s: number) => `${Math.floor(s)}″`;

  return (
    <div className={`flex items-center gap-2 min-w-[100px] px-2 py-1 ${isMine ? 'flex-row-reverse' : ''}`}>
      <button onClick={toggle}
        className={`w-8 h-8 rounded-full flex items-center justify-center ${isMine ? 'bg-white/30' : 'bg-gray-200 dark:bg-gray-700'}`}>
        <span className={`text-base ${isMine ? 'opacity-80' : ''} ${playing ? 'animate-pulse' : ''}`}>
          {playing ? '⏸' : '▶'}
        </span>
      </button>
      <div className="flex-1 relative h-5 flex items-center">
        <div className="absolute inset-y-0 left-0 bg-black/10 dark:bg-white/10 rounded-full" style={{ width: `${progress * 100}%` }} />
        <div className="flex items-center gap-0.5 px-1">
          {[1, 2, 3, 4, 5].map(i => (
            <span key={i} className={`w-0.5 bg-current rounded-full inline-block ${playing ? 'animate-voice-wave' : ''}`}
              style={{ height: `${6 + Math.sin(i) * 10}px`, animationDelay: playing ? `${i * 0.1}s` : undefined }} />
          ))}
        </div>
      </div>
      <span className="text-[10px] opacity-60 w-8 text-right">{formatTime(duration)}</span>
    </div>
  );
}
