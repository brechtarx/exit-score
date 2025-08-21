// Test script to check Claude API directly
const testData = {
  name: "John Smith",
  email: "john@example.com", 
  company: "Smith Manufacturing",
  phone: "555-1234",
  industry: "Manufacturing",
  website: "https://smithmfg.com",
  zipcode: "90210",
  score: 65,
  responses: [
    { question: "Does the business operate without requiring the owner's unique skills?", answer: "No", score: 0 },
    { question: "Are key customer relationships maintained by employees?", answer: "Yes", score: 5 },
    { question: "Did the company grow revenue in the last 12 months?", answer: "Yes", score: 5 },
    { question: "Is demand for your products generally increasing?", answer: "No", score: 0 }
  ],
  time_spent: 420,
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