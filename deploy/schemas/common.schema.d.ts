/**
 * 通用 Zod 校验模式
 */
import { z } from 'zod';
/** 常规分页查询参数 */
export declare const paginationQuery: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    pageSize: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
/** URL路径中的ID参数 */
export declare const idParam: z.ZodObject<{
    id: z.ZodCoercedNumber<unknown>;
}, z.core.$strip>;
export declare const campusArea: z.ZodEnum<{
    kexue: "kexue";
    dongfeng: "dongfeng";
}>;
export declare const listType: z.ZodEnum<{
    sale: "sale";
    buy: "buy";
    rent: "rent";
    rent_want: "rent_want";
}>;
export declare const contentStatus: z.ZodEnum<{
    pending: "pending";
    approved: "approved";
    rejected: "rejected";
    offline: "offline";
    sold: "sold";
}>;
export declare const imageUrl: z.ZodString;
export declare const imageArray: z.ZodDefault<z.ZodArray<z.ZodString>>;
export declare const sanitizedText: (fieldName: string, maxLen?: number) => z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
export declare const optionalText: (fieldName: string, maxLen?: number) => z.ZodUnion<[z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>, z.ZodLiteral<"">]>;
export declare const contactSchema: z.ZodObject<{
    wechat: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    qq: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, z.core.$strip>;
export declare const searchQuery: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    pageSize: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    keyword: z.ZodString;
    type: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
        goods: "goods";
        post: "post";
        lostfound: "lostfound";
        all: "all";
    }>>>;
    categoryId: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export declare const reportReasons: z.ZodEnum<{
    垃圾广告: "垃圾广告";
    不实信息: "不实信息";
    人身攻击: "人身攻击";
    色情低俗: "色情低俗";
    违法违规: "违法违规";
    其他: "其他";
}>;
//# sourceMappingURL=common.schema.d.ts.map