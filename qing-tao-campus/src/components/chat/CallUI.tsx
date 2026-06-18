import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { UserAvatar } from '@/components/common/UserAvatar';
import { apiFetch } from '@/utils/api';
import { wsService } from '@/services/websocket';
import toast from 'react-hot-toast';
import {
  FiPhone, FiPhoneOff, FiMic, FiMicOff, FiVideo, FiVideoOff,
  FiMinimize2,
} from 'react-icons/fi';

// ─── Props ───
interface CallUIProps {
  callType: 'audio' | 'video';
  remoteUserId: number;
  remoteUser: { nickname: string; avatarUrl: string } | null;
  callId?: number;
  isIncoming?: boolean;
  onEnd: () => void;
}

type CallState = 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended';

const STUN_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.miwifi.com:3478' },
    { urls: 'stun:stun.qq.com:3478' },
    { urls: 'stun:stun.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 2,
};

const log = (...args: any[]) => {};

export default function CallUI({
  callType,
  remoteUserId,
  remoteUser: initialPeer,
  callId: initialCallId,
  isIncoming = false,
  onEnd,
}: CallUIProps) {
  const [callState, setCallState] = useState<CallState>(isIncoming ? 'ringing' : 'calling');
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [peer, setPeer] = useState(initialPeer);
  const [minimized, setMinimized] = useState(false);

  // === 用 ref 存储所有 WS 回调中需要的值，避免闭包过期 ===
  const callIdRef = useRef(initialCallId || 0);
  const callStateRef = useRef<CallState>(isIncoming ? 'ringing' : 'calling');
  const remoteUserIdRef = useRef(remoteUserId);
  const onEndRef = useRef(onEnd);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const doneRef = useRef(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const connectingRef = useRef(false); // 防止重复发起 WebRTC 连接
  const callTypeRef = useRef(callType);
  const isIncomingRef = useRef(isIncoming);

  // 同步 ref
  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { remoteUserIdRef.current = remoteUserId; }, [remoteUserId]);
  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);
  useEffect(() => { callTypeRef.current = callType; }, [callType]);
  useEffect(() => { isIncomingRef.current = isIncoming; }, [isIncoming]);

  // ─── 获取对方信息 ───
  useEffect(() => {
    if (!peer && remoteUserId) {
      apiFetch('/api/users/' + remoteUserId).then(r => r.json()).then(j => {
        if (j.code === 200) setPeer(j.data);
      }).catch(() => {});
    }
  }, [remoteUserId, peer]);

  // ─── 停止铃声 ───
  const stopRingtone = () => {
    if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current = null; }
  };

  // ─── 清理 ───
  const cleanup = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    log('cleanup');
    connectingRef.current = false;
    stopRingtone();
    if (timerRef.current) clearInterval(timerRef.current);
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
    if (pcRef.current) pcRef.current.close();
    pcRef.current = null;
    localStreamRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  // ─── 计时器 ───
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  };

  const endCall = useCallback(() => {
    log('endCall');
    cleanup();
    setCallState('ended');
    setTimeout(() => onEndRef.current(), 800);
  }, [cleanup]);

  // Connection timeout: 如果 connecting 超过 20 秒，自动挂断
  useEffect(() => {
    if (callState !== 'connecting') return;
    const t = setTimeout(() => {
      log('Connection timeout — auto ending');
      endCall();
    }, 20000);
    return () => clearTimeout(t);
  }, [callState, endCall]);

  // Sync remote stream to DOM elements (avoids race between ontrack & render)
  useEffect(() => {
    const stream = remoteStreamRef.current;
    if (!stream) return;
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = stream;
    }
  }, [callState, callType]); // re-sync when state/type changes and DOM is ready

  // ─── 工具函数（不依赖闭包状态）───
  const getLocalMedia = async (ct: 'audio' | 'video'): Promise<MediaStream | null> => {
    // 非安全上下文（如 192.168.x.x HTTP）不支持 getUserMedia
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('当前页面非 HTTPS，无法访问麦克风/摄像头\n请使用 localhost:5175 访问', { duration: 4000 });
      return null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: ct === 'video',
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      log('getUserMedia OK, tracks:', stream.getTracks().map(t => t.kind));
      return stream;
    } catch (err: any) {
      log('getUserMedia FAILED:', err.name, err.message);
      // Show user-friendly error
      if (err.name === 'NotAllowedError') {
        alert('请允许麦克风/摄像头权限才能通话');
      } else if (err.name === 'NotFoundError') {
        alert('未检测到麦克风或摄像头设备');
      } else {
        alert('无法访问媒体设备: ' + err.message);
      }
      return null;
    }
  };

  const createPCAndOffer = async () => {
    const pc = new RTCPeerConnection(STUN_SERVERS);
    pcRef.current = pc;
    const cid = callIdRef.current;
    const rid = remoteUserIdRef.current;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        log('ICE candidate →', cid);
        wsService.send({ type: 'webrtc_ice', to: rid, callId: cid, candidate: event.candidate });
      }
    };
    pc.ontrack = (event) => {
      log('ontrack received (caller), kind:', event.track.kind);
      // 把不同 track 合并到一个 MediaStream（视频通话会触发两次 ontrack）
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }
      remoteStreamRef.current.addTrack(event.track);
      // 音频元素只设音频轨，视频元素只设视频轨，避免后面 track 覆盖前面
      if (event.track.kind === 'audio' && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
      if (event.track.kind === 'video' && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    log('Sending webrtc_offer →', cid);
    wsService.send({ type: 'webrtc_offer', to: rid, callId: cid, sdp: pc.localDescription });
    return pc;
  };

  const createAnswer = async (offerSdp: any) => {
    const pc = new RTCPeerConnection(STUN_SERVERS);
    pcRef.current = pc;
    const cid = callIdRef.current;
    const rid = remoteUserIdRef.current;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        log('ICE candidate (callee) →', cid);
        wsService.send({ type: 'webrtc_ice', to: rid, callId: cid, candidate: event.candidate });
      }
    };
    pc.ontrack = (event) => {
      log('ontrack received (callee), kind:', event.track.kind);
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }
      remoteStreamRef.current.addTrack(event.track);
      if (event.track.kind === 'audio' && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
      if (event.track.kind === 'video' && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
    const answerSdp = await pc.createAnswer();
    await pc.setLocalDescription(answerSdp);
    log('Sending webrtc_answer →', cid);
    wsService.send({ type: 'webrtc_answer', to: rid, callId: cid, sdp: pc.localDescription });
  };

  // ══════════════════════════════════════════════════════
  //  核心：单一大 useEffect — 管理所有 WS 事件
  //  使用 ref 避免闭包过期
  // ══════════════════════════════════════════════════════
  useEffect(() => {
    log('Registering WS handlers, isIncoming=', isIncomingRef.current);

    const hCallAccepted = wsService.on('call_accepted', (data: any) => {
      log('★ WS call_accepted', { dataCallId: data.callId, myCallId: callIdRef.current, myState: callStateRef.current });
      if (data.callId !== callIdRef.current) { log('  ↳ callId mismatch'); return; }
      if (callStateRef.current === 'connected' || callStateRef.current === 'connecting') { log('  ↳ already connecting/connected'); return; }
      if (connectingRef.current) { log('  ↳ WebRTC connection already in progress'); return; }

      if (isIncomingRef.current) {
        // 被叫收到 call_accepted? 不应该
        log('  ↳ unexpected for callee, ignoring');
        return;
      }

      // 主叫收到 call_accepted → 创建 Offer
      log('  ↳ Initiating WebRTC as caller');
      connectingRef.current = true;
      stopRingtone();
      setCallState('connecting');

      (async () => {
        await getLocalMedia(callTypeRef.current);
        await createPCAndOffer();
        setCallState('connected');
        startTimer();
      })().catch(err => { log('caller connect error:', err); endCall(); });
    });

    const hOffer = wsService.on('webrtc_offer', (data: any) => {
      log('★ WS webrtc_offer', { dataCallId: data.callId, myCallId: callIdRef.current });
      if (data.callId !== callIdRef.current) { log('  ↳ callId mismatch'); return; }
      if (!isIncomingRef.current) { log('  ↳ only callee handles offer'); return; }

      log('  ↳ Creating answer as callee, ensuring media ready...');
      (async () => {
        // Ensure local media is ready before creating answer
        if (!localStreamRef.current) {
          await getLocalMedia(callTypeRef.current);
        }
        await createAnswer(data.sdp);
        setCallState('connected');
      })().catch(err => { log('callee connect error:', err); });
    });

    const hAnswer = wsService.on('webrtc_answer', (data: any) => {
      log('★ WS webrtc_answer', { dataCallId: data.callId });
      if (data.callId !== callIdRef.current) return;
      if (pcRef.current && data.sdp) {
        pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp)).catch(() => {});
      }
    });

    const hIce = wsService.on('webrtc_ice', (data: any) => {
      if (data.callId !== callIdRef.current) return;
      if (pcRef.current && data.candidate) {
        pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {});
      }
    });

    const hEnded = wsService.on('call_ended', (data: any) => {
      log('★ WS call_ended', { dataCallId: data.callId, myCallId: callIdRef.current });
      if (data.callId !== callIdRef.current) return;
      endCall();
    });

    const hRejected = wsService.on('call_rejected', (data: any) => {
      log('★ WS call_rejected', { dataCallId: data.callId, myCallId: callIdRef.current });
      if (data.callId !== callIdRef.current) return;
      endCall();
    });

    return () => {
      log('Unregistering WS handlers');
      hCallAccepted();
      hOffer();
      hAnswer();
      hIce();
      hEnded();
      hRejected();
    };
  }, [endCall]); // 只依赖 endCall，这个很少变

  // ══════════════════════════════════════════════════════
  //  主叫：发起呼叫 + 轮询状态（无需依赖 WS）
  // ══════════════════════════════════════════════════════
  useEffect(() => {
    if (isIncoming) return;
    if (callState !== 'calling') return;

    let pollTimer: ReturnType<typeof setInterval>;

    log('Initiating call via REST, target=', remoteUserId);
    (async () => {
      try {
        const res = await apiFetch('/api/calls/initiate', {
          method: 'POST',
          body: JSON.stringify({ calleeId: remoteUserId, callType }),
        });
        const json = await res.json();
        if (json.code === 201) {
          callIdRef.current = json.data.id;
          log('Call initiated, callId=', json.data.id, '— starting polling');

          // 轮询通话状态（1.5 秒一次）
          pollTimer = setInterval(async () => {
            if (callStateRef.current === 'ended') { clearInterval(pollTimer); return; }
            try {
              const r = await apiFetch('/api/calls/' + callIdRef.current + '?_t=' + Date.now());
              const j = await r.json();
              if (j.code === 200) {
                const status = j.data.status;
                log('Poll status:', status);
                if (status === 'active' && callStateRef.current === 'calling') {
                  log('→ Answer detected via polling! Getting media...');
                  if (connectingRef.current) { log('→ WebRTC already in progress, skipping'); return; }
                  connectingRef.current = true;
                  clearInterval(pollTimer);
                  stopRingtone();
                  setCallState('connecting');
                  const media = await getLocalMedia(callTypeRef.current);
                  log('→ Media ready:', !!media);
                  await createPCAndOffer();
                  log('→ Offer sent, setting connected');
                  setCallState('connected');
                  startTimer();
                } else if (['missed', 'rejected', 'canceled', 'completed'].includes(status)) {
                  log('→ Call ended remotely:', status);
                  clearInterval(pollTimer);
                  endCall();
                }
              }
            } catch { /* ignore polling errors */ }
          }, 1500);
        } else {
          log('Initiate failed:', json);
          endCall();
        }
      } catch (err) {
        log('Initiate error:', err);
        endCall();
      }
    })();

    return () => { clearInterval(pollTimer); };
  }, [isIncoming, callState, remoteUserId, callType, endCall]);

  // ══════════════════════════════════════════════════════
  //  双方：轮询通话状态（检测远程挂断 + 被叫侧状态变化）
  // ══════════════════════════════════════════════════════
  useEffect(() => {
    const cid = callIdRef.current;
    if (!cid) return;
    // 只在连接中或已连接时轮询
    if (callState !== 'connecting' && callState !== 'connected') return;

    const timer = setInterval(async () => {
      try {
        const r = await apiFetch('/api/calls/' + cid + '?_t=' + Date.now());
        const j = await r.json();
        if (j.code === 200 && ['missed', 'rejected', 'canceled', 'completed'].includes(j.data.status)) {
          log('→ Remote hung up (polling):', j.data.status);
          clearInterval(timer);
          endCall();
        }
      } catch {}
    }, 2000);

    return () => clearInterval(timer);
  }, [callState, endCall]);

  // ══════════════════════════════════════════════════════
  //  被叫：响铃时轮询（防止 WS 断连时卡在响铃状态）
  // ══════════════════════════════════════════════════════
  useEffect(() => {
    if (!isIncoming) return;
    if (callState !== 'ringing') return;
    const cid = callIdRef.current;
    if (!cid) return;

    const timer = setInterval(async () => {
      try {
        const r = await apiFetch('/api/calls/' + cid + '?_t=' + Date.now());
        const j = await r.json();
        if (j.code === 200 && ['missed', 'rejected', 'canceled', 'completed'].includes(j.data.status)) {
          log('→ Caller cancelled (ringing poll):', j.data.status);
          clearInterval(timer);
          endCall();
        }
      } catch {}
    }, 1500);

    return () => clearInterval(timer);
  }, [isIncoming, callState, endCall]);

  // ══════════════════════════════════════════════════════
  //  被叫：接听
  // ══════════════════════════════════════════════════════
  const answer = useCallback(async () => {
    log('Callee answering, callId=', callIdRef.current);
    stopRingtone();

    // 通知后端
    if (callIdRef.current) {
      apiFetch('/api/calls/' + callIdRef.current + '/answer', { method: 'POST' })
        .then(() => log('Answer REST OK'))
        .catch(err => log('Answer REST error:', err));
    }

    // 预获取媒体
    getLocalMedia(callTypeRef.current).catch(() => {});
    startTimer();
    setCallState('connecting');
  }, []);

  // ─── 挂断 ───
  const hangup = useCallback(async () => {
    log('Hanging up, callId=', callIdRef.current);
    stopRingtone();
    if (timerRef.current) clearInterval(timerRef.current);
    if (pcRef.current) pcRef.current.close();
    pcRef.current = null;
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;

    const cid = callIdRef.current;
    if (cid) {
      try {
        await apiFetch(`/api/calls/${cid}/end`, { method: 'POST' });
        log('End REST OK');
      } catch (err) {
        log('End REST failed, fallback to WS');
        // REST 失败时直接通过 WS 通知对方（兜底）
        wsService.send({ type: 'call_ended', to: remoteUserIdRef.current, callId: cid });
      }
    }

    endCall();
  }, [endCall]);

  const reject = useCallback(async () => {
    log('Rejecting, callId=', callIdRef.current);
    stopRingtone();
    const cid = callIdRef.current;
    if (cid) {
      try {
        await apiFetch(`/api/calls/${cid}/reject`, { method: 'POST' });
      } catch {
        // REST 失败时直接通过 WS 通知对方
        wsService.send({ type: 'call_rejected', to: remoteUserIdRef.current, callId: cid });
      }
    }
    endCall();
  }, [endCall]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      const tracks = localStreamRef.current.getAudioTracks();
      const target = !muted;
      tracks.forEach(t => t.enabled = !target);
      setMuted(target);
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const tracks = localStreamRef.current.getVideoTracks();
      const target = !cameraOff;
      tracks.forEach(t => t.enabled = !target);
      setCameraOff(target);
    }
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const statusText = () => {
    switch (callState) {
      case 'ringing': return '来电...';
      case 'calling': return '正在呼叫...';
      case 'connecting': return '建立连接...';
      case 'connected': return formatDuration(duration);
      default: return '';
    }
  };

  if (callState === 'ended') return null;

  return (
    <motion.div
      initial={minimized ? {} : { opacity: 0, scale: 0.95 }}
      animate={minimized ? { width: 200, height: 140, bottom: 80, right: 20, borderRadius: 16, position: 'fixed' } : { opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`${minimized ? 'fixed bottom-20 right-4 z-[100] shadow-2xl' : 'fixed inset-0 z-[100]'} bg-gray-900 ${callType === 'video' ? '' : 'flex flex-col items-center justify-center'}`}
    >
      {/* 视频：远端全屏 + 本地小窗 */}
      {callType === 'video' && !minimized && (
        <>
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            {callState === 'connected' ? (
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center">
                <UserAvatar src={peer?.avatarUrl} nickname={peer?.nickname || '?'} size="xl" />
                <span className="text-white/60 mt-3">{statusText()}</span>
              </div>
            )}
          </div>
          <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
          <div className="absolute top-12 right-4 w-28 h-40 rounded-xl overflow-hidden border-2 border-white/20 z-10 bg-gray-800">
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            {cameraOff && <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white/40 text-xs">已关闭</div>}
          </div>
        </>
      )}

      {/* 语音 */}
      {callType === 'audio' && !minimized && (
        <div className="flex flex-col items-center">
          <UserAvatar src={peer?.avatarUrl} nickname={peer?.nickname || '?'} size="xl" />
          <h2 className="text-white text-xl font-semibold mt-4">{peer?.nickname || '未知用户'}</h2>
          <p className="text-white/60 text-sm mt-1">{statusText()}</p>
          {/* 隐藏的音频元素 — 用于播放远端音频流 */}
          <audio ref={remoteAudioRef} autoPlay playsInline />
        </div>
      )}

      {/* 控制按钮 */}
      <div className={`${minimized ? 'hidden' : 'absolute bottom-12 left-0 right-0 flex items-center justify-center gap-6'}`}>
        {(callState === 'connecting' || callState === 'connected') && (
          <button onClick={toggleMute} className={`w-12 h-12 rounded-full ${muted ? 'bg-red-500' : 'bg-white/20'} flex items-center justify-center`}>
            {muted ? <FiMicOff className="text-white text-xl" /> : <FiMic className="text-white text-xl" />}
          </button>
        )}

        <motion.button whileTap={{ scale: 0.9 }}
          onClick={callState === 'ringing' ? answer : hangup}
          className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${callState === 'ringing' ? 'bg-green-500' : 'bg-red-500'}`}
        >
          {callState === 'ringing' ? <FiPhone className="text-white text-3xl" /> : <FiPhoneOff className="text-white text-3xl" />}
        </motion.button>

        {callState === 'ringing' && (
          <button onClick={reject} className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
            <FiPhoneOff className="text-white text-xl" />
          </button>
        )}

        {callType === 'video' && (callState === 'connecting' || callState === 'connected') && (
          <button onClick={toggleCamera} className={`w-12 h-12 rounded-full ${cameraOff ? 'bg-red-500' : 'bg-white/20'} flex items-center justify-center`}>
            {cameraOff ? <FiVideoOff className="text-white text-xl" /> : <FiVideo className="text-white text-xl" />}
          </button>
        )}
      </div>

      {/* 最小化 */}
      {!minimized && (
        <button onClick={() => setMinimized(true)} className="absolute top-8 left-4 text-white/60 hover:text-white">
          <FiMinimize2 className="text-lg" />
        </button>
      )}
      {minimized && (
        <button onClick={() => setMinimized(false)} className="absolute top-2 left-2 text-white/60 hover:text-white">
          <FiMinimize2 className="text-sm" />
        </button>
      )}
    </motion.div>
  );
}
