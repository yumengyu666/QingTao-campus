/**
 * 帖子/失物招领/树洞 Zod 校验模式
 */
import { z } from 'zod';
export declare const createPostSchema: z.ZodObject<{
    title: z.ZodUnion<[z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>, z.ZodLiteral<"">]>;
    content: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    images: z.ZodDefault<z.ZodArray<z.ZodString>>;
    tags: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
    location: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, z.core.$strip>;
export declare const updatePostSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>, z.ZodLiteral<"">]>>;
    content: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
    images: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
    tags: z.ZodOptional<z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>>;
    location: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
}, z.core.$strip>;
export declare const postListQuery: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    pageSize: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    tag: z.ZodOptional<z.ZodString>;
    keyword: z.ZodOptional<z.ZodString>;
    sort: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
        newest: "newest";
        hottest: "hottest";
    }>>>;
}, z.core.$strip>;
export declare const createPostCommentSchema: z.ZodObject<{
    content: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    images: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
}, z.core.$strip>;
export declare const createLostFoundSchema: z.ZodObject<{
    title: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    description: z.ZodUnion<[z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>, z.ZodLiteral<"">]>;
    type: z.ZodEnum<{
        lost: "lost";
        found: "found";
    }>;
    campusArea: z.ZodEnum<{
        kexue: "kexue";
        dongfeng: "dongfeng";
    }>;
    images: z.ZodDefault<z.ZodArray<z.ZodString>>;
    location: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    lostTime: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    reward: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    contactName: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    wechat: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    qq: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    phone: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, z.core.$strip>;
export declare const updateLostFoundSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
    description: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>, z.ZodLiteral<"">]>>;
    type: z.ZodOptional<z.ZodEnum<{
        lost: "lost";
        found: "found";
    }>>;
    campusArea: z.ZodOptional<z.ZodEnum<{
        kexue: "kexue";
        dongfeng: "dongfeng";
    }>>;
    images: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
    location: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
    lostTime: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
    reward: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
    contactName: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
    wechat: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
    qq: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
    phone: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
}, z.core.$strip>;
export declare const lostFoundListQuery: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    pageSize: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    type: z.ZodOptional<z.ZodEnum<{
        lost: "lost";
        found: "found";
    }>>;
    campusArea: z.ZodOptional<z.ZodEnum<{
        kexue: "kexue";
        dongfeng: "dongfeng";
    }>>;
    status: z.ZodOptional<z.ZodEnum<{
        pending: "pending";
        offline: "offline";
        resolved: "resolved";
    }>>;
    keyword: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const createLostFoundCommentSchema: z.ZodObject<{
    content: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
}, z.core.$strip>;
export declare const createTreeHoleSchema: z.ZodObject<{
    code: z.ZodOptional<z.ZodString>;
    content: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    images: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const createTreeHoleCommentSchema: z.ZodObject<{
    code: z.ZodOptional<z.ZodString>;
    content: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
}, z.core.$strip>;
//# sourceMappingURL=post.schema.d.ts.map