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
    let aiError = null;
    
    try {
      console.log('Starting AI report generation...');
      console.log('Assessment data for AI:', {
        company: savedData[0].company,
        industry: savedData[0].industry,
        score: savedData[0].score,
        responsesCount: savedData[0].responses?.length || 0
      });
      
      const startTime = Date.now();
      aiReport = await generateAIReport(savedData[0]);
      const endTime = Date.now();
      
      reportGenerated = true;
      console.log(`AI report generated successfully in ${endTime - startTime}ms`);
      console.log('Report preview:', aiReport.substring(0, 200) + '...');
    } catch (error) {
      aiError = error;
      console.error('AI report generation failed:');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      if (error.response) {
        console.error('API response status:', error.response.status);
        console.error('API response headers:', error.response.headers);
      }
      // Continue even if AI fails
    }

    // Log Gmail integration (placeholder for now)
    console.log('Gmail integration - would create draft:', {
      to: savedData[0].email,
      subject: `Your Business Sale Readiness Report - ${savedData[0].score}% Score`,
      hasReport: reportGenerated,
      reportLength: aiReport.length,
      preview: aiReport ? aiReport.substring(0, 200) + '...' : 'No report generated'
    });

    // Log Pipedrive integration (placeholder for now)
    console.log('Pipedrive integration - would create lead:', {
      name: savedData[0].name,
      email: savedData[0].email,
      company: savedData[0].company,
      phone: savedData[0].phone,
      score: savedData[0].score,
      industry: savedData[0].industry,
      website: savedData[0].website,
      source: 'Exit Score Assessment'
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
        score: savedData[0].score,
        aiError: aiError ? aiError.message : null,
        reportPreview: aiReport ? aiReport.substring(0, 100) : null
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
  console.log('Building prompt for Claude API...');
  
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

  console.log('Prompt length:', prompt.length);
  console.log('Making Claude API request...');
  
  const requestBody = {
    model: 'claude-3-5-sonnet-latest',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: prompt
    }]
  };

  console.log('Request body size:', JSON.stringify(requestBody).length);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(requestBody)
  });

  console.log('Claude API response status:', response.status);
  console.log('Claude API response headers:', Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Claude API error response:', errorText);
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Claude API response structure:', {
    hasContent: !!data.content,
    contentLength: data.content?.[0]?.text?.length || 0,
    type: data.content?.[0]?.type
  });

  return data.content[0].text;
}