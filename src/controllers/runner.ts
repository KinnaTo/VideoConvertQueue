import fs from 'node:fs';
import path from 'node:path';
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

    @Get('/minio')
    @AuthMachine()
    async getMinio(c: Context) {
        const configRaw = fs.readFileSync(path.join(__dirname, '../../config.json'), 'utf-8');
        const config = JSON.parse(configRaw);

        return c.json({
            accessKey: config.minio.accessKey,
            secretKey: config.minio.secretKey,
            bucket: config.minio.bucket,
            endpoint: config.minio.endpoint,
        });
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

    @Get('/getTask')
    @AuthMachine()
    async getTask(c: Context) {
        try {
            const task = await prisma.task.findFirst({
                where: {
                    status: TaskStatus.WAITING,
                },
                orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
            });

            if (!task) {
                return c.json({ message: '当前无可用任务' }, 200);
            }

            return c.json({ task });
        } catch (error) {
            console.error('Failed to get task:', error);
            return c.json({ error: '获取任务失败' }, 500);
        }
    }

    @Post('/:taskId/start')
    @AuthMachine()
    async startTask(c: Context) {
        const { taskId } = c.req.param();
        const runner = c.get('machine');

        try {
            const task = await prisma.task.update({
                where: {
                    id: taskId,
                },
                data: {
                    status: TaskStatus.DOWNLOADING,
                    machineId: runner.id,
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

    @Post('/:taskId/download')
    @AuthMachine()
    async downloadTask(c: Context) {
        const { taskId } = c.req.param();
        const runner = c.get('machine');
        try {
            const { downloadInfo } = await c.req.json();
            if (downloadInfo === undefined) {
                return c.json({ error: '缺少下载信息' }, 400);
            }

            await prisma.task.update({
                where: {
                    id: taskId,
                    machineId: runner.id,
                },
                data: {
                    downloadInfo,
                    status: TaskStatus.DOWNLOADING,
                },
            });

            return c.json({ success: true });
        } catch (error) {
            console.error(`Failed to download task ${taskId}:`, error);
            return c.json({ error: '下载任务失败' }, 500);
        }
    }

    @Post('/:taskId/convert')
    @AuthMachine()
    async convertTask(c: Context) {
        const { taskId } = c.req.param();
        const runner = c.get('machine');

        try {
            const { convertInfo } = await c.req.json();
            if (convertInfo === undefined) {
                return c.json({ error: '缺少转换信息' }, 400);
            }

            await prisma.task.update({
                where: {
                    id: taskId,
                    machineId: runner.id,
                },
                data: {
                    convertInfo,
                    status: TaskStatus.CONVERTING,
                },
            });

            return c.json({ success: true });
        } catch (error) {
            console.error(`Failed to convert task ${taskId}:`, error);
            return c.json({ error: '转换任务失败' }, 500);
        }
    }

    @Post('/:taskId/upload')
    @AuthMachine()
    async uploadTask(c: Context) {
        const { taskId } = c.req.param();
        const runner = c.get('machine');

        try {
            const { uploadInfo } = await c.req.json();
            if (uploadInfo === undefined) {
                return c.json({ error: '缺少上传信息' }, 400);
            }

            await prisma.task.update({
                where: {
                    id: taskId,
                    machineId: runner.id,
                },
                data: {
                    uploadInfo,
                    status: TaskStatus.UPLOADING,
                },
            });

            return c.json({ success: true });
        } catch (error) {
            console.error(`Failed to upload task ${taskId}:`, error);
            return c.json({ error: '上传任务失败' }, 500);
        }
    }

    @Post('/:taskId/complete')
    @AuthMachine()
    async completeTask(c: Context) {
        const { taskId } = c.req.param();
        const runner = c.get('machine');
        try {
            const { result } = await c.req.json();
            if (result === undefined) {
                return c.json({ error: '缺少结果数据' }, 400);
            }

            await prisma.$transaction([
                prisma.task.update({
                    where: {
                        id: taskId,
                    },
                    data: {
                        status: TaskStatus.FINISHED,
                        result,
                    },
                }),
                prisma.machine.update({
                    where: {
                        id: runner.id,
                    },
                    data: {
                        successCount: {
                            increment: 1,
                        },
                    },
                }),
            ]);

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
        const runner = c.get('machine');
        try {
            const { error: taskError } = await c.req.json();
            if (taskError === undefined) {
                return c.json({ error: '缺少错误信息' }, 400);
            }

            await prisma.$transaction([
                prisma.task.update({
                    where: {
                        id: taskId,
                    },
                    data: {
                        status: TaskStatus.FAILED,
                        error: taskError,
                    },
                }),
                prisma.machine.update({
                    where: {
                        id: runner.id,
                    },
                    data: {
                        failedCount: {
                            increment: 1,
                        },
                    },
                }),
            ]);

            return c.json({ success: true });
        } catch (error) {
            console.error(`Failed to fail task ${taskId}:`, error);
            return c.json({ error: '标记任务失败时出错' }, 500);
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

            if (!data || typeof data.deviceInfo !== 'object' || typeof data.encoder !== 'string') {
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
