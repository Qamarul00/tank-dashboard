const supabase = window.supabaseClient;

// Global variables
let realtimeEnabled = true;
let map = null;
let markers = [];
let currentData = [];
let autoRefreshInterval = null;
let tankDetailChart = null;

// Tank configuration - hanya Tank 1 hingga Tank 21
const TANK_CONFIG = {
    totalTanks: 21
};

// Generate tank data - hanya Tank 1-21
function generateTankData() {
    const tanks = [];
    for (let i = 1; i <= TANK_CONFIG.totalTanks; i++) {
        tanks.push({
            id: i,
            tank_number: i,
            name: `Tank ${i}`
        });
    }
    return tanks;
}

// DOM Elements
const elements = {
    // Status elements
    avgTemp: document.getElementById('avg-temp'),
    maxTemp: document.getElementById('max-temp'),
    minTemp: document.getElementById('min-temp'),
    maxTank: document.getElementById('max-tank'),
    minTank: document.getElementById('min-tank'),
    normalTanks: document.getElementById('normal-tanks'),
    warningTanks: document.getElementById('warning-tanks'),
    
    // Summary elements
    totalReadings: document.getElementById('total-readings'),
    tempStability: document.getElementById('temp-stability'),
    updateRate: document.getElementById('update-rate'),
    dataTimestamp: document.getElementById('data-timestamp'),
    
    // Connection status
    connectionStatus: document.getElementById('connection-status'),
    sidebarStatus: document.getElementById('sidebar-status'),
    
    // Time elements
    currentTime: document.getElementById('current-time'),
    lastUpdate: document.getElementById('last-update'),
    
    // Alert elements
    realtimeAlert: document.getElementById('realtime-alert'),
    
    // Map elements
    mapZoom: document.getElementById('map-zoom'),
    markerCount: document.getElementById('marker-count'),
    
    // Table elements
    tankStatusTable: document.getElementById('tank-status-table'),
    tempStatsTable: document.getElementById('temp-stats-table'),
    latestRecordsTable: document.getElementById('latest-records-table'),
    
    // Tank grid
    tankGridView: document.getElementById('tank-grid-view'),
    
    // Modal elements
    tankModal: document.getElementById('tank-modal'),
    
    // Control elements
    realtimeToggle: document.getElementById('realtime-toggle'),
    manualRefresh: document.getElementById('manual-refresh'),
    sidebarToggle: document.getElementById('sidebar-toggle')
};

// Initialize application
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Initializing Tank Monitoring Dashboard...');
    
    // Update current time
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Initialize map
    initializeMap();
    
    // Load initial data
    await loadInitialData();
    
    // Start real-time updates if enabled
    if (realtimeEnabled) {
        startRealtimeUpdates();
        showRealtimeAlert();
    }
    
    console.log('Dashboard initialized successfully');
});

// Update current time
function updateCurrentTime() {
    const now = new Date();
    elements.currentTime.textContent = now.toLocaleTimeString();
}

// Initialize event listeners
function initializeEventListeners() {
    // Sidebar toggle
    if (elements.sidebarToggle) {
        elements.sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    // Realtime toggle
    if (elements.realtimeToggle) {
        elements.realtimeToggle.addEventListener('click', toggleRealtime);
    }
    
    // Manual refresh
    if (elements.manualRefresh) {
        elements.manualRefresh.addEventListener('click', loadInitialData);
    }
    
    // Map controls
    document.getElementById('refresh-map')?.addEventListener('click', refreshMapData);
    document.getElementById('center-map')?.addEventListener('click', centerMap);
    document.getElementById('toggle-markers')?.addEventListener('click', toggleAllMarkers);
    
    // Table search
    document.getElementById('table-search')?.addEventListener('input', filterTable);
    document.getElementById('sort-temp')?.addEventListener('click', sortTableByTemp);
    
    // Modal close
    document.querySelector('.modal-close')?.addEventListener('click', closeModal);
    
    // View toggle
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            toggleView(this.dataset.view);
        });
    });
    
    // Export data
    document.getElementById('export-data')?.addEventListener('click', exportData);
}

// Toggle sidebar
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

