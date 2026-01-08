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
            RULES: 
            1. Plain text only (Strictly NO Markdown bolding like **). 
            2. Answer the user's specific question using the provided data. 
            3. If the user says "Hi", provide a brief 1-sentence greeting.
            4. Keep answers accurate and data-driven.`
          }]
        },
        contents: [{
          role: "user",
          parts: [{
            text: `[DASHBOARD DATA]: ${contextData}\n\n[USER QUESTION]: ${message}`
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500
        }
      })
    });

    const data = await response.json();

    // STABLE CHECK: Ensure the path exists before reading [0]
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const aiText = data.candidates[0].content.parts[0].text;
        return new Response(JSON.stringify({ reply: aiText }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } else {
        throw new Error(data.error ? data.error.message : "Malformed AI response");
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: "Service temporarily unavailable. Please try again." }), { 
        status: 200, // Return 200 so the frontend can display the error message nicely
        headers: { 'Content-Type': 'application/json' } 
    });
  }
}
