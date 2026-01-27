// --- VARIABLES Y CONFIGURACIÓN ---
let refills = JSON.parse(localStorage.getItem('refills')) || [];
let vehicleConfig = JSON.parse(localStorage.getItem('vehicleConfig')) || { initialOdometer: 0, lastService: 0, interval: 10000 };
let myChart;

const circle = document.getElementById('efficiency-circle');
const circumference = 85 * 2 * Math.PI;
if (circle) {
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = circumference;
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    renderApp();
    setupEventListeners();
});

function setupEventListeners() {
    // Navegación
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden-view'));
            document.getElementById(item.dataset.target).classList.remove('hidden-view');
        });
    });

    // Dropdown
    const trigger = document.getElementById('dropdown-trigger');
    const options = document.getElementById('dropdown-options');
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        options.classList.toggle('hidden');
    });
    document.addEventListener('click', () => options.classList.add('hidden'));

    // Modales
    document.querySelector('.fab-btn').addEventListener('click', openAddModal);
    document.getElementById('settings-btn').addEventListener('click', () => document.getElementById('settings-screen').classList.remove('hidden'));
    document.getElementById('close-settings-btn').addEventListener('click', saveConfig);
    document.getElementById('cancel-btn').addEventListener('click', () => document.getElementById('add-screen').classList.add('hidden'));

    // Toggle de modo
    document.getElementById('mode-toggle').addEventListener('change', (e) => {
        document.getElementById('input-trip-group').classList.toggle('hidden-input', e.target.checked);
        document.getElementById('input-odometer-group').classList.toggle('hidden-input', !e.target.checked);
    });

    document.getElementById('save-btn').addEventListener('click', saveRefill);
}

// --- LÓGICA DE NEGOCIO ---
function saveConfig() {
    vehicleConfig.initialOdometer = parseFloat(document.getElementById('setting-initial-odometer').value) || 0;
    vehicleConfig.lastService = parseFloat(document.getElementById('setting-last-service').value) || 0;
    vehicleConfig.interval = parseFloat(document.getElementById('setting-interval').value) || 10000;
    localStorage.setItem('vehicleConfig', JSON.stringify(vehicleConfig));
    document.getElementById('settings-screen').classList.add('hidden');
    renderApp();
}

function openAddModal() {
    document.getElementById('add-screen').classList.remove('hidden');
    const maxOdo = refills.length > 0 ? Math.max(...refills.map(r => r.odometer)) : vehicleConfig.initialOdometer;
    document.getElementById('prev-odometer-display').innerText = maxOdo;
    document.getElementById('date-input').value = new Date().toISOString().split('T')[0];
}

function saveRefill() {
    const initialOdo = parseFloat(vehicleConfig.initialOdometer);
    const maxOdoActual = refills.length > 0 ? Math.max(...refills.map(r => r.odometer)) : initialOdo;
    
    let finalOdo;
    if (document.getElementById('mode-toggle').checked) {
        finalOdo = parseFloat(document.getElementById('odometer').value);
    } else {
        const trip = parseFloat(document.getElementById('trip-input').value);
        finalOdo = maxOdoActual + trip;
    }

    if (finalOdo < initialOdo) return alert(`El odómetro no puede ser menor al inicial (${initialOdo})`);
    if (finalOdo <= maxOdoActual && refills.length > 0) return alert(`Debe ser mayor al último registro (${maxOdoActual})`);

    const data = {
        id: Date.now(),
        odometer: finalOdo,
        liters: parseFloat(document.getElementById('liters').value),
        price: parseFloat(document.getElementById('price').value),
        station: document.getElementById('station').value || "Gasolinera",
        rawDate: document.getElementById('date-input').value
    };

    if (!data.liters || !data.price) return alert("Faltan datos");

    refills.push(data);
    localStorage.setItem('refills', JSON.stringify(refills));
    document.getElementById('add-screen').classList.add('hidden');
    renderApp();
}

function renderApp() {
    refills.sort((a, b) => a.odometer - b.odometer);
    const initialOdo = parseFloat(vehicleConfig.initialOdometer);

    refills.forEach((r, i) => {
        const prev = i === 0 ? initialOdo : refills[i-1].odometer;
        r.dist = r.odometer - prev;
        r.eff = r.dist > 0 && r.liters > 0 ? (r.dist / r.liters).toFixed(1) : "0.0";
    });

    // Actualizar Círculo
    const valid = refills.filter(r => parseFloat(r.eff) > 0);
    const avg = valid.length ? (valid.reduce((s, r) => s + parseFloat(r.eff), 0) / valid.length).toFixed(1) : "0.0";
    document.getElementById('average-display').innerText = avg;
    
    if (circle) {
        const percent = Math.min((parseFloat(avg) / 20) * 100, 100);
        circle.style.strokeDashoffset = circumference - (percent / 100) * circumference;
    }

    // Listado
    const list = document.getElementById('activity-list');
    list.innerHTML = "";
    [...refills].reverse().forEach(r => {
        const div = document.createElement('div');
        div.className = 'activity-item card';
        div.style.marginBottom = "10px";
        div.innerHTML = `<div><strong>${r.station}</strong><br><small>${r.odometer} km</small></div>
                         <div style="text-align:right"><strong>${r.eff} km/l</strong><br><small>${r.dist} km</small></div>`;
        list.appendChild(div);
    });

    document.getElementById('total-spent').innerText = `$${refills.reduce((s, r) => s + r.price, 0).toFixed(2)}`;
    if (refills.length) document.getElementById('vehicle-odometer').innerText = refills[refills.length-1].odometer.toLocaleString();
    
    updateChart();
}

function initChart() {
    const ctx = document.getElementById('efficiencyChart').getContext('2d');
    myChart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [{ data: [], borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', fill: true, tension: 0.4 }] },
        options: { plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { grid: { color: '#1a2621' } } } }
    });
}

function updateChart() {
    if (!myChart) return;
    const valid = refills.filter(r => parseFloat(r.eff) > 0);
    myChart.data.labels = valid.map(r => r.rawDate);
    myChart.data.datasets[0].data = valid.map(r => r.eff);
    myChart.update();
}