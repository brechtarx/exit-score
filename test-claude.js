// Test script to check Claude API directly
const testData = {
  name: "John Smith",
  email: "test.user@testcompany789.com", 
  company: "Test Manufacturing Co",
  phone: "5551234567",
  industry: "Manufacturing",
  website: "https://testmfg.com",
  zipcode: "90210",
  revenue: "$2M - $5M",
  revenue_numeric: 3500000,
  employees: "11-25 employees", 
  employees_numeric: 18,
  score: 65,
  responses: [
    { category: 0, question: 0, answer: false },
    { category: 0, question: 1, answer: true },
    { category: 1, question: 0, answer: true },
    { category: 2, question: 0, answer: false }
  ],
  recaptcha_token: "test_token_bypass",
  time_spent: 420,
  user_agent: "Test Browser",
  referrer: "direct"
};

// Send test to your Netlify function
fetch('https://exit-score.netlify.app/.netlify/functions/process-assessment', {
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