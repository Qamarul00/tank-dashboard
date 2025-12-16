const SUPABASE_URL = "https://zhjzbvghigeuarxvucob.supabase.co/rest/v1";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoanpidmdoaWdldWFyeHZ1Y29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NzAxOTUsImV4cCI6MjA4MDM0NjE5NX0.TF0dz6huz6tPAiXe3pz04Fuafh7dewIVNqWpOzJbm2w";

// Global variables
let allTankData = [];
let map = null;
let tankMarkers = [];

// OpenStreetMap tank locations (sample coordinates - replace with real ones)
const tankLocations = {
    1: { lat: 3.1390, lng: 101.6869, name: "Main Processing Tank" },
    2: { lat: 3.1400, lng: 101.6875, name: "Storage Tank A" },
    3: { lat: 3.1410, lng: 101.6860, name: "Storage Tank B" },
    4: { lat: 3.1395, lng: 101.6855, name: "Distribution Tank" },
    5: { lat: 3.1385, lng: 101.6880, name: "Reserve Tank 1" },
    6: { lat: 3.1392, lng: 101.6890, name: "Reserve Tank 2" },
    7: { lat: 3.1405, lng: 101.6850, name: "Backup Tank A" },
    8: { lat: 3.1415, lng: 101.6870, name: "Backup Tank B" },
    9: { lat: 3.1375, lng: 101.6860, name: "Auxiliary Tank 1" },
    10: { lat: 3.1380, lng: 101.6845, name: "Auxiliary Tank 2" },
    11: { lat: 3.1420, lng: 101.6855, name: "Secondary Storage A" },
    12: { lat: 3.1425, lng: 101.6865, name: "Secondary Storage B" },
    13: { lat: 3.1370, lng: 101.6875, name: "Emergency Tank 1" },
    14: { lat: 3.1365, lng: 101.6885, name: "Emergency Tank 2" },
    15: { lat: 3.1430, lng: 101.6875, name: "Overflow Tank A" },
    16: { lat: 3.1435, lng: 101.6885, name: "Overflow Tank B" },
    17: { lat: 3.1360, lng: 101.6855, name: "Testing Tank 1" },
    18: { lat: 3.1355, lng: 101.6845, name: "Testing Tank 2" },
    19: { lat: 3.1440, lng: 101.6860, name: "Experimental Tank" },
    20: { lat: 3.1445, lng: 101.6870, name: "Research Tank" },
    21: { lat: 3.1350, lng: 101.6865, name: "Quality Control Tank" }
};

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
        return generateMockData();
    }
}

async function fetchLatestTankValues() {
    const rows = await fetchTankHistory(500);
    const latest = {};
    rows.forEach(r => {
        if (!latest[r.tank_id] || new Date(r.created_at) > new Date(latest[r.tank_id].created_at)) {
            latest[r.tank_id] = {
                temperature: r.temperature,
                created_at: r.created_at
            };
        }
    });
    return latest;
}

function generateMockData() {
    const mockData = [];
    const now = new Date();
    
    for (let i = 1; i <= 50; i++) {
        const tankId = Math.floor(Math.random() * 21) + 1;
        const temp = 40 + Math.random() * 20;
        mockData.push({
            tank_id: tankId,
            temperature: parseFloat(temp.toFixed(2)),
            created_at: new Date(now.getTime() - Math.random() * 10000000).toISOString()
        });
    }
    
    return mockData;
}

function getStatusClass(temperature) {
    if (temperature >= 50) {
        return 'too-hot';
    }
    return '';
}

function getStatusText(temperature) {
    if (temperature >= 50) {
        return 'Too Hot';
    }
    return 'Normal';
}

