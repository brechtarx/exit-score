const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const {
      score = 0,
      name = '',
      email = '',
      company = 'Your Business',
      industry = '',
      breakdown = [],
      logoUrl,
      letterheadUrl
    } = JSON.parse(event.body || '{}');

    // Allow environment overrides
    const envLogo = process.env.PDF_LOGO_URL;
    const envLetter = process.env.PDF_LETTERHEAD_URL;
    // Resolve assets: prefer env vars; ensure they are reachable, otherwise fall back
    async function resolveAsset(url, fallback) {
      if (!url) return fallback;
      try {
        const resp = await fetch(url, { method: 'HEAD' });
        if (resp.ok) return url;
      } catch (_) {}
      return fallback;
    }

    const finalLogo = await resolveAsset(logoUrl || envLogo, 'https://score.arxbrokers.com/arx_website_blueblack.webp');
    const finalLetter = await resolveAsset(letterheadUrl || envLetter, null);
    console.log('[PDF] Input:', { score, name, email, company, industry, breakdownLen: Array.isArray(breakdown)? breakdown.length : 0 });
    console.log('[PDF] Assets:', { finalLogo, finalLetter });

    const html = buildHtml({
      score, name, email, company, industry, breakdown,
      logoUrl: finalLogo,
      letterheadUrl: finalLetter
    });

    const executablePath = await chromium.executablePath();
    console.log('[PDF] Launching Chromium at', executablePath);
    const browser = await puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });
    const page = await browser.newPage();
    page.on('pageerror', (err) => console.error('[PDF] Page error:', err && err.message || err));
    page.on('requestfailed', (req) => console.warn('[PDF] Request failed:', req.url(), req.failure() && req.failure().errorText));
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    console.log('[PDF] HTML set, generating PDF');
    const pdf = await page.pdf({
      printBackground: true,
      format: 'Letter',
      margin: { top: '20mm', right: '16mm', bottom: '20mm', left: '16mm' }
    });
    await browser.close();
    console.log('[PDF] PDF generated, size(bytes):', pdf.length);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${makeFilename(company)}"`
      },
      body: pdf.toString('base64'),
      isBase64Encoded: true
    };
  } catch (e) {
    console.error('[PDF] Error:', e && e.message, e && e.stack);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'PDF generation failed', message: e && e.message })
    };
  }
};

