/**
 * 失物招领 Service 层
 */
import { Prisma } from '@prisma/client';
export declare function findLostFoundList(params: {
    type?: string;
    campusArea?: string;
    status?: string;
    keyword?: string;
    page: number;
    pageSize: number;
}): Promise<{
    list: {
        images: any;
        user: {
            id: number;
            nickname: string;
            avatarUrl: string;
        };
        userId: number;
        id: number;
        type: string;
        title: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        description: string | null;
        location: string;
        lostTime: string;
        reward: string;
        campus: string;
        viewCount: number;
        isDeleted: boolean;
        reviewedBy: number | null;
        reviewComment: string;
        contactWechat: string;
        contactQq: string;
    }[];
    total: number;
}>;
export declare function findLostFoundById(id: number): Promise<({
    user: {
        id: number;
        nickname: string;
        avatarUrl: string;
    };
} & {
    userId: number;
    images: string;
    id: number;
    type: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    status: string;
    description: string | null;
    location: string;
    lostTime: string;
    reward: string;
    campus: string;
    viewCount: number;
    isDeleted: boolean;
    reviewedBy: number | null;
    reviewComment: string;
    contactWechat: string;
    contactQq: string;
}) | null>;
export declare function createLostFound(data: {
    userId: number;
    title: string;
    description: string;
    type: string;
    campusArea: string;
    images: string[];
    location?: string;
    lostTime?: string;
    reward?: string;
    contactName?: string;
    wechat?: string;
    qq?: string;
    phone?: string;
}): Promise<{
    userId: number;
    images: string;
    id: number;
    type: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    status: string;
    description: string | null;
    location: string;
    lostTime: string;
    reward: string;
    campus: string;
    viewCount: number;
    isDeleted: boolean;
    reviewedBy: number | null;
    reviewComment: string;
    contactWechat: string;
    contactQq: string;
}>;
export declare function updateLostFound(id: number, data: Prisma.LostFoundUpdateInput): Promise<{
    userId: number;
    images: string;
    id: number;
    type: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    status: string;
    description: string | null;
    location: string;
    lostTime: string;
    reward: string;
    campus: string;
    viewCount: number;
    isDeleted: boolean;
    reviewedBy: number | null;
    reviewComment: string;
    contactWechat: string;
    contactQq: string;
}>;
export declare function softDeleteLostFound(id: number): Promise<void>;
export declare function resolveLostFound(id: number): Promise<{
    userId: number;
    images: string;
    id: number;
    type: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    status: string;
    description: string | null;
    location: string;
    lostTime: string;
    reward: string;
    campus: string;
    viewCount: number;
    isDeleted: boolean;
    reviewedBy: number | null;
    reviewComment: string;
    contactWechat: string;
    contactQq: string;
}>;
export declare function incrementLostFoundView(id: number): Promise<{
    userId: number;
    images: string;
    id: number;
    type: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    status: string;
    description: string | null;
    location: string;
    lostTime: string;
    reward: string;
    campus: string;
    viewCount: number;
    isDeleted: boolean;
    reviewedBy: number | null;
    reviewComment: string;
    contactWechat: string;
    contactQq: string;
}>;
export declare function findLostFoundComments(itemId: number, currentUserId?: number, page?: number, pageSize?: number): Promise<[({
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
    reviewComment: string;
    lostFoundId: number;
})[], number]>;
export declare function createLostFoundComment(itemId: number, userId: number, content: string): Promise<{
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
    reviewComment: string;
    lostFoundId: number;
}>;
export declare function deleteLostFoundComment(commentId: number): Promise<{
    userId: number;
    id: number;
    content: string;
    createdAt: Date;
    status: string;
    reviewComment: string;
    lostFoundId: number;
}>;
export declare function findLostFoundCommentById(commentId: number): Promise<{
    userId: number;
    id: number;
    content: string;
    createdAt: Date;
    status: string;
    reviewComment: string;
    lostFoundId: number;
} | null>;
//# sourceMappingURL=lostfound.service.d.ts.map