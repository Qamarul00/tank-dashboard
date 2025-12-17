// Supabase Configuration chart-script.js
const SUPABASE_URL = 'https://zhjzbvghigeuarxvucob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoanpidmdoaWdldWFyeHZ1Y29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NzAxOTUsImV4cCI6MjA4MDM0NjE5NX0.TF0dz6huz6tPAiXe3pz04Fuafh7dewIVNqWpOzJbm2w';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Chart variables
let temperatureChart = null;
let distributionChart = null;
let hourlyChart = null;
let comparisonChart = null;
let autoRefresh = false;
let autoRefreshInterval = null;

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
    tankSelect: document.getElementById('tank'),
    timeRangeSelect: document.getElementById('time-range'),
    chartTypeSelect: document.getElementById('chart-type'),
    colorSchemeSelect: document.getElementById('color-scheme'),
    smoothingSlider: document.getElementById('smoothing'),
    smoothingValue: document.getElementById('smoothing-value'),
    showPointsCheckbox: document.getElementById('show-points'),
    loadChartBtn: document.getElementById('load-chart'),
    retryBtn: document.getElementById('retry-btn'),
    autoRefreshBtn: document.getElementById('auto-refresh'),
    loadingState: document.getElementById('loading-state'),
    errorState: document.getElementById('error-state'),
    chartWrapper: document.getElementById('chart-wrapper'),
    chartCanvas: document.getElementById('chart'),
    chartDataInfo: document.getElementById('chart-data-info'),
    dataCount: document.getElementById('data-count'),
    statAvg: document.getElementById('stat-avg'),
    statMax: document.getElementById('stat-max'),
    statMin: document.getElementById('stat-min'),
    statStd: document.getElementById('stat-std')
};

// Initialize the page
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Initializing temperature chart page...');
    
    // Update current time
    updateChartTime();
    setInterval(updateChartTime, 1000);
    
    try {
        // Load tank list
        await loadTanks();
        
        // Setup event listeners
        setupEventListeners();
        
        // Hide loading state initially
        if (elements.loadingState) {
            elements.loadingState.style.display = 'none';
        }
        
        // Load initial chart data
        await loadChartData();
        
        console.log('Chart page initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize page:', error);
        showError('Failed to initialize: ' + error.message);
    }
});

// Update chart time
function updateChartTime() {
    const timeElement = document.getElementById('chart-time');
    if (timeElement) {
        timeElement.textContent = new Date().toLocaleTimeString();
    }
}

