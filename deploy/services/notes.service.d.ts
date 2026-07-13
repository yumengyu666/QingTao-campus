/**
 * 笔记 Service 层 — 纯业务逻辑，不依赖 req/res
 *
 * 设计原则:
 * - 所有方法接收明确的参数，返回 Promise<结果>
 * - 不处理 HTTP 状态码/响应格式（由 Controller 负责）
 * - 使用 Prisma 推导类型，禁止 any
 */
export interface NotesListParams {
    page: number;
    pageSize: number;
    sort?: string;
    postType?: string;
    tag?: string;
}
export interface CreateNoteInput {
    userId: number;
    title: string;
    content?: string;
    images?: string[];
    postType?: string;
    videoUrl?: string | null;
    videoCover?: string | null;
    videoDuration?: number | null;
    location?: string | null;
    tags?: string[];
}
export interface UpdateNoteInput {
    id: number;
    userId: number;
    title?: string;
    content?: string;
    images?: string[];
    postType?: string;
    location?: string;
    tags?: string[];
}
/** 分页获取笔记列表 */
export declare function findNotes(params: NotesListParams): Promise<{
    list: {
        images: unknown[];
        tags: {
            id: number | undefined;
            name: string | undefined;
        }[];
    }[];
    total: number;
}>;
/** 获取笔记详情 */
export declare function findNoteDetail(id: number, viewerUserId?: number): Promise<{
    images: unknown[];
    tags: {
        id: number;
        name: string;
    }[];
    likeCount: number;
    commentCount: number;
    saveCount: number;
    related: {
        user: {
            id: number;
            nickname: string;
            avatarUrl: string;
        };
        images: string;
        id: number;
        title: string;
        postType: string;
        videoCover: string | null;
        coverIndex: number;
        likeCount: number;
    }[];
    user: {
        id: number;
        nickname: string;
        avatarUrl: string;
        bio: string;
    };
    _count: {
        comments: number;
        likes: number;
        saves: number;
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
    shareCount: number;
    isFeatured: boolean;
} | null>;
/** 创建笔记 */
export declare function createNote(input: CreateNoteInput): Promise<{
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
/** 更新笔记 */
export declare function updateNote(input: UpdateNoteInput): Promise<{
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
} | "not_found" | "forbidden">;
/** 软删除笔记 */
export declare function deleteNote(id: number, userId: number, role?: string): Promise<"not_found" | "forbidden" | "deleted">;
/** 查询点赞状态 */
export declare function getLikeStatus(postId: number, userId: number): Promise<{
    liked: boolean;
}>;
/** 切换点赞（点赞 ↔ 取消） */
export declare function toggleLike(postId: number, userId: number, username: string): Promise<{
    liked: boolean;
}>;
/** 收藏笔记 */
export declare function saveNote(postId: number, userId: number, collectionId?: number | null): Promise<"already_saved" | "saved">;
/** 取消收藏 */
export declare function unsaveNote(postId: number, userId: number): Promise<"not_saved" | "unsaved">;
/** 分享计数 +1 */
export declare function incrementShare(postId: number): Promise<void>;
//# sourceMappingURL=notes.service.d.ts.map