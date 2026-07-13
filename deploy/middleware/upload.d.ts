import multer from 'multer';
/** multer 完成后的魔术字节验证中间件（仅图片） */
export declare function verifyImageMagic(req: Express.Request, res: any, next: any): any;
/** multer 完成后的魔术字节验证中间件（仅文档） */
export declare function verifyDocumentMagic(req: Express.Request, res: any, next: any): any;
export declare const upload: multer.Multer;
export declare const uploadDocument: multer.Multer;
export declare const uploadVoice: multer.Multer;
//# sourceMappingURL=upload.d.ts.map