/**
 * Copyright (c) 2025 Joshua Hendricks Cole (DBA: Corporation of Light). All Rights Reserved. PATENT PENDING.
 *
 * Prediction Routes
 * All endpoints: POST /api/v1/predict/{tool}
 * All require authentication
 */

import express from 'express';
import Joi from 'joi';
import { query } from '../db/connection.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import * as PredictionService from '../services/predictions.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Check freemium prediction quota
async function checkFreemiumQuota(userId) {
    const userResult = await query('SELECT tier FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) throw new ApiError('User not found', 404);

    const user = userResult.rows[0];
    if (user.tier === 'pro' || user.tier === 'premium' || user.tier === 'enterprise') {
        return true; // Unlimited
    }

    // Check freemium usage
    const usageResult = await query(
        'SELECT predictions_used, reset_at FROM freemium_usage WHERE user_id = $1',
        [userId]
    );

    if (usageResult.rows.length === 0) {
        // First time, create entry
        await query(
            'INSERT INTO freemium_usage (user_id, predictions_used, reset_at) VALUES ($1, 0, NOW() + INTERVAL \'30 days\')',
            [userId]
        );
        return true;
    }

    const usage = usageResult.rows[0];
    const now = new Date();
    const resetAt = new Date(usage.reset_at);

    // Reset if period passed
    if (now > resetAt) {
        await query(
            'UPDATE freemium_usage SET predictions_used = 0, reset_at = $1 WHERE user_id = $2',
            [new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), userId]
        );
        return true;
    }

    // Check quota (5 per month)
    if (usage.predictions_used >= 5) {
        throw new ApiError('Prediction quota exceeded. Upgrade to Pro for unlimited.', 429, 'QUOTA_EXCEEDED');
    }

    return true;
}

// Increment freemium counter
async function incrementFreemiumUsage(userId) {
    await query(
        'UPDATE freemium_usage SET predictions_used = predictions_used + 1 WHERE user_id = $1',
        [userId]
    );
}

/**
 * POST /predict/career
 */
router.post('/career', asyncHandler(async (req, res) => {
    await checkFreemiumQuota(req.userId);

    const schema = Joi.object({
        salary: Joi.number().positive(),
        title: Joi.string(),
        level: Joi.string(),
        industry: Joi.string(),
        location: Joi.string(),
        yearsExperience: Joi.number().min(0),
        jobSatisfaction: Joi.number().min(0).max(10),
        commitment: Joi.number().min(0).max(10),
        marketDemand: Joi.number().min(0).max(10)
    });

    const { error, value } = schema.validate(req.body);
    if (error) throw new ApiError(error.details[0].message, 400, 'VALIDATION_ERROR');

    const prediction = PredictionService.predictCareer(value);

    // Store prediction
    await query(
        `INSERT INTO predictions (user_id, tool_name, input_data, prediction_data, confidence)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.userId, 'career', JSON.stringify(value), JSON.stringify(prediction), prediction.confidence]
    );

    // Increment freemium if applicable
    await incrementFreemiumUsage(req.userId);

    res.status(201).json({
        success: true,
        prediction: prediction,
        timestamp: new Date().toISOString()
    });
}));

/**
 * POST /predict/relationship
 */
router.post('/relationship', asyncHandler(async (req, res) => {
    await checkFreemiumQuota(req.userId);

    const schema = Joi.object({
        married: Joi.boolean(),
        yearsTogether: Joi.number().min(0),
        communication: Joi.number().min(0).max(10),
        conflict: Joi.number().min(0).max(10),
        intimacy: Joi.number().min(0).max(10),
        financialStability: Joi.number().min(0).max(10),
        infidelity: Joi.string().valid('none', 'suspected', 'confirmed'),
        children: Joi.boolean()
    });

    const { error, value } = schema.validate(req.body);
    if (error) throw new ApiError(error.details[0].message, 400, 'VALIDATION_ERROR');

    const prediction = PredictionService.predictRelationship(value);

    await query(
        `INSERT INTO predictions (user_id, tool_name, input_data, prediction_data, confidence)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.userId, 'relationship', JSON.stringify(value), JSON.stringify(prediction), prediction.confidence]
    );

    await incrementFreemiumUsage(req.userId);

    res.status(201).json({
        success: true,
        prediction: prediction,
        timestamp: new Date().toISOString()
    });
}));

/**
 * POST /predict/health
 */
