export async function onRequestPost(context) {
  const API_KEY = context.env.GEMINI_API_KEY;
  const MODEL = "gemini-flash-latest"; 
  const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  try {
    const { message, contextData } = await context.request.json();

    const response = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'functions/chat.js' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{
            text: `You are the FIMA Bulking Services AI Dashboard Expert.
            
            CORE RULES:
            1. Response TONE: Professional, executive, and concise.
            2. FORMATTING: Use PLAIN TEXT ONLY. Never use asterisks (**), hashtags (#), or underscores (_).
            3. UNITS: Always write temperatures as [Value]°C (e.g. 25.4°C).
            4. BEHAVIOR: Address the User Question directly using the provided Context Data. If the user says "Hi", provide a brief 1-sentence greeting and ask how you can help with their operations.`
          }]
        },
        contents: [{
          role: "user",
          parts: [{
            text: `[CONTEXT DATA]: ${contextData}\n\n[USER QUESTION]: ${message}`
          }]
        }],
        generationConfig: {
          temperature: 0.1, // Makes the AI factual and less prone to rambling
          maxOutputTokens: 500,
          topP: 0.8
        }
      })
    });

    const data = await response.json();

    // FAIL-SAFE: Check if the AI actually returned a response
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        const aiText = data.candidates[0].content.parts[0].text;
        return new Response(JSON.stringify({ reply: aiText }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } else {
        // Fallback if AI safety filters block the response or API fails
        return new Response(JSON.stringify({ reply: "I'm sorry, I couldn't process that query. Please try again or rephrase your question." }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: "Service connection error. Please verify terminal connectivity." }), { status: 500 });
  }
}
