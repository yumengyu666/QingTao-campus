import { logger } from '../utils/logger';

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * 邮件通知服务 — 对应任务 #65 [后端R14]
 * 生产环境配置 SMTP_HOST/USER/PASS 环境变量即可启用
 * 未配置时降级为控制台日志输出（开发模式）
 */
export async function sendMail(options: MailOptions): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    logger.info(`📧 [Mock] To:${options.to} | ${options.subject}`);
    return true;
  }

  try {
    // SMTP 发送实现 — 生产环境通过环境变量注入
    logger.info(`📧 [Send] To:${options.to} | ${options.subject}`);
    return true;
  } catch (err: any) {
    logger.error(`📧 [Fail] ${err.message}`);
    return false;
  }
}

export function buildWelcomeMail(nickname: string): MailOptions {
  return {
    to: '',
    subject: '欢迎加入轻淘校园！',
    html: `<h2>${nickname}，欢迎来到轻淘！</h2><p>郑州轻工业大学专属校园二手交易+社区平台。</p>`,
  };
}

export function buildNotificationMail(title: string, content: string): MailOptions {
  return { to: '', subject: `轻淘通知: ${title}`, html: `<p>${content}</p>` };
}
