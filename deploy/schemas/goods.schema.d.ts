/**
 * 商品相关 Zod 校验模式
 */
import { z } from 'zod';
export declare const createGoodsSchema: z.ZodObject<{
    title: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    description: z.ZodUnion<[z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>, z.ZodLiteral<"">]>;
    price: z.ZodNumber;
    originalPrice: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    categoryId: z.ZodNumber;
    campusArea: z.ZodEnum<{
        kexue: "kexue";
        dongfeng: "dongfeng";
    }>;
    listType: z.ZodEnum<{
        sale: "sale";
        buy: "buy";
        rent: "rent";
        rent_want: "rent_want";
    }>;
    images: z.ZodDefault<z.ZodArray<z.ZodString>>;
    condition: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
        new: "new";
        like_new: "like_new";
        good: "good";
        fair: "fair";
        poor: "poor";
    }>>>;
    wechat: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    qq: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    phone: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    location: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    tags: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
}, z.core.$strip>;
export declare const updateGoodsSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
    description: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>, z.ZodLiteral<"">]>>;
    price: z.ZodOptional<z.ZodNumber>;
    originalPrice: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodNumber>>>;
    categoryId: z.ZodOptional<z.ZodNumber>;
    campusArea: z.ZodOptional<z.ZodEnum<{
        kexue: "kexue";
        dongfeng: "dongfeng";
    }>>;
    listType: z.ZodOptional<z.ZodEnum<{
        sale: "sale";
        buy: "buy";
        rent: "rent";
        rent_want: "rent_want";
    }>>;
    images: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
    condition: z.ZodOptional<z.ZodOptional<z.ZodDefault<z.ZodEnum<{
        new: "new";
        like_new: "like_new";
        good: "good";
        fair: "fair";
        poor: "poor";
    }>>>>;
    wechat: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
    qq: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
    phone: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
    location: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
    tags: z.ZodOptional<z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>>;
    status: z.ZodOptional<z.ZodEnum<{
        approved: "approved";
        offline: "offline";
        sold: "sold";
    }>>;
}, z.core.$strip>;
export declare const goodsListQuery: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    pageSize: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    categoryId: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    campusArea: z.ZodOptional<z.ZodEnum<{
        kexue: "kexue";
        dongfeng: "dongfeng";
    }>>;
    listType: z.ZodOptional<z.ZodEnum<{
        sale: "sale";
        buy: "buy";
        rent: "rent";
        rent_want: "rent_want";
    }>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
        approved: "approved";
        offline: "offline";
        sold: "sold";
    }>>>;
    keyword: z.ZodOptional<z.ZodString>;
    sort: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
        newest: "newest";
        cheapest: "cheapest";
        most_expensive: "most_expensive";
        most_viewed: "most_viewed";
    }>>>;
    minPrice: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    maxPrice: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export declare const createGoodsCommentSchema: z.ZodObject<{
    content: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    images: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const updateGoodsCommentSchema: z.ZodObject<{
    content: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
}, z.core.$strip>;
export declare const updateGoodsStatusSchema: z.ZodObject<{
    status: z.ZodEnum<{
        offline: "offline";
        sold: "sold";
    }>;
}, z.core.$strip>;
export declare const addToCartSchema: z.ZodObject<{
    goodsId: z.ZodNumber;
    quantity: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const updateCartItemSchema: z.ZodObject<{
    quantity: z.ZodNumber;
}, z.core.$strip>;
export declare const favoriteSchema: z.ZodObject<{
    goodsId: z.ZodNumber;
}, z.core.$strip>;
//# sourceMappingURL=goods.schema.d.ts.map