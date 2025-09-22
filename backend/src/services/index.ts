import { JobService } from './JobService';
import { FileService } from './FileService';

// Create singleton instances
export const jobService = new JobService();
export const fileService = new FileService();