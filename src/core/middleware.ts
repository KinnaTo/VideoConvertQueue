import { createId } from '@paralleldrive/cuid2';
import type { Context, Next } from 'hono';
import { LogCategory, Logger } from './logger';

/**
 * 访问日志中间件
 * 记录所有HTTP请求的访问日志
 */
export async function accessLogger(c: Context, next: Next) {
    const requestId = createId();
    const startTime = Date.now();
    const logger = Logger.getInstance();

    // 记录请求开始
    const requestLog = {
        requestId,
        method: c.req.method,
        path: c.req.path,
        query: c.req.query(),
        headers: Object.fromEntries(c.req.raw.headers),
        userAgent: c.req.header('user-agent'),
        ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
    };

    logger.info(`Request started: ${c.req.method} ${c.req.path}`, LogCategory.ACCESS, requestLog);

    try {
        // 执行后续中间件和路由处理
        await next();

        // 记录请求完成
        const duration = Date.now() - startTime;
        const responseLog = {
            ...requestLog,
            duration,
            status: c.res.status,
        };

        logger.info(`Request completed: ${c.req.method} ${c.req.path} ${c.res.status} ${duration}ms`, LogCategory.ACCESS, responseLog);
    } catch (error) {
        // 记录请求错误
        const duration = Date.now() - startTime;
        const errorLog = {
            ...requestLog,
            duration,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        };

        logger.error(
            `Request failed: ${c.req.method} ${c.req.path} ${error instanceof Error ? error.message : 'Unknown error'}`,
            LogCategory.ERROR,
            errorLog,
        );

        throw error;
    }
}

/**
 * 性能监控中间件
 * 记录请求处理时间超过阈值的性能日志
 */
export function performanceLogger(thresholdMs = 1000) {
    return async (c: Context, next: Next) => {
        const startTime = Date.now();
        const requestId = createId();
        const logger = Logger.getInstance();

        await next();

        const duration = Date.now() - startTime;
        if (duration > thresholdMs) {
            const performanceLog = {
                requestId,
                method: c.req.method,
                path: c.req.path,
                duration,
                threshold: thresholdMs,
            };

            logger.warn(`Slow request detected: ${c.req.method} ${c.req.path} took ${duration}ms`, LogCategory.PERFORMANCE, performanceLog);
        }
    };
}
