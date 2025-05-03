import type { Context } from 'hono';
import { AuthMachine } from '@/decorators/authmachine';
import { Controller } from '@/decorators/controller';
import { Get, Post } from '@/decorators/http';
import { TaskStatus } from '@/generated/prisma';
import { prisma } from '@/utils/db';

@Controller('/runner')
export class RunnerController {
    @Get('/')
    @AuthMachine()
    async getRunner(c: Context) {
        const runner = c.get('machine');
        return c.json({ runner: { id: runner.id, name: runner.name } });
    }

    @Get('/listQueue')
    @AuthMachine()
    async listQueue(c: Context) {
        try {
            const queue = await prisma.queue.findMany({});
            return c.json({ queue });
        } catch (error) {
            console.error('Failed to list queues:', error);
            return c.json({ error: '无法获取队列列表' }, 500);
        }
    }

    @Get('/:queueId/getTask')
    @AuthMachine()
    async getTask(c: Context) {
        const { queueId } = c.req.param();
        const _runner = c.get('machine');

        try {
            const task = await prisma.task.findFirst({
                where: {
                    queueId,
                    status: TaskStatus.WAITING,
                },
                orderBy: {
                    priority: 'desc',
                },
            });

            if (!task) {
                return c.json({ message: '当前无可用任务' }, 200);
            }

            return c.json({ task });
        } catch (error) {
            console.error(`Failed to get task for queue ${queueId}:`, error);
            return c.json({ error: '获取任务失败' }, 500);
        }
    }

    @Post('/:taskId/start')
    @AuthMachine()
    async startTask(c: Context) {
        const { taskId } = c.req.param();
        const _runner = c.get('machine');

        try {
            const task = await prisma.task.update({
                where: {
                    id: taskId,
                },
                data: {
                    status: TaskStatus.RUNNING,
                },
            });

            if (!task) {
                return c.json({ error: '无法启动任务，任务不存在或状态不符' }, 404);
            }

            return c.json({ success: true, task });
        } catch (error) {
            console.error(`Failed to start task ${taskId}:`, error);
            return c.json({ error: '启动任务失败' }, 500);
        }
    }

    @Post('/:taskId/complete')
    @AuthMachine()
    async completeTask(c: Context) {
        const { taskId } = c.req.param();
        const _runner = c.get('machine');
        try {
            const { result } = await c.req.json();
            if (result === undefined) {
                return c.json({ error: '缺少结果数据' }, 400);
            }

            await prisma.task.update({
                where: {
                    id: taskId,
                },
                data: {
                    status: TaskStatus.FINISHED,
                    result,
                },
            });

            return c.json({ success: true });
        } catch (error) {
            console.error(`Failed to complete task ${taskId}:`, error);
            return c.json({ error: '完成任务失败' }, 500);
        }
    }

    @Post('/:taskId/fail')
    @AuthMachine()
    async failTask(c: Context) {
        const { taskId } = c.req.param();
        const _runner = c.get('machine');
        try {
            const { error: taskError } = await c.req.json();
            if (taskError === undefined) {
                return c.json({ error: '缺少错误信息' }, 400);
            }

            await prisma.task.update({
                where: {
                    id: taskId,
                },
                data: {
                    status: TaskStatus.FAILED,
                    error: taskError,
                },
            });

            return c.json({ success: true });
        } catch (error) {
            console.error(`Failed to fail task ${taskId}:`, error);
            return c.json({ error: '标记任务失败时出错' }, 500);
        }
    }

    @Post('/:taskId/progress')
    @AuthMachine()
    async progressTask(c: Context) {
        const { taskId } = c.req.param();
        const _runner = c.get('machine');
        try {
            const { data } = await c.req.json();
            if (data === undefined) {
                return c.json({ error: '缺少进度数据' }, 400);
            }

            await prisma.task.update({
                where: {
                    id: taskId,
                },
                data: { result: data },
            });

            return c.json({ success: true });
        } catch (error) {
            console.error(`Failed to update progress for task ${taskId}:`, error);
            return c.json({ error: '更新任务进度失败' }, 500);
        }
    }

    @Post('/online')
    @AuthMachine()
    async online(c: Context) {
        const runner = c.get('machine');

        try {
            if (!runner.firstHeartbeat) {
                await prisma.machine.update({
                    where: { id: runner.id },
                    data: { firstHeartbeat: new Date() },
                });
                const updatedRunner = await prisma.machine.findUnique({ where: { id: runner.id } });
                return c.json({ runner: updatedRunner });
            }

            return c.json({ runner });
        } catch (error) {
            console.error(`Failed to mark runner ${runner.id} online:`, error);
            return c.json({ error: '标记在线状态失败' }, 500);
        }
    }

    @Post('/heartbeat')
    @AuthMachine()
    async heartbeat(c: Context) {
        const runner = c.get('machine');
        try {
            const data = await c.req.json();

            if (!data || typeof data.deviceInfo !== 'object' || typeof data.encoder !== 'object') {
                return c.json({ error: '缺少 deviceInfo 或 encoder 数据' }, 400);
            }

            const updatedRunner = await prisma.machine.update({
                where: { id: runner.id },
                data: {
                    heartbeat: new Date(),
                    deviceInfo: data.deviceInfo,
                    encoder: data.encoder,
                },
            });

            return c.json({ runner: updatedRunner });
        } catch (error) {
            console.error(`Heartbeat failed for runner ${runner.id}:`, error);
            return c.json({ error: '心跳处理失败' }, 500);
        }
    }
}
