// Test script to check Claude API directly
const testData = {
  name: "Test User",
  email: "test@example.com", 
  company: "Test Company",
  phone: "555-1234",
  industry: "Technology",
  website: "https://test.com",
  score: 75,
  responses: [
    { question: "Financial records", answer: "Yes", score: 5 },
    { question: "Management team", answer: "Partially", score: 3 }
  ],
  time_spent: 300,
  user_agent: "Test Browser",
  referrer: "direct"
};

// Send test to your Netlify function
fetch('https://exit-score.netlify.app/.netlify/functions/process-assessment-final', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(testData)
})
.then(response => response.json())
.then(data => {
  console.log('Response:', JSON.stringify(data, null, 2));
})
.catch(error => {
  console.error('Error:', error);
});