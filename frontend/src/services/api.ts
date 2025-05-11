import { Task, Machine, TaskStats, TaskStatus } from '@/types/api';
import authService from './auth';

/**
 * API服务类 - 处理所有与后端的通信
 */
class ApiService {
    // 基础URL - 使用相对路径，通过Vite代理处理
    private baseUrl: string = '/api';

    // 获取请求选项，包括认证头
    private getFetchOptions(): RequestInit {
        return {
            headers: {
                'Content-Type': 'application/json',
                ...authService.getAuthHeaders()
            }
        };
    }

    /**
     * 处理API响应
     */
    private async handleResponse<T>(response: Response): Promise<T> {
        // 检查认证错误
        if (response.status === 401) {
            // 清除无效token
            authService.clearToken();
            // 抛出认证错误
            throw new Error('AUTH_ERROR');
        }

        // 处理其他错误
        if (!response.ok) {
            throw new Error(`API错误: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * 获取所有机器
     */
    async getMachines(): Promise<Machine[]> {
        try {
            const response = await fetch(`${this.baseUrl}/machine`, this.getFetchOptions());
            const data = await this.handleResponse<{ machines: Machine[] }>(response);
            return data.machines || [];
        } catch (error) {
            if (error instanceof Error && error.message === 'AUTH_ERROR') {
                throw error;
            }
            console.error('获取机器列表失败:', error);
            return [];
        }
    }

    /**
     * 获取单个机器详情
     */
    async getMachineDetails(machineId: string): Promise<Machine | null> {
        try {
            const response = await fetch(`${this.baseUrl}/machine/${machineId}/details`, this.getFetchOptions());
            const data = await this.handleResponse<Machine | { error: string }>(response);
            return 'error' in data ? null : data;
        } catch (error) {
            if (error instanceof Error && error.message === 'AUTH_ERROR') {
                throw error;
            }
            console.error(`获取机器详情失败(${machineId}):`, error);
            return null;
        }
    }

    /**
     * 获取所有队列
     */
    async getQueues(): Promise<{ id: string; name: string }[]> {
        try {
            const response = await fetch(`${this.baseUrl}/queue`, this.getFetchOptions());
            const data = await this.handleResponse<{ queues: { id: string; name: string }[] }>(response);
            return data.queues || [];
        } catch (error) {
            if (error instanceof Error && error.message === 'AUTH_ERROR') {
                throw error;
            }
            console.error('获取队列失败:', error);
            return [];
        }
    }

    /**
     * 获取队列中的任务
     */
    async getQueueTasks(queueId: string): Promise<Task[]> {
        try {
            const response = await fetch(`${this.baseUrl}/queue/${queueId}/tasks`, this.getFetchOptions());
            const data = await this.handleResponse<{ tasks: Task[] }>(response);
            return data.tasks || [];
        } catch (error) {
            if (error instanceof Error && error.message === 'AUTH_ERROR') {
                throw error;
            }
            console.error(`获取队列任务失败(${queueId}):`, error);
            return [];
        }
    }

    /**
     * 获取所有任务
     */
    async getAllTasks(): Promise<Task[]> {
        try {
            // 获取所有队列
            const queues = await this.getQueues();

            // 获取所有队列的任务
            const tasksPromises = queues.map(queue => this.getQueueTasks(queue.id));
            const tasksArrays = await Promise.all(tasksPromises);

            // 合并所有任务数组
            return tasksArrays.flat();
        } catch (error) {
            if (error instanceof Error && error.message === 'AUTH_ERROR') {
                throw error;
            }
            console.error('获取所有任务失败:', error);
            return [];
        }
    }

    /**
     * 计算任务统计数据
     */
    calculateTaskStats(tasks: Task[]): TaskStats {
        const stats: TaskStats = {
            WAITING: 0,
            DOWNLOADING: 0,
            CONVERTING: 0,
            UPLOADING: 0,
            FINISHED: 0,
            FAILED: 0
        };

        tasks.forEach(task => {
            // 确保任务状态是有效的枚举值
            if (Object.prototype.hasOwnProperty.call(stats, task.status)) {
                stats[task.status]++;
            }
        });

        return stats;
    }

    /**
     * 获取仪表盘所需的所有数据
     */
    async getDashboardData(): Promise<{
        machines: Machine[];
        tasks: Task[];
        taskStats: TaskStats;
    }> {
        try {
            // 并行获取机器和任务
            const [machines, tasks] = await Promise.all([
                this.getMachines(),
                this.getAllTasks()
            ]);

            // 计算任务统计
            const taskStats = this.calculateTaskStats(tasks);

            return {
                machines,
                tasks,
                taskStats
            };
        } catch (error) {
            if (error instanceof Error && error.message === 'AUTH_ERROR') {
                throw error;
            }
            console.error('获取仪表盘数据失败:', error);
            return {
                machines: [],
                tasks: [],
                taskStats: {
                    WAITING: 0,
                    DOWNLOADING: 0,
                    CONVERTING: 0,
                    UPLOADING: 0,
                    FINISHED: 0,
                    FAILED: 0
                }
            };
        }
    }
}

// 导出实例
const apiService = new ApiService();
export default apiService; 