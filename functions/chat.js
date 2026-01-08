export async function onRequestPost(context) {
  const API_KEY = context.env.GEMINI_API_KEY;
  
  // Using the latest flash model for speed and cost-efficiency
  const MODEL = "gemini-1.5-flash-latest"; 
  const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  try {
    const { message, contextData } = await context.request.json();

    // The system prompt defines the AI's personality, rules, and restrictions
    const systemPrompt = `
You are the FIMA Bulking Services AI Dashboard Assistant. 

IDENTITY & TONE:
- Maintain a highly professional, executive, and helpful tone. 
- Use clear and formal language suitable for a chemical storage facility operations team.
- STRICT RULE: Do not use Markdown formatting for emphasis. Specifically, do not use double asterisks (**) or underscores (_) for bold or italic text. Use plain text only.
- Ensure all temperature units are written as °C without bolding.

CAPABILITIES & SCOPE:
- Primary Goal: Analyze and answer questions about the Current Dashboard Data provided.
- General Knowledge: You are authorized to answer random or general questions to be a helpful thought partner. 
- Professional Versatility: If the user asks a "random" question, answer it politely and intelligently, but always maintain your persona as an industrial assistant.
- Safety: If you notice tanks exceeding 60°C in the context data, prioritize mentioning them as critical if the user asks for a status update.

CURRENT CONTEXT:
- Current Dashboard Data: ${contextData}
- User message: ${message}

Please provide your professional response below in plain text:
    `.trim();

    const response = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: systemPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    });

    const data = await response.json();

    // Check for errors from Google API
    if (data.error) {
        return new Response(JSON.stringify({ error: "AI Error: " + data.error.message }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    // Safety check: ensure candidates exist
    if (!data.candidates || data.candidates.length === 0) {
        return new Response(JSON.stringify({ error: "The AI was unable to generate a response. Please try again." }), { 
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
