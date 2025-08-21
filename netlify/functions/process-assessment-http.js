// Main handler function using direct HTTP calls (no external dependencies)
exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('Assessment submission received');
    
    // Parse the form submission from frontend
    const assessment = JSON.parse(event.body);
    
    // Validate required fields
    if (!assessment.email || !assessment.name || !assessment.company) {
      console.error('Missing required fields:', assessment);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    console.log(`Processing assessment for ${assessment.email}`);

    // Save to Supabase using direct HTTP call
    const supabaseResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/assessments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(assessment)
    });

    if (!supabaseResponse.ok) {
      const error = await supabaseResponse.text();
      console.error('Supabase error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to save assessment' })
      };
    }

    const savedAssessment = await supabaseResponse.json();
    console.log('Assessment saved to Supabase successfully');

    // Generate AI Report
    let reportGenerated = false;
    let gmailSuccess = false;
    let pipediveSuccess = false;

    try {
      console.log('Generating AI report...');
      const report = await generateAIReport(savedAssessment[0]);
      reportGenerated = true;
      console.log('AI report generated successfully');

      // Log Gmail draft content (for now)
      console.log('Gmail draft would contain:', {
        to: savedAssessment[0].email,
        subject: `Your Business Sale Readiness Report - ${savedAssessment[0].score}% Score`,
        body: `Dear ${savedAssessment[0].name},\n\nYour personalized report:\n\n${report}`
      });
      gmailSuccess = true;

      // Log Pipedrive lead data (for now)
      console.log('Pipedrive lead would be:', {
        name: savedAssessment[0].name,
        email: savedAssessment[0].email,
        company: savedAssessment[0].company,
        score: savedAssessment[0].score,
        industry: savedAssessment[0].industry
      });
      pipediveSuccess = true;

    } catch (error) {
      console.error('Error in report generation:', error);
    }

    // Mark as processed
    await fetch(`${process.env.SUPABASE_URL}/rest/v1/assessments?id=eq.${savedAssessment[0].id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({
        processed: true,
        gmail_draft_created: gmailSuccess,
        pipedrive_created: pipediveSuccess
      })
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Assessment submitted and processed successfully',
        id: savedAssessment[0].id,
        results: {
          reportGenerated,
          gmailSuccess,
          pipediveSuccess
        }
      })
    };

  } catch (error) {
    console.error('Error processing assessment:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};

// Generate AI report using Claude API
async function generateAIReport(assessment) {
  const prompt = `You are an expert M&A advisor preparing a personalized business readiness report.

BUSINESS CONTEXT:
- Company: ${assessment.company}
- Industry: ${assessment.industry}
- Website: ${assessment.website || 'Not provided'}
- Overall Score: ${assessment.score}%

ASSESSMENT RESPONSES:
${JSON.stringify(assessment.responses, null, 2)}

Please generate a comprehensive business sale readiness report that includes:

1. EXECUTIVE SUMMARY
   - Overall readiness assessment
   - Key strengths and challenges

2. DETAILED ANALYSIS BY CATEGORY
   - Score breakdown for each category
   - Specific insights for areas needing improvement

3. PRIORITY ACTION PLAN
   - Top 3 most impactful improvements
   - Expected impact on valuation

4. INDUSTRY INSIGHTS
   - Current market conditions for ${assessment.industry}
   - Buyer preferences and trends

5. NEXT STEPS
   - Immediate actions (next 30 days)
   - Medium-term improvements (3-6 months)

Write this as a professional, actionable report for a business owner.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241020',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}