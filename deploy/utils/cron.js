"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerJob = registerJob;
exports.stopAllJobs = stopAllJobs;
/**
 * 轻量级定时任务调度器
 * 每个任务独立错误处理，一个失败不影响其他
 */
const logger_1 = require("./logger");
const jobs = [];
function registerJob(job) {
    const run = async () => {
        try {
            await job.fn();
        }
        catch (err) {
            logger_1.logger.error(`[CRON] Job "${job.name}" failed: ${err.message}`);
        }
    };
    if (job.initialDelayMs) {
        setTimeout(run, job.initialDelayMs);
    }
    const timer = setInterval(run, job.intervalMs);
    jobs.push({ timer, name: job.name });
    logger_1.logger.info(`[CRON] Registered job "${job.name}" (every ${job.intervalMs / 1000}s)`);
}
function stopAllJobs() {
    for (const { timer, name } of jobs) {
        clearInterval(timer);
        logger_1.logger.info(`[CRON] Stopped job "${name}"`);
    }
    jobs.length = 0;
}
//# sourceMappingURL=cron.js.map