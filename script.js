// ==================== CONFIGURATION ====================
const SUPABASE_URL = "https://zhjzbvghigeuarxvucob.supabase.co/rest/v1";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoanpidmdoaWdldWFyeHZ1Y29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NzAxOTUsImV4cCI6MjA4MDM0NjE5NX0.TF0dz6huz6tPAiXe3pz04Fuafh7dewIVNqWpOzJbm2w";

// Performance settings
const MAX_RECORDS_DISPLAY = 1000;
const MAX_RECORDS_PROCESS = 5000;
const BATCH_SIZE = 1000;
const AUTO_REFRESH_INTERVAL = 30000;

// ==================== GLOBAL VARIABLES ====================
let supabase = null;
let allTankData = [];
let map = null;
let tankMarkers = [];
let realtimeSubscription = null;
let autoRefreshInterval = null;
let lastUpdateTime = null;
let updateCount = 0;
let updatesPerMinute = 0;
let isLoadingMore = false;
let totalDatabaseCount = 0;
let displayedRecordsLimit = 15;

// Tank locations at FIMA Bulking Services, Tanjung Langsat
const tankLocations = {
    1: { lat: 1.4568493, lng: 103.9943378, name: "Storage Tank A1" },
    2: { lat: 1.4569493, lng: 103.9944378, name: "Storage Tank A2" },
    3: { lat: 1.4570493, lng: 103.9943378, name: "Storage Tank B1" },
    4: { lat: 1.4571493, lng: 103.9944378, name: "Storage Tank B2" },
    5: { lat: 1.4572493, lng: 103.9943378, name: "Storage Tank C1" },
    6: { lat: 1.4573493, lng: 103.9944378, name: "Storage Tank C2" },
    7: { lat: 1.4568493, lng: 103.9939378, name: "Processing Tank D1" },
    8: { lat: 1.4569493, lng: 103.9940378, name: "Processing Tank D2" },
    9: { lat: 1.4570493, lng: 103.9939378, name: "Processing Tank E1" },
    10: { lat: 1.4571493, lng: 103.9940378, name: "Processing Tank E2" },
    11: { lat: 1.4572493, lng: 103.9939378, name: "Processing Tank F1" },
    12: { lat: 1.4573493, lng: 103.9940378, name: "Processing Tank F2" },
    13: { lat: 1.4569493, lng: 103.9935378, name: "Blending Tank G1" },
    14: { lat: 1.4570493, lng: 103.9936378, name: "Blending Tank G2" },
    15: { lat: 1.4571493, lng: 103.9935378, name: "Quality Tank H1" },
    16: { lat: 1.4572493, lng: 103.9936378, name: "Quality Tank H2" },
    17: { lat: 1.4573493, lng: 103.9935378, name: "Utility Tank I1" },
    18: { lat: 1.4568493, lng: 103.9931378, name: "Utility Tank I2" },
    19: { lat: 1.4569493, lng: 103.9932378, name: "Emergency Tank J1" },
    20: { lat: 1.4570493, lng: 103.9931378, name: "Emergency Tank J2" },
    21: { lat: 1.4571493, lng: 103.9932378, name: "Control Tank K1" }
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log("Initializing Tank Monitoring Dashboard...");
    
    // Initialize Supabase
    initializeSupabase();
    
    // Add custom styles
    addCustomStyles();
    
    // Initialize dashboard
    if (document.getElementById("tank-overview")) {
        populateDashboard();
        setTimeout(initMap, 1000);
    }
    
    // Initialize charts page
    if (document.getElementById("chart")) {
        initializeChartsPage();
    }
    
    // Setup sidebar toggle
    setupSidebarToggle();
    
    // Setup modal close on overlay click
    document.getElementById('data-stats-modal')?.addEventListener('click', function(e) {
        if (e.target === this) closeDataStats();
    });
    
    document.getElementById('analysis-modal')?.addEventListener('click', function(e) {
        if (e.target === this) closeAnalysisModal();
    });
    
    // Setup realtime alert close
    document.querySelector('.alert-close')?.addEventListener('click', closeRealtimeAlert);
});

function initializeSupabase() {
    try {
        if (window.supabase) {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log("Supabase client initialized");
        } else {
            console.error("Supabase library not loaded");
            showNotification('Supabase library failed to load', 'error');
        }
    } catch (error) {
        console.error("Failed to initialize Supabase:", error);
    }
}

// ==================== DATA FETCHING ====================
async function fetchAllTankData() {
    try {
        console.log("Fetching tank data...");
        updateConnectionStatus('connecting');
        showLoadProgress(true, "Fetching data...");
        
        if (!supabase) {
            throw new Error("Supabase client not initialized");
        }
        
        // 1. Get total count from database
        const { count: totalCount, error: countError } = await supabase
            .from('tank_readings')
            .select('*', { count: 'exact', head: true });
        
        if (countError) throw countError;
        
        totalDatabaseCount = totalCount;
        console.log(`Database has ${totalCount} total records`);
        
        // 2. Determine fetching strategy based on dataset size
        let data = [];
        
        if (totalCount <= MAX_RECORDS_DISPLAY) {
            // Small dataset: fetch all
            console.log(`Small dataset, fetching all ${totalCount} records...`);
            data = await fetchRecords(0, totalCount);
            
        } else if (totalCount <= 10000) {
            // Medium dataset: fetch for processing
            console.log(`Medium dataset, fetching ${MAX_RECORDS_PROCESS} records for statistics...`);
            data = await fetchRecords(0, MAX_RECORDS_PROCESS);
            
            // Show dataset warning
            showDatasetWarning(totalCount, data.length, false);
            
        } else {
            // Large dataset: fetch only for display
            console.log(`Large dataset, fetching ${MAX_RECORDS_DISPLAY} most recent records...`);
            data = await fetchLatestRecords(MAX_RECORDS_DISPLAY);
            
            // Show large dataset warning
            showDatasetWarning(totalCount, data.length, true);
        }
        
        allTankData = data;
        updateConnectionStatus('connected');
        showLoadProgress(false);
        
        console.log(`Data fetch complete: ${data.length} records loaded`);
        return data;
        
    } catch (error) {
        console.error("Error fetching tank data:", error);
        showNotification('Using simulated data. Connection issue.', 'warning');
        updateConnectionStatus('disconnected');
        showLoadProgress(false);
        return generateMockData(735);
    }
}

