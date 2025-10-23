/**
 * Copyright (c) 2025 Joshua Hendricks Cole (DBA: Corporation of Light). All Rights Reserved. PATENT PENDING.
 *
 * User Management Routes
 * All require authentication
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/connection.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * GET /user/profile
 * Get user profile
 */
router.get('/profile', asyncHandler(async (req, res) => {
    const result = await query(
        `SELECT id, email, first_name, last_name, tier, newsletter, created_at
         FROM users WHERE id = $1 AND deleted_at IS NULL`,
        [req.userId]
    );

    if (result.rows.length === 0) {
        throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
    }

    const user = result.rows[0];

    // Get subscription info
    const subResult = await query(
        `SELECT id, stripe_subscription_id, plan, status, current_period_end
         FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [req.userId]
    );

    const subscription = subResult.rows[0] || null;

    res.json({
        success: true,
        user: {
            userId: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            tier: user.tier,
            newsletter: user.newsletter,
            createdAt: user.created_at,
            subscription: subscription ? {
                plan: subscription.plan,
                status: subscription.status,
                expiresAt: subscription.current_period_end
            } : null
        }
    });
}));

/**
 * PATCH /user/profile
 * Update user profile
 */
router.patch('/profile', asyncHandler(async (req, res) => {
    const { firstName, lastName, newsletter, currentPassword, newPassword } = req.body;

    // Get current user
    const userResult = await query(
        'SELECT id, password_hash FROM users WHERE id = $1',
        [req.userId]
    );

    if (userResult.rows.length === 0) {
        throw new ApiError('User not found', 404);
    }

    const user = userResult.rows[0];

    // If changing password, verify current password
    if (newPassword) {
        if (!currentPassword) {
            throw new ApiError('Current password required', 400, 'MISSING_CURRENT_PASSWORD');
        }

        const match = await bcrypt.compare(currentPassword, user.password_hash);
        if (!match) {
            throw new ApiError('Invalid current password', 401, 'INVALID_PASSWORD');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [hashedPassword, req.userId]
        );
    }

    // Update other fields
    if (firstName !== undefined || lastName !== undefined || newsletter !== undefined) {
        await query(
            `UPDATE users SET
                first_name = COALESCE($1, first_name),
                last_name = COALESCE($2, last_name),
                newsletter = COALESCE($3, newsletter),
                updated_at = NOW()
             WHERE id = $4`,
            [firstName, lastName, newsletter, req.userId]
        );
    }

    res.json({
        success: true,
        message: 'Profile updated successfully'
    });
}));

/**
 * GET /user/predictions
 * Get user's prediction history
 */
router.get('/predictions', asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const tool = req.query.tool;

    let whereClause = 'WHERE user_id = $1';
    let params = [req.userId];

    if (tool) {
        whereClause += ' AND tool_name = $2';
        params.push(tool);
    }

    // Get total count
    const countResult = await query(
        `SELECT COUNT(*) as count FROM predictions ${whereClause}`,
        params
    );

    const total = parseInt(countResult.rows[0].count);

    // Get predictions
    const result = await query(
        `SELECT id, tool_name, prediction_data, confidence, created_at
         FROM predictions ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
    );

    const predictions = result.rows.map(row => ({
        predictionId: row.id,
        tool: row.tool_name,
        score: row.prediction_data.salaryProjection?.year5 || row.prediction_data.divorceRisk10yr || 0,
        confidence: row.confidence,
        createdAt: row.created_at
    }));

    res.json({
        success: true,
        predictions: predictions,
        total: total,
        limit: limit,
        offset: offset
    });
}));

/**
 * DELETE /user/account
 * Delete user account
 */
router.delete('/account', asyncHandler(async (req, res) => {
    const { password } = req.body;

    if (!password) {
        throw new ApiError('Password required to delete account', 400, 'MISSING_PASSWORD');
    }

    // Verify password
    const userResult = await query(
        'SELECT password_hash FROM users WHERE id = $1',
        [req.userId]
    );

    if (userResult.rows.length === 0) {
        throw new ApiError('User not found', 404);
    }

    const match = await bcrypt.compare(password, userResult.rows[0].password_hash);
    if (!match) {
        throw new ApiError('Invalid password', 401, 'INVALID_PASSWORD');
    }

    // Soft delete user (mark as deleted)
    await query(
        'UPDATE users SET deleted_at = NOW() WHERE id = $1',
        [req.userId]
    );

    // Also delete related data (or soft delete)
    await query(
        'DELETE FROM predictions WHERE user_id = $1',
        [req.userId]
    );

    await query(
        'DELETE FROM subscriptions WHERE user_id = $1',
        [req.userId]
    );

    res.json({
        success: true,
        message: 'Account deleted permanently'
    });
}));

export default router;