// Toggle realtime updates
function toggleRealtime() {
    realtimeEnabled = !realtimeEnabled;
    const btn = elements.realtimeToggle;
    
    if (realtimeEnabled) {
        btn.innerHTML = '<i class="bx bx-wifi"></i><span>Live Updates</span>';
        btn.classList.add('active');
        startRealtimeUpdates();
        showRealtimeAlert();
        updateConnectionStatus('Connected', 'success');
    } else {
        btn.innerHTML = '<i class="bx bx-wifi-off"></i><span>Live Updates</span>';
        btn.classList.remove('active');
        stopRealtimeUpdates();
        updateConnectionStatus('Manual Mode', 'warning');
    }
}

// Initialize Leaflet map
function initializeMap() {
    if (!document.getElementById('map')) return;
    
    // Center on Tanjung Langsat Terminal
    map = L.map('map').setView([1.4600, 104.0300], 14);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);
    
    // Update zoom display
    map.on('zoomend', function() {
        if (elements.mapZoom) {
            elements.mapZoom.textContent = map.getZoom();
        }
    });
}

// Load initial data
async function loadInitialData() {
    try {
        updateConnectionStatus('Loading data...', 'loading');
        
        // Generate tank data
        const tankData = generateTankData();
        
        // Load temperature readings
        const readings = await loadTemperatureReadings();
        
        // Process and display data
        processAndDisplayData(tankData, readings);
        
        // Update connection status
        updateConnectionStatus('Connected', 'success');
        
        console.log('Data loaded successfully:', {
            tanks: tankData.length,
            readings: readings.length
        });
        
    } catch (error) {
        console.error('Error loading data:', error);
        updateConnectionStatus('Connection Error', 'error');
        showError('Failed to load data: ' + error.message);
    }
}

// Load temperature readings from tank_readings table
async function loadTemperatureReadings() {
    try {
        const { data, error } = await supabase
            .from('tank_readings')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
        
        if (error) throw error;
        
        // Add tank information to each reading
        const tankData = generateTankData();
        const enrichedReadings = data.map(reading => {
            const tank = tankData.find(t => t.id === reading.tank_id) || 
                        { id: reading.tank_id, tank_number: reading.tank_id, name: `Tank ${reading.tank_id}` };
            return {
                ...reading,
                tanks: {
                    tank_number: tank.tank_number,
                    name: tank.name
                }
            };
        });
        
        return enrichedReadings || [];
    } catch (error) {
        console.error('Error loading readings:', error);
        return [];
    }
}

// Process and display data
function processAndDisplayData(tanks, readings) {
    currentData = readings;
    
    // Update summary statistics
    updateSummaryStats(tanks, readings);
    
    // Update tank status table
    updateTankStatusTable(tanks, readings);
    
    // Update temperature statistics
    updateTempStats(readings);
    
    // Update latest records
    updateLatestRecords(readings);
    
    // Update tank overview cards
    updateTankOverview(tanks, readings);
    
    // Update map markers
    updateMapMarkers(tanks, readings);
    
    // Update timestamp
    updateLastUpdate();
}

// Update summary statistics
function updateSummaryStats(tanks, readings) {
    if (readings.length === 0) {
        // Set default values when no data
        elements.avgTemp.textContent = '--';
        elements.maxTemp.textContent = '--';
        elements.minTemp.textContent = '--';
        elements.maxTank.textContent = 'Tank --';
        elements.minTank.textContent = 'Tank --';
        elements.normalTanks.textContent = '--';
        elements.warningTanks.textContent = '--';
        elements.totalReadings.textContent = '0';
        elements.tempStability.textContent = '--';
        elements.dataTimestamp.textContent = 'First: -- | Last: --';
        return;
    }
    
    // Calculate average temperature
    const avgTemp = readings.reduce((sum, r) => sum + r.temperature, 0) / readings.length;
    elements.avgTemp.textContent = avgTemp.toFixed(1);
    
    // Find max and min temperatures
    const maxReading = readings.reduce((max, r) => r.temperature > max.temperature ? r : max);
    const minReading = readings.reduce((min, r) => r.temperature < min.temperature ? r : min);
    
    elements.maxTemp.textContent = maxReading.temperature.toFixed(1);
    elements.minTemp.textContent = minReading.temperature.toFixed(1);
    elements.maxTank.textContent = `Tank ${maxReading.tank_id}`;
    elements.minTank.textContent = `Tank ${minReading.tank_id}`;
    
    // Count normal and warning tanks
    const tankTemps = {};
    readings.forEach(r => {
        if (!tankTemps[r.tank_id] || new Date(r.created_at) > new Date(tankTemps[r.tank_id].created_at)) {
            tankTemps[r.tank_id] = r;
        }
    });
    
    const tankStatuses = Object.values(tankTemps);
    const normalCount = tankStatuses.filter(t => t.temperature < 50).length;
    const warningCount = tankStatuses.filter(t => t.temperature >= 50).length;
    
    elements.normalTanks.textContent = normalCount;
    elements.warningTanks.textContent = warningCount;
    
    // Update total readings
    elements.totalReadings.textContent = readings.length;
    
    // Calculate temperature stability (standard deviation)
    const variance = readings.reduce((sum, r) => sum + Math.pow(r.temperature - avgTemp, 2), 0) / readings.length;
    const stdDev = Math.sqrt(variance);
    elements.tempStability.textContent = stdDev.toFixed(2);
    
    // Update timestamp
    const firstReading = readings[readings.length - 1];
    const lastReading = readings[0];
    elements.dataTimestamp.textContent = 
        `First: ${formatDate(firstReading.created_at)} | Last: ${formatDate(lastReading.created_at)}`;
}

