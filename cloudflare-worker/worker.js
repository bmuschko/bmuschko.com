// Cloudflare Worker — proxies requests to Google Gemini API
// The GEMINI_API_KEY is stored as a Cloudflare secret, never exposed to the client.

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const ALLOWED_ORIGINS = [
  'https://bmuschko.com',
  'http://localhost:1313',
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders(origin) });
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    try {
      const body = await request.text();
      const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
      });

      const geminiBody = await geminiRes.text();
      return new Response(geminiBody, {
        status: geminiRes.status,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }
  },
};
