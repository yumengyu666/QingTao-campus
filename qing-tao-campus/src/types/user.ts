export interface User {
  id: number;
  username: string;
  nickname: string;
  avatarUrl: string;
  wechat: string;
  qq: string;
  bio: string;
  campusArea: string;
  role: 'user' | 'admin';
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: number;
  nickname: string;
  avatarUrl: string;
  wechat: string;
  qq: string;
  bio: string;
  campusArea: string;
  followCount: number;
  fansCount: number;
  goodsCount: number;
  postsCount: number;
  isFollowing: boolean;
  createdAt: string;
}

export interface ProfileChange {
  id: number;
  userId: number;
  fieldName: string;
  oldValue: string;
  newValue: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewComment: string;
  createdAt: string;
}
