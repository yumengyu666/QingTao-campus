import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { PageTransition } from "@/components/common/PageTransition";
import { BackToTop } from "@/components/common/BackToTop";
import { NavigationContext } from "@/hooks/useAppNavigate";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { DarkModeToggle } from "@/components/common/DarkModeToggle";
import { useUnreadStore } from "@/stores/unreadStore";
import { FiX, FiSearch, FiHome, FiCompass, FiMail, FiUser, FiChevronLeft } from "react-icons/fi";

type TabKey = "home" | "square" | "publish" | "messages" | "profile";

const PUBLISH_OPTIONS = [
  { label: "发布商品", desc: "出售 / 求购 / 出租", path: "/publish/goods", color: "#0066D6", emoji: "🛍️" },
  { label: "发布帖子", desc: "分享校园生活", path: "/publish/post", color: "#FF9500", emoji: "📝" },
  { label: "失物招领", desc: "遗失 / 拾取登记", path: "/publish/lostfound", color: "#34C759", emoji: "🔍" },
  { label: "发布求购", desc: "需要什么说说看", path: "/publish/wanted", color: "#FF3B30", emoji: "💡" },
];

/** Heuristic page titles from URL path */
function getPageTitle(pathname: string): string {
  const segments = pathname.replace(/^\/lg/, "").split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  const titleMap: Record<string, string> = {
    "": "首页", "Square": "广场", "profile": "我的", "messages": "消息",
    "search": "搜索", "goods": "商品", "publish": "发布", "cart": "购物车",
    "post": "帖子", "lostfound": "失物招领", "wanted": "求购", "barter": "以物易物",
    "qa": "答疑", "tags": "话题", "badges": "徽章", "collections": "合集",
    "explore": "探索", "treehole": "树洞", "resources": "学习资料",
    "dating": "恋爱空间", "video": "视频", "agent": "AI助手",
    "edit": "编辑资料", "security": "账号安全", "password": "修改密码",
    "favorites": "我的收藏", "following": "关注", "followers": "粉丝",
    "notifications": "通知", "history": "浏览记录", "blacklist": "黑名单",
    "trades": "交易意向", "reservations": "我的预约", "settings": "设置",
    "new": "新建", "compare": "对比",
  };
  if (titleMap[last]) return titleMap[last];
  if (segments.length > 1 && titleMap[segments[segments.length - 2]]) {
    return titleMap[segments[segments.length - 2]] + "详情";
  }
  return last || "页面";
}

