/** biome-ignore-all lint/suspicious/noExplicitAny: log */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createId } from '@paralleldrive/cuid2';
import dayjs from 'dayjs';
import { cyan, green, red, white, yellow } from 'picocolors';

/**
 * 日志系统
 *
 * 该模块提供了一个完整的日志记录系统，支持以下功能：
 *
 * - 多级别日志（DEBUG、INFO、WARN、ERROR）
 * - 彩色控制台输出
 * - 分类文件日志记录，支持日志轮转
 * - 结构化JSONL格式
 * - 可扩展的输出器架构
 */

/**
 * 日志级别
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

/**
 * 日志分类
 */
export enum LogCategory {
    DEFAULT = 'default',
    ACCESS = 'access',
    ERROR = 'error',
    AUDIT = 'audit',
    PERFORMANCE = 'performance',
}

/**
 * 日志配置
 */
export interface LoggerConfig {
    level: LogLevel;
    enableConsole: boolean;
    enableFile: boolean;
    logDir?: string;
    maxSize?: number; // 最大文件大小，单位字节
    maxFiles?: number; // 最大文件数量
    colorize?: boolean; // 是否彩色输出
    categories?: LogCategory[]; // 启用的日志分类
}

/**
 * 日志条目接口
 */
interface LogEntry {
    timestamp: string;
    level: string;
    category: string;
    message: string;
    context?: unknown;
    requestId?: string;
}

/**
 * 日志输出器接口
 */
interface LogOutput {
    log(level: LogLevel, category: LogCategory, message: string, context?: unknown): void;
}

/**
 * 控制台日志输出器
 */
class ConsoleOutput implements LogOutput {
    private readonly logMethods = {
        [LogLevel.DEBUG]: console.debug,
        [LogLevel.INFO]: console.info,
        [LogLevel.WARN]: console.warn,
        [LogLevel.ERROR]: console.error,
    };

    private readonly colors = {
        [LogLevel.DEBUG]: cyan,
        [LogLevel.INFO]: green,
        [LogLevel.WARN]: yellow,
        [LogLevel.ERROR]: red,
    };

    constructor(private readonly colorize: boolean = true) {}

    log(level: LogLevel, category: LogCategory, message: string, context?: unknown): void {
        const logMethod = this.logMethods[level] || console.log;
        const colorizer = this.colors[level] || white;
        const levelName = LogLevel[level];

        // 构建日志条目
        const logEntry: LogEntry = {
            timestamp: dayjs().toISOString(),
            level: levelName,
            category,
            message,
            context,
            requestId: context && (context as any).requestId ? (context as any).requestId : undefined,
        };

        // 格式化输出
        const output = JSON.stringify(logEntry);
        const colorizedOutput = this.colorize ? colorizer(output) : output;
        logMethod(colorizedOutput);
    }
}

/**
 * 文件日志输出器
 */
class FileOutput implements LogOutput {
    private readonly maxSize: number;
    private readonly maxFiles: number;
    private readonly logDir: string;
    private currentDate: string;

