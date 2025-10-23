/**
 * Copyright (c) 2025 Joshua Hendricks Cole (DBA: Corporation of Light). All Rights Reserved. PATENT PENDING.
 *
 * Winston Logger Configuration
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDevelopment = process.env.NODE_ENV === 'development';

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let metaString = '';
        if (Object.keys(meta).length > 0) {
            metaString = JSON.stringify(meta, null, 2);
        }
        return `[${timestamp}] ${level.toUpperCase()}: ${message} ${metaString}`;
    })
);

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    format: logFormat,
    defaultMeta: { service: 'telescope-api' },
    transports: [
        // Error logs
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Combined logs
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/combined.log'),
            maxsize: 5242880,
            maxFiles: 5,
        }),
        // Console logs
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    let metaString = '';
                    if (Object.keys(meta).length > 0 && isDevelopment) {
                        metaString = '\n' + JSON.stringify(meta, null, 2);
                    }
                    return `[${timestamp}] ${level}: ${message}${metaString}`;
                })
            ),
        }),
    ],
});

export default logger;
