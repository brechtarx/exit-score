// FRESH VERSION - AI Report Generation & Gmail Draft Creation
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Load questions from JSON file
let QUESTIONS_STRUCTURE = null;
try {
    const questionsPath = path.join(process.cwd(), 'questions.json');
    const questionsData = fs.readFileSync(questionsPath, 'utf8');
    QUESTIONS_STRUCTURE = JSON.parse(questionsData);
    console.log('✅ Backend loaded questions from JSON successfully');
} catch (error) {
    console.error('❌ Backend failed to load questions from JSON:', error);
    console.log('📂 Backend using fallback hardcoded structure');
    // Fallback structure
    QUESTIONS_STRUCTURE = {
        "categories": [
            {
                "name": "Risk of Change of Ownership",
                "weight": 0.3,
                "questions": [
                    { "id": 1, "weight": 0.35 },
                    { "id": 2, "weight": 0.22 },
                    { "id": 3, "weight": 0.18 },
                    { "id": 4, "weight": 0.12 },
                    { "id": 5, "weight": 0.13 }
                ]
            },
            {
                "name": "Company Growth",
                "weight": 0.2,
                "questions": [
                    { "id": 6, "weight": 0.45 },
                    { "id": 7, "weight": 0.35 },
                    { "id": 8, "weight": 0.2 }
                ]
            },
            {
                "name": "Industry Growth",
                "weight": 0.15,
                "questions": [
                    { "id": 9, "weight": 0.6 },
                    { "id": 10, "weight": 0.4 }
                ]
            },
            {
                "name": "Market Demand",
                "weight": 0.15,
                "questions": [
                    { "id": 11, "weight": 0.25 },
                    { "id": 12, "weight": 0.2 },
                    { "id": 13, "weight": 0.2 },
                    { "id": 14, "weight": 0.15 },
                    { "id": 15, "weight": 0.12 },
                    { "id": 16, "weight": 0.08 }
                ]
            },
            {
                "name": "Company Rating",
                "weight": 0.1,
                "questions": [
                    { "id": 17, "weight": 0.25 },
                    { "id": 18, "weight": 0.2 },
                    { "id": 19, "weight": 0.2 },
                    { "id": 20, "weight": 0.18 },
                    { "id": 21, "weight": 0.12 },
                    { "id": 22, "weight": 0.05 }
                ]
            },
            {
                "name": "Competitiveness",
                "weight": 0.1,
                "questions": [
                    { "id": 23, "weight": 0.36 },
                    { "id": 24, "weight": 0.29 },
                    { "id": 25, "weight": 0.21 },
                    { "id": 26, "weight": 0.14 }
                ]
            }
        ]
    };
}

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
    console.log('🚀 FRESH VERSION: Assessment submission received');
    
    // Parse the form submission
    const assessment = JSON.parse(event.body);
    
    // Enhanced server-side validation
    if (!assessment.email || !assessment.name || !assessment.company || !assessment.zipcode) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(assessment.email)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid email format' })
      };
    }
    
    // Rate limiting check (basic)
    if (assessment.time_spent && assessment.time_spent < 30) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Submission too fast' })
      };
    }
    
    // reCAPTCHA verification
    if (!assessment.recaptcha_token) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'reCAPTCHA verification required' })
      };
    }
    
    // Verify reCAPTCHA with Google
    const recaptchaVerifyResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${assessment.recaptcha_token}`
    });
    
    const recaptchaResult = await recaptchaVerifyResponse.json();
    if (!recaptchaResult.success || recaptchaResult.score < 0.5) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'reCAPTCHA verification failed',
          score: recaptchaResult.score || 0
        })
      };
    }
    
    console.log(`Processing assessment for ${assessment.email} - v2024`);

    // Save to Supabase
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
        revenue: assessment.revenue || null,
        revenue_numeric: assessment.revenue_numeric || null,
        employees: assessment.employees || null,
        employees_numeric: assessment.employees_numeric || null,
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
    console.log('🚀 FRESH VERSION: Assessment saved successfully');

    // Generate AI report
    let aiReport = '';
    let reportGenerated = false;
    let aiError = null;
    
    try {
      console.log('🚀 FRESH VERSION: Starting AI report generation...');
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
      console.log(`🚀 FRESH VERSION: AI report generated successfully in ${endTime - startTime}ms`);
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
        console.log('🚀 FRESH VERSION: Creating Gmail draft...');
        await createGmailDraft(savedData[0], aiReport);
        gmailSuccess = true;
        console.log('🚀 FRESH VERSION: Gmail draft created successfully');
      } catch (error) {
        gmailError = error;
        console.error('Gmail draft creation failed:', error.message);
      }
    } else {
      console.log('Skipping Gmail draft - no report generated');
    }

    // Create Pipedrive lead
    let pipediveSuccess = false;
    let pipediveError = null;
    
    try {
      console.log('Creating Pipedrive lead...');
      await createPipedriveLead(savedData[0]);
      pipediveSuccess = true;
      console.log('Pipedrive lead created successfully');
    } catch (error) {
      pipediveError = error;
      console.error('Pipedrive lead creation failed:', error.message);
    }

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
        pipedrive_created: pipediveSuccess,
        report_text: reportGenerated ? aiReport : null
      })
    });
    
    // Send lead notification
    try {
      await sendLeadNotification(savedData[0]);
      console.log('Lead notification sent successfully');
    } catch (error) {
      console.error('Failed to send lead notification:', error.message);
      // Don't fail the whole process if notification fails
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Assessment processed successfully',
        id: savedData[0].id,
        reportGenerated: reportGenerated,
        gmailSuccess: gmailSuccess,
        pipediveSuccess: pipediveSuccess,
        score: savedData[0].score,
        aiError: aiError ? aiError.message : null,
        gmailError: gmailError ? gmailError.message : null,
        reportPreview: aiReport ? aiReport.substring(0, 100) : null
      })
    };

  } catch (error) {
    console.error('Handler error:', error);
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

// AI Report Generation Function
async function generateAIReport(assessment) {
  console.log('Building prompt for Claude API...');
  
  // Build structured assessment data
  const structuredData = buildStructuredAssessmentData(assessment);
  const categoryBreakdown = calculateCategoryScores(assessment.responses);
  
  const prompt = `You are an expert business valuation analyst helping business owners understand their exit readiness. Create a detailed, actionable report based on this Exit Score Assessment.

