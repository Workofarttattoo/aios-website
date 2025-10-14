// Ai|oS Cookie Consent & Visitor Tracking System
// GDPR/CCPA Compliant - Click = Consent

(function() {
  'use strict';

  const TRACKING_API = 'https://your-backend.railway.app/api/track'; // TODO: Set up backend
  const COOKIE_NAME = 'aios_consent';
  const COOKIE_EXPIRY_DAYS = 365;

  // Detect visitor type (government/judicial/enterprise/individual)
  function detectVisitorType() {
    const hostname = window.location.hostname;
    const referrer = document.referrer.toLowerCase();
    const userAgent = navigator.userAgent.toLowerCase();

    // Government TLDs: .gov, .mil, .gc.ca, etc.
    const isGov = /\.gov|\.mil|\.gc\.ca|\.gov\.uk|\.gouv\.fr/.test(referrer);

    // Judicial keywords in referrer
    const isJudicial = /court|judicial|justice|legal|judiciary|tribunal|magistrate/.test(referrer);

    // Enterprise detection (LinkedIn, corporate domains)
    const isEnterprise = /linkedin|fortune|bloomberg|wsj/.test(referrer) ||
                        /\.(edu|org)$/.test(referrer);

    if (isGov || isJudicial) return 'government_judicial';
    if (isEnterprise) return 'enterprise';
    return 'individual';
  }

  // Get geolocation (approximate)
  async function getLocation() {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      return {
        country: data.country_name,
        region: data.region,
        city: data.city,
        ip: data.ip,
        org: data.org // ISP/Organization name
      };
    } catch (error) {
      console.error('Geolocation failed:', error);
      return null;
    }
  }

  // Check if cookie consent already given
  function hasConsent() {
    return document.cookie.split(';').some(item => item.trim().startsWith(COOKIE_NAME + '='));
  }

  // Set consent cookie
  function setConsent(visitorData) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000));
    const cookieValue = JSON.stringify({
      consentedAt: new Date().toISOString(),
      visitorId: visitorData.visitorId
    });
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(cookieValue)}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
  }

  // Send tracking data to backend
  async function trackVisitor(eventType = 'pageview') {
    const location = await getLocation();
    const visitorType = detectVisitorType();

    const trackingData = {
      // Who
      visitorId: generateVisitorId(),
      visitorType: visitorType,
      userAgent: navigator.userAgent,
      language: navigator.language,
      organization: location?.org || 'Unknown',

      // What
      eventType: eventType,
      page: window.location.pathname,
      pageTitle: document.title,

      // When
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

      // Where
      location: location,
      referrer: document.referrer || 'Direct',

      // Why (inferred from behavior)
      intent: inferIntent(),

      // Device & Tech
      screenResolution: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      deviceType: getDeviceType(),

      // Session
      sessionId: getSessionId(),
      isReturningVisitor: hasConsent()
    };

    // Send to backend
    try {
      await fetch(TRACKING_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackingData)
      });

      // If government/judicial visitor, show enterprise pitch
      if (visitorType === 'government_judicial') {
        showEnterprisePitch();
      }

      // Set consent cookie
      setConsent(trackingData);

    } catch (error) {
      console.error('Tracking failed:', error);
    }
  }

  // Generate unique visitor ID
  function generateVisitorId() {
    const stored = localStorage.getItem('aios_visitor_id');
    if (stored) return stored;

    const id = 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('aios_visitor_id', id);
    return id;
  }

  // Get session ID
  function getSessionId() {
    const stored = sessionStorage.getItem('aios_session_id');
    if (stored) return stored;

    const id = 's_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('aios_session_id', id);
    return id;
  }

  // Infer user intent from behavior
  function inferIntent() {
    const page = window.location.pathname.toLowerCase();
    if (page.includes('demo')) return 'trial_interest';
    if (page.includes('api') || page.includes('docs')) return 'technical_evaluation';
    if (page.includes('quantum')) return 'technology_research';
    if (page.includes('security')) return 'security_assessment';
    if (page.includes('about')) return 'company_research';
    return 'general_interest';
  }

  // Detect device type
  function getDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
    return 'desktop';
  }

  // Show enterprise pitch for government/judicial visitors
  function showEnterprisePitch() {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.id = 'enterprise-pitch-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s ease;
    `;

    modal.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: 2px solid #00ff88;
        border-radius: 20px;
        padding: 40px;
        max-width: 600px;
        box-shadow: 0 20px 60px rgba(0, 255, 136, 0.3);
        text-align: center;
      ">
        <h2 style="color: #00ff88; font-size: 32px; margin-bottom: 20px;">
          🏛️ Enterprise Edition Available
        </h2>
        <p style="color: #fff; font-size: 18px; line-height: 1.6; margin-bottom: 30px;">
          We detected you're visiting from a <strong>government or judicial organization</strong>.
          <br><br>
          The GAVL Enterprise Edition offers:
        </p>
        <ul style="color: #00ff88; font-size: 16px; text-align: left; margin: 20px 40px; line-height: 2;">
          <li>✅ Pilot program deployment assistance</li>
          <li>✅ On-site training and installation</li>
          <li>✅ Lower court trial runs</li>
          <li>✅ Quantum-enhanced verdict simulation</li>
          <li>✅ Three-person oversight system</li>
          <li>✅ Full transparency and audit trails</li>
        </ul>
        <p style="color: #fff; font-size: 16px; margin: 20px 0;">
          <strong>Interested in a pilot program?</strong>
        </p>
        <div style="display: flex; gap: 20px; justify-content: center; margin-top: 30px;">
          <a href="https://PilotProgram.TheGavl.com" style="
            background: linear-gradient(135deg, #00ff88, #00d4ff);
            color: #000;
            padding: 15px 30px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: bold;
            font-size: 18px;
            transition: all 0.3s;
          ">
            Learn More →
          </a>
          <button onclick="this.closest('#enterprise-pitch-modal').remove()" style="
            background: transparent;
            border: 2px solid #fff;
            color: #fff;
            padding: 15px 30px;
            border-radius: 10px;
            cursor: pointer;
            font-weight: bold;
            font-size: 18px;
          ">
            Maybe Later
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Track enterprise pitch shown
    trackVisitor('enterprise_pitch_shown');
  }

  // Track link clicks
  function trackLinkClick(event) {
    const link = event.target.closest('a');
    if (link) {
      trackVisitor('link_click');
    }
  }

  // Initialize tracking on ANY click (consent model)
  function initTracking() {
    // If already consented, track this pageview
    if (hasConsent()) {
      trackVisitor('pageview');
      return;
    }

    // Wait for first click = consent
    const handleFirstClick = () => {
      trackVisitor('first_visit_consent');
      document.removeEventListener('click', handleFirstClick);

      // Track subsequent link clicks
      document.addEventListener('click', trackLinkClick);
    };

    document.addEventListener('click', handleFirstClick, { once: true });
  }

  // Start tracking when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTracking);
  } else {
    initTracking();
  }

  // Expose API for manual tracking
  window.aiosTracking = {
    track: trackVisitor,
    hasConsent: hasConsent,
    getVisitorId: generateVisitorId
  };

})();
