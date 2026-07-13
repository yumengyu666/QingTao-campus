interface MailOptions {
    to: string;
    subject: string;
    html: string;
}
/** 发送邮件 — 未配置SMTP时降级为日志 */
export declare function sendMail(options: MailOptions): Promise<boolean>;
/** 发送批量邮件 */
export declare function sendBatchMail(recipients: {
    to: string;
    subject: string;
    html: string;
}[]): Promise<{
    sent: number;
    failed: number;
}>;
export declare function buildWelcomeMail(nickname: string): MailOptions;
export declare function buildNotificationMail(title: string, content: string): MailOptions;
export {};
//# sourceMappingURL=mail.service.d.ts.map