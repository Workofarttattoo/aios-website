/**
 * Copyright (c) 2025 Joshua Hendricks Cole (DBA: Corporation of Light). All Rights Reserved. PATENT PENDING.
 *
 * Authentication Routes
 * POST /auth/signup - Register new user
 * POST /auth/login - Authenticate user
 * POST /auth/refresh - Refresh JWT token
 * POST /auth/logout - Logout user
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import Joi from 'joi';
import { query } from '../db/connection.js';
import { generateToken, verifyToken, authenticateToken } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Validation schemas
const signupSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().required(),
    lastName: Joi.string(),
    toolInterests: Joi.array().items(Joi.string())
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

/**
 * POST /auth/signup
 * Register new user account
 */
router.post('/signup', asyncHandler(async (req, res) => {
    // Validate request
    const { error, value } = signupSchema.validate(req.body);
    if (error) {
        throw new ApiError(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const { email, password, firstName, lastName = '', toolInterests = [] } = value;

    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
        throw new ApiError('Email already registered', 409, 'DUPLICATE_EMAIL');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await query(
        `INSERT INTO users (email, password_hash, first_name, last_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, first_name, tier, created_at`,
        [email, hashedPassword, firstName, lastName]
    );

    const user = result.rows[0];

    // Initialize freemium usage
    await query(
        'INSERT INTO freemium_usage (user_id, predictions_used) VALUES ($1, 0)',
        [user.id]
    );

    // Generate token
    const token = generateToken(user.id);

    logger.info('User registered successfully', { userId: user.id, email });

    res.status(201).json({
        success: true,
        userId: user.id,
        email: user.email,
        firstName: user.first_name,
        tier: user.tier,
        token: token,
        expiresIn: 86400
    });
}));

/**
 * POST /auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', asyncHandler(async (req, res) => {
    // Validate request
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
        throw new ApiError(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const { email, password } = value;

    // Find user
    const userResult = await query(
        'SELECT id, password_hash, first_name, tier FROM users WHERE email = $1 AND deleted_at IS NULL',
        [email]
    );

    if (userResult.rows.length === 0) {
        throw new ApiError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const user = userResult.rows[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
        throw new ApiError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Generate token
    const token = generateToken(user.id);

    logger.info('User logged in successfully', { userId: user.id, email });

    res.json({
        success: true,
        token: token,
        user: {
            userId: user.id,
            email: email,
            firstName: user.first_name,
            tier: user.tier
        },
        expiresIn: 86400
    });
}));

/**
 * POST /auth/refresh
 * Refresh JWT token
 */
router.post('/refresh', asyncHandler(async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        throw new ApiError('Missing token', 401, 'MISSING_TOKEN');
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        throw new ApiError('Invalid or expired token', 401, 'INVALID_TOKEN');
    }

    // Generate new token
    const newToken = generateToken(decoded.userId);

    res.json({
        success: true,
        token: newToken,
        expiresIn: 86400
    });
}));

/**
 * POST /auth/logout
 * Logout user (invalidate token on client side)
 */
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
    // Token invalidation happens on client side (delete localStorage)
    // In production, you might maintain a blacklist of revoked tokens

    logger.info('User logged out', { userId: req.userId });

    res.json({
        success: true,
        message: 'Logged out successfully'
    });
}));

export default router;
