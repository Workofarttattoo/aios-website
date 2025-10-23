/**
 * Copyright (c) 2025 Joshua Hendricks Cole (DBA: Corporation of Light). All Rights Reserved. PATENT PENDING.
 *
 * PostgreSQL Database Connection Management
 */

import pg from 'pg';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

const { Pool } = pg;

let pool = null;

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'telescope_suite',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

/**
 * Initialize database connection pool
 */
export async function initializeDatabase() {
    try {
        pool = new Pool(dbConfig);

        // Test the connection
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();

        logger.info('Database pool initialized successfully');

        // Create tables if they don't exist
        await createTables();

        return pool;
    } catch (error) {
        logger.error('Database initialization failed:', error);
        throw error;
    }
}

/**
 * Get database pool instance
 */
export function getPool() {
    return pool;
}

/**
 * Execute a query
 */
export async function query(text, params = []) {
    if (!pool) {
        throw new Error('Database pool not initialized');
    }

    try {
        const result = await pool.query(text, params);
        return result;
    } catch (error) {
        logger.error('Database query error:', { query: text, error });
        throw error;
    }
}

/**
 * Create database tables
 */
async function createTables() {
    const createTablesSQL = `
        -- Users table
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            tier VARCHAR(50) DEFAULT 'freemium',
            newsletter BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP
        );

        -- Predictions table
        CREATE TABLE IF NOT EXISTS predictions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            tool_name VARCHAR(100) NOT NULL,
            input_data JSONB NOT NULL,
            prediction_data JSONB NOT NULL,
            confidence FLOAT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Subscriptions table
        CREATE TABLE IF NOT EXISTS subscriptions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            stripe_subscription_id VARCHAR(255) UNIQUE,
            stripe_customer_id VARCHAR(255),
            plan VARCHAR(50) NOT NULL,
            status VARCHAR(50) NOT NULL,
            current_period_start TIMESTAMP,
            current_period_end TIMESTAMP,
            cancel_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Freemium usage table
        CREATE TABLE IF NOT EXISTS freemium_usage (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            predictions_used INT DEFAULT 0,
            reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '30 days',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Analytics events table
        CREATE TABLE IF NOT EXISTS analytics_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            event_name VARCHAR(100) NOT NULL,
            event_data JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- API keys table (for white-label partners)
        CREATE TABLE IF NOT EXISTS api_keys (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            partner_name VARCHAR(255) NOT NULL,
            api_key VARCHAR(255) UNIQUE NOT NULL,
            secret_key VARCHAR(255) NOT NULL,
            active BOOLEAN DEFAULT true,
            rate_limit INT DEFAULT 1000,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON predictions(user_id);
        CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at);
        CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
        CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id);
        CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at);
    `;

    try {
        const statements = createTablesSQL
            .split(';')
            .filter(stmt => stmt.trim().length > 0);

        for (const statement of statements) {
            await query(statement);
        }

        logger.info('Database tables created successfully');
    } catch (error) {
        logger.error('Error creating tables:', error);
        throw error;
    }
}

export default { initializeDatabase, getPool, query };
