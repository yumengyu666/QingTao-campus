import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Categories ───
  const categories = [
    { name: '教材教辅', icon: '📚', sortOrder: 1 },
    { name: '电子产品', icon: '💻', sortOrder: 2 },
    { name: '运动户外', icon: '🏃', sortOrder: 3 },
    { name: '生活用品', icon: '📦', sortOrder: 4 },
    { name: '服饰鞋包', icon: '👗', sortOrder: 5 },
    { name: '乐器设备', icon: '🎸', sortOrder: 6 },
    { name: '数码配件', icon: '🔌', sortOrder: 7 },
    { name: '其他闲置', icon: '✨', sortOrder: 8 },
    { name: '美妆护肤', icon: '💄', sortOrder: 9 },
    { name: '零食饮料', icon: '🍪', sortOrder: 10 },
    { name: '床上用品', icon: '🛏', sortOrder: 11 },
    { name: '宿舍电器', icon: '🔋', sortOrder: 12 },
    { name: '文具办公', icon: '✏️', sortOrder: 13 },
    { name: '动漫周边', icon: '🎮', sortOrder: 14 },
    { name: '绿植花卉', icon: '🌵', sortOrder: 15 },
    { name: '交通工具', icon: '🛴', sortOrder: 16 },
    { name: '摄影器材', icon: '📷', sortOrder: 17 },
    { name: '宠物用品', icon: '🐱', sortOrder: 18 },
    { name: '票券卡类', icon: '🎫', sortOrder: 19 },
    { name: '免费赠送', icon: '🎁', sortOrder: 20 },
  ];
  for (const c of categories) {
    await prisma.category.upsert({ where: { id: c.sortOrder }, create: c, update: c });
  }
  console.log('✅ 20 categories');

  // ─── Users ───
  const hash = await bcrypt.hash('123456', 12);

  // 2 Admins
  const admin1 = await prisma.user.upsert({
    where: { username: 'admin' },
    create: { username: 'admin', passwordHash: hash, nickname: '超级管理员', role: 'admin', bio: '平台管理员', campusArea: 'kexue', wechat: 'admin_wechat', qq: '10001' },
    update: {},
  });
  const admin2 = await prisma.user.upsert({
    where: { username: 'admin2' },
    create: { username: 'admin2', passwordHash: hash, nickname: '审核管理员', role: 'admin', bio: '负责图片审核', campusArea: 'dongfeng', wechat: 'admin2_wx', qq: '10002' },
    update: {},
  });
  console.log('✅ 2 admins (admin / 123456, admin2 / 123456)');

  // 10 Regular Users
  const users = [
    { username: 'zhangsan', nickname: '张三', bio: '大三计算机学院，热爱编程', campusArea: 'kexue', wechat: 'zhangsan_wx', qq: '20001' },
    { username: 'lisi', nickname: '李四', bio: '大二经管学院，喜欢运动', campusArea: 'dongfeng', wechat: 'lisi_wx', qq: '20002' },
    { username: 'wangwu', nickname: '王五', bio: '大一新生，什么都想买', campusArea: 'kexue', wechat: 'wangwu_wx', qq: '20003' },
    { username: 'xiaohong', nickname: '小红', bio: '大四学姐，毕业清仓', campusArea: 'kexue', wechat: 'xiaohong_wx', qq: '20004' },
    { username: 'xiaoming', nickname: '小明', bio: '研究生，专注科研', campusArea: 'dongfeng', wechat: 'xiaoming_wx', qq: '20005' },
    { username: 'xiaomei', nickname: '小美', bio: '艺术设计学院', campusArea: 'dongfeng', wechat: 'xiaomei_wx', qq: '20006' },
    { username: 'dapeng', nickname: '大鹏', bio: '体育学院，篮球爱好者', campusArea: 'kexue', wechat: 'dapeng_wx', qq: '20007' },
    { username: 'xiaoyu', nickname: '小鱼', bio: '外国语学院，爱好摄影', campusArea: 'kexue', wechat: 'xiaoyu_wx', qq: '20008' },
    { username: 'afei', nickname: '阿飞', bio: '音乐学院，吉他手', campusArea: 'dongfeng', wechat: 'afei_wx', qq: '20009' },
    { username: 'chenchen', nickname: '晨晨', bio: '大二食品学院，吃货一枚', campusArea: 'kexue', wechat: 'chenchen_wx', qq: '20010' },
  ];

  const createdUsers: any[] = [admin1, admin2];
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { username: u.username },
      create: { ...u, passwordHash: hash, role: 'user', status: 'active' },
      update: {},
    });
    createdUsers.push(user);
  }
  console.log('✅ 10 users (password: 123456)');

  // ─── Banners ───
  const banners = [
    { imageUrl: '/banner1.webp', linkUrl: '', sortOrder: 1 },
    { imageUrl: '/banner2.webp', linkUrl: '', sortOrder: 2 },
    { imageUrl: '/banner3.webp', linkUrl: '', sortOrder: 3 },
    { imageUrl: '/banner4.webp', linkUrl: '', sortOrder: 4 },
    { imageUrl: '/banner5.webp', linkUrl: '', sortOrder: 5 },
  ];
  for (let i = 0; i < banners.length; i++) {
    await prisma.banner.upsert({ where: { id: i + 1 }, create: banners[i], update: banners[i] });
  }
  console.log('✅ 5 banners');

  // ─── Sample Goods ───
  const sampleGoods = [
    { userId: createdUsers[2].id, categoryId: 1, title: '《数据结构》教材 近乎全新', description: '上学期买的，只用了一学期，基本没划线。原价45，现在20出。', price: 20, originalPrice: 45, listType: 'sale', condition: 'like_new', campus: 'kexue', campusLocation: '科学校区图书馆门口' },
    { userId: createdUsers[3].id, categoryId: 2, title: '机械键盘 Cherry青轴', description: '用了半年，手感很好，换了无线所以出掉。送拔键器。', price: 150, originalPrice: 399, listType: 'sale', condition: 'used', campus: 'dongfeng', campusLocation: '东风校区3号宿舍楼' },
    { userId: createdUsers[4].id, categoryId: 3, title: '九成新瑜伽垫', description: '买来只用过两次，厚度10mm，防滑。', price: 25, originalPrice: 59, listType: 'sale', condition: 'like_new', campus: 'kexue', campusLocation: '科学校区体育馆' },
    { userId: createdUsers[5].id, categoryId: 1, title: '求购《高等数学》上下册', description: '求购第七版同济大学高等数学上下册，要求笔记少一点。', price: 30, listType: 'buy', condition: 'used', campus: 'kexue' },
    { userId: createdUsers[6].id, categoryId: 12, title: '小功率宿舍电煮锅', description: '功率300W，宿舍能用。煮面煮粥都很方便，毕业了用不到了。', price: 18, originalPrice: 45, listType: 'sale', condition: 'used', campus: 'dongfeng' },
    { userId: createdUsers[7].id, categoryId: 17, title: '佳能镜头 50mm f/1.8', description: '小痰盂三代，箱说全，镜片无划痕。换了全画幅所以出。', price: 500, originalPrice: 899, listType: 'sale', condition: 'like_new', campus: 'kexue' },
    { userId: createdUsers[8].id, categoryId: 6, title: '民谣吉他 八成新', description: '入门级民谣吉他，音色不错，送琴包和调音器。', price: 200, originalPrice: 500, listType: 'sale', condition: 'used', campus: 'dongfeng' },
    { userId: createdUsers[3].id, categoryId: 20, title: '免费送多余的多肉植物', description: '阳台放不下了，免费送给喜欢绿植的同学。每人限领一盆。', price: 0, listType: 'sale', condition: 'used', campus: 'kexue', campusLocation: '科学校区12号宿舍楼' },
  ];

  for (const g of sampleGoods) {
    await prisma.goods.create({
      data: {
        ...g,
        images: JSON.stringify([]),
        status: 'approved',
        description: g.description || '',
        originalPrice: g.originalPrice || null,
        campusLocation: g.campusLocation || '',
        deposit: null, rentStart: null, rentEnd: null,
      },
    });
  }
  console.log('✅ 8 sample goods');

  // ─── Sample Posts ───
  const posts = [
    { userId: createdUsers[2].id, title: '科学校区食堂三楼新开了家麻辣烫', content: '今天刚去尝了，味道很不错！价格也实惠，一碗15块。推荐给科学校区的同学们。' },
    { userId: createdUsers[4].id, title: '东风校区附近有没有好的打印店？', content: '要打印毕业论文了，求推荐东风校区附近价格实惠的打印店。最好能胶装的。' },
    { userId: createdUsers[6].id, title: '分享一下这学期的选课经验', content: '大二的同学们注意了，张老师的Java课非常推荐，讲课清楚给分也大方。李老师的数据结构比较严格但是能学到很多东西。' },
    { userId: createdUsers[8].id, title: '吉他社招新啦！', content: '无论你有没有基础，只要喜欢音乐都可以来。每周三晚上7点活动中心排练。' },
  ];

  for (const p of posts) {
    await prisma.post.create({ data: { ...p, images: '[]', status: 'approved' } });
  }
  console.log('✅ 4 sample posts');

  // ─── Sample LostFound ───
  const lfItems = [
    { userId: createdUsers[9].id, type: 'lost', title: '丢失蓝色卡包', description: '昨天中午在科学校区食堂二楼丢失，内有校园卡和身份证。找到当面酬谢50元！', campus: 'kexue', location: '科学校区食堂二楼', lostTime: '2026年5月30日 中午12点左右', contactWechat: 'chenchen_wx', contactQq: '20010', reward: '50元酬谢' },
    { userId: createdUsers[10].id, type: 'found', title: '捡到一副蓝牙耳机', description: '在东风校区操场捡到的，白色充电仓。请失主联系我认领，需要描述耳机品牌和特征。', campus: 'dongfeng', location: '东风校区操场', lostTime: '2026年6月1日 下午4点', contactWechat: 'afei_wx', contactQq: '20009', reward: '' },
    { userId: createdUsers[7].id, type: 'lost', title: '丢失校园卡', description: '今天早上在图书馆丢失校园卡一张，学号202308xxxx。捡到的同学麻烦联系我，非常感谢！', campus: 'kexue', location: '科学校区图书馆3楼', lostTime: '2026年6月1日 上午9点', contactWechat: 'xiaoyu_wx', contactQq: '20008', reward: '' },
  ];

  for (const lf of lfItems) {
    await prisma.lostFound.create({ data: { ...lf, images: '[]', status: 'approved' } });
  }
  console.log('✅ 3 sample lostfound items');

  // ─── Badges ───
  const badges = [
    { name: '初来乍到', icon: '🌱', description: '完成首次签到' },
    { name: '签到达人', icon: '🔥', description: '连续签到7天' },
    { name: '签到王者', icon: '👑', description: '连续签到30天' },
    { name: '发布先锋', icon: '📦', description: '发布首个商品' },
    { name: '社交达人', icon: '💬', description: '发布10条评论' },
    { name: '交易能手', icon: '🤝', description: '完成首次交易' },
    { name: '热心肠', icon: '❤️', description: '帮助他人10次' },
    { name: '鉴定师', icon: '🔍', description: '浏览100个商品' },
  ];
  for (const b of badges) {
    await prisma.badge.upsert({ where: { name: b.name }, update: b, create: b });
  }
  console.log(`  ✅ ${badges.length} badges created`);

  // ─── Topic Tags ───
  const tags = [
    { name: '教材', color: '#6366f1' }, { name: '考研', color: '#ef4444' },
    { name: '四六级', color: '#f59e0b' }, { name: '电脑', color: '#10b981' },
    { name: '手机', color: '#8b5cf6' }, { name: '自行车', color: '#06b6d4' },
    { name: '宿舍', color: '#ec4899' }, { name: '食堂', color: '#f97316' },
    { name: '选课', color: '#14b8a6' }, { name: '毕业', color: '#6366f1' },
  ];
  for (const t of tags) {
    await prisma.topicTag.upsert({ where: { name: t.name }, update: t, create: t });
  }
  console.log(`  ✅ ${tags.length} topic tags created`);

  console.log('\n🎉 Seed complete!');
  console.log('  Admins: admin/123456, admin2/123456');
  console.log('  Users:  zhangsan ~ chenchen / 123456');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
