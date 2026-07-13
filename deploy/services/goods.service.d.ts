/**
 * 商品 Service 层 — 纯业务逻辑，不依赖 req/res
 *
 * 设计原则:
 * - 所有方法接收明确的参数，返回 Promise<结果>
 * - 不处理 HTTP 状态码/响应格式（由 Controller 负责）
 * - 使用 Prisma 推导类型，禁止 any
 */
import { ViewCounter } from './view-counter.service';
/** 图片标准化后的结构 */
interface NormalizedImage {
    url: string;
    blurredUrl: string;
    reviewId: number;
    pending: boolean;
}
/** 用户展示信息（来自 Prisma select） */
interface SellerInfo {
    id: number;
    nickname?: string;
    avatarUrl?: string;
    status?: string;
    wechat?: string;
    qq?: string;
}
/** 商品分类信息 */
interface CategoryInfo {
    name?: string;
    icon?: string;
}
/** 商品原始数据（来自 Prisma 查询） */
interface GoodsRaw {
    id: number;
    userId: number;
    images: string | unknown[];
    category?: CategoryInfo | null;
    user?: SellerInfo | null;
    [key: string]: unknown;
}
/** 标准化图片格式 */
export declare function normalizeImages(raw: unknown): NormalizedImage[];
/** 标准化用户展示（已注销/已封禁处理） */
export declare function normalizeSeller(user: SellerInfo | null): SellerInfo | null;
/** 标准化商品列表项 */
export declare function mapGoodsListItem(g: GoodsRaw): {
    images: NormalizedImage[];
    categoryName: string;
    categoryIcon: string;
    category: undefined;
    user: SellerInfo | null;
    id: number;
    userId: number;
};
interface GoodsListParams {
    categoryId?: number;
    listType?: string;
    status?: string;
    campus?: string;
    condition?: string;
    priceMin?: number;
    priceMax?: number;
    keyword?: string;
    sort?: string;
    order?: string;
    page: number;
    pageSize: number;
}
export declare function findGoodsList(params: GoodsListParams): Promise<{
    list: {
        images: NormalizedImage[];
        categoryName: string;
        categoryIcon: string;
        category: undefined;
        user: SellerInfo | null;
        id: number;
        userId: number;
    }[];
    total: number;
}>;
export declare function findHotGoods(categoryId?: number, campus?: string, page?: number, pageSize?: number): Promise<{
    list: {
        images: NormalizedImage[];
        categoryName: string;
        categoryIcon: string;
        category: undefined;
        user: SellerInfo | null;
        id: number;
        userId: number;
    }[];
    total: number;
}>;
export declare function findGoodsById(id: number): Promise<({
    user: {
        id: number;
        nickname: string;
        avatarUrl: string;
        wechat: string;
        qq: string;
        status: string;
    };
    category: {
        name: string;
        icon: string;
    };
} & {
    userId: number;
    images: string;
    id: number;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    status: string;
    categoryId: number;
    listType: string;
    description: string | null;
    price: number;
    originalPrice: number | null;
    condition: string;
    deposit: number | null;
    rentStart: string | null;
    rentEnd: string | null;
    campus: string;
    campusLocation: string | null;
    viewCount: number;
    isDeleted: boolean;
    reviewedBy: number | null;
    reviewComment: string;
}) | null>;
export declare function createGoods(data: {
    userId: number;
    categoryId: number;
    title: string;
    description: string;
    price: number;
    originalPrice?: number | null;
    listType?: string;
    deposit?: number | null;
    rentStart?: string | null;
    rentEnd?: string | null;
    condition?: string;
    images: string[];
    campus?: string;
    campusLocation?: string;
}): Promise<{
    userId: number;
    images: string;
    id: number;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    status: string;
    categoryId: number;
    listType: string;
    description: string | null;
    price: number;
    originalPrice: number | null;
    condition: string;
    deposit: number | null;
    rentStart: string | null;
    rentEnd: string | null;
    campus: string;
    campusLocation: string | null;
    viewCount: number;
    isDeleted: boolean;
    reviewedBy: number | null;
    reviewComment: string;
}>;
export declare function softDeleteGoods(id: number): Promise<void>;
export declare function markGoodsSold(id: number, userId: number): Promise<void>;
export declare function updateGoodsStatus(id: number, status: string): Promise<void>;
export declare function findRelatedGoods(goodsId: number): Promise<({
    user: {
        id: number;
        nickname: string;
        avatarUrl: string;
        status: string;
    };
    category: {
        name: string;
        icon: string;
    };
} & {
    userId: number;
    images: string;
    id: number;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    status: string;
    categoryId: number;
    listType: string;
    description: string | null;
    price: number;
    originalPrice: number | null;
    condition: string;
    deposit: number | null;
    rentStart: string | null;
    rentEnd: string | null;
    campus: string;
    campusLocation: string | null;
    viewCount: number;
    isDeleted: boolean;
    reviewedBy: number | null;
    reviewComment: string;
})[]>;
export declare function findGoodsComments(goodsId: number, currentUserId?: number, page?: number, pageSize?: number): Promise<[({
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
    goodsId: number;
    reviewComment: string;
})[], number]>;
export declare function createGoodsComment(goodsId: number, userId: number, content: string): Promise<{
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
    goodsId: number;
    reviewComment: string;
}>;
/** 增量浏览量（IP去重） */
export declare function incrementViewCount(goodsId: number, viewerIp: string, counter: ViewCounter): Promise<boolean>;
export {};
//# sourceMappingURL=goods.service.d.ts.map