function getStatusIcon(temperature) {
    if (temperature >= 50) {
        return 'bx bxs-fire';
    }
    return 'bx bx-check-circle';
}

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
        latestUpdate: null,
        activeTanks: 21
    };
    
    const tankLatest = {};
    
    data.forEach(r => {
        if (!tankLatest[r.tank_id] || new Date(r.created_at) > new Date(tankLatest[r.tank_id].created_at)) {
            tankLatest[r.tank_id] = r;
        }
    });
    
    const latestTemps = Object.values(tankLatest);
    
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
            
            if (r.temperature < 50) {
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

function updateMetrics(stats) {
    document.getElementById('avg-temp').textContent = stats.avgTemp ? stats.avgTemp.toFixed(1) + '°C' : '--';
    document.getElementById('max-temp').textContent = stats.maxTemp !== -Infinity ? stats.maxTemp.toFixed(1) : '--';
    document.getElementById('min-temp').textContent = stats.minTemp !== Infinity ? stats.minTemp.toFixed(1) : '--';
    document.getElementById('max-tank').textContent = stats.maxTank ? `Tank ${stats.maxTank}` : '--';
    document.getElementById('min-tank').textContent = stats.minTank ? `Tank ${stats.minTank}` : '--';
    document.getElementById('normal-tanks').textContent = stats.normalTanks;
    document.getElementById('warning-tanks').textContent = stats.warningTanks;
    document.getElementById('last-update').textContent = stats.latestUpdate ? 
        stats.latestUpdate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--';
    
    document.getElementById('total-readings').textContent = stats.totalReadings;
    document.getElementById('active-tanks').textContent = stats.activeTanks;
}

function populateTankStatusTable(latestData) {
    const tableBody = document.getElementById('tank-status-table');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    for (let tankId = 1; tankId <= 21; tankId++) {
        const tempData = latestData[tankId];
        const temp = tempData ? tempData.temperature : null;
        const statusClass = temp ? getStatusClass(temp) : '';
        const statusText = temp ? getStatusText(temp) : 'No Data';
        
        tableBody.innerHTML += `
        <tr>
            <td><strong>Tank ${tankId}</strong></td>
            <td><span class="${statusClass}">${temp ? temp.toFixed(1) + '°C' : '--'}</span></td>
            <td>
                <span class="status-badge ${statusClass}">
                    <i class="${temp ? getStatusIcon(temp) : 'bx bx-question-mark'}"></i>
                    ${statusText}
                </span>
            </td>
        </tr>`;
    }
}

function populateTempStatsTable(stats) {
    const tableBody = document.getElementById('temp-stats-table');
    if (!tableBody) return;
    
    tableBody.innerHTML = `
    <tr>
        <td>Average Temperature</td>
        <td><strong>${stats.avgTemp ? stats.avgTemp.toFixed(1) : '--'}</strong></td>
        <td>°C</td>
    </tr>
    <tr>
        <td>Temperature Range</td>
        <td><strong>${stats.minTemp !== Infinity ? stats.minTemp.toFixed(1) : '--'} - ${stats.maxTemp !== -Infinity ? stats.maxTemp.toFixed(1) : '--'}</strong></td>
        <td>°C</td>
    </tr>
    <tr>
        <td>Normal Range</td>
        <td><strong>Below 50.0°C</strong></td>
        <td>°C</td>
    </tr>
    <tr>
        <td>Data Points</td>
        <td><strong>${stats.totalReadings}</strong></td>
        <td>readings</td>
    </tr>
    <tr>
        <td>Monitoring Since</td>
        <td><strong>${stats.latestUpdate ? stats.latestUpdate.toLocaleDateString() : '--'}</strong></td>
        <td>date</td>
    </tr>`;
}

// OpenStreetMap Functions
function initMap() {
    if (!document.getElementById('map')) return;
    
    // Initialize map centered on average location
    const centerLat = Object.values(tankLocations).reduce((sum, loc) => sum + loc.lat, 0) / 21;
    const centerLng = Object.values(tankLocations).reduce((sum, loc) => sum + loc.lng, 0) / 21;
    
    map = L.map('map').setView([centerLat, centerLng], 17);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
    }).addTo(map);
    
    // Add tank markers
    updateMapMarkers();
}

