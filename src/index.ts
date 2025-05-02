import 'reflect-metadata';
import { Hono } from 'hono';
import { prettyJSON } from 'hono/pretty-json';
import { UserController } from './controllers/user';
import { accessLogger, performanceLogger } from './core/middleware';
import { ResponseUtil } from './core/response';
import { registerRoutes } from './core/router';
import { docs } from './routes/docs';
import logger from './utils/logger';

// 确保reflect-metadata在所有装饰器使用之前初始化
if (!Reflect || !Reflect.getMetadata) {
    throw new Error('reflect-metadata is not properly initialized');
}

const app = new Hono();

// 中间件
app.use('*', accessLogger);
app.use('*', performanceLogger());
app.use('*', prettyJSON());

// 注册路由
app.route('/docs', docs);
registerRoutes(app, UserController);

// 启动服务器
const port = process.env.PORT || 3000;
logger.info(`Server is running on port ${port}`);

export default app;
