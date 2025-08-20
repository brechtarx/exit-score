exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('Assessment submission received');
    
    // Parse the form submission from frontend
    const assessment = JSON.parse(event.body);
    
    console.log('Assessment data:', assessment);
    
    // For now, just return success without database operations
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Assessment received successfully',
        data: assessment
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