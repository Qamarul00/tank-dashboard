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
            text: `You are the FIMA Bulking Services AI. 
            TONE: Professional and executive. 
            RULES: 1. Plain text only (No ** or _). 2. Answer the user's specific question. 
            3. If the user says "Hi", provide a brief 1-sentence greeting and ask how you can help. 
            4. Use the provided context data only if relevant.`
          }]
        },
        contents: [{
          role: "user",
          parts: [{
            text: `CONTEXT DATA (HIDDEN FROM USER): ${contextData}\n\nHUMAN QUESTION: ${message}`
          }]
        }],
        generationConfig: {
          temperature: 0.1, // Keeps it very focused and professional
          maxOutputTokens: 400
        }
      })
    });

    const data = await response.json();
    const aiText = data.candidates[0].content.parts[0].text;
    
    return new Response(JSON.stringify({ reply: aiText }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Error: " + error.message }), { status: 500 });
  }
}
