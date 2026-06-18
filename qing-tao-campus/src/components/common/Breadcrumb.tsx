import { Link, useLocation } from 'react-router-dom';
import { FiChevronRight, FiHome } from 'react-icons/fi';
import { memo } from 'react';

/* Route label mapping */
const routeLabels: Record<string, string> = {
  '': '首页',
  goods: '淘货',
  square: '广场',
  dating: '恋爱空间',
  qa: '校园答疑',
  treehole: '树洞',
  resources: '考试资料',
  messages: '消息',
  profile: '个人中心',
  wanted: '求购',
  tags: '话题',
  agent: '小轻助手',
  explore: '探索',
  admin: '管理后台',
  cart: '购物车',
  search: '搜索',
  publish: '发布',
  post: '帖子详情',
  lostfound: '失物招领',
  favorites: '我的收藏',
  following: '关注',
  notifications: '通知',
  history: '浏览记录',
  password: '修改密码',
  edit: '编辑资料',
  goods_detail: '商品详情',
};

function getLabel(segment: string): string {
  // Check for ID segments (numbers)
  if (/^\d+$/.test(segment)) return '详情';
  return routeLabels[segment] || segment;
}

export const Breadcrumb = memo(function Breadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => {
    const path = '/' + segments.slice(0, i + 1).join('/');
    const label = getLabel(seg);
    const isLast = i === segments.length - 1;
    return { path, label, isLast };
  });

  return (
    <nav aria-label="面包屑导航" className="mb-4">
      <ol className="flex items-center gap-1.5 text-sm flex-wrap">
        <li>
          <Link
            to="/"
            className="text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors flex items-center gap-1"
            aria-label="返回首页"
          >
            <FiHome size={14} />
          </Link>
        </li>
        {crumbs.map((crumb) => (
          <li key={crumb.path} className="flex items-center gap-1.5">
            <FiChevronRight size={12} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
            {crumb.isLast ? (
              <span className="text-gray-700 dark:text-gray-300 font-medium truncate max-w-[200px]">
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.path}
                className="text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors truncate max-w-[200px]"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
});

export default Breadcrumb;
