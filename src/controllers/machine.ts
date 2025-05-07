import type { Context } from 'hono';
import { Auth } from '@/decorators/auth';
import { Controller } from '@/decorators/controller';
import { Delete, Get, Post } from '@/decorators/http';
import type { TaskStatus } from '@/generated/prisma';
import { PrismaClientKnownRequestError } from '@/generated/prisma/internal/prismaNamespace';
import { prisma } from '@/utils/db';

@Controller('/machine')
export class MachineController {
    @Get('/')
    @Auth()
    async getMachines(c: Context) {
        try {
            const machines = await prisma.machine.findMany({
                orderBy: { name: 'asc' },
            });
            const now = new Date();
            const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

            const machinesWithStatus = machines.map((machine) => {
                const heartbeatDate = machine.heartbeat ? new Date(machine.heartbeat) : null;
                const isOnline = !!heartbeatDate && heartbeatDate > twoMinutesAgo;

                return {
                    ...machine,
                    isOnline,
                };
            });

            return c.json({ machines: machinesWithStatus });
        } catch (error) {
            console.error('Failed to get machines:', error);
            return c.json({ error: '无法获取机器列表' }, 500);
        }
    }

    @Post('/')
    @Auth()
    async createMachine(c: Context) {
        try {
            const { name, ip } = await c.req.json();
            if (!name || !ip || typeof name !== 'string' || typeof ip !== 'string' || name.trim() === '' || ip.trim() === '') {
                return c.json({ error: '名称和 IP 地址不能为空' }, 400);
            }
            const machine = await prisma.machine.create({
                data: { name: name.trim(), ip: ip.trim() },
            });
            return c.json({ machine }, 201);
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
                return c.json({ error: '具有相同名称或 IP 的机器已存在' }, 409);
            }
            console.error('Failed to create machine:', error);
            return c.json({ error: '创建机器失败' }, 500);
        }
    }

    @Delete('/:id')
    @Auth()
    async deleteMachine(c: Context) {
        const { id } = c.req.param();
        try {
            await prisma.machine.delete({
                where: { id },
            });
            return c.json({ message: '机器已删除' }, 200);
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
                return c.json({ error: '机器未找到' }, 404);
            }
            console.error('Failed to delete machine:', error);
            return c.json({ error: '删除机器失败' }, 500);
        }
    }

    @Get('/:id/details')
    @Auth()
    async getMachineDetails(c: Context) {
        const { id } = c.req.param();
        try {
            const machine = await prisma.machine.findUnique({
                where: { id },
                select: {
                    id: true,
                    name: true,
                    ip: true,
                    deviceInfo: true,
                    encoder: true,
                    heartbeat: true,
                    firstHeartbeat: true,
                },
            });

            if (!machine) {
                return c.json({ error: '机器未找到' }, 404);
            }

            const now = new Date();
            const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
            const heartbeatDate = machine.heartbeat ? new Date(machine.heartbeat) : null;
            const isOnline = !!heartbeatDate && heartbeatDate > twoMinutesAgo;
            const uptime = machine.firstHeartbeat ? Math.floor((now.getTime() - new Date(machine.firstHeartbeat).getTime()) / 1000) : 0;

            const runningTasksCount = 0;

            return c.json({
                ...machine,
                isOnline,
                status: isOnline ? '在线' : '离线',
                uptime,
                runningTasksCount,
            });
        } catch (error) {
            console.error(`Failed to get details for machine ${id}:`, error);
            return c.json({ error: '获取机器详情失败' }, 500);
        }
    }

    @Get('/:id/stats')
    @Auth()
    async getMachineStats(c: Context) {
        const { id } = c.req.param();

        try {
            const machineExists = await prisma.machine.count({ where: { id } });
            if (!machineExists) {
                return c.json({ error: '机器未找到' }, 404);
            }

            const completedTasksCount = 0;
            const failedTasksCount = 0;

            const globalTaskStatsRaw = await prisma.task.groupBy({
                by: ['status'],
                _count: { status: true },
            });

            const globalTaskStats = globalTaskStatsRaw.reduce(
                (acc, curr) => {
                    acc[curr.status] = curr._count.status;
                    return acc;
                },
                {} as Record<TaskStatus, number>,
            );

            return c.json({
                machineId: id,
                completedTasksCount,
                failedTasksCount,
                globalTaskStats,
            });
        } catch (error) {
            console.error(`Failed to get stats for machine ${id}:`, error);
            return c.json({ error: '获取机器统计失败' }, 500);
        }
    }
}
