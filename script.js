// --- ELEMENTOS ---
const addBtn = document.querySelector('.fab-btn');
const addScreen = document.getElementById('add-screen');
const settingsScreen = document.getElementById('settings-screen');
const navItems = document.querySelectorAll('.nav-item');
const viewSections = document.querySelectorAll('.view-section');

let refills = JSON.parse(localStorage.getItem('refills')) || [];
let vehicleConfig = JSON.parse(localStorage.getItem('vehicleConfig')) || { lastService: 0, interval: 10000, startKM: 0 };
let selectedFuel = "Regular";
let chartInstance = null;

// --- NAVEGACIÓN ---
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        viewSections.forEach(v => v.classList.add('hidden-view'));
        document.getElementById(item.dataset.target).classList.remove('hidden-view');
        if(item.dataset.target === 'view-dashboard') renderApp();
    });
});

// --- SWITCH GASOLINA ---
function switchFuel(type, index) {
    selectedFuel = type;
    const slider = document.getElementById('fuel-slider');
    const buttons = document.querySelectorAll('.seg-btn');
    slider.style.transform = `translateX(${index * 100}%)`;
    slider.style.backgroundColor = type === "Regular" ? "var(--primary-green)" : "var(--premium-red)";
    buttons.forEach(btn => btn.classList.remove('active'));
    buttons[index].classList.add('active');
}

// --- CÁLCULOS ---
function recalculateAll() {
    refills.sort((a, b) => a.odometer - b.odometer);
    const startKM = parseFloat(vehicleConfig.startKM) || 0;

    refills.forEach((reg, i) => {
        const prevKM = (i === 0) ? startKM : refills[i - 1].odometer;
        if (prevKM > 0) {
            reg.distanceTraveled = reg.odometer - prevKM;
            reg.efficiencyKmL = reg.distanceTraveled > 0 ? (reg.distanceTraveled / reg.liters).toFixed(1) : "0.0";
        } else {
            reg.distanceTraveled = 0;
            reg.efficiencyKmL = "0.0";
        }
    });
}

function renderApp() {
    recalculateAll();
    const list = document.getElementById('activity-list');
    list.innerHTML = '';

    if (refills.length > 0) {
        document.getElementById('total-spent').innerText = `$${refills.reduce((s, r) => s + r.price, 0).toFixed(2)}`;
        const valid = refills.filter(r => parseFloat(r.efficiencyKmL) > 0);
        if (valid.length > 0) {
            const avg = (valid.reduce((s, r) => s + parseFloat(r.efficiencyKmL), 0) / valid.length).toFixed(1);
            document.getElementById('average-display').innerText = avg;
            updateCircle(avg);
        }
        document.getElementById('vehicle-odometer').innerText = refills[refills.length - 1].odometer.toLocaleString();
    }

    refills.slice().reverse().forEach(r => {
        const div = document.createElement('div');
        div.className = 'activity-item';
        div.innerHTML = `
            <div class="icon-box"><i class="fas fa-gas-pump"></i></div>
            <div class="details"><h4>${r.station}</h4><p>${r.rawDate} • ${r.tipo}</p></div>
            <div class="cost"><h4>${r.efficiencyKmL} <small>km/l</small></h4><p>+${r.distanceTraveled} km</p></div>
        `;
        list.appendChild(div);
    });
    updateChart();
}

function updateCircle(avg) {
    const circle = document.querySelector('.progress-ring__circle');
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    const percent = Math.min((avg / 20) * 100, 100);
    circle.style.strokeDashoffset = circumference - (percent / 100) * circumference;
}

// --- MODALES ---
document.getElementById('settings-btn').onclick = () => settingsScreen.classList.remove('hidden');
document.getElementById('close-settings-btn').onclick = () => {
    vehicleConfig.startKM = parseFloat(document.getElementById('setting-start-km').value) || 0;
    vehicleConfig.lastService = parseFloat(document.getElementById('setting-last-service').value) || 0;
    vehicleConfig.interval = parseFloat(document.getElementById('setting-interval').value) || 10000;
    localStorage.setItem('vehicleConfig', JSON.stringify(vehicleConfig));
    settingsScreen.classList.add('hidden');
    renderApp();
};

addBtn.onclick = () => {
    document.getElementById('date-input').value = new Date().toISOString().split('T')[0];
    addScreen.classList.remove('hidden');
};

document.getElementById('save-btn').onclick = () => {
    const l = parseFloat(document.getElementById('liters').value);
    const p = parseFloat(document.getElementById('price').value);
    const km = parseInt(document.getElementById('odometer').value);
    if (!l || !p || !km) return alert("Completa los datos");

    refills.push({
        id: Date.now(), rawDate: document.getElementById('date-input').value,
        liters: l, price: p, odometer: km,
        station: document.getElementById('station').value || "Gasolinera",
        tipo: selectedFuel, notes: document.getElementById('notes').value
    });
    localStorage.setItem('refills', JSON.stringify(refills));
    addScreen.classList.add('hidden');
    renderApp();
};

function updateChart() {
    const ctx = document.getElementById('efficiencyChart');
    if (chartInstance) chartInstance.destroy();
    const valid = refills.filter(r => parseFloat(r.efficiencyKmL) > 0);
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: valid.map(r => r.rawDate),
            datasets: [{ data: valid.map(r => r.efficiencyKmL), borderColor: '#22c55e', tension: 0.4, fill: true, backgroundColor: 'rgba(34, 197, 94, 0.1)' }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
}

window.onload = renderApp;