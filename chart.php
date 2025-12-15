<?php
require 'supabase.php';
$data = fetchTankHistory(200);
?>

<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Temperature Chart</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>

<h2>Tank Temperature Chart</h2>

<select id="tank">
<?php for($i=1;$i<=21;$i++): ?>
<option value="<?= $i ?>">Tank <?= $i ?></option>
<?php endfor; ?>
</select>

<canvas id="chart" height="100"></canvas>

<script>
const raw = <?= json_encode($data) ?>;
const ctx = document.getElementById('chart');

function draw(tank){
    const filtered = raw.filter(r => r.tank_id == tank);
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: filtered.map(r => r.created_at),
            datasets: [{
                label: 'Temperature °C',
                data: filtered.map(r => r.temperature),
                borderColor: '#3C91E6',
                tension: 0.3
            }]
        }
    });
}

draw(1);
document.getElementById('tank').onchange = e => draw(e.target.value);
</script>

</body>
</html>
