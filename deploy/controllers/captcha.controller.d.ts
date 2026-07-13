import { Request, Response, NextFunction } from 'express';
export declare function generateCaptcha(_req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
export declare function verifyCaptcha(captchaId: string, userAnswer: string, ip?: string): boolean;
//# sourceMappingURL=captcha.controller.d.ts.map