# 🚀 Telescope Suite - Infrastructure Setup Guide

**Status:** ✅ PHASE 1 READY - Production Implementation Templates

**Date Created:** October 23, 2025

---

## 📋 Overview

This guide covers the complete infrastructure setup for Telescope Suite including:
- Email capture and automation
- Stripe payment processing
- Google Analytics 4 event tracking
- Backend API endpoints
- Email service integration
- Cookie and consent management

---

## 🔧 Component 1: Email Capture Modal

**File:** `email-capture-modal.html`

### Features
- ✅ Exit-intent detection (appears when mouse leaves viewport)
- ✅ Time-based trigger (8 seconds on page load)
- ✅ Glassmorphism UI matching Telescope design
- ✅ Form validation with error messages
- ✅ Tool preference segmentation
- ✅ Newsletter opt-in checkbox
- ✅ Success state with 3-second auto-close
- ✅ 24-hour dismissal cooldown (localStorage)

### Integration Steps

1. **Add to all HTML pages** (telescope-suite.html, all tool pages):
```html
<!-- Add before closing </body> tag -->
<script src="email-capture-modal.js"></script>
```

2. **Create email-capture-modal.js** (optional if using embedded version):
```javascript
// Lazy load modal after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const script = document.createElement('script');
    script.src = 'email-capture-modal.html';
    script.async = true;
    document.body.appendChild(script);
});
```

3. **Backend Endpoint** - `POST /api/v1/email/subscribe`
```javascript
// Expected request body
{
    "firstName": "Joshua",
    "email": "user@example.com",
    "primaryTool": "career",
    "newsletter": true,
    "timestamp": "2025-10-23T12:00:00Z",
    "source": "email-capture-modal"
}

// Expected response
{
    "success": true,
    "message": "Subscription added",
    "userId": "user_123",
    "freemiumCredits": 5,
    "accessToken": "token_xyz"
}
```

### Email Service Integration

**Option A: Mailchimp**
```javascript
// Backend should integrate with Mailchimp API
const mailchimp = require('@mailchimp/marketing');
mailchimp.setConfig({
    apiKey: process.env.MAILCHIMP_API_KEY,
    server: process.env.MAILCHIMP_SERVER
});

const response = await mailchimp.lists.addListMember(
    process.env.MAILCHIMP_AUDIENCE_ID,
    {
        email_address: email,
        status: 'subscribed',
        merge_fields: {
            FNAME: firstName,
            TOOL: primaryTool
        },
        tags: ['freemium-signup', primaryTool]
    }
);
```

**Option B: ConvertKit**
```javascript
const convertkit = require('convertkit-sdk');
const client = new convertkit.Client({ token: process.env.CONVERTKIT_API_KEY });

const subscriber = await client.createSubscriber(email, {
    first_name: firstName,
    tags: ['freemium', primaryTool]
});
```

**Option C: Custom Database**
```javascript
// Store in your database
const subscriber = await Subscriber.create({
    firstName: firstName,
    email: email,
    primaryTool: primaryTool,
    tier: 'freemium',
    freemiumCredits: 5,
    newsletter: newsletter,
    createdAt: new Date()
});
```

---

## 💳 Component 2: Stripe Payment Integration

**File:** `stripe-checkout.html`

### Setup Steps

1. **Get Stripe Keys**
   - Sign up at https://stripe.com
   - Go to Dashboard → API keys
   - Copy your Publishable Key and Secret Key

2. **Update HTML**
```html
<!-- Replace in stripe-checkout.html -->
<script src="https://js.stripe.com/v3/"></script>

<script>
const stripe = Stripe('pk_live_YOUR_PUBLISHABLE_KEY');
</script>
```

3. **Environment Variables** (.env)
```
STRIPE_PUBLISHABLE_KEY=pk_live_XXXXXX
STRIPE_SECRET_KEY=sk_live_XXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXX
```

### Payment Flow

**Step 1: Initialize Elements**
```javascript
const stripe = Stripe(publishableKey);
const elements = stripe.elements();
const cardElement = elements.create('card');
cardElement.mount('#cardElement');
```

