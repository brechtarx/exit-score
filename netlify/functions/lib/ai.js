// AI report generation using Anthropic Claude

async function generateAIReport(assessment, QUESTIONS_STRUCTURE) {
  const prompt = buildPrompt(assessment, QUESTIONS_STRUCTURE);
  const preferred = process.env.AI_MODEL || 'claude-3-5-sonnet-20241022';
  const fallbacks = [
    'claude-3-5-sonnet-20240620',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229'
  ];
  const tried = [];

  async function callModel(model) {
    const body = {
      model,
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    };
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });
    return res;
  }

  // Try preferred then fallbacks on 404/not_found_error
  const sequence = [preferred, ...fallbacks.filter(m => m !== preferred)];
  let lastErrorText = '';
  for (const model of sequence) {
    try {
      tried.push(model);
      const response = await callModel(model);
      if (!response.ok) {
        const text = await response.text();
        lastErrorText = text;
        // If model not found, try next
        if (response.status === 404 || (text && text.includes('not_found_error'))) {
          continue;
        }
        throw new Error(`Claude API error: ${response.status} - ${text}`);
      }
      const data = await response.json();
      if (!data.content || !data.content[0] || !data.content[0].text) {
        throw new Error('Invalid response format from Claude API');
      }
      return data.content[0].text;
    } catch (e) {
      lastErrorText = (e && e.message) || String(e);
      // try next
    }
  }
  throw new Error(`All Claude model attempts failed. Tried: ${tried.join(', ')}. Last error: ${lastErrorText}`);
}

function buildPrompt(assessment, QUESTIONS_STRUCTURE) {
  const structuredData = buildStructuredAssessmentData(assessment, QUESTIONS_STRUCTURE);
  const categoryBreakdown = calculateCategoryScores(assessment.responses, QUESTIONS_STRUCTURE);

  const categorySection = Object.entries(categoryBreakdown)
    .map(([category, data]) => `${category}: ${Math.round(data.score * 100)}% (${data.answeredQuestions}/${data.totalQuestions} questions answered)`) 
    .join('\n');

  const categories = QUESTIONS_STRUCTURE.categories;
  const categoryTemplates = categories.map((cat, idx) => {
    const d = categoryBreakdown[cat.name] || { score: 0 };
    const score = Math.round(d.score * 100);
    const template = getCategoryOpeningTemplate(cat.name, score);
    return `### ${cat.name} (${score}%)\n${template.opening}\n\nFocus: ${template.focus}`;
  }).join('\n\n');

  const greedFear = assessment.score >= 86
    ? 'Emphasize how to lock in a premium price, reduce time to close, and avoid diligence surprises.'
    : assessment.score >= 76
      ? 'Highlight minor optimizations that improve price and speed, and how to stage quick wins before going to market.'
      : assessment.score >= 60
        ? 'Focus on the 2–3 highest‑leverage improvements that increase buyer demand and valuation; show how to sequence them.'
        : assessment.score >= 45
          ? 'Call out risks that buyers penalize, how they discount valuation, and what to fix first to remove objections.'
          : 'Address the biggest deal‑killers first. Explain how these issues show up in diligence, and provide a practical recovery plan.';

  return `You are an expert M&A advisor creating a persuasive, owner‑friendly report that turns this Exit Score into clear actions.

BUSINESS INFORMATION:
Company: ${assessment.company?.includes('Company') ? `${assessment.name}'s ${assessment.industry || 'Business'}` : assessment.company}
Industry: ${assessment.industry || 'Not specified'}
Overall Exit Score: ${assessment.score}%

CATEGORY SCORES:
${categorySection}

DETAILED RESPONSES:
${structuredData}

Create a practical, outcome‑focused report with these sections:
- Executive Snapshot: one tight page with (1) overall score context, (2) Top 3 Value Levers with why they move price, (3) Risk Heatmap by category (Strong/Moderate/Needs Attention), and (4) positioning guidance. ${greedFear}
- Category Cards: for each category, explain what buyers look for, your strengths/risks from the responses, and concrete improvement steps.
- 90‑Day Preparation Plan: week‑by‑week actions prioritized for impact and speed, tailored to the revenue range; specify owners and milestones.
- Buyer Questions & Talk Tracks: the questions buyers will ask given these scores and strong, credible answers the owner can use.
- Valuation Impact Narrative: how the top fixes can expand buyer pool and affect likely valuation ranges qualitatively.
- What To Change Before Diligence: the 3–5 fixes to complete pre‑process to prevent discounts or re‑trades.
- Industry Lens: any sector‑specific angles to watch for, plus proof points to include.

Tone: decisive, consultative, and practical. Use plain language and bullet‑friendly formatting. Aim for 900–1300 words total.

${categories.length ? categories.map((cat, i) => `
${getCategoryOpeningTemplate(cat.name, Math.round((categoryBreakdown[cat.name]?.score || 0) * 100)).opening}
Focus Area: ${getCategoryOpeningTemplate(cat.name, Math.round((categoryBreakdown[cat.name]?.score || 0) * 100)).focus}`).join('\n') : ''}`;
}

function getCategoryOpeningTemplate(categoryName, score) {
  const templates = {
    "Risk of Change of Ownership": {
      opening: `The risk of change of ownership is often the biggest concern in any buyer's mind. Your ${score}% score indicates ${score >= 80 ? 'excellent preparation for ownership transition' : score >= 50 ? 'moderate readiness with some areas needing attention' : 'significant work needed to reduce owner dependency'}. This category heavily influences valuation because buyers need confidence the business can thrive under new ownership.`,
      focus: "Reducing owner dependency and proving the business can thrive under new ownership"
    },
    "Company Growth": {
      opening: `Your company's growth trajectory directly impacts buyer interest and valuation multiples. At ${score}%, your growth story ${score >= 80 ? 'shows strong momentum buyers actively seek' : score >= 50 ? 'shows promise but needs more consistent patterns' : 'needs strengthening to attract premium buyers'}. Buyers pay higher multiples for predictable, sustainable growth.`,
      focus: "Demonstrating consistent revenue growth and future growth potential"
    },
    "Industry Growth": {
      opening: `Industry dynamics significantly influence buyer appetite. Your ${score}% score reflects ${score >= 80 ? 'a favorable environment' : score >= 50 ? 'mixed conditions that require smart positioning' : 'headwinds that must be addressed'}. Buyers weigh both company performance and long‑term market viability.`,
      focus: "Positioning your business favorably within industry trends and market conditions"
    },
    "Market Demand": {
      opening: `Market demand determines how easily a buyer can run and grow the business post‑acquisition. Your ${score}% score indicates ${score >= 80 ? 'strong positioning with durable advantages' : score >= 50 ? 'a workable position with upside' : 'vulnerabilities that will concern buyers'}.`,
      focus: "Building sustainable competitive advantages and market resilience"
    },
    "Company Rating": {
      opening: `Financial integrity and operational professionalism are fundamental to buyer confidence. Your ${score}% score shows ${score >= 80 ? 'excellent practices that speed diligence' : score >= 50 ? 'generally sound practices with clear improvements available' : 'areas that will trigger discounts or delays'}.`,
      focus: "Ensuring financial transparency and operational professionalism"
    },
    "Competitiveness": {
      opening: `Competitive position drives defensibility and growth potential. At ${score}%, your standing ${score >= 80 ? 'shows advantages buyers value' : score >= 50 ? 'is serviceable with clear opportunities to strengthen' : 'reveals vulnerabilities that reduce buyer confidence'}.`,
      focus: "Strengthening competitive advantages and market differentiation"
    }
  };
  return templates[categoryName] || {
    opening: `Your ${categoryName.toLowerCase()} score of ${score}% provides insight into this important aspect of your business's exit readiness.`,
    focus: "Improving this key area of your business"
  };
}

