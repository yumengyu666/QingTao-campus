/**
 * 通知类型分类:
 * - goods_comment, post_comment, lostfound_comment — 评论通知
 * - qa_answer, qa_best — 答疑通知
 * - dating_request — 恋爱请求通知
 * - chat_message — 私信通知
 * - review_result — AI审核结果通知
 * - goods_sold — 商品售出通知
 * - announcement — 公告通知
 * - report_result — 举报处理结果通知
 * - follow, like — 社交互动通知
 * - trade, barter, reservation — 交易通知
 */
export declare function createNotification(params: {
    userId: number;
    type: string;
    title: string;
    content?: string;
    relatedId?: number;
    relatedType?: string;
}): Promise<{
    id: number;
}>;
export declare function cleanupRelatedNotifications(relatedId: number, types: string[]): Promise<void>;
export declare function broadcastAnnouncement(title: string, content: string, createdBy: number): Promise<{
    notifiedCount: number;
    id: number;
    title: string;
    content: string | null;
    createdAt: Date;
    isActive: boolean;
    updatedAt: Date;
    createdBy: number;
}>;
//# sourceMappingURL=notification.service.d.ts.map