/**
 * 聊天消息类型定义
 * 替代项目中的 any[] 反模式
 */

/** 消息发送者基本信息 */
export interface ChatSender {
  id: number;
  nickname: string;
  avatarUrl: string;
}

/** 聊天消息实体 */
export interface ChatMessage {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  type: 'text' | 'image' | 'voice' | 'emoji';
  createdAt: string;
  updatedAt?: string;
  status?: 'pending' | 'approved' | 'rejected';
  sender?: ChatSender;
  // 引用回复
  replyTo?: number;
  replyContent?: string;
  // 通话记录
  callType?: 'voice' | 'video';
  callDuration?: number;
  callStatus?: 'missed' | 'completed' | 'rejected';
}

/** 会话对象 */
export interface Conversation {
  id: number;
  userId: number;
  lastMessage: string;
  lastMessageType: string;
  lastMessageTime: string;
  unreadCount: number;
  user: ChatSender & {
    isOnline?: boolean;
    lastActiveAt?: string;
  };
}

/** 消息页面状态 */
export interface ChatPageState {
  messages: ChatMessage[];
  callRecords: ChatMessage[];
  loading: boolean;
  sending: boolean;
  error: string | null;
}

/** WebSocket 消息载荷 */
export interface WsChatPayload {
  type: 'chat_message';
  data: ChatMessage;
}
