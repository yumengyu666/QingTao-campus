export type PostStatus = 'pending' | 'approved' | 'rejected';

export interface Post {
  id: number;
  userId: number;
  title: string;
  content: string;
  images: string[];
  status: PostStatus;
  viewCount: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    nickname: string;
    avatarUrl: string;
  };
}

export interface PostFormData {
  title: string;
  content: string;
  images: string[];
}
