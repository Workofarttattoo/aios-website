# Supabase Setup for Ai|oS & GAVL Tracking

## Why Supabase is Perfect

✅ **FREE tier**: 500MB database, 50K monthly active users
✅ **No backend needed**: REST API auto-generated from database
✅ **Real-time**: WebSocket subscriptions for live updates
✅ **Built-in auth**: If you need user accounts later
✅ **Storage**: For files (PDFs, images, etc.)
✅ **Better than deploying your own backend**: No server maintenance

---

## Step 1: Create Supabase Project (5 minutes)

1. Go to https://supabase.com
2. Click **"Start your project"** → Sign up with GitHub
3. Click **"New Project"**
4. Enter:
   - **Name**: `aios-tracking`
   - **Database Password**: Generate a strong one (save it!)
   - **Region**: Choose closest to your users (US West, US East, Europe, etc.)
5. Click **"Create new project"**
6. Wait 2 minutes for provisioning

---

## Step 2: Create Database Tables

Once project is ready, click **"SQL Editor"** (left sidebar) and run this:

```sql
-- Visitors tracking table
CREATE TABLE visitors (
  id BIGSERIAL PRIMARY KEY,
  visitor_id VARCHAR(255) UNIQUE NOT NULL,
  visitor_type VARCHAR(50),
  user_agent TEXT,
  language VARCHAR(10),
  organization VARCHAR(255),

  event_type VARCHAR(50),
  page_path VARCHAR(500),
  page_title VARCHAR(500),

  timestamp TIMESTAMPTZ DEFAULT NOW(),
  timezone VARCHAR(100),

  country VARCHAR(100),
  region VARCHAR(100),
  city VARCHAR(100),
  ip_address INET,

  referrer TEXT,
  intent VARCHAR(100),

  screen_resolution VARCHAR(50),
  viewport VARCHAR(50),
  device_type VARCHAR(20),

  session_id VARCHAR(255),
  is_returning BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX idx_visitors_visitor_id ON visitors(visitor_id);
CREATE INDEX idx_visitors_timestamp ON visitors(timestamp DESC);
CREATE INDEX idx_visitors_visitor_type ON visitors(visitor_type);
CREATE INDEX idx_visitors_country ON visitors(country);

-- Enterprise leads table (government/judicial visitors)
CREATE TABLE enterprise_leads (
  id BIGSERIAL PRIMARY KEY,
  visitor_id VARCHAR(255) NOT NULL,
  organization VARCHAR(255),
  country VARCHAR(100),
  region VARCHAR(100),
  city VARCHAR(100),
  referrer TEXT,
  pitch_shown BOOLEAN DEFAULT FALSE,
  priority VARCHAR(20) DEFAULT 'medium',
  contacted BOOLEAN DEFAULT FALSE,
  notes TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for enterprise leads
CREATE INDEX idx_enterprise_visitor_id ON enterprise_leads(visitor_id);
CREATE INDEX idx_enterprise_priority ON enterprise_leads(priority);
CREATE INDEX idx_enterprise_contacted ON enterprise_leads(contacted);

-- Enable Row Level Security (RLS) for privacy
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_leads ENABLE ROW LEVEL SECURITY;

-- Public can insert (for tracking)
CREATE POLICY "Anyone can insert visitors"
  ON visitors FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can insert enterprise leads"
  ON enterprise_leads FOR INSERT
  WITH CHECK (true);

-- Only authenticated users can read (for your admin dashboard)
CREATE POLICY "Authenticated users can read visitors"
  ON visitors FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read enterprise leads"
  ON enterprise_leads FOR SELECT
  USING (auth.role() = 'authenticated');
```

Click **"RUN"** (Cmd+Enter or Ctrl+Enter)

---

## Step 3: Get Your API Keys

1. Click **"Settings"** (gear icon, bottom left)
2. Click **"API"**
3. You'll see:
   - **Project URL**: `https://abc123.supabase.co`
   - **anon / public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Copy both values!**

---

## Step 4: Update tracking-supabase.js

Open `/Users/noone/aios-website/tracking-supabase.js`

Replace lines 7-8:
```javascript
const SUPABASE_URL = 'https://abc123.supabase.co'; // Your Project URL
const SUPABASE_ANON_KEY = 'eyJhbGci...'; // Your anon key
```

---

## Step 5: Update index.html

Replace the tracking script reference:

```html
<!-- OLD (Node.js backend) -->
<script src="tracking.js"></script>

<!-- NEW (Supabase) -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="tracking-supabase.js"></script>
```

---

## Step 6: Deploy

```bash
cd /Users/noone/aios-website

# Remove old tracking
git rm tracking.js

# Add Supabase tracking
git add tracking-supabase.js SUPABASE_SETUP.md index.html

# Commit
git commit -m "Switch to Supabase for tracking (no backend deployment needed)"

# Push
git push origin main
```

GitHub Pages auto-deploys in 1-2 minutes!

---

## Step 7: Test It

1. Visit https://aios.is
2. Click anywhere (gives consent)
3. Go to Supabase dashboard → **"Table Editor"** → **"visitors"**
4. You should see your visit recorded!

---

## View Analytics in Supabase

### Total Visitors
```sql
SELECT COUNT(DISTINCT visitor_id) as unique_visitors,
       COUNT(*) as total_events
FROM visitors;
```