// Update tank status table
function updateTankStatusTable(tanks, readings) {
    const tableBody = elements.tankStatusTable;
    if (!tableBody) return;
    
    // Group latest readings by tank
    const latestByTank = {};
    readings.forEach(r => {
        if (!latestByTank[r.tank_id] || new Date(r.created_at) > new Date(latestByTank[r.tank_id].created_at)) {
            latestByTank[r.tank_id] = r;
        }
    });
    
    tableBody.innerHTML = '';
    
    tanks.forEach(tank => {
        const reading = latestByTank[tank.id];
        
        // If no reading for this tank, create a placeholder
        if (!reading) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>Tank ${tank.tank_number}</strong></td>
                <td>
                    <div class="temp-display status-normal">
                        --°C
                    </div>
                </td>
                <td>
                    <span class="status-badge status-normal">
                        <i class='bx bx-minus-circle'></i>
                        No Data
                    </span>
                </td>
                <td>--</td>
                <td>
                    <button class="action-btn" onclick="showTankDetails(${tank.id})">
                        <i class='bx bx-show'></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
            return;
        }
        
        const row = document.createElement('tr');
        const status = reading.temperature >= 50 ? 'warning' : 'normal';
        const statusText = reading.temperature >= 50 ? 'Too Hot' : 'Normal';
        const statusClass = reading.temperature >= 50 ? 'status-warning' : 'status-normal';
        
        row.innerHTML = `
            <td><strong>Tank ${tank.tank_number}</strong></td>
            <td>
                <div class="temp-display ${statusClass}">
                    ${reading.temperature.toFixed(1)}°C
                </div>
            </td>
            <td>
                <span class="status-badge ${statusClass}">
                    <i class='bx ${status === 'warning' ? 'bx-error-circle' : 'bx-check-circle'}'></i>
                    ${statusText}
                </span>
            </td>
            <td>${formatTimeAgo(reading.created_at)}</td>
            <td>
                <button class="action-btn" onclick="showTankDetails(${tank.id})">
                    <i class='bx bx-show'></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Update temperature statistics table
function updateTempStats(readings) {
    const tableBody = elements.tempStatsTable;
    if (!tableBody) return;
    
    if (readings.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="loading-cell">
                    <i class='bx bx-data'></i>
                    <span>No temperature data available</span>
                </td>
            </tr>
        `;
        return;
    }
    
    const temps = readings.map(r => r.temperature);
    const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
    const max = Math.max(...temps);
    const min = Math.min(...temps);
    const variance = temps.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / temps.length;
    const stdDev = Math.sqrt(variance);
    
    const stats = [
        { metric: 'Average Temperature', value: avg.toFixed(1), unit: '°C', trend: 'stable' },
        { metric: 'Maximum Temperature', value: max.toFixed(1), unit: '°C', trend: 'up' },
        { metric: 'Minimum Temperature', value: min.toFixed(1), unit: '°C', trend: 'down' },
        { metric: 'Temperature Range', value: (max - min).toFixed(1), unit: '°C', trend: 'neutral' },
        { metric: 'Standard Deviation', value: stdDev.toFixed(2), unit: 'σ', trend: 'stable' },
        { metric: 'Sample Size', value: readings.length, unit: 'readings', trend: 'neutral' }
    ];
    
    tableBody.innerHTML = '';
    
    stats.forEach(stat => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${stat.metric}</td>
            <td><strong>${stat.value}</strong></td>
            <td>${stat.unit}</td>
            <td>
                <i class='bx bx-trending-${stat.trend}'></i>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Update latest records table
function updateLatestRecords(readings) {
    const tableBody = elements.latestRecordsTable;
    if (!tableBody) return;
    
    const limit = parseInt(document.getElementById('records-limit')?.value || 20);
    const displayReadings = readings.slice(0, limit);
    
    if (displayReadings.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="loading-cell">
                    <i class='bx bx-data'></i>
                    <span>No records available</span>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = '';
    
    displayReadings.forEach(reading => {
        const status = reading.temperature >= 50 ? 'warning' : 'normal';
        const statusText = reading.temperature >= 50 ? 'Too Hot' : 'Normal';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${reading.id}</td>
            <td>Tank ${reading.tank_id}</td>
            <td>
                <span class="temp-badge ${status}">
                    ${reading.temperature.toFixed(1)}°C
                </span>
            </td>
            <td>${formatDateTime(reading.created_at)}</td>
            <td>
                <span class="status-indicator ${status}">
                    ${statusText}
                </span>
            </td>
            <td>
                ${reading.temperature >= 50 ? 
                    '<i class="bx bx-alarm" style="color: #f72585;"></i>' : 
                    '<i class="bx bx-check" style="color: #4cc9f0;"></i>'
                }
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Update tank overview cards
function updateTankOverview(tanks, readings) {
    const grid = elements.tankGridView;
    if (!grid) return;
    
    // Group latest readings by tank
    const latestByTank = {};
    readings.forEach(r => {
        if (!latestByTank[r.tank_id] || new Date(r.created_at) > new Date(latestByTank[r.tank_id].created_at)) {
            latestByTank[r.tank_id] = r;
        }
    });
    
    grid.innerHTML = '';
    
    tanks.forEach(tank => {
        const reading = latestByTank[tank.id];
        
        const card = document.createElement('div');
        card.className = 'tank-card';
        card.onclick = () => showTankDetails(tank.id);
        
        if (!reading) {
            // No data for this tank
            card.innerHTML = `
                <div class="tank-card-header">
                    <h4>Tank ${tank.tank_number}</h4>
                    <div class="temp-circle" style="border-color: #6c757d">
                        --°C
                    </div>
                </div>
                <div class="tank-card-content">
                    <div class="tank-status">
                        <span class="status-dot" style="background: #6c757d"></span>
                        <span>No Data</span>
                    </div>
                    <p class="tank-update">--</p>
                </div>
            `;
        } else {
            const status = reading.temperature >= 50 ? 'warning' : 'normal';
            const statusColor = reading.temperature >= 50 ? '#f72585' : '#4cc9f0';
            
            card.innerHTML = `
                <div class="tank-card-header">
                    <h4>Tank ${tank.tank_number}</h4>
                    <div class="temp-circle" style="border-color: ${statusColor}">
                        ${reading.temperature.toFixed(1)}°C
                    </div>
                </div>
                <div class="tank-card-content">
                    <div class="tank-status">
                        <span class="status-dot" style="background: ${statusColor}"></span>
                        <span>${status === 'warning' ? 'Too Hot' : 'Normal'}</span>
                    </div>
                    <p class="tank-update">Updated ${formatTimeAgo(reading.created_at)}</p>
                </div>
            `;
        }
        
        grid.appendChild(card);
    });
}

// Update map markers
function updateMapMarkers(tanks, readings) {
    if (!map) return;
    
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    // Group latest readings by tank
    const latestByTank = {};
    readings.forEach(r => {
        if (!latestByTank[r.tank_id] || new Date(r.created_at) > new Date(latestByTank[r.tank_id].created_at)) {
            latestByTank[r.tank_id] = r;
        }
    });
    
    // Add markers for each tank
    tanks.forEach(tank => {
        const reading = latestByTank[tank.id];
        
        // Generate coordinates around Tanjung Langsat
        const lat = 1.4600 + (Math.random() - 0.5) * 0.01;
        const lng = 104.0300 + (Math.random() - 0.5) * 0.01;
        
        let iconColor = '#6c757d'; // Default gray for no data
        let temperature = '--';
        let statusText = 'No Data';
        
        if (reading) {
            const status = reading.temperature >= 50 ? 'warning' : 'normal';
            iconColor = reading.temperature >= 50 ? '#f72585' : '#4cc9f0';
            temperature = reading.temperature.toFixed(1);
            statusText = status === 'warning' ? '⚠️ Too Hot' : '✅ Normal';
        }
        
        // Create custom icon
        const icon = L.divIcon({
            html: `
                <div class="map-marker" style="border-color: ${iconColor}">
                    <div class="marker-temperature">${temperature}°C</div>
                    <div class="marker-label">Tank ${tank.tank_number}</div>
                </div>
            `,
            className: 'custom-marker',
            iconSize: [60, 60],
            iconAnchor: [30, 60]
        });
        
        const marker = L.marker([lat, lng], { icon })
            .addTo(map)
            .bindPopup(`
                <div class="map-popup">
                    <h3>Tank ${tank.tank_number}</h3>
                    <p><strong>Temperature:</strong> ${temperature}°C</p>
                    <p><strong>Status:</strong> ${statusText}</p>
                    <p><strong>Last Update:</strong> ${reading ? formatDateTime(reading.created_at) : '--'}</p>
                    <button onclick="showTankDetails(${tank.id})" class="popup-btn">
                        View Details
                    </button>
                </div>
            `);
        
        markers.push(marker);
    });
    
    // Update marker count
    if (elements.markerCount) {
        elements.markerCount.textContent = markers.length;
    }
}

// Show tank details modal
async function showTankDetails(tankId) {
    try {
        // Generate tank info
        const tankData = generateTankData();
        const tank = tankData.find(t => t.id === tankId) || {
            id: tankId,
            tank_number: tankId,
            name: `Tank ${tankId}`
        };
        
        // Fetch temperature history for this tank
        const { data: history, error } = await supabase
            .from('tank_readings')
            .select('*')
            .eq('tank_id', tankId)
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        // Update modal content
        document.getElementById('modal-tank-id').textContent = `Tank ${tank.tank_number}`;
        
        if (history && history.length > 0) {
            const currentTemp = history[0].temperature;
            document.getElementById('modal-tank-status').textContent = 
                currentTemp >= 50 ? 'Too Hot' : 'Normal';
            document.getElementById('modal-tank-temp').textContent = currentTemp.toFixed(1);
            document.getElementById('modal-last-update').textContent = formatDateTime(history[0].created_at);
            document.getElementById('modal-update-count').textContent = history.length;
        } else {
            document.getElementById('modal-tank-status').textContent = 'No Data';
            document.getElementById('modal-tank-temp').textContent = '--';
            document.getElementById('modal-last-update').textContent = '--';
            document.getElementById('modal-update-count').textContent = '0';
        }
        
        // Show modal
        elements.tankModal.style.display = 'flex';
        
        // Create chart if history exists
        if (history && history.length > 0) {
            createTankDetailChart(history.reverse());
        } else {
            // Clear chart area if no data
            const chartCanvas = document.getElementById('tank-detail-chart');
            if (chartCanvas) {
                const ctx = chartCanvas.getContext('2d');
                ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
                ctx.fillStyle = '#f5f5f5';
                ctx.fillRect(0, 0, chartCanvas.width, chartCanvas.height);
                ctx.fillStyle = '#666';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('No temperature data available', chartCanvas.width / 2, chartCanvas.height / 2);
            }
        }
        
    } catch (error) {
        console.error('Error loading tank details:', error);
        alert('Failed to load tank details: ' + error.message);
    }
}

// Create tank detail chart
function createTankDetailChart(history) {
    const ctx = document.getElementById('tank-detail-chart').getContext('2d');
    
    // Destroy existing chart
    if (tankDetailChart) {
        tankDetailChart.destroy();
    }
    
    const labels = history.map(h => formatTime(h.created_at));
    const temperatures = history.map(h => h.temperature);
    
    tankDetailChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Temperature (°C)',
                data: temperatures,
                borderColor: '#4361ee',
                backgroundColor: 'rgba(67, 97, 238, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Temperature (°C)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time'
                    }
                }
            }
        }
    });
}

