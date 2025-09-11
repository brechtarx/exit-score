// Simple validation utilities

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function verifyRecaptcha(token) {
  if (!token) return { ok: false, score: 0, reason: 'missing_token' };
  const params = new URLSearchParams();
  params.append('secret', process.env.RECAPTCHA_SECRET_KEY || '');
  params.append('response', token);
  const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  const data = await resp.json();
  return { ok: !!data.success && (data.score || 0) >= 0.5, score: data.score || 0 };
}

module.exports = { validateEmail, verifyRecaptcha };

