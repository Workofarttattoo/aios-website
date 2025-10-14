# Supabase Integration Template

Use this template for ANY future project that needs to store data.

## Why Supabase for Everything?

✅ **No SSL costs** - Supabase provides HTTPS endpoints automatically
✅ **No backend deployment** - REST API auto-generated
✅ **No server maintenance** - Supabase handles everything
✅ **FREE tier** - 500MB database, 50K users/month
✅ **Scales automatically** - From 0 to millions of users

## Projects That Should Use Supabase

1. ✅ **aios.is** - Visitor tracking (already done!)
2. ✅ **thegavl.com** - Court simulation data, user feedback
3. ✅ **PilotProgram.TheGavl.com** - Pilot program applications
4. ✅ **Any dashboard** - Store settings, preferences
5. ✅ **Any form** - Contact forms, surveys, feedback
6. ✅ **Any analytics** - Event tracking, usage metrics
7. ✅ **Any user-generated content** - Comments, reviews, submissions

---

## Quick Start Template (Copy & Paste)

### 1. HTML Setup

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Project</title>
</head>
<body>
  <h1>My Project</h1>

  <!-- Your content here -->

  <!-- Supabase Client -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script>
    // Initialize Supabase
    const SUPABASE_URL = 'https://your-project.supabase.co';
    const SUPABASE_KEY = 'your-anon-key-here';
    const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // Example: Save form data
    async function saveData(data) {
      const { data: result, error } = await supabase
        .from('your_table')
        .insert([data]);

      if (error) {
        console.error('Error:', error);
      } else {
        console.log('Saved:', result);
      }
    }

    // Example: Load data
    async function loadData() {
      const { data, error } = await supabase
        .from('your_table')
        .select('*');

      if (error) {
        console.error('Error:', error);
      } else {
        console.log('Data:', data);
      }
    }
  </script>
</body>
</html>
```

### 2. Database Schema Template

```sql
-- Generic table for storing data
CREATE TABLE your_table_name (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(255),
  data JSONB,  -- Store any JSON data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX idx_your_table_user_id ON your_table_name(user_id);
CREATE INDEX idx_your_table_created_at ON your_table_name(created_at DESC);

-- Enable Row Level Security
ALTER TABLE your_table_name ENABLE ROW LEVEL SECURITY;

-- Public can insert (for forms, tracking, etc.)
CREATE POLICY "Anyone can insert"
  ON your_table_name FOR INSERT
  WITH CHECK (true);

-- Optional: Public can read their own data
CREATE POLICY "Users can read own data"
  ON your_table_name FOR SELECT
  USING (user_id = current_setting('request.jwt.claim.sub', true));
```

### 3. Common Patterns

#### A. Contact Form

```html
<form id="contactForm">
  <input type="email" name="email" required>
  <textarea name="message" required></textarea>
  <button type="submit">Send</button>
</form>

<script>
  document.getElementById('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const { error } = await supabase
      .from('contact_submissions')
      .insert([{
        email: formData.get('email'),
        message: formData.get('message'),
        submitted_at: new Date().toISOString()
      }]);

    if (!error) {
      alert('Message sent!');
      e.target.reset();
    }
  });
</script>
```

#### B. User Preferences

```javascript
// Save user preferences
async function savePreferences(userId, preferences) {
  await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      dark_mode: preferences.darkMode,
      language: preferences.language,
      notifications: preferences.notifications
    });
}

// Load user preferences
async function loadPreferences(userId) {
  const { data } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  return data;
}
```

#### C. Analytics Event Tracking

```javascript
// Track any event
async function trackEvent(eventName, properties = {}) {
  await supabase
    .from('events')
    .insert([{
      event_name: eventName,
      properties: properties,
      user_id: getUserId(), // Your user ID function
      timestamp: new Date().toISOString(),
      page_url: window.location.href,
      referrer: document.referrer
    }]);
}

// Usage
trackEvent('button_click', { button_id: 'signup' });
trackEvent('page_view', { page_title: document.title });
trackEvent('video_play', { video_id: '123', duration: 300 });
```

#### D. Real-Time Updates

```javascript
// Subscribe to changes
supabase
  .channel('public:your_table')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'your_table'
  }, (payload) => {
    console.log('New data:', payload.new);
    // Update UI automatically
    updateUI(payload.new);
  })
  .subscribe();
