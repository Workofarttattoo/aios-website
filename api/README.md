# 🔭 Telescope Suite API

**Quantum ML-Powered Life Prediction API**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-blue)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12%2B-red)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-PATENT%20PENDING-red)](./LICENSE)

---

## Overview

Production-grade REST API for Telescope Suite, providing quantum machine learning algorithms for predicting life trajectories across 10 domains:

- 💼 Career Trajectory
- 💕 Relationship Longevity
- 🏥 Health Outcomes
- 🏠 Real Estate Investment
- 🚀 Startup Success
- 💻 Skill Demand & Obsolescence
- 🎓 Education ROI
- 📍 Geographic Fit
- 🎨 Side Project Viability
- 💔 Relationship Health & Divorce Risk

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- Docker & Docker Compose (optional)

### Setup

```bash
# Clone and install
git clone https://github.com/yourusername/telescope-api.git
cd api
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Start database (Docker)
docker-compose up -d postgres

# Run migrations
npm run migrate

# Start server
npm run dev
```

Server runs on `http://localhost:3000`

---

## API Endpoints

### Authentication
```
POST   /api/v1/auth/signup          # Register new user
POST   /api/v1/auth/login           # Login and get JWT token
POST   /api/v1/auth/refresh         # Refresh JWT token
POST   /api/v1/auth/logout          # Logout user
```

### Predictions (All Require Auth)
```
POST   /api/v1/predict/career       # Career trajectory
POST   /api/v1/predict/relationship # Relationship longevity
POST   /api/v1/predict/health       # Health outcomes
POST   /api/v1/predict/realestate   # Real estate investment
POST   /api/v1/predict/startup      # Startup success
POST   /api/v1/predict/skills       # Skill demand
POST   /api/v1/predict/education    # Education ROI
POST   /api/v1/predict/geographic   # Geographic fit
POST   /api/v1/predict/sideproject  # Side project viability
POST   /api/v1/predict/divorce      # Relationship health
```

### User Management (All Require Auth)
```
GET    /api/v1/user/profile         # Get user profile
PATCH  /api/v1/user/profile         # Update profile
GET    /api/v1/user/predictions     # Get prediction history
DELETE /api/v1/user/account         # Delete account
```

### Subscriptions (All Require Auth)
```
POST   /api/v1/subscription/upgrade  # Upgrade to Pro
GET    /api/v1/subscription/status   # Get subscription status
POST   /api/v1/subscription/cancel   # Cancel subscription
POST   /api/v1/subscription/webhook  # Stripe webhook handler
```

### Analytics (All Require Auth)
```
POST   /api/v1/analytics/event      # Track event
GET    /api/v1/analytics/usage      # Get analytics (Pro+)
GET    /api/v1/analytics/summary    # Get summary stats
```

### Health Checks (No Auth)
```
GET    /health                       # Basic health
GET    /health/ready                 # Readiness check
GET    /health/live                  # Liveness check
```

---

## Example Requests

### Register User
```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "firstName": "Joshua",
    "toolInterests": ["career", "health"]
  }'
```

Response:
```json
{
  "success": true,
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "firstName": "Joshua",
  "tier": "freemium",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400
}
```

### Get Career Prediction
```bash
curl -X POST http://localhost:3000/api/v1/predict/career \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "salary": 85000,
    "title": "Senior Engineer",
    "level": "mid",
    "industry": "tech",
    "location": "San Francisco",
    "yearsExperience": 5,
    "jobSatisfaction": 7,
    "commitment": 6,
    "marketDemand": 8
  }'
```

Response:
```json
{
  "success": true,
  "prediction": {
    "salaryProjection": {
      "current": 85000,
      "year1": 92675,
      "year3": 108632,
      "year5": 127141
    },
    "transitionWindow": "18-24 months",
    "marketDemand": "Very High",
    "stabilityScore": 72,
    "growthScore": 78,
    "recommendation": "Stay and negotiate raise - market is hot for your skills",
    "confidence": 0.73
  },
  "timestamp": "2025-10-23T12:00:00Z"
}
```

---

## Authentication

All protected endpoints require JWT token in header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Tokens expire in 24 hours. Use `/auth/refresh` to get new token before expiration.

---

## Freemium vs Pro

### Freemium (Free)
- 5 predictions per month
- 30-day forecasts
- Single-domain access
- Conversion: 5-10% to Pro tier

