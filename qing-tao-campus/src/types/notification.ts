export interface Notification {
  id: number;
  userId: number;
  type: 'review_result' | 'new_follower' | 'goods_sold' | 'announcement';
  title: string;
  content: string;
  relatedId?: number;
  isRead: boolean;
  createdAt: string;
}
