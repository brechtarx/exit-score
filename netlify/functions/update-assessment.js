// Update Assessment Function - Updates existing assessment with additional details
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
    console.log('Assessment update request received');
    
    // Parse the update request
    const updateData = JSON.parse(event.body);
    
    // Validation
    if (!updateData.id) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Assessment ID is required' })
      };
    }

    if (!updateData.company) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Company name is required' })
      };
    }
    
    console.log(`Updating assessment ${updateData.id} with company: ${updateData.company}`);

    // Update Supabase record
    const supabaseResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/assessments?id=eq.${updateData.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        company: updateData.company,
        phone: updateData.phone || null,
        website: updateData.website || null,
        form_step_completed: updateData.form_step_completed || 2
      })
    });

    if (!supabaseResponse.ok) {
      const errorText = await supabaseResponse.text();
      console.error('Supabase update failed:', errorText);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Failed to update database',
          details: errorText
        })
      };
    }

    const updatedData = await supabaseResponse.json();
    console.log('Assessment updated successfully');

    // Get the stored Pipedrive IDs for updating
    const record = updatedData[0];
    
    if (record.pipedrive_person_id && record.pipedrive_org_id && record.pipedrive_deal_id) {
      try {
        await updatePipedrive(record);
        console.log('Pipedrive records updated successfully');
      } catch (error) {
        console.error('Pipedrive update failed:', error.message);
        // Don't fail the whole operation if Pipedrive update fails
      }
    } else {
      console.log('No Pipedrive IDs found, skipping Pipedrive update');
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Assessment updated successfully',
        id: record.id
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

// Update Pipedrive records with new company information
async function updatePipedrive(assessment) {
  const PIPEDRIVE_API_TOKEN = process.env.PIPEDRIVE_KEY;
  const BASE_URL = `https://api.pipedrive.com/v1`;
  
  if (!PIPEDRIVE_API_TOKEN) {
    throw new Error('PIPEDRIVE_KEY environment variable not configured');
  }

  // Update organization name
  if (assessment.pipedrive_org_id) {
    const orgUpdateResponse = await fetch(`${BASE_URL}/organizations/${assessment.pipedrive_org_id}?api_token=${PIPEDRIVE_API_TOKEN}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: assessment.company,
        website: assessment.website,
        address: assessment.zipcode
      })
    });
    
    if (!orgUpdateResponse.ok) {
      console.error('Failed to update Pipedrive organization');
    }
  }

  // Update person with phone if provided
  if (assessment.pipedrive_person_id && assessment.phone) {
    const personUpdateResponse = await fetch(`${BASE_URL}/persons/${assessment.pipedrive_person_id}?api_token=${PIPEDRIVE_API_TOKEN}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: [{ value: assessment.phone, primary: true }]
      })
    });
    
    if (!personUpdateResponse.ok) {
      console.error('Failed to update Pipedrive person');
    }
  }

  // Update deal title
  if (assessment.pipedrive_deal_id) {
    const dealUpdateResponse = await fetch(`${BASE_URL}/deals/${assessment.pipedrive_deal_id}?api_token=${PIPEDRIVE_API_TOKEN}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Exit Score Assessment - ${assessment.company}`
      })
    });
    
    if (!dealUpdateResponse.ok) {
      console.error('Failed to update Pipedrive deal');
    }
  }
}