function updateMapMarkers() {
    if (!map) return;
    
    // Clear existing markers
    tankMarkers.forEach(marker => map.removeLayer(marker));
    tankMarkers = [];
    
    // Get latest tank temperatures
    const latestData = window.latestTankData || {};
    
    // Create markers for each tank
    for (let tankId = 1; tankId <= 21; tankId++) {
        const location = tankLocations[tankId];
        if (!location) continue;
        
        const tempData = latestData[tankId];
        const temp = tempData ? tempData.temperature : null;
        const isHot = temp && temp >= 50;
        const markerColor = isHot ? '#e53e3e' : '#48bb78';
        
        // Create custom marker
        const markerIcon = L.divIcon({
            className: 'custom-marker',
            html: `
                <div style="
                    background-color: ${markerColor};
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 12px;
                    cursor: pointer;
                ">
                    ${tankId}
                </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });
        
        const marker = L.marker([location.lat, location.lng], {
            icon: markerIcon,
            title: `Tank ${tankId}: ${temp ? temp.toFixed(1) + '°C' : 'No data'}`
        }).addTo(map);
        
        // Create popup content
        const popupContent = `
            <div style="min-width: 200px; padding: 10px;">
                <h3 style="margin: 0 0 10px 0; color: #2d3748; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px;">
                    Tank ${tankId}
                </h3>
                <p style="margin: 8px 0; color: #4a5568;">
                    <strong>Location:</strong> ${location.name}
                </p>
                <p style="margin: 8px 0; color: #4a5568;">
                    <strong>Temperature:</strong> 
                    <span style="color: ${isHot ? '#e53e3e' : '#48bb78'}; font-weight: bold;">
                        ${temp ? temp.toFixed(1) + '°C' : 'No data'}
                    </span>
                </p>
                <p style="margin: 8px 0; color: #4a5568;">
                    <strong>Status:</strong> 
                    <span style="color: ${isHot ? '#e53e3e' : '#48bb78'}; font-weight: bold;">
                        ${temp ? getStatusText(temp) : 'Unknown'}
                    </span>
                </p>
                ${tempData ? `
                <p style="margin: 8px 0; color: #718096; font-size: 0.9rem;">
                    <i>Last updated: ${new Date(tempData.created_at).toLocaleString()}</i>
                </p>
                ` : ''}
            </div>
        `;
        
        marker.bindPopup(popupContent);
        tankMarkers.push(marker);
    }
}

function refreshMap() {
    const btn = document.querySelector('.map-toggle');
    if (btn) {
        btn.innerHTML = '<i class="bx bx-loader bx-spin"></i> Refreshing...';
        btn.disabled = true;
        
        if (map) {
            updateMapMarkers();
            map.setView(map.getCenter(), map.getZoom());
        }
        
        setTimeout(() => {
            btn.innerHTML = '<i class="bx bx-refresh"></i> Refresh Map';
            btn.disabled = false;
            showNotification('Map refreshed successfully!', 'success');
        }, 500);
    }
}

async function populateDashboard() {
    const data = await fetchTankHistory(200);
    
    const stats = calculateStatistics(data);
    updateMetrics(stats);
    
    const latestValues = await fetchLatestTankValues();
    window.latestTankData = latestValues;
    
    const tankOverview = document.getElementById("tank-overview");
    if (tankOverview) {
        tankOverview.innerHTML = "";
        for (let i = 1; i <= 21; i++) {
            const tempData = latestValues[i];
            const temp = tempData ? tempData.temperature : null;
            const statusClass = temp ? getStatusClass(temp) : '';
            const iconClass = temp ? getStatusIcon(temp) : 'bx bx-thermometer';
            
            tankOverview.innerHTML += `
            <li class="${statusClass}">
                <i class='${iconClass}'></i>
                <span class="text">
                    <h3>${temp !== null ? temp.toFixed(1) + '°C' : '--'}</h3>
                    <p>Tank ${i}</p>
                </span>
            </li>`;
        }
    }
    
    const tankTable = document.getElementById("tank-table");
    if (tankTable) {
        tankTable.innerHTML = "";
        const latestRecords = data.slice(0, 10);
        latestRecords.forEach(r => {
            const statusClass = getStatusClass(r.temperature);
            const statusText = getStatusText(r.temperature);
            
            tankTable.innerHTML += `
            <tr>
                <td><strong>Tank ${r.tank_id}</strong></td>
                <td class="${statusClass}"><strong>${r.temperature.toFixed(1)}°C</strong></td>
                <td>${new Date(r.created_at).toLocaleString()}</td>
                <td>
                    <span class="status-badge ${statusClass}">
                        <i class="${getStatusIcon(r.temperature)}"></i>
                        ${statusText}
                    </span>
                </td>
            </tr>`;
        });
    }
    
    populateTankStatusTable(latestValues);
    populateTempStatsTable(stats);
    
    if (map) {
        updateMapMarkers();
    }
}

async function refreshData() {
    const refreshBtn = document.querySelector('.master-btn');
    if (refreshBtn) {
        const originalText = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '<i class="bx bx-loader bx-spin"></i> Refreshing...';
        refreshBtn.disabled = true;
        
        await populateDashboard();
        
        setTimeout(() => {
            refreshBtn.innerHTML = originalText;
            refreshBtn.disabled = false;
            showNotification('Data refreshed successfully!', 'success');
        }, 1000);
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="bx ${type === 'success' ? 'bx-check-circle' : 'bx-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function addCustomStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: 600;
        }
        
        .status-badge i {
            font-size: 16px;
        }
        
        .status-badge:not(.too-hot) {
            background: #c6f6d5;
            color: #22543d;
        }
        
        .status-badge.too-hot {
            background: #feb2b2;
            color: #9b2c2c;
            font-weight: 700;
        }
        
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 15px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            border-left: 4px solid #4299e1;
        }
        
        .notification.success {
            border-left-color: #48bb78;
        }
        
        .notification i {
            font-size: 24px;
        }
        
        .notification.success i {
            color: #48bb78;
        }
        
        .notification.fade-out {
            animation: slideOut 0.3s ease forwards;
        }
        
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        .bx-loader.bx-spin {
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        td.too-hot, li.too-hot h3, span.too-hot {
            color: #e53e3e !important;
            font-weight: 700 !important;
        }
        
        td.too-hot strong, li.too-hot h3 {
            color: #e53e3e !important;
        }
        
        /* Mobile sidebar */
        #sidebar.active {
            transform: translateX(0) !important;
            width: 250px !important;
            box-shadow: 10px 0 30px rgba(0, 0, 0, 0.3) !important;
        }
        
        #sidebar.active .brand .text,
        #sidebar.active .side-menu li a .text {
            display: flex !important;
        }
        
        .overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
            display: none;
        }
        
        .overlay.active {
            display: block;
        }
        
        @media (max-width: 768px) {
            #content {
                margin-left: 0;
                width: 100%;
            }
            
            #sidebar {
                transform: translateX(-100%);
                transition: transform 0.3s ease;
            }
            
            #content nav i {
                display: block !important;
            }
        }
    `;
    document.head.appendChild(style);
}

async function populateChart() {
    const data = await fetchTankHistory(200);
    const selectTank = document.getElementById("tank");
    const timeRange = document.getElementById("time-range");
    const ctx = document.getElementById("chart");
    
    if (!selectTank || !ctx) return;

    let chart = null;

    for (let i = 1; i <= 21; i++) {
        selectTank.innerHTML += `<option value="${i}">Tank ${i}</option>`;
    }

    function draw(tankId, limit = 50) {
        const filtered = data
            .filter(r => r.tank_id == tankId)
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
            .slice(-limit);
        
        if (chart) chart.destroy();
        
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: filtered.map(r => new Date(r.created_at).toLocaleTimeString()),
                datasets: [{
                    label: `Tank ${tankId} Temperature`,
                    data: filtered.map(r => r.temperature),
                    borderColor: '#4299e1',
                    backgroundColor: 'rgba(66, 153, 225, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: filtered.map(r => {
                        if (r.temperature >= 50) {
                            return '#e53e3e';
                        }
                        return '#48bb78';
                    }),
                    pointBorderColor: '#fff',
                    pointRadius: 5,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let status = 'Normal';
                                if (context.parsed.y >= 50) {
                                    status = 'Too Hot';
                                }
                                return `Temperature: ${context.parsed.y}°C (${status})`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Temperature (°C)',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value + '°C';
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    draw(1, parseInt(timeRange.value));

    selectTank.onchange = function(e) {
        draw(parseInt(e.target.value), parseInt(timeRange.value));
    };

    timeRange.onchange = function(e) {
        draw(parseInt(selectTank.value), parseInt(e.target.value));
    };
}

document.addEventListener('DOMContentLoaded', function() {
    addCustomStyles();
    
    if (document.getElementById("tank-overview")) {
        populateDashboard();
        // Initialize map after a short delay
        setTimeout(initMap, 500);
    }
    
    if (document.getElementById("chart")) {
        populateChart();
    }
    
    const menuToggle = document.querySelector('#content nav .bx-menu');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggle && sidebar) {
        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        document.body.appendChild(overlay);
        
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
            document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
        });
        
        overlay.addEventListener('click', function() {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
        
        const sidebarLinks = document.querySelectorAll('#sidebar a');
        sidebarLinks.forEach(link => {
            link.addEventListener('click', function() {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('active');
                    overlay.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        });
    }
    
    window.addEventListener('resize', function() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.querySelector('.overlay');
        
        if (window.innerWidth > 768 && sidebar && overlay) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
});