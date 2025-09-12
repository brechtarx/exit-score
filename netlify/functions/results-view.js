const fs = require('fs');
const path = require('path');

// Load questions structure (same as other functions)
let QUESTIONS = null;
try {
  QUESTIONS = require('../../questions.json');
} catch (_) {
  const p = path.join(__dirname, '../../questions.json');
  QUESTIONS = JSON.parse(fs.readFileSync(p, 'utf8'));
}

exports.handler = async (event) => {
  let id = (event.queryStringParameters && (event.queryStringParameters.id || event.queryStringParameters.assessment_id)) || '';
  // Allow incoming ":abc" style (human pasted route template) by stripping a leading colon
  id = id.replace(/^:/, '');
  if (!id) {
    return resp(400, 'Missing id');
  }

  try {
    // Fetch assessment from Supabase (server-side only; omit PII in view)
    const url = `${process.env.SUPABASE_URL}/rest/v1/assessments?id=eq.${encodeURIComponent(id)}&select=id,created_at,industry,zipcode,revenue_numeric,employees_numeric,score,responses`;
    const r = await fetch(url, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      }
    });
    if (!r.ok) {
      return resp(500, 'Failed to load assessment');
    }
    const rows = await r.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return resp(404, 'Not found');
    }
    const a = rows[0];

    const breakdown = calculateCategoryScores(a.responses || []);
    const html = renderHtml({ id: a.id, industry: a.industry, score: a.score, breakdown, responses: a.responses || [] });
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Robots-Tag': 'noindex, nofollow'
      },
      body: html
    };
  } catch (e) {
    return resp(500, 'Error');
  }
};

function resp(code, msg) {
  return {
    statusCode: code,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' },
    body: `<!doctype html><meta name="robots" content="noindex,nofollow"><body style="font-family:Inter,Arial,sans-serif;padding:24px"><h1>Results</h1><p>${msg}</p></body>`
  };
}

function calculateCategoryScores(responses) {
  const out = QUESTIONS.categories.map((cat, ci) => {
    let catScore = 0, total = 0;
    cat.questions.forEach((q, qi) => {
      total += q.weight;
      const r = (responses || []).find(x => x.category === ci && x.question === qi);
      if (!r) return;
      if (r.answer === true) catScore += q.weight;
      else if (r.answer === null) catScore += q.weight * 0.15;
    });
    const pct = total ? Math.round((catScore / total) * 100) : 0;
    return { name: cat.name, percent: pct };
  });
  return out;
}

function renderHtml({ id, industry, score, breakdown, responses }) {
  const css = `body{font-family:Inter,Arial,sans-serif;background:#f8fafc;margin:0;color:#0f172a} .wrap{max-width:920px;margin:0 auto;padding:32px} .hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px} .logo{height:36px} .chip{background:#F0F1F2;color:#101620;padding:4px 10px;border-radius:999px;font-weight:600;font-size:12px} .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;margin-top:16px} h1{font-size:26px;margin:8px 0} h2{font-size:18px;margin:8px 0} .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px} .bar{height:8px;background:#F0F1F2;border-radius:999px;overflow:hidden} .bar span{display:block;height:100%;background:#416EA6} .muted{color:#64748b} ul{margin:6px 0 0 18px} li{margin:2px 0}`;

  const catHtml = breakdown.map(b => `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="font-weight:600">${escapeHtml(b.name)}</div>
        <div style="font-weight:700">${b.percent}%</div>
      </div>
      <div class="bar"><span style="width:${b.percent}%"></span></div>
      <div style="margin-top:8px">${renderQuestionsForCategory(b.name, responses)}</div>
    </div>`).join('');

  return `<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8"/>
    <meta name="robots" content="noindex,nofollow" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Exit Score Results #${id}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="preload" as="style" onload="this.rel='stylesheet'">
    <style>${css}</style>
  </head>
  <body>
    <div class="wrap">
      <div class="hdr">
        <div style="display:flex;align-items:center;gap:12px">
          <img class="logo" src="https://score.arxbrokers.com/assets/images/arx_logo_Logo_basic_rich_black.png" alt="ARX"/>
          <div class="chip">Internal Results View</div>
        </div>
        <div class="muted">ID #${id}</div>
      </div>
      <div class="card" style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <h1>Exit Score Summary</h1>
          <div class="muted">Industry: ${escapeHtml(industry || 'N/A')}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:40px;font-weight:800;color:#416EA6">${score || 0}%</div>
          <div class="muted">Overall Score</div>
        </div>
      </div>
      ${catHtml}
      <div class="muted" style="margin-top:16px">PII intentionally omitted. Share this link with internal team only.</div>
    </div>
  </body>
  </html>`;
}

function renderQuestionsForCategory(catName, responses) {
  const ci = QUESTIONS.categories.findIndex(c => c.name === catName);
  if (ci < 0) return '';
  const qs = QUESTIONS.categories[ci].questions;
  const items = qs.map((q, qi) => {
    const r = (responses || []).find(x => x.category === ci && x.question === qi);
    const val = r ? (r.answer === true ? 'Yes' : r.answer === false ? 'No' : "Don't Know") : '—';
    return `<li><strong>${escapeHtml(q.text)}</strong> — <span class="muted">${val}</span></li>`;
  }).join('');
  return `<ul>${items}</ul>`;
}

function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }
