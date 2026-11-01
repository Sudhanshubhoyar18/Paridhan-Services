import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error occurred.';

  // Log error with request context for support / CRM diagnosis
  logger.error(`${req.method} ${req.originalUrl || req.url} - ${message}`, {
    status: statusCode,
    ip: req.ip || req.headers['x-forwarded-for'],
    user: req.user ? { id: req.user.id, username: req.user.username } : 'unauthenticated',
    stack: err.stack,
    query: req.query,
    body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined
  });

  res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors || undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

export default errorHandler;
