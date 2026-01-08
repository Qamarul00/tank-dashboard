export async function onRequestPost(context) {
  // 1. GET API KEY
  // Ensure this matches the variable name in Cloudflare Settings
  const API_KEY = context.env.OPENAI_API_KEY; 
  
  const ENDPOINT = "https://api.openai.com/v1/chat/completions";
  const MODEL = "gpt-4o-mini"; 

  try {
    const { message, contextData } = await context.request.json();

    const systemPrompt = `You are the FIMA Bulking Services AI Dashboard Assistant. 
    IDENTITY: Professional industrial assistant.
    FORMATTING: Plain text only. No Markdown.
    CONTEXT: ${contextData}`;

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
          { role: "user", content: message }
        ],
        temperature: 0.1,
        max_tokens: 500
      })
    });

    const data = await response.json();

    // --- DEBUGGING LOGIC START ---
    
    // Check for explicit API errors
    if (data.error) {
        return new Response(JSON.stringify({ 
            reply: `⚠️ OpenAI Error: ${data.error.message} (Type: ${data.error.type})` 
        }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Check for successful response
    if (data.choices && data.choices[0] && data.choices[0].message) {
        return new Response(JSON.stringify({ 
            reply: data.choices[0].message.content 
        }), { headers: { 'Content-Type': 'application/json' } });
    } else {
        // IF WE GET HERE, OPENAI SENT SOMETHING WEIRD. PRINT IT.
        return new Response(JSON.stringify({ 
            reply: `⚠️ Unexpected Response Structure: ${JSON.stringify(data)}` 
        }), { headers: { 'Content-Type': 'application/json' } });
    }
    // --- DEBUGGING LOGIC END ---

  } catch (error) {
    return new Response(JSON.stringify({ 
        reply: `⚠️ System Error: ${error.message}` 
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