BUSINESS INFORMATION:
Company: ${assessment.company}
Industry: ${assessment.industry || 'Not specified'}
Overall Exit Score: ${assessment.score}%

CATEGORY SCORES:
${Object.entries(categoryBreakdown).map(([category, data]) => 
  `${category}: ${Math.round(data.score * 100)}% (${data.answeredQuestions}/${data.totalQuestions} questions answered)`
).join('\n')}

DETAILED RESPONSES:
${structuredData}

Create a professional, actionable report with these sections:

**Executive Summary**
- Overall assessment of exit readiness
- Key strengths and challenges
- Timeline recommendation for sale preparation

${Object.keys(categoryBreakdown).map(category => {
  const score = Math.round(categoryBreakdown[category].score * 100);
  const template = getCategoryOpeningTemplate(category, score);
  return `**${category} ${score}%**

${template.opening}

*Focus Area: ${template.focus}*

[Provide specific recommendations based on the responses]`;
}).join('\n\n')}

**Next Steps**
1. [Most critical priority]
2. [Second priority] 
3. [Third priority]

**Recommended Action Plan**
- Immediate (0-3 months): [Urgent items]
- Short-term (3-12 months): [Important improvements]
- Medium-term (1-2 years): [Strategic enhancements]

Keep the tone professional yet approachable. Focus on actionable advice rather than just describing problems. Aim for 1000-1500 words total.`;

  console.log('Prompt length:', prompt.length);
  console.log('Making Claude API request...');
  
  const requestBody = {
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 4000,
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
  console.log('Claude API response headers:', response.headers.raw ? Object.fromEntries(response.headers.entries()) : 'Headers not available');
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Claude API error response:', errorText);
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`Claude API error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  if (!data.content || !data.content[0] || !data.content[0].text) {
    throw new Error('Invalid response format from Claude API');
  }

  return data.content[0].text;
}

// Category Opening Templates
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

// Build structured assessment data for AI
function buildStructuredAssessmentData(assessment) {
  if (!assessment.responses || !Array.isArray(assessment.responses)) {
    return 'No detailed responses available.';
  }

  const responsesByCategory = {};
  
  // Group responses by category
  assessment.responses.forEach(response => {
    QUESTIONS_STRUCTURE.categories.forEach(category => {
      const question = category.questions.find(q => q.id === response.questionId);
      if (question) {
        if (!responsesByCategory[category.name]) {
          responsesByCategory[category.name] = [];
        }
        responsesByCategory[category.name].push({
          id: response.questionId,
          text: question.text || `Question ${response.questionId}`,
          answer: response.answer === true ? 'Yes' : response.answer === false ? 'No' : 'Don\'t Know',
          weight: question.weight
        });
      }
    });
  });

  // Format for AI prompt
  let structuredData = '';
  Object.entries(responsesByCategory).forEach(([categoryName, responses]) => {
    structuredData += `\n${categoryName.toUpperCase()}:\n`;
    responses.forEach(response => {
      structuredData += `- ${response.text}: ${response.answer} (Weight: ${response.weight})\n`;
    });
  });

  return structuredData;
}

