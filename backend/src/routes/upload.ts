import { Router, Request, Response } from 'express';
import { upload } from '../middleware/upload';
import { FileService } from '../services/FileService';
import { JobService } from '../services/JobService';

const router = Router();
const fileService = new FileService();
const jobService = new JobService();

interface UploadRequest extends Request {
  file?: Express.Multer.File;
}

router.post('/upload', upload.single('audio'), async (req: UploadRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file provided',
        message: 'Please upload an MP3 file',
      });
    }

    // Validate the uploaded file
    const validation = fileService.validateAudioFile(req.file);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid file',
        message: validation.error,
      });
    }

    // Save file metadata
    const audioFile = await fileService.saveUploadedFile(req.file);

    // Create processing job
    const job = await jobService.createJob({
      audioFileId: audioFile.id,
      options: {
        separationModel: 'spleeter:2stems',
        extractLyrics: true,
        preserveVocals: false,
      },
    });

    res.status(201).json({
      message: 'File uploaded successfully',
      jobId: job.id,
      audioFile: {
        id: audioFile.id,
        filename: audioFile.originalName,
        size: audioFile.size,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: 'Failed to process uploaded file',
    });
  }
});

export { router as uploadRouter };