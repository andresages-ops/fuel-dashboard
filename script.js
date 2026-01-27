// --- ELEMENTOS ---
const addBtn = document.querySelector('.fab-btn');
const addScreen = document.getElementById('add-screen');
const saveBtn = document.getElementById('save-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsScreen = document.getElementById('settings-screen');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const settingInitialOdometer = document.getElementById('setting-initial-odometer');
const settingLastService = document.getElementById('setting-last-service');
const settingInterval = document.getElementById('setting-interval');

// Variables Globales
let refills = JSON.parse(localStorage.getItem('refills')) || [];
let vehicleConfig = JSON.parse(localStorage.getItem('vehicleConfig')) || { 
    lastService: 0, 
    interval: 10000, 
    initialOdometer: 0 
};
let editingId = null;
let currentFilterValue = "all";
let myChart;

document.addEventListener('DOMContentLoaded', () => {
    initChart();
    if(settingInitialOdometer) settingInitialOdometer.value = vehicleConfig.initialOdometer || '';
    if(settingLastService) settingLastService.value = vehicleConfig.lastService || '';
    if(settingInterval) settingInterval.value = vehicleConfig.interval || 10000;
    renderApp();
});

// Navegación
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden-view'));
        document.getElementById(item.getAttribute('data-target')).classList.remove('hidden-view');
    });
});

// Lógica de Registro
addBtn.addEventListener('click', () => openModal());
document.getElementById('cancel-btn').addEventListener('click', () => addScreen.classList.add('hidden'));

function openModal(refill = null) {
    addScreen.classList.remove('hidden');
    const maxOdo = refills.length > 0 ? Math.max(...refills.map(r => r.odometer)) : vehicleConfig.initialOdometer;
    document.getElementById('prev-odometer-display').innerText = maxOdo;
    
    if (refill) {
        editingId = refill.id;
        document.getElementById('odometer').value = refill.odometer;
        document.getElementById('liters').value = refill.liters;
        document.getElementById('price').value = refill.price;
        document.getElementById('date-input').value = refill.rawDate;
    } else {
        editingId = null;
        document.getElementById('odometer').value = '';
        document.getElementById('trip-input').value = '';
        document.getElementById('date-input').value = new Date().toISOString().split('T')[0];
    }
}

// VALIDACIÓN Y GUARDADO
saveBtn.addEventListener('click', () => {
    let odo = parseFloat(document.getElementById('odometer').value);
    const modeManual = document.getElementById('mode-toggle').checked;
    const initialOdo = parseFloat(vehicleConfig.initialOdometer) || 0;
    const maxOdoActual = refills.length > 0 ? Math.max(...refills.map(r => r.odometer)) : initialOdo;

    if (!modeManual) {
        const trip = parseFloat(document.getElementById('trip-input').value);
        if (!trip) return alert("Ingresa distancia recorrida");
        odo = maxOdoActual + trip;
    }

    // --- NUEVA VALIDACIÓN DE INTEGRIDAD ---
    if (odo < initialOdo) {
        return alert(`Error: El kilometraje (${odo}) no puede ser menor al Odómetro Inicial (${initialOdo}). Revisa tu configuración.`);
    }

    if (!editingId && odo <= maxOdoActual && refills.length > 0) {
        return alert(`Error: El odómetro debe ser mayor al último registro (${maxOdoActual} km).`);
    }

    const data = {
        id: editingId || Date.now(),
        rawDate: document.getElementById('date-input').value,
        odometer: odo,
        liters: parseFloat(document.getElementById('liters').value),
        price: parseFloat(document.getElementById('price').value),
        station: document.getElementById('station').value || "Gasolinera"
    };

    if (!data.liters || !data.price) return alert("Completa los campos obligatorios");

    if (editingId) {
        const idx = refills.findIndex(r => r.id === editingId);
        refills[idx] = data;
    } else {
        refills.push(data);
    }

    localStorage.setItem('refills', JSON.stringify(refills));
    addScreen.classList.add('hidden');
    renderApp();
});

// Configuración
settingsBtn.addEventListener('click', () => settingsScreen.classList.remove('hidden'));
closeSettingsBtn.addEventListener('click', () => {
    vehicleConfig = {
        initialOdometer: parseFloat(settingInitialOdometer.value) || 0,
        lastService: parseFloat(settingLastService.value) || 0,
        interval: parseFloat(settingInterval.value) || 10000
    };
    localStorage.setItem('vehicleConfig', JSON.stringify(vehicleConfig));
    renderApp();
    settingsScreen.classList.add('hidden');
});

// Cálculos
function renderApp() {
    refills.sort((a, b) => a.odometer - b.odometer);
    const initialOdo = parseFloat(vehicleConfig.initialOdometer) || 0;
    
    refills.forEach((r, i) => {
        const prev = i === 0 ? initialOdo : refills[i-1].odometer;
        r.dist = r.odometer - prev;
        r.eff = (r.dist > 0 && r.liters > 0) ? (r.dist / r.liters).toFixed(1) : "0.0";
    });

    // Actualizar UI
    const activityList = document.getElementById('activity-list');
    activityList.innerHTML = refills.length ? "" : "<p>Sin datos</p>";
    
    [...refills].reverse().forEach(r => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <div class="details"><h4>${r.station}</h4><p>${r.odometer} km</p></div>
            <div class="cost"><h4>${r.eff} <small>km/l</small></h4><p>${r.dist} km</p></div>
        `;
        activityList.appendChild(item);
    });

    const totalCost = refills.reduce((s, r) => s + r.price, 0);
    document.getElementById('total-spent').innerText = `$${totalCost.toFixed(2)}`;
    
    if (refills.length) {
        const valid = refills.filter(r => parseFloat(r.eff) > 0);
        const avg = valid.length ? (valid.reduce((s, r) => s + parseFloat(r.eff), 0) / valid.length).toFixed(1) : "--";
        document.getElementById('average-display').innerText = avg;
        document.getElementById('vehicle-odometer').innerText = refills[refills.length-1].odometer.toLocaleString();
    }
    updateChart();
}

function initChart() {
    const ctx = document.getElementById('efficiencyChart').getContext('2d');
    myChart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [{ data: [], borderColor: '#22c55e', tension: 0.3, fill: true, backgroundColor: 'rgba(34,197,94,0.1)' }] },
        options: { plugins: { legend: { display: false } }, scales: { x: { display: false } } }
    });
}

function updateChart() {
    if (!myChart) return;
    const valid = refills.filter(r => parseFloat(r.eff) > 0);
    myChart.data.labels = valid.map(r => r.rawDate);
    myChart.data.datasets[0].data = valid.map(r => r.eff);
    myChart.update();
}