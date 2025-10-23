/**
 * Copyright (c) 2025 Joshua Hendricks Cole (DBA: Corporation of Light). All Rights Reserved. PATENT PENDING.
 *
 * Telescope Suite API Server
 * Main Express application with all routes and middleware
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

import { initializeDatabase, getPool } from './db/connection.js';
import logger from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authenticateToken } from './middleware/auth.js';

// Import routes
import authRoutes from './routes/auth.js';
import predictionRoutes from './routes/predictions.js';
import userRoutes from './routes/users.js';
import subscriptionRoutes from './routes/subscriptions.js';
import analyticsRoutes from './routes/analytics.js';
import healthRoutes from './routes/health.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many authentication attempts, please try again later.'
});

app.use(limiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging and ID middleware
app.use((req, res, next) => {
    req.id = uuidv4();
    req.startTime = Date.now();

    // Log request
    logger.info(`${req.method} ${req.path}`, {
        requestId: req.id,
        ip: req.ip,
        userAgent: req.get('user-agent')
    });

    // Log response
    res.on('finish', () => {
        const duration = Date.now() - req.startTime;
        logger.info(`${req.method} ${req.path} - ${res.statusCode}`, {
            requestId: req.id,
            statusCode: res.statusCode,
            duration: `${duration}ms`
        });
    });

    next();
});

// Health check routes (no auth required)
app.use('/health', healthRoutes);

// API v1 routes
app.use('/api/v1/auth', strictLimiter, authRoutes);
app.use('/api/v1/predict', authenticateToken, predictionRoutes);
app.use('/api/v1/user', authenticateToken, userRoutes);
app.use('/api/v1/subscription', authenticateToken, subscriptionRoutes);
app.use('/api/v1/analytics', authenticateToken, analyticsRoutes);

// API documentation route
app.get('/api/v1/docs', (req, res) => {
    res.json({
        message: 'Telescope Suite API v1',
        version: '1.0.0',
        endpoints: {
            auth: '/api/v1/auth',
            predictions: '/api/v1/predict',
            user: '/api/v1/user',
            subscription: '/api/v1/subscription',
            analytics: '/api/v1/analytics',
            health: '/health'
        },
        documentation: 'https://api.aios.is/docs'
    });
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
    try {
        logger.info('Initializing database connection...');
        await initializeDatabase();
        logger.info('Database connection established');

        app.listen(PORT, () => {
            logger.info(`🚀 Telescope Suite API running on port ${PORT} in ${NODE_ENV} mode`);
            console.log(`\n✅ Server started successfully`);
            console.log(`📍 API: http://localhost:${PORT}`);
            console.log(`📚 Docs: http://localhost:${PORT}/api/v1/docs\n`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    const pool = getPool();
    if (pool) {
        await pool.end();
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...');
    const pool = getPool();
    if (pool) {
        await pool.end();
    }
    process.exit(0);
});

// Start the server
startServer();

export default app;
