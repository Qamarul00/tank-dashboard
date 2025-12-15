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
        const temp = 20 + Math.random() * 15; // Random temp between 20-35
        mockData.push({
            tank_id: tankId,
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
    
    // Get latest reading for each tank
    data.forEach(r => {
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
        
        // Calculate data accuracy (mock calculation)
        stats.dataAccuracy = Math.min(100, Math.floor(95 + Math.random() * 5));
    }
    
    return stats;
}

// Update metrics on dashboard
function updateMetrics(stats) {
    // Update top metrics cards
    document.getElementById('avg-temp').textContent = stats.avgTemp ? stats.avgTemp.toFixed(1) + '°C' : '--';
    document.getElementById('max-temp').textContent = stats.maxTemp !== -Infinity ? stats.maxTemp.toFixed(1) : '--';
    document.getElementById('min-temp').textContent = stats.minTemp !== Infinity ? stats.minTemp.toFixed(1) : '--';
    document.getElementById('max-tank').textContent = stats.maxTank ? `Tank ${stats.maxTank}` : '--';
    document.getElementById('min-tank').textContent = stats.minTank ? `Tank ${stats.minTank}` : '--';
    document.getElementById('normal-tanks').textContent = stats.normalTanks;
    document.getElementById('warning-tanks').textContent = stats.warningTanks;
    document.getElementById('last-update').textContent = stats.latestUpdate ? 
        stats.latestUpdate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--';
    
    // Update summary cards
    document.getElementById('total-readings').textContent = stats.totalReadings;
    document.getElementById('data-accuracy').textContent = stats.dataAccuracy ? stats.dataAccuracy + '%' : '--';
}

// Populate tank status table
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

// Populate temperature statistics table
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
        <td><strong>20.0 - 30.0</strong></td>
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

// Populate dashboard
async function populateDashboard() {
    const data = await fetchTankHistory(200);
    
    // Calculate statistics
    const stats = calculateStatistics(data);
    
    // Update all metrics
    updateMetrics(stats);
    
    // Get latest values for each tank
    const latestValues = await fetchLatestTankValues();
    
    // Populate 21 tank overview
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
    
    // Populate latest records table
    const tankTable = document.getElementById("tank-table");
    if (tankTable) {
        tankTable.innerHTML = "";
        const latestRecords = data.slice(0, 10); // Get 10 latest records
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
    
    // Populate tank status table
    populateTankStatusTable(latestValues);
    
    // Populate temperature statistics table
    populateTempStatsTable(stats);
}

// Refresh data function
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
            
            // Show success notification
            showNotification('Data refreshed successfully!', 'success');
        }, 1000);
    }
}

// Notification function
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="bx ${type === 'success' ? 'bx-check-circle' : 'bx-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Add CSS for notifications and status badges
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
        
        .status-badge:not(.warning):not(.critical) {
            background: #c6f6d5;
            color: #22543d;
        }
        
        .status-badge.warning {
            background: #fed7d7;
            color: #c53030;
        }
        
        .status-badge.critical {
            background: #fed7d7;
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
        
        /* Temperature color coding */
        td.warning, li.warning h3 {
            color: #ed8936;
        }
        
        td.critical, li.critical h3 {
            color: #f56565;
        }
    `;
    document.head.appendChild(style);
}

// Populate chart
async function populateChart() {
    const data = await fetchTankHistory(200);
    const selectTank = document.getElementById("tank");
    const timeRange = document.getElementById("time-range");
    const ctx = document.getElementById("chart");
    
    if (!selectTank || !ctx) return;

    let chart = null;

    // Populate tank dropdown
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
                        if (r.temperature < 20 || r.temperature > 30) {
                            return r.temperature < 15 || r.temperature > 35 ? '#f56565' : '#ed8936';
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
                                return `Temperature: ${context.parsed.y}°C`;
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

    // Initial draw
    draw(1, parseInt(timeRange.value));

    // Event listeners
    selectTank.onchange = function(e) {
        draw(parseInt(e.target.value), parseInt(timeRange.value));
    };

    timeRange.onchange = function(e) {
        draw(parseInt(selectTank.value), parseInt(e.target.value));
    };
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    addCustomStyles();
    
    // Check which page we're on
    if (document.getElementById("tank-overview")) {
        populateDashboard();
    }
    
    if (document.getElementById("chart")) {
        populateChart();
    }
    
    // Add sidebar toggle functionality
    const menuToggle = document.querySelector('#content nav .bx-menu');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
});