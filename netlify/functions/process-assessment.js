// Final working version with AI report generation - direct HTTP calls to Supabase API
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Load assessment structure from JSON (single source of truth)
let categories = [];
try {
    const questionsPath = path.join(process.cwd(), 'questions.json');
    const questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
    categories = questionsData.categories;
    console.log(`✅ Backend loaded ${categories.length} categories with ${categories.reduce((sum, cat) => sum + cat.questions.length, 0)} total questions from JSON`);
} catch (error) {
    console.error('❌ Backend failed to load questions from JSON:', error);
    console.log('📂 Backend using fallback hardcoded structure');
    // Fallback to hardcoded structure
    categories = [
  {
    name: "Risk of Change of Ownership",
    weight: 0.30,
    questions: [
      "Can your business operate profitably for 30+ days without you being present?",
      "Are all critical business processes documented so someone else could follow them?",
      "Do you have at least one key employee who could manage daily operations?",
      "Are the majority of your key customer relationships maintained by employees other than yourself?"
    ]
  },
  {
    name: "Company Growth", 
    weight: 0.20,
    questions: [
      "Has your business grown revenue in the past 12 months?",
      "Has your revenue increased in at least 3 of the last 4 years?",
      "Do you regularly win new customers each month?"
    ]
  },
  {
    name: "Industry Growth",
    weight: 0.15,
    questions: [
      "Is demand for your type of business generally increasing?",
      "Do you have certifications, licenses, or permits that competitors would need?",
      "Is your business resistant to being replaced by technology or automation?"
    ]
  },
  {
    name: "Market Demand",
    weight: 0.15,
    questions: [
      "Do you have repeat customers or predictable revenue streams?",
      "Are your net profit margins 10% or greater?",
      "Has anyone asked if they can buy your business in the last few years?"
    ]
  },
  {
    name: "Company Rating",
    weight: 0.10,
    questions: [
      "Are your financial records prepared by a bookkeeper or accountant?",
      "Do you keep business and personal expenses completely separate?",
      "Does your largest customer represent less than 20% of your total revenue?",
      "Do you have written contracts or agreements with your key customers?"
    ]
  },
  {
    name: "Competitiveness",
    weight: 0.10,
    questions: [
      "Do you regularly get referrals from existing customers?",
      "Can you charge similar or higher prices than your main competitors?",
      "Do you have a 4-star rating or higher online, or can you provide 10+ positive customer references?",
      "Do potential customers contact you directly without heavy marketing?",
      "Do you have proprietary processes, trade secrets, or intellectual property that competitors can't easily copy?"
    ]
  }
    ];
}

