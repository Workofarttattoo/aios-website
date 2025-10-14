# GAVL Tracking Backend

Simple Express.js server for tracking aios.is and thegavl.com visitors.

## Features

- ✅ **Cookie consent tracking** (click = consent)
- ✅ **Government/Judicial detection** (auto-show enterprise pitch)
- ✅ **GDPR compliant** (right to deletion)
- ✅ **Rate limiting** (prevent abuse)
- ✅ **Security headers** (Helmet.js)
- ✅ **Analytics dashboard**
- ✅ **Enterprise leads export** (CSV)

## Quick Deploy to Railway.app

### Step 1: Create Railway Account

1. Go to https://railway.app
2. Sign up with GitHub
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**

### Step 2: Push Backend Code

```bash
cd /Users/noone/aios-website/backend-example
git init
git add .
git commit -m "Initial tracking backend"

# Create GitHub repo
gh repo create gavl-tracking-backend --public --source=.
git push origin main
```

### Step 3: Deploy

1. In Railway dashboard, click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose `gavl-tracking-backend`
4. Railway auto-detects Node.js and runs `npm start`

### Step 4: Set Environment Variables

In Railway dashboard → Variables:

```
NODE_ENV=production
ADMIN_TOKEN=your-secret-token-here-change-this
PORT=3000
```

### Step 5: Get Your API URL

Railway gives you a URL like: `https://gavl-tracking-backend-production.up.railway.app`

Copy this URL and update `tracking.js` line 7:

```javascript
const TRACKING_API = 'https://gavl-tracking-backend-production.up.railway.app/api/track';
```

## Alternative: Deploy to Render.com

### Step 1: Create Render Account

1. Go to https://render.com
2. Sign up with GitHub
3. Click **"New +"** → **"Web Service"**

### Step 2: Connect Repo

1. Select your `gavl-tracking-backend` GitHub repo
2. Name: `gavl-tracking-backend`
3. Environment: **Node**
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Instance Type: **Free**

### Step 3: Environment Variables

Add these in Render dashboard:

```
NODE_ENV=production
ADMIN_TOKEN=super-secret-token-123
```

### Step 4: Deploy

Click **"Create Web Service"** - Render auto-deploys!

Your URL: `https://gavl-tracking-backend.onrender.com`

## Update tracking.js

After deploying backend, update line 7 in `/Users/noone/aios-website/tracking.js`:

```javascript
const TRACKING_API = 'https://your-backend-url.railway.app/api/track';
```

Then commit and push to aios-website:

```bash
cd /Users/noone/aios-website
git add tracking.js
git commit -m "Connect to tracking backend"
git push origin main
```

GitHub Pages auto-updates in 1-2 minutes!

## Testing Locally

```bash
cd /Users/noone/aios-website/backend-example
npm install
npm start
```

Server runs on http://localhost:3000

Update `tracking.js` line 7 temporarily:
```javascript
const TRACKING_API = 'http://localhost:3000/api/track';
```

Visit http://aios.is and click around. Check backend logs:

```
✅ New visitor consent: v_1760480000_abc123 from United States
🔗 Link clicked: / by v_1760480000_abc123
🏛️  ENTERPRISE LEAD: US Courts from United States
```

## Analytics Dashboard

View stats (replace `YOUR_TOKEN` with your `ADMIN_TOKEN`):

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-backend-url.railway.app/api/analytics
```

Response:
```json
{
  "total_visitors": 1234,
  "unique_visitors": 890,
  "government_judicial": 45,
  "enterprise_leads": 23,
  "countries": ["United States", "Canada", "Norway", "Singapore"],
  "top_pages": [
    { "page": "/", "count": 456 },
    { "page": "/docs.html", "count": 234 }
  ],
  "intents": {
    "general_interest": 678,
    "technical_evaluation": 234,
    "trial_interest": 123
  }
}
```

## Export Enterprise Leads (CSV)

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-backend-url.railway.app/api/enterprise-leads/export \
  > enterprise-leads.csv
```

Opens in Excel/Google Sheets for follow-up.

## GDPR: Delete Visitor Data

```bash
curl -X DELETE https://your-backend-url.railway.app/api/visitor/v_1760480000_abc123
```

## Production Upgrade (PostgreSQL)

For production with thousands of visitors:

### Railway.app (Easiest)

1. Railway dashboard → **"New"** → **"Database"** → **"PostgreSQL"**
2. Railway auto-injects `DATABASE_URL` env var
3. Update `server.js` to use PostgreSQL instead of in-memory array

### Code Changes

Install pg:
```bash
npm install pg
```

Replace in-memory arrays with database:

```javascript
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Create tables
pool.query(`
  CREATE TABLE IF NOT EXISTS visitors (
    id SERIAL PRIMARY KEY,
    visitor_id VARCHAR(255) UNIQUE,
    visitor_type VARCHAR(50),
    organization VARCHAR(255),
    country VARCHAR(100),
    timestamp TIMESTAMP,
    data JSONB
  )
`);

// Store visitor
app.post('/api/track', async (req, res) => {
  const data = req.body;
  await pool.query(
    'INSERT INTO visitors (visitor_id, visitor_type, organization, country, timestamp, data) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (visitor_id) DO UPDATE SET data = $6',
    [data.visitorId, data.visitorType, data.organization, data.location?.country, data.timestamp, data]
  );
  res.json({ success: true });
});
```

## Security Checklist

- ✅ Rate limiting enabled (100 req/15min per IP)
- ✅ CORS restricted to aios.is and thegavl.com
- ✅ Helmet.js security headers
- ✅ Admin token for analytics access
- ⚠️ TODO: Add HTTPS certificate (Railway/Render do this automatically)
- ⚠️ TODO: Add database encryption at rest
- ⚠️ TODO: Add audit logging for GDPR requests

## Costs

### Free Tier (Good for 0-10K visitors/month)
- **Railway.app**: $5/month (500 hours free)
- **Render.com**: Free tier available

### Paid Tier (10K+ visitors/month)
- **Railway.app**: ~$20/month with PostgreSQL
- **Render.com**: $7/month + $7/month for DB = $14/month

## Support

Questions? Email: tech@thegavl.com

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
