interface CronJob {
    name: string;
    intervalMs: number;
    initialDelayMs?: number;
    fn: () => Promise<void>;
}
export declare function registerJob(job: CronJob): void;
export declare function stopAllJobs(): void;
export {};
//# sourceMappingURL=cron.d.ts.map