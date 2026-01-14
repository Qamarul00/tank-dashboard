export async function onRequestPost(context) {
  const API_KEY = context.env.GEMINI_API_KEY;
  const MODEL = "gemini-flash-latest"; 
  const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  try {
    const { message, contextData } = await context.request.json();

    // Get real-time data from the Supabase or other API
    const realTimeData = await getRealTimeData();  // Function to get latest data from Supabase or other source

    // Prepare the context for the AI model
    const updatedContextData = {
      ...contextData,
      ...realTimeData // Merge real-time data into the contextData for more relevant responses
    };

    const response = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          role: "system",
          parts: [{
            text: `You are the FIMA Bulking Services AI Dashboard Assistant.
            
            IDENTITY:
            - You are a highly professional, executive industrial assistant.
            - You provide real-time, data-driven insights for chemical terminal operations.

            FORMATTING RULES (STRICT):
            - Respond in PLAIN TEXT ONLY.
            - Write temperatures as [Value]°C (e.g., 25.0°C).

            BEHAVIOR:
            - Answer questions related to the live data of chemical storage tanks, their temperature trends, alarm statuses, and comparisons between tanks.
            - If users ask for historical data or trend analysis, you should query the provided context for relevant data and provide accurate comparisons.
            - Answer general operational questions based on real-time and historical data stored in the system.
            - Respond with a clear message if unable to provide an answer (e.g., 'I cannot retrieve the data at this time.' or 'Could you please clarify your request?')`
          }]
        },
        contents: [{
          role: "user",
          parts: [{
            text: `[HIDDEN CONTEXT]: ${updatedContextData}\n\n[USER INQUIRY]: ${message}`
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

    // Fail-safe logic for the backend
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

// Function to fetch real-time data from Supabase (or any other API)
async function getRealTimeData() {
  try {
    // Query to fetch the latest tank data from Supabase (or any other relevant API)
    const response = await fetch("https://supabase.io/your-endpoint-to-get-tank-data"); // Replace with your Supabase API endpoint
    const data = await response.json();

    // Assume data contains necessary tank temperature and alarm data
    const tankData = data.map(tank => ({
      tank_id: tank.id,
      temperature: tank.temperature, 
      status: tank.status,
      alarm: tank.alarm, // Example field for alarms
      last_updated: tank.last_updated // Example field for last update time
    }));

    // Additional data for analytics or trends can be added here if needed
    const averageTemperature = tankData.reduce((acc, tank) => acc + tank.temperature, 0) / tankData.length;
    
    return { 
      tankData,
      averageTemperature,
      liveData: true // Example flag for live data
    };

  } catch (error) {
    console.error('Error fetching real-time data:', error);
    return { 
      error: "Unable to fetch real-time data at this moment."
    };
  }
}
