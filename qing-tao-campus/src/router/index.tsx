import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ScrollToTop } from '@/components/common/ScrollToTop';
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const UserAgreementPage = lazy(() => import('@/pages/auth/UserAgreementPage'));
const HomePage = lazy(() => import('@/pages/home/HomePage'));
const GoodsListPage = lazy(() => import('@/pages/goods/GoodsListPage'));
const GoodsDetailPage = lazy(() => import('@/pages/goods/GoodsDetailPage'));
const PublishGoodsPage = lazy(() => import('@/pages/goods/PublishGoodsPage'));
const CartPage = lazy(() => import('@/pages/cart/CartPage'));
const SquarePage = lazy(() => import('@/pages/square/SquarePage'));
const PostDetailPage = lazy(() => import('@/pages/square/PostDetailPage'));
const PublishPostPage = lazy(() => import('@/pages/square/PublishPostPage'));
const LostFoundDetailPage = lazy(() => import('@/pages/square/LostFoundDetailPage'));
const PublishLostFoundPage = lazy(() => import('@/pages/square/PublishLostFoundPage'));
const MyProfilePage = lazy(() => import('@/pages/profile/MyProfilePage'));
const EditProfilePage = lazy(() => import('@/pages/profile/EditProfilePage'));
const UserProfilePage = lazy(() => import('@/pages/profile/UserProfilePage'));
const MyGoodsPage = lazy(() => import('@/pages/profile/MyGoodsPage'));
const MyPostsPage = lazy(() => import('@/pages/profile/MyPostsPage'));
const MyFavoritesPage = lazy(() => import('@/pages/profile/MyFavoritesPage'));
const FollowListPage = lazy(() => import('@/pages/profile/FollowListPage'));
const NotificationsPage = lazy(() => import('@/pages/profile/NotificationsPage'));
const BrowseHistoryPage = lazy(() => import('@/pages/profile/BrowseHistoryPage'));
const ChangePasswordPage = lazy(() => import('@/pages/profile/ChangePasswordPage'));
const AccountSecurityPage = lazy(() => import('@/pages/profile/AccountSecurityPage'));
const SearchPage = lazy(() => import('@/pages/search/SearchPage'));
const ConversationsPage = lazy(() => import('@/pages/chat/ConversationsPage'));
const ChatPage = lazy(() => import('@/pages/chat/ChatPage'));
const DatingSquarePage = lazy(() => import('@/pages/dating/DatingSquarePage'));
const DatingProfilePage = lazy(() => import('@/pages/dating/DatingProfilePage'));
const DatingConversationsPage = lazy(() => import('@/pages/dating/DatingConversationsPage'));
const DatingChatPage = lazy(() => import('@/pages/dating/DatingChatPage'));
const QaListPage = lazy(() => import('@/pages/qa/QaListPage'));
const QaDetailPage = lazy(() => import('@/pages/qa/QaDetailPage'));
const TreeHolePage = lazy(() => import('@/pages/treehole/TreeHolePage'));
const BlacklistPage = lazy(() => import('@/pages/profile/BlacklistPage'));
const ResourceListPage = lazy(() => import('@/pages/resources/ResourceListPage'));
const ResourceDetailPage = lazy(() => import('@/pages/resources/ResourceDetailPage'));
const TradeIntentsPage = lazy(() => import('@/pages/trade/TradeIntentsPage'));
const ComparePage = lazy(() => import('@/pages/goods/ComparePage'));
const ReservationsPage = lazy(() => import('@/pages/reservation/ReservationsPage'));
const WantedListPage = lazy(() => import('@/pages/wanted/WantedListPage'));
const PublishWantedPage = lazy(() => import('@/pages/wanted/PublishWantedPage'));
const BarterPage = lazy(() => import('@/pages/barter/BarterPage'));
const TagsPage = lazy(() => import('@/pages/tag/TagsPage'));
const BadgesPage = lazy(() => import('@/pages/badge/BadgesPage'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminContentPage = lazy(() => import('@/pages/admin/AdminContentPage'));
const AdminImagesPage = lazy(() => import('@/pages/admin/AdminImagesPage'));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AgentPage = lazy(() => import('@/pages/agent/AgentPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

const LazyLoad = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSpinner fullScreen />}>{children}</Suspense>
);

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LazyLoad><LoginPage /></LazyLoad>} />
      <Route path="/register" element={<LazyLoad><RegisterPage /></LazyLoad>} />
      <Route path="/agreement" element={<LazyLoad><UserAgreementPage /></LazyLoad>} />

      {/* TreeHole & Resources with sidebar layout, no auth required */}
      <Route element={<AppLayout />}>
        <Route path="/treehole" element={<LazyLoad><TreeHolePage /></LazyLoad>} />
        <Route path="/resources" element={<LazyLoad><ResourceListPage /></LazyLoad>} />
        <Route path="/resources/:id" element={<LazyLoad><ResourceDetailPage /></LazyLoad>} />
      </Route>

      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<LazyLoad><HomePage /></LazyLoad>} />
        <Route path="goods" element={<LazyLoad><GoodsListPage /></LazyLoad>} />
        <Route path="goods/newest" element={<LazyLoad><GoodsListPage /></LazyLoad>} />
        <Route path="goods/:id" element={<LazyLoad><GoodsDetailPage /></LazyLoad>} />
        <Route path="publish/goods" element={<LazyLoad><PublishGoodsPage /></LazyLoad>} />
        <Route path="publish/goods/:id" element={<LazyLoad><PublishGoodsPage /></LazyLoad>} />
        <Route path="cart" element={<LazyLoad><CartPage /></LazyLoad>} />
        <Route path="square" element={<LazyLoad><SquarePage /></LazyLoad>} />
        <Route path="square/post/:id" element={<LazyLoad><PostDetailPage /></LazyLoad>} />
        <Route path="publish/post" element={<LazyLoad><PublishPostPage /></LazyLoad>} />
        <Route path="publish/post/:id" element={<LazyLoad><PublishPostPage /></LazyLoad>} />
        <Route path="square/lostfound/:id" element={<LazyLoad><LostFoundDetailPage /></LazyLoad>} />
        <Route path="publish/lostfound" element={<LazyLoad><PublishLostFoundPage /></LazyLoad>} />
        <Route path="publish/lostfound/:id" element={<LazyLoad><PublishLostFoundPage /></LazyLoad>} />
        <Route path="search" element={<LazyLoad><SearchPage /></LazyLoad>} />
        <Route path="profile" element={<LazyLoad><MyProfilePage /></LazyLoad>} />
        <Route path="profile/edit" element={<LazyLoad><EditProfilePage /></LazyLoad>} />
        <Route path="profile/goods" element={<LazyLoad><MyGoodsPage /></LazyLoad>} />
        <Route path="profile/posts" element={<LazyLoad><MyPostsPage /></LazyLoad>} />
        <Route path="profile/favorites" element={<LazyLoad><MyFavoritesPage /></LazyLoad>} />
        <Route path="profile/following" element={<LazyLoad><FollowListPage /></LazyLoad>} />
        <Route path="profile/followers" element={<LazyLoad><FollowListPage /></LazyLoad>} />
        <Route path="profile/notifications" element={<LazyLoad><NotificationsPage /></LazyLoad>} />
        <Route path="profile/history" element={<LazyLoad><BrowseHistoryPage /></LazyLoad>} />
        <Route path="profile/blacklist" element={<LazyLoad><BlacklistPage /></LazyLoad>} />
        <Route path="profile/trades" element={<LazyLoad><TradeIntentsPage /></LazyLoad>} />
        <Route path="compare" element={<LazyLoad><ComparePage /></LazyLoad>} />
        <Route path="reservations" element={<LazyLoad><ReservationsPage /></LazyLoad>} />
        <Route path="wanted" element={<LazyLoad><WantedListPage /></LazyLoad>} />
        <Route path="publish/wanted" element={<LazyLoad><PublishWantedPage /></LazyLoad>} />
        <Route path="barter" element={<LazyLoad><BarterPage /></LazyLoad>} />
        <Route path="tags" element={<LazyLoad><TagsPage /></LazyLoad>} />
        <Route path="badges" element={<LazyLoad><BadgesPage /></LazyLoad>} />
        <Route path="profile/password" element={<LazyLoad><ChangePasswordPage /></LazyLoad>} />
        <Route path="profile/security" element={<LazyLoad><AccountSecurityPage /></LazyLoad>} />
        <Route path="user/:id" element={<LazyLoad><UserProfilePage /></LazyLoad>} />
        <Route path="messages" element={<LazyLoad><ConversationsPage /></LazyLoad>} />
        <Route path="messages/:userId" element={<LazyLoad><ChatPage /></LazyLoad>} />
        <Route path="dating" element={<LazyLoad><DatingSquarePage /></LazyLoad>} />
        <Route path="dating/profile" element={<LazyLoad><DatingProfilePage /></LazyLoad>} />
        <Route path="dating/messages" element={<LazyLoad><DatingConversationsPage /></LazyLoad>} />
        <Route path="dating/chat/:userId" element={<LazyLoad><DatingChatPage /></LazyLoad>} />
        <Route path="qa" element={<LazyLoad><QaListPage /></LazyLoad>} />
        <Route path="qa/:id" element={<LazyLoad><QaDetailPage /></LazyLoad>} />
        <Route path="agent" element={<LazyLoad><AgentPage /></LazyLoad>} />
      </Route>

      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<LazyLoad><AdminDashboard /></LazyLoad>} />
        <Route path="content" element={<LazyLoad><AdminContentPage /></LazyLoad>} />
        <Route path="images" element={<LazyLoad><AdminImagesPage /></LazyLoad>} />
        <Route path="users" element={<LazyLoad><AdminUsersPage /></LazyLoad>} />
      </Route>

      <Route path="*" element={<LazyLoad><NotFoundPage /></LazyLoad>} />
    </Routes>
  );
}
