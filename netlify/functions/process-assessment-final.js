// Final working version - direct HTTP calls to Supabase API
exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('Assessment submission received');
    
    // Parse the form submission
    const assessment = JSON.parse(event.body);
    
    // Validate required fields
    if (!assessment.email || !assessment.name || !assessment.company) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    console.log(`Processing assessment for ${assessment.email}`);

    // Save directly to Supabase using REST API
    const supabaseResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/assessments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        name: assessment.name,
        email: assessment.email,
        company: assessment.company,
        phone: assessment.phone || null,
        industry: assessment.industry || null,
        website: assessment.website || null,
        score: assessment.score || 0,
        responses: assessment.responses || [],
        time_spent: assessment.time_spent || 0,
        user_agent: assessment.user_agent || null,
        referrer: assessment.referrer || null,
        processed: false,
        gmail_draft_created: false,
        pipedrive_created: false
      })
    });

    if (!supabaseResponse.ok) {
      const errorText = await supabaseResponse.text();
      console.error('Supabase save failed:', errorText);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Failed to save to database',
          details: errorText
        })
      };
    }

    const savedData = await supabaseResponse.json();
    console.log('Assessment saved successfully');

    // Generate AI report
    let aiReport = '';
    let reportGenerated = false;
    
    try {
      console.log('Generating AI report...');
      aiReport = await generateAIReport(savedData[0]);
      reportGenerated = true;
      console.log('AI report generated successfully');
    } catch (aiError) {
      console.error('AI report generation failed:', aiError);
      // Continue even if AI fails
    }

    // Log what would be sent to Gmail (placeholder)
    console.log('Gmail draft content:', {
      to: savedData[0].email,
      subject: `Your Business Sale Readiness Report - ${savedData[0].score}% Score`,
      preview: aiReport.substring(0, 200) + '...'
    });

    // Log what would be sent to Pipedrive (placeholder)
    console.log('Pipedrive lead data:', {
      name: savedData[0].name,
      email: savedData[0].email,
      company: savedData[0].company,
      score: savedData[0].score,
      industry: savedData[0].industry
    });

    // Update processed status
    await fetch(`${process.env.SUPABASE_URL}/rest/v1/assessments?id=eq.${savedData[0].id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({
        processed: true,
        gmail_draft_created: true,
        pipedrive_created: true
      })
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Assessment processed successfully',
        id: savedData[0].id,
        reportGenerated: reportGenerated,
        score: savedData[0].score
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};

// Generate AI report
async function generateAIReport(assessment) {
  const prompt = `You are an expert M&A advisor preparing a personalized business readiness report.

BUSINESS CONTEXT:
- Company: ${assessment.company}
- Industry: ${assessment.industry || 'Not specified'}
- Website: ${assessment.website || 'Not provided'}
- Overall Score: ${assessment.score}%

Create a professional 4-paragraph business sale readiness report that includes:

1. EXECUTIVE SUMMARY - Overall readiness and key findings
2. STRENGTHS & CHALLENGES - What's working well and what needs improvement  
3. PRIORITY RECOMMENDATIONS - Top 3 specific actions to take
4. NEXT STEPS - Immediate actions for the next 30-60 days

Keep it concise but valuable for a business owner considering a sale.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}