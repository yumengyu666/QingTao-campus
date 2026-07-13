interface LogParams {
    userId: number;
    action: string;
    targetType?: string;
    targetId?: number;
    detail?: string;
    ip?: string;
}
/** 记录用户行为日志，异步不阻塞主流程 */
export declare function logActivity(params: LogParams): void;
/** 管理员查询行为日志 */
export declare function getActivityLogs(userId?: number, action?: string, page?: number, pageSize?: number): Promise<{
    logs: {
        userId: number;
        ip: string;
        id: number;
        createdAt: Date;
        targetType: string | null;
        targetId: number | null;
        action: string;
        detail: string;
    }[];
    total: number;
}>;
/** 清理90天前的日志 */
export declare function cleanupOldLogs(): Promise<number>;
export {};
//# sourceMappingURL=activity.service.d.ts.map