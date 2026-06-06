/**
 * 轻量级定时任务调度器
 * 每个任务独立错误处理，一个失败不影响其他
 */
import { logger } from './logger';

interface CronJob {
  name: string;
  intervalMs: number;
  initialDelayMs?: number;
  fn: () => Promise<void>;
}

const jobs: { timer: ReturnType<typeof setInterval>; name: string }[] = [];

export function registerJob(job: CronJob): void {
  const run = async () => {
    try {
      await job.fn();
    } catch (err: any) {
      logger.error(`[CRON] Job "${job.name}" failed: ${err.message}`);
    }
  };

  if (job.initialDelayMs) {
    setTimeout(run, job.initialDelayMs);
  }

  const timer = setInterval(run, job.intervalMs);
  jobs.push({ timer, name: job.name });
  logger.info(`[CRON] Registered job "${job.name}" (every ${job.intervalMs / 1000}s)`);
}

export function stopAllJobs(): void {
  for (const { timer, name } of jobs) {
    clearInterval(timer);
    logger.info(`[CRON] Stopped job "${name}"`);
  }
  jobs.length = 0;
}
