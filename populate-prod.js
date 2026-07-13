const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
const now = Date.now();

async function main() {
  console.log("Populating production data...");
  const hash = await bcrypt.hash("123456", 12);

  // admin2
  await prisma.user.upsert({
    where: { username: "admin2" },
    create: { username: "admin2", passwordHash: hash, nickname: "审核管理员", role: "admin", bio: "负责内容审核", campusArea: "dongfeng" },
    update: {},
  });
  console.log("admin2 done");

  // 10 users
  const userDefs = [
    { username: "轻大计算机小王", nickname: "轻大计算机小王", bio: "软件工程大三，热爱开源喜欢打篮球", campusArea: "kexue", wechat: "coder_wang", qq: "1234567890" },
    { username: "东风校区小美", nickname: "东风校区小美", bio: "艺术设计学院大二，喜欢画画和摄影", campusArea: "dongfeng", wechat: "xiaomei_art", qq: "2345678901" },
    { username: "科学校区张三", nickname: "科学校区张三", bio: "计算机学院大一新生，热爱游戏", campusArea: "kexue", wechat: "zhangsan_cs", qq: "3456789012" },
    { username: "图书馆常驻人口", nickname: "图书馆常驻人口", bio: "考研党，每天泡图书馆偶尔冒泡", campusArea: "kexue", wechat: "lib_guy", qq: "4567890123" },
    { username: "追风少年", nickname: "追风少年", bio: "体育学院大二，跑步骑行爱好者", campusArea: "dongfeng", wechat: "runner_boy", qq: "5678901234" },
    { username: "甜甜圈本圈", nickname: "甜甜圈本圈", bio: "食品学院大三，热爱烘焙和甜点", campusArea: "kexue", wechat: "sweet_donut", qq: "6789012345" },
    { username: "代码搬运工", nickname: "代码搬运工", bio: "计科大三，日常搬砖写bug", campusArea: "kexue", wechat: "code_mover", qq: "7890123456" },
    { username: "小透明同学", nickname: "小透明同学", bio: "外国语学院，低调但热心", campusArea: "dongfeng", wechat: "tiny_tx", qq: "8901234567" },
    { username: "搬砖小能手", nickname: "搬砖小能手", bio: "土木工程大四，工地实习中", campusArea: "kexue", wechat: "brick_master", qq: "9012345678" },
    { username: "夜猫子熬夜王", nickname: "夜猫子熬夜王", bio: "数理学院，晚上不睡早上不起", campusArea: "dongfeng", wechat: "night_owl", qq: "0123456789" },
  ];
  const users = [];
  for (const u of userDefs) {
    const user = await prisma.user.upsert({
      where: { username: u.username },
      create: { ...u, passwordHash: hash, role: "user", status: "active" },
      update: {},
    });
    users.push(user);
  }
  console.log(users.length + " users done (pw: 123456)");

  // 5 banners
  for (let i = 1; i <= 5; i++)
    await prisma.banner.upsert({ where: { id: i }, create: { imageUrl: "/banner" + i + ".webp", linkUrl: "", sortOrder: i }, update: {} });
  console.log("5 banners done");

  // 60 goods
  const gs = [
    ["出考研英语词汇红宝书","背了一半，几乎全新。科学校区面交。",20,45,1,"like_new","sale","kexue","图书馆门口"],
    ["机械键盘 ikbc C87 茶轴","用了半年，换了无线键盘所以出。",120,349,7,"used","sale","kexue","12号宿舍楼"],
    ["二手吉他 雅马哈 F310","入门神器，练了一年换全单了。",450,899,6,"used","sale","kexue",""],
    ["闲置运动鞋 Nike AF1 42码","买小了只穿过两次，几乎全新。",350,799,5,"like_new","sale","kexue",""],
    ["求购二手显示器 24寸以上","至少1080P，科学校区最好。",400,0,2,"used","buy","kexue",""],
    ["求一个二手篮球","斯伯丁的最好，打比赛用。",30,0,3,"used","buy","dongfeng",""],
    ["出闲置台灯 LED护眼","宿舍神器，三档调光USB充电。",35,89,12,"used","sale","kexue",""],
    ["出床上书桌","木质折叠桌，9成新。",40,80,11,"like_new","sale","dongfeng",""],
    ["计算机网络第七版","课本保存完好，少量笔记。",15,39,1,"used","sale","kexue",""],
    ["转让校园网账号剩3个月","下学期出去实习了转让。",60,90,8,"used","sale","dongfeng",""],
    ["出iPad 2018 128G","考研时候买的，电池85%。",800,2588,2,"used","sale","kexue","图书馆"],
    ["出二手山地车 捷安特ATX660","买了一年保养好送锁。",500,1298,16,"used","sale","kexue","车棚"],
    ["免费送！大四清宿舍","杂物免费送衣架脸盆小风扇等。",0,0,20,"worn","sale","dongfeng","8号楼"],
    ["租房：校门口单间出租","步行5分钟单间带独卫月租600。",600,0,8,"used","rent","kexue","北门对面小区"],
    ["求租考研自习室座位","固定自习室座位图书馆或校外都行。",200,0,8,"used","rent_want","kexue",""],
    ["出打印机 HP LaserJet","激光打印机，硒鼓刚换的。",200,599,2,"used","sale","dongfeng",""],
    ["出考研政治全套资料","肖秀荣全套+徐涛视频打包出。",50,150,1,"used","sale","kexue",""],
    ["出二手显示器 Dell 27寸4K","设计专业毕业出色彩准。",1500,3299,2,"like_new","sale","kexue",""],
    ["出一套化妆品收纳盒","三层旋转收纳盒亚克力材质。",25,69,9,"like_new","sale","dongfeng",""],
    ["出拍立得 Fujifilm Mini11","用了不到10次送两盒相纸。",280,499,17,"like_new","sale","dongfeng",""],
    ["求购二手小冰箱","宿舍用的能放几瓶饮料就行。",150,0,12,"used","buy","kexue",""],
    ["出明朝那些事儿全集","全7册保存完好。",60,168,1,"used","sale","kexue",""],
    ["出租相机镜头 适马30mm f/1.4","索尼E卡口按天出租押金500。",30,0,17,"like_new","rent","kexue",""],
    ["出羽毛球拍一副","Victor挑战者送球包。",100,280,3,"used","sale","dongfeng",""],
    ["出闲置被褥收纳袋全新","压缩袋+收纳箱二合一。",15,35,11,"like_new","sale","kexue",""],
    ["求设计模式GoF原版","英文版最好不要笔记太多。",25,0,1,"used","buy","kexue",""],
    ["出九成新吹风机 飞利浦","2000W宿舍能用毕业带不走。",45,129,4,"like_new","sale","dongfeng",""],
    ["出租Switch游戏机","配两手柄+塞尔达动森按周租。",25,0,2,"like_new","rent","kexue",""],
    ["出闲置电热水壶 1.5L","不锈钢九成新。",20,59,12,"used","sale","kexue",""],
    ["求购二手电瓶车","上下课代步电池30公里以上。",600,0,16,"used","buy","dongfeng",""],
    ["出二手运动手环 小米7Pro","用了3个月换手表了箱说全。",150,349,7,"like_new","sale","kexue",""],
    ["出一套美术用品素描套装","48色彩铅+画板+笔大一用完没动。",80,200,8,"like_new","sale","dongfeng",""],
    ["出租相机三脚架 曼富图","碳纤维按天租适合拍毕业照。",10,0,17,"used","rent","kexue",""],
    ["出闲置电风扇落地扇","三档风速夏天必备。",40,99,12,"used","sale","dongfeng",""],
    ["出电脑椅人体工学","坐了一年搬家带不走。",150,399,4,"used","sale","kexue",""],
    ["求购二手降噪耳机","索尼或Bose的图书馆学习用。",500,0,2,"used","buy","kexue",""],
    ["出闲置香薰机+精油","MUJI风格送三瓶精油。",55,150,4,"like_new","sale","dongfeng",""],
    ["出一套露营装备","帐篷+睡袋+充气垫只用两次。",300,800,3,"like_new","sale","kexue",""],
    ["求购二手手机安卓备用机","能用微信就行不要太贵。",300,0,2,"used","buy","dongfeng",""],
    ["出闲置蓝牙音箱 Marshall","音质好毕业出了。",500,999,7,"like_new","sale","kexue",""],
    ["出一套马克杯6只","北欧风陶瓷杯全新未使用。",30,80,4,"like_new","sale","dongfeng",""],
    ["出懒人沙发 无印良品","用了半年宿舍用刚好。",100,300,4,"used","sale","kexue",""],
    ["求购二手Kindle","能正常使用考研看书用。",200,0,2,"used","buy","kexue",""],
    ["出宿舍用小冰箱 8L","能放6罐可乐制冷好静音。",120,299,12,"used","sale","dongfeng",""],
    ["出闲置电动牙刷全新","飞利浦HX6800全新未拆封。",180,349,4,"like_new","sale","kexue",""],
    ["出租帐篷双人","适合春游露营按天出租。",15,0,3,"used","rent","kexue",""],
    ["出闲置钢笔 Lamy Safari","EF尖送一盒墨囊。",80,180,13,"used","sale","dongfeng",""],
    ["出正版乐高积木未拆","星球大战系列全新的。",300,599,14,"like_new","sale","kexue",""],
    ["求购二手胶囊咖啡机","每天需要咖啡续命。",150,0,12,"used","buy","dongfeng",""],
    ["出闲置保温杯 Thermos 500ml","全新未使用保温12小时。",60,149,4,"like_new","sale","kexue",""],
    ["出8成新洗衣机小型3kg","宿舍能用毕业大甩卖。",200,499,12,"worn","sale","dongfeng",""],
    ["求购二手瑜伽垫","不要太旧厚度6mm以上。",15,0,3,"used","buy","kexue",""],
    ["出闲置望远镜 8倍","观鸟看演唱会就用了一次。",80,200,8,"like_new","sale","dongfeng",""],
    ["出二手电吉他 Squier","日落色入门神器带小音箱。",600,1200,6,"used","sale","kexue",""],
    ["求租暑假短租房7-8月","实习期间住科学校区附近。",800,0,8,"used","rent_want","kexue",""],
    ["出闲置双肩包 瑞士军刀","用了两年有点旧但结实。",50,299,5,"worn","sale","kexue",""],
    ["出蓝牙音箱 JBL Flip6","防水洗澡听歌神器。",200,499,7,"used","sale","dongfeng",""],
    ["出盆栽 绿萝+多肉","养了半年长得很好送花盆。",10,0,15,"used","sale","kexue",""],
    ["求购二手单反入门机","佳能或尼康入门机想学摄影。",1500,0,17,"used","buy","dongfeng",""],
    ["出一套三体全集精装","精装三册看了一遍99新。",50,99,1,"like_new","sale","kexue",""],
  ];
  for (const g of gs) {
    const uid = users[rand(0, users.length - 1)].id;
    const ca = new Date(now - rand(0, 30) * 86400000 - rand(0, 23) * 3600000);
    await prisma.goods.create({ data: {
      userId: uid, categoryId: g[4], title: g[0], description: g[1], price: g[2],
      originalPrice: g[3] || null, listType: g[6], condition: g[5],
      campus: g[7], campusLocation: g[8] || "", images: "[]",
      status: "approved", viewCount: rand(50, 500),
      createdAt: ca, updatedAt: ca,
      deposit: null, rentStart: null, rentEnd: null,
    }});
  }
  console.log(gs.length + " goods done");

  // 40 posts
  const ps = [
    ["有人出二手高数辅导书吗","期中考试要来了我好慌。大一没好好学现在补天中..."],
    ["吐槽：东风校区澡堂能不能修修","三楼第二个隔间坏了两周了！水流时大时小还忽冷忽热。"],
    ["分享一下我在图书馆的宝藏座位","五楼东区靠窗第三排！人少空调足插座也好用。"],
    ["科学校区篮球约球！","每周三周五下午四点东区篮球场。水平不限就是打着玩。"],
    ["有没有人一起组队打ACM校赛","缺一个会写DP的队友。我和另一个队友都是计科大三的。"],
    ["今天中午一食堂捡到一张校园卡","计算机学院2023级张同学已放一楼失物招领处。"],
    ["毕业季有什么遗憾吗","大四最后一个月了。最大的遗憾是大一太宅了没多参加社团。"],
    ["出今天晚上的电影票两张","临时有课去不了了万达影城晚上7点半。两张50出。"],
    ["请问学校附近哪里修手机靠谱","屏幕碎了需要换。校门口那家报价有点贵。"],
    ["有没有参加暑期三下乡的同学","今年去贵州支教找同行队友。7月中旬出发两周。"],
    ["二手交易避坑指南","面交在学校公共区域电子产品当场测试保留聊天记录。"],
    ["学校最近有什么好看的讲座吗","感觉除了专业课没什么活动了。人文社科类最喜欢。"],
    ["推荐一个很好用的记笔记App","Notion！免费够用支持Markdown还能多人协作。"],
    ["科学校区食堂哪个窗口最好吃","个人投二食堂二楼的麻辣香锅一票！中辣刚刚好。"],
    ["求助：电脑蓝屏了怎么办","ThinkPad T490 Win11。CRITICAL_PROCESS_DIED错误。"],
    ["大二选课求助","操作系统和数据库原理只能选一门。哪门课更有用？"],
    ["分享一下四六级备考经验","四级600+六级580。核心方法：真题！近5年真题做3遍。"],
    ["有没有人一起拼车去火车站","暑假回家7月5号早上的火车。科学校区出发拼滴滴。"],
    ["打卡：今天跑步5公里","坚持30天了！从1公里喘到现在5公里配速530。"],
    ["求助：笔记本电脑进水了","不小心把水杯打翻洒键盘上了。已关机断电放米缸了。"],
    ["推荐一本好书活着","余华的。大一就读了今天重温还是哭得稀里哗啦。"],
    ["有谁知道校园网怎么连打印机","图书馆的打印机手机连不上。求教程。"],
    ["转让健身卡剩6个月","学校对面健身房原价1200办的800出。要实习了没时间去。"],
    ["问问大家一个月生活费多少","我一个月1500吃饭+日用差不多够。但月底就紧巴巴的。"],
    ["有没有喜欢摄影的同学","Sony A6400用户想找一起扫街的伙伴。"],
    ["考研还是工作纠结中","大三了身边同学都在准备考研。但我感觉自己不适合读研。"],
    ["校门口的奶茶店哪家好喝","新开了喜茶还有一点点茶百道。个人觉得一点点最好！"],
    ["吐槽一下学校的选课系统","每次选课都崩溃！准时登录还是被挤出来。"],
    ["有出租学士服的吗","班级统一的不够想自己再借一套拍照。M码女生。"],
    ["今天图书馆空调坏了好热","五楼自习室空调貌似坏了如同蒸桑拿。"],
    ["暑假留校的小伙伴举个手","不回家准备考研+实习。有没有同样留校的约饭约学习！"],
    ["求推荐郑州好玩的地方","来郑州两年了还没怎么出去玩过。周末想出去逛逛。"],
    ["有人知道学校心理咨询怎么预约吗","最近压力有点大想去聊聊。不知道是不是免费的。"],
    ["讨论一下什么编程语言最好学","非计科专业想自学编程。Python是不是最好入门的？"],
    ["操场上有人在放风筝","今天傍晚看到好几个风筝。突然有点想买一个。"],
    ["学校快递地址怎么写","新生求问！科学校区的快递地址应该怎么写？"],
    ["有人约游泳吗","学校游泳馆开了水质挺好的。工作日人少体验更好。"],
    ["分享一个省钱技巧","食堂打包不用一次性餐盒自带饭盒可以省1块钱。"],
    ["毕业照拍摄攻略","图书馆正门、南门校训石、操场看台、银杏大道都好拍。"],
    ["数据结构严蔚敏正版","计算机考研必备教材有少量笔记但不影响阅读。"],
  ];
  for (const p of ps) {
    const uid = users[rand(0, users.length - 1)].id;
    const ca = new Date(now - rand(0, 60) * 86400000 - rand(0, 23) * 3600000);
    await prisma.post.create({ data: {
      userId: uid, title: p[0], content: p[1], images: "[]", status: "approved",
      viewCount: rand(20, 600), createdAt: ca, updatedAt: ca,
    }});
  }
  console.log(ps.length + " posts done");

  // 10 lostfound
  const lfs = [
    ["lost","丢失黑色钱包","内含身份证和校园卡还有现金200元。重谢！","kexue","图书馆或一食堂","今天中午","lost_wallet","","100元"],
    ["found","捡到钥匙一串","有两把钥匙和一个U盘。失主请描述U盘颜色认领。","dongfeng","操场","今天下午","found_key","12345",""],
    ["lost","U盘丢了里面有论文","黑色32G金士顿有毕业论文初稿！非常重要！","kexue","图书馆3楼","昨天下午","thesis_urgent","","200元"],
    ["found","捡到一副眼镜","黑色半框在科学校区食堂一楼。","kexue","食堂一楼","今天","glasses_found","",""],
    ["lost","丢失AirPods充电仓","白色Pro充电仓跑步时从口袋掉出去的。","dongfeng","操场跑道","晚上8点","airpods_help","","50元"],
    ["found","捡到学生证","2024级李同学已放图书馆一楼服务台。","kexue","图书馆门口","今天上午","","",""],
    ["lost","丢失校园卡尾号8823","学号202206xxxxxx大概在科学校区教学楼附近丢的。","kexue","教学楼A区","前天","card8823","","请喝奶茶"],
    ["found","捡到雨伞一把","黑色长柄伞在图书馆三楼阅览室。","kexue","图书馆三楼","今天","","",""],
    ["lost","丢失快递包裹","菜鸟驿站回宿舍路上丢了一个小包裹里面是件T恤。","dongfeng","菜鸟驿站到3号楼","昨天","parcel_lost","",""],
    ["lost","丢了耳机充电盒","华为FreeBuds白色充电盒教学楼C区或操场。","dongfeng","教学楼C区","周一","buds_case","123456","30元"],
  ];
  for (const lf of lfs) {
    const uid = users[rand(0, users.length - 1)].id;
    const ca = new Date(now - rand(0, 14) * 86400000);
    await prisma.lostFound.create({ data: {
      userId: uid, type: lf[0], title: lf[1], description: lf[2],
      location: lf[4], lostTime: lf[5], contactWechat: lf[6],
      contactQq: lf[7], reward: lf[8], campus: lf[3],
      images: "[]", status: "approved", createdAt: ca, updatedAt: ca,
    }});
  }
  console.log(lfs.length + " lostfound done");

  // 20 treehole
  const ths = [
    "室友晚上打游戏到凌晨两点，键盘声音又大还开麦。怎么跟他说才能不伤感情？",
    "今天在食堂看到一个超好看的小姐姐但不敢搭话…如果你看到这条你穿了白色卫衣。",
    "偷偷表白我们班的一个男生。他不知道我每天都特意坐他后面。算了当秘密吧～",
    "有没有人觉得早八真的很反人类。我只想睡到自然醒然后吃个brunch。",
    "今天在图书馆学习效率超高，一天刷了五章专业课。感觉自己又行了。",
    "有时候觉得大学生活真的好累。但转念一想还有一年就毕业了又有点舍不得。",
    "毕业季看到学长学姐在拍毕业照，突然意识到自己也快了。时间过得好快。",
    "今天终于把毕设初稿写完了！先开心一下。写代码写到头秃但看到东西跑起来很爽。",
    "学校的樱花开了🌸 每年这个时候都觉得学校好美。值得每天路过看一眼。",
    "刚来这个学校的时候各种不适应，现在要毕业了却舍不得。一草一木都有回忆。",
    "有没有人去过后街那家新开的火锅店？听说学生证打八折周末想去试试。",
    "今天被老师点名回答问题结果不会，全班都在看我。社死了求安慰。",
    "真的好想谈恋爱啊。单身两年了看别人甜甜的恋爱好羡慕。",
    "一个忠告：考试周前不要熬夜打游戏。我不小心通宵了王者血泪教训。",
    "想问问大家和室友矛盾了怎么处理？不想换宿舍但气氛好尴尬。",
    "大四找工作中投了50份简历只收到3个面试。心态有点崩但不会放弃的！",
    "推荐一个校园里的放松好去处：操场后面的小花园安静又舒服。",
    "这学期的课表排满了五天早八我上辈子是造了什么孽...",
    "有人在操场上看到过晚上跑步的那个白发老爷爷吗？据说每天坚持跑10公里。",
    "有没有人知道学校的校猫去哪了？那只橘猫好几天没看到了有点担心。",
  ];
  for (const t of ths) {
    const ca = new Date(now - rand(0, 30) * 86400000);
    await prisma.treeHolePost.create({ data: {
      content: t, anonymousCode: Math.random().toString(36).substring(2, 6).toUpperCase(),
      likeCount: rand(0, 80), viewCount: rand(30, 500), createdAt: ca,
    }});
  }
  console.log(ths.length + " treehole done");

  // 10 QA
  const qas = [
    ["宿舍的空调遥控器在哪里领","搬进来时没有遥控器夏天到了热死了求告知去哪里领。","dorm"],
    ["选修课摄影基础怎么样老师给分高吗","想选这门通识选修有没有上过的学长学姐说说？","course"],
    ["二食堂二楼的螺蛳粉好吃吗","每次路过都看到很多人排队。到底值不值得排队？","canteen"],
    ["科学校区到东风校区的校车时刻表","请问校车几点有在哪儿坐？需要预约还是直接排队？","transport"],
    ["谁知道暑假图书馆开放安排","暑假想留校复习考研图书馆开门吗？需要预约座位吗？","study"],
    ["800米体测有什么技巧吗","每次都卡在及格线上。求跑步呼吸技巧和训练方法！","sport"],
    ["问一下学校的医保怎么报销","在校医院看病之后说要自己去报销。流程是什么？","other"],
    ["大一新生入学需要带什么","马上开学了宿舍用品哪些学校发哪些自己买？","dorm"],
    ["有同学知道学校勤工俭学怎么申请吗","想利用课余时间在学校里做点兼职。有什么渠道？","other"],
    ["求推荐好用的VPN或代理","最近查资料需要访问国外学术网站学校VPN老是连不上。","other"],
  ];
  for (const q of qas) {
    const uid = users[rand(0, users.length - 1)].id;
    const ca = new Date(now - rand(0, 30) * 86400000);
    await prisma.qaPost.create({ data: {
      authorId: uid, title: q[0], content: q[1], category: q[2], type: "question",
      status: "approved", viewCount: rand(50, 400), createdAt: ca, updatedAt: ca,
    }});
  }
  console.log(qas.length + " QA done");

  await prisma.$disconnect();
  console.log("\nAll done! 10 users + admin2, 60 goods, 40 posts, 10 lostfound, 20 treehole, 10 QA");
  console.log("All passwords: 123456 | admin: QingTaoAdmin2026!");
}
main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
