import { Router, Request, Response } from 'express';
import { jobService } from '../services';

const router = Router();

router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const job = await jobService.getJob(id);
    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
        message: `Job with ID ${id} does not exist`,
      });
    }

    res.json({
      id: job.id,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
      error: job.error,
      results: job.results,
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      error: 'Status check failed',
      message: 'Failed to retrieve job status',
    });
  }
});

router.get('/queue/status', async (req: Request, res: Response) => {
  try {
    const queueStatus = await jobService.getQueueStatus();
    res.json(queueStatus);
  } catch (error) {
    console.error('Queue status error:', error);
    res.status(500).json({
      error: 'Queue status failed',
      message: 'Failed to retrieve queue status',
    });
  }
});

export { router as jobsRouter };