"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.circuitBreaker = circuitBreaker;
exports.getCircuitState = getCircuitState;
exports.getAllCircuitStates = getAllCircuitStates;
const logger_1 = require("../utils/logger");
const circuits = new Map();
const FAILURE_THRESHOLD = 10;
const RESET_TIMEOUT_MS = 30_000;
const DECAY_INTERVAL_MS = 60_000;
setInterval(() => {
    for (const [name, state] of circuits) {
        if (!state.open && state.failures > 0) {
            state.failures = Math.max(0, state.failures - 1);
            if (state.failures === 0) {
                logger_1.logger.debug(`[Circuit] ${name} decayed to 0`);
            }
        }
    }
}, DECAY_INTERVAL_MS);
/** 熔断器中间件 — 监听所有响应方法，统计5xx错误并在超过阈值时熔断 */
function circuitBreaker(name) {
    if (!circuits.has(name)) {
        circuits.set(name, { failures: 0, lastFailure: 0, open: false });
    }
    return (req, res, next) => {
        const state = circuits.get(name);
        if (state.open) {
            if (Date.now() - state.lastFailure > RESET_TIMEOUT_MS) {
                state.open = false;
                state.failures = 0;
                logger_1.logger.info(`[Circuit] ${name} closed (reset)`);
            }
            else {
                return res.status(503).json({ code: 503, message: '服务暂时不可用，请稍后重试' });
            }
        }
        res.on('finish', () => {
            if (res.statusCode >= 500) {
                state.failures++;
                state.lastFailure = Date.now();
                if (state.failures >= FAILURE_THRESHOLD) {
                    state.open = true;
                    logger_1.logger.warn(`[Circuit] ${name} OPEN after ${state.failures} failures`);
                }
            }
            else if (res.statusCode < 400) {
                state.failures = Math.max(0, state.failures - 1);
            }
        });
        next();
    };
}
/** 获取熔断器状态（供监控接口使用） */
function getCircuitState(name) {
    return circuits.get(name);
}
/** 获取所有熔断器状态 */
function getAllCircuitStates() {
    return circuits;
}
//# sourceMappingURL=circuit-breaker.js.map