export async function onRequestPost(context) {
  const API_KEY = context.env.GEMINI_API_KEY;
  
  // Confirmed working model identifier
  const MODEL = "gemini-flash-latest"; 
  const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  try {
    const { message, contextData } = await context.request.json();

    const response = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // SYSTEM INSTRUCTIONS: Defines personality and rules permanently
        system_instruction: {
          role: "system",
          parts: [{
            text: `You are the FIMA Bulking Services AI Dashboard Assistant. 

            TONE AND PERSONA:
            - You are a highly professional, executive-level industrial assistant.
            - Provide expert-level responses suitable for chemical terminal operations.
            - You are a helpful thought partner. If asked general or random questions, answer them intelligently while remaining in your professional character.

            FORMATTING RULES (STRICT):
            - NEVER use Markdown for emphasis. Do not use double asterisks (**) or underscores (_).
            - All output must be clean, professional PLAIN TEXT.
            - Standardize all temperatures as [Value]°C without any extra formatting.

            GOAL:
            - Help the user interpret the Current Dashboard Data.
            - Answer any other questions the user has accurately and politely.`
          }]
        },
        // CONVERSATION: The actual data exchange
        contents: [{
          role: "user",
          parts: [{
            text: `Current Facility Data: ${contextData}\n\nUser Message: ${message}`
          }]
        }],
        // GENERATION CONFIG: Optimization for professional output
        generationConfig: {
          temperature: 0.2, // Low for consistency and accuracy
          maxOutputTokens: 800, // Sufficient for detailed but concise reports
          topP: 0.95,
          topK: 40
        }
      })
    });

    const data = await response.json();

    // Error handling for API issues
    if (data.error) {
        return new Response(JSON.stringify({ 
          error: "AI Operational Error: " + data.error.message 
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    // Safety check for empty content
    if (!data.candidates || data.candidates.length === 0) {
        return new Response(JSON.stringify({ 
          error: "The AI was unable to generate a response. Please verify the input." 
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    const aiText = data.candidates[0].content.parts[0].text;
    
    // Return final plain-text response
    return new Response(JSON.stringify({ reply: aiText }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    // Catch-all for network or system errors
    return new Response(JSON.stringify({ 
      error: "System Diagnostic Error: " + error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
