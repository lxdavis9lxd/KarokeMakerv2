#!/usr/bin/env python3
"""
Test script to verify LRC format generation
"""

def format_lrc_time(seconds):
    """Format time in MM:SS.XX format for LRC files"""
    minutes = int(seconds // 60)
    seconds = seconds % 60
    return f"{minutes:02d}:{seconds:05.2f}"

def test_lrc_generation():
    """Test LRC format generation"""
    
    # Sample data simulating Whisper output
    segments = [
        {"start": 10.5, "text": "Hello world this is a test"},
        {"start": 15.2, "text": "Of our karaoke system"},
        {"start": 20.8, "text": "With synchronized lyrics"},
        {"start": 25.1, "text": "In LRC format"}
    ]
    
    # Generate LRC format
    lrc_lines = []
    
    # Add LRC metadata
    lrc_lines.append("[ar:KarokeMaker v2]")
    lrc_lines.append("[ti:Test Song]")
    lrc_lines.append("[length:00:30.00]")
    lrc_lines.append("")
    
    for segment in segments:
        start_time = segment["start"]
        text = segment["text"]
        timestamp = format_lrc_time(start_time)
        lrc_lines.append(f"[{timestamp}]{text}")
    
    lrc_content = '\n'.join(lrc_lines)
    
    print("Generated LRC content:")
    print("=" * 50)
    print(lrc_content)
    print("=" * 50)
    
    return lrc_content

if __name__ == "__main__":
    test_lrc_generation()