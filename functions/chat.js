export async function onRequestPost(context) {
  // FIXED: Ensure we default to a safe model version
  const API_KEY = context.env.GEMINI_API_KEY;
  // "gemini-1.5-flash" is the stable, correct model ID. "flash-latest" often fails via REST API.
  const MODEL = "gemini-1.5-flash"; 
  const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  try {
    const { message, contextData } = await context.request.json();

    const response = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // SYSTEM INSTRUCTIONS: The AI's core rules
        system_instruction: {
          parts: [{
            text: `You are the FIMA Bulking Services AI Dashboard Assistant. 
            
            IDENTITY:
            - You are a highly professional, executive industrial assistant.
            - You provide data-driven insights for chemical terminal operations.

            FORMATTING RULES (STRICT):
            - Respond in PLAIN TEXT ONLY.
            - NEVER use Markdown formatting. Do NOT use asterisks (**), underscores (_), or hashtags (#).
            - Write temperatures as [Value]°C (e.g., 25.0°C).

            BEHAVIOR:
            - If the user says "Hi" or "Hello", respond with a professional 1-sentence greeting and ask how you can help.
            - Do not repeat the background context data back to the user unless they ask for a summary or report.
            - Answer random general questions intelligently while staying in your FIMA persona.`
          }]
        },
        contents: [{
          role: "user",
          parts: [{
            text: `[HIDDEN CONTEXT]: ${contextData}\n\n[USER INQUIRY]: ${message}`
          }]
        }],
        generationConfig: {
          temperature: 0.1, // Keeps it factual and professional
          maxOutputTokens: 500,
          topP: 0.8
        }
      })
    });

    const data = await response.json();

    // Fail-safe logic: Check if Google returned an error structure
    if (data.error) {
        console.error("Gemini API Error:", data.error);
        return new Response(JSON.stringify({ 
            reply: "I am currently unable to process data due to a service limit. Please try again in a moment." 
        }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        const aiText = data.candidates[0].content.parts[0].text;
        return new Response(JSON.stringify({ reply: aiText }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } else {
        return new Response(JSON.stringify({ 
            reply: "The operational assistant is currently unavailable. Please verify your query and try again." 
        }), { headers: { 'Content-Type': 'application/json' } });
    }

  } catch (error) {
    return new Response(JSON.stringify({ 
        error: "System Error: Connection to AI services interrupted." 
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
