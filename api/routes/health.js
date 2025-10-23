/**
 * Copyright (c) 2025 Joshua Hendricks Cole (DBA: Corporation of Light). All Rights Reserved. PATENT PENDING.
 *
 * Health Check Routes
 * No authentication required
 */

import express from 'express';
import { getPool } from '../db/connection.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /health
 * Basic health check
 */
router.get('/', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
    });
});

/**
 * GET /health/ready
 * Readiness check (includes database)
 */
router.get('/ready', async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.query('SELECT NOW()');

        if (result.rows.length > 0) {
            return res.json({
                ready: true,
                database: 'connected',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        logger.error('Health check failed:', error);
        return res.status(503).json({
            ready: false,
            database: 'disconnected',
            error: error.message
        });
    }
});

/**
 * GET /health/live
 * Liveness check
 */
router.get('/live', (req, res) => {
    res.json({
        alive: true,
        timestamp: new Date().toISOString()
    });
});

export default router;
