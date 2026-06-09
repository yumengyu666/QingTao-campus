import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function ago(hours: number): Date {
  return new Date(Date.now() - hours * 3600_000);
}

async function main() {
  console.log('🌱 Seeding rich bot data...\n');

  // ─── Get existing users & categories ───
  const users = await prisma.user.findMany({ where: { role: 'user' } });
  const admins = await prisma.user.findMany({ where: { role: 'admin' } });
  const allUsers = [...users, ...admins];
  const categories = await prisma.category.findMany();

  if (users.length < 10) {
    console.log('⚠️  Run prisma/seed.ts first to create base users');
    return;
  }
  console.log(`📋 Found ${users.length} users, ${admins.length} admins, ${categories.length} categories\n`);

  // ─── Clear existing transactional data to avoid duplicates on re-run ───
  await prisma.activityLog.deleteMany({});
  await prisma.dailyCheckin.deleteMany({});
  await prisma.postComment.deleteMany({});
  await prisma.lostFoundComment.deleteMany({});
  await prisma.goodsComment.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.tradeIntent.deleteMany({});
  await prisma.reservation.deleteMany({});
  await prisma.wantedItem.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.favorite.deleteMany({});
  await prisma.notification.deleteMany({});
  console.log('🧹 Cleared transactional data');

  // ═══════════════════════════════════════════
  //  GOODS (40 total — keep originals + add)
  // ═══════════════════════════════════════════
  const existingGoods = await prisma.goods.findMany();
  console.log(`📦 ${existingGoods.length} existing goods kept`);

  const extraGoods: any[] = [
    // ── 教材教辅 (Category 1) ──
    { catIdx: 0, title: '考研数学真题解析 2026版', desc: '张宇高数18讲+线代9讲，9成新，附全套笔记。考完研了低价出。', price: 45, orig: 120, cond: 'like_new', userIdx: 2 },
    { catIdx: 0, title: '大学英语四级真题精讲', desc: '华研外语四级真题2024-2025共10套，听力CD齐全，几乎全新。', price: 15, orig: 58, cond: 'like_new', userIdx: 5 },
    { catIdx: 0, title: 'C++ Primer Plus 第六版', desc: '经典C++教材，前面几章有笔记后面干净。适合计算机专业课。', price: 30, orig: 89, cond: 'used', userIdx: 1 },
    { catIdx: 0, title: '毛概课本+习题集', desc: '大学公共课教材，期末考完出。有简单笔记不影响阅读。', price: 10, orig: 38, cond: 'used', userIdx: 9 },

    // ── 电子产品 (Category 2) ──
    { catIdx: 1, title: 'iPad 9代 64G 星光色', desc: '2023年购入，屏幕贴膜+保护壳。主要用于看文献和刷剧，电池循环不到200次。', price: 1699, orig: 2999, cond: 'used', userIdx: 7 },
    { catIdx: 1, title: '小米手环8 Pro', desc: '买来戴了两个月，功能正常，表带换了新的。送原装充电器。', price: 120, orig: 379, cond: 'like_new', userIdx: 3 },
    { catIdx: 1, title: '漫步者蓝牙耳机', desc: 'WF-1000XM3同款佩戴感，音质不错。续航正常，左右耳均正常。', price: 80, orig: 199, cond: 'used', userIdx: 6 },
    { catIdx: 1, title: '充电宝20000mAh', desc: '罗马仕20000mAh大容量充電宝，支持快充。用了半年，容量无衰减。', price: 35, orig: 89, cond: 'used', userIdx: 4 },

    // ── 运动户外 (Category 3) ──
    { catIdx: 2, title: '李宁羽毛球拍 双拍套装', desc: '入门级双拍套装，含3个羽毛球+拍套。和舍友打球买的，现在谁都不打了哈哈。', price: 60, orig: 159, cond: 'used', userIdx: 8 },
    { catIdx: 2, title: '迪卡侬瑜伽垫 10mm加厚', desc: '买来跳操用的，防滑效果好。用了几次闲置了，折价出。', price: 30, orig: 79, cond: 'like_new', userIdx: 5 },
    { catIdx: 2, title: '户外双肩背包40L', desc: '骆驼户外登山包，背过一次华山。自带防雨罩，多隔层。', price: 80, orig: 229, cond: 'used', userIdx: 2 },

    // ── 生活用品 (Category 4) ──
    { catIdx: 3, title: '收纳箱大号60L', desc: '宿舍收纳神器，蓝色半透明，可叠放。毕业出，宿舍党必入。', price: 15, orig: 35, cond: 'used', userIdx: 1 },
    { catIdx: 3, title: '开学大礼包 全新被褥三件套', desc: '学校发的被褥三件套，全新未拆封。被子+褥子+枕头，适合大一新生。', price: 80, orig: 180, cond: 'brand_new', userIdx: 4 },
    { catIdx: 3, title: '暖水袋 充电式', desc: '冬天必备！充电10分钟保温4小时。防爆设计，用了一个冬天。', price: 15, orig: 39, cond: 'used', userIdx: 9 },

    // ── 服饰鞋包 (Category 5) ──
    { catIdx: 4, title: '冬季加厚卫衣 M码', desc: '黑色连帽卫衣，内里加绒。穿过两三次，洗过一水。适合165-170cm。', price: 35, orig: 129, cond: 'like_new', userIdx: 5 },
    { catIdx: 4, title: '帆布托特包 大容量', desc: '上课通勤用大帆布包，可放14寸笔记本+书本。文艺风，很百搭。', price: 25, orig: 69, cond: 'used', userIdx: 7 },
    { catIdx: 4, title: '男生运动鞋42码', desc: '李宁跑步鞋，穿过一个学期。鞋底磨损不大，洗过很干净。', price: 50, orig: 199, cond: 'used', userIdx: 6 },

    // ── 乐器设备 (Category 6) ──
    { catIdx: 5, title: '尤克里里 入门单板', desc: '23寸单板尤克里里，音色温暖。买来学了两个月，工作太忙没时间弹了。送调音器+教程书。', price: 100, orig: 299, cond: 'used', userIdx: 8 },
    { catIdx: 5, title: '电子琴 61键力度键盘', desc: '美科MK-4100，带力度感应。适合初学者练习，送琴架+琴凳。自提优先。', price: 200, orig: 499, cond: 'used', userIdx: 1 },

    // ── 数码配件 (Category 7) ──
    { catIdx: 6, title: 'iPhone 15 透明磁吸壳', desc: '全新透明MagSafe手机壳，精准开孔。买多了出一个。', price: 10, orig: 29, cond: 'brand_new', userIdx: 3 },
    { catIdx: 6, title: 'USB-C 扩展坞 7合1', desc: 'HDMI+USB3.0*3+SD/TF+PD快充。兼容MacBook/笔记本。', price: 45, orig: 129, cond: 'used', userIdx: 2 },

    // ── 美妆护肤 (Category 9) ──
    { catIdx: 8, title: '薇诺娜防晒乳 50g 全新', desc: '买多了，全新未拆封。敏感肌友好，SPF48 PA+++。', price: 40, orig: 99, cond: 'brand_new', userIdx: 5 },
    { catIdx: 8, title: '完美日记眼影盘 小奥汀联名', desc: '用了3次，颜色很日常。买来发现不适合自己色系。', price: 25, orig: 79, cond: 'like_new', userIdx: 7 },

    // ── 零食饮料 (Category 10) ──
    { catIdx: 9, title: '三只松鼠大礼包 未开封', desc: '室友送的一直没吃，内含坚果+肉脯+果干。保质期到2026年12月。', price: 25, orig: 69, cond: 'brand_new', userIdx: 9 },
    { catIdx: 9, title: '挂耳咖啡 50包', desc: 'UCC职人挂耳咖啡绿色装，还有50包。每天早上都需要咖啡续命，囤太多了。', price: 35, orig: 79, cond: 'like_new', userIdx: 4 },

    // ── 宿舍电器 (Category 12) ──
    { catIdx: 11, title: '桌面USB小风扇', desc: '三档风力，静音设计。USB供电，宿舍自习必备。用了两个月。', price: 15, orig: 39, cond: 'used', userIdx: 6 },
    { catIdx: 11, title: '酷毙灯 LED磁吸', desc: '宿舍神器！磁吸安装不用打孔。三档色温无极调光。买了两个出一个。', price: 18, orig: 49, cond: 'like_new', userIdx: 1 },
    { catIdx: 11, title: '迷你冰箱 宿舍用', desc: '8L小冰箱，制冷效果好。夏天放饮料水果超爽。毕业出。', price: 60, orig: 199, cond: 'used', userIdx: 3 },

    // ── 动漫周边 (Category 14) ──
    { catIdx: 13, title: '海贼王路飞手办 正版一番赏', desc: '一番赏A赏路飞四档手办，全新未拆。柜子里摆不下了。', price: 80, orig: 200, cond: 'brand_new', userIdx: 8 },
    { catIdx: 13, title: '宝可梦毛绒公仔 皮卡丘', desc: '正版宝可梦中心皮卡丘毛绒，约25cm。可爱到犯规，女友非要我再买一个。', price: 35, orig: 89, cond: 'like_new', userIdx: 2 },

    // ── 交通工具 (Category 16) ──
    { catIdx: 15, title: '折叠自行车 9成新', desc: '大行折叠车，校园通勤利器。折叠后放宿舍不占地方。换了新轮胎。', price: 250, orig: 599, cond: 'used', userIdx: 4 },
    { catIdx: 15, title: '电动滑板车', desc: 'Ninebot ES1，续航约15km。充电3小时，适合科学校区通勤。', price: 500, orig: 1299, cond: 'used', userIdx: 6 },

    // ── 免费赠送 (Category 20) ──
    { catIdx: 19, title: '多余的花盆 免费送', desc: '阳台多肉太多，送5个小花盆。陶瓷的，直径8-12cm。科学校区自提。', price: 0, orig: 0, cond: 'used', userIdx: 9 },
    { catIdx: 19, title: '考研资料免费送', desc: '2025考研公共课资料，政治英语数学各科都有。考上了用不到了，免费送给学弟学妹。', price: 0, orig: 0, cond: 'used', userIdx: 2 },
  ];

  let goodsCount = existingGoods.length;
  const createdGoods: any[] = [];
  for (const g of extraGoods) {
    const cat = categories[g.catIdx];
    if (!cat) continue;
    const u = users[g.userIdx % users.length] || users[0];
    const goods = await prisma.goods.create({
      data: {
        userId: u.id,
        categoryId: cat.id,
        title: g.title,
        description: g.desc,
        price: g.price,
        originalPrice: g.orig === 0 ? null : g.orig,
        listType: g.price === 0 ? 'sale' : pick(['sale', 'sale', 'sale', 'rent']),
        condition: g.cond,
        images: '[]',
        campus: pick(['kexue', 'kexue', 'kexue', 'dongfeng']),
        campusLocation: '',
        status: 'approved',
        viewCount: randInt(5, 200),
        createdAt: ago(randInt(1, 720)),
        updatedAt: ago(randInt(0, 24)),
      },
    });
    goodsCount++;
    createdGoods.push(goods);
  }
  console.log(`✅ ${extraGoods.length} new goods (${goodsCount} total)`);

  // ═══════════════════════════════════════════
  //  POSTS (20 total — keep originals + add)
  // ═══════════════════════════════════════════
  const existingPosts = await prisma.post.findMany();
  const extraPosts = [
    { title: '科学校区图书馆开放时间更新了', content: '最新通知：科学校区图书馆自习室延长开放到晚上10点半！再也不用抢座位了，不过高峰期还是要早点去。', userIdx: 1 },
    { title: '有没有一起备考四六级的？互相监督！', content: '六级考了两次没过，这次想找2-3个同学一起组队备考。每天打卡背单词+刷真题，互相监督。有意向的评论区dd。', userIdx: 3 },
    { title: '东风校区食堂避雷指南', content: '给大家总结一下东风校区各食堂的避雷/推荐：\n1. 一食堂二楼麻辣香锅——味道不错量也大\n2. 二食堂的拉面——汤底不错但面有点软\n3. 三食堂自选——性价比高\n大家还有补充的吗？', userIdx: 5 },
    { title: '计算机专业选课求助', content: '大二计算机专业，下学期必修课有数据库、操作系统、计网。想问下学长学姐哪个老师给分高且能学到东西？', userIdx: 2 },
    { title: '周末科学校区操场有唱歌的吗？', content: '周末晚上操场经常有人弹唱，氛围很好！有想一起去的吗？或者有人知道社团的活动时间表吗？', userIdx: 7 },
    { title: '求推荐学校附近的考研寄宿', content: '想找个学校附近的自习室或者考研寄宿，有没有过来人推荐一下？最好是环境安静、价格合理的。', userIdx: 4 },
    { title: '校园猫猫图鉴 📸', content: '在学校生活了三年，整理了校园里的常驻猫咪们。科学校区图书馆后面有一只橘猫特别亲人，东风校区花坛边有只玳瑁猫。附上一些偷拍的美照！（虽然一张也没传上来因为太大了）', userIdx: 9 },
    { title: '吐槽一下这学期的体育课', content: '选课系统崩了三次才选上体育课，结果发现是早上第一节...早起好痛苦。不过体育老师人挺好的，上课比较轻松。', userIdx: 6 },
    { title: '毕业生二手物美价廉', content: '大四了，宿舍东西太多带不走。各种生活用品、书籍、小家电，价格都好说。这两天会在宿舍楼下摆摊，欢迎大家来逛！科学校区8号楼。', userIdx: 3 },
    { title: '辩论社招新——来一起吵架（划掉）交流', content: '校辩论队招新啦！不需要基础，只要你对社会热点有表达的欲望。每周一次训练赛，还会去外校打友谊赛。欢迎加微信了解：debate_qingtao。', userIdx: 8 },
    { title: '宿舍关系求建议', content: '和室友作息不太同步，我习惯早睡早起但室友经常打游戏到半夜。说了几次也没太大改善，又不想把关系搞僵。怎么办？', userIdx: 1 },
    { title: '科学校区到东风校区拼车帖', content: '每周三下午要去东风校区上实验课，有没有同路的同学一起拼车？打车大概25分钟，均摊下来很划算。', userIdx: 4 },
    { title: '分享一下转专业经验', content: '大一下成功从材料转到计算机。分享一下经验：绩点很重要，计算机学院要求原专业前30%。笔试考C语言和数学，面试主要问为什么转专业。有想法的要早准备！', userIdx: 2 },
    { title: '表白墙：今天食堂遇到一个好好看的小姐姐', content: '中午在一食堂二楼，穿白色连衣裙的那个小姐姐，笑起来很好看。虽然不敢上去要微信，但是希望这条能被你看到！', userIdx: 7, anon: true },
    { title: '校园网提速了吗？', content: '最近感觉校园网速度快了不少，下载能到10MB/s了。是错觉还是真的升级了？有同样感觉的吗？', userIdx: 6 },
    { title: '求拼单买水果！', content: '学校水果店有时候买得多更划算，想找几个同学一起拼单。每次买一箱草莓/车厘子分着吃，有感兴趣的吗？', userIdx: 9 },
  ];

  for (const p of extraPosts) {
    const u = users[p.userIdx % users.length] || users[0];
    await prisma.post.create({
      data: {
        userId: u.id,
        title: p.title,
        content: p.content,
        images: '[]',
        status: 'approved',
        viewCount: randInt(10, 500),
        createdAt: ago(randInt(1, 720)),
      },
    });
  }
  const postCount = existingPosts.length + extraPosts.length;
  console.log(`✅ ${extraPosts.length} new posts (${postCount} total)`);

  // ═══════════════════════════════════════════
  //  POST COMMENTS (30+ comments on posts)
  // ═══════════════════════════════════════════
  const userPool = [...users]; // exclude admins for comments
  const allPosts = await prisma.post.findMany({ where: { status: 'approved' } });
  const commentTemplates = [
    '同意！我也这么觉得',
    '码住，谢谢分享',
    '很有用，收藏了',
    '哈哈哈太真实了',
    '请问具体位置在哪里呀？',
    '举手！我想加入',
    '已经关注了，好帖顶一个',
    '我也遇到过同样的问题',
    '有没有更多推荐？',
    '这个确实不错，亲测有效',
    '蹲一个后续',
    '打扰一下，想了解更多',
    '说得好有道理！',
    '能不能加个微信细聊？',
    '同问同问',
  ];

  let commentCount = 0;
  for (const post of allPosts.slice(0, 20)) {
    // 1-3 comments per post
    const numComments = randInt(0, 3) + 1;
    const commenters = [...userPool].sort(() => Math.random() - 0.5).slice(0, numComments);
    for (const commenter of commenters) {
      await prisma.postComment.create({
        data: {
          postId: post.id,
          userId: commenter.id,
          content: pick(commentTemplates),
          status: 'approved',
          createdAt: ago(randInt(0, 48)),
        },
      });
      commentCount++;
    }
  }
  console.log(`✅ ${commentCount} post comments`);

  // ═══════════════════════════════════════════
  //  LOST & FOUND (10 total — keep originals)
  // ═══════════════════════════════════════════
  const existingLf = await prisma.lostFound.findMany();
  const extraLf = [
    { type: 'lost', title: '丢失钥匙串', desc: '钥匙串上有银色U盘和一个小熊挂件，昨晚可能在操场上丢了。有捡到的麻烦联系我！', campus: 'kexue', loc: '科学校区操场', time: '6月7日 晚8点左右', userIdx: 3, wx: 'wangwu_wx', qq: '20003' },
    { type: 'found', title: '捡到一个保温杯', desc: '在科学校区图书馆四楼自习区捡到的，白色膳魔师保温杯。失主来认领时请描述杯子上有无贴纸等特征。', campus: 'kexue', loc: '科学校区图书馆四楼', time: '6月8日 下午2点', userIdx: 5, wx: 'xiaohong_wx', qq: '20004' },
    { type: 'lost', title: '丢失充电宝 罗马仕白色', desc: '白色罗马仕20000mAh充电宝，在二食堂吃饭忘拿了。回去找已经不见了，里面有我的个人信息。', campus: 'dongfeng', loc: '东风校区二食堂', time: '6月6日 中午12点', userIdx: 7, wx: 'xiaoyu_wx', qq: '20008' },
    { type: 'found', title: '捡到校园卡 刘某某', desc: '在科学校区8号楼前捡到校园卡一张，学号2023110xxxx。请失主联系我取回。', campus: 'kexue', loc: '科学校区8号楼', time: '6月9日 上午10点', userIdx: 9, wx: 'chenchen_wx', qq: '20010' },
    { type: 'lost', title: '着急！丢失身份证', desc: '身份证丢了，下周就要考试急用！周五下午可能在去火车站的路上掉的。有捡到的请一定联系我，重金酬谢！', campus: 'kexue', loc: '科学校区到地铁站沿线', time: '6月5日 下午4点', userIdx: 2, wx: 'zhangsan_wx', qq: '20001', reward: '100元酬谢' },
    { type: 'found', title: '捡到一袋零食', desc: '在东风校区操场看台捡到一袋零食，还没开封。看起来是刚买的，失主快来认领。', campus: 'dongfeng', loc: '东风校区操场看台', time: '6月9日 晚7点', userIdx: 4, wx: 'lisi_wx', qq: '20002' },
    { type: 'lost', title: '蓝牙耳机盒丢了', desc: '耳机盒是白色的，耳机倒是在我耳朵上...所以只丢了盒子。在宿舍到教学楼的路上丢的，小小一个真的难找。', campus: 'kexue', loc: '科学校区7号楼到教学楼路上', time: '6月8日 早上8点', userIdx: 1, wx: '', qq: '20001' },
  ];

  for (const lf of extraLf) {
    const u = users[lf.userIdx % users.length] || users[0];
    await prisma.lostFound.create({
      data: {
        userId: u.id,
        type: lf.type as 'lost' | 'found',
        title: lf.title,
        description: lf.desc,
        images: '[]',
        campus: lf.campus,
        location: lf.loc,
        lostTime: lf.time,
        contactWechat: lf.wx,
        contactQq: lf.qq,
        reward: lf.reward || '',
        status: 'approved',
        viewCount: randInt(5, 100),
        createdAt: ago(randInt(1, 168)),
      },
    });
  }
  const lfCount = existingLf.length + extraLf.length;
  console.log(`✅ ${extraLf.length} new lost&found (${lfCount} total)`);

  // ═══════════════════════════════════════════
  //  LOST & FOUND COMMENTS
  // ═══════════════════════════════════════════
  const allLf = await prisma.lostFound.findMany({ where: { status: 'approved' } });
  let lfCommentCount = 0;
  for (const lf of allLf.slice(0, 8)) {
    const numComments = randInt(0, 2);
    for (let i = 0; i < numComments; i++) {
      const commenter = pick(userPool.filter(u => u.id !== lf.userId));
      await prisma.lostFoundComment.create({
        data: {
          lostFoundId: lf.id,
          userId: commenter.id,
          content: pick(['我好像见过！帮你留意', '帮转，希望早日找到', '找到了吗？', '顶一下让更多人看到']),
          status: 'approved',
          createdAt: ago(randInt(0, 48)),
        },
      });
      lfCommentCount++;
    }
  }
  console.log(`✅ ${lfCommentCount} lost&found comments`);

  // ═══════════════════════════════════════════
  //  CHECK-IN RECORDS
  // ═══════════════════════════════════════════
  let checkinCount = 0;
  for (let di = 0; di < 14; di++) {
    const date = new Date(Date.now() - di * 86400_000);
    const dateStr = date.toISOString().slice(0, 10);
    // 5-8 users check in each day
    const checkerCount = randInt(5, 8);
    const checkers = [...userPool].sort(() => Math.random() - 0.5).slice(0, checkerCount);
    for (const u of checkers) {
      try {
        await prisma.dailyCheckin.create({
          data: {
            userId: u.id,
            checkinDate: dateStr,
            streak: di === 0 ? randInt(1, 7) : randInt(0, 3),
            createdAt: new Date(date.getTime() + randInt(0, 86400) * 1000),
          },
        });
        checkinCount++;
      } catch {
        // unique constraint, skip
      }
    }
  }
  console.log(`✅ ${checkinCount} check-in records`);

  // ═══════════════════════════════════════════
  //  ACTIVITY LOGS
  // ═══════════════════════════════════════════
  const actions = ['login', 'publish_goods', 'comment', 'checkin', 'view_goods', 'search', 'favorite'] as const;
  const allGoods = await prisma.goods.findMany({ take: 20 });
  let activityCount = 0;
  for (let i = 0; i < 50; i++) {
    const u = pick(userPool);
    const action = pick([...actions]);
    const targetType = action === 'publish_goods' || action === 'view_goods' || action === 'favorite' ? 'goods'
      : action === 'comment' ? 'post' : null;
    const targetId = targetType === 'goods' && allGoods.length > 0 ? pick(allGoods).id : null;
    await prisma.activityLog.create({
      data: {
        userId: u.id,
        action,
        targetType,
        targetId,
        detail: '{}',
        ip: '127.0.0.1',
        createdAt: ago(randInt(0, 168)),
      },
    });
    activityCount++;
  }
  console.log(`✅ ${activityCount} activity logs`);

  // ═══════════════════════════════════════════
  //  TRADE INTENTS
  // ═══════════════════════════════════════════
  const saleGoods = await prisma.goods.findMany({ where: { listType: 'sale', status: 'approved' }, take: 10 });
  let tradeCount = 0;
  for (let i = 0; i < 5; i++) {
    const g = saleGoods[i];
    if (!g) continue;
    const buyerIdx = (i + 3) % userPool.length;
    const buyer = userPool[buyerIdx];
    if (buyer.id === g.userId) continue;
    try {
      await prisma.tradeIntent.create({
        data: {
          goodsId: g.id,
          buyerId: buyer.id,
          sellerId: g.userId,
          message: pick(['请问还在吗？想买！', '能便宜点吗？', '可以看看实物吗？', '什么时候方便交易？']),
          status: pick(['pending', 'pending', 'completed']),
          createdAt: ago(randInt(1, 120)),
        },
      });
      tradeCount++;
    } catch {
      // unique constraint
    }
  }
  console.log(`✅ ${tradeCount} trade intents`);

  // ═══════════════════════════════════════════
  //  WANTED ITEMS
  // ═══════════════════════════════════════════
  const wantedItems = [
    { title: '求一台二手电动车', budget: 800, cat: '交通工具', campus: 'kexue', desc: '科学校区太大了想买辆二手电动车代步', userIdx: 1 },
    { title: '求购二手自行车', budget: 150, cat: '交通工具', campus: 'dongfeng', desc: '上课通勤用', userIdx: 5 },
    { title: '想收一台微单相机', budget: 2000, cat: '摄影器材', campus: 'kexue', desc: '入门级微单，索尼或佳能', userIdx: 7 },
    { title: '求考研数学笔记', budget: 50, cat: '教材教辅', campus: 'kexue', desc: '2026考研，想要一份完整的数学笔记', userIdx: 3 },
    { title: '求购寝室用小冰箱', budget: 80, cat: '宿舍电器', campus: 'dongfeng', desc: '夏天到了想冰点饮料', userIdx: 9 },
  ];

  for (const w of wantedItems) {
    const u = users[w.userIdx % users.length] || users[0];
    await prisma.wantedItem.create({
      data: {
        userId: u.id,
        title: w.title,
        category: w.cat,
        campus: w.campus,
        budget: w.budget,
        description: w.desc,
        images: '[]',
        createdAt: ago(randInt(1, 168)),
      },
    });
  }
  console.log(`✅ ${wantedItems.length} wanted items`);

  // ═══════════════════════════════════════════
  //  NOTIFICATIONS (background data)
  // ═══════════════════════════════════════════
  const notifTypes = ['review_result', 'new_follower', 'goods_sold', 'announcement'] as const;
  let notifCount = 0;
  for (const u of userPool.slice(0, 5)) {
    const numNotifs = randInt(2, 5);
    for (let i = 0; i < numNotifs; i++) {
      const notifType = pick([...notifTypes]);
      await prisma.notification.create({
        data: {
          userId: u.id,
          type: notifType,
          title: pick(['审核通过通知', '有新粉丝', '商品被收藏', '系统公告']),
          content: pick(['您发布的内容已审核通过', '用户xxx关注了你', '您的商品被加入收藏']),
          isRead: Math.random() > 0.5,
          createdAt: ago(randInt(1, 336)),
        },
      });
      notifCount++;
    }
  }
  console.log(`✅ ${notifCount} notifications`);

  // ═══════════════════════════════════════════
  //  FOLLOWS (social graph)
  // ═══════════════════════════════════════════
  let followCount = 0;
  for (const u of userPool) {
    const numToFollow = randInt(1, 5);
    const candidates = userPool.filter(other => other.id !== u.id).sort(() => Math.random() - 0.5).slice(0, numToFollow);
    for (const target of candidates) {
      try {
        await prisma.follow.create({
          data: { followerId: u.id, followingId: target.id, createdAt: ago(randInt(1, 720)) },
        });
        followCount++;
      } catch { /* unique constraint */ }
    }
  }
  console.log(`✅ ${followCount} follows`);

  console.log(`\n🎉 Bot data seeding complete!`);
  console.log(`   📦 ${goodsCount} goods total`);
  console.log(`   📝 ${postCount} posts total`);
  console.log(`   💬 ${commentCount} post comments`);
  console.log(`   🔍 ${lfCount} lost&found items`);
  console.log(`   📅 ${checkinCount} check-in records`);
  console.log(`   🔄 ${activityCount} activity logs`);
  console.log(`   🤝 ${tradeCount} trade intents`);
  console.log(`   📋 ${wantedItems.length} wanted items`);
  console.log(`   👥 ${followCount} follows`);
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
