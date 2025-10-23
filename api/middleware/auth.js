/**
 * Copyright (c) 2025 Joshua Hendricks Cole (DBA: Corporation of Light). All Rights Reserved. PATENT PENDING.
 *
 * JWT Authentication Middleware
 */

import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Generate JWT token
 */
export function generateToken(userId, expiresIn = '24h') {
    return jwt.sign(
        { userId },
        JWT_SECRET,
        { expiresIn }
    );
}

/**
 * Verify JWT token
 */
export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        logger.error('Token verification failed:', { error: error.message });
        return null;
    }
}

/**
 * Authenticate request with JWT token
 */
export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'MISSING_TOKEN',
                message: 'Missing authorization token'
            }
        });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'INVALID_TOKEN',
                message: 'Invalid or expired token'
            }
        });
    }

    req.userId = decoded.userId;
    next();
}

/**
 * Optional authentication (doesn't fail if no token)
 */
export function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
            req.userId = decoded.userId;
        }
    }

    next();
}

export default {
    generateToken,
    verifyToken,
    authenticateToken,
    optionalAuth
};
