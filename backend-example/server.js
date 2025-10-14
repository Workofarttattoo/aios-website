// GAVL Tracking Backend - Simple Express Server
// Deploy to Railway.app or Render.com

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    'https://aios.is',
    'https://www.aios.is',
    'https://thegavl.com',
    'https://www.thegavl.com',
    'https://PilotProgram.TheGavl.com'
  ]
}));
app.use(express.json());

// Rate limiting (prevent abuse)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// In-memory storage (replace with PostgreSQL/MongoDB for production)
const visitors = [];
const enterprises = [];

// Tracking endpoint
app.post('/api/track', async (req, res) => {
  try {
    const trackingData = req.body;

    // Validate data
    if (!trackingData.visitorId || !trackingData.timestamp) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Store visitor data
    visitors.push({
      ...trackingData,
      serverTimestamp: new Date().toISOString(),
      ip: req.ip || req.headers['x-forwarded-for']
    });

    // If government/judicial visitor, flag for enterprise follow-up
    if (trackingData.visitorType === 'government_judicial') {
      enterprises.push({
        visitorId: trackingData.visitorId,
        timestamp: trackingData.timestamp,
        location: trackingData.location,
        organization: trackingData.organization,
        referrer: trackingData.referrer,
        pitch_shown: trackingData.eventType === 'enterprise_pitch_shown',
        priority: 'high'
      });

      console.log(`🏛️  ENTERPRISE LEAD: ${trackingData.organization} from ${trackingData.location?.country}`);
    }

    // Log interesting events
    if (trackingData.eventType === 'first_visit_consent') {
      console.log(`✅ New visitor consent: ${trackingData.visitorId} from ${trackingData.location?.country}`);
    }

    if (trackingData.eventType === 'link_click') {
      console.log(`🔗 Link clicked: ${trackingData.page} by ${trackingData.visitorId}`);
    }

    res.status(200).json({
      success: true,
      visitorId: trackingData.visitorId,
      tracked: true
    });

  } catch (error) {
    console.error('Tracking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Analytics dashboard (basic)
app.get('/api/analytics', (req, res) => {
  const auth = req.headers.authorization;

  // Simple auth (replace with proper authentication)
  if (auth !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const stats = {
    total_visitors: visitors.length,
    unique_visitors: new Set(visitors.map(v => v.visitorId)).size,
    government_judicial: visitors.filter(v => v.visitorType === 'government_judicial').length,
    enterprise_leads: enterprises.length,
    countries: [...new Set(visitors.map(v => v.location?.country).filter(Boolean))],
    top_pages: getTopPages(),
    intents: getIntentBreakdown(),
    recent_enterprise_leads: enterprises.slice(-10).reverse()
  };

  res.json(stats);
});

// Helper: Get top pages
function getTopPages() {
  const pageCounts = {};
  visitors.forEach(v => {
    const page = v.page || '/';
    pageCounts[page] = (pageCounts[page] || 0) + 1;
  });
  return Object.entries(pageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([page, count]) => ({ page, count }));
}

// Helper: Get intent breakdown
function getIntentBreakdown() {
  const intents = {};
  visitors.forEach(v => {
    const intent = v.intent || 'unknown';
    intents[intent] = (intents[intent] || 0) + 1;
  });
  return intents;
}

// Enterprise leads export (CSV)
app.get('/api/enterprise-leads/export', (req, res) => {
  const auth = req.headers.authorization;

  if (auth !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // CSV export
  let csv = 'Visitor ID,Timestamp,Country,Region,City,Organization,Referrer,Pitch Shown,Priority\n';

  enterprises.forEach(lead => {
    csv += `${lead.visitorId},${lead.timestamp},${lead.location?.country},${lead.location?.region},${lead.location?.city},${lead.organization},${lead.referrer},${lead.pitch_shown},${lead.priority}\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=enterprise-leads.csv');
  res.send(csv);
});

// GDPR: Right to be forgotten
app.delete('/api/visitor/:visitorId', (req, res) => {
  const { visitorId } = req.params;

  // Remove from visitors array
  const initialLength = visitors.length;
  const filtered = visitors.filter(v => v.visitorId !== visitorId);

  if (filtered.length < initialLength) {
    visitors.length = 0;
    visitors.push(...filtered);

    // Remove from enterprises too
    const enterpriseFiltered = enterprises.filter(e => e.visitorId !== visitorId);
    enterprises.length = 0;
    enterprises.push(...enterpriseFiltered);

    console.log(`🗑️  GDPR deletion: Removed data for ${visitorId}`);
    res.json({ success: true, message: 'Data deleted' });
  } else {
    res.status(404).json({ error: 'Visitor not found' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    visitors_tracked: visitors.length,
    enterprise_leads: enterprises.length
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 GAVL Tracking Server running on port ${PORT}`);
  console.log(`📊 Analytics: http://localhost:${PORT}/api/analytics`);
  console.log(`🏥 Health: http://localhost:${PORT}/health\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});
