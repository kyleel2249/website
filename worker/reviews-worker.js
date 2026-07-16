/**
 * Cintexa Reviews Worker
 * -------------------------------------------------------------
 * Stores visitor reviews in Cloudflare KV and serves them back to the
 * website. This is what makes the reviews section on the homepage real:
 * without this Worker deployed, reviews submitted by one visitor would
 * never be seen by anyone else, since there'd be nowhere shared to store them.
 *
 * SETUP:
 *   1. Create a KV namespace:
 *        wrangler kv:namespace create "CINTEXA_REVIEWS"
 *      This prints a namespace ID — paste it into wrangler-reviews.toml
 *      where it says <YOUR_KV_NAMESPACE_ID>.
 *   2. wrangler deploy --config wrangler-reviews.toml
 *   3. Update REVIEWS_ENDPOINT in /js/reviews.js to your deployed Worker URL
 *
 * This file is complete and production-ready as written. The only missing
 * piece is creating the actual KV namespace and binding it, which requires
 * your own Cloudflare account access.
 *
 * Endpoints:
 *   GET  /reviews        → returns all approved reviews + aggregate stats
 *   POST /reviews        → submits a new review (held for moderation by default)
 */

const ALLOWED_ORIGINS = [
  'https://www.cintexa.com',
  'https://cintexa.com',
  'https://cintexa.pages.dev', // adjust to your actual Firebase/Cloudflare Pages domain
];

// If true, new reviews are stored but not returned by GET /reviews until
// manually approved (see the moderation note at the bottom of this file).
// Set to false if you want reviews to appear immediately on submission —
// simpler, but means anyone can post anything live with no review step.
const REQUIRE_MODERATION = true;

const MAX_REVIEWS_RETURNED = 50;

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    const url = new URL(request.url);

    if (url.pathname === '/reviews' && request.method === 'GET') {
      return handleGet(request, env);
    }

    if (url.pathname === '/reviews' && request.method === 'POST') {
      return handlePost(request, env);
    }

    return jsonResponse({ error: 'Not found' }, 404, request);
  },
};

async function handleGet(request, env) {
  if (!env.CINTEXA_REVIEWS) {
    return jsonResponse({ error: 'Server not configured. Missing CINTEXA_REVIEWS KV binding.' }, 500, request);
  }

  try {
    const indexRaw = await env.CINTEXA_REVIEWS.get('_index');
    const index = indexRaw ? JSON.parse(indexRaw) : [];

    const reviews = [];
    for (const id of index.slice(0, MAX_REVIEWS_RETURNED)) {
      const raw = await env.CINTEXA_REVIEWS.get(`review:${id}`);
      if (raw) {
        const review = JSON.parse(raw);
        if (!REQUIRE_MODERATION || review.approved) {
          reviews.push(review);
        }
      }
    }

    reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const count = reviews.length;
    const average = count === 0 ? 0 : reviews.reduce((sum, r) => sum + r.rating, 0) / count;
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => { distribution[r.rating] = (distribution[r.rating] || 0) + 1; });

    return jsonResponse({
      reviews: reviews.map(r => ({
        name: r.name,
        company: r.company || null,
        rating: r.rating,
        text: r.text,
        createdAt: r.createdAt,
      })),
      stats: {
        count,
        average: Math.round(average * 10) / 10,
        distribution,
      },
    }, 200, request);
  } catch (err) {
    console.error('Reviews GET error:', err);
    return jsonResponse({ error: 'Internal error' }, 500, request);
  }
}

async function handlePost(request, env) {
  if (!env.CINTEXA_REVIEWS) {
    return jsonResponse({ error: 'Server not configured. Missing CINTEXA_REVIEWS KV binding.' }, 500, request);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, request);
  }

  const name = String(body.name || '').trim().slice(0, 100);
  const company = String(body.company || '').trim().slice(0, 100);
  const text = String(body.text || '').trim().slice(0, 1000);
  const rating = Number(body.rating);

  if (!name || !text) {
    return jsonResponse({ error: 'Name and review text are required.' }, 400, request);
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return jsonResponse({ error: 'Rating must be a whole number from 1 to 5.' }, 400, request);
  }

  // Basic spam guard: reject reviews that are mostly links, or absurdly short.
  const linkCount = (text.match(/https?:\/\//g) || []).length;
  if (linkCount > 1 || text.length < 8) {
    return jsonResponse({ error: 'Review rejected.' }, 400, request);
  }

  const id = crypto.randomUUID();
  const review = {
    id,
    name,
    company,
    text,
    rating,
    createdAt: new Date().toISOString(),
    approved: !REQUIRE_MODERATION, // auto-approved only if moderation is off
  };

  try {
    await env.CINTEXA_REVIEWS.put(`review:${id}`, JSON.stringify(review));

    const indexRaw = await env.CINTEXA_REVIEWS.get('_index');
    const index = indexRaw ? JSON.parse(indexRaw) : [];
    index.unshift(id);
    await env.CINTEXA_REVIEWS.put('_index', JSON.stringify(index.slice(0, 500))); // cap stored history

    return jsonResponse({
      success: true,
      pendingModeration: REQUIRE_MODERATION,
    }, 200, request);
  } catch (err) {
    console.error('Reviews POST error:', err);
    return jsonResponse({ error: 'Internal error' }, 500, request);
  }
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin');
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

/**
 * MODERATION NOTE:
 * With REQUIRE_MODERATION = true (the default), new reviews are stored with
 * approved: false and will NOT show up via GET /reviews until you flip that
 * flag. To approve a review manually right now, the simplest method is the
 * Cloudflare dashboard: KV > your namespace > find the review:<id> key >
 * edit the JSON value > set "approved": true > save.
 *
 * If you'd rather reviews go live immediately with no moderation step, set
 * REQUIRE_MODERATION to false above. This trades safety for simplicity —
 * anyone can post anything and it appears on your site instantly.
 */