// Close modal
function closeModal() {
    elements.tankModal.style.display = 'none';
    if (tankDetailChart) {
        tankDetailChart.destroy();
        tankDetailChart = null;
    }
}

// Start realtime updates
function startRealtimeUpdates() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    autoRefreshInterval = setInterval(loadInitialData, 30000); // 30 seconds
    
    // Subscribe to database changes
    const channel = supabase
        .channel('temperature-changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'tank_readings' },
            () => loadInitialData()
        )
        .subscribe();
}

// Stop realtime updates
function stopRealtimeUpdates() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Show realtime alert
function showRealtimeAlert() {
    if (elements.realtimeAlert) {
        elements.realtimeAlert.style.display = 'flex';
        setTimeout(() => {
            elements.realtimeAlert.style.display = 'none';
        }, 5000);
    }
}

// Close realtime alert
function closeRealtimeAlert() {
    if (elements.realtimeAlert) {
        elements.realtimeAlert.style.display = 'none';
    }
}

// Update connection status
function updateConnectionStatus(message, type) {
    const statusElement = elements.connectionStatus;
    const sidebarStatus = elements.sidebarStatus;
    
    if (!statusElement) return;
    
    statusElement.innerHTML = `
        <i class='bx bx-wifi${type === 'success' ? '' : type === 'error' ? '-off' : ''}'></i>
        <span>${message}</span>
    `;
    
    // Update status indicator color
    let color = '#f8961e'; // warning (loading)
    if (type === 'success') color = '#4cc9f0'; // success
    if (type === 'error') color = '#f72585'; // error
    
    statusElement.style.color = color;
    
    if (sidebarStatus) {
        sidebarStatus.style.background = color;
    }
}

