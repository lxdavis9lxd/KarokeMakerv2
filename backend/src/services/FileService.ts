import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AudioFile, UploadedFile, AudioMetadata } from '../models/AudioFile';

export class FileService {
  private uploadDir: string;
  private processedDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
    this.processedDir = process.env.PROCESSED_DIR || './processed';
  }

  async saveUploadedFile(file: UploadedFile): Promise<AudioFile> {
    const id = uuidv4();
    const extension = path.extname(file.originalname);
    const filename = `${id}${extension}`;
    const filePath = path.join(this.uploadDir, filename);

    // Move file to permanent location
    await fs.rename(file.path, filePath);

    // Extract metadata (basic implementation)
    const metadata = await this.extractAudioMetadata(filePath);

    const audioFile: AudioFile = {
      id,
      filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: filePath,
      uploadedAt: new Date(),
      metadata,
    };

    return audioFile;
  }

  async getFile(id: string): Promise<AudioFile | null> {
    // In a real implementation, this would query a database
    // For now, we'll implement basic file system lookup
    try {
      const files = await fs.readdir(this.uploadDir);
      const matchingFile = files.find(file => file.startsWith(id));
      
      if (!matchingFile) {
        return null;
      }

      const filePath = path.join(this.uploadDir, matchingFile);
      const stats = await fs.stat(filePath);

      return {
        id,
        filename: matchingFile,
        originalName: matchingFile,
        mimetype: 'audio/mpeg', // Default, should be stored in DB
        size: stats.size,
        path: filePath,
        uploadedAt: stats.birthtime,
      };
    } catch (error) {
      return null;
    }
  }

  async deleteFile(audioFile: AudioFile): Promise<void> {
    try {
      await fs.unlink(audioFile.path);
    } catch (error) {
      console.error(`Failed to delete file ${audioFile.path}:`, error);
    }
  }

  async createProcessedDirectory(jobId: string): Promise<string> {
    const jobDir = path.join(this.processedDir, jobId);
    await fs.mkdir(jobDir, { recursive: true });
    return jobDir;
  }

  async cleanupProcessedFiles(jobId: string): Promise<void> {
    const jobDir = path.join(this.processedDir, jobId);
    try {
      await fs.rmdir(jobDir, { recursive: true });
    } catch (error) {
      console.error(`Failed to cleanup processed files for job ${jobId}:`, error);
    }
  }

  private async extractAudioMetadata(filePath: string): Promise<AudioMetadata> {
    // Basic metadata extraction
    // In a real implementation, you'd use a library like node-ffprobe
    const stats = await fs.stat(filePath);
    
    return {
      // Placeholder values - would be extracted from actual audio file
      duration: 0,
      sampleRate: 44100,
      channels: 2,
      format: path.extname(filePath).slice(1),
    };
  }

  validateAudioFile(file: UploadedFile): { valid: boolean; error?: string } {
    // Check file type
    console.log('FileService validation - MIME type:', file.mimetype);
    console.log('FileService validation - Original name:', file.originalname);
    
    const allowedMimeTypes = ['audio/mpeg', 'audio/mp3', 'application/octet-stream'];
    const hasValidExtension = file.originalname.toLowerCase().endsWith('.mp3');
    
    if (!allowedMimeTypes.includes(file.mimetype) && !hasValidExtension) {
      return {
        valid: false,
        error: 'Only MP3 files are supported',
      };
    }

    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size exceeds 50MB limit',
      };
    }

    // Check minimum file size (1KB for testing, normally 1MB)
    const minSize = 1 * 1024; // 1KB for testing
    if (file.size < minSize) {
      return {
        valid: false,
        error: 'File size too small (minimum 1KB)',
      };
    }

    return { valid: true };
  }
}