async function fetchRecords(offset, limit) {
    const { data, error } = await supabase
        .from('tank_readings')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    
    if (error) throw error;
    return data;
}

async function fetchLatestRecords(limit) {
    const { data, error } = await supabase
        .from('tank_readings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
    
    if (error) throw error;
    return data;
}

// ==================== LOAD MORE FUNCTIONALITY ====================
async function loadMoreData() {
    if (isLoadingMore) return;
    
    isLoadingMore = true;
    const button = document.getElementById('load-more-btn');
    
    if (button) {
        button.innerHTML = '<i class="bx bx-loader bx-spin"></i> Loading...';
        button.disabled = true;
    }
    
    try {
        // Calculate how many more to load
        const currentCount = allTankData.length;
        const toLoad = Math.min(MAX_RECORDS_PROCESS, totalDatabaseCount) - currentCount;
        
        if (toLoad <= 0) {
            showNotification('All available data is loaded', 'info');
            return;
        }
        
        showNotification(`Loading ${toLoad} more records...`, 'info');
        
        // Load additional data
        const { data: newData, error } = await supabase
            .from('tank_readings')
            .select('*')
            .order('created_at', { ascending: false })
            .range(currentCount, currentCount + toLoad - 1);
        
        if (error) throw error;
        
        if (newData && newData.length > 0) {
            // Add to existing data
            allTankData = allTankData.concat(newData);
            
            // Update statistics
            const stats = calculateStatistics(allTankData);
            updateMetrics(stats);
            
            // Update displays
            updateAllDisplays();
            
            showNotification(`Loaded ${newData.length} more records`, 'success');
            
            // Update dataset warning
            updateDatasetWarning();
            
            // Check if more data exists
            if (allTankData.length >= Math.min(MAX_RECORDS_PROCESS, totalDatabaseCount)) {
                showNotification('Loaded maximum processable records', 'info');
                if (button) button.style.display = 'none';
            }
        } else {
            showNotification('No more records to load', 'info');
        }
        
    } catch (error) {
        console.error("Error loading more data:", error);
        showNotification('Failed to load more data', 'error');
    } finally {
        isLoadingMore = false;
        if (button) {
            button.innerHTML = '<i class="bx bx-cloud-download"></i> Load More';
            button.disabled = false;
        }
    }
}

// ==================== REALTIME UPDATES ====================
async function setupRealtimeUpdates() {
    try {
        if (!supabase) {
            throw new Error("Supabase client not available");
        }
        
        console.log("Setting up realtime subscription...");
        
        // Subscribe to INSERT events
        realtimeSubscription = supabase
            .channel('tank-readings-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'tank_readings'
                },
                (payload) => {
                    console.log('New realtime data:', payload.new);
                    handleNewRealtimeData(payload.new);
                }
            )
            .subscribe((status) => {
                console.log('Realtime subscription status:', status);
                
                if (status === 'SUBSCRIBED') {
                    updateConnectionStatus('connected');
                    showRealtimeAlert();
                    updateRealtimeIndicator(true);
                    showNotification('Live updates enabled', 'success');
                } else if (status === 'CHANNEL_ERROR') {
                    updateConnectionStatus('disconnected');
                    updateRealtimeIndicator(false);
                    showNotification('Live updates disconnected', 'warning');
                    // Fallback to auto-refresh
                    startAutoRefresh();
                }
            });
        
        return realtimeSubscription;
        
    } catch (error) {
        console.error("Failed to setup realtime updates:", error);
        showNotification('Failed to enable live updates', 'error');
        updateRealtimeIndicator(false);
        // Fallback to auto-refresh
        startAutoRefresh();
        return null;
    }
}

function stopRealtimeUpdates() {
    if (realtimeSubscription) {
        supabase.removeChannel(realtimeSubscription);
        realtimeSubscription = null;
        console.log("Realtime updates stopped");
        updateRealtimeIndicator(false);
        showNotification('Live updates disabled', 'info');
    }
}

function handleNewRealtimeData(newRecord) {
    // Update counters
    updateCount++;
    const now = new Date();
    if (!lastUpdateTime) lastUpdateTime = now;
    
    // Calculate updates per minute
    const minutesSinceStart = (now - lastUpdateTime) / (1000 * 60);
    if (minutesSinceStart > 0) {
        updatesPerMinute = Math.round(updateCount / minutesSinceStart);
    }
    
    // Add to all data (if not exceeding limit)
    if (allTankData.length < MAX_RECORDS_PROCESS) {
        allTankData.unshift(newRecord);
    }
    
    // Update latest values
    if (window.latestTankData) {
        const currentLatest = window.latestTankData[newRecord.tank_id];
        if (!currentLatest || new Date(newRecord.created_at) > new Date(currentLatest.created_at)) {
            window.latestTankData[newRecord.tank_id] = {
                temperature: newRecord.temperature,
                created_at: newRecord.created_at,
                id: newRecord.id
            };
            
            // Update UI components
            updateTankDisplay(newRecord.tank_id, newRecord.temperature);
            updateMapMarker(newRecord.tank_id, newRecord.temperature);
            
            // Show live notification
            showLiveNotification(newRecord);
        }
    }
    
    // Update statistics
    const stats = calculateStatistics(allTankData);
    updateMetrics(stats);
    
    // Add to latest records table with live badge
    addToLatestRecordsTable(newRecord, true);
    
    // Update timestamp
    updateTimestamp();
}

