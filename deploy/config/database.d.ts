import { PrismaClient } from '@prisma/client';
export declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export declare function withRetry<T>(fn: () => Promise<T>, retries?: number): Promise<T>;
//# sourceMappingURL=database.d.ts.map