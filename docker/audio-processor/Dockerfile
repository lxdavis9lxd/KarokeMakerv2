FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download and install Spleeter models
RUN python -c "from spleeter.separator import Separator; Separator('spleeter:2stems-16kHz')"

# Install Whisper
RUN pip install openai-whisper

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/uploads /app/processed

EXPOSE 8000

CMD ["python", "processor.py"]