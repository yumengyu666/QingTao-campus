import { useState, type ReactNode } from 'react';

/* ═══════════════ Components ═══════════════ */
function BackBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="lg-btn w-8 h-8 !p-0 !rounded-full flex-shrink-0 text-base">←</button>;
}
function GlassInput({ placeholder, value, onChange }: { placeholder: string; value?: string; onChange?: (v: string) => void }) {
  return <input className="lg-input" placeholder={placeholder} value={value} onChange={onChange ? e => onChange(e.target.value) : undefined} />;
}
function GlassBtn({ children, primary, full, onClick, className }: { children: ReactNode; primary?: boolean; full?: boolean; onClick?: () => void; className?: string }) {
  return <button onClick={onClick} className={`lg-btn ${primary ? 'lg-btn-primary' : ''} ${full ? 'w-full' : ''} ${className || ''}`}>{children}</button>;
}
function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button onClick={onClick} className={`lg-chip ${active ? 'lg-chip-on' : 'lg-chip-off'}`}>{label}</button>;
}
function TabRow({ tabs, active, onChange }: { tabs: string[]; active: number; onChange: (i: number) => void }) {
  return <div className="lg-tab-row">{tabs.map((t, i) => <button key={i} onClick={() => onChange(i)} className={`lg-tab-item-row ${active === i ? 'lg-tab-row-on' : 'lg-tab-row-off'}`}>{t}</button>)}</div>;
}
function Avatar({ size, gradient }: { size: number; gradient: string }) {
  return <div style={{ width: size, height: size, borderRadius: '50%', background: gradient, border: '2px solid rgba(255,255,255,0.8)', flexShrink: 0 }} />;
}
function SectionTitle({ title, more, onMore }: { title: string; more?: string; onMore?: () => void }) {
  return <div className="flex items-center justify-between"><h2 className="lg-h2">{title}</h2>{more && <button onClick={onMore} className="text-[#0066D6] text-xs font-semibold">{more}</button>}</div>;
}

const GRADIENTS = {
  avatar1: 'linear-gradient(135deg, #FF6B6B, #EE5A24)',
  avatar2: 'linear-gradient(135deg, #48DBFB, #0ABDE3)',
  avatar3: 'linear-gradient(135deg, #FF9FF3, #F368E0)',
  avatar4: 'linear-gradient(135deg, #54A0FF, #2E86DE)',
  avatar5: 'linear-gradient(135deg, #5F27CD, #341F97)',
  prod1: 'linear-gradient(135deg, #A8E6CF, #3D84A8)',
  prod2: 'linear-gradient(135deg, #FFD3B6, #FF8B94)',
  prod3: 'linear-gradient(135deg, #D4A5A5, #9B59B6)',
  prod4: 'linear-gradient(135deg, #74B9FF, #0984E3)',
};

