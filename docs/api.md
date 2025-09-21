# API Documentation - KarokeMaker v2

## Base URL
```
http://localhost:3000/api
```

## Authentication
Currently no authentication required for MVP version.

## Endpoints

### Health Check
Check if the API is running and responsive.

**GET** `/health`

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-09-21T22:40:00.000Z"
}
```

---

### Upload Audio File
Upload an MP3 file for karaoke conversion.

**POST** `/upload`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `audio` (file): MP3 file to process

**Constraints:**
- Maximum file size: 50MB
- Supported formats: MP3 only
- Minimum file size: 1MB

**Success Response (201):**
```json
{
  "message": "File uploaded successfully",
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "audioFile": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "filename": "my-song.mp3",
    "size": 5242880
  }
}
```

**Error Responses:**
```json
// 400 - No file provided
{
  "error": "No file provided",
  "message": "Please upload an MP3 file"
}

// 400 - Invalid file type
{
  "error": "Invalid file type",
  "message": "Only MP3 files are supported",
  "code": "INVALID_FILE_TYPE"
}

// 400 - File too large
{
  "error": "File too large",
  "message": "File size exceeds 50MB limit",
  "code": "FILE_TOO_LARGE"
}
```

---

### Get Job Status
Check the processing status of a job.

**GET** `/jobs/:id/status`

**Parameters:**
- `id` (string): Job ID returned from upload

**Success Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "progress": 45,
  "createdAt": "2025-09-21T22:30:00.000Z",
  "updatedAt": "2025-09-21T22:31:30.000Z",
  "completedAt": null,
  "error": null,
  "results": null
}
```

**Job Status Values:**
- `pending` - Job queued for processing
- `processing` - Audio separation in progress
- `separating_vocals` - Isolating vocal and instrumental tracks
- `extracting_lyrics` - Converting speech to text with timing
- `generating_lrc` - Creating synchronized lyric file
- `completed` - Processing finished successfully
- `failed` - Processing failed with error

**Completed Job Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "progress": 100,
  "createdAt": "2025-09-21T22:30:00.000Z",
  "updatedAt": "2025-09-21T22:35:00.000Z",
  "completedAt": "2025-09-21T22:35:00.000Z",
  "error": null,
  "results": {
    "instrumentalPath": "/processed/550e8400.../instrumental.wav",
    "lyricsPath": "/processed/550e8400.../lyrics.lrc",
    "duration": 240.5,
    "metadata": {
      "title": "My Song",
      "artist": "Unknown Artist"
    }
  }
}
```

**Error Response (404):**
```json
{
  "error": "Job not found",
  "message": "Job with ID 550e8400-e29b-41d4-a716-446655440000 does not exist"
}
```

---

### Download Karaoke Package
Download the completed karaoke files as a ZIP package.

**GET** `/jobs/:id/download`

**Parameters:**
- `id` (string): Job ID

**Success Response (200):**
- **Content-Type:** `application/zip`
- **Content-Disposition:** `attachment; filename="karaoke-{jobId}.zip"`

**ZIP Contents:**
- `instrumental.wav` - Audio track with vocals removed
- `lyrics.lrc` - Synchronized lyrics in LRC format
- `metadata.json` - Processing information and metadata

**Error Responses:**
```json
// 404 - Job not found
{
  "error": "Job not found",
  "message": "Job with ID {id} does not exist"
}

// 400 - Job not completed
{
  "error": "Job not completed",
  "message": "Job is not yet completed",
  "status": "processing",
  "progress": 75
}

// 500 - No results available
{
  "error": "No results available",
  "message": "Job completed but no results found"
}
```

---

### Preview Files
Preview individual components of the karaoke package.

**GET** `/jobs/:id/preview/:type`

**Parameters:**
- `id` (string): Job ID
- `type` (string): Preview type - `instrumental`, `lyrics`, or `vocals`

**Preview Types:**
- `instrumental` - Instrumental audio track (audio/wav)
- `lyrics` - Synchronized lyrics file (text/plain)
- `vocals` - Original vocals track if preserved (audio/wav)

**Success Response (200):**
- **instrumental/vocals:** Streams audio file with `Content-Type: audio/wav`
- **lyrics:** Returns LRC file content with `Content-Type: text/plain`

**Error Responses:**
```json
// 404 - Preview not available
{
  "error": "Preview not available",
  "message": "Job not completed or results not found"
}

// 400 - Invalid preview type
{
  "error": "Invalid preview type",
  "message": "Preview type must be: instrumental, lyrics, or vocals"
}