// Calculate category scores
function calculateCategoryScores(responses) {
  const categoryBreakdown = {};
  
  if (!responses || !Array.isArray(responses)) {
    return categoryBreakdown;
  }

  QUESTIONS_STRUCTURE.categories.forEach(category => {
    let categoryScore = 0;
    let totalPossibleScore = 0;
    let answeredQuestions = 0;
    let totalQuestions = category.questions.length;
    
    category.questions.forEach(question => {
      totalPossibleScore += question.weight;
      
      const response = responses.find(r => r.questionId === question.id);
      if (response) {
        answeredQuestions++;
        if (response.answer === true) {
          categoryScore += question.weight; // 100% of points
        } else if (response.answer === null) {
          categoryScore += question.weight * 0.15; // 15% for "Don't Know"
        }
        // false answers get 0% (no points added)
      }
    });

    categoryBreakdown[category.name] = {
      score: totalPossibleScore > 0 ? categoryScore / totalPossibleScore : 0,
      answeredQuestions,
      totalQuestions
    };
  });

  return categoryBreakdown;
}

// Gmail Draft Creation
async function createGmailDraft(assessment, aiReport) {
  // Check for service account key
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !process.env.GMAIL_USER_EMAIL) {
    throw new Error('Gmail service account credentials not configured');
  }

  console.log('Gmail delegation email:', process.env.GMAIL_USER_EMAIL);

  try {
    // Set up Gmail API client with service account
    const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    console.log('Service account client_email:', serviceAccountKey.client_email);
    console.log('Service account project_id:', serviceAccountKey.project_id);
    console.log('Service account private_key length:', serviceAccountKey.private_key ? serviceAccountKey.private_key.length : 'MISSING');
    
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountKey,
      scopes: [
        'https://www.googleapis.com/auth/gmail.compose',
        'https://www.googleapis.com/auth/gmail.modify'
      ],
      subject: process.env.GMAIL_USER_EMAIL // Impersonate this user
    });

    console.log('Getting auth client...');
    const authClient = await auth.getClient();
    console.log('Auth client obtained, creating Gmail API client...');
    const gmail = google.gmail({ version: 'v1', auth: authClient });
    
    // Test basic Gmail API access first
    try {
      console.log('Testing basic Gmail API access...');
      const profile = await gmail.users.getProfile({ userId: 'me' });
      console.log('Gmail profile access successful:', profile.data.emailAddress);
    } catch (profileError) {
      console.error('Gmail profile access failed:', profileError.message);
      throw new Error(`Gmail API access denied: ${profileError.message}`);
    }
    
    // Create email content
  const subject = `Your Exit Score Report: ${assessment.score}% - ${assessment.company}`;
  
  const emailBody = `Hi ${assessment.name},

Thank you for completing the Exit Score Assessment for ${assessment.company}. Your business achieved an overall score of ${assessment.score}%.

Here's your detailed personalized report:

${aiReport}

---

This report was generated based on your specific responses and provides actionable insights to improve your business's exit readiness.

If you'd like to discuss these findings and develop a strategic plan for increasing your Exit Score, I'd be happy to schedule a consultation.

Best regards,
ARX Business Brokers Team
sales@arxbrokers.com
(503) 893-2799`;

  // Create the email message
  const message = [
    `To: ${assessment.email}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    emailBody
  ].join('\n');

    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    console.log('Creating Gmail draft...');
    // Create the draft
    const draft = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: {
          raw: encodedMessage
        }
      }
    });

    console.log('Gmail draft created successfully:', draft.data.id);
    return draft.data;
    
  } catch (error) {
    console.error('Gmail draft creation failed:', error.message);
    if (error.response) {
      console.error('Gmail API response:', error.response.data);
    }
    throw new Error(`Gmail draft creation failed: ${error.message}`);
  }
}

// Pipedrive Integration
async function createPipedriveLead(assessment) {
  const PIPEDRIVE_API_TOKEN = process.env.PIPEDRIVE_KEY;
  const BASE_URL = `https://api.pipedrive.com/v1`;
  
  console.log('Pipedrive API token status:', PIPEDRIVE_API_TOKEN ? `Present (${PIPEDRIVE_API_TOKEN.substring(0, 8)}...)` : 'Missing');
  
  if (!PIPEDRIVE_API_TOKEN) {
    throw new Error('PIPEDRIVE_KEY environment variable not configured');
  }

  // Search for existing contact by email
  console.log('Searching for existing contact...');
  const searchResponse = await fetch(`${BASE_URL}/persons/search?term=${encodeURIComponent(assessment.email)}&api_token=${PIPEDRIVE_API_TOKEN}`);
  const searchData = await searchResponse.json();
  
  let contactId = null;
  if (searchData.success && searchData.data && searchData.data.items && searchData.data.items.length > 0) {
    contactId = searchData.data.items[0].item.id;
    console.log(`Found existing contact: ${contactId}`);
  }

  // Create or get organization
  let orgId = null;
  console.log(`Creating organization for: ${assessment.company}`);
  
  const orgData = {
    "name": assessment.company,
    "address": assessment.zipcode,
    "website": assessment.website,
    "f04aa9605fd3eff31231301ee12f6d59491d0c7d": assessment.industry,
    "2638446e6db380981c0693b3c05837308b7ed3c4": assessment.employees_numeric,
    "b9b1382d70ff58d426d35c631153b7d6d0d2c809": assessment.revenue_numeric
  };

  console.log('Organization creation data:', JSON.stringify(orgData, null, 2));
  
  const orgResponse = await fetch(`${BASE_URL}/organizations?api_token=${PIPEDRIVE_API_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orgData)
  });
  
  const orgResult = await orgResponse.json();
  console.log('Organization creation response:', orgResult);
  
  if (orgResult.success) {
    orgId = orgResult.data.id;
    console.log(`Created organization with ID: ${orgId}`);
  } else {
    throw new Error(`Pipedrive organization creation failed: ${orgResult.error || 'Unknown error'} (${orgResult.errorCode || 'Unknown code'})`);
  }

  // Create contact if not exists
  if (!contactId) {
    console.log('Creating contact...');
    const contactResponse = await fetch(`${BASE_URL}/persons?api_token=${PIPEDRIVE_API_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: assessment.name,
        email: [{ value: assessment.email, primary: true }],
        phone: assessment.phone ? [{ value: assessment.phone, primary: true }] : undefined,
        org_id: orgId
      })
    });
    
    const contactResult = await contactResponse.json();
    if (contactResult.success) {
      contactId = contactResult.data.id;
      console.log(`Created contact: ${contactId}`);
    }
  }

  // Get pipeline information
  console.log('Getting pipeline information...');
  const pipelineResponse = await fetch(`${BASE_URL}/pipelines?api_token=${PIPEDRIVE_API_TOKEN}`);
  const pipelineData = await pipelineResponse.json();
  
  let pipelineId = 1; // Default
  let stageId = null;
  
  if (pipelineData.success && pipelineData.data && pipelineData.data.length > 0) {
    const pipeline = pipelineData.data.find(p => p.name === 'Projects') || pipelineData.data[0];
    pipelineId = pipeline.id;
    console.log(`Found ${pipeline.name} pipeline: ${pipelineId} stage: ${stageId}`);
  }

  // Create deal
  console.log('Creating deal...');
  const dealResponse = await fetch(`${BASE_URL}/deals?api_token=${PIPEDRIVE_API_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: `Exit Score Assessment - ${assessment.company}`,
      person_id: contactId,
      org_id: orgId,
      pipeline_id: pipelineId,
      stage_id: stageId,
      status: 'open',
      value: assessment.revenue_numeric ? assessment.revenue_numeric * 0.1 : null, // Estimate 10% of revenue as deal value
      currency: 'USD'
    })
  });
  
  const dealResult = await dealResponse.json();
  let dealId = null;
  if (dealResult.success) {
    dealId = dealResult.data.id;
    console.log(`Created deal: ${dealId}`);
  }

  // Get user information for task assignment
  console.log('Getting user information...');
  const userResponse = await fetch(`${BASE_URL}/users?api_token=${PIPEDRIVE_API_TOKEN}`);
  const userData = await userResponse.json();
  
  let userId = null;
  if (userData.success && userData.data && userData.data.length > 0) {
    const user = userData.data.find(u => u.name === 'Brecht Palombo') || userData.data[0];
    userId = user.id;
    console.log(`Found user ${user.name}: ${userId}`);
  }

  // Create follow-up task
  let taskCreated = false;
  if (userId && dealId) {
    console.log('Creating follow-up task...');
    const taskResponse = await fetch(`${BASE_URL}/activities?api_token=${PIPEDRIVE_API_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: `Follow up on Exit Score Assessment - ${assessment.company}`,
        type: 'call',
        user_id: userId,
        deal_id: dealId,
        person_id: contactId,
        org_id: orgId,
        note: `Exit Score: ${assessment.score}%\nEmail: ${assessment.email}\nPhone: ${assessment.phone || 'Not provided'}\nWebsite: ${assessment.website || 'Not provided'}\nIndustry: ${assessment.industry || 'Not specified'}`,
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Tomorrow
      })
    });
    
    const taskResult = await taskResponse.json();
    if (taskResult.success) {
      console.log(`Created follow-up task: ${taskResult.data.id}`);
      taskCreated = true;
    }
  }

  return { contactId, orgId, dealId, taskCreated: !!userId };
}

// Lead Notification
async function sendLeadNotification(assessment) {
  console.log('No notification service configured or all failed');
  return true;
}