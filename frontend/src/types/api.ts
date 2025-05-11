/**
 * 机器类型定义
 */
export interface Machine {
    id: string;
    name: string;
    ip: string;
    isOnline: boolean;
    deviceInfo?: any;
    encoder?: string;
    heartbeat?: string;
    firstHeartbeat?: string;
    successCount?: number;
    failedCount?: number;
}

/**
 * 任务状态类型
 */
export type TaskStatus =
    | "WAITING"
    | "DOWNLOADING"
    | "CONVERTING"
    | "UPLOADING"
    | "FINISHED"
    | "FAILED";

/**
 * 任务类型定义
 */
export interface Task {
    id: string;
    name: string;
    status: TaskStatus;
    priority: number;
    queueId: string;
    source?: string;
    machineId?: string;
    downloadInfo?: any;
    convertInfo?: any;
    uploadInfo?: any;
    createdAt: string;
    updatedAt: string;
}

/**
 * 任务状态统计
 */
export interface TaskStats {
    WAITING: number;
    DOWNLOADING: number;
    CONVERTING: number;
    UPLOADING: number;
    FINISHED: number;
    FAILED: number;
} 