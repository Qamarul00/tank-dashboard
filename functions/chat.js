export async function onRequestPost(context) {
  const API_KEY = context.env.GEMINI_API_KEY;
  const MODEL = "gemini-2.5-flash"; 
  const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  try {
    const { message, contextData } = await context.request.json();

    const response = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are an AI assistant for FIMA Bulking Services.
                    Current Dashboard Data: ${contextData}
                    User asks: ${message}
                    Your response should be concise and professional. Avoid unnecessary details.
                    When asked for a summary, provide a clear and concise summary in one paragraph, avoiding bullet points or markdown.
                    You must respond with plain text. Do not use any markdown formatting like asterisks (*), underscores (_), or hashtags (#).
                    Provide answers clearly and professionally, keeping it factual and to the point.`
          }]
        }]
      })
    });

    const data = await response.json();

    // Check for errors from Google
    if (data.error) {
      return new Response(JSON.stringify({ error: "AI Error: " + data.error.message }), { status: 200 });
    }

    // Safety check: ensure candidates exist
    if (!data.candidates || data.candidates.length === 0) {
      return new Response(JSON.stringify({ error: "AI returned no content. It might have been blocked for safety." }), { status: 200 });
    }

    const aiText = data.candidates[0].content.parts[0].text;
    return new Response(JSON.stringify({ reply: aiText }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "System Error: " + error.message }), { status: 500 });
  }
}
