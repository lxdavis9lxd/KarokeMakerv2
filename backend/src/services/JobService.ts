import { Queue, Job as BullJob } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { Job, JobStatus, CreateJobRequest, ProcessingOptions } from '../models/Job';
import { Redis } from 'ioredis';

export class JobService {
  private queue?: Queue;
  private redis?: Redis;
  private redisAvailable: boolean = false;
  private memoryJobs: Map<string, Job> = new Map();

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        connectTimeout: 5000,
        lazyConnect: true,
      });

      // Test connection
      await this.redis.ping();
      
      this.queue = new Queue('karaoke-processing', {
        connection: this.redis,
      });

      this.redisAvailable = true;
      console.log('✅ Redis connected successfully');
    } catch (error) {
      console.log('⚠️  Redis not available, using in-memory storage for development');
      this.redisAvailable = false;
      this.redis = undefined;
      this.queue = undefined;
    }
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

    // Store job
    await this.saveJob(job);

    if (this.redisAvailable && this.queue) {
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
    } else {
      // Simulate processing in development mode
      console.log('📝 Job created in development mode (no Redis)');
      setTimeout(() => {
        this.simulateJobProcessing(jobId);
      }, 1000);
    }

    return job;
  }

  async getJob(jobId: string): Promise<Job | null> {
    try {
      if (this.redisAvailable && this.redis) {
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
      } else {
        // Use in-memory storage
        return this.memoryJobs.get(jobId) || null;
      }
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
    if (this.redisAvailable && this.redis) {
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
    } else {
      // Update in-memory storage
      const job = this.memoryJobs.get(jobId);
      if (job) {
        job.status = status;
        job.progress = progress;
        job.updatedAt = new Date();
        if (error) job.error = error;
        if (results) job.results = results;
        if (status === 'completed') job.completedAt = new Date();
        this.memoryJobs.set(jobId, job);
      }
    }
  }

  async getQueueStatus(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    if (this.redisAvailable && this.queue) {
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
    } else {
      // Return mock data for development
      const jobs = Array.from(this.memoryJobs.values());
      return {
        waiting: jobs.filter(j => j.status === 'pending').length,
        active: jobs.filter(j => j.status === 'processing').length,
        completed: jobs.filter(j => j.status === 'completed').length,
        failed: jobs.filter(j => j.status === 'failed').length,
      };
    }
  }

  async cleanupOldJobs(olderThanHours: number = 24): Promise<void> {
    if (this.redisAvailable && this.queue) {
      // Clean up completed and failed jobs older than cutoff
      await this.queue.clean(olderThanHours * 60 * 60 * 1000, 100, 'completed');
      await this.queue.clean(olderThanHours * 60 * 60 * 1000, 100, 'failed');
    } else {
      // Clean up in-memory jobs
      const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
      for (const [jobId, job] of this.memoryJobs.entries()) {
        if (job.updatedAt < cutoffTime && 
            (job.status === 'completed' || job.status === 'failed')) {
          this.memoryJobs.delete(jobId);
        }
      }
    }
  }

  private async saveJob(job: Job): Promise<void> {
    if (this.redisAvailable && this.redis) {
      const jobData = {
        status: job.status,
        progress: job.progress.toString(),
        audioFileId: job.audioFileId,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
      };

      await this.redis.hset(`job:${job.id}`, jobData);
    } else {
      // Save to in-memory storage
      this.memoryJobs.set(job.id, { ...job });
    }
  }

  private async simulateJobProcessing(jobId: string): Promise<void> {
    // Simulate job processing for development mode
    console.log(`🎵 Simulating processing for job ${jobId}`);
    
    // Update to processing
    await this.updateJobStatus(jobId, 'processing', 10);
    
    // Simulate progress updates
    const progressSteps = [25, 50, 75, 90];
    for (const progress of progressSteps) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await this.updateJobStatus(jobId, 'processing', progress);
      console.log(`📊 Job ${jobId} progress: ${progress}%`);
    }
    
    // Complete the job
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.updateJobStatus(jobId, 'completed', 100, undefined, {
      karaokeFile: `karaoke_${jobId}.mp3`,
      instrumentalFile: `instrumental_${jobId}.mp3`,
      lyricsFile: `lyrics_${jobId}.txt`,
    });
    
    console.log(`✅ Job ${jobId} completed (simulated)`);
  }
}