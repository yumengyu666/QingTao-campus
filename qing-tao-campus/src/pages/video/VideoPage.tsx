import { Header } from '@/components/layout/Header';

export default function VideoPage() {
  return (
    <div>
      <Header title="校园视频" showBack />
      <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-secondary)]">
        <p className="text-lg font-medium">📹 视频功能即将上线</p>
        <p className="text-sm mt-2">敬请期待校园短视频功能</p>
      </div>
    </div>
  );
}
