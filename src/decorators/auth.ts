/** biome-ignore-all lint/suspicious/noExplicitAny: comment */
import { TokenService } from '@/services/token';
import type { ExtendedRequest } from '@/types/request';

export function Auth() {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const req = args[0] as ExtendedRequest;

            const authHeader = req.headers.get('authorization');
            if (!authHeader?.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token format' }), {
                    status: 401,
                });
            }

            const token = authHeader.split(' ')[1];
            const tokenData = await TokenService.verifyToken(token);

            if (!tokenData) {
                return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
                    status: 403,
                });
            }

            // 将maxPriority添加到请求对象中
            req.maxPriority = tokenData.maxPriority;

            return originalMethod.apply(this, args);
        };

        return descriptor;
    };
}
