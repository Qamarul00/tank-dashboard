export async function onRequestPost(context) {
  const API_KEY = context.env.GEMINI_API_KEY;
  
  // Using your confirmed working model alias
  const MODEL = "gemini-flash-latest"; 
  const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  try {
    const { message, contextData } = await context.request.json();

    // Comprehensive instructions for professional, plain-text responses
    const systemPrompt = `
You are the FIMA Bulking Services AI Dashboard Assistant. 

TONE AND PERSONA:
- Maintain a highly professional, executive, and industrial tone. 
- You are a helpful thought partner for the operations team at FIMA.
- If a user asks a random or general question unrelated to the facility, answer politely and intelligently, but maintain your professional assistant character.

FORMATTING RULES (STRICT):
- STRICT RULE: Do not use Markdown formatting for emphasis. 
- NEVER use double asterisks (**) for bold or underscores (_) for italics.
- Write all temperatures clearly as [Value]°C (e.g., 25.0°C) without any special formatting.
- Provide all output as clean, professional plain text.

CONTEXT AND DATA:
Current Dashboard Data: ${contextData}

USER INQUIRY:
${message}
    `.trim();

    const response = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: systemPrompt
          }]
        }]
      })
    });

    const data = await response.json();

    // Check for errors from Google
    if (data.error) {
        return new Response(JSON.stringify({ error: "AI Error: " + data.error.message }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    // Safety check: ensure candidates exist
    if (!data.candidates || data.candidates.length === 0) {
        return new Response(JSON.stringify({ error: "AI returned no content. It might have been blocked for safety." }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    const aiText = data.candidates[0].content.parts[0].text;
    
    return new Response(JSON.stringify({ reply: aiText }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "System Error: " + error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
