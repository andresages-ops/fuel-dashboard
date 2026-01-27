const addBtn = document.querySelector('.fab-btn');
const addScreen = document.getElementById('add-screen');
const cancelBtn = document.getElementById('cancel-btn');
const saveBtn = document.getElementById('save-btn');
const deleteBtn = document.getElementById('delete-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsScreen = document.getElementById('settings-screen');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const settingStartKm = document.getElementById('setting-start-km');

let refills = JSON.parse(localStorage.getItem('refills')) || [];
let vehicleConfig = JSON.parse(localStorage.getItem('vehicleConfig')) || { lastService: 0, interval: 10000, startKM: 0 };
let currentFilterValue = "all";
let myChart;

document.addEventListener('DOMContentLoaded', () => {
    if(settingStartKm) settingStartKm.value = vehicleConfig.startKM || '';
    if(document.getElementById('setting-last-service')) document.getElementById('setting-last-service').value = vehicleConfig.lastService || '';
    if(document.getElementById('setting-interval')) document.getElementById('setting-interval').value = vehicleConfig.interval;
    
    initChart();
    renderApp();
});

function recalculateAll() {
    refills.sort((a, b) => a.odometer - b.odometer);
    const startKM = parseFloat(vehicleConfig.startKM) || 0;

    for (let i = 0; i < refills.length; i++) {
        const current = refills[i];
        const previousKM = (i === 0) ? startKM : refills[i - 1].odometer;
        
        if (previousKM > 0) {
            const distance = current.odometer - previousKM;
            current.distanceTraveled = distance > 0 ? distance : 0;
            current.efficiencyKmL = (distance > 0 && current.liters > 0) ? (distance / current.liters).toFixed(1) : "0.0";
        } else {
            current.distanceTraveled = 0;
            current.efficiencyKmL = "0.0";
        }
    }
}

function renderApp() {
    recalculateAll();
    const list = document.getElementById('activity-list');
    if(!list) return;
    list.innerHTML = '';
    
    const filtered = getFilteredRefills();
    const viewList = [...filtered].reverse();

    if(viewList.length > 0) {
        document.getElementById('total-spent').innerText = `$${filtered.reduce((s, r) => s + r.price, 0).toFixed(2)}`;
        const valid = filtered.filter(r => parseFloat(r.efficiencyKmL) > 0);
        if(valid.length > 0) {
            const avg = (valid.reduce((s, r) => s + parseFloat(r.efficiencyKmL), 0) / valid.length).toFixed(1);
            document.getElementById('average-display').innerText = avg;
            setProgress((avg / 20) * 100);
        }
        
        const latestOdo = Math.max(...refills.map(r => r.odometer));
        document.getElementById('vehicle-odometer').innerText = latestOdo.toLocaleString();
    }
    
    viewList.forEach(r => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <div class="icon-box"><i class="fas fa-gas-pump"></i></div>
            <div class="details"><h4>${r.station}</h4><p>${r.dateDisplay} • ${r.odometer} km</p></div>
            <div class="cost"><h4>${r.efficiencyKmL} <small>km/l</small></h4><p>+${r.distanceTraveled} km</p></div>
        `;
        list.appendChild(item);
    });
    updateChartData(filtered);
}

// Lógica de Modales y botones (resumida para ahorrar espacio pero funcional)
if(settingsBtn) settingsBtn.onclick = () => settingsScreen.classList.remove('hidden');
if(closeSettingsBtn) closeSettingsBtn.onclick = () => {
    vehicleConfig.startKM = parseFloat(settingStartKm.value) || 0;
    vehicleConfig.lastService = parseFloat(document.getElementById('setting-last-service').value) || 0;
    vehicleConfig.interval = parseFloat(document.getElementById('setting-interval').value) || 10000;
    localStorage.setItem('vehicleConfig', JSON.stringify(vehicleConfig));
    renderApp();
    settingsScreen.classList.add('hidden');
};

// ... Resto de lógica de navegación y guardado de la v2.1 ...
// (Asegúrate de mantener las funciones initChart, updateChartData y los event listeners del modal)