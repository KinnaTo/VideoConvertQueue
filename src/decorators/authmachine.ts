/** biome-ignore-all lint/suspicious/noExplicitAny: comment */
import type { Context } from 'hono';
import { prisma } from '@/utils/db';

export function AuthMachine() {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const c = args[0] as Context;
            const authHeader = c.req.raw.headers.get('authorization');

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return c.json({ error: 'Unauthorized' }, 401);
            }

            const token = authHeader.split(' ')[1];

            const machine = await prisma.machine.findFirst({
                where: { token },
            });

            if (!machine) {
                return c.json({ error: 'Invalid token' }, 401);
            }

            c.set('machine', machine);

            return originalMethod.apply(this, args);
        };

        return descriptor;
    };
}
