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

  return `You are an expert business valuation analyst helping business owners understand their exit readiness. Create a detailed, actionable report based on this Exit Score Assessment.

BUSINESS INFORMATION:
Company: ${assessment.company?.includes('Company') ? `${assessment.name}'s ${assessment.industry || 'Business'}` : assessment.company}
Industry: ${assessment.industry || 'Not specified'}
Overall Exit Score: ${assessment.score}%

CATEGORY SCORES:
${categorySection}

DETAILED RESPONSES:
${structuredData}

Create a professional, actionable report with these sections:
- Executive Summary (2-3 paragraphs; owner-friendly language)
- Category Analysis (one section per category with context, risks, and opportunities)
- Top 3 Priorities (specific, time-bound, and practical)
- Recommendations for each "No" or "Don't Know" response (steps, tools, and owners)
- Expected Valuation Impact ranges from improvements (qualitative)
- Suggested 6–12 month action plan broken down by timeframe
- Industry-specific considerations relevant to the stated industry
- Clear call-to-action for consultation with ARX Business Brokers

Tone: professional and approachable. Focus on actionable advice rather than just describing problems. Aim for 1000-1500 words total.

${categories.length ? categories.map((cat, i) => `
${getCategoryOpeningTemplate(cat.name, Math.round((categoryBreakdown[cat.name]?.score || 0) * 100)).opening}
Focus Area: ${getCategoryOpeningTemplate(cat.name, Math.round((categoryBreakdown[cat.name]?.score || 0) * 100)).focus}`).join('\n') : ''}`;
}

function getCategoryOpeningTemplate(categoryName, score) {
  const templates = {
    "Risk of Change of Ownership": {
      opening: `The risk of change of ownership is often the biggest concern in any buyer's mind. Your ${score}% score indicates ${score >= 75 ? 'excellent preparation for ownership transition' : score >= 50 ? 'moderate readiness with some areas needing attention' : 'significant work needed to reduce owner dependency'}. This category heavily influences your business valuation because buyers need confidence that the business can thrive under new ownership.`,
      focus: "Reducing owner dependency and proving the business can thrive under new ownership"
    },
    "Company Growth": {
      opening: `Your company's growth trajectory directly impacts buyer interest and valuation multiples. At ${score}%, your growth story ${score >= 75 ? 'demonstrates strong momentum that buyers actively seek' : score >= 50 ? 'shows promise but may benefit from more consistent patterns' : 'needs strengthening to attract premium buyers'}. Buyers typically pay higher multiples for businesses with predictable, sustainable growth.`,
      focus: "Demonstrating consistent revenue growth and future growth potential"
    },
    "Industry Growth": {
      opening: `Industry dynamics significantly influence your business's attractiveness to buyers. Your ${score}% score reflects ${score >= 75 ? 'positioning in a favorable industry environment' : score >= 50 ? 'mixed industry conditions that require strategic positioning' : 'challenging industry headwinds that need to be addressed'}. Buyers evaluate not just your company's performance, but also the long-term viability of your market.`,
      focus: "Positioning your business favorably within industry trends and market conditions"
    },
    "Market Demand": {
      opening: `Market demand characteristics determine how easily a buyer can operate and grow your business post-acquisition. Your ${score}% score indicates ${score >= 75 ? 'strong market positioning with sustainable competitive advantages' : score >= 50 ? 'reasonable market position with room for improvement' : 'market vulnerabilities that could concern potential buyers'}. This affects both buyer interest and the premium they're willing to pay.`,
      focus: "Building sustainable competitive advantages and market resilience"
    },
    "Company Rating": {
      opening: `Financial integrity and operational professionalism are fundamental to buyer confidence. Your ${score}% score shows ${score >= 75 ? 'excellent financial practices that facilitate due diligence' : score >= 50 ? 'generally sound practices with some areas for improvement' : 'financial and operational practices that need significant attention'}. Clean, professional operations directly impact valuation and deal completion probability.`,
      focus: "Ensuring financial transparency and operational professionalism"
    },
    "Competitiveness": {
      opening: `Your competitive position determines your business's defensibility and growth potential under new ownership. At ${score}%, your competitive standing ${score >= 75 ? 'demonstrates strong market advantages that buyers value highly' : score >= 50 ? 'shows reasonable positioning with opportunities to strengthen advantages' : 'indicates competitive vulnerabilities that may concern buyers'}. Strong competitive positioning supports higher valuations and buyer confidence.`,
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
