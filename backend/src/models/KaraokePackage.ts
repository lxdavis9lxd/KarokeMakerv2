export interface KaraokePackage {
  id: string;
  jobId: string;
  audioFileId: string;
  instrumentalPath: string;
  lyricsPath: string;
  createdAt: Date;
  metadata: PackageMetadata;
}

export interface PackageMetadata {
  title?: string;
  artist?: string;
  duration: number;
  format: 'lrc';
  version: string;
  generatedBy: string;
}

export interface LRCLine {
  timestamp: number;
  text: string;
}

export interface LRCFile {
  metadata: {
    artist?: string;
    title?: string;
    album?: string;
    length?: string;
    by?: string;
  };
  lines: LRCLine[];
}

export interface DownloadPackage {
  instrumentalFile: Buffer;
  lyricsFile: Buffer;
  metadata: PackageMetadata;
}