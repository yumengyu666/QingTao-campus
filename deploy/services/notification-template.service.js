"use strict";
/** 通知模板服务 — 对应任务 #56-71 [后端R9] */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotificationTemplate = getNotificationTemplate;
const templates = {
    reservation: (p) => ({
        title: `预约通知`,
        content: `${p.buyerName} 想预约看你的商品「${p.goodsTitle}」`,
    }),
    reservation_accepted: (p) => ({
        title: `预约已接受`,
        content: `卖家已接受你对「${p.goodsTitle}」的预约，请通过私信联系`,
    }),
    barter: (p) => ({
        title: `交换提议`,
        content: `${p.fromUser} 想用「${p.fromGoods}」换你的「${p.toGoods}」`,
    }),
    trade_completed: (p) => ({
        title: `交易完成`,
        content: `你与 ${p.partner} 关于「${p.goodsTitle}」的交易已完成`,
    }),
    new_comment: (p) => ({
        title: `新评论`,
        content: `${p.commenter} 评论了你的${p.targetType === 'goods' ? '商品' : '帖子'}：「${p.snippet}」`,
    }),
    system_announcement: (p) => ({
        title: `系统公告`,
        content: p.message,
    }),
};
function getNotificationTemplate(type, params) {
    const tpl = templates[type];
    if (!tpl)
        return { title: '通知', content: '您有一条新通知' };
    return tpl(params);
}
//# sourceMappingURL=notification-template.service.js.map