// Update last update timestamp
function updateLastUpdate() {
    if (elements.lastUpdate) {
        elements.lastUpdate.textContent = 'Just now';
    }
}

// Refresh map data
function refreshMapData() {
    if (map && currentData.length > 0) {
        // Regenerate tank data and update map
        const tanks = generateTankData();
        updateMapMarkers(tanks, currentData);
    }
}

// Center map
function centerMap() {
    if (map) {
        map.setView([1.4600, 104.0300], 14);
    }
}

// Toggle all markers
function toggleAllMarkers() {
    const btn = document.getElementById('toggle-markers');
    const isVisible = markers[0]?.isPopupOpen() || false;
    
    markers.forEach(marker => {
        if (isVisible) {
            marker.closePopup();
        } else {
            marker.openPopup();
        }
    });
    
    btn.innerHTML = isVisible ? 
        '<i class="bx bx-show"></i> Show All' : 
        '<i class="bx bx-hide"></i> Hide All';
}

// Filter table
function filterTable(event) {
    const searchTerm = event.target.value.toLowerCase();
    const rows = elements.tankStatusTable.querySelectorAll('tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// Sort table by temperature
function sortTableByTemp() {
    const tbody = elements.tankStatusTable;
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    rows.sort((a, b) => {
        const tempA = parseFloat(a.querySelector('.temp-display').textContent) || 0;
        const tempB = parseFloat(b.querySelector('.temp-display').textContent) || 0;
        return tempB - tempA; // Descending order
    });
    
    rows.forEach(row => tbody.appendChild(row));
}

// Toggle view mode
function toggleView(view) {
    const grid = document.getElementById('tank-grid-view');
    const buttons = document.querySelectorAll('.view-btn');
    
    buttons.forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
    
    if (view === 'list') {
        grid.style.gridTemplateColumns = '1fr';
        grid.classList.add('list-view');
    } else {
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
        grid.classList.remove('list-view');
    }
}

// Export data
function exportData() {
    if (currentData.length === 0) {
        alert('No data to export');
        return;
    }
    
    const csvContent = [
        ['Tank ID', 'Temperature (°C)', 'Date Time', 'Status'].join(','),
        ...currentData.map(r => [
            r.tank_id,
            r.temperature,
            r.created_at,
            r.temperature >= 50 ? 'Too Hot' : 'Normal'
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tank-temperatures-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Format date time
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

// Format time
function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Format time ago
function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}

// Show error
function showError(message) {
    alert('Error: ' + message);
}

// Global functions for HTML onclick
window.toggleRealtime = toggleRealtime;
window.closeRealtimeAlert = closeRealtimeAlert;
window.showTankDetails = showTankDetails;
window.closeModal = closeModal;
window.refreshMapData = refreshMapData;
window.centerMap = centerMap;
window.toggleAllMarkers = toggleAllMarkers;
window.filterTable = filterTable;
window.sortTableByTemp = sortTableByTemp;
window.toggleView = toggleView;
window.exportData = exportData;

// Test connection
window.testConnection = async function() {
    try {
        console.log('Testing Supabase connection...');
        const { data, error } = await supabase.from('tank_readings').select('count').limit(1);
        if (error) throw error;
        console.log('✓ Connection successful');
        return true;
    } catch (error) {
        console.error('✗ Connection failed:', error);
        return false;
    }
};

//end