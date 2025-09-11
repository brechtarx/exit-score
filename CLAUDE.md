# AI Sales Readiness Assessment Platform

## Project Overview

You are building a web-based Business Sales Readiness Score (BSRS) assessment tool for **Arx Business Brokers** (arxbrokers.com), an M&A advisory firm serving business owners preparing to sell companies in the $1M-$50M revenue range.

## Core Objectives

1. **Lead Generation**: Capture high-quality prospects through valuable assessment
2. **Qualification**: Score and segment leads based on sales readiness
3. **Value Delivery**: Provide immediate, personalized insights to business owners
4. **Automation**: Integrate with existing CRM and marketing workflows

## Technical Architecture

### Frontend Requirements
- **Domain**: score.arxbrokers.com
- **Framework**: Custom HTML/CSS/JavaScript (no complex frameworks needed)
- **Design**: Match arxbrokers.com branding
  - Typography: Inter and Open Sans fonts
  - Colors: Extract from arxbrokers.com
  - Logo: User will provide file
- **Performance**: Mobile-responsive, <3 second load times
- **Features**: Progress tracking, back button, save-and-resume capability

### Assessment Structure
- **37 total questions** across 6 weighted categories
- **Question types**: Yes/No/Don't Know/NA with different scoring
- **Scoring algorithm**: Weighted by category importance

### Categories & Weights:
1. **Business Model Attractiveness (15%)**
2. **Financial Integrity & Operations (10%)**
3. **Market Dynamics (15%)**
4. **Growth Performance (Weight TBD)**
5. **Competitive Moat (10%)**
6. **Additional Categories**: Legal Compliance, Operational Excellence, Marketing Effectiveness

### Key Questions Include:
- Revenue predictability/contract-based income
- Net profit margins (>15% threshold)
- Customer concentration risk (<15% single customer)
- Industry growth rate (>3% annually)
- Equipment investment ratio (<50% of revenue)
- P&L/tax return alignment
- Customer retention rates (80%+ target)

### AI Report Generation
- **API**: Claude API (user has Max Plan)
- **Report Structure**:
  - Overall BSRS score (0-100)
  - Category breakdown with scores
  - Question-level insights and explanations
  - Specific recommendations for "No" and "Don't Know" answers
  - Top 3 priorities to address
  - Industry-specific guidance
  - Clear call-to-action for broker consultation

### Lead Capture & Integration
- **Required Fields**: Name, Email, Company Name, Phone
- **Existing Tools**: Make.com, Zapier, JotForm accounts available
- **CRM**: Pipedrive integration for lead management
- **Email**: Automated nurture sequences based on score ranges

### Analytics & Tracking
- **Conversion Tracking**: Drop-off points, completion rates
- **Retargeting**: Pixel implementation for remarketing
- **A/B Testing**: Framework for optimization
- **Performance Metrics**: Question-level engagement tracking

## Development Priorities

### Phase 1 (MVP)
1. Core 37-question assessment interface
2. Basic weighted scoring algorithm
3. Lead capture form
4. Simple results page with score

### Phase 2 (Enhanced)
1. AI-generated personalized reports
2. PDF download capability
3. Email delivery automation
4. Analytics implementation

### Phase 3 (Advanced)
1. Advanced segmentation and scoring
2. Industry benchmarking
3. CRM integration
4. Marketing automation workflows

## Coding Standards

### HTML/CSS/JS Guidelines
- **Semantic HTML**: Use proper semantic elements
- **CSS**: Modern flexbox/grid, mobile-first responsive design
- **JavaScript**: Vanilla JS preferred, ES6+ syntax
- **Performance**: Minimize external dependencies
- **Accessibility**: WCAG 2.1 compliance
- **SEO**: Proper meta tags, structured data

### File Structure
```
/
├── index.html              # Assessment landing page
├── assessment.html         # Main assessment interface  
├── results.html           # Results display page
├── assets/
│   ├── css/
│   │   ├── main.css       # Primary styles
│   │   └── assessment.css # Assessment-specific styles
│   ├── js/
│   │   ├── assessment.js  # Assessment logic
│   │   ├── scoring.js     # Scoring algorithm
│   │   └── api.js         # Claude API integration
│   └── images/
├── data/
│   └── questions.json     # Assessment questions data
└── CLAUDE.md             # This file
```

## API Integration Requirements

### Claude API Setup
- **Model**: claude-3-5-sonnet-20241022
- **Authentication**: User's API key (Max Plan)
- **Rate Limiting**: Handle API limits gracefully
- **Error Handling**: Fallback for API failures

### External Integrations
- **Make.com**: Webhook endpoints for automation
- **Analytics**: Google Analytics + custom tracking
- **Email**: Integration with existing email marketing platform

## Business Context

### Target Audience
- Business owners aged 65+ considering retirement
- Companies doing $1M-$50M annual revenue
- 6-36 month sale timeline
- Need education and trust-building before engaging broker

