import type { Context } from 'hono';
import { ResponseUtil } from '../core/response';
import { Controller } from '../decorators/controller';
import { Delete, Get, Post, Put } from '../decorators/http';
import { ApiOperation, ApiTags } from '../decorators/openapi';
import { IsDateTime, IsEmail, IsNumber, IsString } from '../decorators/types';

/**
 * 用户实体类
 */
export class User {
    @IsNumber({ required: true })
    id!: number;

    @IsString({ required: true })
    name!: string;

    @IsEmail({ required: true })
    email!: string;

    @IsDateTime()
    createdAt!: Date;

    @IsDateTime()
    updatedAt!: Date;
}

/**
 * 创建用户的数据传输对象
 */
export class CreateUserDto {
    @IsString({ required: true })
    name!: string;

    @IsEmail({ required: true })
    email!: string;
}

/**
 * 更新用户的数据传输对象
 */
export class UpdateUserDto {
    @IsString()
    name?: string;

    @IsEmail()
    email?: string;
}

// 模拟用户数据
const users: User[] = [
    {
        id: 1,
        name: '张三',
        email: 'zhangsan@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

/**
 * 用户管理控制器
 */
@ApiTags('用户管理')
@Controller('/users')
export class UserController {
    @Get('/')
    @ApiOperation({
        summary: '获取所有用户',
        responses: {
            200: {
                description: '成功获取用户列表',
                type: {
                    status: 'success',
                    data: [User],
                },
                example: {
                    status: 'success',
                    data: [
                        {
                            id: 1,
                            name: '张三',
                            email: 'zhangsan@example.com',
                            createdAt: '2024-01-01T00:00:00.000Z',
                            updatedAt: '2024-01-01T00:00:00.000Z',
                        },
                    ],
                },
            },
        },
    })
    async getUsers(c: Context) {
        return ResponseUtil.success(c, users);
    }

    @Get('/:id')
    @ApiOperation({
        summary: '获取单个用户',
        responses: {
            200: {
                description: '成功获取用户信息',
                type: {
                    status: 'success',
                    data: User,
                },
                example: {
                    status: 'success',
                    data: {
                        id: 1,
                        name: '张三',
                        email: 'zhangsan@example.com',
                        createdAt: '2024-01-01T00:00:00.000Z',
                        updatedAt: '2024-01-01T00:00:00.000Z',
                    },
                },
            },
            404: {
                description: '用户不存在',
                type: {
                    status: 'error',
                    message: 'string',
                },
                example: {
                    status: 'error',
                    message: '用户不存在',
                },
            },
        },
    })
    async getUser(c: Context) {
        const id = Number(c.req.param('id'));
        const user = users.find((u) => u.id === id);

        if (!user) {
            return ResponseUtil.error(c, '用户不存在', 404);
        }

        return ResponseUtil.success(c, user);
    }

    @Post('/')
    @ApiOperation({
        summary: '创建新用户',
        responses: {
            201: {
                description: '用户创建成功',
                type: {
                    status: 'success',
                    data: User,
                },
                example: {
                    status: 'success',
                    data: {
                        id: 1,
                        name: '张三',
                        email: 'zhangsan@example.com',
                        createdAt: '2024-01-01T00:00:00.000Z',
                        updatedAt: '2024-01-01T00:00:00.000Z',
                    },
                },
            },
        },
    })
    async createUser(c: Context) {
        const body = await c.req.json<CreateUserDto>();

        const newUser: User = {
            id: users.length + 1,
            ...body,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        users.push(newUser);
        return ResponseUtil.success(c, newUser);
    }

    @Put('/:id')
    @ApiOperation({
        summary: '更新用户信息',
        responses: {
            200: {
                description: '用户更新成功',
                type: {
                    status: 'success',
                    data: User,
                },
                example: {
                    status: 'success',
                    data: {
                        id: 1,
                        name: '张三',
                        email: 'zhangsan@example.com',
                        createdAt: '2024-01-01T00:00:00.000Z',
                        updatedAt: '2024-01-01T00:00:00.000Z',
                    },
                },
            },
            404: {
                description: '用户不存在',
                type: {
                    status: 'error',
                    message: 'string',
                },
                example: {
                    status: 'error',
                    message: '用户不存在',
                },
            },
        },
    })
    async updateUser(c: Context) {
        const id = Number(c.req.param('id'));
        const body = await c.req.json<UpdateUserDto>();

        const user = users.find((u) => u.id === id);
        if (!user) {
            return ResponseUtil.error(c, '用户不存在', 404);
        }

        const updatedUser: User = {
            id: user.id,
            name: body.name ?? user.name,
            email: body.email ?? user.email,
            createdAt: user.createdAt,
            updatedAt: new Date(),
        };

        const userIndex = users.findIndex((u) => u.id === id);
        users[userIndex] = updatedUser;
        return ResponseUtil.success(c, updatedUser);
    }

    @Delete('/:id')
    @ApiOperation({
        summary: '删除用户',
        responses: {
            200: {
                description: '用户删除成功',
                type: {
                    status: 'success',
                    data: { message: 'string' },
                },
                example: {
                    status: 'success',
                    data: {
                        message: '用户已删除',
                    },
                },
            },
            404: {
                description: '用户不存在',
                type: {
                    status: 'error',
                    message: 'string',
                },
                example: {
                    status: 'error',
                    message: '用户不存在',
                },
            },
        },
    })
    async deleteUser(c: Context) {
        const id = Number(c.req.param('id'));
        const userIndex = users.findIndex((u) => u.id === id);

        if (userIndex === -1) {
            return ResponseUtil.error(c, '用户不存在', 404);
        }

        users.splice(userIndex, 1);
        return ResponseUtil.success(c, { message: '用户已删除' });
    }
}
