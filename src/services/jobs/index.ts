/**
 * VIRALCLIP STUDIO — JOB SERVICE FACTORY
 */

import { IJobService } from './types';
import { InMemoryJobService } from './InMemoryJobService';

export * from './types';
export * from './InMemoryJobService';

let activeJobService: IJobService | null = null;

export function getJobService(): IJobService {
  if (!activeJobService) {
    activeJobService = new InMemoryJobService();
  }
  return activeJobService;
}

export function setJobService(service: IJobService): void {
  activeJobService = service;
}
