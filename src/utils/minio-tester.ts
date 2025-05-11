import fs from 'node:fs';
import path from 'node:path';
import { Client as MinioClient } from 'minio';
import { URL } from 'url';
import logger from './logger';

/**
 * 测试MinIO连接
 */
export async function testMinioConnection(): Promise<void> {
    try {
        logger.info('Testing MinIO connection...');

        // 读取配置文件
        const configPath = path.join(__dirname, '../../config.json');
        if (!fs.existsSync(configPath)) {
            throw new Error(`MinIO config file not found: ${configPath}`);
        }

        const configRaw = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configRaw);

        if (!config.minio || !config.minio.accessKey || !config.minio.secretKey || !config.minio.bucket || !config.minio.endpoint) {
            throw new Error('Invalid MinIO configuration in config.json');
        }

        // 解析endpoint URL
        let endPoint: string;
        let port: number;
        let useSSL: boolean;

        try {
            // 确保endpoint有协议前缀，如果没有则添加http://
            let fullUrl = config.minio.endpoint;
            if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
                fullUrl = 'http://' + fullUrl;
            }

            const url = new URL(fullUrl);
            endPoint = url.hostname; // 只获取主机名部分
            port = url.port ? parseInt(url.port, 10) : (url.protocol === 'https:' ? 443 : 80);
            useSSL = url.protocol === 'https:';

            logger.info(`Parsed MinIO endpoint: ${endPoint}, port: ${port}, useSSL: ${useSSL}`);
        } catch (parseError) {
            const error = parseError as Error;
            logger.error(`Failed to parse MinIO endpoint URL: ${config.minio.endpoint} - ${error.message}`);
            throw new Error(`Invalid MinIO endpoint URL: ${config.minio.endpoint}`);
        }

        // 创建MinIO客户端
        const minioClient = new MinioClient({
            endPoint,
            port,
            useSSL,
            accessKey: config.minio.accessKey,
            secretKey: config.minio.secretKey,
        });

        // 测试连接
        const bucket = config.minio.bucket;
        const exists = await minioClient.bucketExists(bucket);

        logger.info(`MinIO connection test successful. Bucket ${bucket} exists: ${exists}`);

        if (!exists) {
            logger.info(`Bucket ${bucket} does not exist, it will be created when needed`);
        }

        return;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`MinIO connection test failed: ${errorMessage}`);
        if (error instanceof Error && error.stack) {
            logger.error(`Error stack: ${error.stack}`);
        }
        // 不抛出错误，只记录日志
        return;
    }
} 