// 404 - Vocals not available
{
  "error": "Vocals not available",
  "message": "Original vocals were not preserved"
}
```

---

### Queue Status
Get current processing queue information.

**GET** `/jobs/queue/status`

**Success Response (200):**
```json
{
  "waiting": 3,
  "active": 1,
  "completed": 25,
  "failed": 2
}
```

---

## WebSocket Events

Connect to WebSocket for real-time job updates:
```
ws://localhost:3000
```

### Client Events (Send)

#### Join Job Room
Subscribe to updates for a specific job.
```javascript
socket.emit('join-job', jobId);
```

#### Leave Job Room
Unsubscribe from job updates.
```javascript
socket.emit('leave-job', jobId);
```

#### Get Job Status
Request current status of a job.
```javascript
socket.emit('get-job-status', jobId);
```

### Server Events (Receive)

#### Job Status Update
```javascript
socket.on('job-update', (data) => {
  console.log(data);
  // {
  //   jobId: "550e8400-e29b-41d4-a716-446655440000",
  //   status: "separating_vocals",
  //   progress: 35,
  //   message: "Isolating vocal tracks...",
  //   timestamp: "2025-09-21T22:31:30.000Z"
  // }
});
```

#### Job Completed
```javascript
socket.on('job-completed', (data) => {
  console.log(data);
  // {
  //   jobId: "550e8400-e29b-41d4-a716-446655440000",
  //   results: { ... },
  //   timestamp: "2025-09-21T22:35:00.000Z"
  // }
});
```

#### Job Failed
```javascript
socket.on('job-failed', (data) => {
  console.log(data);
  // {
  //   jobId: "550e8400-e29b-41d4-a716-446655440000",
  //   error: "Audio processing failed: Invalid audio format",
  //   timestamp: "2025-09-21T22:32:00.000Z"
  // }
});
```

#### Job Status Response
```javascript
socket.on('job-status', (data) => {
  console.log(data);
  // Same format as GET /jobs/:id/status
});
```

#### Error
```javascript
socket.on('job-error', (data) => {
  console.log(data);
  // {
  //   message: "Job not found",
  //   jobId: "550e8400-e29b-41d4-a716-446655440000"
  // }
});
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_FILE_TYPE` | Uploaded file is not MP3 format |
| `FILE_TOO_LARGE` | File exceeds 50MB size limit |
| `INVALID_FILE_FIELD` | Wrong form field name for file upload |
| `PROCESSING_TIMEOUT` | Audio processing took too long |
| `INSUFFICIENT_STORAGE` | Not enough disk space for processing |
| `UNKNOWN_ERROR` | Unexpected server error |

---

## Rate Limits

Currently no rate limiting implemented. In production:
- Upload: 10 files per hour per IP
- Status checks: 100 requests per minute per IP
- Downloads: 20 downloads per hour per IP

---

## Example Usage

### JavaScript/TypeScript Client

```typescript
class KaraokeClient {
  private apiUrl = 'http://localhost:3000/api';
  private socket: Socket;

  constructor() {
    this.socket = io('http://localhost:3000');
  }

  async uploadFile(file: File): Promise<{ jobId: string }> {
    const formData = new FormData();
    formData.append('audio', file);

    const response = await fetch(`${this.apiUrl}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getJobStatus(jobId: string) {
    const response = await fetch(`${this.apiUrl}/jobs/${jobId}/status`);
    return response.json();
  }

  subscribeToJob(jobId: string, callbacks: {
    onUpdate?: (data: any) => void;
    onCompleted?: (data: any) => void;
    onFailed?: (data: any) => void;
  }) {
    this.socket.emit('join-job', jobId);
    
    if (callbacks.onUpdate) {
      this.socket.on('job-update', callbacks.onUpdate);
    }
    if (callbacks.onCompleted) {
      this.socket.on('job-completed', callbacks.onCompleted);
    }
    if (callbacks.onFailed) {
      this.socket.on('job-failed', callbacks.onFailed);
    }
  }

  async downloadKaraoke(jobId: string): Promise<Blob> {
    const response = await fetch(`${this.apiUrl}/jobs/${jobId}/download`);
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }
    
    return response.blob();
  }
}
```

### curl Examples

```bash
# Upload a file
curl -X POST \
  -F "audio=@song.mp3" \
  http://localhost:3000/api/upload

# Check job status
curl http://localhost:3000/api/jobs/550e8400-e29b-41d4-a716-446655440000/status

# Download karaoke package
curl -O -J \
  http://localhost:3000/api/jobs/550e8400-e29b-41d4-a716-446655440000/download

# Preview instrumental track
curl http://localhost:3000/api/jobs/550e8400-e29b-41d4-a716-446655440000/preview/instrumental \
  --output instrumental.wav
```