### Success Metrics
- **Completion Rate**: Target >60%
- **Lead Quality**: Qualified prospects with realistic sale timeline
- **Conversion**: Assessment → consultation bookings
- **Engagement**: Time spent on results, report downloads

### Industry Knowledge
- Assessment reflects real M&A valuation factors
- Questions align with buyer due diligence priorities
- Scoring methodology matches market realities
- Language appropriate for business owner audience

## Security & Compliance

### Data Protection
- **HTTPS**: SSL certificate required
- **Data Minimal**: Only collect necessary information
- **Privacy**: Clear privacy policy and opt-ins
- **Storage**: Secure handling of lead data

### Best Practices
- Input validation and sanitization
- XSS and CSRF protection
- Rate limiting on form submissions
- Backup and recovery procedures

## Testing Requirements

### Functionality Testing
- Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- Mobile responsiveness across devices
- Form validation and error handling
- API integration reliability

### Performance Testing
- Page load speed optimization
- Database query performance
- API response time monitoring
- User experience flow testing

## Notes for Implementation

- Prioritize fast MVP delivery over perfect features
- Focus on conversion optimization throughout
- Maintain clean, maintainable code for future iterations
- Document API integrations for team handoff
- Consider scalability for high traffic volumes

## Reference Materials

- **Website**: arxbrokers.com (for branding reference)
- **Competition**: Research other business broker assessment tools
- **Industry**: M&A transaction process knowledge essential
- **User Experience**: Business owner perspective and language

---

# Current Implementation Architecture

## Actual File Structure

```
/
├── index.html                              # Single-page assessment application
├── questions.json                          # Assessment questions and weights
├── package.json                            # Node.js dependencies
├── tailwind.config.js                      # Tailwind CSS configuration
├── postcss.config.js                       # PostCSS configuration
├── netlify/functions/                      # Serverless backend functions
│   ├── process-assessment.js               # Main assessment processing
│   ├── update-assessment.js                # Assessment update handler
│   ├── process-assessment-debug.js         # Debug version with logging
│   ├── process-assessment-simple.js        # Simplified version
│   ├── process-assessment-http.js          # HTTP method version
│   └── get-pipedrive-fields.js            # Pipedrive field discovery
├── assets/css/
│   └── tailwind.css                        # Compiled Tailwind CSS
├── src/
│   └── input.css                           # Source CSS for Tailwind
└── data/
    └── questions.json                      # Backup questions file
```

## Frontend Architecture

### Single Page Application (SPA)
- **Main File**: `index.html` (~31k tokens, extensive inline JavaScript)
- **Framework**: Vanilla JavaScript with embedded assessment logic
- **Styling**: Tailwind CSS for responsive design
- **No external JavaScript files** - all logic is embedded in HTML

### Assessment Flow
1. **Landing Section**: Hero, value proposition, start button
2. **Question Flow**: 26 questions across 6 categories with progress tracking
3. **Lead Capture**: Name/email collection before results
4. **Company Details**: Additional business information
5. **Results Display**: Score calculation and report generation

### JavaScript Architecture (Inline)
```javascript
// Core data structure loaded from categories array
let categories = [...] // 6 categories with weighted questions

// State management
let currentCategory = 0;
let currentQuestion = 0;
let answers = [];
let userInfo = {};

// Key functions:
- showNextQuestion() // Question navigation
- calculateScore() // Weighted scoring algorithm
- submitAssessment() // API submission
- updateProgress() // UI updates
```

## Backend Architecture (Netlify Functions)

### Primary Function: `process-assessment.js`
**Purpose**: Main assessment processing endpoint

**Flow**:
1. **Validation**: Email format, required fields, rate limiting
2. **reCAPTCHA**: Google reCAPTCHA v3 verification (score > 0.5)
3. **Database**: Save to Supabase `assessments` table
4. **AI Report**: Claude API integration for personalized reports
5. **Email**: Gmail API for draft creation (domain delegation)
6. **CRM**: Pipedrive integration (contacts, organizations, deals, tasks)
7. **Response**: JSON with processing status and results

**Dependencies**:
- `googleapis`: Gmail API integration
- Node.js fetch: HTTP requests
- Environment variables for API keys

### Secondary Function: `update-assessment.js`
**Purpose**: Update assessments with additional company details

**Flow**:
1. Update Supabase record with company/phone/website
2. Update corresponding Pipedrive records
3. Return success status

## Data Architecture

### Questions Structure (questions.json)
```json
{
  "categories": [
    {
      "name": "Risk of Change of Ownership",
      "weight": 0.3,
      "questions": [
        {
          "id": 1,
          "text": "Question text...",
          "weight": 0.35,
          "yesText": "Positive indicator",
          "noText": "Risk factor"
        }
      ]
    }
  ]
}
```

### Assessment Categories & Weights
1. **Risk of Change of Ownership** (30%) - 5 questions
2. **Company Growth** (20%) - 3 questions  
3. **Industry Growth** (15%) - 2 questions
4. **Market Demand** (15%) - 6 questions
5. **Company Rating** (10%) - 6 questions
6. **Competitiveness** (10%) - 4 questions