    constructor(logDir: string, options: { maxSize?: number; maxFiles?: number } = {}) {
        this.maxSize = options.maxSize || 10 * 1024 * 1024; // 默认10MB
        this.maxFiles = options.maxFiles || 5;
        this.logDir = logDir;
        this.currentDate = this.getCurrentDate();

        // 确保日志目录存在
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    private getCurrentDate(): string {
        return dayjs().format('YYYY-MM-DD');
    }

    private getLogFilePath(category: LogCategory): string {
        return path.join(this.logDir, `${category}-${this.currentDate}.jsonl`);
    }

    log(level: LogLevel, category: LogCategory, message: string, context?: unknown): void {
        try {
            // 检查是否需要切换到新的日期
            const newDate = this.getCurrentDate();
            if (newDate !== this.currentDate) {
                this.currentDate = newDate;
            }

            const filePath = this.getLogFilePath(category);
            this.rotateLogFileIfNeeded(filePath);

            // 构建日志条目
            const logEntry: LogEntry = {
                timestamp: dayjs().toISOString(),
                level: LogLevel[level],
                category,
                message,
                context,
                requestId: context && (context as any).requestId ? (context as any).requestId : undefined,
            };

            // 写入JSONL格式
            fs.appendFileSync(filePath, `${JSON.stringify(logEntry)}\n`, 'utf8');
        } catch (error) {
            console.error(`Failed to write to log file: ${error}`);
        }
    }

    private rotateLogFileIfNeeded(filePath: string): void {
        try {
            if (!fs.existsSync(filePath)) {
                return;
            }

            const stats = fs.statSync(filePath);
            if (stats.size >= this.maxSize) {
                // 删除最旧的日志文件
                const oldestLog = `${filePath}.${this.maxFiles}`;
                if (fs.existsSync(oldestLog)) {
                    fs.unlinkSync(oldestLog);
                }

                // 重命名现有日志文件
                for (let i = this.maxFiles - 1; i >= 1; i--) {
                    const oldFile = `${filePath}.${i}`;
                    const newFile = `${filePath}.${i + 1}`;
                    if (fs.existsSync(oldFile)) {
                        fs.renameSync(oldFile, newFile);
                    }
                }

                // 重命名当前日志文件
                fs.renameSync(filePath, `${filePath}.1`);
            }
        } catch (error) {
            console.error(`Failed to rotate log file: ${error}`);
        }
    }
}

/**
 * 默认日志配置
 */
const defaultConfig: LoggerConfig = {
    level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
    enableConsole: true,
    enableFile: process.env.NODE_ENV === 'production',
    logDir: process.env.LOG_DIR || 'logs',
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    colorize: true,
    categories: [LogCategory.DEFAULT, LogCategory.ACCESS, LogCategory.ERROR, LogCategory.AUDIT, LogCategory.PERFORMANCE],
};

/**
 * 日志记录器
 */
export class Logger {
    private static instance: Logger;
    private config: LoggerConfig;
    private outputs: LogOutput[] = [];

    private constructor(config: LoggerConfig = defaultConfig) {
        this.config = {
            ...defaultConfig,
            ...config,
            categories: config.categories ?? defaultConfig.categories,
        };
        this.initOutputs();
    }

    private initOutputs(): void {
        if (this.config.enableConsole) {
            this.outputs.push(new ConsoleOutput(this.config.colorize));
        }

        if (this.config.enableFile && this.config.logDir) {
            this.outputs.push(
                new FileOutput(this.config.logDir, {
                    maxSize: this.config.maxSize,
                    maxFiles: this.config.maxFiles,
                }),
            );
        }
    }

    public static getInstance(config?: LoggerConfig): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger(config);
        }
        return Logger.instance;
    }

    public setLevel(level: LogLevel): void {
        this.config.level = level;
    }

    public addOutput(output: LogOutput): void {
        this.outputs.push(output);
    }

    public debug(message: string, category: LogCategory = LogCategory.DEFAULT, context?: any): void {
        this.log(LogLevel.DEBUG, category, message, context);
    }

    public info(message: string, category: LogCategory = LogCategory.DEFAULT, context?: any): void {
        this.log(LogLevel.INFO, category, message, context);
    }

    public warn(message: string, category: LogCategory = LogCategory.DEFAULT, context?: any): void {
        this.log(LogLevel.WARN, category, message, context);
    }

    public error(message: string, category: LogCategory = LogCategory.DEFAULT, context?: any): void {
        this.log(LogLevel.ERROR, category, message, context);
    }

    private log(level: LogLevel, category: LogCategory, message: string, context?: any): void {
        if (level >= this.config.level && this.config.categories?.includes(category)) {
            // 如果没有requestId但有context，自动生成一个
            if (context && !context.requestId) {
                context.requestId = createId();
            }

            for (const output of this.outputs) {
                output.log(level, category, message, context);
            }
        }
    }
}
