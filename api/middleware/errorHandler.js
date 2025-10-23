/**
 * Copyright (c) 2025 Joshua Hendricks Cole (DBA: Corporation of Light). All Rights Reserved. PATENT PENDING.
 *
 * Error Handling Middleware
 */

import logger from '../utils/logger.js';

/**
 * Not found handler
 */
export function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.path} not found`
        },
        timestamp: new Date().toISOString()
    });
}

/**
 * Global error handler (must be last middleware)
 */
export function errorHandler(err, req, res, next) {
    logger.error('Unhandled error:', {
        message: err.message,
        stack: err.stack,
        requestId: req.id,
        path: req.path,
        method: req.method
    });

    // Determine status code
    let statusCode = err.statusCode || 500;
    let errorCode = err.code || 'INTERNAL_SERVER_ERROR';
    let message = err.message || 'An unexpected error occurred';

    // Handle specific error types
    if (err.name === 'ValidationError') {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
        message = err.details || message;
    } else if (err.name === 'UnauthorizedError') {
        statusCode = 401;
        errorCode = 'UNAUTHORIZED';
    } else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        errorCode = 'INVALID_TOKEN';
        message = 'Invalid authentication token';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        errorCode = 'TOKEN_EXPIRED';
        message = 'Authentication token has expired';
    } else if (err.code === '23505') {
        // PostgreSQL unique constraint violation
        statusCode = 409;
        errorCode = 'DUPLICATE_ENTRY';
        message = 'This record already exists';
    } else if (err.code === '23503') {
        // PostgreSQL foreign key violation
        statusCode = 400;
        errorCode = 'INVALID_REFERENCE';
        message = 'Referenced record does not exist';
    }

    // Don't expose stack trace in production
    const response = {
        success: false,
        error: {
            code: errorCode,
            message: message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        },
        timestamp: new Date().toISOString(),
        ...(req.id && { requestId: req.id })
    };

    res.status(statusCode).json(response);
}

/**
 * Async error wrapper
 */
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Custom error class
 */
export class ApiError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'ApiError';
    }
}

export default {
    errorHandler,
    notFoundHandler,
    asyncHandler,
    ApiError
};
