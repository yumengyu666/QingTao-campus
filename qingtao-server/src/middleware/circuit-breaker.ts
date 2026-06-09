import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface CircuitState {
  failures: number;
  lastFailure: number;
  open: boolean;
}

const circuits = new Map<string, CircuitState>();
const FAILURE_THRESHOLD = 50;
const RESET_TIMEOUT_MS = 30_000;

/** 熔断器中间件 — 对应任务 #57 [后端R6] */
export function circuitBreaker(name: string) {
  if (!circuits.has(name)) {
    circuits.set(name, { failures: 0, lastFailure: 0, open: false });
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const state = circuits.get(name)!;

    if (state.open) {
      if (Date.now() - state.lastFailure > RESET_TIMEOUT_MS) {
        state.open = false;
        state.failures = 0;
        logger.info(`[Circuit] ${name} closed (reset)`);
      } else {
        return res.status(503).json({ code: 503, message: '服务暂时不可用，请稍后重试' });
      }
    }

    const origSend = res.json.bind(res);
    res.json = function (body: any) {
      if (res.statusCode >= 500) {
        state.failures++;
        state.lastFailure = Date.now();
        if (state.failures >= FAILURE_THRESHOLD) {
          state.open = true;
          logger.warn(`[Circuit] ${name} OPEN after ${state.failures} failures`);
        }
      } else if (res.statusCode < 400) {
        state.failures = Math.max(0, state.failures - 1);
      }
      return origSend(body);
    };

    next();
  };
}
