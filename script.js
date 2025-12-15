const SUPABASE_URL = "https://zhjzbvghigeuarxvucob.supabase.co/rest/v1";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoanpidmdoaWdldWFyeHZ1Y29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NzAxOTUsImV4cCI6MjA4MDM0NjE5NX0.TF0dz6huz6tPAiXe3pz04Fuafh7dewIVNqWpOzJbm2w";

// Global variables
let allTankData = [];

async function fetchTankHistory(limit = 100) {
    try {
        const res = await fetch(`${SUPABASE_URL}/tank_readings?select=*&order=created_at.desc&limit=${limit}`, {
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json"
            }
        });
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        allTankData = data;
        return data;
    } catch (error) {
        console.error("Error fetching tank history:", error);
        // Return mock data for testing
        return generateMockData();
    }
}

async function fetchLatestTankValues() {
    const rows = await fetchTankHistory(500);
    const latest = {};
    rows.forEach(r => {
        if (!latest[r.tank_id]) latest[r.tank_id] = r.temperature;
    });
    return latest;
}

function generateMockData() {
    const mockData = [];
    const now = new Date();
    
    for (let i = 1; i <= 21; i++) {
        const temp = 20 + Math.random() * 15; // Random temp between 20-35
        mockData.push({
            tank_id: i,
            temperature: parseFloat(temp.toFixed(2)),
            created_at: new Date(now.getTime() - Math.random() * 10000000).toISOString()
        });
    }
    
    return mockData;
}

function getStatusClass(temperature) {
    if (temperature < 20 || temperature > 30) {
        return temperature < 15 || temperature > 35 ? 'critical' : 'warning';
    }
    return '';
}

function getStatusText(temperature) {
    if (temperature < 20) return 'Too Low';
    if (temperature > 30) return 'Too High';
    return 'Normal';
}

function getStatusIcon(temperature) {
    if (temperature < 20) return 'bx bx-down-arrow-alt';
    if (temperature > 30) return 'bx bx-up-arrow-alt';
    return 'bx bx-check-circle';
}

// Calculate statistics
function calculateStatistics(data) {
    const stats = {
        totalReadings: data.length,
        avgTemp: 0,
        maxTemp: -Infinity,
        minTemp: Infinity,
        maxTank: null,
        minTank: null,
        normalTanks: 0,
        warningTanks: 0,
        latestUpdate: null
    };
    
    const tankLatest = {};
    
    data.forEach(r => {
        // Get latest reading per tank
        if (!tankLatest[r.tank_id] || new Date(r.created_at) > new Date(tankLatest[r.tank_id].created_at)) {
            tankLatest[r.tank_id] = r;
        }
    });
    
    const latestTemps = Object.values(tankLatest);
    
    // Calculate stats
    if (latestTemps.length > 0) {
        let sum = 0;
        latestTemps.forEach(r => {
            sum += r.temperature;
            
            if (r.temperature > stats.maxTemp) {
                stats.maxTemp = r.temperature;
                stats.maxTank = r.tank_id;
            }
            
            if (r.temperature < stats.minTemp) {
                stats.minTemp = r.temperature;
                stats.minTank = r.tank_id;
            }
            
            if (r.temperature >= 20 && r.temperature <= 30) {
                stats.normalTanks++;
            } else {
                stats.warningTanks++;
            }
        });
        
        stats.avgTemp = sum / latestTemps.length;
        stats.latestUpdate = new Date(Math.max(...latestTemps.map(r => new Date(r.created_at))));
    }
    
    return stats;
}

// Populate dashboard
async