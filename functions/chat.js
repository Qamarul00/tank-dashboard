export async function onRequestPost(context) {
  // Access the secret key you will set in the Cloudflare Dashboard
  const API_KEY = context.env.GEMINI_API_KEY;
  
  // Use the model name that worked in your successful test
  const MODEL = "gemini-2.0-flash"; 
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  try {
    // Get the user's message and dashboard data from the frontend request
    const { message, contextData } = await context.request.json();

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are an AI assistant for FIMA Bulking Services. 
                  Current Dashboard Data: ${contextData}
                  User asks: ${message}`
          }]
        }]
      })
    });

    const data = await response.json();
    
    // Error handling if Gemini returns an error
    if (data.error) {
        return new Response(JSON.stringify({ reply: "AI Error: " + data.error.message }), { status: 200 });
    }

    const aiText = data.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ reply: aiText }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ reply: "System Error: Could not reach the AI." }), { status: 500 });
  }
}