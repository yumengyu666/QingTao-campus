export type ErrorType = 'network' | 'timeout' | 'rate_limit' | 'server' | 'unknown';

export function classifyError(err: any): ErrorType {
  if (err?.name === 'AbortError' || err?.message?.includes('timeout')) return 'timeout';
  if (err?.status === 429 || err?.message?.includes('rate limit')) return 'rate_limit';
  if (err?.status >= 500) return 'server';
  if (err?.name === 'TypeError' && err?.message?.includes('fetch')) return 'network';
  if (err?.name === 'TypeError' && err?.message?.includes('NetworkError')) return 'network';
  if (err?.message?.includes('Failed to fetch') || err?.message?.includes('Network request failed')) return 'network';
  return 'unknown';
}

export function getErrorMessage(type: ErrorType): string {
  const messages: Record<ErrorType, string> = {
    network: '网络连接失败，请检查网络后重试',
    timeout: '请求超时，请稍后重试',
    rate_limit: '操作太频繁，请稍后再试',
    server: '服务器繁忙，请稍后重试',
    unknown: '操作失败，请重试',
  };
  return messages[type];
}