// Load tanks list - hanya Tank 1-21
async function loadTanks() {
    try {
        if (!elements.tankSelect) return;
        
        // Generate tank data - Tank 1-21 sahaja
        const tanks = generateTankData();
        
        // Clear existing options
        elements.tankSelect.innerHTML = '<option value="">All Tanks</option>';
        
        // Add tank options
        if (tanks && tanks.length > 0) {
            tanks.forEach(tank => {
                const option = document.createElement('option');
                option.value = tank.id;
                option.textContent = `Tank ${tank.tank_number}`;
                elements.tankSelect.appendChild(option);
            });
            
            console.log('Generated tanks:', tanks.length);
        } else {
            elements.tankSelect.innerHTML = '<option value="">No tanks configured</option>';
        }
        
    } catch (error) {
        console.error('Error loading tanks:', error);
        if (elements.tankSelect) {
            elements.tankSelect.innerHTML = '<option value="">Error loading tanks</option>';
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    // Load chart button
    if (elements.loadChartBtn) {
        elements.loadChartBtn.addEventListener('click', loadChartData);
    }
    
    // Retry button
    if (elements.retryBtn) {
        elements.retryBtn.addEventListener('click', loadChartData);
    }
    
    // Auto refresh button
    if (elements.autoRefreshBtn) {
        elements.autoRefreshBtn.addEventListener('click', toggleAutoRefresh);
    }
    
    // Smoothing slider
    if (elements.smoothingSlider) {
        elements.smoothingSlider.addEventListener('input', function() {
            if (elements.smoothingValue) {
                elements.smoothingValue.textContent = this.value;
            }
            if (temperatureChart) {
                updateChartSmoothing(this.value);
            }
        });
    }
    
    // Show points checkbox
    if (elements.showPointsCheckbox) {
        elements.showPointsCheckbox.addEventListener('change', function() {
            if (temperatureChart) {
                updateChartPoints(this.checked);
            }
        });
    }
    
    // Chart type change
    if (elements.chartTypeSelect) {
        elements.chartTypeSelect.addEventListener('change', function() {
            if (temperatureChart) {
                updateChartType(this.value);
            }
        });
    }
    
    // Color scheme change
    if (elements.colorSchemeSelect) {
        elements.colorSchemeSelect.addEventListener('change', function() {
            if (temperatureChart) {
                updateColorScheme(this.value);
            }
        });
    }
    
    // Export chart buttons
    document.querySelectorAll('.export-option').forEach(btn => {
        btn.addEventListener('click', function() {
            exportChartData(this.dataset.format);
        });
    });
    
    // Chart action buttons
    document.getElementById('export-chart')?.addEventListener('click', exportChartImage);
    document.getElementById('toggle-grid')?.addEventListener('click', toggleChartGrid);
    document.getElementById('reset-zoom')?.addEventListener('click', resetChartZoom);
    
    // Enter key support
    if (elements.tankSelect) {
        elements.tankSelect.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') loadChartData();
        });
    }
    
    if (elements.timeRangeSelect) {
        elements.timeRangeSelect.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') loadChartData();
        });
    }
}

// Load chart data from tank_readings table
async function loadChartData() {
    if (!elements.loadingState || !elements.errorState || !elements.chartWrapper) return;
    
    showLoading();
    hideError();
    
    try {
        // Get selected values
        const selectedTankId = elements.tankSelect ? elements.tankSelect.value : '';
        const limit = elements.timeRangeSelect ? parseInt(elements.timeRangeSelect.value) || 50 : 50;
        
        // Build query for tank_readings table
        let query = supabase
            .from('tank_readings')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
        
        // Filter by tank if selected
        if (selectedTankId) {
            query = query.eq('tank_id', selectedTankId);
        }
        
        const { data: readings, error } = await query;
        
        if (error) throw error;
        
        // Reverse to show chronological order (oldest to newest)
        readings.reverse();
        
        if (!readings || readings.length === 0) {
            showNoData();
            return;
        }
        
        // Process data for chart
        const chartData = processChartData(readings);
        
        // Create or update chart
        updateChart(chartData);
        
        // Update statistics
        updateStatistics(readings);
        
        // Update additional charts
        updateAdditionalCharts(readings);
        
        hideLoading();
        showChart();
        
        // Update chart info
        updateChartInfo(readings);
        
        console.log('Chart loaded successfully with', readings.length, 'readings');
        
    } catch (error) {
        console.error('Error loading chart data:', error);
        showError('Failed to load temperature data: ' + error.message);
    }
}

// Process data for Chart.js
function processChartData(readings) {
    const labels = [];
    const temperatures = [];
    const backgroundColors = [];
    const borderColors = [];
    
    readings.forEach(reading => {
        const date = new Date(reading.created_at);
        
        // Format time label
        const timeLabel = date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
        
        const dateLabel = date.toLocaleDateString();
        const label = `${dateLabel} ${timeLabel}`;
        
        labels.push(label);
        temperatures.push(reading.temperature);
        
        // Get color scheme
        const colorScheme = elements.colorSchemeSelect?.value || 'default';
        const colors = getColorsForTemperature(reading.temperature, colorScheme);
        
        backgroundColors.push(colors.background);
        borderColors.push(colors.border);
    });
    
    const selectedTankId = elements.tankSelect ? elements.tankSelect.value : '';
    let tankLabel = 'All Tanks';
    
    if (selectedTankId) {
        tankLabel = `Tank ${selectedTankId}`;
    }
    
    return {
        labels: labels,
        datasets: [{
            label: `${tankLabel} Temperature (°C)`,
            data: temperatures,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 2,
            fill: true,
            tension: parseFloat(elements.smoothingSlider?.value || 0.4),
            pointBackgroundColor: borderColors,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: elements.showPointsCheckbox?.checked ? 4 : 0,
            pointHoverRadius: 6
        }]
    };
}

