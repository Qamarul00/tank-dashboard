// Supabase Configuration
const SUPABASE_URL = 'https://zhjzbvghigeuarxvucob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoanpidmdoaWdldWFyeHZ1Y29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NzAxOTUsImV4cCI6MjA4MDM0NjE5NX0.TF0dz6huz6tPAiXe3pz04Fuafh7dewIVNqWpOzJbm2w';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Chart variables
let temperatureChart = null;

// DOM Elements
const tankSelect = document.getElementById('tank');
const timeRangeSelect = document.getElementById('time-range');
const loadChartBtn = document.getElementById('load-chart');
const retryBtn = document.getElementById('retry-btn');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const chartWrapper = document.getElementById('chart-wrapper');

// Initialize the page
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Initializing temperature chart page...');
    
    try {
        // Load tank list
        await loadTanks();
        
        // Setup event listeners
        setupEventListeners();
        
        // Hide loading state initially
        loadingState.style.display = 'none';
        
        console.log('Page initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize page:', error);
        showError('Failed to initialize: ' + error.message);
    }
});

// Load tanks list
async function loadTanks() {
    try {
        const { data: tanks, error } = await supabase
            .from('tanks')
            .select('id, tank_number, name')
            .order('tank_number');
        
        if (error) throw error;
        
        // Clear existing options
        tankSelect.innerHTML = '<option value="">All Tanks</option>';
        
        // Add tank options
        tanks.forEach(tank => {
            const option = document.createElement('option');
            option.value = tank.id;
            option.textContent = `Tank ${tank.tank_number}${tank.name ? ' - ' + tank.name : ''}`;
            tankSelect.appendChild(option);
        });
        
        console.log('Loaded tanks:', tanks.length);
        
    } catch (error) {
        console.error('Error loading tanks:', error);
        tankSelect.innerHTML = '<option value="">Error loading tanks</option>';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Load chart button
    loadChartBtn.addEventListener('click', loadChartData);
    
    // Retry button
    retryBtn.addEventListener('click', loadChartData);
    
    // Enter key on selects
    tankSelect.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') loadChartData();
    });
    
    timeRangeSelect.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') loadChartData();
    });
}

// Load chart data
async function loadChartData() {
    showLoading();
    hideError();
    
    try {
        // Get selected values
        const selectedTankId = tankSelect.value;
        const limit = parseInt(timeRangeSelect.value) || 50;
        
        // Build query
        let query = supabase
            .from('temperature_readings')
            .select('temperature, created_at, tank_id, tanks(tank_number, name)')
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
        
        hideLoading();
        showChart();
        
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
        
        // Color coding based on temperature
        const temp = reading.temperature;
        if (temp > 50) {
            // High temperature - red
            backgroundColors.push('rgba(255, 99, 132, 0.2)');
            borderColors.push('rgba(255, 99, 132, 1)');
        } else if (temp > 40) {
            // Medium temperature - orange
            backgroundColors.push('rgba(255, 159, 64, 0.2)');
            borderColors.push('rgba(255, 159, 64, 1)');
        } else {
            // Normal temperature - blue
            backgroundColors.push('rgba(54, 162, 235, 0.2)');
            borderColors.push('rgba(54, 162, 235, 1)');
        }
    });
    
    const tankNumber = readings[0]?.tanks?.tank_number || 'Multiple';
    const tankName = readings[0]?.tanks?.name || '';
    const tankLabel = tankSelect.value ? `Tank ${tankNumber}${tankName ? ' - ' + tankName : ''}` : 'All Tanks';
    
    return {
        labels: labels,
        datasets: [{
            label: `${tankLabel} Temperature (°C)`,
            data: temperatures,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: borderColors,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6
        }]
    };
}

// Create or update chart
function updateChart(chartData) {
    const ctx = document.getElementById('chart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (temperatureChart) {
        temperatureChart.destroy();
    }
    
    // Create new chart
    temperatureChart = new Chart(ctx, {
        type: 'line',
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

// Show loading state
function showLoading() {
    loadingState.style.display = 'flex';
    chartWrapper.style.display = 'none';
    errorState.style.display = 'none';
}

// Hide loading state
function hideLoading() {
    loadingState.style.display = 'none';
}

// Show chart
function showChart() {
    chartWrapper.style.display = 'block';
}

// Show error state
function showError(message) {
    loadingState.style.display = 'none';
    chartWrapper.style.display = 'none';
    errorState.style.display = 'flex';
    document.getElementById('error-message').textContent = message;
}

// Hide error state
function hideError() {
    errorState.style.display = 'none';
}

// Show "no data" message
function showNoData() {
    hideLoading();
    showError('No temperature data available for the selected tank and time range.');
}

// Test Supabase connection (optional, can be called from console)
window.testSupabaseConnection = async function() {
    try {
        console.log('Testing Supabase connection...');
        
        const { data, error } = await supabase
            .from('temperature_readings')
            .select('count')
            .limit(1);
        
        if (error) throw error;
        
        console.log('✓ Supabase connection successful');
        console.log('Data sample:', data);
        
        return true;
    } catch (error) {
        console.error('✗ Supabase connection failed:', error);
        return false;
    }
};