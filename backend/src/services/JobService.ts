import { Queue, Job as BullJob } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { Job, JobStatus, CreateJobRequest, ProcessingOptions } from '../models/Job';
import { Redis } from 'ioredis';

export class JobService {
  private queue: Queue;
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });

    this.queue = new Queue('karaoke-processing', {
      connection: this.redis,
    });
  }

  async createJob(request: CreateJobRequest): Promise<Job> {
    const jobId = uuidv4();
    
    const job: Job = {
      id: jobId,
      status: 'pending',
      progress: 0,
      audioFileId: request.audioFileId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store job in Redis
    await this.saveJob(job);

    // Add job to processing queue
    await this.queue.add('process-audio', {
      jobId,
      audioFileId: request.audioFileId,
      options: request.options || {},
    }, {
      jobId,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    return job;
  }

  async getJob(jobId: string): Promise<Job | null> {
    try {
      const jobData = await this.redis.hgetall(`job:${jobId}`);
      
      if (!Object.keys(jobData).length) {
        return null;
      }

      return {
        id: jobId,
        status: jobData.status as JobStatus,
        progress: parseInt(jobData.progress || '0'),
        audioFileId: jobData.audioFileId,
        createdAt: new Date(jobData.createdAt),
        updatedAt: new Date(jobData.updatedAt),
        completedAt: jobData.completedAt ? new Date(jobData.completedAt) : undefined,
        error: jobData.error || undefined,
        results: jobData.results ? JSON.parse(jobData.results) : undefined,
      };
    } catch (error) {
      console.error(`Failed to get job ${jobId}:`, error);
      return null;
    }
  }

  async updateJobStatus(
    jobId: string,
    status: JobStatus,
    progress: number,
    error?: string,
    results?: any
  ): Promise<void> {
    const updates: Record<string, string> = {
      status,
      progress: progress.toString(),
      updatedAt: new Date().toISOString(),
    };

    if (error) {
      updates.error = error;
    }

    if (results) {
      updates.results = JSON.stringify(results);
    }

    if (status === 'completed') {
      updates.completedAt = new Date().toISOString();
    }

    await this.redis.hset(`job:${jobId}`, updates);
  }

  async getQueueStatus(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const waiting = await this.queue.getWaiting();
    const active = await this.queue.getActive();
    const completed = await this.queue.getCompleted();
    const failed = await this.queue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  async cleanupOldJobs(olderThanHours: number = 24): Promise<void> {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    
    // Clean up completed and failed jobs older than cutoff
    await this.queue.clean(olderThanHours * 60 * 60 * 1000, 100, 'completed');
    await this.queue.clean(olderThanHours * 60 * 60 * 1000, 100, 'failed');
  }

  private async saveJob(job: Job): Promise<void> {
    const jobData = {
      status: job.status,
      progress: job.progress.toString(),
      audioFileId: job.audioFileId,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };

    await this.redis.hset(`job:${job.id}`, jobData);
  }
}