// Get colors based on temperature and scheme
function getColorsForTemperature(temp, scheme = 'default') {
    switch(scheme) {
        case 'mono':
            return {
                background: 'rgba(100, 100, 100, 0.2)',
                border: 'rgba(100, 100, 100, 1)'
            };
            
        case 'gradient':
            const hue = Math.max(0, Math.min(240, 240 - (temp * 4))); // Blue (cold) to Red (hot)
            return {
                background: `hsla(${hue}, 100%, 50%, 0.2)`,
                border: `hsl(${hue}, 100%, 50%)`
            };
            
        case 'rainbow':
            const rainbowHue = (temp * 7.2) % 360; // Temperature mapped to hue
            return {
                background: `hsla(${rainbowHue}, 100%, 50%, 0.2)`,
                border: `hsl(${rainbowHue}, 100%, 50%)`
            };
            
        default: // default - temperature based
            if (temp > 50) {
                return {
                    background: 'rgba(255, 99, 132, 0.2)',
                    border: 'rgba(255, 99, 132, 1)'
                };
            } else if (temp > 40) {
                return {
                    background: 'rgba(255, 159, 64, 0.2)',
                    border: 'rgba(255, 159, 64, 1)'
                };
            } else {
                return {
                    background: 'rgba(54, 162, 235, 0.2)',
                    border: 'rgba(54, 162, 235, 1)'
                };
            }
    }
}

// Create or update chart
function updateChart(chartData) {
    if (!elements.chartCanvas) return;
    
    const ctx = elements.chartCanvas.getContext('2d');
    
    // Get chart type
    const chartType = elements.chartTypeSelect?.value || 'line';
    
    // Destroy existing chart if it exists
    if (temperatureChart) {
        temperatureChart.destroy();
    }
    
    // Create new chart
    temperatureChart = new Chart(ctx, {
        type: chartType,
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 14
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `Temperature: ${context.parsed.y}°C`;
                        },
                        title: function(tooltipItems) {
                            return tooltipItems[0].label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Temperature (°C)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        font: {
                            size: 12
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
                    },
                    ticks: {
                        font: {
                            size: 12
                        },
                        maxTicksLimit: 10,
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'nearest'
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
}

// Update chart statistics
function updateStatistics(readings) {
    if (readings.length === 0) {
        if (elements.statAvg) elements.statAvg.textContent = '--°C';
        if (elements.statMax) elements.statMax.textContent = '--°C';
        if (elements.statMin) elements.statMin.textContent = '--°C';
        if (elements.statStd) elements.statStd.textContent = '--';
        return;
    }
    
    const temperatures = readings.map(r => r.temperature);
    const avg = temperatures.reduce((a, b) => a + b, 0) / temperatures.length;
    const max = Math.max(...temperatures);
    const min = Math.min(...temperatures);
    const variance = temperatures.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / temperatures.length;
    const stdDev = Math.sqrt(variance);
    
    if (elements.statAvg) elements.statAvg.textContent = `${avg.toFixed(1)}°C`;
    if (elements.statMax) elements.statMax.textContent = `${max.toFixed(1)}°C`;
    if (elements.statMin) elements.statMin.textContent = `${min.toFixed(1)}°C`;
    if (elements.statStd) elements.statStd.textContent = stdDev.toFixed(2);
}

// Update additional charts
function updateAdditionalCharts(readings) {
    if (readings.length === 0) {
        // Clear additional charts if no data
        clearAdditionalCharts();
        return;
    }
    
    // Temperature distribution chart
    createDistributionChart(readings);
    
    // Hourly averages chart
    createHourlyChart(readings);
    
    // Tank comparison chart (if multiple tanks)
    createComparisonChart(readings);
}

// Clear additional charts
function clearAdditionalCharts() {
    const distributionCtx = document.getElementById('distribution-chart');
    const hourlyCtx = document.getElementById('hourly-chart');
    const comparisonCtx = document.getElementById('comparison-chart');
    
    if (distributionChart) distributionChart.destroy();
    if (hourlyChart) hourlyChart.destroy();
    if (comparisonChart) comparisonChart.destroy();
    
    // Clear canvas with "no data" message
    if (distributionCtx) {
        const ctx = distributionCtx.getContext('2d');
        ctx.clearRect(0, 0, distributionCtx.width, distributionCtx.height);
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, distributionCtx.width, distributionCtx.height);
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.font = '14px Arial';
        ctx.fillText('No data available', distributionCtx.width / 2, distributionCtx.height / 2);
    }
    
    if (hourlyCtx) {
        const ctx = hourlyCtx.getContext('2d');
        ctx.clearRect(0, 0, hourlyCtx.width, hourlyCtx.height);
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, hourlyCtx.width, hourlyCtx.height);
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.font = '14px Arial';
        ctx.fillText('No data available', hourlyCtx.width / 2, hourlyCtx.height / 2);
    }
    
    if (comparisonCtx) {
        const ctx = comparisonCtx.getContext('2d');
        ctx.clearRect(0, 0, comparisonCtx.width, comparisonCtx.height);
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, comparisonCtx.width, comparisonCtx.height);
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.font = '14px Arial';
        ctx.fillText('Select "All Tanks" to see comparison', comparisonCtx.width / 2, comparisonCtx.height / 2);
    }
}