/* ═══════════════ HOME ═══════════════ */
function HomePage({ nav }: { nav: (p: string) => void }) {
  const [filter, setFilter] = useState(0);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="lg-h1">青桃校园</h1>
          <span className="lg-chip lg-chip-off text-xs py-1">📍 科学校区</span>
        </div>
        <button onClick={() => nav('search')} className="lg-btn w-9 h-9 !p-0 !rounded-full">🔔</button>
      </div>
      <div onClick={() => nav('search')} className="lg-input flex items-center gap-2 cursor-pointer"><span className="text-[#999]">🔍</span><span className="text-sm text-[#999]">搜索商品、帖子、用户···</span></div>
      <div className="lg-featured p-5 flex flex-col gap-2 justify-end min-h-[150px]">
        <span className="text-xl font-extrabold text-[#0F172A]">全新液态玻璃体验</span>
        <span className="text-xs text-[#666]">iOS 26 风格 · 校园二手交易社区</span>
      </div>
      <div className="flex gap-2">
        {[{e:'⭐',l:'热门',c:'#FF9500'},{e:'🛍️',l:'淘货',c:'#34C759'},{e:'📚',l:'资料',c:'#0066D6'},{e:'❤️',l:'恋爱',c:'#FF3B30'}].map((q,i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 flex-1 cursor-pointer" onClick={() => {if(i===1) nav('goods'); if(i===3) nav('dating')}}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg" style={{background:`${q.c}18`,border:`1px solid ${q.c}33`}}>{q.e}</div>
            <span className="text-[11px] font-semibold text-[#555]">{q.l}</span>
          </div>
        ))}
      </div>
      <SectionTitle title="最新发布" more="更多 →" />
      <div className="flex gap-1.5 mb-1">
        {['全部','出售','求购','出租'].map((c,i) => <Chip key={i} active={filter===i} label={c} onClick={()=>setFilter(i)} />)}
      </div>
      <div className="flex gap-2.5">
        {[{tag:'出',c:'#34C759',t:'iPhone 14 Pro',p:'¥4,200',g:GRADIENTS.prod4} as const,{tag:'求',c:'#FF3B30',t:'数位板Wacom',p:'¥300-500',g:GRADIENTS.prod2} as const,{tag:'出',c:'#34C759',t:'宿舍小台灯',p:'¥35',g:GRADIENTS.prod1} as const,{tag:'租',c:'#0066D6',t:'相机三脚架',p:'¥5/天',g:GRADIENTS.prod3} as const].map((p,i) => (
          <div key={i} className="lg-product-card flex-1 flex flex-col gap-2 cursor-pointer" onClick={() => nav('goods-detail')}>
            <div className="relative w-full aspect-square rounded-xl" style={{background:p.g}}>
              <span className="absolute top-2 left-2 px-1.5 rounded-md text-[10px] font-bold text-white" style={{background:p.c}}>{p.tag}</span>
            </div>
            <div className="px-2 pb-2"><div className="text-[13px] font-semibold text-[#0F172A] truncate">{p.t}</div><div className="lg-price text-sm">{p.p}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ SQUARE ═══════════════ */
function SquarePage({ nav }: { nav: (p: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {[{e:'📝',l:'笔记',act:'explore'},{e:'👻',l:'树洞',act:'treehole'},{e:'🏷️',l:'话题',act:'tags'},{e:'📖',l:'资料',act:'resources'},{e:'🔎',l:'求购',act:'wanted'}].map((q,i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 flex-1 cursor-pointer" onClick={() => nav(q.act)}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base" style={{background:'rgba(255,255,255,0.6)',border:'1px solid rgba(0,0,0,0.06)'}}>{q.e}</div>
            <span className="text-[10px] font-semibold text-[#888]">{q.l}</span>
          </div>
        ))}
      </div>
      <TabRow tabs={['推荐','最新','热门']} active={0} onChange={()=>{}} />
      <div className="lg-card p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center gap-2"><Avatar size={32} gradient={GRADIENTS.avatar4} /><div className="flex flex-col"><span className="text-sm font-semibold text-[#0F172A]">郑同学</span><span className="text-[10px] text-[#999]">3 分钟前</span></div></div>
        <p className="text-[13px] text-[#555] leading-relaxed">今天在图书馆自习发现了一个超棒的角落，对面就是操场，学习累了可以看看同学们打球 🏀</p>
      </div>
      <div className="lg-card p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center gap-2"><Avatar size={32} gradient={GRADIENTS.avatar1} /><div className="flex flex-col"><span className="text-sm font-semibold text-[#0F172A]">刘学长</span><span className="text-[10px] text-[#999]">28 分钟前</span></div></div>
        <p className="text-[13px] text-[#555] leading-relaxed">毕业清仓！寝室各种学习资料免费送，四六级、考研英语都有，先到先得 📚</p>
      </div>
    </div>
  );
}

/* ═══════════════ MESSAGES ═══════════════ */
function MessagesPage({ nav }: { nav: (p: string) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between"><h1 className="lg-h1">消息</h1><GlassBtn onClick={() => {}}>➕</GlassBtn></div>
      <GlassInput placeholder="搜索消息" />
      <div onClick={() => nav('ai-chat')} className="lg-card p-3.5 flex items-center gap-3 cursor-pointer" style={{background:'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(240,248,255,0.7))'}}>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg" style={{background:'linear-gradient(135deg,#0066D6,#66F)'}}>⭐</div>
        <div className="flex flex-col gap-0.5 flex-1"><span className="text-sm font-semibold text-[#0F172A]">小轻 AI 助手</span><span className="text-[11px] text-[#999]">智能问答 · 学习助手 · 校园百科</span></div>
      </div>
      {[{n:'张同学',m:'好的，明天中午食堂见！',t:'12:30',g:GRADIENTS.avatar1},{n:'二手交易通知',m:'您的商品「机械键盘」有新的留言',t:'昨天',b:'3',g:GRADIENTS.avatar2},{n:'李学姐',m:'你的求购我有闲置的，要看看吗？',t:'周一',g:GRADIENTS.avatar3}].map((c,i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer relative" style={{background:'rgba(255,255,255,0.5)',border:'1px solid rgba(0,0,0,0.04)'}} onClick={() => nav('chat-detail')}>
          <Avatar size={44} gradient={c.g} />
          <div className="flex flex-col gap-1 flex-1 min-w-0"><span className="text-sm font-semibold text-[#0F172A]">{c.n}</span><span className="text-xs text-[#999] truncate">{c.m}</span></div>
          <span className="text-[11px] text-[#999] self-start">{c.t}</span>
          {c.b && <span className="absolute top-5 right-3 w-5 h-5 rounded-full bg-[#FF3B30] text-[11px] font-bold text-white flex items-center justify-center">{c.b}</span>}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════ PROFILE ═══════════════ */
function ProfilePage({ nav }: { nav: (p: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between"><h1 className="lg-h1">我的</h1><GlassBtn onClick={() => nav('settings')}>⚙</GlassBtn></div>
      <div className="lg-profile-card flex flex-col items-center gap-3 cursor-pointer" onClick={() => nav('user-profile')}>
        <Avatar size={72} gradient={GRADIENTS.avatar4} />
        <div className="text-lg font-bold text-[#0F172A]">轻工大·王同学</div>
        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-[#0066D6]" style={{background:'rgba(0,102,214,0.1)'}}>信誉认证</span>
        <div className="flex w-full">{[{n:'47',l:'商品'},{n:'328',l:'粉丝'},{n:'156',l:'关注'}].map((s,i)=><div key={i} className="flex flex-col items-center gap-0.5 flex-1"><span className="text-lg font-bold text-[#0F172A]">{s.n}</span><span className="text-[10px] text-[#999]">{s.l}</span></div>)}</div>
      </div>
      <div className="flex gap-2">
        {[{e:'🛍️',l:'我的商品',act:'goods'},{e:'❤️',l:'我的收藏',act:''},{e:'📄',l:'浏览记录',act:''},{e:'📦',l:'购物车',act:'cart'}].map((f,i)=>(
          <div key={i} className="flex-1 flex flex-col items-center gap-2 p-3 rounded-xl cursor-pointer" style={{background:'rgba(255,255,255,0.5)',border:'1px solid rgba(0,0,0,0.04)'}} onClick={() => f.act && nav(f.act)}>
            <span className="text-xl">{f.e}</span><span className="text-[11px] font-semibold text-[#555]">{f.l}</span>
          </div>
        ))}
      </div>
      <div className="lg-card p-1 flex flex-col">
        {[{t:'编辑资料',act:'edit-profile'},{t:'账号安全',act:''},{t:'我的预约',act:'reservations'},{t:'我的徽章',act:'badges'},{t:'退出登录',act:'login',danger:true}].map((s,i)=>(
          <div key={i} className="px-4 py-3 cursor-pointer rounded-xl hover:bg-black/[0.02]" onClick={() => s.act && nav(s.act)}>
            <span className={`text-sm font-medium ${s.danger ? 'text-[#FF3B30]' : 'text-[#0F172A]'}`}>{s.t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ SUB-PAGES ═══════════════ */
function GoodsDetailPage({ nav }: { nav: (p: string) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3"><BackBtn onClick={() => nav('home')} /><span className="lg-h3">商品详情</span></div>
      <div className="w-full h-[280px] rounded-2xl flex items-center justify-center" style={{background:GRADIENTS.prod4}}><span className="text-white/50 text-lg font-bold">商品图片</span></div>
      <div className="lg-card p-4 flex flex-col gap-2">
        <span className="text-2xl font-extrabold text-[#FF9500]">¥4,200</span>
        <span className="text-base font-bold text-[#0F172A]">二手 iPhone 14 Pro 256GB 暗紫色</span>
        <div className="flex gap-2"><span className="text-[11px] font-semibold text-[#0066D6]">九成新</span><span className="text-[11px] font-semibold text-[#34C759]">在保</span></div>
        <p className="lg-body text-xs">去年购入，使用不到一年，电池健康度 92%，无划痕无维修，原装配件齐全。</p>
      </div>
      <div className="flex items-center gap-3 p-3 rounded-2xl" style={{background:'rgba(255,255,255,0.5)'}}>
        <Avatar size={40} gradient={GRADIENTS.avatar1} /><div className="flex-1"><span className="text-sm font-semibold text-[#0F172A]">李同学</span><span className="lg-caption block">科学校区 · 3天前</span></div>
      </div>
      <div className="flex gap-3"><GlassBtn full onClick={() => nav('chat-detail')}>💬 私聊</GlassBtn><GlassBtn primary full>🛒 立即购买</GlassBtn></div>
    </div>
  );
}

function ChatDetailPage({ nav }: { nav: (p: string) => void }) {
  return (
    <div className="flex flex-col gap-4 pb-20">
      <div className="flex items-center gap-3"><BackBtn onClick={() => nav('messages')} /><span className="lg-h3">张同学</span></div>
      {[{from:1,t:'在吗？'},{from:0,t:'在的！什么事？'},{from:1,t:'明天中午一起吃饭吧，老地方见？'},{from:0,t:'好的！12点食堂见 😊'}].map((m,i)=>(
        <div key={i} className={`flex ${m.from ? 'justify-start' : 'justify-end'}`}>
          <div className={`max-w-[75%] px-3 py-2.5 rounded-2xl text-sm ${m.from ? 'rounded-bl-sm bg-[#F0F0F5] text-[#0F172A]' : 'rounded-br-sm bg-[#0066D6] text-white'}`}>{m.t}</div>
        </div>
      ))}
      <div className="fixed bottom-0 left-0 right-0 flex items-center gap-2 px-4 py-3 pb-6" style={{background:'rgba(242,242,247,0.9)',backdropFilter:'blur(20px)'}}>
        <GlassInput placeholder="消息" /><button className="w-10 h-10 rounded-full bg-[#0066D6] flex items-center justify-center text-white flex-shrink-0">➤</button>
      </div>
    </div>
  );
}

function TreeHolePage({ nav }: { nav: (p: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3"><BackBtn onClick={() => nav('square')} /><h1 className="lg-h1">树洞</h1></div>
      <p className="lg-caption">匿名倾诉 · 你的心事我们懂</p>
      <TabRow tabs={['最新','热门']} active={0} onChange={()=>{}} />
      {[{t:'大三了，感觉身边的人都在准备考研，只有我很迷茫...',m:'匿名 · 2小时前',l:'❤ 28',c:'rgba(155,89,182,0.08)',b:'rgba(155,89,182,0.2)'},{t:'今天在食堂遇到了一个特别可爱的人，但是不敢去搭话。有没有树洞的小伙伴给我一点勇气？',m:'匿名 · 5小时前',l:'❤ 103',c:'rgba(52,199,89,0.08)',b:'rgba(52,199,89,0.2)'}].map((p,i)=>(
        <div key={i} className="p-4 rounded-2xl flex flex-col gap-2.5" style={{background:p.c,border:`1px solid ${p.b}`}}>
          <p className="lg-body">{p.t}</p><div className="flex justify-between"><span className="lg-caption">{p.m}</span><span className="text-xs font-semibold text-[#FF3B30]">{p.l}</span></div>
        </div>
      ))}
      <GlassBtn primary full onClick={()=>{}}>✏️ 写下我的心事</GlassBtn>
    </div>
  );
}

function SearchPage({ nav }: { nav: (p: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3"><BackBtn onClick={() => nav('home')} /><GlassInput placeholder="搜索青桃校园..." /></div>
      <SectionTitle title="热门搜索" /><div className="flex flex-col gap-2">{['🏷️ iPhone 二手','🏷️ 高数资料','🏷️ 恋爱空间'].map((t,i)=><div key={i} className="lg-body py-1 cursor-pointer">{t}</div>)}</div>
      <SectionTitle title="最近搜索" /><div className="flex flex-col gap-2">{['iPhone 14','高数资料'].map((t,i)=><div key={i} className="flex justify-between lg-body py-1 cursor-pointer"><span>⌚ {t}</span><span className="text-[#CCC]">✕</span></div>)}</div>
    </div>
  );
}

function QAListPage({ nav }: { nav: (p: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3"><BackBtn onClick={() => nav('square')} /><h1 className="lg-h1">答疑专区</h1></div>
      <GlassInput placeholder="搜索问题" />
      {[{q:'高数微积分求导有没有好的记忆方法？',n:'王同学',a:'12 个回答',t:'昨天',g:GRADIENTS.avatar4},{q:'数据结构的红黑树怎么理解？',n:'刘同学',a:'8 个回答',t:'2天前',g:GRADIENTS.avatar1}].map((q,i)=>(
        <div key={i} className="lg-card p-3.5 flex flex-col gap-2 cursor-pointer" onClick={() => nav('qa-detail')}>
          <div className="flex items-center gap-2"><Avatar size={28} gradient={q.g} /><span className="text-sm font-semibold text-[#0F172A]">{q.n}</span></div>
          <span className="text-sm font-semibold text-[#0F172A]">{q.q}</span>
          <div className="flex gap-4"><span className="text-xs font-semibold text-[#0066D6]">{q.a}</span><span className="lg-caption">{q.t}</span></div>
        </div>
      ))}
      <GlassBtn primary full onClick={()=>{}}>我要提问 +</GlassBtn>
    </div>
  );
}

function QADetailPage({ nav }: { nav: (p: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3"><BackBtn onClick={() => nav('qa')} /><span className="lg-h3">问题详情</span></div>
      <div className="lg-card p-4 flex flex-col gap-2" style={{border:'1px solid rgba(0,102,214,0.2)'}}>
        <span className="text-base font-bold text-[#0F172A]">高数微积分求导有没有好的记忆方法？</span>
        <p className="lg-body text-xs">老师讲的太快了，期末复习完全不知道从哪下手，有没有学长学姐分享一下心得？</p>
      </div>
      <div className="lg-card p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2"><Avatar size={28} gradient={GRADIENTS.avatar1} /><span className="text-sm font-bold text-[#0066D6]">助教·张学长</span></div>
        <p className="lg-body text-xs">推荐用「三字诀」记忆法：商积差、反链基。把常见导数公式分类记忆，再配合几何理解，期末不是问题 ✨</p>
      </div>
    </div>
  );
}

function LostFoundPage({ nav }: { nav: (p: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3"><BackBtn onClick={() => nav('square')} /><h1 className="lg-h1">失物招领</h1></div>
      {[{b:'拾到物品',bc:'#0066D6',t:'食堂二楼拾到钥匙一串',d:'有黑色钥匙扣和U盘挂件，请到食堂二楼窗口认领',m:'陈同学 · 今天'},{b:'寻找失物',bc:'#FF3B30',t:'丢失学生卡一张',d:'可能在图书馆到宿舍的路上，姓名王某某',m:'王同学 · 昨天'}].map((c,i)=>(
        <div key={i} className="lg-card p-3.5 flex flex-col gap-2">
          <span className="self-start px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{background:`${c.bc}15`,color:c.bc}}>{c.b}</span>
          <span className="text-sm font-bold text-[#0F172A]">{c.t}</span><span className="lg-body text-xs">{c.d}</span><span className="lg-caption">{c.m}</span>
        </div>
      ))}
      <GlassBtn primary full onClick={()=>{}}>发布招领</GlassBtn>
    </div>
  );
}

function AIChatPage({ nav }: { nav: (p: string) => void }) {
  return (
    <div className="flex flex-col gap-4 pb-20">
      <div className="flex items-center gap-3"><BackBtn onClick={() => nav('messages')} /><h1 className="lg-h1">小轻 AI 助手</h1></div>
      <div className="flex gap-2 flex-wrap">{['💡 期末高效复习','📚 推荐选修课','🏫 科学校区食堂'].map((t,i)=><Chip key={i} active={false} label={t} onClick={()=>{}} />)}</div>
      <div className="flex flex-col gap-3">
        <div className="flex justify-end"><div className="max-w-[80%] px-3 py-2.5 rounded-2xl rounded-br-sm text-sm text-white bg-[#0066D6]">期末考试有哪些复习技巧？</div></div>
        <div className="flex justify-start"><div className="max-w-[85%] px-3 py-2.5 rounded-2xl rounded-bl-sm text-sm text-[#0F172A]" style={{background:'#F0F0F5'}}>期末复习建议分三步：1. 整理知识框架 2. 做往年真题 3. 重点攻克薄弱环节。需要的话可以来 B403 找我拿复习资料 ✨</div></div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 flex items-center gap-2 px-4 py-3 pb-6" style={{background:'rgba(242,242,247,0.9)',backdropFilter:'blur(20px)'}}>
        <GlassInput placeholder="问小轻任何问题..." /><button className="w-10 h-10 rounded-full bg-[#0066D6] flex items-center justify-center text-white flex-shrink-0">➤</button>
      </div>
    </div>
  );
}

function LoginPage({ nav }: { nav: (p: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-12">
      <div className="text-center"><div className="text-3xl font-extrabold text-[#0F172A]">青桃校园</div><div className="lg-caption mt-1">郑州轻工业大学</div></div>
      <div className="w-full flex flex-col gap-3">
        <GlassInput placeholder="学号 / 手机号" /><GlassInput placeholder="密码" />
        <span className="text-xs font-semibold text-[#0066D6] text-right cursor-pointer" onClick={() => nav('register')}>忘记密码？</span>
        <GlassBtn primary full onClick={() => nav('home')}>登录</GlassBtn>
      </div>
      <div className="flex items-center gap-3 w-full"><div className="flex-1 h-px bg-[#E0E0E0]"/><span className="text-xs text-[#CCC]">或</span><div className="flex-1 h-px bg-[#E0E0E0]"/></div>
      <span className="text-sm font-semibold text-[#0066D6] cursor-pointer" onClick={() => nav('register')}>还没有账号？立即注册</span>
      <BackBtn onClick={() => nav('home')} />
    </div>
  );
}

function RegisterPage({ nav }: { nav: (p: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-12">
      <div className="text-2xl font-extrabold text-[#0F172A]">创建账号</div>
      <div className="w-full flex flex-col gap-3">
        <GlassInput placeholder="学号" /><GlassInput placeholder="昵称" /><GlassInput placeholder="设置密码" />
        <span className="text-[11px] text-[#999]">注册即同意 用户协议 和 隐私政策</span>
        <GlassBtn primary full onClick={() => nav('home')}>注册</GlassBtn>
      </div>
      <BackBtn onClick={() => nav('login')} />
    </div>
  );
}

function UserProfilePage({ nav }: { nav: (p: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3"><BackBtn onClick={() => nav('profile')} /><h1 className="lg-h1">用户主页</h1></div>
      <div className="lg-profile-card flex flex-col items-center gap-2.5">
        <Avatar size={72} gradient={GRADIENTS.avatar4} />
        <div className="text-xl font-bold text-[#0F172A]">张同学</div><span className="lg-caption">计算机系大三 · 热爱开源</span>
        <div className="flex w-full">{[{n:'23',l:'商品'},{n:'156',l:'粉丝'},{n:'48',l:'关注'}].map((s,i)=><div key={i} className="flex flex-col items-center gap-0.5 flex-1"><span className="text-base font-bold text-[#0F172A]">{s.n}</span><span className="text-[10px] text-[#999]">{s.l}</span></div>)}</div>
        <GlassBtn primary full onClick={()=>{}}>+ 关注</GlassBtn>
      </div>
    </div>
  );
}

function EditProfilePage({ nav }: { nav: (p: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3"><BackBtn onClick={() => nav('profile')} /><h1 className="lg-h1">编辑资料</h1></div>
      <div className="flex justify-center"><Avatar size={80} gradient={GRADIENTS.avatar4} /></div>
      <div className="lg-card p-4 flex items-center gap-2"><span className="text-sm font-medium text-[#999] w-12">昵称</span><input className="flex-1 bg-transparent outline-none text-sm text-[#0F172A]" defaultValue="轻工大·王同学" /></div>
      <div className="lg-card p-4 flex items-center gap-2"><span className="text-sm font-medium text-[#999] w-12">简介</span><input className="flex-1 bg-transparent outline-none text-sm text-[#0F172A]" defaultValue="UX设计师 · 热爱校园生活" /></div>
      <GlassBtn primary full onClick={() => nav('profile')}>保存</GlassBtn>
    </div>
  );
}

function CartPage({ nav }: { nav: (p: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3"><BackBtn onClick={() => nav('profile')} /><h1 className="lg-h1">购物车</h1></div>
      {[{n:'机械键盘 RK87',p:'¥180',g:GRADIENTS.prod1},{n:'高数笔记本',p:'¥15',g:GRADIENTS.prod3}].map((c,i)=>(
        <div key={i} className="lg-card p-3 flex items-center gap-3">
          <div className="w-16 h-16 rounded-xl" style={{background:c.g}}/>
          <div className="flex-1"><span className="text-sm font-semibold text-[#0F172A] block">{c.n}</span><span className="lg-price text-sm">{c.p}</span></div>
          <div className="flex items-center gap-2"><button className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold" style={{background:'#F0F0F5'}}>−</button><span className="text-sm font-bold">1</span><button className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold text-[#0066D6]" style={{background:'rgba(0,102,214,0.1)'}}>+</button></div>
        </div>
      ))}
      <div className="lg-card p-4 flex justify-between items-center"><span className="text-sm text-[#999]">合计 (2件)</span><span className="text-lg font-extrabold text-[#FF9500]">¥195</span></div>
      <GlassBtn primary full onClick={()=>{}}>去结算</GlassBtn>
    </div>
  );
}

function ComparePage({ nav }: { nav: (p: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3"><BackBtn onClick={() => nav('home')} /><h1 className="lg-h1">商品对比</h1></div>
      <div className="flex gap-2">
        {[{n:'iPhone 14 Pro',p:'¥4,200',s:'256GB · 95新 · 暗紫色',g:GRADIENTS.prod4},{n:'小米 13',p:'¥2,800',s:'128GB · 9新 · 白色',g:GRADIENTS.prod2}].map((c,i)=>(
          <div key={i} className="lg-card p-3 flex-1 flex flex-col items-center gap-2">
            <div className="w-[100px] h-[100px] rounded-xl" style={{background:c.g}}/>
            <span className="text-sm font-bold text-[#0F172A]">{c.n}</span><span className="lg-price text-sm">{c.p}</span>
            <span className="text-[10px] text-[#999] text-center">{c.s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WantedPage({ nav }: { nav: (p: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3"><BackBtn onClick={() => nav('square')} /><h1 className="lg-h1">求购广场</h1></div>
      {[{t:'求购《数据结构》严蔚敏版',p:'预算 ¥30-50',m:'张同学 · 今天'},{t:'求购二手吉他',p:'预算 ¥200',m:'李同学 · 昨天'}].map((c,i)=>(
        <div key={i} className="lg-card p-3.5 flex flex-col gap-2" style={{border:'1px solid rgba(255,59,48,0.2)'}}>
          <span className="self-start px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{background:'rgba(255,59,48,0.1)',color:'#FF3B30'}}>求购</span>
          <span className="text-sm font-bold text-[#0F172A]">{c.t}</span><span className="lg-price text-xs">{c.p}</span><span className="lg-caption">{c.m}</span>
        </div>
      ))}
    </div>
  );
}

function BarterPage({ nav }: { nav: (p: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3"><BackBtn onClick={() => nav('square')} /><h1 className="lg-h1">以物易物</h1></div>
      {[{o:'机械键盘',w:'蓝牙耳机',m:'张同学 · 3小时前'},{o:'台灯',w:'计算器',m:'王同学 · 昨天'}].map((c,i)=>(
        <div key={i} className="lg-card p-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-center gap-3"><span className="text-base font-bold text-[#0F172A]">{c.o}</span><span className="text-xl font-extrabold text-[#0066D6]">↔</span><span className="text-base font-bold text-[#0F172A]">{c.w}</span></div>
          <span className="lg-caption text-center">{c.m}</span>
        </div>
      ))}
    </div>
  );
}

function DatingPage({ nav }: { nav: (p: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3"><BackBtn onClick={() => nav('home')} /><h1 className="lg-h1">恋爱空间</h1></div>
      {[{n:'小桃同学',b:'大三 · 设计系 · 喜欢看展和旅行',g:GRADIENTS.avatar1},{n:'小杨同学',b:'大二 · 计算机系 · 篮球摄影',g:GRADIENTS.avatar4}].map((c,i)=>(
        <div key={i} className="lg-card p-4 flex items-center gap-3" style={{border:'1px solid rgba(255,107,107,0.15)'}}>
          <Avatar size={56} gradient={c.g} />
          <div className="flex flex-col gap-1"><span className="text-base font-bold text-[#0F172A]">{c.n}</span><span className="lg-caption">{c.b}</span></div>
        </div>
      ))}
    </div>
  );
}

function ExplorePage({ nav }: { nav: (p: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3"><BackBtn onClick={() => nav('square')} /><h1 className="lg-h1">探索笔记</h1></div>
      <div className="flex gap-2.5">
        {[{t:'图书馆顶楼日落🌅',a:'陈同学 · ❤ 472',g:GRADIENTS.prod4},{t:'自习室深夜打卡🌙',a:'李同学 · ❤ 238',g:GRADIENTS.prod3}].map((c,i)=>(
          <div key={i} className="lg-product-card flex-1 flex flex-col gap-2 cursor-pointer">
            <div className="w-full aspect-[3/4] rounded-xl" style={{background:c.g}}/>
            <div className="px-2 pb-2"><div className="text-xs font-semibold text-[#0F172A]">{c.t}</div><div className="text-[10px] text-[#999]">{c.a}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TagsPage({ nav }: { nav: (p: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3"><BackBtn onClick={() => nav('square')} /><h1 className="lg-h1">话题标签</h1></div>
      <div className="flex flex-wrap gap-2">{['#期末复习','#二手','#考研','#恋爱'].map((t,i)=><Chip key={i} active={i===0} label={t} onClick={()=>{}} />)}</div>
      <SectionTitle title="热门话题" />
      {[{r:'1',t:'#期末复习',c:'1283 帖'},{r:'2',t:'#二手交易',c:'967 帖'}].map((h,i)=>(
        <div key={i} className="flex items-center justify-between py-2"><div className="flex items-center gap-3"><span className="text-lg font-extrabold text-[#FF9500]">{h.r}</span><span className="text-sm font-semibold text-[#0F172A]">{h.t}</span></div><span className="lg-caption">{h.c}</span></div>
      ))}
    </div>
  );
}

function BadgesPage({ nav }: { nav: (p: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3"><BackBtn onClick={() => nav('profile')} /><h1 className="lg-h1">我的徽章</h1></div>
      <div className="flex gap-2">
        {[{e:'⭐',l:'连续签到7天',c:'#FFD700'},{e:'✓',l:'首次发布',c:'#34C759'}].map((b,i)=>(
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 p-4 rounded-2xl text-center" style={{background:`${b.c}15`,border:`1px solid ${b.c}33`}}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{background:`${b.c}22`}}>{b.e}</div>
            <span className="text-[11px] font-semibold text-[#555]">{b.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReservationsPage({ nav }: { nav: (p: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3"><BackBtn onClick={() => nav('profile')} /><h1 className="lg-h1">我的预约</h1></div>
      {[{t:'自习室 B401 预约',d:'6月20日 14:00-16:00 · 座位12',s:'已确认 ✓',sc:'#34C759'},{t:'实验室 C302 预约',d:'6月21日 9:00-11:00',s:'待确认',sc:'#FF9500'}].map((r,i)=>(
        <div key={i} className="lg-card p-3.5 flex flex-col gap-1.5">
          <span className="text-sm font-bold text-[#0F172A]">{r.t}</span><span className="lg-caption">{r.d}</span>
          <span className="text-xs font-semibold" style={{color:r.sc}}>{r.s}</span>
        </div>
      ))}
    </div>
  );
}

function ResourcesPage({ nav }: { nav: (p: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3"><BackBtn onClick={() => nav('square')} /><h1 className="lg-h1">学习资料</h1></div>
      <div className="flex gap-1.5">{['全部','数学','计算机','英语'].map((c,i)=><Chip key={i} active={i===0} label={c} onClick={()=>{}} />)}</div>
      {[{t:'高等数学期末复习笔记',d:'PDF · 32页 · 下载 86次',c:'#0066D6'},{t:'数据结构红黑树讲义',d:'PPT · 48页 · 下载 214次',c:'#FF9500'}].map((r,i)=>(
        <div key={i} className="lg-card p-3.5 flex items-center gap-3 cursor-pointer">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg" style={{background:r.c}}>📄</div>
          <div className="flex flex-col gap-1"><span className="text-sm font-semibold text-[#0F172A]">{r.t}</span><span className="lg-caption">{r.d}</span></div>
        </div>
      ))}
    </div>
  );
}

function SettingsPage({ nav }: { nav: (p: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3"><BackBtn onClick={() => nav('profile')} /><h1 className="lg-h1">设置</h1></div>
      <div className="lg-card p-1 flex flex-col">
        {[{t:'消息通知',right:'switch'},{t:'深色模式',right:'关闭'},{t:'清除缓存',right:'128MB'},{t:'关于轻淘',right:'v2.4.0'}].map((s,i)=>(
          <div key={i} className="flex justify-between items-center px-4 py-3">
            <span className="text-sm font-medium text-[#0F172A]">{s.t}</span>
            <span className="lg-caption">{s.right}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ MAIN APP ═══════════════ */
type PageKey = 'home'|'square'|'messages'|'profile'|'goods-detail'|'chat-detail'|'treehole'|'search'|'qa'|'qa-detail'|'lostfound'|'ai-chat'|'login'|'register'|'user-profile'|'edit-profile'|'cart'|'compare'|'wanted'|'barter'|'dating'|'explore'|'tags'|'badges'|'reservations'|'resources'|'settings';

const tabs = [
  { key: 'home' as PageKey, label: '首页', e: '🏠' },
  { key: 'square' as PageKey, label: '广场', e: '💬' },
  { key: 'publish' as const, label: '发布', e: '➕' },
  { key: 'messages' as PageKey, label: '消息', e: '✉️' },
  { key: 'profile' as PageKey, label: '我的', e: '👤' },
];

const isSubPage = (p: PageKey) => !['home','square','messages','profile'].includes(p);

export default function LiquidGlassDemo() {
  const [page, setPage] = useState<PageKey>('home');
  const nav = (p: string) => setPage(p as PageKey);
  const showTabs = !isSubPage(page);

  return (
    <div className="lg-root flex flex-col overflow-hidden" style={{height: '100dvh'}}>
      {/* Status Bar */}
      {showTabs && <div className="flex items-center justify-center h-[54px] px-6 flex-shrink-0 text-[15px] font-semibold text-[#0F172A]" style={{background:'rgba(242,242,247,0.8)',backdropFilter:'blur(20px)'}}>9:41</div>}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4" style={{paddingTop: showTabs ? 0 : 16, paddingBottom: showTabs ? 100 : 16}}>
        <div className="max-w-[390px] mx-auto">
          {page === 'home' && <HomePage nav={nav} />}
          {page === 'square' && <SquarePage nav={nav} />}
          {page === 'messages' && <MessagesPage nav={nav} />}
          {page === 'profile' && <ProfilePage nav={nav} />}
          {page === 'goods-detail' && <GoodsDetailPage nav={nav} />}
          {page === 'chat-detail' && <ChatDetailPage nav={nav} />}
          {page === 'treehole' && <TreeHolePage nav={nav} />}
          {page === 'search' && <SearchPage nav={nav} />}
          {page === 'qa' && <QAListPage nav={nav} />}
          {page === 'qa-detail' && <QADetailPage nav={nav} />}
          {page === 'lostfound' && <LostFoundPage nav={nav} />}
          {page === 'ai-chat' && <AIChatPage nav={nav} />}
          {page === 'login' && <LoginPage nav={nav} />}
          {page === 'register' && <RegisterPage nav={nav} />}
          {page === 'user-profile' && <UserProfilePage nav={nav} />}
          {page === 'edit-profile' && <EditProfilePage nav={nav} />}
          {page === 'cart' && <CartPage nav={nav} />}
          {page === 'compare' && <ComparePage nav={nav} />}
          {page === 'wanted' && <WantedPage nav={nav} />}
          {page === 'barter' && <BarterPage nav={nav} />}
          {page === 'dating' && <DatingPage nav={nav} />}
          {page === 'explore' && <ExplorePage nav={nav} />}
          {page === 'tags' && <TagsPage nav={nav} />}
          {page === 'badges' && <BadgesPage nav={nav} />}
          {page === 'reservations' && <ReservationsPage nav={nav} />}
          {page === 'resources' && <ResourcesPage nav={nav} />}
          {page === 'settings' && <SettingsPage nav={nav} />}
        </div>
      </div>

      {/* Tab Bar */}
      {showTabs && (
        <div className="lg-tabbar-ct">
          <div className="lg-tabbar-pill">
            {tabs.map((tab) => {
              const isActive = page === tab.key;
              return (
                <button key={tab.key} onClick={() => setPage(tab.key === 'publish' ? 'qa' : tab.key)}
                  className={`lg-tab-item ${isActive ? 'lg-tab-active' : ''}`}>
                  {tab.key === 'publish' ? (
                    <div className="w-9 h-9 rounded-xl bg-[#0066D6] flex items-center justify-center text-white text-xl font-bold leading-none">+</div>
                  ) : (
                    <span className={`lg-tab-icon ${isActive ? 'lg-tab-icon-active' : 'lg-tab-icon-inactive'}`}>{tab.e}</span>
                  )}
                  <span className={`lg-tab-label ${isActive ? 'lg-tab-label-active' : 'lg-tab-label-inactive'}`}>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
