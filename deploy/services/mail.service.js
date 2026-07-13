"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = sendMail;
exports.sendBatchMail = sendBatchMail;
exports.buildWelcomeMail = buildWelcomeMail;
exports.buildNotificationMail = buildNotificationMail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const logger_1 = require("../utils/logger");
let transporter = null;
function getTransporter() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    if (!host || !user || !pass)
        return null;
    if (!transporter) {
        transporter = nodemailer_1.default.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
        });
    }
    return transporter;
}
/** 发送邮件 — 未配置SMTP时降级为日志 */
async function sendMail(options) {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@qingtao.cn';
    const transport = getTransporter();
    if (!transport) {
        logger_1.logger.info(`📧 [Mock] To:${options.to} | ${options.subject}`);
        return true;
    }
    try {
        const info = await transport.sendMail({ from, to: options.to, subject: options.subject, html: options.html });
        logger_1.logger.info(`📧 [Sent] To:${options.to} | ${options.subject} | msgId:${info.messageId}`);
        return true;
    }
    catch (err) {
        logger_1.logger.error(`📧 [Fail] ${err.message}`);
        return false;
    }
}
/** 发送批量邮件 */
async function sendBatchMail(recipients) {
    let sent = 0;
    let failed = 0;
    for (const r of recipients) {
        const ok = await sendMail(r);
        if (ok)
            sent++;
        else
            failed++;
    }
    return { sent, failed };
}
function buildWelcomeMail(nickname) {
    return {
        to: '',
        subject: '欢迎加入轻淘校园！',
        html: `<h2>${nickname}，欢迎来到轻淘！</h2><p>郑州轻工业大学专属校园二手交易+社区平台。</p>`,
    };
}
function buildNotificationMail(title, content) {
    return { to: '', subject: `轻淘通知: ${title}`, html: `<p>${content}</p>` };
}
//# sourceMappingURL=mail.service.js.map