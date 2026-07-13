/**
 * 私信/答疑/恋爱区/举报 Zod 校验模式
 */
import { z } from 'zod';
export declare const sendMessageSchema: z.ZodObject<{
    content: z.ZodString;
    type: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
        file: "file";
        location: "location";
        text: "text";
        image: "image";
        voice: "voice";
        card: "card";
    }>>>;
    replyToId: z.ZodOptional<z.ZodNumber>;
    voiceDuration: z.ZodOptional<z.ZodNumber>;
    fileName: z.ZodOptional<z.ZodString>;
    fileSize: z.ZodOptional<z.ZodNumber>;
    latitude: z.ZodOptional<z.ZodNumber>;
    longitude: z.ZodOptional<z.ZodNumber>;
    locationName: z.ZodOptional<z.ZodString>;
    cardUserId: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const batchMessageSchema: z.ZodObject<{
    messageIds: z.ZodArray<z.ZodNumber>;
}, z.core.$strip>;
export declare const forwardMessageSchema: z.ZodObject<{
    messageIds: z.ZodArray<z.ZodNumber>;
    receiverIds: z.ZodArray<z.ZodNumber>;
}, z.core.$strip>;
export declare const conversationSettingSchema: z.ZodObject<{
    isPinned: z.ZodOptional<z.ZodBoolean>;
    isMuted: z.ZodOptional<z.ZodBoolean>;
    muteUntil: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export declare const createQuestionSchema: z.ZodObject<{
    title: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    content: z.ZodUnion<[z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>, z.ZodLiteral<"">]>;
    category: z.ZodString;
    type: z.ZodEnum<{
        help: "help";
        share: "share";
    }>;
    images: z.ZodDefault<z.ZodArray<z.ZodString>>;
    isAnonymous: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const createAnswerSchema: z.ZodObject<{
    content: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    images: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const qaListQuery: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    pageSize: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    category: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<{
        help: "help";
        share: "share";
    }>>;
    status: z.ZodOptional<z.ZodEnum<{
        resolved: "resolved";
        open: "open";
    }>>;
    keyword: z.ZodOptional<z.ZodString>;
    sort: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
        newest: "newest";
        hottest: "hottest";
        unanswered: "unanswered";
    }>>>;
}, z.core.$strip>;
export declare const datingProfileSchema: z.ZodObject<{
    nickname: z.ZodString;
    gender: z.ZodEnum<{
        male: "male";
        female: "female";
        secret: "secret";
    }>;
    bio: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    avatarUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    tags: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
}, z.core.$strip>;
export declare const datingPostSchema: z.ZodObject<{
    content: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    images: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const datingRequestSchema: z.ZodObject<{
    message: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, z.core.$strip>;
export declare const submitReportSchema: z.ZodObject<{
    targetType: z.ZodEnum<{
        user: "user";
        goods: "goods";
        post: "post";
        lostfound: "lostfound";
        post_comment: "post_comment";
        lostfound_comment: "lostfound_comment";
        qa: "qa";
        qa_answer: "qa_answer";
        dating_post: "dating_post";
        dating_profile: "dating_profile";
        treehole: "treehole";
        treehole_comment: "treehole_comment";
        chat_message: "chat_message";
    }>;
    targetId: z.ZodNumber;
    reason: z.ZodEnum<{
        垃圾广告: "垃圾广告";
        不实信息: "不实信息";
        人身攻击: "人身攻击";
        色情低俗: "色情低俗";
        违法违规: "违法违规";
        其他: "其他";
    }>;
    description: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, z.core.$strip>;
export declare const reportMessageSchema: z.ZodObject<{
    messageIds: z.ZodArray<z.ZodNumber>;
    reason: z.ZodEnum<{
        垃圾广告: "垃圾广告";
        不实信息: "不实信息";
        人身攻击: "人身攻击";
        色情低俗: "色情低俗";
        违法违规: "违法违规";
        其他: "其他";
    }>;
    description: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, z.core.$strip>;
export declare const submitAppealSchema: z.ZodObject<{
    reportId: z.ZodOptional<z.ZodNumber>;
    targetType: z.ZodOptional<z.ZodString>;
    targetId: z.ZodOptional<z.ZodNumber>;
    reason: z.ZodString;
}, z.core.$strip>;
//# sourceMappingURL=message.schema.d.ts.map