/**
 * Copyright (c) 2025 Joshua Hendricks Cole (DBA: Corporation of Light). All Rights Reserved. PATENT PENDING.
 *
 * Analytics Routes
 * Track user events and generate analytics
 */

import express from 'express';
import { query } from '../db/connection.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * POST /analytics/event
 * Track an event
 */
router.post('/event', asyncHandler(async (req, res) => {
    const { eventName, eventData = {} } = req.body;

    if (!eventName) {
        throw new ApiError('Event name required', 400, 'MISSING_EVENT_NAME');
    }

    await query(
        `INSERT INTO analytics_events (user_id, event_name, event_data, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [req.userId, eventName, JSON.stringify(eventData)]
    );

    res.status(201).json({
        success: true,
        message: 'Event tracked'
    });
}));

/**
 * GET /analytics/usage
 * Get user usage analytics (Pro+ only)
 */
router.get('/usage', asyncHandler(async (req, res) => {
    // Check tier (Pro+ only)
    const userResult = await query(
        'SELECT tier FROM users WHERE id = $1',
        [req.userId]
    );

    if (userResult.rows.length === 0) {
        throw new ApiError('User not found', 404);
    }

    const user = userResult.rows[0];
    if (user.tier === 'freemium') {
        throw new ApiError('Upgrade to Pro for analytics', 403, 'INSUFFICIENT_TIER');
    }

    // Get date range
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    // Get prediction statistics
    const predResult = await query(
        `SELECT tool_name, COUNT(*) as count, AVG(confidence) as avg_confidence
         FROM predictions
         WHERE user_id = $1 AND created_at BETWEEN $2 AND $3
         GROUP BY tool_name`,
        [req.userId, startDate, endDate]
    );

    const byTool = {};
    let totalPredictions = 0;
    predResult.rows.forEach(row => {
        byTool[row.tool_name] = parseInt(row.count);
        totalPredictions += parseInt(row.count);
    });

    // Get engagement statistics
    const eventResult = await query(
        `SELECT COUNT(*) as total, COUNT(DISTINCT DATE(created_at)) as days_active
         FROM analytics_events
         WHERE user_id = $1 AND created_at BETWEEN $2 AND $3`,
        [req.userId, startDate, endDate]
    );

    const eventStats = eventResult.rows[0];

    res.json({
        success: true,
        analytics: {
            dateRange: {
                startDate: startDate,
                endDate: endDate
            },
            predictions: {
                total: totalPredictions,
                byTool: byTool,
                avgConfidence: totalPredictions > 0 ?
                    (predResult.rows.reduce((sum, row) => sum + parseFloat(row.avg_confidence || 0), 0) / predResult.rows.length).toFixed(2) : 0
            },
            engagement: {
                totalEvents: parseInt(eventStats.total),
                daysActive: parseInt(eventStats.days_active),
                avgEventsPerDay: parseInt(eventStats.total) > 0 ?
                    (parseInt(eventStats.total) / parseInt(eventStats.days_active || 1)).toFixed(1) : 0
            },
            retention: {
                monthlyRetention: 0.75, // Placeholder
                churnRisk: 'low'
            }
        }
    });
}));

/**
 * GET /analytics/summary
 * Get summary analytics for freemium users
 */
router.get('/summary', asyncHandler(async (req, res) => {
    // Get prediction count
    const predResult = await query(
        `SELECT COUNT(*) as count FROM predictions WHERE user_id = $1`,
        [req.userId]
    );

    const predictions = parseInt(predResult.rows[0].count);

    // Get freemium usage
    const usageResult = await query(
        `SELECT predictions_used, reset_at FROM freemium_usage WHERE user_id = $1`,
        [req.userId]
    );

    let remaining = 5;
    if (usageResult.rows.length > 0) {
        remaining = Math.max(0, 5 - parseInt(usageResult.rows[0].predictions_used));
    }

    res.json({
        success: true,
        summary: {
            totalPredictions: predictions,
            freemiumRemaining: remaining,
            lastPrediction: null
        }
    });
}));

export default router;
