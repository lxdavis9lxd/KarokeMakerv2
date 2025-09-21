import os
import time
import redis
import json
import whisper
import librosa
import soundfile as sf
from spleeter.separator import Separator
from celery import Celery
import tempfile
import shutil
from pathlib import Path

# Initialize Redis connection
redis_client = redis.Redis(host='redis', port=6379, decode_responses=True)

# Initialize Celery
app = Celery('audio_processor', broker='redis://redis:6379/0')

# Initialize audio processing models
separator = Separator('spleeter:2stems-16kHz')
whisper_model = whisper.load_model("base")

@app.task
def process_audio_file(job_id, file_path):
    """
    Process an audio file: separate vocals and extract lyrics
    """
    try:
        # Update job status
        update_job_status(job_id, 'processing', 10)
        
        # Load audio file
        audio, sample_rate = librosa.load(file_path, sr=16000)
        
        # Separate vocals using Spleeter
        update_job_status(job_id, 'separating_vocals', 30)
        separated_audio = separator.separate(audio)
        
        # Save instrumental track
        instrumental = separated_audio['accompaniment']
        instrumental_path = f"/app/processed/{job_id}_instrumental.wav"
        sf.write(instrumental_path, instrumental, sample_rate)
        
        # Extract vocals for transcription
        vocals = separated_audio['vocals']
        vocals_path = f"/app/processed/{job_id}_vocals.wav"
        sf.write(vocals_path, vocals, sample_rate)
        
        # Extract lyrics using Whisper
        update_job_status(job_id, 'extracting_lyrics', 70)
        result = whisper_model.transcribe(vocals_path, word_timestamps=True)
        
        # Generate LRC file
        update_job_status(job_id, 'generating_lrc', 90)
        lrc_content = generate_lrc(result)
        lrc_path = f"/app/processed/{job_id}_lyrics.lrc"
        
        with open(lrc_path, 'w', encoding='utf-8') as f:
            f.write(lrc_content)
        
        # Update job as completed
        result_data = {
            'instrumental_path': instrumental_path,
            'lyrics_path': lrc_path,
            'original_vocals_path': vocals_path
        }
        
        update_job_status(job_id, 'completed', 100, result_data)
        
        # Clean up temporary files
        os.remove(vocals_path)
        
        return result_data
        
    except Exception as e:
        update_job_status(job_id, 'failed', 0, {'error': str(e)})
        raise

def update_job_status(job_id, status, progress, data=None):
    """Update job status in Redis"""
    job_data = {
        'status': status,
        'progress': progress,
        'updated_at': str(time.time())
    }
    
    if data:
        job_data['data'] = data
    
    redis_client.hset(f"job:{job_id}", mapping=job_data)

def generate_lrc(transcription_result):
    """Generate LRC format from Whisper transcription"""
    lrc_lines = []
    
    # Add metadata
    lrc_lines.append("[ar:KarokeMaker v2]")
    lrc_lines.append("[ti:Generated Karaoke]")
    lrc_lines.append("[length:{}]".format(
        format_time(transcription_result.get('duration', 0))
    ))
    lrc_lines.append("")
    
    # Add lyrics with timestamps
    for segment in transcription_result.get('segments', []):
        start_time = segment['start']
        text = segment['text'].strip()
        
        if text:
            timestamp = format_time(start_time)
            lrc_lines.append(f"[{timestamp}]{text}")
    
    return '\n'.join(lrc_lines)

def format_time(seconds):
    """Format time in MM:SS.XX format for LRC"""
    minutes = int(seconds // 60)
    seconds = seconds % 60
    return f"{minutes:02d}:{seconds:05.2f}"

if __name__ == '__main__':
    app.worker_main()