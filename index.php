<?php
require 'supabase.php';
$latest = fetchLatestTankValues();
$records = fetchTankHistory();
?>

<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Tank Monitoring Dashboard</title>
<link href="https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css" rel="stylesheet">
<link rel="stylesheet" href="style.css">
</head>
<body>

<!-- SIDEBAR -->
<section id="sidebar">
    <a href="#" class="brand">
        <i class='bx bxs-thermometer'></i>
        <span class="text">Tank Monitor</span>
    </a>
    <ul class="side-menu top">
        <li class="active">
            <a href="index.php">
                <i class='bx bxs-dashboard'></i>
                <span class="text">Dashboard</span>
            </a>
        </li>
        <li>
            <a href="chart.php">
                <i class='bx bxs-line-chart'></i>
                <span class="text">Charts</span>
            </a>
        </li>
    </ul>
</section>

<!-- CONTENT -->
<section id="content">
<nav>
    <i class='bx bx-menu'></i>
    <span>Tank Temperature Monitoring</span>
</nav>

<main>
<div class="head-title">
    <div class="left">
        <h1>Dashboard</h1>
    </div>
</div>

<!-- 21 TANK OVERVIEW -->
<ul class="box-info">
<?php for($i=1;$i<=21;$i++): ?>
<li>
    <i class='bx bx-thermometer'></i>
    <span class="text">
        <h3><?= isset($latest[$i]) ? number_format($latest[$i],2).' °C' : '--' ?></h3>
        <p>Tank <?= $i ?></p>
    </span>
</li>
<?php endfor; ?>
</ul>

<!-- TABLE -->
<div class="table-data">
<div class="order">
<div class="head">
    <h3>Latest Records</h3>
</div>
<table>
<thead>
<tr>
    <th>Tank</th>
    <th>Temperature</th>
    <th>Date Time</th>
</tr>
</thead>
<tbody>
<?php foreach($records as $r): ?>
<tr>
    <td>Tank <?= $r['tank_id'] ?></td>
    <td><?= number_format($r['temperature'],2) ?> °C</td>
    <td><?= date('Y-m-d H:i:s', strtotime($r['created_at'])) ?></td>
</tr>
<?php endforeach; ?>
</tbody>
</table>
</div>
</div>

</main>
</section>

<script src="script.js"></script>
</body>
</html>
