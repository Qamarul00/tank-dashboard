const SUPABASE_URL = "https://zhjzbvghigeuarxvucob.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoanpidmdoaWdldWFyeHZ1Y29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NzAxOTUsImV4cCI6MjA4MDM0NjE5NX0.TF0dz6huz6tPAiXe3pz04Fuafh7dewIVNqWpOzJbm2w"; // guna full key sebenar

async function fetchTankReadings() {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/tank_readings?select=*`, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        console.error("Gagal tarik data:", response.statusText);
        return [];
    }

    const data = await response.json();
    return data;
}

function displayData(tankData) {
    const tbody = document.querySelector("#tankTable tbody");
    tbody.innerHTML = "";
    tankData.forEach(tank => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${tank.tank_id}</td><td>${tank.temperature}</td><td>${tank.created_at}</td>`;
        tbody.appendChild(tr);
    });
}

async function updateDashboard() {
    const data = await fetchTankReadings();
    displayData(data);
}

updateDashboard();
setInterval(updateDashboard, 5000);
