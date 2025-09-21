# Processing Workflow: MP3 to Karaoke Conversion

## Overview
This document outlines the complete processing pipeline from MP3 upload to karaoke file generation, including error handling, progress tracking, and quality validation.

## Workflow Stages

### Stage 1: File Reception & Validation (5-10 seconds)

#### Input Validation
1. **File Format Check**
   - Verify MIME type is `audio/mpeg`
   - Validate file extension is `.mp3`
   - Check file headers for MP3 signature

2. **File Size Validation**
   - Maximum file size: 50MB (approximately 35-40 minutes of audio)
   - Minimum file size: 1MB (prevent empty/corrupt uploads)

3. **Audio Properties Check**
   - Duration: Maximum 45 minutes
   - Sample rate: Accept 22kHz, 44.1kHz, 48kHz
   - Bitrate: Minimum 128kbps for quality processing

#### Job Initialization
1. Generate unique job ID (UUID)
2. Create temporary file storage directory
3. Store original file with metadata
4. Initialize job status in database
5. Return job ID to client for tracking

### Stage 2: Audio Preprocessing (10-30 seconds)

#### File Preparation
1. **Format Standardization**
   - Convert to consistent format (44.1kHz, stereo)
   - Normalize audio levels if needed
   - Generate waveform data for frontend display

2. **Quality Assessment**
   - Analyze audio for vocal presence
   - Detect instrumental-only tracks (warn user)
   - Check for audio corruption or extreme distortion

3. **Progress Update**: 15% complete

### Stage 3: Vocal Separation (2-8 minutes)

#### Primary Separation Process
1. **Model Selection**
   - Default: Spleeter 2-stem (vocals/accompaniment)
   - Fallback: Demucs if Spleeter fails
   - Processing time varies by song length and complexity

2. **Separation Execution**
   - Load audio into processing model
   - Apply deep learning separation algorithm
   - Generate separate vocal and instrumental tracks
   - Validate separation quality

#### Quality Validation
1. **Vocal Reduction Check**
   - Measure vocal presence in instrumental track
   - Target: >20dB reduction in vocal frequencies
   - Flag poor separation results

2. **Audio Integrity**
   - Check for artifacts or distortion
   - Validate output file completeness
   - Ensure consistent audio levels

3. **Progress Updates**: 25% → 65% (with intermediate updates)

### Stage 4: Lyric Extraction (1-3 minutes)

#### Speech-to-Text Processing
1. **Vocal Track Analysis**
   - Process separated vocal track through Whisper
   - Generate initial transcript with timestamps
   - Language detection (default: English)

2. **Lyric Formatting**
   - Clean transcript text (remove filler words)
   - Structure into verses, chorus, bridge sections
   - Validate timing accuracy with audio

#### Manual Lyric Option
1. **Alternative Input**
   - Allow users to upload existing .lrc files
   - Provide text input interface for manual lyrics
   - Sync manually entered lyrics with audio timing

3. **Progress Update**: 80% complete

### Stage 5: Package Generation (10-20 seconds)

#### File Creation
1. **LRC File Generation**
   - Format: `[mm:ss.xx] Lyric line`
   - Include metadata headers (title, artist, length)
   - Validate timing accuracy and format compliance

2. **Audio File Preparation**
   - Final processing of instrumental track
   - Format conversion (maintain quality)
   - Embed metadata tags

#### Package Assembly
1. **File Packaging**
   - Create downloadable ZIP containing:
     - Instrumental audio file (.mp3)
     - Synchronized lyrics file (.lrc)
     - Optional: Original vocals track
   - Generate package manifest

2. **Quality Assurance**
   - Final validation of all output files
   - Test .lrc file format compatibility
   - Verify audio/lyric synchronization

3. **Progress Update**: 100% complete

## Error Handling & Recovery

### Common Error Scenarios

#### Upload Errors
- **Invalid File Format**: Return clear error message
- **File Too Large**: Suggest compression or splitting
- **Corrupted Upload**: Request file re-upload

#### Processing Errors
- **Separation Failure**: Retry with alternative model
- **Poor Vocal Separation**: Warn user, provide options
- **Transcription Failure**: Offer manual lyric input

#### System Errors
- **Resource Exhaustion**: Queue job for later processing
- **Service Unavailable**: Graceful degradation with status updates
- **Storage Issues**: Clean temporary files, retry processing

### Recovery Mechanisms
1. **Automatic Retries**: Up to 3 attempts for transient failures
2. **Fallback Models**: Alternative processing methods
3. **Partial Success**: Deliver available outputs even if some steps fail
4. **Manual Intervention**: Flag complex cases for review

## Progress Tracking & Communication

### WebSocket Updates
- Real-time progress percentages
- Stage completion notifications
- Error status with recovery options
- Estimated completion times

### Status Messages
- **Queued**: "Your file is in the processing queue..."
- **Processing**: "Separating vocals from music..."
- **Extracting**: "Converting speech to synchronized lyrics..."
- **Finalizing**: "Creating your karaoke package..."
- **Complete**: "Your karaoke files are ready for download!"

## Performance Optimization

### Processing Efficiency
1. **Parallel Processing**: Run compatible operations simultaneously
2. **Resource Management**: Limit concurrent jobs based on system capacity
3. **Caching**: Store processed results for duplicate files
4. **Priority Queue**: Fast-track smaller files

### User Experience
1. **Progressive Loading**: Show results as they become available
2. **Preview Options**: Allow preview before full download
3. **Background Processing**: Continue work while user browses away
4. **Notification System**: Alert users when processing completes

## Quality Metrics

### Success Criteria
- **Vocal Reduction**: >15dB reduction in vocal frequencies
- **Timing Accuracy**: ±0.5 seconds for lyric synchronization
- **File Compatibility**: 100% compatibility with standard karaoke players
- **Processing Speed**: <10 minutes for typical 4-minute songs

### Monitoring
- Track processing success rates
- Monitor average processing times
- Collect user feedback on quality
- Automated quality validation for each output