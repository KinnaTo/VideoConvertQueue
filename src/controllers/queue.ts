import type { Context } from 'hono';
import { Controller } from '@/decorators/controller';
import { Get } from '@/decorators/http';

@Controller('/queue')
export class QueueController {}

export default QueueController;
