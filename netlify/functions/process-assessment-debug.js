// Debug version to isolate the issue
exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('STEP 1: Function started');
    
    // Parse the form submission from frontend
    let assessment;
    try {
      assessment = JSON.parse(event.body);
      console.log('STEP 2: Parsed request body successfully');
    } catch (parseError) {
      console.error('STEP 2 FAILED: Parse error:', parseError);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }
    
    // Validate required fields
    if (!assessment.email || !assessment.name || !assessment.company) {
      console.error('STEP 3 FAILED: Missing required fields:', assessment);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }
    console.log('STEP 3: Validation passed');

    console.log(`STEP 4: Processing assessment for ${assessment.email}`);

    // Test Supabase connection first
    try {
      console.log('STEP 5: Testing Supabase connection...');
      const testResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
        }
      });
      console.log(`STEP 5: Supabase test response status: ${testResponse.status}`);
    } catch (testError) {
      console.error('STEP 5 FAILED: Supabase connection test failed:', testError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Database connection test failed' })
      };
    }

    // Try to save to Supabase
    try {
      console.log('STEP 6: Attempting to save to Supabase...');
      const supabaseResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/assessments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(assessment)
      });

      console.log(`STEP 6: Supabase response status: ${supabaseResponse.status}`);
      
      if (!supabaseResponse.ok) {
        const errorText = await supabaseResponse.text();
        console.error('STEP 6 FAILED: Supabase error:', errorText);
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: 'Failed to save assessment',
            details: errorText,
            status: supabaseResponse.status
          })
        };
      }

      const savedAssessment = await supabaseResponse.json();
      console.log('STEP 6: Assessment saved successfully');

      // For now, just return success without AI generation
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: 'Assessment saved successfully - debug version',
          id: savedAssessment[0]?.id,
          steps_completed: 6
        })
      };

    } catch (saveError) {
      console.error('STEP 6 FAILED: Save error:', saveError);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Error during save operation',
          details: saveError.message
        })
      };
    }

  } catch (error) {
    console.error('GLOBAL ERROR:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        stack: error.stack
      })
    };
  }
};