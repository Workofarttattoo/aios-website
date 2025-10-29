# Supabase Email Notifications Setup

This guide explains how to set up email notifications for Ai:oS user signups.

## Step 1: Create the Database Table

Run the SQL schema in your Supabase SQL Editor:

```bash
# Open Supabase Dashboard
https://supabase.com/dashboard/project/cszoklkfdszqsxhufhhj

# Go to SQL Editor and run:
AIOS_USERS_SCHEMA.sql
```

## Step 2: Create Supabase Edge Function for Welcome Emails

### Create the function:

1. Go to **Edge Functions** in your Supabase dashboard
2. Click **New Function**
3. Name it: `send-welcome-email`
4. Use the following code:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const { email, name } = await req.json()

    // Configure your email provider (SendGrid, Resend, etc.)
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Ai:oS <hello@aios.is>',
        to: [email],
        subject: 'Welcome to Ai:oS!',
        html: `
          <h1>Welcome to Ai:oS, ${name}!</h1>
          <p>Thank you for signing up for Ai:oS access.</p>

          <h2>Your Download Links:</h2>
          <ul>
            <li><a href="https://aios.is/downloads/aios-installer.sh">Ai:oS Installer</a></li>
            <li><a href="https://aios.is/downloads/aios-full-package.zip">Full Package (ZIP)</a></li>
            <li><a href="https://aios.is/docs.html">Documentation</a></li>
          </ul>

          <h2>Quick Start:</h2>
          <pre>
# Download and run installer
curl -O https://aios.is/downloads/aios-installer.sh
chmod +x aios-installer.sh
./aios-installer.sh

# Or extract the ZIP package
unzip aios-full-package.zip
cd aios
./aios -v boot
          </pre>

          <h2>What's Included:</h2>
          <ul>
            <li>Ai:oS Runtime - Agentic control-plane</li>
            <li>Meta-Agent System - Kernel, Security, Networking, etc.</li>
            <li>Sovereign Security Toolkit - 8 defensive tools</li>
            <li>Complete Documentation</li>
            <li>Example Manifests</li>
          </ul>

          <h2>Need Help?</h2>
          <p>Email us at: <a href="mailto:inventor@aios.is">inventor@aios.is</a></p>
          <p>Visit: <a href="https://aios.is">https://aios.is</a></p>

          <p>Happy hacking!</p>
          <p>- The Ai:oS Team</p>
        `
      })
    })

    const data = await res.json()

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
})
```

## Step 3: Set Up Email Provider

### Option 1: Resend (Recommended)

1. Sign up at https://resend.com
2. Get your API key
3. In Supabase, go to **Edge Functions > Settings**
4. Add secret: `RESEND_API_KEY` = your-api-key

### Option 2: SendGrid

1. Sign up at https://sendgrid.com
2. Get your API key
3. Update the edge function code to use SendGrid API
4. Add secret: `SENDGRID_API_KEY`

### Option 3: Use Supabase Auth Emails

Alternatively, you can use Supabase's built-in email templates:

1. Go to **Authentication > Email Templates**
2. Customize the templates
3. Enable email in Auth settings

## Step 4: Test the Setup

```javascript
// Test email sending from browser console
const { data, error } = await supabaseClient.functions.invoke('send-welcome-email', {
  body: {
    email: 'test@example.com',
    name: 'Test User'
  }
})

console.log('Result:', data, error)
```

## Step 5: Monitor Signups

View all signups in Supabase:

```sql
-- All users
SELECT * FROM aios_users ORDER BY signup_date DESC;

-- Users who signed up today
SELECT * FROM aios_users WHERE signup_date::date = CURRENT_DATE;

-- Use case breakdown
SELECT use_case, COUNT(*) FROM aios_users GROUP BY use_case;

-- Newsletter subscribers
SELECT email, name FROM aios_users WHERE newsletter = true;
```

## Troubleshooting

### Email not sending?

1. Check Edge Function logs in Supabase dashboard
2. Verify RESEND_API_KEY is set correctly
3. Check Resend dashboard for delivery status
4. Verify "from" email is verified in Resend

### User signup failing?

1. Check browser console for errors
2. Verify Supabase URL and anon key in signup.html
3. Check RLS policies are correct
4. Verify table exists: `SELECT * FROM aios_users LIMIT 1;`

## Email Template Customization

Edit the HTML in the Edge Function to customize:

- Branding (add logo, colors)
- Content (add more details, links)
- Call-to-action buttons
- Support information

## Analytics

Track email opens and clicks with Resend:

```typescript
// Add tracking to links
html: `
  <a href="https://aios.is/docs.html?utm_source=email&utm_campaign=welcome">
    Documentation
  </a>
`
```

## Next Steps

- Set up automated welcome series
- Send updates about new releases
- Newsletter for updates
- Re-engagement emails for inactive users
