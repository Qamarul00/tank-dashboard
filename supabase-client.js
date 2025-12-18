// Supabase Configuration File
// Centralized configuration for all Supabase connections

const SUPABASE_CONFIG = {
    url: 'https://zhjzbvghigeuarxvucob.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoanpidmdoaWdldWFyeHZ1Y29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NzAxOTUsImV4cCI6MjA4MDM0NjE5NX0.TF0dz6huz6tPAiXe3pz04Fuafh7dewIVNqWpOzJbm2w',
    
    // Initialize Supabase client
    initClient: function() {
        if (!window.supabase) {
            console.error('Supabase library not loaded');
            return null;
        }
        
        try {
            const client = window.supabase.createClient(this.url, this.key);
            console.log('Supabase client initialized successfully');
            return client;
        } catch (error) {
            console.error('Failed to initialize Supabase client:', error);
            return null;
        }
    },
    
    // Test connection
    testConnection: async function() {
        try {
            const client = this.initClient();
            if (!client) return false;
            
            console.log('Testing Supabase connection...');
            const { data, error } = await client
                .from('tank_readings')
                .select('count')
                .limit(1);
            
            if (error) {
                console.error('Connection test failed:', error);
                return false;
            }
            
            console.log('✓ Supabase connection successful');
            return true;
        } catch (error) {
            console.error('Connection test error:', error);
            return false;
        }
    },
    
    // Get table names
    tables: {
        readings: 'tank_readings',
        // Add other tables here if needed
    },
    
    // Common queries
    queries: {
        getLatestReadings: function(limit = 100) {
            return supabaseClient
                .from('tank_readings')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
        },
        
        getTankReadings: function(tankId, limit = 100) {
            return supabaseClient
                .from('tank_readings')
                .select('*')
                .eq('tank_id', tankId)
                .order('created_at', { ascending: false })
                .limit(limit);
        },
        
        getReadingsByTimeRange: function(hours = 24) {
            const pastTime = new Date();
            pastTime.setHours(pastTime.getHours() - hours);
            
            return supabaseClient
                .from('tank_readings')
                .select('*')
                .gte('created_at', pastTime.toISOString())
                .order('created_at', { ascending: false });
        }
    }
};

// Initialize global Supabase client
const supabaseClient = SUPABASE_CONFIG.initClient();

// Make configuration available globally
window.supabaseConfig = SUPABASE_CONFIG;
window.supabaseClient = supabaseClient;

// Auto-test connection on load (optional)
document.addEventListener('DOMContentLoaded', async function() {
    const isConnected = await SUPABASE_CONFIG.testConnection();
    if (isConnected) {
        console.log('Dashboard ready with Supabase connection');
    } else {
        console.warn('Dashboard loaded without Supabase connection');
    }
});

// Export for module usage (if using ES6 modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SUPABASE_CONFIG, supabaseClient };
}