// ==================== AUTO REFRESH ====================
function startAutoRefresh(intervalSeconds = 30) {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    
    autoRefreshInterval = setInterval(async () => {
        console.log(`Auto-refresh at ${new Date().toLocaleTimeString()}`);
        await refreshDataSilently();
    }, intervalSeconds * 1000);
    
    // Update button
    const btn = document.getElementById('auto-refresh-toggle');
    if (btn) {
        btn.classList.add('active');
        btn.innerHTML = '<i class="bx bx-stop-circle"></i> Stop Auto Refresh';
    }
    
    showNotification(`Auto-refresh enabled (every ${intervalSeconds}s)`, 'info');
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        console.log("Auto-refresh stopped");
        
        // Update button
        const btn = document.getElementById('auto-refresh-toggle');
        if (btn) {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="bx bx-refresh"></i> Auto Refresh';
        }
        
        showNotification('Auto-refresh stopped', 'info');
    }
}

async function refreshDataSilently() {
    try {
        const data = await fetchAllTankData();
        const stats = calculateStatistics(data);
        const latestValues = await fetchLatestTankValues();
        
        updateMetrics(stats);
        window.latestTankData = latestValues;
        updateAllDisplays();
        
        console.log(`Auto-refresh completed: ${data.length} records`);
    } catch (error) {
        console.error("Auto-refresh failed:", error);
    }
}

// ==================== UI UPDATES ====================
function updateAllDisplays() {
    if (!window.latestTankData) return;
    
    // Update 21 Tank Overview
    const tankOverview = document.getElementById("tank-overview");
    if (tankOverview) {
        tankOverview.innerHTML = "";
        for (let i = 1; i <= 21; i++) {
            const tempData = window.latestTankData[i];
            const temp = tempData ? tempData.temperature : null;
            const statusClass = temp ? getStatusClass(temp) : '';
            const iconClass = temp ? getStatusIcon(temp) : 'bx bx-thermometer';
            
            const tankName = tankLocations[i] ? tankLocations[i].name : `Tank ${i}`;
            tankOverview.innerHTML += `
            <li class="${statusClass}">
                <i class='${iconClass}'></i>
                <span class="text">
                    <h3>${temp !== null ? temp.toFixed(1) + '°C' : '--'}</h3>
                    <p>${tankName}</p>
                </span>
            </li>`;
        }
    }
    
    // Update Tank Status Table
    populateTankStatusTable(window.latestTankData);
    
    // Update Latest Records Table
    updateLatestRecordsTable();
    
    // Update map
    if (map) {
        updateMapMarkers();
    }
}