// Create distribution chart
function createDistributionChart(readings) {
    const ctx = document.getElementById('distribution-chart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (distributionChart) {
        distributionChart.destroy();
    }
    
    // Create temperature ranges
    const ranges = [
        { min: 0, max: 20, label: '0-20°C' },
        { min: 20, max: 30, label: '20-30°C' },
        { min: 30, max: 40, label: '30-40°C' },
        { min: 40, max: 50, label: '40-50°C' },
        { min: 50, max: 60, label: '50-60°C' },
        { min: 60, max: 100, label: '60+°C' }
    ];
    
    const counts = ranges.map(range => 
        readings.filter(r => r.temperature >= range.min && r.temperature < range.max).length
    );
    
    distributionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ranges.map(r => r.label),
            datasets: [{
                label: 'Count',
                data: counts,
                backgroundColor: [
                    'rgba(54, 162, 235, 0.5)',
                    'rgba(75, 192, 192, 0.5)',
                    'rgba(255, 205, 86, 0.5)',
                    'rgba(255, 159, 64, 0.5)',
                    'rgba(255, 99, 132, 0.5)',
                    'rgba(153, 102, 255, 0.5)'
                ],
                borderColor: [
                    'rgb(54, 162, 235)',
                    'rgb(75, 192, 192)',
                    'rgb(255, 205, 86)',
                    'rgb(255, 159, 64)',
                    'rgb(255, 99, 132)',
                    'rgb(153, 102, 255)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Count'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Temperature Range'
                    }
                }
            }
        }
    });
}

// Create hourly chart
function createHourlyChart(readings) {
    const ctx = document.getElementById('hourly-chart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (hourlyChart) {
        hourlyChart.destroy();
    }
    
    // Group by hour
    const hourlyData = {};
    readings.forEach(r => {
        const date = new Date(r.created_at);
        const hour = date.getHours();
        if (!hourlyData[hour]) {
            hourlyData[hour] = { sum: 0, count: 0 };
        }
        hourlyData[hour].sum += r.temperature;
        hourlyData[hour].count += 1;
    });
    
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const averages = hours.map(hour => {
        if (hourlyData[hour]) {
            return hourlyData[hour].sum / hourlyData[hour].count;
        }
        return null;
    });
    
    hourlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hours.map(h => `${h}:00`),
            datasets: [{
                label: 'Average Temperature',
                data: averages,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
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
                        text: 'Hour of Day'
                    }
                }
            }
        }
    });
}

