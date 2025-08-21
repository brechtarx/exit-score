// Final working version - direct HTTP calls to Supabase API
const { google } = require('googleapis');

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
        zipcode: assessment.zipcode || null,
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

    // Create Gmail draft
    let gmailSuccess = false;
    let gmailError = null;
    
    if (reportGenerated) {
      try {
        console.log('Creating Gmail draft...');
        await createGmailDraft(savedData[0], aiReport);
        gmailSuccess = true;
        console.log('Gmail draft created successfully');
      } catch (error) {
        gmailError = error;
        console.error('Gmail draft creation failed:', error.message);
      }
    } else {
      console.log('Skipping Gmail draft - no report generated');
    }

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

    // Update processed status and save report
    await fetch(`${process.env.SUPABASE_URL}/rest/v1/assessments?id=eq.${savedData[0].id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({
        processed: true,
        gmail_draft_created: gmailSuccess,
        pipedrive_created: true,
        report_text: reportGenerated ? aiReport : null
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
  
  const prompt = `You are an expert M&A advisor from ARX Business Brokers preparing a personalized business sale readiness report.

BUSINESS CONTEXT:
- Company: ${assessment.company}
- Industry: ${assessment.industry || 'Not specified'}
- Location: ${assessment.zipcode ? `Zip Code ${assessment.zipcode}` : 'Not provided'}
- Website: ${assessment.website || 'Not provided'}
- Overall Score: ${assessment.score}%

ASSESSMENT STRUCTURE:
The assessment evaluates 6 categories with specific weightings:

1. TRANSFERABILITY RISK (30% weight) - Can business operate without owner?
2. GROWTH TRACK RECORD (20% weight) - Recent and historical growth patterns
3. MARKET DYNAMICS (15% weight) - Industry trends and competitive barriers
4. BUSINESS MODEL ATTRACTIVENESS (15% weight) - Revenue predictability and margins
5. FINANCIAL INTEGRITY & OPERATIONS (10% weight) - Clean books and customer concentration
6. COMPETITIVE MOAT (10% weight) - Brand strength and market position

ASSESSMENT RESPONSES:
${JSON.stringify(assessment.responses, null, 2)}

Create a comprehensive, respectful business sale readiness report that acknowledges this business owner's lifetime achievement while providing honest buyer perspective. Use encouraging language and frame weaknesses as "opportunities for value enhancement."

Structure the report as follows:

**EXECUTIVE SUMMARY**
Overall readiness assessment and what the ${assessment.score}% score means for sale prospects.

**CATEGORY ANALYSIS**
For each category that shows specific strengths or opportunities, explain:
- What the responses indicate from a buyer's perspective
- How this impacts valuation and buyer interest
- Use positive framing like "buyers value" rather than "buyers are concerned"

**KEY STRENGTHS**
Highlight what's working well that will attract buyers (lead with positives).

**PRIORITY OPPORTUNITIES**
Top 3 specific areas that would most enhance buyer appeal and valuation.

**LOCATION & MARKET CONTEXT**
${assessment.zipcode ? `Brief insights about the market area and how location affects sale prospects.` : 'General market considerations for this business type.'}

**NEXT STEPS**
Concrete 30-60 day action items. Mention that ARX Business Brokers can help guide the process.

Keep it professional, encouraging, and actionable for a business owner who has built something significant.`;

  console.log('Prompt length:', prompt.length);
  console.log('Making Claude API request...');
  
  const requestBody = {
    model: 'claude-3-haiku-20240307',
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

// Create Gmail draft
async function createGmailDraft(assessment, report) {
  try {
    // Parse the service account key from environment
    const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    
    // Create JWT auth client
    const auth = new google.auth.JWT(
      serviceAccountKey.client_email,
      null,
      serviceAccountKey.private_key,
      ['https://www.googleapis.com/auth/gmail.compose'],
      process.env.GMAIL_USER_EMAIL // Impersonate the Gmail user
    );
    
    // Create Gmail API client
    const gmail = google.gmail({ version: 'v1', auth });
    
    // Compose email content
    const subject = `Your Business Sale Readiness Report - ${assessment.score}% Score`;
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .score { font-size: 24px; color: #ff6b35; font-weight: bold; }
        .report { background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Business Sale Readiness Report</h1>
        <div class="score">Score: ${assessment.score}%</div>
    </div>
    
    <div class="content">
        <p>Dear ${assessment.name},</p>
        
        <p>Thank you for completing the Business Sale Readiness Assessment for <strong>${assessment.company}</strong>. Your personalized report is ready.</p>
        
        <div class="report">
            ${report.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
        </div>
        
        <p>This assessment provides valuable insights into your business's current sale readiness and actionable steps to enhance its value.</p>
        
        <p>If you'd like to discuss these findings or explore next steps, please don't hesitate to reach out.</p>
        
        <p>Best regards,<br>
        <strong>ARX Business Brokers</strong><br>
        Phone: ${assessment.phone ? assessment.phone : 'Contact us'}<br>
        Email: sales@arxbrokers.com</p>
    </div>
    
    <div class="footer">
        <p>This report was generated based on your assessment responses. For the most accurate valuation and sale guidance, we recommend a comprehensive business evaluation.</p>
    </div>
</body>
</html>`;
    
    // Create email message
    const message = [
      `To: ${assessment.email}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      htmlBody
    ].join('\r\n');
    
    // Base64 encode the message
    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    // Create draft
    const draft = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: {
          raw: encodedMessage
        }
      }
    });
    
    console.log('Gmail draft created:', draft.data.id);
    return draft.data;
    
  } catch (error) {
    console.error('Gmail draft creation error:', error);
    throw error;
  }
}