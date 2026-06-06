// 更新校园二手平台分类 — 更专业、更适合的图标
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  { id: 49, name: '教材教辅', icon: '📚', sortOrder: 1 },
  { id: 50, name: '数码电子', icon: '📱', sortOrder: 2 },
  { id: 51, name: '生活日用', icon: '🛒', sortOrder: 3 },
  { id: 52, name: '服饰鞋包', icon: '👟', sortOrder: 4 },
  { id: 53, name: '宿舍好物', icon: '🛋️', sortOrder: 5 },
  { id: 54, name: '运动健身', icon: '🏀', sortOrder: 6 },
  { id: 55, name: '美妆',     icon: '✨', sortOrder: 7 },
  { id: 56, name: '其他',     icon: '📦', sortOrder: 8 },
];

async function main() {
  for (const cat of categories) {
    await prisma.category.update({
      where: { id: cat.id },
      data: { name: cat.name, icon: cat.icon, sortOrder: cat.sortOrder },
    });
  }
  console.log('Categories updated:');
  const all = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
  all.forEach(c => console.log(`  ${c.id}: ${c.icon} ${c.name}`));
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
