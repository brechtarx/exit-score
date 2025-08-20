exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Function is working!',
      method: event.httpMethod,
      headers: event.headers,
      environment: {
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
        hasClaudeKey: !!process.env.CLAUDE_API_KEY
      }
    })
  };
};