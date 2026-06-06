/**
 * 数据库重置脚本 — 清空所有数据，创建 3 个管理员账号 + 基础分类
 * 用法: npx tsx src/scripts/reset-db.ts
 */
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../services/auth.service';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 轻淘 Campus 数据库重置 ===\n');

  // 1. 清空所有表
  console.log('清理现有数据...');
  // skip tables that may not exist yet (pending schema migration)
  await prisma.review.deleteMany().catch(() => {});
  await prisma.report.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.datingMessage.deleteMany();
  await prisma.datingRequest.deleteMany();
  await prisma.datingFollow.deleteMany();
  await prisma.datingPost.deleteMany();
  await prisma.datingProfile.deleteMany();
  await prisma.block.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.goodsComment.deleteMany();
  await prisma.goods.deleteMany();
  await prisma.postComment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.lostFoundComment.deleteMany();
  await prisma.lostFound.deleteMany();
  await prisma.treeHoleComment.deleteMany();
  await prisma.treeHolePost.deleteMany();
  await prisma.qaVote.deleteMany();
  await prisma.qaAnswer.deleteMany();
  await prisma.qaPost.deleteMany();
  await prisma.courseResource.deleteMany();
  await prisma.searchLog.deleteMany();
  await prisma.imageReview.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.profileChange.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  console.log('  已清空');

  // 2. 创建基础分类
  console.log('\n创建基础分类...');
  const categories = [
    { name: '教材', icon: '📚', sortOrder: 1 },
    { name: '数码', icon: '💻', sortOrder: 2 },
    { name: '生活', icon: '🏠', sortOrder: 3 },
    { name: '服饰', icon: '👗', sortOrder: 4 },
    { name: '美妆', icon: '💄', sortOrder: 5 },
    { name: '运动', icon: '⚽', sortOrder: 6 },
    { name: '其他', icon: '📦', sortOrder: 7 },
  ];
  for (const cat of categories) {
    await prisma.category.create({ data: cat });
  }
  console.log(`  已创建 ${categories.length} 个分类`);

  // 3. 创建 3 个管理员账号
  console.log('\n创建管理员账号...');
  const pwd1 = await hashPassword('admin123456');
  const pwd2 = await hashPassword('SuperAdmin@2026');
  const pwd3 = await hashPassword('ZZULI@2026');

  await prisma.user.create({
    data: { username: 'admin', passwordHash: pwd1, nickname: '系统管理员', role: 'admin', status: 'active' },
  });
  console.log('  ✅ admin / admin123456 — 系统管理员');

  await prisma.user.create({
    data: { username: 'superadmin', passwordHash: pwd2, nickname: '超级管理员', role: 'admin', status: 'active' },
  });
  console.log('  ✅ superadmin / SuperAdmin@2026 — 超级管理员');

  await prisma.user.create({
    data: { username: 'schooladmin', passwordHash: pwd3, nickname: '校务管理', role: 'admin', status: 'active' },
  });
  console.log('  ✅ schooladmin / ZZULI@2026 — 校务管理');

  console.log('\n=== 重置完成 ===');
}

main()
  .catch((e) => { console.error('重置失败:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