// Create comparison chart
function createComparisonChart(readings) {
    const ctx = document.getElementById('comparison-chart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (comparisonChart) {
        comparisonChart.destroy();
    }
    
    // Group by tank if multiple tanks
    const tankGroups = {};
    readings.forEach(r => {
        const tankId = r.tank_id;
        if (!tankGroups[tankId]) {
            tankGroups[tankId] = {
                tank_id: tankId,
                temperatures: []
            };
        }
        tankGroups[tankId].temperatures.push(r.temperature);
    });
    
    const tankIds = Object.keys(tankGroups);
    if (tankIds.length <= 1) {
        // Show message instead of chart
        ctx.parentElement.innerHTML = '<p class="no-comparison">Select "All Tanks" to see tank comparison</p>';
        return;
    }
    
    // Calculate averages for each tank
    const tankLabels = [];
    const tankAverages = [];
    
    Object.values(tankGroups).forEach(group => {
        if (group.temperatures.length > 0) {
            const avg = group.temperatures.reduce((a, b) => a + b, 0) / group.temperatures.length;
            tankLabels.push(`Tank ${group.tank_id}`);
            tankAverages.push(avg);
        }
    });
    
    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: tankLabels,
            datasets: [{
                label: 'Average Temperature',
                data: tankAverages,
                backgroundColor: tankAverages.map(temp => 
                    temp > 50 ? 'rgba(255, 99, 132, 0.5)' :
                    temp > 40 ? 'rgba(255, 159, 64, 0.5)' :
                    'rgba(54, 162, 235, 0.5)'
                ),
                borderColor: tankAverages.map(temp => 
                    temp > 50 ? 'rgb(255, 99, 132)' :
                    temp > 40 ? 'rgb(255, 159, 64)' :
                    'rgb(54, 162, 235)'
                ),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Temperature (°C)'
                    }
                }
            }
        }
    });
}

// Update chart info
function updateChartInfo(readings) {
    if (!elements.chartDataInfo || !elements.dataCount) return;
    
    const selectedTankId = elements.tankSelect?.value;
    
    let info = 'All Tanks';
    if (selectedTankId) {
        info = `Tank ${selectedTankId}`;
    }
    
    info += ` | ${readings.length} readings`;
    
    elements.chartDataInfo.textContent = info;
    elements.dataCount.textContent = `${readings.length} data points`;
}

// Update chart smoothing
function updateChartSmoothing(value) {
    if (temperatureChart) {
        temperatureChart.data.datasets[0].tension = parseFloat(value);
        temperatureChart.update();
    }
}

// Update chart points visibility
function updateChartPoints(show) {
    if (temperatureChart) {
        temperatureChart.data.datasets[0].pointRadius = show ? 4 : 0;
        temperatureChart.update();
    }
}

// Update chart type
function updateChartType(type) {
    if (temperatureChart) {
        temperatureChart.config.type = type;
        temperatureChart.update();
    }
}

// Update color scheme
function updateColorScheme(scheme) {
    if (temperatureChart && temperatureChart.data.datasets[0].data.length > 0) {
        const temperatures = temperatureChart.data.datasets[0].data;
        const newBackgrounds = [];
        const newBorders = [];
        
        temperatures.forEach(temp => {
            const colors = getColorsForTemperature(temp, scheme);
            newBackgrounds.push(colors.background);
            newBorders.push(colors.border);
        });
        
        temperatureChart.data.datasets[0].backgroundColor = newBackgrounds;
        temperatureChart.data.datasets[0].borderColor = newBorders;
        temperatureChart.data.datasets[0].pointBackgroundColor = newBorders;
        temperatureChart.update();
    }
}

