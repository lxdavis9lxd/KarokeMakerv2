#!/bin/bash

echo "🎵 Creating Test MP3 File"
echo "========================"

# Create a minimal test MP3 file with proper header
# This creates a very short, valid MP3 file for testing

cd /workspaces/KarokeMakerv2/test-files

# Remove old test file
rm -f test.mp3

# Create a minimal MP3 file header (ID3v2 + MPEG audio frame)
# This is a valid but very short MP3 file structure
printf '\xFF\xFB\x90\x00' > test.mp3
printf 'ID3\x03\x00\x00\x00\x00\x00\x00' >> test.mp3

echo "✅ Created minimal test MP3 file"
file test.mp3
ls -la test.mp3

echo ""
echo "🧪 Testing file upload with curl:"
cd /workspaces/KarokeMakerv2
curl -X POST http://localhost:3000/api/upload \
  -F "audio=@test-files/test.mp3" \
  -H "Origin: http://localhost:5174" | jq . || echo "Upload test failed"