<?php
// supabase.php

$SUPABASE_URL = "https://zhjzbvghigeuarxvucob.supabase.co";
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoanpidmdoaWdldWFyeHZ1Y29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NzAxOTUsImV4cCI6MjA4MDM0NjE5NX0.TF0dz6huz6tPAiXe3pz04Fuafh7dewIVNqWpOzJbm2w";

function supabaseRequest($endpoint) {
    global $SUPABASE_URL, $SUPABASE_KEY;

    $ch = curl_init($SUPABASE_URL . $endpoint);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "apikey: $SUPABASE_KEY",
        "Authorization: Bearer $SUPABASE_KEY",
        "Content-Type: application/json"
    ]);
    $res = curl_exec($ch);
    curl_close($ch);
    return json_decode($res, true);
}

// Latest temperature per tank
function fetchLatestTankValues() {
    $rows = supabaseRequest(
        "/rest/v1/tank_readings?select=tank_id,temperature,created_at&order=created_at.desc"
    );

    $latest = [];
    foreach ($rows as $r) {
        if (!isset($latest[$r['tank_id']])) {
            $latest[$r['tank_id']] = $r['temperature'];
        }
    }
    return $latest;
}

// Recent records
function fetchTankHistory($limit = 50) {
    return supabaseRequest(
        "/rest/v1/tank_readings?select=*&order=created_at.desc&limit=$limit"
    );
}
