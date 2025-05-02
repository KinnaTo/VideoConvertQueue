import pc from 'picocolors';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from './db';

const apiKeyCount = await prisma.apiKey.count();
if (apiKeyCount === 0) {
    const key = uuidv4();
    const availablePriority = 100;

    await prisma.apiKey.create({
        data: {
            key,
            availablePriority,
        },
    });

    console.log(pc.green('Created initial API key:'), pc.cyan(key));
}
