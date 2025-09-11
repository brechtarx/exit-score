// Client-side PDF request helper
(function() {
  function computeCategoryBreakdown(categories, answers) {
    const breakdown = [];
    categories.forEach((cat, ci) => {
      let catScore = 0, total = 0;
      cat.questions.forEach((q, qi) => {
        total += q.weight;
        const a = answers.find(x => x.category === ci && x.question === qi);
        if (!a) return;
        if (a.answer === true) catScore += q.weight;
        else if (a.answer === null) catScore += q.weight * 0.15;
      });
      breakdown.push({ name: cat.name, percent: total ? Math.round((catScore / total) * 100) : 0 });
    });
    return breakdown;
  }

  async function downloadPdf() {
    try {
      const score = parseInt(document.getElementById('scoreValue').textContent) || 0;
      const name = document.getElementById('nameInput')?.value || '';
      const email = document.getElementById('emailInput')?.value || '';
      const company = (window.businessInfo && window.businessInfo.company) || document.getElementById('companyInput')?.value || 'Your Business';
      const industry = window.businessInfo?.industry || '';
      const breakdown = computeCategoryBreakdown(window.categories || [], window.answers || []);

      // Preferred brand assets (publicly accessible)
      const base = (window.location && window.location.origin) ? window.location.origin : 'https://score.arxbrokers.com';
      const logoUrl = `${base}/images/arx_logo_Logo_basic_rich_black.png`;
      const letterheadUrl = `${base}/images/Stationery_All_arx_letterhead.png`;

      const payload = { score, name, email, company, industry, breakdown, logoUrl, letterheadUrl };
      const res = await fetch('/.netlify/functions/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('PDF generation failed: ' + res.status);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'Exit-Score.pdf';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      window.trackEvent && window.trackEvent('pdf_download', { score });
    } catch (e) {
      alert('Could not generate PDF right now. Please try again later.');
    }
  }

  window.downloadPdf = downloadPdf;
})();
