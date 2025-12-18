// Temperature Chart Script - Simplified version
// Uses centralized Supabase configuration

(function() {
    // Chart variables
    let temperatureChart = null;
    let distributionChart = null;
    let hourlyChart = null;
    let comparisonChart = null;
    let autoRefresh = false;
    let autoRefreshInterval = null;

    // Tank configuration
    const TANK_CONFIG = {
        totalTanks: 21
    };

    // Generate tank data
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
    function initChartPage() {
        console.log('📊 Initializing temperature chart page...');
        
        // Update current time
        updateChartTime();
        setInterval(updateChartTime, 1000);
        
        try {
            // Load tank list
            loadTanks();
            
            // Setup event listeners
            setupEventListeners();
            
            // Hide loading state initially
            if (elements.loadingState) {
                elements.loadingState.style.display = 'none';
            }
            
            // Load initial chart data
            setTimeout(() => {
                loadChartData().catch(error => {
                    console.error('Failed to load initial chart:', error);
                    showError('Failed to load chart: ' + error.message);
                });
            }, 500);
            
            console.log('✅ Chart page initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize chart page:', error);
            showError('Failed to initialize: ' + error.message);
        }
    }

    // Update chart time
    function updateChartTime() {
        const timeElement = document.getElementById('chart-time');
        if (timeElement) {
            const now = new Date();
            timeElement.textContent = now.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
    }

    // Load tanks list
    function loadTanks() {
        try {
            if (!elements.tankSelect) return;
            
            // Generate tank data
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
                
                console.log(`Loaded ${tanks.length} tanks`);
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
            elements.loadChartBtn.addEventListener('click', () => {
                loadChartData().catch(console.error);
            });
        }
        
        // Retry button
        if (elements.retryBtn) {
            elements.retryBtn.addEventListener('click', () => {
                loadChartData().catch(console.error);
            });
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
        const exportChartBtn = document.getElementById('export-chart');
        const toggleGridBtn = document.getElementById('toggle-grid');
        const resetZoomBtn = document.getElementById('reset-zoom');
        
        if (exportChartBtn) exportChartBtn.addEventListener('click', exportChartImage);
        if (toggleGridBtn) toggleGridBtn.addEventListener('click', toggleChartGrid);
        if (resetZoomBtn) resetZoomBtn.addEventListener('click', resetChartZoom);
        
        // Enter key support
        if (elements.tankSelect) {
            elements.tankSelect.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') loadChartData().catch(console.error);
            });
        }
        
        if (elements.timeRangeSelect) {
            elements.timeRangeSelect.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') loadChartData().catch(console.error);
            });
        }
    }

    // Load chart data
    async function loadChartData() {
        if (!elements.loadingState || !elements.errorState || !elements.chartWrapper) return;
        
        showLoading();
        hideError();
        
        try {
            // Get selected values
            const selectedTankId = elements.tankSelect ? elements.tankSelect.value : '';
            const limit = elements.timeRangeSelect ? parseInt(elements.timeRangeSelect.value) || 50 : 50;
            
            // Check Supabase client
            if (!window.supabaseClient) {
                throw new Error('Supabase client not initialized');
            }
            
            // Build query
            let query = window.supabaseClient
                .from('tank_readings')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
            
            // Filter by tank if selected
            if (selectedTankId) {
                query = query.eq('tank_id', selectedTankId);
            }
            
            const { data: readings, error } = await query;
            
            if (error) {
                throw new Error('Database error: ' + error.message);
            }
            
            // Check if we have data
            if (!readings || readings.length === 0) {
                showNoData();
                return;
            }
            
            // Reverse to show chronological order
            readings.reverse();
            
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
            
            console.log('✅ Chart loaded with', readings.length, 'readings');
            
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
                second: '2-digit',
                hour12: false
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

    // Get colors based on temperature
    function getColorsForTemperature(temp, scheme = 'default') {
        switch(scheme) {
            case 'mono':
                return {
                    background: 'rgba(100, 100, 100, 0.2)',
                    border: 'rgba(100, 100, 100, 1)'
                };
                
            case 'gradient':
                const hue = Math.max(0, Math.min(240, 240 - (temp * 4)));
                return {
                    background: `hsla(${hue}, 100%, 50%, 0.2)`,
                    border: `hsl(${hue}, 100%, 50%)`
                };
                
            case 'rainbow':
                const rainbowHue = (temp * 7.2) % 360;
                return {
                    background: `hsla(${rainbowHue}, 100%, 50%, 0.2)`,
                    border: `hsl(${rainbowHue}, 100%, 50%)`
                };
                
            default: // temperature based
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
        if (!readings || readings.length === 0) {
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
        if (!readings || readings.length === 0) {
            clearAdditionalCharts();
            return;
        }
        
        // Create distribution chart
        const distCtx = document.getElementById('distribution-chart')?.getContext('2d');
        if (distCtx) {
            createDistributionChart(readings);
        }
        
        // Create hourly chart
        const hourlyCtx = document.getElementById('hourly-chart')?.getContext('2d');
        if (hourlyCtx) {
            createHourlyChart(readings);
        }
        
        // Create comparison chart
        const compCtx = document.getElementById('comparison-chart')?.getContext('2d');
        if (compCtx) {
            createComparisonChart(readings);
        }
    }

    // Clear additional charts
    function clearAdditionalCharts() {
        // Destroy existing charts
        if (distributionChart) distributionChart.destroy();
        if (hourlyChart) hourlyChart.destroy();
        if (comparisonChart) comparisonChart.destroy();
        
        // Clear canvas
        const canvases = ['distribution-chart', 'hourly-chart', 'comparison-chart'];
        canvases.forEach(id => {
            const canvas = document.getElementById(id);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#f5f5f5';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#666';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
            }
        });
    }

    // Create distribution chart
    function createDistributionChart(readings) {
        const ctx = document.getElementById('distribution-chart')?.getContext('2d');
        if (!ctx) return;
        
        if (distributionChart) {
            distributionChart.destroy();
        }
        
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
                }
            }
        });
    }

    // Create hourly chart
    function createHourlyChart(readings) {
        const ctx = document.getElementById('hourly-chart')?.getContext('2d');
        if (!ctx) return;
        
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
                }
            }
        });
    }

    // Create comparison chart
    function createComparisonChart(readings) {
        const ctx = document.getElementById('comparison-chart')?.getContext('2d');
        if (!ctx) return;
        
        if (comparisonChart) {
            comparisonChart.destroy();
        }
        
        // Group by tank
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
            // Show message
            ctx.fillStyle = '#f5f5f5';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.font = '14px Arial';
            ctx.fillText('Select "All Tanks" to see comparison', ctx.canvas.width / 2, ctx.canvas.height / 2);
            return;
        }
        
        // Calculate averages
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

    // Update chart points
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
        
        if (!btn) return;
        
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
        
        autoRefreshInterval = setInterval(() => {
            loadChartData().catch(console.error);
        }, 30000);
        
        console.log('✅ Chart auto-refresh started');
    }

    // Stop auto refresh
    function stopAutoRefresh() {
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
            console.log('✅ Chart auto-refresh stopped');
        }
    }

    // Export chart image
    window.exportChartImage = function() {
        if (!temperatureChart) {
            alert('No chart to export');
            return;
        }
        
        const link = document.createElement('a');
        link.download = `temperature-chart-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = temperatureChart.toBase64Image();
        link.click();
    };

    // Export chart data
    window.exportChartData = function(format) {
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
    };

    // Toggle chart grid
    window.toggleChartGrid = function() {
        if (!temperatureChart) return;
        
        const xGrid = temperatureChart.options.scales.x.grid;
        const yGrid = temperatureChart.options.scales.y.grid;
        
        const isVisible = xGrid.display !== false;
        
        xGrid.display = !isVisible;
        yGrid.display = !isVisible;
        
        temperatureChart.update();
    };

    // Reset chart zoom
    window.resetChartZoom = function() {
        if (temperatureChart && temperatureChart.resetZoom) {
            temperatureChart.resetZoom();
        }
    };

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
        console.error('Chart error:', message);
        
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

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        // Check if we're on the chart page
        if (document.querySelector('[href="chart.html"]')) {
            setTimeout(initChartPage, 100);
        }
    });

})();