```

#### E. File Upload

```javascript
// Upload file
async function uploadFile(file) {
  const fileName = `${Date.now()}_${file.name}`;

  const { data, error } = await supabase.storage
    .from('your-bucket')
    .upload(fileName, file);

  if (!error) {
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('your-bucket')
      .getPublicUrl(fileName);

    return publicUrl;
  }
}
```

---

## Project-Specific Examples

### For thegavl.com (Court Simulation)

```sql
-- Store simulation results
CREATE TABLE simulation_results (
  id BIGSERIAL PRIMARY KEY,
  case_id VARCHAR(255),
  plaintiff_score NUMERIC,
  defense_score NUMERIC,
  quantum_probability NUMERIC,
  verdict VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store user feedback
CREATE TABLE user_feedback (
  id BIGSERIAL PRIMARY KEY,
  simulation_id BIGINT REFERENCES simulation_results(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

```javascript
// Save simulation result
async function saveSimulation(caseData, verdict) {
  const { data } = await supabase
    .from('simulation_results')
    .insert([{
      case_id: caseData.id,
      plaintiff_score: verdict.plaintiffScore,
      defense_score: verdict.defenseScore,
      quantum_probability: verdict.quantumProb,
      verdict: verdict.result
    }])
    .select()
    .single();

  return data.id; // Use for linking feedback
}

// Save user feedback
async function saveFeedback(simulationId, rating, feedback) {
  await supabase
    .from('user_feedback')
    .insert([{
      simulation_id: simulationId,
      rating: rating,
      feedback: feedback
    }]);
}
```

### For PilotProgram.TheGavl.com

```sql
-- Pilot program applications
CREATE TABLE pilot_applications (
  id BIGSERIAL PRIMARY KEY,
  country VARCHAR(100) NOT NULL,
  organization VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),
  court_system_size INTEGER,
  proposed_scope TEXT,
  timeline_expectation VARCHAR(100),
  legal_authority_confirmed BOOLEAN DEFAULT FALSE,
  stakeholder_buy_in TEXT,
  technical_infrastructure TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by VARCHAR(255)
);
```

```html
<!-- Pilot Program Application Form -->
<form id="pilotApplication">
  <input name="country" required placeholder="Country">
  <input name="organization" required placeholder="Organization">
  <input name="contact_name" required placeholder="Your Name">
  <input name="contact_email" type="email" required placeholder="Email">
  <input name="contact_phone" placeholder="Phone">
  <input name="court_system_size" type="number" placeholder="# of cases/year">
  <textarea name="proposed_scope" required placeholder="Proposed pilot scope"></textarea>
  <select name="timeline_expectation">
    <option value="3-6 months">3-6 months</option>
    <option value="6-12 months">6-12 months</option>
    <option value="1-2 years">1-2 years</option>
  </select>
  <label>
    <input type="checkbox" name="legal_authority_confirmed" required>
    I confirm we have legal authority to conduct this pilot
  </label>
  <textarea name="stakeholder_buy_in" placeholder="Stakeholder buy-in description"></textarea>
  <textarea name="technical_infrastructure" placeholder="Current tech infrastructure"></textarea>
  <button type="submit">Submit Application</button>
</form>

<script>
  document.getElementById('pilotApplication').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const { data, error } = await supabase
      .from('pilot_applications')
      .insert([{
        country: formData.get('country'),
        organization: formData.get('organization'),
        contact_name: formData.get('contact_name'),
        contact_email: formData.get('contact_email'),
        contact_phone: formData.get('contact_phone'),
        court_system_size: parseInt(formData.get('court_system_size') || '0'),
        proposed_scope: formData.get('proposed_scope'),
        timeline_expectation: formData.get('timeline_expectation'),
        legal_authority_confirmed: formData.has('legal_authority_confirmed'),
        stakeholder_buy_in: formData.get('stakeholder_buy_in'),
        technical_infrastructure: formData.get('technical_infrastructure'),
        status: 'pending'
      }]);

    if (!error) {
      alert('Application submitted! We will contact you within 48 hours.');
      e.target.reset();
    } else {
      alert('Error submitting application. Please try again.');
    }
  });
</script>
```

---

## Security Checklist

For every Supabase project:

1. ✅ **Enable RLS** on all tables
2. ✅ **Use anon key** in frontend (not service role key!)
3. ✅ **Create specific policies** (don't leave tables open)
4. ✅ **Validate input** client-side AND with database constraints
5. ✅ **Rate limit** with Supabase Edge Functions if needed
6. ✅ **Log sensitive actions** (create audit_log table)

---

## Cost Optimization

**Free Tier Limits:**
- 500 MB database
- 1 GB file storage
- 2 GB bandwidth/month
- 50K monthly active users

**When to upgrade** ($25/month Pro tier):
- Database > 500 MB
- Need more than 50K users
- Need daily backups
- Need Point-in-Time Recovery

**How to stay on free tier longer:**
- Archive old data regularly
- Use compression (JSONB is efficient)
- Optimize images before uploading
- Cache data client-side

---

## Migration from Other Databases

### From Firebase

```javascript
// Firebase
db.collection('users').add({ name: 'John' });

// Supabase
supabase.from('users').insert([{ name: 'John' }]);
```

### From MongoDB

```javascript
// MongoDB
db.users.insertOne({ name: 'John' });

// Supabase
supabase.from('users').insert([{ name: 'John' }]);
```

### From MySQL/PostgreSQL

```sql
-- Old
INSERT INTO users (name) VALUES ('John');

-- Supabase (JavaScript)
supabase.from('users').insert([{ name: 'John' }]);
```

---

## Troubleshooting

**"Failed to fetch"**
- Check SUPABASE_URL and key are correct
- Verify CORS is enabled (automatic in Supabase)
- Check network tab for exact error

**"Row level security policy violation"**
- RLS is enabled but no policy allows the operation
- Add appropriate policy in SQL Editor

**"Relation does not exist"**
- Table name is case-sensitive
- Make sure table was created in SQL Editor

**Slow queries**
- Add indexes on commonly queried columns
- Use `.select('id, name')` instead of `.select('*')`
- Consider using views for complex queries

---

## Next Steps

1. **Create Supabase project** for each domain:
   - aios-tracking (already done!)
   - gavl-simulations (for thegavl.com)
   - pilot-programs (for PilotProgram.TheGavl.com)

2. **Copy templates above** and customize for your needs

3. **Deploy** to GitHub Pages (free SSL included!)

4. **Monitor** usage in Supabase dashboard

5. **Export** data regularly (Settings → Backups)

---

## Summary

**For EVERY future project:**
1. Don't buy SSL certificates (GitHub Pages provides free)
2. Don't deploy a backend (use Supabase)
3. Don't manage servers (Supabase does it)
4. Save $100-500/year in hosting costs

**Total cost:**
- **GitHub Pages**: FREE (unlimited bandwidth + SSL)
- **Supabase Free Tier**: FREE (500MB database, 50K users)
- **Custom domains**: $10-15/year (already owned)

**Total: $10-15/year** for unlimited projects! 🎉

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
