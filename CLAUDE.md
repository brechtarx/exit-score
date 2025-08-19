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