import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import archiver from 'archiver';
import { JobService } from '../services/JobService';

const router = Router();
const jobService = new JobService();

router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const job = await jobService.getJob(id);
    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
        message: `Job with ID ${id} does not exist`,
      });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({
        error: 'Job not completed',
        message: 'Job is not yet completed',
        status: job.status,
        progress: job.progress,
      });
    }

    if (!job.results) {
      return res.status(500).json({
        error: 'No results available',
        message: 'Job completed but no results found',
      });
    }

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="karaoke-${id}.zip"`);

    // Pipe archive to response
    archive.pipe(res);

    // Add instrumental file
    const instrumentalPath = job.results.instrumentalPath;
    if (await fs.access(instrumentalPath).then(() => true).catch(() => false)) {
      archive.file(instrumentalPath, { name: 'instrumental.wav' });
    }

    // Add lyrics file
    const lyricsPath = job.results.lyricsPath;
    if (await fs.access(lyricsPath).then(() => true).catch(() => false)) {
      archive.file(lyricsPath, { name: 'lyrics.lrc' });
    }

    // Add metadata file
    const metadata = {
      jobId: job.id,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      results: job.results,
      generatedBy: 'KarokeMaker v2',
    };
    archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

    // Finalize archive
    await archive.finalize();

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      error: 'Download failed',
      message: 'Failed to create download package',
    });
  }
});

router.get('/:id/preview/:type', async (req: Request, res: Response) => {
  try {
    const { id, type } = req.params;

    const job = await jobService.getJob(id);
    if (!job || job.status !== 'completed' || !job.results) {
      return res.status(404).json({
        error: 'Preview not available',
        message: 'Job not completed or results not found',
      });
    }

    let filePath: string;
    let contentType: string;

    switch (type) {
      case 'instrumental':
        filePath = job.results.instrumentalPath;
        contentType = 'audio/wav';
        break;
      case 'lyrics':
        filePath = job.results.lyricsPath;
        contentType = 'text/plain';
        break;
      case 'vocals':
        if (!job.results.originalVocalsPath) {
          return res.status(404).json({
            error: 'Vocals not available',
            message: 'Original vocals were not preserved',
          });
        }
        filePath = job.results.originalVocalsPath;
        contentType = 'audio/wav';
        break;
      default:
        return res.status(400).json({
          error: 'Invalid preview type',
          message: 'Preview type must be: instrumental, lyrics, or vocals',
        });
    }

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        error: 'File not found',
        message: 'Preview file is not available',
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Stream file
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({
      error: 'Preview failed',
      message: 'Failed to load preview',
    });
  }
});

export { router as downloadRouter };