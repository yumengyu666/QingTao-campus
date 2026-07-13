import { Request, Response, NextFunction } from 'express';
interface CircuitState {
    failures: number;
    lastFailure: number;
    open: boolean;
}
/** 熔断器中间件 — 监听所有响应方法，统计5xx错误并在超过阈值时熔断 */
export declare function circuitBreaker(name: string): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/** 获取熔断器状态（供监控接口使用） */
export declare function getCircuitState(name: string): CircuitState | undefined;
/** 获取所有熔断器状态 */
export declare function getAllCircuitStates(): Map<string, CircuitState>;
export {};
//# sourceMappingURL=circuit-breaker.d.ts.map