function buildHtml({ score, name, email, company, industry, breakdown, logoUrl, letterheadUrl }) {
  const primary = '#101620';
  const accent = '#416EA6';
  const light = '#F0F1F2';
  const resolvedLogo = logoUrl || 'https://score.arxbrokers.com/assets/images/arx_logo_Logo_basic_rich_black.png';
  const fallbackLogo = 'https://score.arxbrokers.com/arx_website_blueblack.webp';

  const rows = breakdown.map(b => `
    <tr>
      <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb;">${b.name}</td>
      <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; text-align:right; font-weight:600;">${b.percent}%</td>
    </tr>
  `).join('');

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Open Sans', system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color: #111827; }
        h1,h2,h3 { font-family: 'Inter', sans-serif; }
        .letterhead { ${letterheadUrl ? `background: url('${letterheadUrl}') no-repeat center top / cover;` : ''} }
        .header { display:flex; align-items:center; justify-content:space-between; padding: 16px 0; border-bottom: 2px solid ${light}; }
        .brand { display:flex; align-items:center; gap:12px; }
        .score { font-size: 48px; font-weight: 700; color: ${accent}; }
        .chip { display:inline-block; background:${light}; color:${primary}; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:600; }
        .section { margin-top: 20px; }
        .footer { margin-top: 24px; font-size: 12px; color: #6b7280; }
        .bar { height: 8px; background: ${light}; border-radius: 999px; overflow: hidden; }
        .bar > span { display:block; height:100%; background:${accent}; }
        .muted { color:#6b7280; }
        .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .card { border:1px solid #e5e7eb; border-radius:12px; padding:12px 16px; }
        .cta { display:inline-block; background:${primary}; color:#fff; padding:10px 16px; border-radius:8px; text-decoration:none; font-weight:600; }
        .sm { font-size: 12px; }
      </style>
    </head>
    <body class="letterhead">
      <div class="header">
        <div class="brand">
          <img id="logo" src="${resolvedLogo}" alt="ARX" style="height:34px" />
          <div style="font-weight:800; font-size:18px; color:${primary};">ARX Business Brokers</div>
        </div>
        <div class="chip">Exit Score Report</div>
      </div>

      <div class="section">
        <h1 style="margin: 8px 0 0 0;">${company}</h1>
        <div style="color:#374151;">${industry || 'Industry N/A'}</div>
      </div>

      <div class="section" style="display:flex; align-items:center; gap:16px;">
        <div class="score">${score}%</div>
        <div>Overall Sales Readiness Score</div>
      </div>

      <div class="section">
        <h3>Category Breakdown</h3>
        ${breakdown.map(b => `
          <div style="margin:10px 0;">
            <div style="display:flex; align-items:center; justify-content:space-between;">
              <div>${b.name}</div>
              <div style="font-weight:600;">${b.percent}%</div>
            </div>
            <div class="bar"><span style="width:${b.percent}%"></span></div>
          </div>
        `).join('')}
      </div>

      <div class="grid section">
        <div class="card">
          <h3>Summary</h3>
          <p class="muted">${buildSummary(score)}</p>
        </div>
        <div class="card">
          <h3>Top 3 Priorities</h3>
          <ol style="padding-left:18px; margin:6px 0;">
            ${buildPriorities(breakdown).map(p => `<li>${p}</li>`).join('')}
          </ol>
        </div>
      </div>

      <div class="section card">
        <h3>6–12 Month Action Plan</h3>
        ${buildPlan(breakdown)}
      </div>

      <div class="section" style="text-align:center;">
        <p style="margin-bottom:8px;">We’ll provide a free, accurate business valuation and next steps.</p>
        <a class="cta" href="https://arxbrokers.com/appointments">Book Your Valuation →</a>
        <div class="sm muted" style="margin-top:6px;">https://arxbrokers.com/appointments</div>
      </div>

      <div class="footer">
        Prepared for ${name || 'Client'} (${email || 'N/A'}) • Generated by score.arxbrokers.com
      </div>

      <script>
        (function(){
          var img = document.getElementById('logo');
          img.onerror = function(){ this.onerror=null; this.src='${fallbackLogo}'; };
        })();
      </script>
    </body>
  </html>`;
}

function makeFilename(company) {
  const date = new Date().toISOString().slice(0,10);
  const safe = String(company || 'Your Business').replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'');
  return `Exit-Score-${safe || 'Business'}-${date}.pdf`;
}

function buildSummary(score){
  if (score >= 80) return 'Excellent readiness. You are positioned for premium valuation with targeted optimization opportunities.';
  if (score >= 60) return 'Above-average readiness. Focus on a few key gaps to improve certainty and multiple.';
  if (score >= 40) return 'Moderate readiness. Address the identified gaps to protect value and timeline.';
  return 'Early-stage readiness. Implement core systems and financial clarity to become market-ready.';
}

function buildPriorities(breakdown){
  const sorted = [...breakdown].sort((a,b)=>a.percent-b.percent);
  return sorted.slice(0,3).map(b=>`${b.name}: strengthen fundamentals and reduce buyer risk`);
}

function buildPlan(breakdown){
  const sorted = [...breakdown].sort((a,b)=>a.percent-b.percent);
  const phase = (items)=>`<ul style="padding-left:18px; margin:6px 0;">${items.map(x=>`<li>${x}</li>`).join('')}</ul>`;
  const p0 = sorted.slice(0,2).map(b=>`${b.name}: close documentation and process gaps; add simple metrics.`);
  const p1 = sorted.slice(2,4).map(b=>`${b.name}: institutionalize improvements; show trailing 6–12 month consistency.`);
  const p2 = sorted.slice(4).map(b=>`${b.name}: strategic enhancements to support premium positioning.`);
  return `
    <div><strong>0–3 months</strong>${phase(p0)}</div>
    <div><strong>3–12 months</strong>${phase(p1)}</div>
    <div><strong>12–24 months</strong>${phase(p2)}</div>
  `;
}
