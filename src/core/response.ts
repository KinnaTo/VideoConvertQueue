import { createId } from '@paralleldrive/cuid2';
import dayjs from 'dayjs';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { LogCategory, Logger } from '@/core/logger';

/**
 * 标准响应格式
 */
export interface StandardResponse<T = unknown> {
    status: 'success' | 'error';
    message?: string;
    data?: T;
    requestId?: string;
    timestamp?: string;
}

/**
 * 响应工具类
 * 提供统一的响应格式化功能，确保所有API响应遵循一致的格式。
 */
export class ResponseUtil {
    private static logger: Logger;

    /**
     * 初始化响应工具类
     */
    public static initialize(): void {
        ResponseUtil.logger = Logger.getInstance();
    }

    /**
     * 创建成功响应
     * @param c Hono Context
     * @param data 响应数据
     * @param message 成功消息
     * @returns Response对象
     */
    static success<T>(c: Context, data?: T, message = 'Success'): Response {
        const response: StandardResponse<T> = {
            status: 'success',
            message,
            data,
            timestamp: dayjs().toISOString(),
        };

        return c.json(response);
    }

    /**
     * 创建错误响应
     * @param c Hono Context
     * @param message 错误消息
     * @param httpStatus HTTP状态码
     * @param isServerError 是否为服务器错误
     * @param error 原始错误对象
     * @returns Response对象
     */
    static error(c: Context, message: string, httpStatus = 400, isServerError = false, error?: Error) {
        const response: StandardResponse = {
            status: 'error',
            message,
            timestamp: dayjs().toISOString(),
        };

        if (isServerError) {
            const requestId = createId();
            response.requestId = requestId;

            ResponseUtil.logError(requestId, message, c, error).catch((err) => {
                console.error('Failed to log error:', err);
            });
        }

        return c.json(response, httpStatus as ContentfulStatusCode);
    }

    /**
     * 记录错误日志
     * @param requestId 请求ID
     * @param message 错误消息
     * @param c Hono Context
     * @param error 原始错误对象
     */
    private static async logError(requestId: string, message: string, c: Context, error?: Error): Promise<void> {
        try {
            // 构建错误日志对象
            const errorLog = {
                requestId,
                message,
                stack: error?.stack,
                path: c.req.path,
                method: c.req.method,
                userAgent: c.req.header('user-agent'),
                ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
                timestamp: dayjs().toISOString(),
                headers: Object.fromEntries(c.req.raw.headers),
                query: c.req.query(),
                body: await c.req.json().catch(() => ({})),
            };

            // 记录到日志系统
            ResponseUtil.logger.error(message, LogCategory.ERROR, errorLog);
        } catch (logError) {
            console.error('Error in logError:', logError);
        }
    }
}