### Pro ($19/month)
- Unlimited predictions
- 90-day forecasts
- All 10 tools
- API access
- What-if scenarios
- Priority support

### Premium ($49/month)
- Everything in Pro
- Monthly AI coaching
- Detailed reports
- Priority support

### Enterprise (Custom)
- White-label deployment
- On-premises option
- Custom models
- Dedicated support
- Starting at $100K/year

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    tier VARCHAR(50),
    newsletter BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP
);
```

### Predictions Table
```sql
CREATE TABLE predictions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users,
    tool_name VARCHAR(100),
    input_data JSONB,
    prediction_data JSONB,
    confidence FLOAT,
    created_at TIMESTAMP
);
```

### Subscriptions Table
```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    plan VARCHAR(50),
    status VARCHAR(50),
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

---

## Environment Variables

See `.env.example` for complete list. Key variables:

```
NODE_ENV=production
PORT=3000
JWT_SECRET=your-256-bit-secret
DB_HOST=postgres
DB_NAME=telescope_suite
DB_USER=postgres
DB_PASSWORD=secure_password
STRIPE_SECRET_KEY=sk_live_xxxxx
```

---

## Development

### Scripts

```bash
npm run dev              # Start in development mode with hot reload
npm run start            # Start in production mode
npm run migrate          # Run database migrations
npm run seed             # Seed database with sample data
npm test                 # Run tests
npm run lint             # Lint code
npm run build            # Build and lint
```

### Project Structure

```
api/
├── server.js            # Express app initialization
├── package.json         # Dependencies
├── Dockerfile           # Docker image definition
├── docker-compose.yml   # Local development stack
├── .env.example         # Environment template
├── DEPLOYMENT.md        # Deployment guide
├── db/
│   └── connection.js    # Database pool & setup
├── middleware/
│   ├── auth.js          # JWT authentication
│   └── errorHandler.js  # Error handling
├── routes/
│   ├── auth.js          # Authentication endpoints
│   ├── predictions.js   # Prediction endpoints
│   ├── users.js         # User management
│   ├── subscriptions.js # Subscription/payment
│   ├── analytics.js     # Analytics events
│   └── health.js        # Health checks
├── services/
│   └── predictions.js   # Prediction algorithms
└── utils/
    └── logger.js        # Winston logging
```

---

## Performance

- **Response Time:** < 200ms average for predictions
- **Database Queries:** Indexed for optimal performance
- **Caching:** Redis support for frequently accessed data
- **Scaling:** Horizontal scaling via load balancing
- **Rate Limiting:** 100 req/min per IP (configurable)

---

## Monitoring & Logging

- **Winston Logger:** File + console logging
- **Request Tracking:** Unique request IDs
- **Health Checks:** `/health` endpoints for Kubernetes
- **Metrics:** Prometheus endpoint at `/metrics`
- **Error Tracking:** Sentry integration (optional)

---

## Testing

```bash
# Run test suite
npm test

# Run specific test file
npm test -- auth.test.js

# Run with coverage
npm test -- --coverage
```

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions:

- Local development with Docker Compose
- AWS ECS/Fargate
- Heroku
- DigitalOcean
- Kubernetes
- Traditional VPS

---

## Security

- ✅ JWT authentication
- ✅ Password hashing (bcrypt)
- ✅ HTTPS enforced
- ✅ CORS configured
- ✅ SQL injection prevention (parameterized queries)
- ✅ Rate limiting
- ✅ Security headers (Helmet.js)
- ✅ Input validation (Joi)
- ✅ Environment variable secrets
- ✅ Database encryption at rest

---

## Roadmap

- [ ] GraphQL API support
- [ ] Real-time WebSocket predictions
- [ ] Advanced analytics dashboard
- [ ] Mobile app API (iOS/Android)
- [ ] Integration with Slack/Teams
- [ ] Webhook support for third-party apps
- [ ] Multi-language support
- [ ] Blockchain verification of predictions

---

## Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## License

PATENT PENDING - See LICENSE file for details

**Copyright © 2025 Joshua Hendricks Cole (DBA: Corporation of Light). All Rights Reserved.**

---

## Support

- 📧 Email: support@aios.is
- 🐛 Issues: https://github.com/yourusername/telescope-api/issues
- 💬 Discussions: https://github.com/yourusername/telescope-api/discussions
- 📚 Docs: https://api.aios.is/docs

---

**Status:** ✅ Production Ready | **Version:** 1.0.0 | **Last Updated:** October 23, 2025
