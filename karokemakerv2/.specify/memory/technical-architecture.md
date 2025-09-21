# Technical Architecture Plan: Karaoke Converter

## System Overview

### High-Level Architecture
```
[Frontend Web App] ←→ [Backend API] ←→ [Processing Services] ←→ [File Storage]
                                    ↓
                             [Job Queue System]
```

## Frontend Architecture

### Technology Stack
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS for responsive design
- **Audio**: WaveSurfer.js for audio visualization and playback
- **State Management**: React Query for server state + Zustand for client state
- **UI Components**: Headless UI + custom components
- **File Upload**: React Dropzone with progress tracking

### Key Components
1. **FileUploadComponent**: Drag-and-drop MP3 upload with validation
2. **ProcessingStatusComponent**: Real-time progress display with WebSocket updates
3. **AudioPlayerComponent**: Preview original and processed audio
4. **LyricDisplayComponent**: Synchronized lyric display with highlighting
5. **DownloadComponent**: Package download with format options

### Responsive Design Requirements
- Mobile-first approach (320px+)
- Touch-friendly controls (44px minimum touch targets)
- Progressive enhancement for desktop features
- Optimized for both portrait and landscape orientations

## Backend Architecture

### API Layer (Node.js + Express)
- **File Upload Endpoint**: `/api/upload` - Handles MP3 file uploads
- **Job Status Endpoint**: `/api/jobs/:id/status` - Returns processing progress
- **Download Endpoint**: `/api/jobs/:id/download` - Serves completed karaoke packages
- **Preview Endpoint**: `/api/jobs/:id/preview` - Streams processed audio for preview

### Processing Services

#### 1. Audio Separation Service
- **Technology**: Python service with Spleeter/Demucs
- **Input**: MP3 file path
- **Output**: Separated vocal and instrumental tracks
- **Processing Time**: 2-5 minutes for typical songs
- **Quality Options**: 2-stem (vocals/accompaniment) or 4-stem separation

#### 2. Lyric Extraction Service
- **Technology**: OpenAI Whisper for speech-to-text
- **Input**: Vocal track from separation
- **Output**: Timestamped lyric data
- **Fallback**: Manual lyric input interface
- **Processing Time**: 1-2 minutes for typical songs

#### 3. Format Generation Service
- **Input**: Instrumental track + timestamped lyrics
- **Output**: .lrc file + processed audio file
- **Formats Supported**: LRC (lyrics), MP3/WAV (instrumental)

### Job Queue System
- **Technology**: BullMQ + Redis
- **Purpose**: Handle long-running audio processing tasks
- **Features**:
  - Job prioritization
  - Progress tracking
  - Error handling and retries
  - Concurrent job processing

### File Storage
- **Temporary Storage**: Local filesystem for processing
- **Download Storage**: Temporary files with automatic cleanup
- **Retention Policy**: 24-hour cleanup for processed files

## Processing Workflow

### Step-by-Step Process
1. **File Upload**
   - Validate MP3 format and file size
   - Generate unique job ID
   - Store file temporarily
   - Queue processing job

2. **Audio Separation**
   - Load MP3 into processing service
   - Apply vocal separation algorithm
   - Generate instrumental and vocal tracks
   - Update job progress (33%)

3. **Lyric Extraction**
   - Process vocal track through Whisper
   - Generate timestamped transcript
   - Clean and format lyric data
   - Update job progress (66%)

4. **Package Generation**
   - Combine instrumental track with lyric timing
   - Generate .lrc file
   - Create downloadable package
   - Update job progress (100%)

5. **Delivery**
   - Notify frontend via WebSocket
   - Provide download links
   - Schedule file cleanup

## Infrastructure Requirements

### Development Environment
- **Docker**: Containerized services for audio processing
- **Node.js**: v18+ for backend services
- **Python**: v3.9+ for ML models
- **Redis**: Job queue and caching
- **FFmpeg**: Audio format handling

### Performance Considerations
- **Concurrent Processing**: Limit simultaneous jobs based on system resources
- **Memory Management**: Stream large files to prevent memory overflow
- **CPU Intensive**: Audio processing requires significant computational resources
- **Progress Updates**: Real-time status via WebSocket connections

### Scalability Factors
- **Horizontal Scaling**: Queue workers can be distributed
- **Load Balancing**: Frontend can be served from CDN
- **Resource Limits**: Define maximum file size and processing time
- **Rate Limiting**: Prevent abuse with upload limits per user/IP

## Integration Points

### External Dependencies
- **Spleeter/Demucs**: Pre-trained models for vocal separation
- **OpenAI Whisper**: Speech recognition for lyric extraction
- **FFmpeg**: Audio processing and format conversion

### API Contracts
- **WebSocket Events**: `job:progress`, `job:complete`, `job:error`
- **REST Endpoints**: Standard HTTP status codes and JSON responses
- **File Formats**: Support MP3 input, generate MP3/WAV + LRC output

## Security Considerations
- **File Validation**: Strict MP3 format checking
- **Size Limits**: Prevent resource exhaustion
- **Temporary Storage**: Automatic cleanup of user files
- **Rate Limiting**: Prevent service abuse
- **Input Sanitization**: Clean all user inputs