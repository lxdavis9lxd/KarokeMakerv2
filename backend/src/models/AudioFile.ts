export interface AudioFile {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  uploadedAt: Date;
  metadata?: AudioMetadata;
}

export interface AudioMetadata {
  duration?: number;
  sampleRate?: number;
  bitrate?: number;
  channels?: number;
  format?: string;
  title?: string;
  artist?: string;
  album?: string;
}

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
}