router.post('/health', asyncHandler(async (req, res) => {
    await checkFreemiumQuota(req.userId);

    const prediction = PredictionService.predictHealth(req.body);

    await query(
        `INSERT INTO predictions (user_id, tool_name, input_data, prediction_data, confidence)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.userId, 'health', JSON.stringify(req.body), JSON.stringify(prediction), prediction.confidence]
    );

    await incrementFreemiumUsage(req.userId);

    res.status(201).json({
        success: true,
        prediction: prediction,
        timestamp: new Date().toISOString()
    });
}));

/**
 * POST /predict/realestate
 */
router.post('/realestate', asyncHandler(async (req, res) => {
    await checkFreemiumQuota(req.userId);

    const prediction = PredictionService.predictRealEstate(req.body);

    await query(
        `INSERT INTO predictions (user_id, tool_name, input_data, prediction_data, confidence)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.userId, 'realestate', JSON.stringify(req.body), JSON.stringify(prediction), prediction.confidence]
    );

    await incrementFreemiumUsage(req.userId);

    res.status(201).json({
        success: true,
        prediction: prediction,
        timestamp: new Date().toISOString()
    });
}));

/**
 * POST /predict/startup
 */
router.post('/startup', asyncHandler(async (req, res) => {
    await checkFreemiumQuota(req.userId);

    const prediction = PredictionService.predictStartup(req.body);

    await query(
        `INSERT INTO predictions (user_id, tool_name, input_data, prediction_data, confidence)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.userId, 'startup', JSON.stringify(req.body), JSON.stringify(prediction), prediction.confidence]
    );

    await incrementFreemiumUsage(req.userId);

    res.status(201).json({
        success: true,
        prediction: prediction,
        timestamp: new Date().toISOString()
    });
}));

/**
 * POST /predict/skills
 */
router.post('/skills', asyncHandler(async (req, res) => {
    await checkFreemiumQuota(req.userId);

    const prediction = PredictionService.predictSkillDemand(req.body);

    await query(
        `INSERT INTO predictions (user_id, tool_name, input_data, prediction_data, confidence)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.userId, 'skills', JSON.stringify(req.body), JSON.stringify(prediction), prediction.confidence]
    );

    await incrementFreemiumUsage(req.userId);

    res.status(201).json({
        success: true,
        prediction: prediction,
        timestamp: new Date().toISOString()
    });
}));

/**
 * POST /predict/education
 */
router.post('/education', asyncHandler(async (req, res) => {
    await checkFreemiumQuota(req.userId);

    const prediction = PredictionService.predictEducationROI(req.body);

    await query(
        `INSERT INTO predictions (user_id, tool_name, input_data, prediction_data, confidence)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.userId, 'education', JSON.stringify(req.body), JSON.stringify(prediction), prediction.confidence]
    );

    await incrementFreemiumUsage(req.userId);

    res.status(201).json({
        success: true,
        prediction: prediction,
        timestamp: new Date().toISOString()
    });
}));

/**
 * POST /predict/geographic
 */
router.post('/geographic', asyncHandler(async (req, res) => {
    await checkFreemiumQuota(req.userId);

    const prediction = PredictionService.predictGeographic(req.body);

    await query(
        `INSERT INTO predictions (user_id, tool_name, input_data, prediction_data, confidence)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.userId, 'geographic', JSON.stringify(req.body), JSON.stringify(prediction), prediction.confidence]
    );

    await incrementFreemiumUsage(req.userId);

    res.status(201).json({
        success: true,
        prediction: prediction,
        timestamp: new Date().toISOString()
    });
}));

/**
 * POST /predict/sideproject
 */
router.post('/sideproject', asyncHandler(async (req, res) => {
    await checkFreemiumQuota(req.userId);

    const prediction = PredictionService.predictSideProject(req.body);

    await query(
        `INSERT INTO predictions (user_id, tool_name, input_data, prediction_data, confidence)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.userId, 'sideproject', JSON.stringify(req.body), JSON.stringify(prediction), prediction.confidence]
    );

    await incrementFreemiumUsage(req.userId);

    res.status(201).json({
        success: true,
        prediction: prediction,
        timestamp: new Date().toISOString()
    });
}));

/**
 * POST /predict/divorce
 */
router.post('/divorce', asyncHandler(async (req, res) => {
    await checkFreemiumQuota(req.userId);

    const prediction = PredictionService.predictDivorceRisk(req.body);

    await query(
        `INSERT INTO predictions (user_id, tool_name, input_data, prediction_data, confidence)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.userId, 'divorce', JSON.stringify(req.body), JSON.stringify(prediction), prediction.confidence]
    );

    await incrementFreemiumUsage(req.userId);

    res.status(201).json({
        success: true,
        prediction: prediction,
        timestamp: new Date().toISOString()
    });
}));

export default router;
