/**
 * 恋爱区类型定义
 * 替代项目中的 any[] 反模式
 */

/** 恋爱区用户资料 */
export interface DatingProfile {
  id: number;
  userId: number;
  nickname: string;
  gender: string;
  bio: string;
  avatarUrl: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt?: string;
}

/** 恋爱区帖子 */
export interface DatingPost {
  id: number;
  userId: number;
  content: string;
  images: string[];
  likeCount: number;
  commentCount: number;
  createdAt: string;
  user?: {
    id: number;
    nickname: string;
    avatarUrl: string;
    avatarBlurred?: boolean;
  };
}

/** 恋爱请求 */
export interface DatingRequest {
  id: number;
  senderId: number;
  receiverId: number;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  createdAt: string;
  sender?: {
    userId: number;
    nickname: string;
    avatarUrl: string;
  };
  receiver?: {
    userId: number;
    nickname: string;
    avatarUrl: string;
  };
}

/** 每日匹配 */
export interface DailyMatch {
  userId: number;
  nickname: string;
  avatarUrl: string;
  avatarBlurred: boolean;
  bio: string;
  matchScore: number;
  commonTags?: string[];
}