**Step 2: Create Payment Method**
```javascript
const { paymentMethod, error } = await stripe.createPaymentMethod({
    type: 'card',
    card: cardElement,
    billing_details: {
        email: email,
        name: name
    }
});
```

**Step 3: Create Subscription** (Backend)
```javascript
// POST /api/v1/stripe/create-subscription
const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{
        price: plan === 'monthly' ? 'price_monthly_pro' : 'price_annual_pro'
    }],
    payment_settings: {
        save_default_payment_method: 'on_subscription',
        default_mandate_id: paymentMethod.id
    },
    metadata: {
        email: email,
        name: name
    }
});
```

### Backend Endpoints

**Create Subscription**
```
POST /api/v1/stripe/create-subscription
Content-Type: application/json

{
    "paymentMethodId": "pm_xxx",
    "email": "user@example.com",
    "name": "Joshua Cole",
    "plan": "monthly",
    "newsletter": true
}

Response:
{
    "success": true,
    "subscriptionId": "sub_xxx",
    "clientSecret": "seti_xxx",
    "status": "requires_confirmation"
}
```

**Webhook Handler** (Stripe Events)
```javascript
// POST /api/v1/stripe/webhook
app.post('/api/v1/stripe/webhook', async (req, res) => {
    const event = req.body;

    switch(event.type) {
        case 'payment_intent.succeeded':
            await handlePaymentSuccess(event.data.object);
            break;
        case 'customer.subscription.created':
            await handleSubscriptionCreated(event.data.object);
            break;
        case 'customer.subscription.deleted':
            await handleSubscriptionCancelled(event.data.object);
            break;
        case 'invoice.payment_failed':
            await handlePaymentFailed(event.data.object);
            break;
    }

    res.json({received: true});
});
```

### Subscription Management

**Get Subscription Status**
```javascript
app.get('/api/v1/stripe/subscription/:userId', async (req, res) => {
    const user = await User.findById(req.params.userId);
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

    res.json({
        status: subscription.status,
        plan: subscription.items.data[0].price.metadata.plan,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        autoRenew: subscription.cancel_at === null
    });
});
```

**Cancel Subscription**
```javascript
app.post('/api/v1/stripe/cancel/:userId', async (req, res) => {
    const user = await User.findById(req.params.userId);
    await stripe.subscriptions.del(user.stripeSubscriptionId);

    await User.updateOne(
        { _id: req.params.userId },
        { tier: 'freemium', stripeSubscriptionId: null }
    );

    TelescopeAnalytics.trackSubscriptionCancellation(req.body.reason);

    res.json({ success: true });
});
```

---

## 📊 Component 3: Google Analytics 4 Setup

**File:** `analytics-setup.js`

### Implementation

1. **Add GA4 Tag to HTML**
```html
<!-- In <head> of all HTML files -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script src="analytics-setup.js"></script>
```

2. **Create Google Analytics Account**
   - Go to https://analytics.google.com
   - Create new property for Telescope Suite
   - Get Measurement ID (G-XXXXXXXXXX)
   - Configure data streams

3. **Update analytics-setup.js**
```javascript
gtag('config', 'G-YOUR_MEASUREMENT_ID_HERE', {
    'page_path': window.location.pathname,
    'anonymize_ip': true
});
```

### Event Tracking Implementation

**Example: Career Tool**
```html
<!-- In telescope-career-predictor.html -->
<script src="analytics-setup.js"></script>

<script>
const form = document.getElementById('careerForm');
form.addEventListener('submit', (e) => {
    // Track prediction start
    TelescopeAnalytics.trackPredictionStarted('Career Trajectory');

    // ... calculation logic ...

    // Track prediction completion
    TelescopeAnalytics.trackPredictionCompleted(
        'Career Trajectory',
        score,      // 0-100 score
        confidence  // 0-100 confidence
    );

    // Track engagement
    TelescopeAnalytics.trackFeatureUsed('salary_projection', 'Career Trajectory');
});

// Share button
document.getElementById('shareBtn').addEventListener('click', () => {
    TelescopeAnalytics.trackPredictionShared('Career Trajectory', 'twitter');
});
</script>
```