function buildStructuredAssessmentData(assessment, QUESTIONS_STRUCTURE) {
  if (!assessment.responses || !Array.isArray(assessment.responses)) {
    return 'No detailed responses available.';
  }
  const responsesByCategory = {};
  assessment.responses.forEach(response => {
    if (response.category !== undefined && response.question !== undefined) {
      const category = QUESTIONS_STRUCTURE.categories[response.category];
      if (category && category.questions[response.question]) {
        const question = category.questions[response.question];
        if (!responsesByCategory[category.name]) responsesByCategory[category.name] = [];
        responsesByCategory[category.name].push({
          id: response.question,
          text: question.text || `Question ${response.question + 1}`,
          answer: response.answer === true ? 'Yes' : response.answer === false ? 'No' : 'Don\'t Know',
          weight: question.weight
        });
      }
    }
  });
  let structuredData = '';
  Object.entries(responsesByCategory).forEach(([categoryName, responses]) => {
    structuredData += `\n${categoryName.toUpperCase()}:\n`;
    responses.forEach(r => { structuredData += `- ${r.text}: ${r.answer} (Weight: ${r.weight})\n`; });
  });
  return structuredData;
}

function calculateCategoryScores(responses, QUESTIONS_STRUCTURE) {
  const categoryBreakdown = {};
  if (!responses || !Array.isArray(responses)) return categoryBreakdown;
  QUESTIONS_STRUCTURE.categories.forEach((category, ci) => {
    let catScore = 0, total = 0, answered = 0;
    category.questions.forEach((q, qi) => {
      total += q.weight;
      const r = responses.find(x => x.category === ci && x.question === qi);
      if (r) {
        answered++;
        if (r.answer === true) catScore += q.weight;
        else if (r.answer === null) catScore += q.weight * 0.15;
      }
    });
    categoryBreakdown[category.name] = {
      score: total ? catScore / total : 0,
      answeredQuestions: answered,
      totalQuestions: category.questions.length
    };
  });
  return categoryBreakdown;
}

module.exports = { generateAIReport };
