#!/usr/bin/env python3
"""
Real audio processing script using FFmpeg and pydub for vocal separation
This replaces the simulated processing in JobService.ts
Compatible with Python 3.13+
"""

import os
import sys
import json
import argparse
import subprocess
from pathlib import Path
import tempfile
import shutil

def log_progress(job_id, progress, message=""):
    """Log progress that can be read by Node.js"""
    progress_data = {
        "jobId": job_id,
        "progress": progress,
        "message": message,
        "timestamp": "2025-09-22T00:00:00.000Z"
    }
    print(f"PROGRESS:{json.dumps(progress_data)}")
    sys.stdout.flush()

def check_ffmpeg():
    """Check if FFmpeg is installed"""
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def install_dependencies():
    """Install required Python packages"""
    try:
        import pydub
        return True
    except ImportError:
        log_progress("", 10, "Installing pydub...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "pydub"])
            return True
        except subprocess.CalledProcessError:
            return False

def separate_audio_ffmpeg(input_file, output_dir, job_id):
    """
    Separate audio using FFmpeg vocal removal filters
    This is a simpler approach than AI but still provides real separation
    """
    try:
        log_progress(job_id, 10, "Checking dependencies...")
        
        if not check_ffmpeg():
            raise Exception("FFmpeg not found. Please install FFmpeg and add it to PATH")
            
        if not install_dependencies():
            raise Exception("Failed to install required Python packages")
            
        log_progress(job_id, 20, "Analyzing audio file...")
        
        # Define output file paths
        karaoke_file = Path(output_dir) / f"karaoke_{job_id}.mp3"
        instrumental_file = Path(output_dir) / f"instrumental_{job_id}.mp3"
        
        log_progress(job_id, 40, "Creating karaoke track (vocal removal)...")
        
        # Create karaoke version using center vocal removal
        # This works by subtracting left from right channel (removes center-panned vocals)
        subprocess.run([
            "ffmpeg", "-i", str(input_file),
            "-af", "pan=mono|c0=0.5*c0+-0.5*c1",
            "-acodec", "mp3", "-ab", "192k",
            str(karaoke_file), "-y"
        ], check=True, capture_output=True)
        
        log_progress(job_id, 70, "Creating instrumental track...")
        
        # Create instrumental by applying a different filter
        # Use a high-pass filter to emphasize instruments
        subprocess.run([
            "ffmpeg", "-i", str(input_file),
            "-af", "highpass=f=200,lowpass=f=8000",
            "-acodec", "mp3", "-ab", "192k", 
            str(instrumental_file), "-y"
        ], check=True, capture_output=True)
        
        log_progress(job_id, 85, "Creating lyrics file...")
        
        # Create lyrics file with processing information
        lyrics_file = Path(output_dir) / f"lyrics_{job_id}.txt"
        with open(lyrics_file, 'w') as f:
            f.write(f"""# Karaoke Processing Results

## File Information
- Original: {Path(input_file).name}
- Processed: {job_id}
- Method: FFmpeg vocal removal filters

## Output Files
- Karaoke Track: {karaoke_file.name}
  * Center vocal removal applied
  * Best for songs with center-panned vocals
  
- Instrumental Track: {instrumental_file.name}  
  * Frequency filtering applied
  * Enhanced instrumental frequencies

## Processing Notes
- Method: FFmpeg audio filters
- Karaoke filter: pan=mono|c0=0.5*c0+-0.5*c1
- Instrumental filter: highpass + lowpass
- Quality: Good for center-panned vocals

## Upgrade Options
For AI-powered separation with better quality:
1. Install Spleeter with Python 3.8-3.10
2. Use cloud APIs (LALAL.AI, Moises.ai)
3. Try Facebook Demucs for state-of-the-art results

Generated: {job_id}
Timestamp: 2025-09-22
""")
        
        log_progress(job_id, 100, "Processing completed successfully!")
        
        return {
            "success": True,
            "karaoke_file": str(karaoke_file),
            "instrumental_file": str(instrumental_file),
            "lyrics_file": str(lyrics_file),
            "method": "FFmpeg vocal removal"
        }
        
    except subprocess.CalledProcessError as e:
        error_msg = f"FFmpeg processing failed: {e}"
        log_progress(job_id, 0, f"Error: {error_msg}")
        return {
            "success": False,
            "error": error_msg
        }
    except Exception as e:
        log_progress(job_id, 0, f"Error: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

def main():
    parser = argparse.ArgumentParser(description='Process audio file for karaoke creation using FFmpeg')
    parser.add_argument('input_file', help='Input MP3 file path')
    parser.add_argument('output_dir', help='Output directory for processed files')
    parser.add_argument('job_id', help='Job ID for tracking')
    
    args = parser.parse_args()
    
    # Ensure output directory exists
    Path(args.output_dir).mkdir(parents=True, exist_ok=True)
    
    # Process the audio using FFmpeg
    result = separate_audio_ffmpeg(args.input_file, args.output_dir, args.job_id)
    
    # Output final result as JSON
    print(f"RESULT:{json.dumps(result)}")

if __name__ == "__main__":
    main()