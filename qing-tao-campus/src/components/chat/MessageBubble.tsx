import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { UserAvatar } from '@/components/common/UserAvatar';

interface MessageBubbleProps {
  msg: any;
  isMine: boolean;
  isConsecutive: boolean;
  currentUser?: any;
  peer?: any;
  onImageClick?: (url: string) => void;
  onContextMenu?: (e: React.MouseEvent, msg: any) => void;
  onTouchStart?: (e: React.TouchEvent, msg: any) => void;
  onCardClick?: (userId: number) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function MessageBubble({
  msg, isMine, isConsecutive, currentUser, peer, onImageClick, onContextMenu, onTouchStart, onCardClick
}: MessageBubbleProps) {
  const isRecalled = !!msg.recalledAt;
  const messageType = msg.type || 'text';

  const contextHandlers = {
    onContextMenu: (e: React.MouseEvent) => onContextMenu?.(e, msg),
    onTouchStart: (e: React.TouchEvent) => onTouchStart?.(e, msg),
  };

  // === System Message ===
  if (messageType === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
          {msg.content}
        </span>
      </div>
    );
  }

  const avatar = isMine
    ? currentUser
    : peer;

  const bubbleBase = isMine
    ? `bg-[#95ec69] text-gray-900 rounded-[8px_2px_8px_8px] before:absolute before:top-0 before:right-0 before:border-[6px] before:border-transparent before:border-t-[#95ec69] before:border-r-[#95ec69]`
    : `bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-[2px_8px_8px_8px]`;

  const renderContent = () => {
    if (isRecalled) {
      return <span className="text-xs text-gray-500 italic">消息已撤回</span>;
    }

    switch (messageType) {
      // === 文本消息 ===
      case 'text':
      case 'emoji':
        return <span className="text-[15px] leading-[22px] break-words whitespace-pre-wrap">{msg.content}</span>;

      // === 图片消息 ===
      case 'image':
        return (
          <img
            src={msg.content}
            alt=""
            className="max-w-52 max-h-52 rounded-lg object-cover cursor-pointer shadow-sm"
            loading="lazy"
            onClick={() => onImageClick?.(msg.content)}
          />
        );

      // === 语音消息 ===
      case 'voice':
        return (
          <div className="flex items-center gap-2 min-w-[80px]">
            <button
              className="w-8 h-8 rounded-full bg-white/40 dark:bg-gray-700/40 flex items-center justify-center"
              onClick={() => {
                const audio = new Audio(msg.voiceUrl);
                audio.play();
              }}
            >
              <span className="text-lg">{isMine ? '🔊' : '🔈'}</span>
            </button>
            <span className="text-xs opacity-80">{msg.voiceDuration || 0}″</span>
            <div className="flex items-center gap-0.5 h-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className="w-0.5 bg-current rounded-full inline-block"
                  style={{
                    height: `${6 + Math.random() * 12}px`,
                    animation: msg._playing ? 'voiceWave 0.4s ease-in-out infinite alternate' : undefined,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          </div>
        );

      // === 视频消息 ===
      case 'video':
        return (
          <div className="relative max-w-52 cursor-pointer" onClick={() => onImageClick?.(msg.content)}>
            <img src={msg.fileName || msg.content} alt="video" className="max-w-52 max-h-52 rounded-lg object-cover" loading="lazy" decoding="async" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                <span className="text-white text-lg">▶</span>
              </div>
            </div>
          </div>
        );

      // === 文件消息 ===
      case 'file':
        return (
          <a
            href={msg.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 bg-white/50 dark:bg-gray-700/50 rounded-lg min-w-[180px]"
          >
            <span className="text-2xl">📄</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{msg.fileName}</div>
              {msg.fileSize && <div className="text-[11px] opacity-60">{formatFileSize(msg.fileSize)}</div>}
            </div>
          </a>
        );

      // === 位置消息 ===
      case 'location':
        return (
          <div className="min-w-[180px] max-w-[220px]">
            <div className="h-24 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center mb-1">
              <span className="text-2xl">📍</span>
            </div>
            <div className="text-xs px-1 truncate">{msg.locationName || '位置信息'}</div>
          </div>
        );

      // === 名片消息 ===
      case 'card':
        { let cardData: any = null;
          try { cardData = JSON.parse(msg.content); } catch {}
          const cardUserId = cardData?.userId;
          const cardNickname = cardData?.nickname || '用户';
          const cardAvatar = cardData?.avatarUrl || null;
          return (
            <div
              className="flex items-center gap-3 px-3 py-2 bg-white/50 dark:bg-gray-700/50 rounded-lg min-w-[160px] cursor-pointer hover:bg-white/80 dark:hover:bg-gray-600/50 transition-colors"
              onClick={(e) => { e.stopPropagation(); if (cardUserId) onCardClick?.(cardUserId); }}
            >
              <UserAvatar src={cardAvatar} nickname={cardNickname} size="md" />
              <div>
                <div className="text-sm font-medium">{cardNickname}</div>
                <div className="text-[11px] opacity-60">查看主页</div>
              </div>
            </div>
          );
        }

      default:
        return <span className="text-[15px]">{msg.content}</span>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`flex items-start gap-2 ${isMine ? 'flex-row-reverse' : ''} ${isConsecutive ? 'mt-[2px]' : 'mt-2.5'}`}
    >
      {/* Avatar */}
      {isConsecutive ? (
        <div className="w-9 flex-shrink-0" />
      ) : (
        <UserAvatar
          src={avatar?.avatarUrl}
          nickname={isMine ? (currentUser?.nickname || '我') : (peer?.nickname || '?')}
          size="sm"
        />
      )}

      {/* Bubble */}
      <div
        className={`relative max-w-[70%] ${messageType === 'image' || messageType === 'video' ? '' : 'px-3 py-2'} shadow-[0_1px_2px_rgba(0,0,0,0.06)] ${bubbleBase} ${messageType !== 'image' && messageType !== 'video' ? 'px-3 py-2' : ''}`}
        {...(!isRecalled ? contextHandlers : {})}
      >
        {renderContent()}
      </div>

      {/* Read receipt / message status indicators */}
      {isMine && (
        <motion.div
          className="self-end text-[10px] mt-0.5 flex-shrink-0"
          key={msg._temp ? 'sent' : msg.isRead ? 'read' : msg.isDelivered ? 'delivered' : 'sent'}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {msg._temp ? (
            <motion.span
              className="text-gray-300 dark:text-gray-600"
              title="已发送"
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              ✓
            </motion.span>
          ) : msg.isRead ? (
            <motion.span
              className="text-blue-400"
              title={msg.readAt ? `已读 ${new Date(msg.readAt).toLocaleTimeString()}` : '已读'}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              ✓✓
            </motion.span>
          ) : msg.isDelivered ? (
            <motion.span
              className="text-gray-400 dark:text-gray-500"
              title="已送达"
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              ✓✓
            </motion.span>
          ) : (
            <motion.span
              className="text-gray-300 dark:text-gray-600"
              title="已发送"
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              ✓
            </motion.span>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