export default function LiquidGlassLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const unreadCount = useUnreadStore((s) => s.msgCount);
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [showPublishSheet, setShowPublishSheet] = useState(false);
  const [tabBarVisible, setTabBarVisible] = useState(true);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const lastScrollY = useRef(0);
  const scrollThreshold = useRef(0);

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const hasTriggeredRefresh = useRef(false);

  const basePath = useMemo(() => {
    return location.pathname.startsWith("/lg") ? "/lg" : "";
  }, [location.pathname]);

  const navContextValue = useMemo(
    () => ({
      basePath,
      nav: (
        to: Parameters<typeof navigate>[0],
        options?: Parameters<typeof navigate>[1]
      ) => {
        if (
          typeof to === "string" &&
          to.startsWith("/") &&
          !to.startsWith("/login") &&
          !to.startsWith("/register") &&
          !to.startsWith("/admin") &&
          !to.startsWith("/lg")
        ) {
          navigate(basePath + to, options);
        } else {
          navigate(to as any, options);
        }
      },
    }),
    [basePath, navigate]
  );

  const tabs: { key: TabKey; label: string; path: string }[] = useMemo(
    () => [
      { key: "home", label: "首页", path: `${basePath}/` },
      { key: "square", label: "广场", path: `${basePath}/square` },
      { key: "publish", label: "发布", path: "#" },
      { key: "messages", label: "消息", path: `${basePath}/messages` },
      { key: "profile", label: "我的", path: `${basePath}/profile` },
    ],
    [basePath]
  );

  const isMainTab = (path: string) =>
    [
      `${basePath}/`,
      `${basePath}/square`,
      `${basePath}/messages`,
      `${basePath}/profile`,
    ]
      .map((p) => p.replace(/\/$/, "") || "/")
      .includes(path.replace(/\/$/, "") || "/");

  const isSubPage = !isMainTab(location.pathname);
  const pageTitle = getPageTitle(location.pathname);

  // Swipe-back gesture for sub-pages (mobile)
  useSwipeBack(() => navigate(-1), isSubPage);

  // Sync active tab from location
  useEffect(() => {
    const p = location.pathname;
    if (p.startsWith(`${basePath}/square`)) setActiveTab("square");
    else if (p.startsWith(`${basePath}/messages`)) setActiveTab("messages");
    else if (p.startsWith(`${basePath}/profile`)) setActiveTab("profile");
    else if (p.startsWith(`${basePath}/publish`)) setActiveTab("publish");
    else setActiveTab("home");
  }, [location.pathname, basePath]);

  // Scroll to top on page change
  useEffect(() => { window.scrollTo({ top: 0 }); }, [location.pathname]);
  // Close publish sheet on navigation
  useEffect(() => { setShowPublishSheet(false); }, [location.pathname]);

  // Keyboard detection: hide tab bar when soft keyboard is open
  useEffect(() => {
    if (!window.visualViewport) return;
    const handler = () => {
      const isOpen = window.visualViewport!.height < window.innerHeight * 0.85;
      setKeyboardOpen(isOpen);
    };
    window.visualViewport.addEventListener("resize", handler);
    return () => window.visualViewport.removeEventListener("resize", handler);
  }, []);

  // Scroll-based tab bar hide/show (main pages only)
  useEffect(() => {
    if (isSubPage) {
      setTabBarVisible(true);
      return;
    }
    const main = document.getElementById("lg-main");
    if (!main) return;

    const handleScroll = () => {
      const currentY = main.scrollTop;
      const diff = currentY - lastScrollY.current;
      scrollThreshold.current += diff;
      if (Math.abs(scrollThreshold.current) < 10) return;
      if (scrollThreshold.current > 0 && currentY > 60) {
        setTabBarVisible(false);
      } else {
        setTabBarVisible(true);
      }
      scrollThreshold.current = 0;
      lastScrollY.current = currentY;
    };

    main.addEventListener("scroll", handleScroll, { passive: true });
    return () => main.removeEventListener("scroll", handleScroll);
  }, [isSubPage]);

  // Pull-to-refresh touch handlers
  useEffect(() => {
    const main = document.getElementById("lg-main");
    if (!main) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (main.scrollTop === 0) {
        touchStartY.current = e.touches[0].clientY;
        isPulling.current = true;
        hasTriggeredRefresh.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current) return;
      const distance = e.touches[0].clientY - touchStartY.current;
      if (distance > 80 && main.scrollTop === 0 && !hasTriggeredRefresh.current) {
        hasTriggeredRefresh.current = true;
        setRefreshing(true);
      }
    };

    const handleTouchEnd = () => {
      if (hasTriggeredRefresh.current) setTimeout(() => window.location.reload(), 400);
      isPulling.current = false;
      hasTriggeredRefresh.current = false;
      setRefreshing(false);
    };

    main.addEventListener("touchstart", handleTouchStart, { passive: true });
    main.addEventListener("touchmove", handleTouchMove, { passive: true });
    main.addEventListener("touchend", handleTouchEnd);
    return () => {
      main.removeEventListener("touchstart", handleTouchStart);
      main.removeEventListener("touchmove", handleTouchMove);
      main.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  const handleTab = useCallback(
    (tab: (typeof tabs)[0]) => {
      if (tab.key === "publish") setShowPublishSheet(true);
      else navigate(tab.path);
    },
    [navigate]
  );

  const handlePublish = useCallback(
    (path: string) => {
      setShowPublishSheet(false);
      navigate(basePath + path);
    },
    [navigate, basePath]
  );

  return (
    <NavigationContext.Provider value={navContextValue}>
      <div className="lg-root flex flex-col lg-bg" style={{ minHeight: "100dvh" }}>
        <a href="#lg-main" className="skip-link">跳转到主要内容</a>

        {/* ── Main-page header ── */}
        {!isSubPage && (
          <header className="lg-header items-center justify-between">
            <span className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">
              轻淘校园
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`${basePath}/search`)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
                aria-label="搜索"
              >
                <FiSearch className="text-[17px]" />
              </button>
              <DarkModeToggle />
            </div>
          </header>
        )}

        {/* ── Sub-page glass header with back button ── */}
        {isSubPage && (
          <header className="lg-header lg-sub-header">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
              aria-label="返回"
            >
              <FiChevronLeft className="text-[20px]" />
            </button>
            <span className="flex-1 text-center text-[15px] font-semibold text-gray-900 dark:text-white truncate px-2">
              {pageTitle}
            </span>
            <div className="w-9" />
          </header>
        )}

        {/* Main scroll area */}
        <main
          id="lg-main"
          className="flex-1 overflow-y-auto"
          style={{
            paddingTop: 8,
            paddingBottom: isSubPage ? 16 : 100,
          }}
        >
          {/* Pull-to-refresh indicator */}
          {refreshing && (
            <div className="flex justify-center py-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                className="w-7 h-7 rounded-full border-2 border-[#0066D6] border-t-transparent"
              />
            </div>
          )}

          <div className="px-4 w-full mx-auto">
            <AnimatePresence mode="wait">
              <PageTransition
                key={location.pathname}
                variant={isSubPage ? "glass" : "default"}
              >
                <Outlet />
              </PageTransition>
            </AnimatePresence>
          </div>
        </main>

        <BackToTop />

        {/* ── Bottom Tab Bar ── */}
        {!isSubPage && !keyboardOpen && (
          <motion.div
            className="lg-tabbar"
            initial={{ y: 50, opacity: 0 }}
            animate={{
              y: tabBarVisible ? 0 : 100,
              opacity: tabBarVisible ? 1 : 0,
            }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
          >
            <div className="lg-tabbar-pill">
              {tabs.map((tab, i) => {
                const isActive = activeTab === tab.key;
                const icons: Record<TabKey, React.ReactNode> = {
                  home: <FiHome size={20} />,
                  square: <FiCompass size={20} />,
                  publish: null,
                  messages: <FiMail size={20} />,
                  profile: <FiUser size={20} />,
                };

                return (
                  <motion.button
                    key={tab.key}
                    onClick={() => handleTab(tab)}
                    initial={{ y: 20, opacity: 0 }}
                    whileTap={{ scale: 0.90 }}
                    animate={{
                      y: 0,
                      opacity: 1,
                      scale: isActive ? [1, 1.06, 1] : 1,
                    }}
                    transition={{
                      delay: i * 0.05 + 0.08,
                      ...(isActive
                        ? { scale: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }
                        : { scale: { duration: 0.15 } }),
                      y: { type: "spring", damping: 26, stiffness: 280 },
                      opacity: { duration: 0.25 },
                    }}
                    className={`lg-tabbar-item ${isActive ? "lg-tabbar-item-active" : "lg-tabbar-item-inactive"}`}
                  >
                    {tab.key === "publish" ? (
                      <motion.div
                        animate={{ rotate: showPublishSheet ? 45 : 0 }}
                        transition={{ type: "spring", damping: 20, stiffness: 260 }}
                        className="w-9 h-9 rounded-xl bg-[#0066D6] flex items-center justify-center text-white text-xl font-bold leading-none shadow-[0_2px_8px_rgba(0,102,214,0.4)]"
                      >
                        +
                      </motion.div>
                    ) : (
                      <span className="lg-tabbar-icon relative" style={{ color: isActive ? "#FFFFFF" : undefined }}>
                        {icons[tab.key]}
                        {tab.key === "messages" && unreadCount > 0 && (
                          <span className="lg-tabbar-badge">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </span>
                    )}
                    <span className={`lg-tabbar-label ${isActive ? "lg-tabbar-label-active" : "lg-tabbar-label-inactive"}`}>
                      {tab.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── Publish Action Sheet ── */}
        <AnimatePresence>
          {showPublishSheet && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="lg-backdrop"
                onClick={() => setShowPublishSheet(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 320 }}
                className="lg-sheet"
              >
                <div className="flex justify-center -mt-2 mb-5">
                  <div className="w-10 h-1 rounded-full bg-black/10 dark:bg-white/15" />
                </div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">发布内容</h3>
                  <button
                    onClick={() => setShowPublishSheet(false)}
                    className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                  >
                    <FiX className="text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {PUBLISH_OPTIONS.map((opt) => (
                    <motion.button
                      key={opt.path}
                      onClick={() => handlePublish(opt.path)}
                      whileTap={{ scale: 0.96 }}
                      className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-white/55 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/8 hover:scale-[1.02] active:scale-[0.97] transition-all"
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                        style={{ background: opt.color + "15", color: opt.color }}
                      >
                        {opt.emoji}
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{opt.label}</span>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">{opt.desc}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </NavigationContext.Provider>
  );
}
