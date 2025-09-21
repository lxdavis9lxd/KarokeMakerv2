# Development Guide - KarokeMaker v2

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Git

### Initial Setup

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd KarokeMakerv2
   npm run setup
   ```

2. **Start development services**
   ```bash
   # Start Redis (required for job queue)
   docker-compose up -d redis
   
   # Start development servers
   npm run dev
   ```

3. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - API Documentation: http://localhost:3000/api

## Project Structure

```
KarokeMakerv2/
├── frontend/                 # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API clients
│   │   ├── hooks/           # Custom React hooks
│   │   └── pages/           # Page components
│   ├── public/              # Static assets
│   └── package.json
├── backend/                  # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── models/          # Data models and types
│   │   ├── services/        # Business logic
│   │   ├── routes/          # API endpoints
│   │   ├── middleware/      # Express middleware
│   │   └── websocket/       # WebSocket server
│   ├── dist/                # Compiled JavaScript
│   └── package.json
├── docker/                   # Docker configurations
│   └── audio-processor/     # Python service for audio processing
├── docs/                     # Documentation
├── uploads/                  # Temporary file uploads
├── processed/                # Processed karaoke files
└── docker-compose.yml       # Development services
```

## Development Workflow

### Backend Development

1. **Start the backend in development mode**
   ```bash
   cd backend
   npm run dev
   ```

2. **Build for production**
   ```bash
   cd backend
   npm run build
   npm start
   ```

3. **Available scripts**
   - `npm run dev` - Start with hot reload
   - `npm run build` - Compile TypeScript
   - `npm start` - Start production server

### Frontend Development

1. **Start the frontend development server**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Build for production**
   ```bash
   cd frontend
   npm run build
   npm run preview
   ```

### Adding New Features

1. **API Endpoints**
   - Add route files in `backend/src/routes/`
   - Register routes in `backend/src/server.ts`
   - Add corresponding types in `backend/src/models/`

2. **Frontend Components**
   - Create components in `frontend/src/components/`
   - Add pages in `frontend/src/pages/`
   - Use TypeScript for type safety

3. **Database Models**
   - Add model interfaces in `backend/src/models/`
   - Implement service logic in `backend/src/services/`

## Testing

### Backend Testing
```bash
cd backend
npm test
```

### Frontend Testing
```bash
cd frontend
npm test
```

### Integration Testing
```bash
npm run test:integration
```

## Docker Development

### Building Services
```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build backend
```

### Running with Docker
```bash
# Start all services
docker-compose up

# Start specific services
docker-compose up redis backend
```

## Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
MAX_FILE_SIZE=52428800
UPLOAD_DIR=./uploads
PROCESSING_TIMEOUT=900000
JWT_SECRET=your-jwt-secret-here
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

## Common Development Tasks

### Adding a New API Endpoint

1. **Create the route file**
   ```typescript
   // backend/src/routes/newFeature.ts
   import { Router } from 'express';
   
   const router = Router();
   
   router.get('/new-endpoint', (req, res) => {
     res.json({ message: 'New feature' });
   });
   
   export { router as newFeatureRouter };
   ```

2. **Register in server.ts**
   ```typescript
   import { newFeatureRouter } from './routes/newFeature';
   app.use('/api', newFeatureRouter);
   ```

### Adding a New React Component

1. **Create component file**
   ```typescript
   // frontend/src/components/NewComponent.tsx
   interface Props {
     title: string;
   }
   
   export function NewComponent({ title }: Props) {
     return <div>{title}</div>;
   }
   ```

2. **Use in pages**
   ```typescript
   import { NewComponent } from '../components/NewComponent';
   
   function Page() {
     return <NewComponent title="Hello" />;
   }
   ```

## Debugging

### Backend Debugging
```bash
# Enable debug logging
DEBUG=karaoke:* npm run dev

# Check logs
tail -f logs/app.log
```

### Frontend Debugging
- Use browser DevTools
- Enable React DevTools extension
- Check Network tab for API calls

### Redis Debugging
```bash
# Connect to Redis CLI
docker exec -it karokemakerv2-redis-1 redis-cli

# Check job queue
redis-cli KEYS "job:*"
```

## Performance Monitoring

### Backend Metrics
- Monitor `/health` endpoint
- Check Redis queue status at `/api/jobs/queue/status`
- Use `docker stats` for container metrics

### Frontend Performance
- Use Lighthouse for performance audits
- Monitor bundle size with `npm run analyze`
- Check Core Web Vitals in DevTools

## Troubleshooting

### Common Issues

1. **"Redis connection failed"**
   - Ensure Redis container is running: `docker ps`
   - Check Redis logs: `docker logs karokemakerv2-redis-1`

2. **"File upload fails"**
   - Check upload directory permissions
   - Verify file size limits in configuration
   - Check available disk space

3. **"Audio processing timeout"**
   - Increase PROCESSING_TIMEOUT in environment
   - Check Docker container resources
   - Monitor audio-processor logs

### Getting Help

1. Check the logs first
2. Verify environment configuration
3. Test with minimal examples
4. Check Docker container status
5. Review API documentation