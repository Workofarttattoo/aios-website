/**
 * Copyright (c) 2025 Joshua Hendricks Cole (DBA: Corporation of Light). All Rights Reserved. PATENT PENDING.
 *
 * Google Analytics 4 Setup for Telescope Suite
 *
 * This file initializes and configures Google Analytics 4 event tracking
 * across all Telescope Suite tools and features.
 *
 * Usage: Include this script in all HTML files
 * <script async src="https://www.googletagmanager.com/gtag/js?id=YOUR_GA_ID"></script>
 * <script src="analytics-setup.js"></script>
 */

// Initialize Google Analytics 4
window.dataLayer = window.dataLayer || [];

function gtag() {
    dataLayer.push(arguments);
}

gtag('js', new Date());
gtag('config', 'YOUR_GA_MEASUREMENT_ID_HERE', {
    'page_path': window.location.pathname,
    'anonymize_ip': true,
    'cookie_flags': 'SameSite=None;Secure'
});

/**
 * Event Tracking Module
 * Provides centralized event tracking across all Telescope tools
 */
const TelescopeAnalytics = {

    /**
     * User & Account Events
     */
    trackEmailSignup: (toolInterest = null) => {
        gtag('event', 'email_signup', {
            'tool_interest': toolInterest || 'general',
            'timestamp': new Date().toISOString(),
            'page_location': window.location.href
        });
    },

    trackAccountCreated: (userSegment = null) => {
        gtag('event', 'sign_up', {
            'method': 'freemium',
            'user_segment': userSegment || 'unknown',
            'timestamp': new Date().toISOString()
        });
    },

    trackProUpgrade: (plan = 'monthly', toolsUsed = []) => {
        gtag('event', 'purchase', {
            'currency': 'USD',
            'value': plan === 'monthly' ? 19 : 228,
            'items': [{
                'item_name': 'Telescope Suite Pro',
                'item_category': 'subscription',
                'item_variant': plan,
                'quantity': 1,
                'price': plan === 'monthly' ? 19 : 228
            }],
            'plan_type': plan,
            'tools_used': toolsUsed.join(','),
            'timestamp': new Date().toISOString()
        });
    },

    trackSubscriptionCancellation: (reason = null) => {
        gtag('event', 'refund', {
            'currency': 'USD',
            'value': 19,
            'reason': reason || 'user_requested',
            'timestamp': new Date().toISOString()
        });
    },

    /**
     * Prediction & Tool Events
     */
    trackPredictionStarted: (toolName) => {
        gtag('event', 'prediction_started', {
            'tool_name': toolName,
            'timestamp': new Date().toISOString(),
            'page_location': window.location.href
        });
    },

    trackPredictionCompleted: (toolName, score = null, confidence = null) => {
        gtag('event', 'prediction_completed', {
            'tool_name': toolName,
            'score': score || 0,
            'confidence': confidence || 0,
            'timestamp': new Date().toISOString(),
            'page_location': window.location.href
        });
    },

    trackPredictionShared: (toolName, platform = 'unknown') => {
        gtag('event', 'prediction_shared', {
            'tool_name': toolName,
            'platform': platform,
            'timestamp': new Date().toISOString()
        });
    },

    trackPredictionSaved: (toolName) => {
        gtag('event', 'prediction_saved', {
            'tool_name': toolName,
            'timestamp': new Date().toISOString()
        });
    },

    trackToolViewed: (toolName) => {
        gtag('event', 'page_view', {
            'page_title': `Telescope - ${toolName}`,
            'tool_name': toolName,
            'page_location': window.location.href
        });
    },

    /**
     * Engagement Events
     */
    trackFeatureUsed: (featureName, toolName = null) => {
        gtag('event', 'feature_used', {
            'feature_name': featureName,
            'tool_name': toolName || 'general',
            'timestamp': new Date().toISOString()
        });
    },

    trackTutorialViewed: (toolName) => {
        gtag('event', 'tutorial_viewed', {
            'tool_name': toolName,
            'timestamp': new Date().toISOString()
        });
    },

    trackSettingsChanged: (settingName, newValue) => {
        gtag('event', 'settings_changed', {
            'setting_name': settingName,
            'new_value': newValue,
            'timestamp': new Date().toISOString()
        });
    },

    trackFeedbackSubmitted: (rating, toolName = null) => {
        gtag('event', 'feedback_submitted', {
            'rating': rating,
            'tool_name': toolName || 'general',
            'timestamp': new Date().toISOString()
        });
    },

    /**
     * Performance Events
     */
    trackPerformanceMetric: (metricName, value) => {
        gtag('event', 'performance_metric', {
            'metric_name': metricName,
            'value': value,
            'timestamp': new Date().toISOString()
        });
    },

    trackPageLoadTime: (pageTitle, loadTimeMs) => {
        gtag('event', 'page_load_time', {
            'page_title': pageTitle,
            'load_time_ms': loadTimeMs,
            'timestamp': new Date().toISOString()
        });
    },

    /**
     * Error & Exception Events
     */
    trackError: (errorMessage, toolName = null) => {
        gtag('event', 'exception', {
            'description': errorMessage,
            'tool_name': toolName || 'unknown',
            'fatal': false,
            'timestamp': new Date().toISOString()
        });
    },

    /**
     * Content & Discovery Events
     */
    trackContentViewed: (contentType, contentId, contentTitle = null) => {
        gtag('event', 'view_item', {
            'items': [{
                'item_id': contentId,
                'item_name': contentTitle || contentId,
                'item_category': contentType
            }],
            'timestamp': new Date().toISOString()
        });
    },

    trackBlogPostViewed: (postTitle, postId = null) => {
        gtag('event', 'view_item', {
            'items': [{
                'item_id': postId || postTitle,
                'item_name': postTitle,
                'item_category': 'blog'
            }],
            'timestamp': new Date().toISOString()
        });
    },

    trackSearchPerformed: (searchQuery, resultsCount = null) => {
        gtag('event', 'search', {
            'search_term': searchQuery,
            'results_count': resultsCount || 0,
            'timestamp': new Date().toISOString()
        });
    },

    /**
     * Cohort & Segmentation Events
     */
    trackUserSegment: (segmentName, segmentValue) => {
        gtag('config', 'YOUR_GA_MEASUREMENT_ID_HERE', {
            'user_segment': segmentName,
            'user_segment_value': segmentValue
        });
    },

    /**
     * Campaign & Attribution Events
     */
    trackCampaignClick: (campaignSource, campaignMedium, campaignName = null) => {
        gtag('event', 'view_promotion', {
            'promotion_id': campaignName || 'direct',
            'promotion_name': campaignName || 'organic',
            'promotion_source': campaignSource,
            'timestamp': new Date().toISOString()
        });

        gtag('config', 'YOUR_GA_MEASUREMENT_ID_HERE', {
            'utm_source': campaignSource,
            'utm_medium': campaignMedium,
            'utm_campaign': campaignName || 'organic'
        });
    },

    /**
     * Commerce Events
     */
    trackAddToCart: (itemName, itemPrice, itemCategory = null) => {
        gtag('event', 'add_to_cart', {
            'currency': 'USD',
            'items': [{
                'item_id': itemName.toLowerCase().replace(/\s+/g, '_'),
                'item_name': itemName,
                'item_category': itemCategory || 'subscription',
                'price': itemPrice
            ]],
            'timestamp': new Date().toISOString()
        });
    },

    trackBeginCheckout: (plan = 'monthly') => {
        const itemPrice = plan === 'monthly' ? 19 : 228;
        gtag('event', 'begin_checkout', {
            'currency': 'USD',
            'value': itemPrice,
            'items': [{
                'item_id': 'telescope_pro_' + plan,
                'item_name': 'Telescope Suite Pro',
                'item_category': 'subscription',
                'price': itemPrice
            }],
            'timestamp': new Date().toISOString()
        });
    },

    /**
     * User Properties
     */
    setUserProperties: (userId, properties = {}) => {
        gtag('config', 'YOUR_GA_MEASUREMENT_ID_HERE', {
            'user_id': userId,
            ...properties
        });
    },

    setUserLevelProperty: (tier = 'freemium') => {
        gtag('config', 'YOUR_GA_MEASUREMENT_ID_HERE', {
            'user_tier': tier
        });
    },

    /**
     * Export Utilities
     */
    getCookieValue: (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    },

    getSessionId: () => {
        return TelescopeAnalytics.getCookieValue('_ga');
    }
};

