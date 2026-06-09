import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;

  if (!host || !user || !pass) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  return transporter;
}

/** 发送邮件 — 未配置SMTP时降级为日志 */
export async function sendMail(options: MailOptions): Promise<boolean> {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@qingtao.cn';
  const transport = getTransporter();

  if (!transport) {
    logger.info(`📧 [Mock] To:${options.to} | ${options.subject}`);
    return true;
  }

  try {
    const info = await transport.sendMail({ from, to: options.to, subject: options.subject, html: options.html });
    logger.info(`📧 [Sent] To:${options.to} | ${options.subject} | msgId:${info.messageId}`);
    return true;
  } catch (err: any) {
    logger.error(`📧 [Fail] ${err.message}`);
    return false;
  }
}

/** 发送批量邮件 */
export async function sendBatchMail(recipients: { to: string; subject: string; html: string }[]): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const r of recipients) {
    const ok = await sendMail(r);
    if (ok) sent++;
    else failed++;
  }

  return { sent, failed };
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