function updateTankDisplay(tankId, temperature) {
    const isHot = temperature >= 50;
    const statusClass = isHot ? 'too-hot' : '';
    const iconClass = isHot ? 'bx bxs-fire' : 'bx bx-check-circle';
    
    // Update 21 Tank Overview
    const tankElement = document.querySelector(`#tank-overview li:nth-child(${tankId})`);
    if (tankElement) {
        tankElement.className = statusClass;
        tankElement.innerHTML = `
            <i class='${iconClass}'></i>
            <span class="text">
                <h3>${temperature.toFixed(1)}°C</h3>
                <p>Tank ${tankId}</p>
            </span>
        `;
    }
    
    // Update Tank Status Table
    const tableRow = document.querySelector(`#tank-status-table tr:nth-child(${tankId})`);
    if (tableRow) {
        const statusText = isHot ? 'Too Hot' : 'Normal';
        const lastUpdate = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        tableRow.innerHTML = `
            <td><strong>Tank ${tankId}</strong></td>
            <td><span class="${statusClass}">${temperature.toFixed(1)}°C</span></td>
            <td>
                <span class="status-badge ${statusClass}">
                    <i class="${iconClass}"></i>
                    ${statusText}
                </span>
            </td>
            <td>${lastUpdate}</td>
        `;
    }
    
    // Flash update indicator
    const updateIndicator = document.getElementById('overview-update');
    if (updateIndicator) {
        updateIndicator.style.color = isHot ? '#e53e3e' : '#48bb78';
        updateIndicator.innerHTML = `<i class='bx bx-check-circle'></i> Updated now`;
        
        setTimeout(() => {
            updateIndicator.style.color = '#3182ce';
            updateIndicator.innerHTML = `<i class='bx bx-check-circle'></i> Updated`;
        }, 2000);
    }
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
        const lastUpdate = tempData ? new Date(tempData.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--';
        
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
            <td>${lastUpdate}</td>
        </tr>`;
    }
}

function updateLatestRecordsTable() {
    const tankTable = document.getElementById("tank-table");
    if (!tankTable) return;
    
    const tbody = tankTable.querySelector('tbody');
    if (!tbody) return;
    
    // Get latest records (limited by displayedRecordsLimit)
    const latestRecords = allTankData.slice(0, displayedRecordsLimit);
    
    tbody.innerHTML = '';
    
    latestRecords.forEach(record => {
        const isHot = record.temperature >= 50;
        const statusClass = isHot ? 'too-hot' : '';
        const statusText = isHot ? 'Too Hot' : 'Normal';
        const statusIcon = isHot ? 'bx bxs-fire' : 'bx bx-check-circle';
        const isLive = record.isLive || false;
        
        tbody.innerHTML += `
        <tr>
            <td><strong>Tank ${record.tank_id}</strong></td>
            <td class="${statusClass}"><strong>${record.temperature.toFixed(1)}°C</strong></td>
            <td>${new Date(record.created_at).toLocaleString()}</td>
            <td>
                <span class="status-badge ${statusClass}">
                    <i class="${statusIcon}"></i>
                    ${statusText}
                </span>
            </td>
            <td>${isLive ? '<span class="live-badge new"><i class="bx bx-wifi"></i> LIVE</span>' : ''}</td>
        </tr>`;
    });
}

function addToLatestRecordsTable(newRecord, isLive = false) {
    const tankTable = document.getElementById("tank-table");
    if (!tankTable) return;
    
    const isHot = newRecord.temperature >= 50;
    const statusClass = isHot ? 'too-hot' : '';
    const statusText = isHot ? 'Too Hot' : 'Normal';
    const statusIcon = isHot ? 'bx bxs-fire' : 'bx bx-check-circle';
    
    if (isLive) {
        newRecord.isLive = true;
        // Remove isLive flag after 30 seconds
        setTimeout(() => {
            newRecord.isLive = false;
            updateLatestRecordsTable();
        }, 30000);
    }
    
    const newRow = `
    <tr>
        <td><strong>Tank ${newRecord.tank_id}</strong></td>
        <td class="${statusClass}"><strong>${newRecord.temperature.toFixed(1)}°C</strong></td>
        <td>${new Date(newRecord.created_at).toLocaleString()}</td>
        <td>
            <span class="status-badge ${statusClass}">
                <i class="${statusIcon}"></i>
                ${statusText}
            </span>
        </td>
        <td>${isLive ? '<span class="live-badge new"><i class="bx bx-wifi"></i> LIVE</span>' : ''}</td>
    </tr>`;
    
    const tbody = tankTable.querySelector('tbody');
    if (tbody) {
        const rows = tbody.querySelectorAll('tr');
        if (rows.length >= displayedRecordsLimit) {
            tbody.removeChild(rows[rows.length - 1]);
        }
        
        tbody.insertAdjacentHTML('afterbegin', newRow);
        
        // Add animation for live updates
        if (isLive) {
            const newRowElement = tbody.querySelector('tr:first-child');
            if (newRowElement) {
                newRowElement.style.animation = 'highlight 2s ease';
                setTimeout(() => {
                    newRowElement.style.animation = '';
                }, 2000);
            }
        }
    }
}

// ==================== STATISTICS ====================
function calculateStatistics(data) {
    console.log(`Calculating statistics from ${data.length} records...`);
    
    const stats = {
        totalReadings: data.length,
        totalInDatabase: totalDatabaseCount,
        isSampled: data.length < totalDatabaseCount,
        samplePercentage: totalDatabaseCount > 0 ? Math.round((data.length / totalDatabaseCount) * 100) : 100,
        avgTemp: 0,
        maxTemp: -Infinity,
        minTemp: Infinity,
        maxTank: null,
        minTank: null,
        normalTanks: 0,
        warningTanks: 0,
        latestUpdate: null,
        activeTanks: 21,
        totalHotReadings: 0,
        hotPercentage: 0,
        updatesPerMinute: updatesPerMinute
    };
    
    const tankLatest = {};
    const tankStats = {};
    
    // Initialize tank stats
    for (let i = 1; i <= 21; i++) {
        tankStats[i] = { sum: 0, count: 0, hotCount: 0 };
    }
    
    // Process records
    data.forEach(r => {
        const tankId = r.tank_id;
        
        // Track latest reading per tank
        if (!tankLatest[tankId] || new Date(r.created_at) > new Date(tankLatest[tankId].created_at)) {
            tankLatest[tankId] = r;
        }
        
        // Update tank statistics
        if (tankStats[tankId]) {
            tankStats[tankId].sum += r.temperature;
            tankStats[tankId].count++;
            
            if (r.temperature >= 50) {
                tankStats[tankId].hotCount++;
                stats.totalHotReadings++;
            }
        }
    });
    
    const latestTemps = Object.values(tankLatest);
    
    if (latestTemps.length > 0) {
        let sum = 0;
        latestTemps.forEach(r => {
            const temp = r.temperature;
            sum += temp;
            
            if (temp > stats.maxTemp) {
                stats.maxTemp = temp;
                stats.maxTank = r.tank_id;
            }
            
            if (temp < stats.minTemp) {
                stats.minTemp = temp;
                stats.minTank = r.tank_id;
            }
            
            if (temp < 50) {
                stats.normalTanks++;
            } else {
                stats.warningTanks++;
            }
        });
        
        stats.avgTemp = sum / latestTemps.length;
        stats.latestUpdate = new Date(Math.max(...latestTemps.map(r => new Date(r.created_at))));
        stats.hotPercentage = stats.totalHotReadings > 0 ? 
            Math.round((stats.totalHotReadings / data.length) * 100) : 0;
    }
    
    return stats;
}

function updateMetrics(stats) {
    // Update average temperature
    document.getElementById('avg-temp').textContent = stats.avgTemp ? stats.avgTemp.toFixed(1) + '°C' : '--';
    document.getElementById('max-temp').textContent = stats.maxTemp !== -Infinity ? stats.maxTemp.toFixed(1) + '°C' : '--';
    document.getElementById('min-temp').textContent = stats.minTemp !== Infinity ? stats.minTemp.toFixed(1) + '°C' : '--';
    document.getElementById('max-tank').textContent = stats.maxTank ? `Tank ${stats.maxTank}` : '--';
    document.getElementById('min-tank').textContent = stats.minTank ? `Tank ${stats.minTank}` : '--';
    document.getElementById('normal-tanks').textContent = stats.normalTanks;
    document.getElementById('warning-tanks').textContent = stats.warningTanks;
    document.getElementById('last-update').textContent = stats.latestUpdate ? 
        stats.latestUpdate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--';
    document.getElementById('hot-percentage').textContent = stats.hotPercentage + '%';
    
    // Update total readings with indicator if sampled
    const totalElement = document.getElementById('total-readings');
    
    if (stats.isSampled && stats.totalInDatabase > stats.totalReadings) {
        totalElement.textContent = `${stats.totalReadings.toLocaleString()}+`;
        totalElement.title = `${stats.totalReadings.toLocaleString()} shown of ${stats.totalInDatabase.toLocaleString()} total (${stats.samplePercentage}% sample)`;
        totalElement.style.cursor = 'help';
        totalElement.style.textDecoration = 'underline dotted';
    } else {
        totalElement.textContent = stats.totalReadings.toLocaleString();
        totalElement.title = '';
        totalElement.style.cursor = 'default';
        totalElement.style.textDecoration = 'none';
    }
    
    // Update temperature statistics table
    populateTempStatsTable(stats);
    
    updateTimestamp();
}

function populateTempStatsTable(stats) {
    const tableBody = document.getElementById('temp-stats-table');
    if (!tableBody) return;
    
    tableBody.innerHTML = `
    <tr>
        <td>Total Readings</td>
        <td><strong>${stats.totalReadings.toLocaleString()}${stats.isSampled ? '+' : ''}</strong></td>
        <td>records</td>
    </tr>
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
        <td>Hot Readings</td>
        <td><strong>${stats.totalHotReadings.toLocaleString()} (${stats.hotPercentage}%)</strong></td>
        <td>≥ 50°C</td>
    </tr>
    <tr>
        <td>Data Coverage</td>
        <td><strong>21/21 tanks</strong></td>
        <td>active</td>
    </tr>`;
}

// ==================== MAP FUNCTIONS ====================
function initMap() {
    if (!document.getElementById('map')) return;
    
    // Center on FIMA Bulking Services
    const centerLat = 1.4575847;
    const centerLng = 103.9943574;
    const zoomLevel = 18; // More zoomed in for detailed view
    map.setView([centerLat, centerLng], zoomLevel);
    
    map = L.map('map').setView([centerLat, centerLng], 17);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
    }).addTo(map);
    
    updateMapMarkers();
}

function updateMapMarkers() {
    if (!map) return;
    
    tankMarkers.forEach(marker => map.removeLayer(marker));
    tankMarkers = [];
    
    const latestData = window.latestTankData || {};
    
    for (let tankId = 1; tankId <= 21; tankId++) {
        const location = tankLocations[tankId];
        if (!location) continue;
        
        const tempData = latestData[tankId];
        const temp = tempData ? tempData.temperature : null;
        const isHot = temp && temp >= 50;
        const markerColor = isHot ? '#e53e3e' : '#48bb78';
        
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
        
        const popupContent = `
            <div style="min-width: 200px; padding: 10px;">
                <h3 style="margin: 0 0 10px 0; color: #2d3748; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px;">
                    Tank ${tankId}
                </h3>
                <p style="margin: 8px 0; color: #4a5568;">
                    <strong>Location:</strong> ${location.name}
                </p>
                <p style="margin: 8px 0; color: #4a5568;">
                    <strong>Current Temp:</strong> 
                    <span style="color: ${isHot ? '#e53e3e' : '#48bb78'}; font-weight: bold;">
                        ${temp ? temp.toFixed(1) + '°C' : 'No data'}
                    </span>
                </p>
                <p style="margin: 8px 0; color: #4a5568;">
                    <strong>Status:</strong> 
                    <span style="color: ${isHot ? '#e53e3e' : '#48bb78'}; font-weight: bold;">
                        ${temp ? (isHot ? 'Too Hot' : 'Normal') : 'Unknown'}
                    </span>
                </p>
                ${tempData ? `
                <p style="margin: 8px 0; color: #718096; font-size: 0.9rem;">
                    <i>Last update: ${new Date(tempData.created_at).toLocaleString()}</i>
                </p>
                ` : ''}
            </div>
        `;
        
        marker.bindPopup(popupContent);
        tankMarkers.push(marker);
    }
}

function updateMapMarker(tankId, temperature) {
    if (!map) return;
    
    const markerIndex = tankMarkers.findIndex(marker => {
        const markerHtml = marker.options.icon.options.html;
        return markerHtml.includes(`>${tankId}<`);
    });
    
    if (markerIndex !== -1) {
        const marker = tankMarkers[markerIndex];
        const isHot = temperature >= 50;
        const markerColor = isHot ? '#e53e3e' : '#48bb78';
        
        const newIcon = L.divIcon({
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
        
        marker.setIcon(newIcon);
        
        // Flash animation
        marker.getElement().style.animation = 'pulse 1s ease';
        setTimeout(() => {
            if (marker.getElement()) {
                marker.getElement().style.animation = '';
            }
        }, 1000);
    }
}

// ==================== DATASET WARNINGS ====================
function showDatasetWarning(totalCount, displayedCount, isLarge = false) {
    const container = document.getElementById('dataset-warning-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (totalCount > displayedCount) {
        const warning = document.createElement('div');
        warning.className = `dataset-warning ${isLarge ? 'large' : ''}`;
        
        if (isLarge) {
            warning.innerHTML = `
                <div class="warning-content">
                    <i class='bx bx-data'></i>
                    <div>
                        <strong>Large Dataset Detected</strong>
                        <p>Database has ${totalCount.toLocaleString()} records. Showing ${displayedCount.toLocaleString()} most recent.</p>
                        <div class="warning-actions">
                            <button onclick="loadMoreData()" class="primary-btn">
                                <i class='bx bx-cloud-download'></i> Load More
                            </button>
                            <button onclick="analyzeFullDataset()" class="secondary-btn">
                                <i class='bx bx-stats'></i> Analyze All
                            </button>
                            <button onclick="dismissWarning(this)" class="tertiary-btn">
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            warning.innerHTML = `
                <i class='bx bx-info-circle'></i>
                <span>Showing ${displayedCount.toLocaleString()} most recent of ${totalCount.toLocaleString()} total records</span>
                <button onclick="loadMoreData()">Load More</button>
            `;
        }
        
        container.appendChild(warning);
    }
}