/**
 * Auto-tracking Setup
 * Automatically track common interactions
 */
document.addEventListener('DOMContentLoaded', () => {

    // Track page view
    gtag('event', 'page_view', {
        'page_title': document.title,
        'page_location': window.location.href,
        'page_path': window.location.pathname
    });

    // Track all external link clicks
    document.querySelectorAll('a[href^="http"]').forEach(link => {
        if (!link.href.includes(window.location.origin)) {
            link.addEventListener('click', () => {
                gtag('event', 'click', {
                    'link_url': link.href,
                    'link_text': link.textContent,
                    'outbound': true
                });
            });
        }
    });

    // Track form submissions
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', () => {
            gtag('event', 'form_submit', {
                'form_id': form.id || 'unknown',
                'form_name': form.name || 'unknown',
                'timestamp': new Date().toISOString()
            });
        });
    });

    // Track scroll depth
    let maxScroll = 0;
    let scrollTracked = {
        '25': false,
        '50': false,
        '75': false,
        '100': false
    };

    window.addEventListener('scroll', () => {
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = (window.scrollY / docHeight) * 100;
        maxScroll = Math.max(maxScroll, scrollPercent);

        ['25', '50', '75', '100'].forEach(threshold => {
            if (maxScroll >= parseInt(threshold) && !scrollTracked[threshold]) {
                scrollTracked[threshold] = true;
                gtag('event', 'scroll_depth', {
                    'percent_scrolled': parseInt(threshold),
                    'timestamp': new Date().toISOString()
                });
            }
        });
    });
});

// Expose to global scope
window.TelescopeAnalytics = TelescopeAnalytics;

/**
 * Example Usage in Tools
 *
 * // In telescope-career-predictor.html
 * const form = document.getElementById('careerForm');
 * form.addEventListener('submit', (e) => {
 *     TelescopeAnalytics.trackPredictionStarted('Career Trajectory');
 *     // ... prediction logic ...
 *     TelescopeAnalytics.trackPredictionCompleted('Career Trajectory', score, confidence);
 * });
 *
 * // In stripe-checkout.html
 * document.querySelector('input[name="plan"]').addEventListener('change', () => {
 *     TelescopeAnalytics.trackBeginCheckout(plan);
 * });
 *
 * // In email-capture-modal.html
 * form.addEventListener('submit', () => {
 *     TelescopeAnalytics.trackEmailSignup(toolInterest);
 * });
 */
