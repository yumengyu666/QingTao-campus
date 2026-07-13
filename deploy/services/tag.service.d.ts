/**
 * 话题（标签）Service 层 — 话题关注、动态流
 */
/** 关注话题 */
export declare function followTag(tagId: number, userId: number): Promise<void>;
/** 取消关注话题 */
export declare function unfollowTag(tagId: number, userId: number): Promise<void>;
export interface TagFeedParams {
    tagName: string;
    page: number;
    pageSize?: number;
}
/** 获取话题动态流 */
export declare function findFeedByTag(params: TagFeedParams): Promise<{
    list: {
        images: any;
        user: {
            id: number;
            nickname: string;
            avatarUrl: string;
        };
        userId: number;
        id: number;
        title: string;
        content: string | null;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        location: string | null;
        isPinned: boolean;
        viewCount: number;
        isDeleted: boolean;
        reviewedBy: number | null;
        reviewComment: string;
        postType: string;
        videoUrl: string | null;
        videoCover: string | null;
        videoDuration: number | null;
        coverIndex: number;
        likeCount: number;
        commentCount: number;
        shareCount: number;
        saveCount: number;
        isFeatured: boolean;
    }[];
    total: number;
}>;
//# sourceMappingURL=tag.service.d.ts.map