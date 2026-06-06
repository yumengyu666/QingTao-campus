export interface LostFoundItem {
  id: number;
  type: 'lost' | 'found';
  title: string;
  description: string;
  images: string[];
  campus: 'kexue' | 'dongfeng';
  location: string;
  lostTime: string;
  contactWechat: string;
  contactQq: string;
  reward: string;
  status: 'pending' | 'approved' | 'rejected' | 'resolved';
  viewCount: number;
  userId: number;
  createdAt: string;
  user?: {
    id: number;
    nickname: string;
    avatarUrl: string;
  };
}

export interface LostFoundComment {
  id: number;
  itemId: number;
  userId: number;
  content: string;
  createdAt: string;
  user?: {
    id: number;
    nickname: string;
    avatarUrl: string;
  };
}
