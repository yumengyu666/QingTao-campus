/**
 * SkipToContent — 键盘导航无障碍组件
 * 为键盘用户提供跳过导航直接进入主内容的快捷方式
 *
 * 用法: 在 App.tsx 最顶部放置 <SkipToContent />
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="skip-link"
      aria-label="跳到主要内容"
    >
      跳到主要内容
    </a>
  );
}