**Total**: 26 questions (not 37 as originally planned)

### Scoring Algorithm
```javascript
// Weighted scoring system
- Yes answer = full weight points
- Don't Know = 15% of weight points  
- No answer = 0 points

// Final score calculation
totalScore = Σ(categoryWeight × categoryScore)
```

## Database Schema (Supabase)

### Table: `assessments`
```sql
- id (primary key)
- created_at (timestamp)
- name (text)
- email (text) 
- company (text)
- phone (text, nullable)
- industry (text, nullable)
- website (text, nullable) 
- zipcode (text, nullable)
- revenue (text, nullable)
- revenue_numeric (integer, nullable)
- employees (text, nullable)
- employees_numeric (integer, nullable)
- score (integer)
- responses (jsonb) // Array of answer objects
- time_spent (integer) // Seconds
- user_agent (text, nullable)
- referrer (text, nullable)
- processed (boolean, default false)
- gmail_draft_created (boolean, default false)
- pipedrive_created (boolean, default false)
- form_step_completed (integer, default 1)
- report_text (text, nullable) // AI-generated report
- pipedrive_person_id (integer, nullable)
- pipedrive_org_id (integer, nullable)  
- pipedrive_deal_id (integer, nullable)
```

## API Integrations

### Claude API Integration
- **Model**: `claude-3-5-haiku-20241022` (optimized for cost)
- **Purpose**: Generate personalized business sale readiness reports
- **Prompt Engineering**: Structured assessment data → actionable insights
- **Error Handling**: Graceful degradation if AI fails

### Pipedrive CRM Integration  
- **API Token**: Environment variable `PIPEDRIVE_KEY`
- **Workflow**:
  1. Search for existing person by email
  2. Create organization with custom fields:
     - Industry: `f04aa9605fd3eff31231301ee12f6d59491d0c7d`
     - Employee Count: `employee_count` (recently updated)
     - Revenue: `b9b1382d70ff58d426d35c631153b7d6d0d2c809`
  3. Create person (contact) linked to organization
  4. Create deal in "Projects" pipeline
  5. Create follow-up task with assessment details

### Gmail API Integration
- **Service Account**: Domain delegation for automated email drafts
- **Purpose**: Create personalized report email drafts
- **HTML Template**: Styled email with full AI report content

### Google reCAPTCHA v3
- **Site Key**: `6LdrH68rAAAAADuJOKxj-FLpKB8fUNFX-I6mYeAA`
- **Threshold**: Score > 0.5 required for submission
- **Integration**: Client-side token generation + server-side verification

## Deployment Architecture

### Hosting: Netlify
- **Domain**: `exit-score.netlify.app`
- **Continuous Deployment**: GitHub integration
- **Functions**: Serverless backend on Netlify Functions
- **Environment Variables**: Secure API key storage

### Environment Variables Required
```
SUPABASE_URL=https://qbctmoqhpytlzjoxzpvq.supabase.co
SUPABASE_SERVICE_KEY=[service_role key]
CLAUDE_API_KEY=[Anthropic API key]
PIPEDRIVE_KEY=[REDACTED_PIPEDRIVE_KEY]
GOOGLE_SERVICE_ACCOUNT_KEY=[JSON service account]
GMAIL_USER_EMAIL=[Gmail account for drafts]
RECAPTCHA_SECRET_KEY=[Google reCAPTCHA secret]
```

## Security Implementation

### Input Validation
- Email regex validation
- Required field enforcement  
- Rate limiting (minimum 30 seconds assessment time)
- Honeypot field for bot detection

### Data Protection
- HTTPS enforcement via Netlify
- Environment variable security
- Supabase RLS (Row Level Security)
- No client-side API key exposure

## Performance Optimizations

### Frontend
- Single HTML file reduces HTTP requests
- Tailwind CSS purging for minimal bundle size
- Lazy loading for images
- Progressive enhancement for JavaScript

### Backend  
- Serverless functions for scalability
- Efficient database queries
- Error handling with graceful degradation
- Async API calls where possible

## Development Workflow

### Build Process
```bash
npm run build:css    # Compile Tailwind CSS
npm run watch:css    # Development CSS watching  
```

### Testing Utilities
- `scoring-system-test.html`: Test scoring calculations
- `test-claude.js`: Test Claude API integration
- Multiple function versions for debugging

## Current Status & Next Steps

### Working Features ✅
- Complete 26-question assessment flow
- Weighted scoring algorithm
- Supabase data persistence  
- AI report generation via Claude API
- Pipedrive CRM integration
- Gmail draft creation
- reCAPTCHA security
- Responsive design

### Recent Updates
- Employee count field updated to use `employee_count` key in Pipedrive
- Enhanced error handling and logging
- Improved assessment validation

### Development Considerations
- All assessment logic is in single HTML file (consider modularization for maintainability)
- Questions hardcoded in both HTML and JSON (sync required for changes)
- Multiple function versions exist (consolidation opportunity)
- No automated testing suite (manual testing required)