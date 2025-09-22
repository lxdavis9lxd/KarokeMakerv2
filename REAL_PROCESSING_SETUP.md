# 🎵 KarokeMaker v2 - Real Audio Processing Setup

This guide shows you how to enable **real vocal separation** instead of simulated processing.

## 🎯 Quick Start

### 1. Enable Real Processing
Add this environment variable to enable real processing:

**Windows PowerShell:**
```powershell
$env:ENABLE_REAL_PROCESSING = "true"
npm run dev
```

**Windows Command Prompt:**
```cmd
set ENABLE_REAL_PROCESSING=true
npm run dev
```

**Linux/Mac:**
```bash
export ENABLE_REAL_PROCESSING=true
npm run dev
```

### 2. Install Python Dependencies

**Install Python 3.8+ and pip, then:**
```bash
cd backend
pip install -r requirements.txt
```

### 3. Install FFmpeg
- **Windows**: Download from https://ffmpeg.org/download.html
- **Mac**: `brew install ffmpeg`
- **Linux**: `sudo apt-get install ffmpeg`

## 🔧 How It Works

### Current State (Simulation)
- ❌ Creates placeholder MP3 files (just headers)
- ❌ Static lyrics text
- ✅ Fast processing (for development)

### With Real Processing Enabled
- ✅ **FFmpeg-based vocal separation** (center vocal removal)
- ✅ **Real karaoke tracks** with vocal reduction
- ✅ **Real instrumental tracks** with frequency filtering
- ✅ **Progress tracking** from Python script
- ✅ **Error handling** and timeouts

## 🎛️ Technology Stack

### FFmpeg Approach (Current - Python 3.13 Compatible)
- **What**: Audio filters for vocal removal and enhancement
- **Quality**: Good for center-panned vocals
- **Speed**: ~5-15 seconds for a 3-minute song
- **Requirements**: Python 3.8+, FFmpeg

### Upgrade Options
- **Spleeter**: Requires Python 3.8-3.10 (not 3.13 compatible)
- **Demucs**: Facebook's state-of-the-art separation
- **Cloud APIs**: LALAL.AI, Moises.ai for best quality

## 🛠️ Installing FFmpeg

### Windows (Required)
1. **Download FFmpeg**: https://ffmpeg.org/download.html#build-windows
2. **Extract** to `C:\ffmpeg\`
3. **Add to PATH**:
   - Open System Properties → Environment Variables
   - Edit "Path" variable
   - Add `C:\ffmpeg\bin`
   - Restart PowerShell

**Quick Test**: `ffmpeg -version`

### Alternative: Use Chocolatey
```powershell
# Install Chocolatey first (if not installed)
choco install ffmpeg
```

## 📁 File Structure

```
backend/
├── scripts/
│   └── audio_processor.py      # Real processing script
├── requirements.txt            # Python dependencies
├── uploads/                   # Input files
└── processed/                 # Output files
    ├── karaoke_[jobId].mp3    # Vocals removed
    ├── instrumental_[jobId].mp3 # Instruments only
    └── lyrics_[jobId].txt     # Processing info
```

## 🚨 Troubleshooting

### Common Issues

**"Python not found"**
- Install Python 3.8+ from python.org
- Ensure `python` command is in PATH

**"FFmpeg not found"**  
- Install FFmpeg and add to PATH
- Test with: `ffmpeg -version`

**"Spleeter installation failed"**
- Try: `pip install --upgrade pip`
- Then: `pip install spleeter tensorflow`

**"Processing timeout"**
- Large files (>10MB) may take 5-10 minutes
- Timeout is set to 10 minutes per job

### Performance Tips

**For Faster Processing:**
- Use shorter audio files (3-4 minutes max)
- Close other applications during processing
- Consider using GPU version of TensorFlow

**For Better Quality:**
- Use high-quality MP3 files (320kbps)
- Ensure vocals are center-panned in original
- Avoid heavily processed/compressed audio

## 🎮 Testing Real Processing

1. **Enable real processing** with environment variable
2. **Upload a test MP3** (start with a short file ~1-2 minutes)
3. **Watch the progress** - should take 30 seconds to 2 minutes
4. **Download results** - you'll get real separated audio!

## 🔄 Switching Back to Simulation

Remove the environment variable:
```bash
unset ENABLE_REAL_PROCESSING
# or set it to "false"
export ENABLE_REAL_PROCESSING=false
```

## 🎯 Production Deployment

For production use:
1. **Install dependencies** on server
2. **Set environment variable** in production config
3. **Monitor processing times** and adjust timeouts
4. **Consider Redis** for job queue management
5. **Scale with multiple workers** if needed

## 📊 Expected Processing Times

| File Length | Processing Time | Requirements |
|-------------|----------------|--------------|
| 1-2 minutes | 30-60 seconds  | 2GB RAM      |
| 3-4 minutes | 1-2 minutes    | 4GB RAM      |
| 5+ minutes  | 3-5 minutes    | 8GB RAM      |

**Note**: First run may take longer as Spleeter downloads AI models (~100MB).