// Function to calculate score using the loaded structure
function calculateScore(answers) {
    let totalScore = 0;
    let categoryBreakdown = [];
    
    categories.forEach((category, catIndex) => {
        let categoryScore = 0;
        let categoryDetails = {
            name: category.name,
            weight: category.weight,
            rawScore: 0,
            weightedScore: 0
        };
        
        category.questions.forEach((question, qIndex) => {
            const answer = answers.find(a => 
                a.category === catIndex && a.question === qIndex
            );
            
            if (answer && answer.answer === true) {
                categoryScore += question.weight;
            } else if (answer && answer.answer === null) {
                categoryScore += question.weight * 0.15; // 15% for "Don't Know"
            }
            // No points for false answers (0%)
        });
        
        categoryDetails.rawScore = categoryScore;
        categoryDetails.weightedScore = categoryScore * category.weight;
        totalScore += categoryDetails.weightedScore;
        categoryBreakdown.push(categoryDetails);
    });
    
    return {
        finalScore: Math.round(totalScore * 100),
        categoryBreakdown: categoryBreakdown
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
    console.log('🔥 NEW VERSION: Assessment submission received');
    
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

    // Data sanitization
    assessment.name = assessment.name?.toString().trim().substring(0, 100);
    assessment.company = assessment.company?.toString().trim().substring(0, 100);
    assessment.email = assessment.email?.toString().trim().toLowerCase().substring(0, 254);

    console.log(`Processing assessment for ${assessment.email} - v2024`);

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
    console.log('🔥 NEW VERSION: Assessment saved successfully');

    // Generate AI report
    let aiReport = '';
    let reportGenerated = false;
    let aiError = null;
    
    try {
      console.log('🔥 NEW VERSION: Starting AI report generation...');
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

// Build structured data for AI analysis
function buildStructuredAssessmentData(assessment) {
  const categoryScores = calculateCategoryScores(assessment.responses || []);
  
  let categoryAnalysis = '';
  let responseAnalysis = '';
  
  categories.forEach((category, catIndex) => {
    const score = categoryScores[catIndex];
    const percentage = Math.round((score.points / score.maxPoints) * 100);
    
    categoryAnalysis += `${catIndex + 1}. **${category.name}** (${Math.round(category.weight * 100)}% weight) - Score: ${percentage}%\n`;
    categoryAnalysis += `   Focus: ${getCategoryDescription(category.name)}\n\n`;
    
    responseAnalysis += `**${category.name.toUpperCase()}** (${percentage}% score):\n`;
    
    category.questions.forEach((question, qIndex) => {
      const response = (assessment.responses || []).find(r => 
        r.category === catIndex && r.question === qIndex
      );
      
      if (response) {
        const answerText = response.answer === true ? '✅ YES' : 
                          response.answer === false ? '❌ NO' : '❓ DON\'T KNOW';
        const weight = question.weight ? Math.round(question.weight * 100) : Math.round(100 / category.questions.length);
        
        responseAnalysis += `- Q${question.id}: ${question.text}\n`;
        responseAnalysis += `  Response: ${answerText} (${weight}% of category weight)\n`;
        
        // Add interpretation for key responses
        if (response.answer === false || response.answer === null) {
          responseAnalysis += `  ⚠️  ${response.answer === null ? 'Uncertainty indicates need for clarification' : 'Area for improvement'}\n`;
        }
      }
    });
    
    responseAnalysis += '\n';
  });
  
  return {
    categoryAnalysis,
    responseAnalysis
  };
}

// Standardized category opening templates for consistent reports
function getCategoryOpeningTemplate(categoryName, score) {
  const templates = {
    "Risk of Change of Ownership": {
      opening: `**Risk of Change of Ownership ${score}%**\n\nThe risk of change of ownership is often the biggest concern in any buyer's mind. The question they need to answer is "can I be successful with this business without the current owner?" This area weighs most heavily in our evaluation because buyer financing, valuation multiples, and deal structure all depend on transferability.`,
      focus: "Reducing owner dependency and proving the business can thrive under new ownership"
    },
    "Company Growth": {
      opening: `**Company Growth ${score}%**\n\nBuyers pay premium multiples for growing businesses and discount stagnant ones. Growth demonstrates market demand, management competence, and future potential. This area significantly impacts your valuation because buyers project future cash flows based on growth trends.`,
      focus: "Demonstrating consistent growth patterns and strategic planning capabilities"
    },
    "Industry Growth": {
      opening: `**Industry Growth ${score}%**\n\nBuyers evaluate whether they're buying into a sunrise or sunset industry. Industry dynamics affect everything from financing availability to exit multiples. Buyers want confidence that market tailwinds will continue supporting the business long-term.`,
      focus: "Positioning within growing markets and building competitive barriers"
    },
    "Market Demand": {
      opening: `**Market Demand ${score}%**\n\nThis area evaluates whether your business model attracts buyers. Factors like equipment intensity, required expertise, revenue predictability, and operational complexity all influence buyer pool size. More potential buyers means higher valuations and better terms.`,
      focus: "Creating a business model that appeals to the broadest buyer base"
    },
    "Company Rating": {
      opening: `**Company Rating ${score}%**\n\nBuyers conduct extensive due diligence on financial systems and operational controls. This area can make or break deals during the due diligence phase. Clean books, documented processes, and professional systems reduce buyer risk and support asking price.`,
      focus: "Building institutional-grade financial and operational systems"
    },
    "Competitiveness": {
      opening: `**Competitiveness ${score}%**\n\nBuyers need confidence that the business can maintain its market position post-acquisition. This area evaluates sustainable competitive advantages, pricing power, and customer loyalty. Strong competitive moats justify premium valuations and attract strategic buyers.`,
      focus: "Building and communicating sustainable competitive advantages"
    }
  };
  
  return templates[categoryName] || {
    opening: `**${categoryName} ${score}%**\n\nThis category evaluates critical business factors that impact buyer decisions and valuation.`,
    focus: "Business evaluation criteria"
  };
}

// Get category description for AI context (legacy support)
function getCategoryDescription(categoryName) {
  const template = getCategoryOpeningTemplate(categoryName, 0);
  return template.focus;
}

// Build category templates for AI prompt
function buildCategoryTemplates(assessment) {
  const categoryScores = calculateCategoryScores(assessment.responses || []);
  let templates = '';
  
  categories.forEach((category, catIndex) => {
    const score = categoryScores[catIndex];
    const percentage = Math.round((score.points / score.maxPoints) * 100);
    const template = getCategoryOpeningTemplate(category.name, percentage);
    
    templates += `${template.opening}\n\n`;
    templates += `After this exact opening, analyze the specific responses and provide:\n`;
    templates += `- How the responses impact buyer perception\n`;
    templates += `- 2-3 specific optimization recommendations\n`;
    templates += `- Realistic timeline and effort level for improvements\n\n`;
    templates += `---\n\n`;
  });
  
  return templates;
}

// Generate AI report
async function generateAIReport(assessment) {
  console.log('Building prompt for Claude API...');
  
  // Build structured response data for AI
  const structuredData = buildStructuredAssessmentData(assessment);
  
  const prompt = `You are a senior M&A advisor at ARX Business Brokers, a boutique firm specializing in selling businesses valued between $1M-$50M in the Pacific Northwest. You're preparing a personalized Exit Score report for a business owner.

**EXPERTISE CONTEXT:**
- 15+ years M&A experience
- Specialized in owner-operated businesses  
- Deep understanding of buyer psychology and valuation drivers
- Focus on businesses with $1M-$25M revenue

**CLIENT BUSINESS:**
- Company: ${assessment.company}
- Industry: ${assessment.industry || 'Not specified'}  
- Location: ${assessment.zipcode ? `ZIP ${assessment.zipcode} (Pacific Northwest market)` : 'Pacific Northwest region'}
- Website: ${assessment.website || 'Not provided'}
- **Exit Score: ${assessment.score}%**

**ASSESSMENT METHODOLOGY:**
Our Exit Score evaluates 6 critical categories that buyers analyze during due diligence:

${structuredData.categoryAnalysis}

**DETAILED RESPONSES:**
${structuredData.responseAnalysis}

**CRITICAL FORMATTING REQUIREMENTS:**
- Use the EXACT standardized category openings provided (word-for-word)
- Follow the standardized structure exactly
- Professional but warm tone - acknowledge the business owner's achievement
- Lead with strengths, frame weaknesses as "value enhancement opportunities"
- Provide specific, actionable insights (not generic advice)
- Reference actual responses to build credibility
- Include realistic timelines and investment estimates for improvements
- Focus on buyer perspective while being encouraging

**REQUIRED STRUCTURE:**

**🎯 EXECUTIVE SUMMARY**
- What does a ${assessment.score}% score mean for sale prospects?
- 2-3 sentence assessment of overall readiness
- Highlight 1-2 major strengths and top priority

**📊 CATEGORY ANALYSIS**
For each category, you MUST use the exact standardized opening provided below, then add specific analysis:

${buildCategoryTemplates(assessment)}

**💪 KEY COMPETITIVE ADVANTAGES** 
- Top 2-3 strengths that differentiate this business
- How these translate to buyer appeal and premium valuation

**🎯 PRIORITY VALUE ENHANCEMENTS**
- Top 3 specific improvements with highest ROI
- Realistic timeline (30-90 days typical)
- Estimated effort/investment level (Low/Medium/High)

**🌍 MARKET CONSIDERATIONS**
${assessment.zipcode ? `Pacific Northwest market dynamics for ${assessment.industry} businesses` : `General market factors for ${assessment.industry} sector`}

**🚀 RECOMMENDED NEXT STEPS**
- 2-3 concrete 30-day actions
- When to consider engaging a broker
- Reference to ARX's specific expertise

**LENGTH:** Target 800-1200 words for comprehensive analysis.

Generate a report that positions ARX as the trusted advisor who understands both the emotional and financial aspects of selling a life's work.`;

  console.log('Prompt length:', prompt.length);
  console.log('Making Claude API request...');
  
  const requestBody = {
    model: 'claude-3-5-sonnet-20241022',
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

// Create Pipedrive lead
async function createPipedriveLead(assessment) {
  const baseUrl = 'https://arx.pipedrive.com/api/v1';
  const apiToken = process.env.PIPEDRIVE_KEY;
  
  try {
    // 1. Look for existing contact by email
    console.log('Searching for existing contact...');
    const searchResponse = await fetch(`${baseUrl}/persons/search?term=${encodeURIComponent(assessment.email)}&fields=email&api_token=${apiToken}`);
    const searchData = await searchResponse.json();
    
    let contactId = null;
    let orgId = null;
    
    // Check if contact exists
    if (searchData.success && searchData.data && searchData.data.items && searchData.data.items.length > 0) {
      const existingContact = searchData.data.items.find(item => 
        item.item && item.item.emails && item.item.emails.includes(assessment.email)
      );
      
      if (existingContact) {
        contactId = existingContact.item.id;
        orgId = existingContact.item.organization && existingContact.item.organization.id;
        console.log('Found existing contact:', contactId);
      }
    }
    
    // 2. Create organization if it doesn't exist
    if (!orgId) {
      console.log('Creating organization for:', assessment.company);
      
      const orgCreateData = {
        name: assessment.company,
        address: assessment.zipcode || null,
        website: assessment.website || null,
        // Custom fields with specific IDs
        'f04aa9605fd3eff31231301ee12f6d59491d0c7d': assessment.industry || null, // Industry
        '2638446e6db380981c0693b3c05837308b7ed3c4': assessment.employees_numeric || null, // Employees  
        'b9b1382d70ff58d426d35c631153b7d6d0d2c809': assessment.revenue_numeric || null // Revenue
      };
      
      console.log('Organization creation data:', JSON.stringify(orgCreateData, null, 2));
      
      const orgResponse = await fetch(`${baseUrl}/organizations?api_token=${apiToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orgCreateData)
      });
      
      const orgData = await orgResponse.json();
      console.log('Organization creation response:', orgData);
      
      if (orgData.success) {
        orgId = orgData.data.id;
        console.log('Created organization with ID:', orgId);
      } else {
        console.error('Failed to create organization:', orgData);
      }
    } else if (orgId && (assessment.revenue_numeric || assessment.employees_numeric)) {
      // Update existing organization with correct field names
      console.log('Updating existing organization ID:', orgId);
      console.log('Update data:', {
        annual_revenue: assessment.revenue_numeric,
        employee_count: assessment.employees_numeric
      });
      
      try {
        const updateOrgResponse = await fetch(`${baseUrl}/organizations/${orgId}?api_token=${apiToken}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: assessment.zipcode || null,
            website: assessment.website || null,
            // Custom fields with specific IDs
            'f04aa9605fd3eff31231301ee12f6d59491d0c7d': assessment.industry || null, // Industry
            '2638446e6db380981c0693b3c05837308b7ed3c4': assessment.employees_numeric || null, // Employees  
            'b9b1382d70ff58d426d35c631153b7d6d0d2c809': assessment.revenue_numeric || null // Revenue
          })
        });
        
        const updateResult = await updateOrgResponse.json();
        console.log('Organization update response:', updateResult);
        
        if (updateResult.success) {
          console.log('Organization updated successfully with revenue/employee data');
        } else {
          console.error('Organization update failed:', updateResult);
        }
      } catch (error) {
        console.error('Failed to update organization:', error);
      }
    }
    
    // 3. Create contact if it doesn't exist
    if (!contactId) {
      console.log('Creating contact...');
      const contactResponse = await fetch(`${baseUrl}/persons?api_token=${apiToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: assessment.name,
          email: [assessment.email],
          phone: assessment.phone ? [assessment.phone] : [],
          org_id: orgId
        })
      });
      
      const contactData = await contactResponse.json();
      if (contactData.success) {
        contactId = contactData.data.id;
        console.log('Created contact:', contactId);
      } else {
        console.error('Failed to create contact:', contactData);
      }
    }
    
    // 4. Get pipeline ID for "Projects"
    console.log('Getting pipeline information...');
    const pipelinesResponse = await fetch(`${baseUrl}/pipelines?api_token=${apiToken}`);
    const pipelinesData = await pipelinesResponse.json();
    
    let pipelineId = null;
    let stageId = null;
    
    if (pipelinesData.success && pipelinesData.data) {
      const projectsPipeline = pipelinesData.data.find(p => p.name === 'Projects');
      if (projectsPipeline) {
        pipelineId = projectsPipeline.id;
        // Use first stage as default
        stageId = projectsPipeline.stages && projectsPipeline.stages[0] ? projectsPipeline.stages[0].id : null;
        console.log('Found Projects pipeline:', pipelineId, 'stage:', stageId);
      }
    }
    
    // 5. Create deal
    console.log('Creating deal...');
    const dealData = {
      title: `${assessment.company} - Exit Assessment`,
      person_id: contactId,
      org_id: orgId,
      pipeline_id: pipelineId,
      stage_id: stageId
    };
    
    // Add custom fields
    if (assessment.score) {
      dealData['cd731d6cf78b3b67f7a492ff4dc6e62f1277caea'] = assessment.score; // Exit Score field
    }
    dealData.channel = 284; // Source Channel = "Score App" (option ID 284)
    
    const dealResponse = await fetch(`${baseUrl}/deals?api_token=${apiToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dealData)
    });
    
    const dealResult = await dealResponse.json();
    let dealId = null;
    
    if (dealResult.success) {
      dealId = dealResult.data.id;
      console.log('Created deal:', dealId);
    } else {
      console.error('Failed to create deal:', dealResult);
    }
    
    // 6. Get user ID for Brecht Palombo
    console.log('Getting user information...');
    const usersResponse = await fetch(`${baseUrl}/users?api_token=${apiToken}`);
    const usersData = await usersResponse.json();
    
    let userId = null;
    if (usersData.success && usersData.data) {
      const brecht = usersData.data.find(u => 
        u.name && u.name.toLowerCase().includes('brecht') && u.name.toLowerCase().includes('palombo')
      );
      if (brecht) {
        userId = brecht.id;
        console.log('Found user Brecht Palombo:', userId);
      } else {
        // Fallback to first active user
        const activeUser = usersData.data.find(u => u.active_flag);
        if (activeUser) {
          userId = activeUser.id;
          console.log('Using fallback user:', activeUser.name, userId);
        }
      }
    }
    
    // 7. Create follow-up task
    if (contactId && userId) {
      console.log('Creating follow-up task...');
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const taskResponse = await fetch(`${baseUrl}/activities?api_token=${apiToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `Follow up on exit assessment - ${assessment.company}`,
          type: 'email',
          due_date: today,
          person_id: contactId,
          deal_id: dealId,
          user_id: userId,
          note: generateDetailedAssessmentNote(assessment)
        })
      });
      
      const taskResult = await taskResponse.json();
      if (taskResult.success) {
        console.log('Created follow-up task:', taskResult.data.id);
      } else {
        console.error('Failed to create task:', taskResult);
      }
    }
    
    return { contactId, orgId, dealId, taskCreated: !!userId };
    
  } catch (error) {
    console.error('Pipedrive integration error:', error);
    throw error;
  }
}

// Send lead notification
async function sendLeadNotification(assessment) {
  const message = `🎯 NEW LEAD ALERT!

Company: ${assessment.company}
Contact: ${assessment.name}
Email: ${assessment.email}
Phone: ${assessment.phone || 'Not provided'}
Industry: ${assessment.industry || 'Not specified'}
Revenue: ${assessment.revenue || 'Not specified'}
Employees: ${assessment.employees || 'Not specified'}
Assessment Score: ${assessment.score}%

Location: ${assessment.zipcode ? `Zip ${assessment.zipcode}` : 'Not provided'}
Website: ${assessment.website || 'Not provided'}

This lead was automatically processed and added to Pipedrive.`;

  // Option 1: Email notification (simplest)
  if (process.env.SMTP_HOST && process.env.NOTIFICATION_EMAIL) {
    try {
      // Simple fetch to a notification service or email API
      const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: process.env.EMAILJS_SERVICE_ID,
          template_id: process.env.EMAILJS_TEMPLATE_ID,
          user_id: process.env.EMAILJS_USER_ID,
          template_params: {
            to_email: process.env.NOTIFICATION_EMAIL,
            message: message,
            company: assessment.company,
            score: assessment.score
          }
        })
      });
      
      if (emailResponse.ok) {
        console.log('Email notification sent');
        return;
      }
    } catch (error) {
      console.error('Email notification failed:', error);
    }
  }
  
  // Option 2: Slack webhook (if email fails or not configured)
  if (process.env.SLACK_WEBHOOK_URL) {
    try {
      const slackResponse = await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: message,
          channel: '#leads', // or whatever channel you prefer
          username: 'Assessment Bot',
          icon_emoji: ':chart_with_upwards_trend:'
        })
      });
      
      if (slackResponse.ok) {
        console.log('Slack notification sent');
        return;
      }
    } catch (error) {
      console.error('Slack notification failed:', error);
    }
  }
  
  // Option 3: Discord webhook (fallback)
  if (process.env.DISCORD_WEBHOOK_URL) {
    try {
      const discordResponse = await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message,
          username: 'Lead Alerts'
        })
      });
      
      if (discordResponse.ok) {
        console.log('Discord notification sent');
        return;
      }
    } catch (error) {
      console.error('Discord notification failed:', error);
    }
  }
  
  console.log('No notification service configured or all failed');
}

// Generate detailed assessment note with category scores and Q&A
function generateDetailedAssessmentNote(assessment) {
  // Calculate category scores
  const categoryScores = calculateCategoryScores(assessment.responses || []);
  
  let note = `Follow up with ${assessment.name} regarding their business exit assessment.

COMPANY INFORMATION:
• Company: ${assessment.company}
• Industry: ${assessment.industry || 'Not specified'}  
• Revenue: ${assessment.revenue || 'Not specified'}
• Employees: ${assessment.employees || 'Not specified'}
• Location: ${assessment.zipcode ? `Zip ${assessment.zipcode}` : 'Not provided'}
• Website: ${assessment.website || 'Not provided'}

OVERALL ASSESSMENT SCORE: ${assessment.score}%

CATEGORY BREAKDOWN:`;

  // Add category scores
  categories.forEach((category, catIndex) => {
    const score = categoryScores[catIndex];
    const percentage = Math.round((score.points / score.maxPoints) * 100);
    note += `\n• ${category.name}: ${percentage}% (${score.points}/${score.maxPoints} points, weight: ${Math.round(category.weight * 100)}%)`;
  });

  note += '\n\nDETAILED RESPONSES:';

  // Add questions and answers by category
  categories.forEach((category, catIndex) => {
    note += `\n\n${category.name.toUpperCase()}:`;
    
    category.questions.forEach((question, qIndex) => {
      // Find the response for this question
      const response = (assessment.responses || []).find(r => 
        r.category === catIndex && r.question === qIndex
      );
      
      if (response) {
        const answerText = response.answer === true ? 'YES' : 
                          response.answer === false ? 'NO' : 'DON\'T KNOW';
        const points = response.answer === true ? '5 points' :
                      response.answer === false ? '0 points' : '0.75 points';
        note += `\n  ${qIndex + 1}. ${question}`;
        note += `\n     Answer: ${answerText} (${points})`;
        note += '\n'; // Add extra line break between questions
      }
    });
  });

  note += '\n\nNEXT STEPS:';
  note += '\n• Follow up within 24-48 hours';
  note += '\n• Discuss assessment results and improvement opportunities';
  note += '\n• Explore ARX services for sale preparation';

  return note;
}

// Calculate scores by category
function calculateCategoryScores(responses) {
  return categories.map((category, catIndex) => {
    let points = 0;
    let maxPoints = 0;
    
    category.questions.forEach((question, qIndex) => {
      const questionWeight = question.weight || (1 / category.questions.length); // Fallback for old structure
      const questionMaxPoints = questionWeight * 100; // Convert weight to points scale
      maxPoints += questionMaxPoints;
      
      const response = responses.find(r => 
        r.category === catIndex && r.question === qIndex
      );
      
      if (response && response.answer === true) {
        points += questionMaxPoints;
      } else if (response && response.answer === null) {
        points += questionMaxPoints * 0.15; // 15% for "Don't Know"
      }
      // 0 points for false answers
    });
    
    return { points, maxPoints };
  });
}