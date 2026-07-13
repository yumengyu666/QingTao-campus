/**
 * 认证相关 Zod 校验模式
 */
import { z } from 'zod';
export declare const usernameField: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
export declare const passwordField: z.ZodString;
export declare const nicknameField: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
export declare const registerSchema: z.ZodObject<{
    username: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    password: z.ZodString;
    captchaId: z.ZodString;
    captchaAnswer: z.ZodString;
}, z.core.$strip>;
export declare const loginSchema: z.ZodObject<{
    username: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    password: z.ZodString;
    captchaId: z.ZodString;
    captchaAnswer: z.ZodString;
}, z.core.$strip>;
export declare const refreshTokenSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, z.core.$strip>;
export declare const changePasswordSchema: z.ZodObject<{
    oldPassword: z.ZodString;
    newPassword: z.ZodString;
}, z.core.$strip>;
export declare const updateProfileSchema: z.ZodObject<{
    nickname: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
    bio: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    avatarUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    wechat: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    qq: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    campusArea: z.ZodOptional<z.ZodEnum<{
        kexue: "kexue";
        dongfeng: "dongfeng";
    }>>;
}, z.core.$strip>;
//# sourceMappingURL=auth.schema.d.ts.map