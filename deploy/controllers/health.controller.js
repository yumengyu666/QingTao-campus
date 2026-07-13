"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = healthCheck;
exports.getMetrics = getMetrics;
const database_1 = require("../config/database");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const startTime = Date.now();
async function checkDatabase() {
    try {
        await database_1.prisma.$queryRaw `SELECT 1`;
        return true;
    }
    catch {
        return false;
    }
}
async function checkAIService() {
    const apiUrl = process.env.MODERATION_API_URL;
    const apiKey = process.env.MODERATION_API_KEY;
    return !!(apiUrl && apiKey);
}
async function checkStorage() {
    try {
        const testPath = path.resolve(__dirname, '..', '..', 'uploads', '.healthcheck');
        fs.mkdirSync(path.dirname(testPath), { recursive: true });
        fs.writeFileSync(testPath, Date.now().toString());
        fs.unlinkSync(testPath);
        return true;
    }
    catch {
        return false;
    }
}
async function healthCheck(_req, res) {
    const [dbOk, storageWriteable] = await Promise.all([
        checkDatabase(),
        checkStorage(),
    ]);
    const allOk = dbOk && storageWriteable;
    res.json({
        status: allOk ? 'ok' : 'degraded',
        version: process.env.npm_package_version || '1.0.0',
    });
}
async function getMetrics(_req, res) {
    try {
        const [userCount, goodsCount, postCount, todayCheckins] = await Promise.all([
            database_1.prisma.user.count({ where: { role: 'user' } }),
            database_1.prisma.goods.count({ where: { isDeleted: false } }),
            database_1.prisma.post.count({ where: { isDeleted: false } }),
            database_1.prisma.dailyCheckin.count({
                where: { checkinDate: new Date().toISOString().slice(0, 10) },
            }),
        ]);
        res.json({
            users: userCount,
            goods: goodsCount,
            posts: postCount,
            todayCheckins,
            serverUptime: Math.floor((Date.now() - startTime) / 3600) + 'h',
        });
    }
    catch {
        res.status(500).json({ error: 'Metrics unavailable' });
    }
}
//# sourceMappingURL=health.controller.js.map