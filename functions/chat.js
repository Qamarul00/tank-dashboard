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
            STRICT RULES: 
            1. Response in PLAIN TEXT only. 
            2. Do NOT repeat the background context data back to the user unless they ask for a report. 
            3. If the user says "hi", just reply with a professional greeting. 
            4. Keep answers concise.`
          }]
        },
        contents: [{
          role: "user",
          parts: [{
            text: `[BACKGROUND DATA: ${contextData}]\n\nUSER QUESTION: ${message}`
          }]
        }],
        generationConfig: {
          temperature: 0.1,
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
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
