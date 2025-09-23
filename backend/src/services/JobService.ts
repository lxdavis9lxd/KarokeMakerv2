import { Queue, Job as BullJob } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { Job, JobStatus, CreateJobRequest, ProcessingOptions } from '../models/Job';
import { Redis } from 'ioredis';
import { promises as fs } from 'fs';
import path from 'path';

export class JobService {
  private queue?: Queue;
  private redis?: Redis;
  private redisAvailable: boolean = false;
  private memoryJobs: Map<string, Job> = new Map();
  private initializationPromise?: Promise<void>;

  constructor() {
    // Only initialize once
    if (!this.initializationPromise) {
      this.initializationPromise = this.initializeRedis();
    }
  }

  private async initializeRedis(): Promise<void> {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        connectTimeout: 2000,
        lazyConnect: true,
        enableReadyCheck: false,
        maxRetriesPerRequest: 1,
      });

      // Test connection with timeout
      await Promise.race([
        this.redis.ping(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 3000)
        )
      ]);
      
      this.queue = new Queue('karaoke-processing', {
        connection: this.redis,
      });

      this.redisAvailable = true;
      console.log('✅ Redis connected successfully');
    } catch (error) {
      console.log('⚠️  Redis not available, using in-memory storage for development');
      this.redisAvailable = false;
      this.redis?.disconnect();
      this.redis = undefined;
      this.queue = undefined;
    }
  }

  async createJob(request: CreateJobRequest): Promise<Job> {
    // Wait for initialization to complete
    await this.initializationPromise;
    
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
    // Check if real processing is enabled
    if (process.env.ENABLE_REAL_PROCESSING === 'true') {
      return this.realJobProcessing(jobId);
    }

    // Enable real processing by default instead of simulation
    return this.realJobProcessing(jobId);

    // Fallback to simulation for development mode
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
    
    // Create actual output files in processed directory
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const processedDir = path.resolve('./processed');
      const karaokeFileName = `karaoke_${jobId}.mp3`;
      const instrumentalFileName = `instrumental_${jobId}.mp3`;
      const lyricsFileName = `lyrics_${jobId}.txt`;
      
      const karaokePath = path.join(processedDir, karaokeFileName);
      const instrumentalPath = path.join(processedDir, instrumentalFileName);
      const lyricsPath = path.join(processedDir, lyricsFileName);
      
      // Create sample karaoke file (placeholder)
      await fs.writeFile(karaokePath, Buffer.from([
        // MP3 header for a minimal valid MP3 file
        0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
      ]));
      
      // Create sample instrumental file (placeholder)  
      await fs.writeFile(instrumentalPath, Buffer.from([
        0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
      ]));
      
      // Create lyrics file
      await fs.writeFile(lyricsPath, `# Karaoke Lyrics for Job ${jobId}

[00:00] Sample karaoke track created
[00:05] This is a simulated output  
[00:10] In a real implementation, vocal separation would occur here
[00:15] Creating instrumental and karaoke tracks

Generated on: ${new Date().toISOString()}
`);

      console.log(`📁 Created output files in: ${processedDir}`);
      console.log(`🎵 Karaoke: ${karaokePath}`);
      console.log(`🎼 Instrumental: ${instrumentalPath}`);
      console.log(`📝 Lyrics: ${lyricsPath}`);
      
      // Complete the job with actual file paths
      await this.updateJobStatus(jobId, 'completed', 100, undefined, {
        karaokeFile: karaokeFileName,
        instrumentalFile: instrumentalFileName,
        lyricsFile: lyricsFileName,
        karaokePath: karaokePath,
        instrumentalPath: instrumentalPath,
        lyricsPath: lyricsPath,
        processedDir: processedDir
      });
      
      console.log(`✅ Job ${jobId} completed with output files created`);
    } catch (error) {
      console.error(`❌ Failed to create output files for job ${jobId}:`, error);
      await this.updateJobStatus(jobId, 'failed', 100, `Failed to create output files: ${error}`);
    }
  }

  private async realJobProcessing(jobId: string): Promise<void> {
    console.log(`🎵 Starting REAL processing for job ${jobId}`);
    
    try {
      // Update to processing
      await this.updateJobStatus(jobId, 'processing', 5);

      // Get the job to find the audio file
      const job = await this.getJob(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Find the input file
      const uploadsDir = path.resolve('./uploads');
      const inputFile = path.join(uploadsDir, `${job.audioFileId}.mp3`);
      
      // Check if input file exists
      try {
        await fs.access(inputFile);
      } catch {
        throw new Error(`Input file not found: ${inputFile}`);
      }

      // Setup output directory
      const processedDir = path.resolve('./processed');
      await fs.mkdir(processedDir, { recursive: true });

      // Call Python script for real audio processing
      const scriptPath = path.resolve('./backend/scripts/audio_processor.py');
      const fallbackScriptPath = path.resolve('./backend/scripts/audio_processor_fallback.py');
      
      // Now that FFmpeg is installed, use the full processor
      let processorScript = scriptPath;
      console.log(`🎵 Using full FFmpeg processor: ${scriptPath}`);
      
      console.log(`🐍 Calling Python processor: ${processorScript}`);
      
      const { spawn } = require('child_process');
      
      return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [processorScript, inputFile, processedDir, jobId], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let outputBuffer = '';
        let errorBuffer = '';

        pythonProcess.stdout.on('data', async (data: Buffer) => {
          const output = data.toString();
          outputBuffer += output;
          
          // Parse progress updates
          const lines = output.split('\n');
          for (const line of lines) {
            if (line.startsWith('PROGRESS:')) {
              try {
                const progressData = JSON.parse(line.substring(9));
                await this.updateJobStatus(jobId, 'processing', progressData.progress);
                console.log(`📊 Job ${jobId} progress: ${progressData.progress}% - ${progressData.message}`);
              } catch (e) {
                console.warn('Failed to parse progress:', line);
              }
            } else if (line.startsWith('RESULT:')) {
              try {
                const result = JSON.parse(line.substring(7));
                if (result.success) {
                  // Extract filenames from full paths
                  const karaokeFileName = path.basename(result.karaoke_file);
                  const instrumentalFileName = path.basename(result.instrumental_file);
                  const lyricsFileName = path.basename(result.lyrics_file);
                  
                  await this.updateJobStatus(jobId, 'completed', 100, undefined, {
                    karaokeFile: karaokeFileName,
                    instrumentalFile: instrumentalFileName,
                    lyricsFile: lyricsFileName,
                    karaokePath: result.karaoke_file,
                    instrumentalPath: result.instrumental_file,
                    lyricsPath: result.lyrics_file,
                    processedDir: processedDir
                  });
                  
                  console.log(`✅ Job ${jobId} completed with REAL audio separation!`);
                  console.log(`🎵 Karaoke: ${result.karaoke_file}`);
                  console.log(`🎼 Instrumental: ${result.instrumental_file}`);
                  console.log(`📝 Lyrics: ${result.lyrics_file}`);
                  
                  resolve();
                } else {
                  throw new Error(result.error || 'Processing failed');
                }
              } catch (e) {
                console.warn('Failed to parse result:', line);
              }
            }
          }
        });

        pythonProcess.stderr.on('data', (data: Buffer) => {
          errorBuffer += data.toString();
          console.error(`Python stderr: ${data.toString()}`);
        });

        pythonProcess.on('close', async (code: number | null) => {
          if (code !== 0 && code !== null) {
            const error = `Python process exited with code ${code}. Error: ${errorBuffer}`;
            console.error(`❌ Real processing failed for job ${jobId}: ${error}`);
            await this.updateJobStatus(jobId, 'failed', 100, error);
            reject(new Error(error));
          }
        });

        pythonProcess.on('error', async (error: Error) => {
          console.error(`❌ Failed to start Python process for job ${jobId}:`, error);
          await this.updateJobStatus(jobId, 'failed', 100, `Failed to start processing: ${error.message}`);
          reject(error);
        });

        // Set timeout for processing (10 minutes)
        setTimeout(async () => {
          pythonProcess.kill();
          const timeoutError = 'Processing timeout (10 minutes)';
          console.error(`❌ Job ${jobId} timed out`);
          await this.updateJobStatus(jobId, 'failed', 100, timeoutError);
          reject(new Error(timeoutError));
        }, 10 * 60 * 1000);
      });

    } catch (error) {
      console.error(`❌ Real processing failed for job ${jobId}:`, error);
      await this.updateJobStatus(jobId, 'failed', 100, `Real processing failed: ${error}`);
      throw error;
    }
  }
}