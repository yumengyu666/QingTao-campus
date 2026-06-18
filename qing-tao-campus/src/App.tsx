import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { NetworkStatus } from '@/components/common/NetworkStatus';
import { SkipToContent } from '@/components/common/SkipToContent';
import { AppRouter } from '@/router';
import { useInit } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { wsService } from '@/services/websocket';
import { apiFetch } from '@/utils/api';
import CallUI from '@/components/chat/CallUI';
import React, { useEffect, useState, useCallback } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, retry: 1, refetchOnWindowFocus: false },
  },
});

function AppInit() {
  useInit();
  return null;
}

/** 移动端键盘遮挡：输入框聚焦时自动滚动到可视区域 */
function KeyboardAvoidInit() {
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };
    document.addEventListener('focusin', handleFocus);
    return () => document.removeEventListener('focusin', handleFocus);
  }, []);
  return null;
}

/** WebSocket 连接管理 */
function WebSocketInit() {
  const token = useAuthStore(s => s.token);
  React.useEffect(() => {
    if (token) { wsService.connect(token); return () => { wsService.disconnect(); }; }
  }, [token]);
  return null;
}

/** 全局通话监听 — 无论用户在哪个页面都能接到来电 */
function GlobalCallListener() {
  const token = useAuthStore(s => s.token);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [callerInfo, setCallerInfo] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    const unsub = wsService.on('call_incoming', (data: any) => {
      // WebSocket 已按 userId 路由，收到的就是给自己的来电
      setIncomingCall(data);
      if (data.callerId) {
        apiFetch('/api/users/' + data.callerId).then(r => r.json()).then(j => {
          if (j.code === 200) setCallerInfo(j.data);
        }).catch(() => {});
      }
    });
    return unsub;
  }, [token]);

  const handleEnd = useCallback(() => {
    if (incomingCall?.callId) {
      apiFetch('/api/calls/' + incomingCall.callId + '/reject', { method: 'POST' }).catch(() => {});
    }
    setIncomingCall(null);
    setCallerInfo(null);
  }, [incomingCall]);

  if (!incomingCall) return null;

  return (
    <CallUI
      callType={incomingCall.callType || 'audio'}
      remoteUserId={incomingCall.callerId}
      remoteUser={callerInfo || { nickname: incomingCall.callerName || '未知用户', avatarUrl: incomingCall.callerAvatar || '' }}
      callId={incomingCall.callId}
      isIncoming={true}
      onEnd={handleEnd}
    />
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <SkipToContent />
          <NetworkStatus />
          <AppInit />
          <WebSocketInit />
          <GlobalCallListener />
          <KeyboardAvoidInit />
          <AppRouter />
          <Toaster
            position="top-center" gutter={8}
            toastOptions={{
              duration: 2000,
              style: { borderRadius: '14px', background: '#1f2937', color: '#f9fafb', fontSize: '14px', padding: '12px 16px', fontWeight: '500', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)' },
              success: { style: { background: '#065f46', color: '#ecfdf5' }, iconTheme: { primary: '#34d399', secondary: '#ecfdf5' } },
              error: { style: { background: '#991b1b', color: '#fef2f2' }, iconTheme: { primary: '#f87171', secondary: '#fef2f2' } },
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
