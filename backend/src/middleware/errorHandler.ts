import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', error);

  // Multer errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({
      error: 'File too large',
      message: 'File size exceeds 50MB limit',
      code: 'FILE_TOO_LARGE',
    });
    return;
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    res.status(400).json({
      error: 'Invalid file',
      message: 'Unexpected file field',
      code: 'INVALID_FILE_FIELD',
    });
    return;
  }

  // Validation errors
  if (error.message.includes('Only MP3 files are allowed')) {
    res.status(400).json({
      error: 'Invalid file type',
      message: 'Only MP3 files are supported',
      code: 'INVALID_FILE_TYPE',
    });
    return;
  }

  // Default error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal server error' : error.name || 'Error',
    message,
    code: error.code || 'UNKNOWN_ERROR',
  });
};