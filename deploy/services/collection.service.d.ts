/**
 * 收藏夹 Service 层 — 收藏夹 CRUD + 收藏夹内笔记列表
 *
 * 设计原则:
 * - 所有权校验内置于 Service 方法
 * - 返回值使用 discriminated union，避免 Controller 判断字符串
 */
export interface CollectionListParams {
    userId: number;
}
export interface CreateCollectionInput {
    userId: number;
    name: string;
    isPublic?: boolean;
    coverUrl?: string | null;
}
export interface UpdateCollectionInput {
    id: number;
    userId: number;
    name?: string;
    isPublic?: boolean;
    coverUrl?: string | null;
}
export interface CollectionNotesParams {
    collectionId: number;
    page: number;
    pageSize: number;
}
/** 获取用户收藏夹列表 */
export declare function findCollections(params: CollectionListParams): Promise<{
    postCount: number;
    _count: {
        saves: number;
    };
    userId: number;
    id: number;
    createdAt: Date;
    name: string;
    updatedAt: Date;
    coverUrl: string | null;
    isPublic: boolean;
}[]>;
/** 创建收藏夹 */
export declare function createCollection(input: CreateCollectionInput): Promise<{
    userId: number;
    id: number;
    createdAt: Date;
    name: string;
    updatedAt: Date;
    coverUrl: string | null;
    postCount: number;
    isPublic: boolean;
}>;
/** 更新收藏夹 */
export declare function updateCollection(input: UpdateCollectionInput): Promise<"not_found" | "forbidden" | {
    status: "ok";
    data: {
        userId: number;
        id: number;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        coverUrl: string | null;
        postCount: number;
        isPublic: boolean;
    };
}>;
/** 删除收藏夹 */
export declare function deleteCollection(id: number, userId: number): Promise<"not_found" | "forbidden" | "deleted">;
/** 获取收藏夹内笔记 */
export declare function findCollectionNotes(params: CollectionNotesParams): Promise<{
    list: ({
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
    })[];
    total: number;
}>;
//# sourceMappingURL=collection.service.d.ts.map