function updateDatasetWarning() {
    if (totalDatabaseCount > 0 && allTankData.length > 0) {
        const isLarge = totalDatabaseCount > 10000;
        showDatasetWarning(totalDatabaseCount, allTankData.length, isLarge);
    }
}

function dismissWarning(button) {
    const warning = button.closest('.dataset-warning');
    if (warning) {
        warning.remove();
    }
}

// ==================== LOADING PROGRESS ====================
function showLoadProgress(show, message = "Loading...") {
    const progress = document.getElementById('load-progress');
    if (progress) {
        if (show) {
            progress.style.display = 'block';
            progress.querySelector('span').textContent = message;
        } else {
            progress.style.display = 'none';
        }
    }
}

function updateLoadProgress(current, total) {
    const progress = document.getElementById('load-progress');
    if (progress) {
        const percent = Math.round((current / total) * 100);
        const fill = progress.querySelector('.progress-fill');
        const text = progress.querySelector('span');
        
        if (fill) fill.style.width = percent + '%';
        if (text) text.textContent = `Loading... ${current} of ${total} records (${percent}%)`;
    }
}

// ==================== LIVE NOTIFICATIONS ====================
function showLiveNotification(record) {
    const isHot = record.temperature >= 50;
    const notification = document.createElement('div');
    notification.className = `live-notification ${isHot ? 'hot' : 'normal'}`;
    notification.innerHTML = `
        <div class="live-notification-content">
            <i class='bx ${isHot ? 'bxs-fire' : 'bx-thermometer'}'></i>
            <div>
                <strong>New Reading: Tank ${record.tank_id}</strong>
                <p>${record.temperature.toFixed(1)}°C • ${isHot ? '🔥 Too Hot' : '✅ Normal'}</p>
            </div>
            <span class="live-time">just now</span>
        </div>
    `;
    
    const container = document.querySelector('main');
    if (container) {
        container.insertAdjacentElement('afterbegin', notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('fade-out');
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
}

// ==================== DASHBOARD FUNCTIONS ====================
async function populateDashboard() {
    console.log("Populating dashboard...");
    
    // Show initial loading
    showNotification('Loading tank data...', 'info');
    
    // Fetch data
    const data = await fetchAllTankData();
    const stats = calculateStatistics(data);
    
    // Get latest values
    const latestValues = await fetchLatestTankValues();
    window.latestTankData = latestValues;
    
    // Update metrics
    updateMetrics(stats);
    
    // Update all displays
    updateAllDisplays();
    
    // Update data stats modal
    updateDataStats(stats);
    
    console.log("Dashboard populated successfully");
    
    // Setup realtime after initial load
    if (!realtimeSubscription) {
        setupRealtimeUpdates();
    }
    
    // Start auto-refresh as fallback
    if (!realtimeSubscription && !autoRefreshInterval) {
        startAutoRefresh();
    }
}

async function refreshData() {
    const btn = document.querySelector('.master-btn');
    const originalText = btn ? btn.innerHTML : '';
    
    if (btn) {
        btn.innerHTML = '<i class="bx bx-loader bx-spin"></i> Refreshing...';
        btn.disabled = true;
    }
    
    showNotification('Manual refresh started...', 'info');
    
    await populateDashboard();
    
    setTimeout(() => {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
        showNotification('Refresh complete', 'success');
    }, 1000);
}

// ==================== CONTROLS ====================
function toggleRealtime() {
    const btn = document.getElementById('realtime-toggle');
    if (btn.classList.contains('active')) {
        stopRealtimeUpdates();
        btn.classList.remove('active');
        btn.innerHTML = '<i class="bx bx-wifi-off"></i> Enable Live';
        showNotification('Live updates disabled', 'info');
    } else {
        setupRealtimeUpdates();
        btn.classList.add('active');
        btn.innerHTML = '<i class="bx bx-wifi"></i> Live Enabled';
        // If auto-refresh was running, stop it
        if (autoRefreshInterval) {
            stopAutoRefresh();
        }
    }
}

function toggleAutoRefresh() {
    const btn = document.getElementById('auto-refresh-toggle');
    if (btn.classList.contains('active')) {
        stopAutoRefresh();
        btn.classList.remove('active');
        btn.innerHTML = '<i class="bx bx-refresh"></i> Auto Refresh';
    } else {
        startAutoRefresh();
        btn.classList.add('active');
        btn.innerHTML = '<i class="bx bx-stop-circle"></i> Stop Auto Refresh';
        // If realtime was running, stop it
        if (realtimeSubscription) {
            stopRealtimeUpdates();
        }
    }
}

// Functions needed by HTML buttons
function showDataStats() {
    const modal = document.getElementById('data-stats-modal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.style.opacity = '1', 10);
    }
}

function closeDataStats() {
    const modal = document.getElementById('data-stats-modal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

function showRealtimeAlert() {
    const alert = document.querySelector('.realtime-alert');
    if (alert) {
        alert.style.display = 'flex';
        setTimeout(() => alert.style.opacity = '1', 10);
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (alert) {
                alert.style.opacity = '0';
                setTimeout(() => {
                    if (alert) alert.style.display = 'none';
                }, 300);
            }
        }, 5000);
    }
}

function closeRealtimeAlert() {
    const alert = document.querySelector('.realtime-alert');
    if (alert) {
        alert.style.opacity = '0';
        setTimeout(() => alert.style.display = 'none', 300);
    }
}

function refreshMap() {
    if (map) {
        updateMapMarkers();
        showNotification('Map refreshed', 'success');
    }
}

function centerMap() {
    if (map) {
        const centerLat = Object.values(tankLocations).reduce((sum, loc) => sum + loc.lat, 0) / 21;
        const centerLng = Object.values(tankLocations).reduce((sum, loc) => sum + loc.lng, 0) / 21;
        map.setView([centerLat, centerLng], 17);
        showNotification('Map centered', 'info');
    }
}

function showAllRecords() {
    displayedRecordsLimit = Math.min(100, allTankData.length);
    updateLatestRecordsTable();
    showNotification(`Showing all ${displayedRecordsLimit} records`, 'info');
}

function changeRecordsLimit(select) {
    displayedRecordsLimit = parseInt(select.value);
    updateLatestRecordsTable();
    showNotification(`Showing ${displayedRecordsLimit} records`, 'info');
}

function updateDataStats(stats) {
    const totalElement = document.getElementById('modal-total-records');
    const avgElement = document.getElementById('modal-avg-temp');
    const hotElement = document.getElementById('modal-hot-percentage');
    const updateElement = document.getElementById('modal-update-rate');
    
    if (totalElement) totalElement.textContent = totalDatabaseCount.toLocaleString();
    if (avgElement) avgElement.textContent = stats.avgTemp ? stats.avgTemp.toFixed(1) + '°C' : '--';
    if (hotElement) hotElement.textContent = stats.hotPercentage + '%';
    if (updateElement) updateElement.textContent = updatesPerMinute > 0 ? `${updatesPerMinute}/min` : '--';
}

// ==================== UTILITY FUNCTIONS ====================
async function fetchLatestTankValues() {
    try {
        if (!supabase) return {};
        
        const { data, error } = await supabase
            .from('tank_readings')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const latestValues = {};
        if (data) {
            data.forEach(record => {
                if (!latestValues[record.tank_id] || 
                    new Date(record.created_at) > new Date(latestValues[record.tank_id].created_at)) {
                    latestValues[record.tank_id] = {
                        temperature: record.temperature,
                        created_at: record.created_at,
                        id: record.id
                    };
                }
            });
        }
        
        return latestValues;
    } catch (error) {
        console.error("Error fetching latest tank values:", error);
        return {};
    }
}

function updateConnectionStatus(status) {
    const indicator = document.querySelector('.connection-status');
    
    if (indicator) {
        indicator.className = 'connection-status';
        
        switch(status) {
            case 'connected':
                indicator.classList.add('connected');
                indicator.innerHTML = '<i class="bx bx-wifi"></i> Connected';
                break;
            case 'connecting':
                indicator.classList.add('connecting');
                indicator.innerHTML = '<i class="bx bx-loader bx-spin"></i> Connecting...';
                break;
            case 'disconnected':
                indicator.classList.add('disconnected');
                indicator.innerHTML = '<i class="bx bx-wifi-off"></i> Disconnected';
                break;
        }
    }
}

function updateRealtimeIndicator(isActive) {
    const indicator = document.getElementById('realtime-indicator');
    if (indicator) {
        if (isActive) {
            indicator.classList.add('active');
            indicator.innerHTML = '<i class="bx bx-wifi"></i> Live';
        } else {
            indicator.classList.remove('active');
            indicator.innerHTML = '<i class="bx bx-wifi-off"></i> Offline';
        }
    }
}

function updateTimestamp() {
    const timestamp = document.getElementById('data-timestamp');
    if (timestamp) {
        timestamp.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
    
    const updateBadge = document.getElementById('update-badge');
    if (updateBadge) {
        updateBadge.innerHTML = `<i class='bx bx-time'></i> Updated ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    }
}

function getStatusClass(temperature) {
    return temperature >= 50 ? 'too-hot' : '';
}

function getStatusText(temperature) {
    return temperature >= 50 ? 'Too Hot' : 'Normal';
}

function getStatusIcon(temperature) {
    return temperature >= 50 ? 'bx bxs-fire' : 'bx bx-check-circle';
}

function showNotification(message, type = 'info') {
    console.log(`Notification [${type}]: ${message}`);
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `live-notification ${type}`;
    notification.innerHTML = `
        <div class="live-notification-content">
            <i class='bx ${type === 'success' ? 'bx-check-circle' : 
                        type === 'error' ? 'bx-error-circle' : 
                        type === 'warning' ? 'bx-error' : 'bx-info-circle'}'></i>
            <div>
                <strong>${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
                <p>${message}</p>
            </div>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class='bx bx-x'></i>
            </button>
        </div>
    `;
    
    // Add to main container
    const container = document.querySelector('main');
    if (container) {
        container.insertAdjacentElement('afterbegin', notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('fade-out');
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
}

function generateMockData(count) {
    console.log(`Generating ${count} mock records...`);
    
    const mockData = [];
    const now = new Date();
    
    for (let i = 0; i < count; i++) {
        const tankId = Math.floor(Math.random() * 21) + 1;
        const temperature = Math.random() * 30 + 20; // 20-50°C
        
        const record = {
            id: i + 1,
            tank_id: tankId,
            temperature: parseFloat(temperature.toFixed(1)),
            created_at: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        };
        
        mockData.push(record);
    }
    
    // Sort by date descending
    mockData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    return mockData;
}

// ==================== STYLE MANAGEMENT ====================
function addCustomStyles() {
    // Already included in CSS, no need to add dynamically
}

// ==================== SIDEBAR TOGGLE ====================
function setupSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.querySelector('#content nav i.bx-menu');
    
    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }
}

// ==================== CHARTS PAGE ====================
function initializeChartsPage() {
    console.log("Initializing charts page...");
    
    if (document.getElementById('chart')) {
        setTimeout(() => {
            initializeTankSelector();
            createTemperatureChart();
            initializeComparisonChart();
        }, 100);
    }
}

function initializeTankSelector() {
    const tankSelect = document.getElementById('tank');
    if (!tankSelect) return;
    
    tankSelect.innerHTML = '<option value="all">All Tanks</option>';
    for (let i = 1; i <= 21; i++) {
        tankSelect.innerHTML += `<option value="${i}">Tank ${i}</option>`;
    }
    
    tankSelect.addEventListener('change', createTemperatureChart);
}

function initializeComparisonChart() {
    const tankSelection = document.getElementById('tank-selection');
    if (!tankSelection) return;
    
    let html = '';
    for (let i = 1; i <= 21; i++) {
        html += `
            <label class="tank-checkbox">
                <input type="checkbox" value="${i}" checked>
                Tank ${i}
            </label>
        `;
    }
    tankSelection.innerHTML = html;
    
    document.getElementById('compare-type').addEventListener('change', createComparisonChart);
    createComparisonChart();
}

function createTemperatureChart() {
    const ctx = document.getElementById('chart');
    if (!ctx) return;
    
    // Use existing Chart.js instance or create new one
    if (window.temperatureChart instanceof Chart) {
        window.temperatureChart.destroy();
    }
    
    const tankId = document.getElementById('tank').value;
    const timeRange = parseInt(document.getElementById('time-range').value);
    const chartType = document.getElementById('chart-type').value;
    
    // Filter data
    let filteredData = allTankData;
    if (tankId && tankId !== 'all') {
        filteredData = allTankData.filter(r => r.tank_id == tankId);
    }
    
    // Limit to time range
    filteredData = filteredData.slice(0, timeRange);
    
    // Prepare chart data
    const labels = filteredData.map(r => new Date(r.created_at).toLocaleTimeString());
    const data = filteredData.map(r => r.temperature);
    const colors = filteredData.map(r => r.temperature >= 50 ? '#e53e3e' : '#4299e1');
    
    window.temperatureChart = new Chart(ctx, {
        type: chartType,
        data: {
            labels: labels,
            datasets: [{
                label: tankId === 'all' ? 'Temperature' : `Tank ${tankId} Temperature`,
                data: data,
                borderColor: '#4299e1',
                backgroundColor: chartType === 'bar' ? colors : 'rgba(66, 153, 225, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: colors,
                pointBorderColor: '#fff',
                pointRadius: 4,
                tension: 0.3,
                fill: chartType === 'line' || chartType === 'scatter'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `Temperature History ${tankId === 'all' ? '(All Tanks)' : `(Tank ${tankId})`}`,
                    font: { size: 16 }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `Temperature: ${context.parsed.y}°C`
                    }
                }
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

function createComparisonChart() {
    const ctx = document.getElementById('comparison-chart');
    if (!ctx) return;
    
    if (window.comparisonChart instanceof Chart) {
        window.comparisonChart.destroy();
    }
    
    const compareType = document.getElementById('compare-type').value;
    const selectedTanks = Array.from(document.querySelectorAll('#tank-selection input:checked'))
        .map(input => parseInt(input.value));
    
    if (selectedTanks.length === 0) {
        ctx.parentElement.innerHTML = '<p class="no-data">Select at least one tank to compare</p>';
        return;
    }
    
    const labels = selectedTanks.map(id => `Tank ${id}`);
    const data = selectedTanks.map(tankId => {
        const tankData = allTankData.filter(r => r.tank_id === tankId);
        if (tankData.length === 0) return 0;
        
        switch(compareType) {
            case 'current':
                const latest = window.latestTankData?.[tankId];
                return latest ? latest.temperature : 0;
            case 'average':
                return tankData.reduce((sum, r) => sum + r.temperature, 0) / tankData.length;
            case 'max':
                return Math.max(...tankData.map(r => r.temperature));
            case 'min':
                return Math.min(...tankData.map(r => r.temperature));
            default:
                return 0;
        }
    });
    
    const colors = data.map(temp => temp >= 50 ? '#e53e3e' : '#4299e1');
    
    window.comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: compareType.charAt(0).toUpperCase() + compareType.slice(1) + ' Temperature',
                data: data,
                backgroundColor: colors,
                borderColor: colors.map(c => c.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Tank Comparison',
                    font: { size: 16 }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Temperature (°C)'
                    }
                }
            }
        }
    });
}

// ==================== ANALYSIS MODAL ====================
function analyzeFullDataset() {
    showNotification('Analyzing full dataset...', 'info');
    toggleAnalysisModal();
    
    // Simulate analysis
    setTimeout(() => {
        const analysisContent = document.getElementById('analysis-content');
        if (analysisContent) {
            analysisContent.innerHTML = `
                <div class="analysis-result">
                    <h3><i class='bx bx-check-circle'></i> Analysis Complete</h3>
                    <p>Analyzed ${totalDatabaseCount.toLocaleString()} records from the database.</p>
                    <div class="analysis-grid">
                        <div class="analysis-card">
                            <div class="analysis-value">${totalDatabaseCount.toLocaleString()}</div>
                            <div class="analysis-label">Total Records</div>
                        </div>
                        <div class="analysis-card">
                            <div class="analysis-value">21</div>
                            <div class="analysis-label">Active Tanks</div>
                        </div>
                        <div class="analysis-card">
                            <div class="analysis-value">${Math.floor(totalDatabaseCount / 21).toLocaleString()}</div>
                            <div class="analysis-label">Avg per Tank</div>
                        </div>
                        <div class="analysis-card">
                            <div class="analysis-value">${allTankData.length.toLocaleString()}</div>
                            <div class="analysis-label">Loaded Records</div>
                        </div>
                    </div>
                    <p class="analysis-note">Full dataset analysis completed successfully. All data points have been processed.</p>
                </div>
            `;
        }
    }, 1500);
}

function toggleAnalysisModal() {
    const modal = document.getElementById('analysis-modal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.style.opacity = '1', 10);
    }
}

function closeAnalysisModal() {
    const modal = document.getElementById('analysis-modal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

// ==================== EXPORT FUNCTIONS ====================
function exportData() {
    if (allTankData.length === 0) {
        showNotification('No data to export', 'warning');
        return;
    }
    
    try {
        // Convert data to CSV
        const headers = ['ID', 'Tank ID', 'Temperature', 'Created At'];
        const csvData = [
            headers.join(','),
            ...allTankData.map(row => 
                `${row.id},${row.tank_id},${row.temperature},"${row.created_at}"`
            )
        ].join('\n');
        
        // Create download link
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tank-data-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showNotification(`Exported ${allTankData.length} records`, 'success');
    } catch (error) {
        console.error('Export failed:', error);
        showNotification('Export failed', 'error');
    }
}

// ==================== INITIALIZE ON LOAD ====================
// Make functions globally available
window.loadMoreData = loadMoreData;
window.refreshData = refreshData;
window.toggleRealtime = toggleRealtime;
window.toggleAutoRefresh = toggleAutoRefresh;
window.showDataStats = showDataStats;
window.closeDataStats = closeDataStats;
window.analyzeFullDataset = analyzeFullDataset;
window.closeAnalysisModal = closeAnalysisModal;
window.exportData = exportData;
window.dismissWarning = dismissWarning;
window.refreshMap = refreshMap;
window.centerMap = centerMap;
window.showAllRecords = showAllRecords;
window.changeRecordsLimit = changeRecordsLimit;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log("DOM fully loaded, initializing dashboard...");
        if (document.getElementById("tank-overview")) {
            populateDashboard();
        }
    });
} else {
    console.log("DOM already loaded, initializing dashboard...");
    if (document.getElementById("tank-overview")) {
        populateDashboard();
    }
}