export interface Job {
  id: string;
  status: JobStatus;
  progress: number;
  audioFileId: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
  results?: JobResults;
}

export type JobStatus = 
  | 'pending'
  | 'processing'
  | 'separating_vocals'
  | 'extracting_lyrics'
  | 'generating_lrc'
  | 'completed'
  | 'failed';

export interface JobResults {
  instrumentalPath: string;
  lyricsPath: string;
  originalVocalsPath?: string;
  duration?: number;
  metadata?: {
    title?: string;
    artist?: string;
  };
}

export interface CreateJobRequest {
  audioFileId: string;
  options?: ProcessingOptions;
}

export interface ProcessingOptions {
  separationModel?: 'spleeter:2stems' | 'spleeter:4stems' | 'spleeter:5stems';
  extractLyrics?: boolean;
  preserveVocals?: boolean;
}