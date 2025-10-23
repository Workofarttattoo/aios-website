/**
 * Copyright (c) 2025 Joshua Hendricks Cole (DBA: Corporation of Light). All Rights Reserved. PATENT PENDING.
 *
 * Subscription & Payment Routes
 * All require authentication
 */

import express from 'express';
import Stripe from 'stripe';
import { query } from '../db/connection.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * POST /subscription/upgrade
 * Upgrade freemium to Pro tier
 */
router.post('/upgrade', asyncHandler(async (req, res) => {
    const { plan = 'monthly', paymentMethodId } = req.body;

    if (!paymentMethodId) {
        throw new ApiError('Payment method required', 400, 'MISSING_PAYMENT_METHOD');
    }

    // Get user
    const userResult = await query(
        'SELECT id, email FROM users WHERE id = $1',
        [req.userId]
    );

    if (userResult.rows.length === 0) {
        throw new ApiError('User not found', 404);
    }

    const user = userResult.rows[0];

    // Create Stripe customer if not exists
    let stripeCustomerId = null;
    const existingSub = await query(
        'SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1 LIMIT 1',
        [req.userId]
    );

    if (existingSub.rows.length > 0 && existingSub.rows[0].stripe_customer_id) {
        stripeCustomerId = existingSub.rows[0].stripe_customer_id;
    } else {
        const customer = await stripe.customers.create({
            email: user.email,
            metadata: { userId: req.userId }
        });
        stripeCustomerId = customer.id;
    }

    // Create subscription
    const priceId = plan === 'monthly' ? process.env.STRIPE_PRICE_MONTHLY : process.env.STRIPE_PRICE_ANNUAL;

    const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: priceId }],
        payment_settings: {
            save_default_payment_method: 'on_subscription'
        },
        expand: ['latest_invoice.payment_intent']
    });

    // Save to database
    await query(
        `INSERT INTO subscriptions (user_id, stripe_subscription_id, stripe_customer_id, plan, status, current_period_start, current_period_end)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
            req.userId,
            subscription.id,
            stripeCustomerId,
            plan,
            subscription.status,
            new Date(subscription.current_period_start * 1000),
            new Date(subscription.current_period_end * 1000)
        ]
    );

    // Update user tier
    await query(
        'UPDATE users SET tier = $1 WHERE id = $2',
        ['pro', req.userId]
    );

    logger.info('User upgraded to Pro', { userId: req.userId, subscriptionId: subscription.id });

    res.status(201).json({
        success: true,
        subscriptionId: subscription.id,
        tier: 'pro',
        status: subscription.status,
        expiresAt: new Date(subscription.current_period_end * 1000)
    });
}));

/**
 * GET /subscription/status
 * Get subscription status
 */
router.get('/status', asyncHandler(async (req, res) => {
    const result = await query(
        `SELECT id, stripe_subscription_id, plan, status, current_period_end, cancel_at
         FROM subscriptions WHERE user_id = $1
         ORDER BY created_at DESC LIMIT 1`,
        [req.userId]
    );

    if (result.rows.length === 0) {
        return res.json({
            success: true,
            subscription: null,
            tier: 'freemium'
        });
    }

    const sub = result.rows[0];

    res.json({
        success: true,
        subscription: {
            id: sub.id,
            stripeId: sub.stripe_subscription_id,
            plan: sub.plan,
            status: sub.status,
            expiresAt: sub.current_period_end,
            canceledAt: sub.cancel_at
        }
    });
}));

/**
 * POST /subscription/cancel
 * Cancel subscription
 */
router.post('/cancel', asyncHandler(async (req, res) => {
    const { reason = 'user_requested' } = req.body;

    // Get subscription
    const result = await query(
        'SELECT stripe_subscription_id FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [req.userId]
    );

    if (result.rows.length === 0) {
        throw new ApiError('No active subscription', 404, 'NO_SUBSCRIPTION');
    }

    const subscriptionId = result.rows[0].stripe_subscription_id;

    // Cancel with Stripe
    const canceled = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
    });

    // Update database
    await query(
        `UPDATE subscriptions SET cancel_at = $1 WHERE stripe_subscription_id = $2`,
        [new Date(canceled.cancel_at * 1000), subscriptionId]
    );

    // Update user tier back to freemium
    await query(
        'UPDATE users SET tier = $1 WHERE id = $2',
        ['freemium', req.userId]
    );

    logger.info('Subscription canceled', { userId: req.userId, subscriptionId });

    res.json({
        success: true,
        message: 'Subscription canceled',
        tier: 'freemium',
        accessUntil: new Date(canceled.current_period_end * 1000)
    });
}));

/**
 * POST /subscription/webhook
 * Handle Stripe webhooks
 */
router.post('/webhook', asyncHandler(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (error) {
        throw new ApiError('Webhook signature verification failed', 400, 'INVALID_SIGNATURE');
    }

    // Handle events
    switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
            const subscription = event.data.object;
            await query(
                `UPDATE subscriptions SET status = $1, current_period_start = $2, current_period_end = $3
                 WHERE stripe_subscription_id = $4`,
                [
                    subscription.status,
                    new Date(subscription.current_period_start * 1000),
                    new Date(subscription.current_period_end * 1000),
                    subscription.id
                ]
            );
            break;

        case 'customer.subscription.deleted':
            const canceled = event.data.object;
            await query(
                'UPDATE subscriptions SET status = $1 WHERE stripe_subscription_id = $2',
                ['canceled', canceled.id]
            );
            break;

        case 'invoice.payment_failed':
            logger.warn('Payment failed', { subscriptionId: event.data.object.subscription });
            break;
    }

    res.json({ received: true });
}));

export default router;
