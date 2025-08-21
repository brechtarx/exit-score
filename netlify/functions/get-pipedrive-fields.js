// Diagnostic function to get Pipedrive field information
exports.handler = async (event, context) => {
  const baseUrl = 'https://arx.pipedrive.com/api/v1';
  const apiToken = process.env.PIPEDRIVE_KEY;
  
  try {
    console.log('Getting deal fields...');
    
    // Get all deal fields
    const fieldsResponse = await fetch(`${baseUrl}/dealFields?api_token=${apiToken}`);
    const fieldsData = await fieldsResponse.json();
    
    let exitScoreField = null;
    let sourceChannelField = null;
    let industryField = null;
    
    if (fieldsData.success && fieldsData.data) {
      // Look for Exit Score field
      exitScoreField = fieldsData.data.find(field => 
        field.name && field.name.toLowerCase().includes('exit') && field.name.toLowerCase().includes('score')
      );
      
      // Look for Source Channel field
      sourceChannelField = fieldsData.data.find(field => 
        field.name && field.name.toLowerCase().includes('source') && field.name.toLowerCase().includes('channel')
      );
      
      // Look for Industry field
      industryField = fieldsData.data.find(field => 
        field.name && field.name.toLowerCase().includes('industry')
      );
    }
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exitScoreField: exitScoreField ? {
          key: exitScoreField.key,
          name: exitScoreField.name,
          field_type: exitScoreField.field_type
        } : 'Not found',
        sourceChannelField: sourceChannelField ? {
          key: sourceChannelField.key,
          name: sourceChannelField.name,
          field_type: sourceChannelField.field_type,
          options: sourceChannelField.options || null
        } : 'Not found',
        industryField: industryField ? {
          key: industryField.key,
          name: industryField.name,
          field_type: industryField.field_type
        } : 'Not found',
        totalFields: fieldsData.data ? fieldsData.data.length : 0
      })
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error.message,
        stack: error.stack
      })
    };
  }
};