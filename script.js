const SUPABASE_URL = "https://zhjzbvghigeuarxvucob.supabase.co/rest/v1";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // ANON key sahaja

async function fetchTankHistory(limit=50) {
    const res = await fetch(`${SUPABASE_URL}/tank_readings?select=*&order=created_at.desc&limit=${limit}`, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json"
        }
    });
    return await res.json();
}

async function fetchLatestTankValues() {
    const rows = await fetchTankHistory(500);
    const latest = {};
    rows.forEach(r => {
        if (!latest[r.tank_id]) latest[r.tank_id] = r.temperature;
    });
    return latest;
}

// Populate dashboard
async function populateDashboard() {
    const latest = await fetchLatestTankValues();
    const tankOverview = document.getElementById("tank-overview");
    const tankTable = document.getElementById("tank-table");
    if (!tankOverview || !tankTable) return;

    tankOverview.innerHTML = "";
    for (let i = 1; i <= 21; i++) {
        tankOverview.innerHTML += `
        <li>
            <i class='bx bx-thermometer'></i>
            <span class="text">
                <h3>${latest[i] !== undefined ? latest[i].toFixed(2) + ' °C' : '--'}</h3>
                <p>Tank ${i}</p>
            </span>
        </li>`;
    }

    const records = await fetchTankHistory();
    tankTable.innerHTML = "";
    records.forEach(r => {
        tankTable.innerHTML += `
        <tr>
            <td>Tank ${r.tank_id}</td>
            <td>${r.temperature.toFixed(2)} °C</td>
            <td>${new Date(r.created_at).toLocaleString()}</td>
        </tr>`;
    });
}

// Populate chart
async function populateChart() {
    const raw = await fetchTankHistory(200);
    const selectTank = document.getElementById("tank");
    const ctx = document.getElementById("chart");
    if (!selectTank || !ctx) return;

    let chart = null;

    for (let i = 1; i <= 21; i++) {
        selectTank.innerHTML += `<option value="${i}">Tank ${i}</option>`;
    }

    function draw(tank) {
        const filtered = raw.filter(r => r.tank_id == tank);
        if (chart) chart.destroy();
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: filtered.map(r => r.created_at),
                datasets: [{
                    label: 'Temperature °C',
                    data: filtered.map(r => r.temperature),
                    borderColor: '#3C91E6',
                    tension: 0.3
                }]
            }
        });
    }

    draw(1);

    selectTank.onchange = function(e) {
        const target = e.target;
        if (target) draw(parseInt(target.value));
    };
}

// Auto populate depending on page
if (document.getElementById("tank-overview")) populateDashboard();
if (document.getElementById("chart")) populateChart();
