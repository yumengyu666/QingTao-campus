// Home page — 8 fixed categories, only names/icons change in the future
export const HOME_CATEGORIES = [
  { id: 1, name: '教材教辅', icon: '📚' },
  { id: 2, name: '电子产品', icon: '💻' },
  { id: 3, name: '运动户外', icon: '🏃' },
  { id: 4, name: '生活用品', icon: '📦' },
  { id: 5, name: '服饰鞋包', icon: '👗' },
  { id: 6, name: '乐器设备', icon: '🎸' },
  { id: 7, name: '数码配件', icon: '🔌' },
  { id: 8, name: '其他闲置', icon: '✨' },
];

// Goods list page — extensible, can grow to many categories
export const ALL_CATEGORIES = [
  { id: 1,  name: '教材教辅', icon: '📚' },
  { id: 2,  name: '电子产品', icon: '💻' },
  { id: 3,  name: '运动户外', icon: '🏃' },
  { id: 4,  name: '生活用品', icon: '📦' },
  { id: 5,  name: '服饰鞋包', icon: '👗' },
  { id: 6,  name: '乐器设备', icon: '🎸' },
  { id: 7,  name: '数码配件', icon: '🔌' },
  { id: 8,  name: '其他闲置', icon: '✨' },
  { id: 9,  name: '美妆护肤', icon: '💄' },
  { id: 10, name: '零食饮料', icon: '🍪' },
  { id: 11, name: '床上用品', icon: '🛏' },
  { id: 12, name: '宿舍电器', icon: '🔋' },
  { id: 13, name: '文具办公', icon: '✏️' },
  { id: 14, name: '动漫周边', icon: '🎮' },
  { id: 15, name: '绿植花卉', icon: '🌵' },
  { id: 16, name: '交通工具', icon: '🛴' },
  { id: 17, name: '摄影器材', icon: '📷' },
  { id: 18, name: '宠物用品', icon: '🐱' },
  { id: 19, name: '票券卡类', icon: '🎫' },
  { id: 20, name: '免费赠送', icon: '🎁' },
];

export const DEFAULT_CATEGORIES = HOME_CATEGORIES;

export const CAMPUS_MAP = {
  kexue: '科学校区',
  dongfeng: '东风校区',
} as const;

export const CONDITION_COLORS = {
  brand_new: 'text-green-600 bg-green-50',
  like_new: 'text-blue-600 bg-blue-50',
  used: 'text-yellow-600 bg-yellow-50',
  worn: 'text-orange-600 bg-orange-50',
} as const;
