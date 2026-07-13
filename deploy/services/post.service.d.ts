/** 标准化图片格式 */
export declare function normalizePostImages(raw: unknown): string[];
export declare function findPostList(params: {
    keyword?: string;
    sort?: string;
    page: number;
    pageSize: number;
}): Promise<{
    list: {
        images: string[];
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
export declare function findPostById(id: number): Promise<({
    user: {
        id: number;
        nickname: string;
        avatarUrl: string;
    };
} & {
    userId: number;
    images: string;
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
}) | null>;
export declare function createPost(data: {
    userId: number;
    title: string;
    content: string;
    images: string[];
}): Promise<{
    userId: number;
    images: string;
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
}>;
export declare function updatePost(id: number, data: {
    title?: string;
    content?: string;
    images?: string[];
}): Promise<{
    userId: number;
    images: string;
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
}>;
export declare function softDeletePost(id: number): Promise<void>;
/** 增量浏览量（IP去重需在Controller层维护Map） */
export declare function incrementPostView(id: number): Promise<void>;
export declare function findPostComments(postId: number, currentUserId?: number, page?: number, pageSize?: number): Promise<[({
    user: {
        id: number;
        nickname: string;
        avatarUrl: string;
    };
} & {
    userId: number;
    id: number;
    content: string;
    createdAt: Date;
    status: string;
    replyToId: number | null;
    reviewComment: string;
    likeCount: number;
    postId: number;
})[], number]>;
export declare function createPostComment(postId: number, userId: number, content: string): Promise<{
    user: {
        id: number;
        nickname: string;
        avatarUrl: string;
    };
} & {
    userId: number;
    id: number;
    content: string;
    createdAt: Date;
    status: string;
    replyToId: number | null;
    reviewComment: string;
    likeCount: number;
    postId: number;
}>;
export declare function deletePostComment(commentId: number): Promise<{
    userId: number;
    id: number;
    content: string;
    createdAt: Date;
    status: string;
    replyToId: number | null;
    reviewComment: string;
    likeCount: number;
    postId: number;
}>;
export declare function findPostCommentById(commentId: number): Promise<{
    userId: number;
    id: number;
    content: string;
    createdAt: Date;
    status: string;
    replyToId: number | null;
    reviewComment: string;
    likeCount: number;
    postId: number;
} | null>;
/** 查询用户是否已点赞该帖子 */
export declare function findPostLike(postId: number, userId: number): Promise<{
    userId: number;
    id: number;
    createdAt: Date;
    postId: number;
} | null>;
/** 切换帖子点赞状态，返回 { liked, likeCount } */
export declare function togglePostLike(postId: number, userId: number): Promise<{
    liked: boolean;
    likeCount: number | undefined;
}>;
/** 简易评论点赞（仅计数，不作用户去重） */
export declare function incrementCommentLike(commentId: number): Promise<void>;
//# sourceMappingURL=post.service.d.ts.map