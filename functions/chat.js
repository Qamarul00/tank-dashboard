export async function onRequestPost(context) {
  const API_KEY = context.env.GEMINI_API_KEY;
  const MODEL = "gemini-flash-latest"; 
  const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  try {
    const { message, contextData } = await context.request.json();

    const response = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{
            text: `You are the FIMA Bulking Services AI Dashboard Assistant. 
            TONE: Highly professional, executive, and helpful. 
            STRICT RULE: PLAIN TEXT ONLY. Never use asterisks (**) or underscores (_). 
            BEHAVIOR: Your priority is to answer the User Question directly. Use the provided context data only if needed to answer the question. If the user just says "Hi", respond with a professional greeting and a very brief facility summary.`
          }]
        },
        contents: [{
          role: "user",
          parts: [{
            text: `[FACILITY DATA START]\n${contextData}\n[FACILITY DATA END]\n\nUser Question: ${message}`
          }]
        }],
        generationConfig: {
          temperature: 0.2, // Lower temperature makes it less likely to "ramble"
          maxOutputTokens: 500
        }
      })
    });

    const data = await response.json();

    if (data.error) {
        return new Response(JSON.stringify({ error: "AI Error: " + data.error.message }), { status: 200 });
    }

    const aiText = data.candidates[0].content.parts[0].text;
    
    return new Response(JSON.stringify({ reply: aiText }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "System Error: " + error.message }), { status: 500 });
  }
}
