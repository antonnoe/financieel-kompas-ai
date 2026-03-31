import { createHmac } from 'crypto';

const TOKEN_TTL_SECONDS = 8 * 60 * 60; // 8 uur, zelfde als CC

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' });
  }

  const token = req.query.token;
  if (!token) {
    return res.status(400).json({ valid: false, reason: 'missing_token' });
  }

  const secret = process.env.INFOFRANKRIJK_SSO_SECRET;
  if (!secret) {
    console.error('[verify-token] INFOFRANKRIJK_SSO_SECRET niet geconfigureerd');
    return res.status(500).json({ valid: false, reason: 'no_secret' });
  }

  // Decodeer base64 → JSON (zelfde formaat als CC lib/auth/sso.ts)
  let payload;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    payload = JSON.parse(decoded);
  } catch {
    return res.status(400).json({ valid: false, reason: 'invalid_format' });
  }

  if (!payload.email || !payload.timestamp || !payload.signature) {
    return res.status(400).json({ valid: false, reason: 'invalid_format' });
  }

  // Controleer HMAC-SHA256 (identiek aan CC)
  const message = `${payload.email}:${payload.timestamp}`;
  const expectedSignature = createHmac('sha256', secret)
    .update(message)
    .digest('hex');

  if (payload.signature !== expectedSignature) {
    return res.status(403).json({ valid: false, reason: 'invalid_signature' });
  }

  // Controleer TTL (8 uur)
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = payload.timestamp + TOKEN_TTL_SECONDS;

  if (now > expiresAt) {
    return res.status(403).json({ valid: false, reason: 'expired' });
  }

  return res.status(200).json({ valid: true, email: payload.email, expiresAt });
}
