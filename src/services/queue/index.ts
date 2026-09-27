/**
 * VIRALCLIP STUDIO — QUEUE SERVICE EXPORTS
 */

import { QueueService } from './QueueService';

export function getQueueService(): QueueService {
  return QueueService.getInstance();
}

export { QueueService };
export * from './QueueService';
