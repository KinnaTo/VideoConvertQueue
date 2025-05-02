import type { Context } from 'hono';
import { Auth } from '@/decorators/auth';
import { Controller } from '@/decorators/controller';
import { Delete, Get, Patch, Post } from '@/decorators/http';
import { withQueue } from '@/middlewares/queue';
import { prisma } from '@/utils/db';

@Controller('/queue/:queueId')
export class QueueController {
    @Get('/', withQueue)
    @Auth()
    async getQueue(c: Context) {
        const queue = c.get('queue');
        return c.json({ queue });
    }

    @Get('/tasks', withQueue)
    @Auth()
    async getTasks(c: Context) {
        const queue = c.get('queue');
        const tasks = await prisma.task.findMany({
            where: {
                queueId: queue.id,
            },
        });

        return c.json({ tasks });
    }

    @Post('/task/new', withQueue)
    @Auth()
    async createTask(c: Context) {
        const queue = c.get('queue');
        const { name, priority } = await c.req.json();

        const task = await prisma.task.create({
            data: {
                name,
                priority,
                queueId: queue.id,
            },
        });

        return c.json({ task });
    }

    @Delete('/task/:taskId', withQueue)
    @Auth()
    async deleteTask(c: Context) {
        const queue = c.get('queue');
        const { taskId } = c.req.param();

        await prisma.task.delete({
            where: {
                id: taskId,
                queueId: queue.id,
            },
        });
    }

    @Patch('/task/:taskId/status', withQueue)
    @Auth()
    async updateTaskStatus(c: Context) {
        const queue = c.get('queue');
        const { taskId } = c.req.param();
        const { status } = await c.req.json();

        const task = await prisma.task.update({
            where: {
                id: taskId,
                queueId: queue.id,
            },
            data: {
                status,
            },
        });

        return c.json({ task });
    }
}
