import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { JobService } from '../services/JobService';

export class WebSocketServer {
  private io: SocketIOServer;
  private jobService: JobService;

  constructor(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"]
      }
    });

    this.jobService = new JobService();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Join job room to receive updates
      socket.on('join-job', (jobId: string) => {
        socket.join(`job:${jobId}`);
        console.log(`Client ${socket.id} joined job room: ${jobId}`);
      });

      // Leave job room
      socket.on('leave-job', (jobId: string) => {
        socket.leave(`job:${jobId}`);
        console.log(`Client ${socket.id} left job room: ${jobId}`);
      });

      // Get current job status
      socket.on('get-job-status', async (jobId: string) => {
        try {
          const job = await this.jobService.getJob(jobId);
          if (job) {
            socket.emit('job-status', {
              id: job.id,
              status: job.status,
              progress: job.progress,
              updatedAt: job.updatedAt,
              error: job.error,
              results: job.results,
            });
          } else {
            socket.emit('job-error', {
              message: 'Job not found',
              jobId,
            });
          }
        } catch (error) {
          socket.emit('job-error', {
            message: 'Failed to get job status',
            jobId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  // Method to emit job updates to all clients in a job room
  public emitJobUpdate(jobId: string, update: {
    status: string;
    progress: number;
    message?: string;
    error?: string;
    results?: any;
  }): void {
    this.io.to(`job:${jobId}`).emit('job-update', {
      jobId,
      ...update,
      timestamp: new Date().toISOString(),
    });
  }

  // Method to emit job completion
  public emitJobCompleted(jobId: string, results: any): void {
    this.io.to(`job:${jobId}`).emit('job-completed', {
      jobId,
      results,
      timestamp: new Date().toISOString(),
    });
  }

  // Method to emit job failure
  public emitJobFailed(jobId: string, error: string): void {
    this.io.to(`job:${jobId}`).emit('job-failed', {
      jobId,
      error,
      timestamp: new Date().toISOString(),
    });
  }

  public getIO(): SocketIOServer {
    return this.io;
  }
}