### Key Events to Track

| Event | Where | Purpose |
|-------|-------|---------|
| `email_signup` | Email modal | Funnel top |
| `sign_up` | Account creation | Funnel middle |
| `purchase` | Stripe checkout | Revenue conversion |
| `prediction_started` | Tool form submit | Engagement |
| `prediction_completed` | Tool calculation | Key metric |
| `prediction_shared` | Share button | Virality |
| `page_load_time` | All pages | Performance |

### Analytics Reporting

**Create Dashboard**
1. Go to Analytics → Explore
2. Create new custom report with:
   - Dimensions: Device category, Tool name, User segment
   - Metrics: Event count, Conversion rate, Average engagement time
   - Date range: Last 30 days

**Key Reports**
- Freemium to Pro conversion funnel
- Tool usage by user segment
- Geographic distribution
- Device breakdown
- Retention and churn rates

---

## 📧 Component 4: Email Marketing Sequences

See `TELESCOPE_MARKETING_LAUNCH_STRATEGY.md` for complete email templates.

### Sequence Timeline

**Day 0: Welcome Email**
- Subject: "Welcome to Telescope ✨ See Your Future Instantly"
- CTA: Explore each tool category
- Goal: Get user to first prediction

**Day 3: Freemium Limit Notification**
- Subject: "You've Used 2/5 Predictions - Unlock Unlimited"
- CTA: Upgrade to Pro
- Goal: Introduce premium benefits

**Day 7: Social Proof**
- Subject: "67% of Pro Users Made Major Decisions In The Last Month"
- CTA: Read testimonials, upgrade
- Goal: Build credibility

**Day 10: Win-Back**
- Subject: "One Year Salary Negotiation Story (Telescope User)"
- CTA: Get your prediction
- Goal: Re-engagement

**Ongoing: Nurture**
- Weekly insights about predictions
- Tool tips and features
- Company updates

### Email Service Configuration

**Mailchimp Automation**
```javascript
// Create automation workflow
automation: {
    trigger: 'email_signup',
    flows: [
        { delay: '0h', email: 'welcome' },
        { delay: '3d', email: 'freemium_limit' },
        { delay: '7d', email: 'social_proof' },
        { delay: '10d', email: 'winback' }
    ],
    segmentation: {
        byTool: ['career', 'relationship', 'health', 'realestate', 'startup', 'skills', 'education'],
        byPlan: ['freemium', 'pro', 'premium']
    }
}
```

---

## 🔌 Component 5: API Endpoints

### Core Endpoints

**Authentication**
```
POST /api/v1/auth/signup
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
```

**Email Subscription**
```
POST /api/v1/email/subscribe
GET /api/v1/email/status/:email
PATCH /api/v1/email/preferences/:userId
```

**Predictions**
```
POST /api/v1/predict/career
POST /api/v1/predict/relationship
POST /api/v1/predict/health
POST /api/v1/predict/realestate
POST /api/v1/predict/startup
POST /api/v1/predict/skills
POST /api/v1/predict/education
POST /api/v1/predict/geographic
POST /api/v1/predict/sideproject
POST /api/v1/predict/divorce
```

**Payment**
```
POST /api/v1/stripe/create-subscription
GET /api/v1/stripe/subscription/:userId
POST /api/v1/stripe/cancel/:userId
POST /api/v1/stripe/webhook
```

**User Management**
```
GET /api/v1/user/profile/:userId
PATCH /api/v1/user/profile/:userId
GET /api/v1/user/predictions/:userId
DELETE /api/v1/user/account/:userId
```

### Prediction Endpoint Example

