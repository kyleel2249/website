/**
 * Cintexa Contact Form Worker
 * -------------------------------------------------------------
 * Receives a POST from the homepage contact form and delivers it as an
 * email to info@cintexa.com using Resend's HTTP API (https://resend.com).
 *
 * Why Resend and not raw SMTP: Cloudflare Workers cannot open raw SMTP
 * connections. Sending real email from a Worker requires calling a
 * transactional email provider's HTTP API instead. Resend is used here
 * because its API is a single HTTP call with no extra setup beyond a
 * verified sending domain, but any provider with an HTTP API (SendGrid,
 * Mailgun, Postmark) would work with minor changes to the fetch() call below.
 *
 * SETUP:
 *   1. Create a free Resend account at https://resend.com
 *   2. Verify your sending domain (cintexa.com) in Resend's dashboard —
 *      this requires adding a few DNS records (SPF/DKIM) at your domain
 *      registrar or Cloudflare DNS. Until the domain is verified, Resend
 *      will only let you send to your own account email for testing.
 *   3. Create a Resend API key, then run:
 *        wrangler secret put RESEND_API_KEY
 *      (paste the key when prompted — never hardcode it in this file)
 *   4. wrangler deploy
 *   5. Update CONTACT_ENDPOINT in /js/main.js to your deployed Worker URL
 *
 * This file is complete and production-ready as written. The only missing
 * pieces are the Resend account/API key and domain verification, which
 * only you can set up since they require access to cintexa.com's DNS.
 */

const ALLOWED_ORIGINS = [
  'https://www.cintexa.com',
  'https://cintexa.com',
  'https://cintexa.pages.dev', // adjust to your actual Firebase/Cloudflare Pages domain
];

const RECIPIENT = 'info@cintexa.com';
// Resend requires the "from" address to be on a domain you've verified with them.
// Until cintexa.com is verified, you can temporarily use Resend's shared
// onboarding address (onboarding@resend.dev) for testing only.
const SEND_FROM = 'Cintexa Website <noreply@cintexa.com>';

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405, request);
    }

    const url = new URL(request.url);
    if (url.pathname !== '/contact') {
      return jsonResponse({ error: 'Not found' }, 404, request);
    }

    if (!env.RESEND_API_KEY) {
      return jsonResponse({ error: 'Server not configured. Missing RESEND_API_KEY secret.' }, 500, request);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400, request);
    }

    const name = String(body.name || '').trim().slice(0, 200);
    const email = String(body.email || '').trim().slice(0, 200);
    const company = String(body.company || '').trim().slice(0, 200);
    const message = String(body.message || '').trim().slice(0, 5000);

    // Server-side validation — never trust client-side checks alone.
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!name || !email || !message) {
      return jsonResponse({ error: 'Name, email, and message are required.' }, 400, request);
    }
    if (!emailPattern.test(email)) {
      return jsonResponse({ error: 'Please provide a valid email address.' }, 400, request);
    }

    // Basic honeypot/spam guard: reject submissions with obvious link-spam patterns.
    const linkCount = (message.match(/https?:\/\//g) || []).length;
    if (linkCount > 3) {
      return jsonResponse({ error: 'Message rejected.' }, 400, request);
    }

    const escapeHtml = (str) => str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const htmlBody = `
      <h2>New contact form submission</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      ${company ? `<p><strong>Company:</strong> ${escapeHtml(company)}</p>` : ''}
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
    `;

    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: SEND_FROM,
          to: [RECIPIENT],
          reply_to: email, // lets info@cintexa.com hit "Reply" and respond straight to the sender
          subject: `New website inquiry from ${name}`,
          html: htmlBody,
        }),
      });

      if (!emailRes.ok) {
        const errText = await emailRes.text();
        console.error('Resend API error:', emailRes.status, errText);
        return jsonResponse({ error: 'Failed to send message. Please try again or email info@cintexa.com directly.' }, 502, request);
      }

      return jsonResponse({ success: true }, 200, request);
    } catch (err) {
      console.error('Worker error:', err);
      return jsonResponse({ error: 'Internal error' }, 500, request);
    }
  },
};

function corsHeaders(request) {
  const origin = request.headers.get('Origin');
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function handleOptions(request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

function jsonResponse(obj, status, request) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(request),
    },
  });
}