### Government/Judicial Visitors
```sql
SELECT organization, country, COUNT(*) as visits
FROM visitors
WHERE visitor_type = 'government_judicial'
GROUP BY organization, country
ORDER BY visits DESC;
```

### Top Countries
```sql
SELECT country, COUNT(DISTINCT visitor_id) as visitors
FROM visitors
WHERE country IS NOT NULL
GROUP BY country
ORDER BY visitors DESC
LIMIT 10;
```

### User Intent Breakdown
```sql
SELECT intent, COUNT(*) as count
FROM visitors
GROUP BY intent
ORDER BY count DESC;
```

### Enterprise Leads (High Priority)
```sql
SELECT *
FROM enterprise_leads
WHERE priority = 'high'
  AND contacted = FALSE
ORDER BY timestamp DESC;
```

---

## Export Enterprise Leads (CSV)

1. Go to **"Table Editor"** → **"enterprise_leads"**
2. Click **"Export"** → **"CSV"**
3. Open in Excel/Google Sheets

---

## Optional: Admin Dashboard

Want a nice dashboard? Create `/Users/noone/aios-website/admin.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Ai|oS Analytics Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <style>
    body { font-family: sans-serif; padding: 20px; background: #0a0a0a; color: #fff; }
    .stat { display: inline-block; margin: 20px; padding: 20px; background: #1a1a1a; border-radius: 10px; }
    .stat-number { font-size: 48px; color: #00ff88; }
    .stat-label { color: #888; }
  </style>
</head>
<body>
  <h1>🏛️ Ai|oS Analytics Dashboard</h1>

  <div id="stats"></div>

  <h2>Recent Enterprise Leads</h2>
  <div id="enterprise-leads"></div>

  <script>
    const SUPABASE_URL = 'https://your-project.supabase.co';
    const SUPABASE_KEY = 'your-service-role-key-here'; // USE SERVICE ROLE KEY (not anon)

    const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    async function loadStats() {
      // Total visitors
      const { count: totalVisitors } = await supabase
        .from('visitors')
        .select('*', { count: 'exact', head: true });

      // Government visitors
      const { count: govVisitors } = await supabase
        .from('visitors')
        .select('*', { count: 'exact', head: true })
        .eq('visitor_type', 'government_judicial');

      // Enterprise leads
      const { data: leads } = await supabase
        .from('enterprise_leads')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);

      // Display
      document.getElementById('stats').innerHTML = `
        <div class="stat">
          <div class="stat-number">${totalVisitors || 0}</div>
          <div class="stat-label">Total Visitors</div>
        </div>
        <div class="stat">
          <div class="stat-number">${govVisitors || 0}</div>
          <div class="stat-label">Gov/Judicial</div>
        </div>
        <div class="stat">
          <div class="stat-number">${leads?.length || 0}</div>
          <div class="stat-label">Enterprise Leads</div>
        </div>
      `;

      // Display leads
      document.getElementById('enterprise-leads').innerHTML = leads.map(lead => `
        <div style="background: #1a1a1a; padding: 15px; margin: 10px 0; border-radius: 8px;">
          <strong>${lead.organization}</strong> - ${lead.country}<br>
          <small>${new Date(lead.timestamp).toLocaleString()}</small>
        </div>
      `).join('');
    }

    loadStats();
  </script>
</body>
</html>
```

Visit: https://aios.is/admin.html

---

## Cost Comparison

### Supabase (Recommended)
- **FREE tier**: 500MB database, 50K MAU, 2GB bandwidth
- **Pro tier**: $25/month (8GB database, 100K MAU, 50GB bandwidth)

### Alternative (Node.js Backend)
- Railway: $20/month
- Render: $7-14/month
- DigitalOcean VPS: $12/month
- **PLUS**: Maintenance, updates, security patches

**Supabase Savings**: $84-228/year + no maintenance! 💰

---

## Security Notes

✅ **Anon key is safe**: Can only INSERT into visitors/enterprise_leads (not read)
✅ **RLS enabled**: Row-level security prevents unauthorized reads
✅ **No secrets exposed**: All keys in Supabase dashboard
⚠️ **Service role key**: NEVER put in frontend code (only for admin dashboard on secure server)

---

## Future Enhancements

Want more features? Supabase makes it easy:

1. **Real-time dashboard**: WebSocket subscriptions
   ```javascript
   supabase
     .channel('visitors')
     .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'visitors' },
       payload => console.log('New visitor!', payload))
     .subscribe();
   ```

2. **Email alerts**: Use Supabase Edge Functions
   ```javascript
   // Trigger email when government visitor detected
   supabase.functions.invoke('send-enterprise-alert', {
     body: { lead: enterpriseData }
   });
   ```

3. **User accounts**: Enable Supabase Auth
   ```javascript
   await supabase.auth.signUp({ email, password });
   ```

4. **File storage**: Store pilot program PDFs, contracts
   ```javascript
   await supabase.storage
     .from('documents')
     .upload('pilot-agreement.pdf', file);
   ```

---

## Troubleshooting

**"Failed to fetch" error?**
- Check Project URL and anon key are correct
- Make sure tables were created (SQL Editor)
- Check browser console for details

**No data showing?**
- Click anywhere on aios.is to trigger consent
- Check Supabase logs: Dashboard → Logs
- Verify RLS policies allow INSERT

**Enterprise pitch not showing?**
- Must visit from .gov, .mil, or court-related referrer
- Or manually test: `window.aiosTracking.track('test')`

---

## Support

Questions? Email: tech@thegavl.com

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
