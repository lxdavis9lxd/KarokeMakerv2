# KarokeMaker v2

A web application that converts MP3 files into karaoke-ready formats with vocal separation and synchronized lyrics.

## Project Structure

```
KarokeMakerv2/
├── frontend/          # React + Vite + TypeScript frontend
├── backend/           # Node.js + Express + TypeScript backend
├── docker/            # Docker configurations for services
├── docs/              # Documentation
├── karokemakerv2/     # Specification and planning files
└── README.md
```

## Features

- **MP3 Upload**: Drag-and-drop interface for audio file uploads
- **Vocal Separation**: AI-powered vocal removal using Spleeter/Demucs
- **Lyric Extraction**: Automatic speech-to-text with Whisper
- **Karaoke Generation**: Standard .lrc format with synchronized timing
- **Real-time Progress**: WebSocket updates during processing
- **Mobile-Ready**: Responsive design for all devices

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Redis (for job queue)

### Development Setup

1. **Clone and setup**
   ```bash
   git clone <repository-url>
   cd KarokeMakerv2
   npm run setup
   ```

2. **Start services**
   ```bash
   docker-compose up -d redis
   npm run dev
   ```

3. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

## Architecture

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript + BullMQ
- **Audio Processing**: Docker containers with Spleeter + Whisper
- **Queue System**: Redis + BullMQ for async processing
- **Real-time Updates**: WebSocket integration

## Development

See [Development Guide](docs/development.md) for detailed setup instructions.

## API Documentation

See [API Documentation](docs/api.md) for endpoint details.

## License

MIT License