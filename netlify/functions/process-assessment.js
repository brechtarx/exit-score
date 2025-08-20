const { createClient } = require('@supabase/supabase-js');

// Main handler function
exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('Assessment processing triggered');
    
    // Parse the webhook payload from Supabase
    const payload = JSON.parse(event.body);
    
    // Validate payload has required data
    if (!payload.record || !payload.record.id) {
      console.error('Invalid payload received:', payload);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid payload' })
      };
    }

    const assessment = payload.record;
    console.log(`Processing assessment for ${assessment.email}`);

    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Check if already processed to avoid duplicates
    if (assessment.processed) {
      console.log('Assessment already processed, skipping');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Already processed' })
      };
    }

    // Process the assessment
    const results = await processAssessment(assessment, supabase);
    
    // Mark as processed
    await supabase
      .from('assessments')
      .update({ 
        processed: true,
        gmail_draft_created: results.gmailSuccess,
        pipedrive_created: results.pipediveSuccess
      })
      .eq('id', assessment.id);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Assessment processed successfully',
        results 
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

// Main processing function
async function processAssessment(assessment, supabase) {
  const results = {
    gmailSuccess: false,
    pipediveSuccess: false,
    reportGenerated: false
  };

  try {
    // 1. Generate AI Report with Claude
    console.log('Generating AI report...');
    const report = await generateAIReport(assessment);
    results.reportGenerated = true;
    console.log('AI report generated successfully');

    // 2. Create Gmail Draft
    console.log('Creating Gmail draft...');
    try {
      await createGmailDraft(assessment, report);
      results.gmailSuccess = true;
      console.log('Gmail draft created successfully');
    } catch (error) {
      console.error('Failed to create Gmail draft:', error);
    }

    // 3. Create Pipedrive Lead
    console.log('Creating Pipedrive lead...');
    try {
      await createPipedriveLead(assessment);
      results.pipediveSuccess = true;
      console.log('Pipedrive lead created successfully');
    } catch (error) {
      console.error('Failed to create Pipedrive lead:', error);
    }

    return results;

  } catch (error) {
    console.error('Error in processAssessment:', error);
    throw error;
  }
}

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
   - Recommended timeline for sale preparation

2. DETAILED ANALYSIS BY CATEGORY
   - Score breakdown for each of the 6 categories
   - Specific insights for responses marked "No" or "Not Sure"
   - Industry-specific context and benchmarks

3. PRIORITY ACTION PLAN
   - Top 3 most impactful improvements
   - Estimated timeline and investment for each
   - Expected impact on valuation

4. INDUSTRY INSIGHTS
   - Current market conditions for ${assessment.industry}
   - Buyer preferences and trends
   - Valuation multiples and expectations

5. NEXT STEPS
   - Immediate actions (next 30 days)
   - Medium-term improvements (3-6 months)
   - Long-term preparation (6+ months)

Write this as a professional, actionable report that would be valuable to a business owner considering a sale. Use specific examples and avoid generic advice.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
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

// Create Gmail draft
async function createGmailDraft(assessment, report) {
  // TODO: Implement Gmail API integration
  // For now, we'll log the email content
  console.log('Gmail draft content:', {
    to: assessment.email,
    subject: `Your Business Sale Readiness Report - ${assessment.score}% Score`,
    body: `Dear ${assessment.name},

Thank you for completing our Business Sale Readiness Assessment. Your personalized report has been prepared by our M&A team.

REPORT CONTENT:
${report}

Best regards,
ARX Business Brokers Team

P.S. If you have any questions about your report or would like to discuss your results, please don't hesitate to reach out.`
  });
  
  // Return success for now
  return true;
}

// Create Pipedrive lead
async function createPipedriveLead(assessment) {
  // TODO: Implement Pipedrive API integration
  console.log('Pipedrive lead data:', {
    name: assessment.name,
    email: assessment.email,
    company: assessment.company,
    phone: assessment.phone,
    industry: assessment.industry,
    website: assessment.website,
    score: assessment.score,
    source: 'Exit Score Assessment'
  });
  
  // Return success for now
  return true;
}