```javascript
// POST /api/v1/predict/career
Request:
{
    "salary": 85000,
    "title": "Software Engineer",
    "level": "mid",
    "industry": "tech",
    "location": "San Francisco",
    "yearsExperience": 5,
    "jobSatisfaction": 7,
    "commitment": 6,
    "marketDemand": 8
}

Response:
{
    "success": true,
    "prediction": {
        "salaryProjection": {
            "year1": 87500,
            "year3": 95000,
            "year5": 105000
        },
        "transitionWindow": "18-24 months",
        "marketDemand": "Very High",
        "stabilityScore": 72,
        "growthScore": 78,
        "recommendation": "Stay and negotiate raise - market is hot for your skills"
    },
    "confidence": 0.73,
    "timestamp": "2025-10-23T12:00:00Z"
}
```

---

## 🔐 Component 6: Privacy & Compliance

### Cookie Consent

```html
<!-- Add to telescope-suite.html -->
<div id="cookieConsent" class="cookie-banner">
    <p>We use cookies to improve your experience. By continuing, you agree to our <a href="/privacy">Privacy Policy</a>.</p>
    <button onclick="acceptCookies()">Accept All</button>
    <button onclick="rejectCookies()">Reject Optional</button>
</div>

<script>
function acceptCookies() {
    localStorage.setItem('cookieConsent', 'all');
    document.getElementById('cookieConsent').style.display = 'none';
    // Enable all tracking
    gtag('consent', 'update', {
        'analytics_storage': 'granted'
    });
}

function rejectCookies() {
    localStorage.setItem('cookieConsent', 'necessary');
    document.getElementById('cookieConsent').style.display = 'none';
    // Disable optional tracking
}
</script>
```

### Privacy Policy Sections

- Data collection (what, why, how long)
- Email usage (marketing, product updates, analysis)
- Payment processing (Stripe PCI compliance)
- Analytics (Google Analytics 4)
- User rights (deletion, export)
- GDPR/CCPA compliance

### Data Retention

| Data Type | Retention Period | Purpose |
|-----------|-----------------|---------|
| Email | Until unsubscribe | Marketing + product updates |
| Prediction | 1 year | Analytics + user history |
| Payment info | 7 years | Tax/accounting requirements |
| Analytics | 26 months | GA4 default |
| Logs | 30 days | Debugging + security |

---

## 🚀 Deployment Checklist

- [ ] Email capture modal integrated on all pages
- [ ] Stripe keys configured and tested
- [ ] Google Analytics property created and tracking verified
- [ ] Email service (Mailchimp/ConvertKit) connected
- [ ] Backend API endpoints implemented and tested
- [ ] Webhook handlers for Stripe events configured
- [ ] Privacy policy and terms updated
- [ ] Cookie consent implemented
- [ ] HTTPS enabled on all payment pages
- [ ] Monitoring and alerting set up
- [ ] Backup and disaster recovery configured
- [ ] Load testing completed (minimum 1000 concurrent users)

---

## 📊 Success Metrics

**Email**
- Target: 25%+ open rate, 3%+ click-through rate
- Benchmark: Industry average is 20% open, 2.5% CTR

**Payment**
- Target: 5-10% freemium to Pro conversion
- Benchmark: SaaS average is 2-5%

**Analytics**
- Track: Daily active users, prediction completion rate, feature adoption
- Goal: 70%+ of signups complete first prediction within 48 hours

---

## 🆘 Troubleshooting

**Email not sending**
- Check email service API key
- Verify email address is valid
- Check spam folder
- Review service logs

**Stripe payment failing**
- Verify publishable key (should start with `pk_`)
- Check webhook signature
- Review card details
- Check rate limits

**Analytics not tracking**
- Verify GA4 property ID (G-xxx format)
- Check browser console for errors
- Verify gtag script loaded
- Check Google Analytics Debug View

---

## 📚 Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Google Analytics 4 Guide](https://support.google.com/analytics)
- [Mailchimp API Docs](https://mailchimp.com/developer/)
- [GDPR Compliance](https://gdpr.eu/)
- [PCI DSS Standards](https://www.pcisecuritystandards.org/)

---

**Status:** ✅ READY FOR IMPLEMENTATION

**Next Step:** Execute deployment checklist and launch soft beta with 1,000 users

Muse: my trusted friend, Claude
Co-Authored-By: Claude <noreply@anthropic.com>
