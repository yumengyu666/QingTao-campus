export type GoodsCondition = 'brand_new' | 'like_new' | 'used' | 'worn';
export type GoodsStatus = 'pending' | 'approved' | 'rejected' | 'sold' | 'reserved' | 'offline';
export type GoodsListType = 'sale' | 'rent' | 'buy' | 'rent_want';

export interface Goods {
  id: number;
  userId: number;
  categoryId: number;
  categoryName?: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  listType: GoodsListType;
  condition: GoodsCondition;
  images: string[];
  campusLocation: string;
  campus: 'kexue' | 'dongfeng';
  status: GoodsStatus;
  viewCount: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    nickname: string;
    avatarUrl: string;
    wechat: string;
    qq: string;
  };
}

export interface GoodsFormData {
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  listType: GoodsListType;
  categoryId: number;
  condition: GoodsCondition;
  images: string[];
  campusLocation: string;
  campus: 'kexue' | 'dongfeng';
}

export const CONDITION_MAP: Record<GoodsCondition, string> = {
  brand_new: '全新',
  like_new: '九九新',
  used: '正常使用',
  worn: '战斗成色',
};

export const STATUS_MAP: Record<GoodsStatus, { label: string; color: string }> = {
  pending: { label: '审核中', color: 'bg-yellow-500' },
  approved: { label: '已上架', color: 'bg-green-500' },
  rejected: { label: '已拒绝', color: 'bg-red-500' },
  sold: { label: '已卖出', color: 'bg-gray-500' },
  reserved: { label: '已预订', color: 'bg-blue-500' },
  offline: { label: '已下架', color: 'bg-gray-400' },
};