// Toggle auto refresh
function toggleAutoRefresh() {
    autoRefresh = !autoRefresh;
    const btn = elements.autoRefreshBtn;
    
    if (autoRefresh) {
        btn.classList.add('active');
        btn.querySelector('span').textContent = 'Auto Refresh (30s)';
        startAutoRefresh();
    } else {
        btn.classList.remove('active');
        btn.querySelector('span').textContent = 'Auto Refresh';
        stopAutoRefresh();
    }
}

// Start auto refresh
function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    autoRefreshInterval = setInterval(loadChartData, 30000); // 30 seconds
}

// Stop auto refresh
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Export chart image
function exportChartImage() {
    if (!temperatureChart) {
        alert('No chart to export');
        return;
    }
    
    const link = document.createElement('a');
    link.download = `temperature-chart-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = temperatureChart.toBase64Image();
    link.click();
}

// Export chart data
function exportChartData(format) {
    if (!temperatureChart || !temperatureChart.data.labels) {
        alert('No data to export');
        return;
    }
    
    const labels = temperatureChart.data.labels;
    const data = temperatureChart.data.datasets[0].data;
    const tankLabel = temperatureChart.data.datasets[0].label;
    
    let content, mimeType, extension;
    
    switch(format) {
        case 'csv':
            content = ['Date Time,Temperature (°C)'].concat(
                labels.map((label, i) => `${label},${data[i]}`)
            ).join('\n');
            mimeType = 'text/csv';
            extension = 'csv';
            break;
            
        case 'json':
            content = JSON.stringify({
                chart: tankLabel,
                data: labels.map((label, i) => ({
                    timestamp: label,
                    temperature: data[i]
                }))
            }, null, 2);
            mimeType = 'application/json';
            extension = 'json';
            break;
            
        case 'png':
            exportChartImage();
            return;
            
        case 'pdf':
            alert('PDF export requires additional libraries. Use PNG export instead.');
            return;
            
        default:
            return;
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `temperature-data-${new Date().toISOString().slice(0, 10)}.${extension}`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Toggle chart grid
function toggleChartGrid() {
    if (!temperatureChart) return;
    
    const xGrid = temperatureChart.options.scales.x.grid;
    const yGrid = temperatureChart.options.scales.y.grid;
    
    const isVisible = xGrid.display !== false;
    
    xGrid.display = !isVisible;
    yGrid.display = !isVisible;
    
    temperatureChart.update();
}

// Reset chart zoom
function resetChartZoom() {
    if (temperatureChart && temperatureChart.resetZoom) {
        temperatureChart.resetZoom();
    }
}

// Show loading state
function showLoading() {
    if (elements.loadingState) elements.loadingState.style.display = 'flex';
    if (elements.chartWrapper) elements.chartWrapper.style.display = 'none';
    if (elements.errorState) elements.errorState.style.display = 'none';
}

// Hide loading state
function hideLoading() {
    if (elements.loadingState) elements.loadingState.style.display = 'none';
}

// Show chart
function showChart() {
    if (elements.chartWrapper) elements.chartWrapper.style.display = 'block';
}

// Show error state
function showError(message) {
    if (elements.loadingState) elements.loadingState.style.display = 'none';
    if (elements.chartWrapper) elements.chartWrapper.style.display = 'none';
    if (elements.errorState) {
        elements.errorState.style.display = 'flex';
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
            errorMessage.textContent = message;
        }
    }
}

// Hide error state
function hideError() {
    if (elements.errorState) elements.errorState.style.display = 'none';
}

// Show "no data" message
function showNoData() {
    hideLoading();
    showError('No temperature data available for the selected tank and time range.');
}

// Format date time for display
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

// Global functions for HTML onclick
window.toggleAutoRefresh = toggleAutoRefresh;
window.exportChartImage = exportChartImage;
window.toggleChartGrid = toggleChartGrid;
window.resetChartZoom = resetChartZoom;
window.exportChartData = exportChartData;

// Test connection
window.testChartConnection = async function() {
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