// Supabase Configuration File
// Centralized configuration for all Supabase connections

(function() {
    // Supabase Configuration
    const SUPABASE_CONFIG = {
        url: 'https://zhjzbvghigeuarxvucob.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoanpidmdoaWdldWFyeHZ1Y29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NzAxOTUsImV4cCI6MjA4MDM0NjE5NX0.TF0dz6huz6tPAiXe3pz04Fuafh7dewIVNqWpOzJbm2w',
        
        // Initialize Supabase client
        initClient: function() {
            if (!window.supabase) {
                console.error('Supabase library not loaded. Make sure supabase-js is loaded first.');
                return null;
            }
            
            try {
                const client = window.supabase.createClient(this.url, this.key);
                console.log('✓ Supabase client initialized successfully');
                return client;
            } catch (error) {
                console.error('✗ Failed to initialize Supabase client:', error);
                return null;
            }
        },
        
        // Test connection
        testConnection: async function() {
            try {
                const client = window.supabaseClient;
                if (!client) {
                    console.error('Supabase client not initialized');
                    return false;
                }
                
                console.log('Testing Supabase connection...');
                const { data, error } = await client
                    .from('tank_readings')
                    .select('count')
                    .limit(1);
                
                if (error) {
                    console.error('Connection test failed:', error.message);
                    return false;
                }
                
                console.log('✓ Supabase connection successful');
                return true;
            } catch (error) {
                console.error('Connection test error:', error.message);
                return false;
            }
        },
        
        // Common queries
        queries: {
            getLatestReadings: function(limit = 100) {
                if (!window.supabaseClient) return null;
                return window.supabaseClient
                    .from('tank_readings')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(limit);
            },
            
            getTankReadings: function(tankId, limit = 100) {
                if (!window.supabaseClient) return null;
                return window.supabaseClient
                    .from('tank_readings')
                    .select('*')
                    .eq('tank_id', tankId)
                    .order('created_at', { ascending: false })
                    .limit(limit);
            }
        }
    };

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        // Initialize Supabase client
        const supabaseClient = SUPABASE_CONFIG.initClient();
        
        // Make available globally
        window.supabaseConfig = SUPABASE_CONFIG;
        window.supabaseClient = supabaseClient;
        
        console.log('Supabase configuration loaded');
        
        // Auto-test connection
        if (supabaseClient) {
            setTimeout(async () => {
                const isConnected = await SUPABASE_CONFIG.testConnection();
                if (isConnected) {
                    console.log('✅ Dashboard ready with Supabase connection');
                    // Trigger connection update if function exists
                    if (typeof window.updateConnectionStatus === 'function') {
                        window.updateConnectionStatus('Connected', 'success');
                    }
                } else {
                    console.warn('⚠️ Dashboard loaded without Supabase connection');
                }
            }, 1000);
        }
    });

    // Export for module usage
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SUPABASE_CONFIG;
    }
})();