export async function onRequestPost(context) {
  // 1. GET API KEY
  // Make sure you add OPENAI_API_KEY to your Cloudflare Dashboard -> Settings -> Variables
  const API_KEY = context.env.OPENAI_API_KEY; 
  
  // 2. CONFIGURATION
  const ENDPOINT = "https://api.openai.com/v1/chat/completions";
  const MODEL = "gpt-4o-mini"; // "gpt-4o" is smarter but more expensive. "gpt-4o-mini" is fast & cheap.

  try {
    const { message, contextData } = await context.request.json();

    // 3. SYSTEM PROMPT (The "Persona")
    const systemPrompt = `You are the FIMA Bulking Services AI Dashboard Assistant. 
            
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
    - Answer random general questions intelligently while staying in your FIMA persona.`;

    // 4. CALL OPENAI API
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `[HIDDEN CONTEXT]: ${contextData}\n\n[USER INQUIRY]: ${message}` }
        ],
        temperature: 0.1, // Low temperature = more factual/professional
        max_tokens: 500,
        top_p: 0.8
      })
    });

    const data = await response.json();

    // 5. ERROR HANDLING
    if (data.error) {
        console.error("OpenAI API Error:", data.error);
        return new Response(JSON.stringify({ 
            reply: `System Notification: Unable to process request. (${data.error.message})` 
        }), { headers: { 'Content-Type': 'application/json' } });
    }

    // 6. SUCCESS RESPONSE
    if (data.choices && data.choices[0] && data.choices[0].message) {
        const aiText = data.choices[0].message.content;
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
