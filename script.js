// --- ESTADO GLOBAL ---
let refills = JSON.parse(localStorage.getItem('refills')) || [];
let config = JSON.parse(localStorage.getItem('vehicleConfig')) || { initialOdometer: 0, lastService: 0, interval: 10000 };
let myChart;

const circ = document.getElementById('efficiency-circle');
const circumference = 85 * 2 * Math.PI;
if(circ) circ.style.strokeDasharray = `${circumference} ${circumference}`;

// --- INICIO ---
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    renderApp();
    
    // Navegación
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden-view'));
            document.getElementById(btn.dataset.target).classList.remove('hidden-view');
        };
    });

    // Modales
    document.querySelector('.fab-btn').onclick = () => {
        document.getElementById('add-screen').classList.remove('hidden');
        const last = refills.length > 0 ? Math.max(...refills.map(r => r.odometer)) : config.initialOdometer;
        document.getElementById('prev-odometer-display').innerText = last;
        document.getElementById('date-input').value = new Date().toISOString().split('T')[0];
    };

    document.getElementById('cancel-btn').onclick = () => document.getElementById('add-screen').classList.add('hidden');
    document.getElementById('settings-btn').onclick = () => {
        document.getElementById('set-init-odo').value = config.initialOdometer;
        document.getElementById('set-last-maint').value = config.lastService;
        document.getElementById('set-maint-int').value = config.interval;
        document.getElementById('settings-screen').classList.remove('hidden');
    };

    // Botones Acción
    document.getElementById('save-btn').onclick = saveEntry;
    document.getElementById('close-settings-btn').onclick = saveSettings;
    document.getElementById('reset-app-btn').onclick = resetAll;
    document.getElementById('export-btn').onclick = exportData;
    document.getElementById('import-btn').onclick = () => document.getElementById('file-import').click();
    document.getElementById('file-import').onchange = importData;

    document.getElementById('mode-toggle').onchange = (e) => {
        document.getElementById('input-trip-group').classList.toggle('hidden-input', e.target.checked);
        document.getElementById('input-odometer-group').classList.toggle('hidden-input', !e.target.checked);
    };
});

// --- FUNCIONES ---
function saveEntry() {
    const lastOdo = refills.length > 0 ? Math.max(...refills.map(r => r.odometer)) : parseFloat(config.initialOdometer);
    let currentOdo;
    
    if(document.getElementById('mode-toggle').checked) {
        currentOdo = parseFloat(document.getElementById('odometer-input').value);
    } else {
        currentOdo = lastOdo + (parseFloat(document.getElementById('trip-input').value) || 0);
    }

    if(currentOdo <= lastOdo) return alert(`El odómetro debe ser mayor a ${lastOdo}`);

    const newRefill = {
        id: Date.now(),
        odometer: currentOdo,
        liters: parseFloat(document.getElementById('liters-input').value),
        price: parseFloat(document.getElementById('price-input').value),
        station: document.getElementById('station-input').value || "Genérica",
        range: document.getElementById('range-input').value,
        notes: document.getElementById('notes-input').value,
        date: document.getElementById('date-input').value
    };

    if(!newRefill.liters || !newRefill.price) return alert("Llena los datos básicos");

    refills.push(newRefill);
    localStorage.setItem('refills', JSON.stringify(refills));
    document.getElementById('add-screen').classList.add('hidden');
    renderApp();
}

function saveSettings() {
    config = {
        initialOdometer: parseFloat(document.getElementById('set-init-odo').value) || 0,
        lastService: parseFloat(document.getElementById('set-last-maint').value) || 0,
        interval: parseFloat(document.getElementById('set-maint-int').value) || 10000
    };
    localStorage.setItem('vehicleConfig', JSON.stringify(config));
    document.getElementById('settings-screen').classList.add('hidden');
    renderApp();
}

function renderApp() {
    refills.sort((a,b) => a.odometer - b.odometer);
    const initOdo = parseFloat(config.initialOdometer);

    refills.forEach((r, i) => {
        const prev = i === 0 ? initOdo : refills[i-1].odometer;
        r.dist = r.odometer - prev;
        r.eff = r.dist > 0 && r.liters > 0 ? (r.dist / r.liters).toFixed(1) : "0.0";
    });

    // UI Stats
    const valid = refills.filter(r => parseFloat(r.eff) > 0);
    const avg = valid.length ? (valid.reduce((s, r) => s + parseFloat(r.eff), 0) / valid.length).toFixed(1) : "0.0";
    document.getElementById('average-display').innerText = avg;
    
    if(circ) {
        const p = Math.min((parseFloat(avg)/20)*100, 100);
        circ.style.strokeDashoffset = circumference - (p/100)*circumference;
    }

    // Mantenimiento
    const currentOdo = refills.length > 0 ? refills[refills.length-1].odometer : initOdo;
    document.getElementById('vehicle-odometer').innerText = currentOdo.toLocaleString();
    
    const nextService = config.lastService + config.interval;
    const remaining = nextService - currentOdo;
    document.getElementById('next-service-km').innerText = remaining > 0 ? `${remaining.toLocaleString()} km` : "SERVICIO YA";
    
    const progress = Math.min(Math.max(((currentOdo - config.lastService) / config.interval) * 100, 0), 100);
    const bar = document.getElementById('maint-progress-fill');
    bar.style.width = `${progress}%`;
    bar.style.background = progress > 90 ? "var(--danger-red)" : (progress > 70 ? "var(--accent-orange)" : "var(--primary-green)");

    // Historial
    const list = document.getElementById('activity-list');
    list.innerHTML = "";
    [...refills].reverse().forEach(r => {
        const div = document.createElement('div');
        div.className = 'card activity-item';
        div.innerHTML = `<div><strong>${r.station}</strong><br><small>${r.date} • ${r.odometer}km</small></div>
                         <div style="text-align:right"><strong>${r.eff} km/l</strong><br><small>${r.dist}km</small></div>`;
        list.appendChild(div);
    });

    document.getElementById('total-spent').innerText = `$${refills.reduce((s,r) => s + r.price, 0).toFixed(2)}`;
    updateChart();
}

function initChart() {
    const ctx = document.getElementById('efficiencyChart').getContext('2d');
    myChart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [{ data: [], borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', fill: true, tension: 0.4 }] },
        options: { plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
    });
}

function updateChart() {
    if(!myChart) return;
    const valid = refills.filter(r => parseFloat(r.eff) > 0);
    myChart.data.labels = valid.map(r => r.date);
    myChart.data.datasets[0].data = valid.map(r => r.eff);
    myChart.update();
}

function resetAll() { if(confirm("¿Borrar todo?")) { localStorage.clear(); location.reload(); } }

function exportData() {
    const blob = new Blob([JSON.stringify(refills)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'fuel_backup.json';
    a.click();
}

function importData(e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
        refills = JSON.parse(ev.target.result);
        localStorage.setItem('refills', JSON.stringify(refills));
        renderApp();
    };
    reader.readAsText(file);
}