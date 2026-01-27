// --- ELEMENTOS GLOBALES ---
const addBtn = document.querySelector('.fab-btn');
const addScreen = document.getElementById('add-screen');
const cancelBtn = document.getElementById('cancel-btn');
const cancelBottomBtn = document.getElementById('cancel-bottom-btn');
const saveBtn = document.getElementById('save-btn');
const deleteBtn = document.getElementById('delete-btn');
const modalTitle = document.getElementById('modal-title');

// Settings
const settingsBtn = document.getElementById('settings-btn');
const settingsScreen = document.getElementById('settings-screen');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const exportBtn = document.getElementById('export-btn');
const importTriggerBtn = document.getElementById('import-trigger-btn');
const fileInput = document.getElementById('file-input');
const resetAppBtn = document.getElementById('reset-app-btn');
const settingLastService = document.getElementById('setting-last-service');
const settingInterval = document.getElementById('setting-interval');

// Interfaz
const activityList = document.getElementById('activity-list');
const totalSpentElement = document.getElementById('total-spent');
const averageDisplay = document.getElementById('average-display');
const lastEfficiencyDisplay = document.getElementById('last-efficiency');
const vehicleOdometerDisplay = document.getElementById('vehicle-odometer');
const nextServiceDisplay = document.getElementById('next-service');
const serviceProgress = document.getElementById('service-progress');
const serviceIntervalLabel = document.getElementById('service-interval-label');
const costPerKmDisplay = document.getElementById('cost-per-km');
const bestEfficiencyDisplay = document.getElementById('best-efficiency');
const totalLitersDisplay = document.getElementById('total-liters');
const periodLabel = document.getElementById('period-label');
const conditionBadge = document.getElementById('condition-badge');

// Círculo SVG (Manejo de errores si no carga el SVG inmediatamente)
const circle = document.querySelector('.progress-ring__circle');
let circumference = 0;
if (circle) {
    const radius = circle.r.baseVal.value;
    circumference = radius * 2 * Math.PI;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = circumference;
}

// Toggle y Grupos
const modeToggle = document.getElementById('mode-toggle');
const groupOdometer = document.getElementById('input-odometer-group');
const groupTrip = document.getElementById('input-trip-group');
const prevOdometerDisplay = document.getElementById('prev-odometer-display');
const navItems = document.querySelectorAll('.nav-item');
const viewSections = document.querySelectorAll('.view-section');

// VARIABLES
let myChart; 
let editingId = null;
let refills = JSON.parse(localStorage.getItem('refills')) || [];
let vehicleConfig = JSON.parse(localStorage.getItem('vehicleConfig')) || { lastService: 0, interval: 10000 };
let currentFilterValue = "all"; // Variable global para el filtro

// --- INICIO ---
// Esperamos a que el DOM esté listo para evitar errores de carga
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    recalculateAll();
    if(settingLastService) settingLastService.value = vehicleConfig.lastService === 0 ? '' : vehicleConfig.lastService;
    if(settingInterval) settingInterval.value = vehicleConfig.interval;
    renderApp();
});

// --- LÓGICA DEL DROPDOWN PERSONALIZADO ---
const dropdownTrigger = document.getElementById('dropdown-trigger');
const dropdownOptions = document.getElementById('dropdown-options');
const dropdownItems = document.querySelectorAll('.dropdown-item');
const dropdownText = dropdownTrigger ? dropdownTrigger.querySelector('span') : null;

if (dropdownTrigger) {
    // 1. Abrir/Cerrar menú
    dropdownTrigger.addEventListener('click', (e) => {
        e.stopPropagation(); // Evitar que el clic cierre inmediatamente
        dropdownOptions.classList.toggle('hidden');
    });

    // 2. Cerrar si clic afuera
    document.addEventListener('click', (e) => {
        if (!dropdownTrigger.contains(e.target)) {
            dropdownOptions.classList.add('hidden');
        }
    });

    // 3. Seleccionar opción
    dropdownItems.forEach(item => {
        item.addEventListener('click', () => {
            // Quitar selección anterior
            dropdownItems.forEach(i => i.classList.remove('selected'));
            // Marcar nueva
            item.classList.add('selected');
            // Actualizar texto y valor
            if(dropdownText) dropdownText.innerText = item.innerText;
            currentFilterValue = item.getAttribute('data-value');
            
            // Cerrar y Renderizar
            dropdownOptions.classList.add('hidden');
            renderApp();
        });
    });
}

function getFilteredRefills() {
    const filterValue = currentFilterValue;
    const now = new Date();
    
    if (filterValue === 'all') {
        if(periodLabel) periodLabel.innerText = "Histórico Total";
        return refills;
    }

    const months = parseInt(filterValue);
    const cutoffDate = new Date();
    cutoffDate.setMonth(now.getMonth() - months);
    
    if(periodLabel) {
        if(months === 1) periodLabel.innerText = "Último Mes";
        else if(months === 12) periodLabel.innerText = "Último Año";
        else periodLabel.innerText = `Últimos ${months} Meses`;
    }

    return refills.filter(refill => {
        const refillDate = new Date(refill.rawDate + 'T00:00:00');
        return refillDate >= cutoffDate;
    });
}

// --- NAVEGACIÓN ---
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        navItems.forEach(nav => nav.classList.remove('active'));
        e.currentTarget.classList.add('active');
        viewSections.forEach(section => section.classList.add('hidden-view'));
        const targetId = e.currentTarget.getAttribute('data-target');
        const targetSection = document.getElementById(targetId);
        if(targetSection) targetSection.classList.remove('hidden-view');
    });
});

// --- MODAL Y FORMULARIO ---
if(addBtn) addBtn.addEventListener('click', () => openModal());

function closeModal() { 
    if(addScreen) addScreen.classList.add('hidden'); 
    editingId = null; 
}

if(cancelBtn) cancelBtn.addEventListener('click', closeModal);
if(cancelBottomBtn) cancelBottomBtn.addEventListener('click', closeModal);

if(modeToggle) modeToggle.addEventListener('change', updateInputMode);

function updateInputMode() {
    if (!modeToggle || !groupOdometer || !groupTrip) return;
    
    if (modeToggle.checked) {
        groupOdometer.classList.remove('hidden-input');
        groupTrip.classList.add('hidden-input');
    } else {
        groupOdometer.classList.add('hidden-input');
        groupTrip.classList.remove('hidden-input');
        const maxOdo = refills.length > 0 ? Math.max(...refills.map(r => r.odometer)) : 0;
        if(prevOdometerDisplay) prevOdometerDisplay.innerText = maxOdo;
    }
}

function openModal(existingRefill = null) {
    if(!addScreen) return;
    addScreen.classList.remove('hidden');
    if(modeToggle) modeToggle.checked = false;
    updateInputMode();
    
    if (existingRefill) {
        editingId = existingRefill.id;
        if(modalTitle) modalTitle.innerText = "Editar Refill";
        if(deleteBtn) deleteBtn.style.display = 'block';
        if(modeToggle) modeToggle.checked = true;
        updateInputMode();
        
        document.getElementById('odometer').value = existingRefill.odometer;
        document.getElementById('liters').value = existingRefill.liters;
        document.getElementById('price').value = existingRefill.price;
        document.getElementById('station').value = existingRefill.station;
        document.getElementById('date-input').value = existingRefill.rawDate;
        document.getElementById('range').value = existingRefill.range || ""; 
        document.getElementById('notes').value = existingRefill.notes || "";
    } else {
        editingId = null;
        if(modalTitle) modalTitle.innerText = "Agregar Refill";
        if(deleteBtn) deleteBtn.style.display = 'none';
        
        document.getElementById('odometer').value = '';
        document.getElementById('trip-input').value = '';
        document.getElementById('liters').value = '';
        document.getElementById('price').value = '';
        document.getElementById('station').value = '';
        document.getElementById('range').value = '';
        document.getElementById('notes').value = '';
        document.getElementById('date-input').value = new Date().toISOString().split('T')[0];
    }
}

if(deleteBtn) {
    deleteBtn.addEventListener('click', () => {
        if(confirm("¿Eliminar registro?")) {
            refills = refills.filter(r => r.id !== editingId);
            recalculateAll();
            localStorage.setItem('refills', JSON.stringify(refills));
            closeModal();
            renderApp();
        }
    });
}

if(saveBtn) {
    saveBtn.addEventListener('click', () => {
        const rawDate = document.getElementById('date-input').value;
        let odometer = parseFloat(document.getElementById('odometer').value);
        const liters = parseFloat(document.getElementById('liters').value);
        const price = parseFloat(document.getElementById('price').value);
        const station = document.getElementById('station').value || "Gasolinera";
        const range = document.getElementById('range').value ? parseFloat(document.getElementById('range').value) : null;
        const notes = document.getElementById('notes').value;
        
        if (!modeToggle.checked) {
            const tripVal = parseFloat(document.getElementById('trip-input').value);
            if (!tripVal) { alert("Ingresa la distancia recorrida"); return; }
            const maxOdo = refills.length > 0 ? Math.max(...refills.map(r => r.odometer)) : 0;
            if (maxOdo === 0 && refills.length === 0) {
                alert("Para el primer registro, activa el switch y usa 'Odómetro Total'."); return;
            }
            odometer = maxOdo + tripVal;
        } else {
            if (!odometer) { alert("Ingresa el odómetro total"); return; }
        }

        if (!rawDate || !liters || !price) { alert("Faltan datos obligatorios."); return; }

        const refillData = {
            id: editingId ? editingId : Date.now(),
            rawDate: rawDate,
            dateDisplay: new Date(rawDate + 'T12:00:00').toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' }),
            odometer: odometer,
            liters: liters,
            price: price,
            station: station,
            range: range,
            notes: notes,
            distanceTraveled: 0, 
            efficiencyKmL: 0
        };

        if (editingId) {
            const index = refills.findIndex(r => r.id === editingId);
            if (index !== -1) refills[index] = refillData;
        } else {
            refills.push(refillData);
        }
        recalculateAll();
        localStorage.setItem('refills', JSON.stringify(refills));
        closeModal();
        renderApp();
    });
}

// --- SETTINGS ---
if(settingsBtn) settingsBtn.addEventListener('click', () => settingsScreen.classList.remove('hidden'));
if(closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
        const newLastService = parseFloat(settingLastService.value) || 0;
        const newInterval = parseFloat(settingInterval.value) || 10000;
        vehicleConfig = { lastService: newLastService, interval: newInterval };
        localStorage.setItem('vehicleConfig', JSON.stringify(vehicleConfig));
        renderApp();
        settingsScreen.classList.add('hidden');
    });
}

if(exportBtn) {
    exportBtn.addEventListener('click', () => {
        const dataStr = JSON.stringify(refills, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fuel_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    });
}

if(importTriggerBtn) importTriggerBtn.addEventListener('click', () => fileInput.click());
if(fileInput) {
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                if (Array.isArray(importedData)) {
                    if(confirm(`¿Importar ${importedData.length} registros?`)) {
                        refills = importedData;
                        recalculateAll();
                        localStorage.setItem('refills', JSON.stringify(refills));
                        renderApp();
                        alert("¡Datos importados!");
                        settingsScreen.classList.add('hidden');
                    }
                } else { alert("Archivo inválido."); }
            } catch (error) { alert("Error al leer archivo."); }
        };
        reader.readAsText(file);
    });
}

if(resetAppBtn) {
    resetAppBtn.addEventListener('click', () => {
        if(confirm("¿Borrar TODOS los datos?")) {
            localStorage.clear();
            refills = [];
            vehicleConfig = { lastService: 0, interval: 10000 };
            if(settingLastService) settingLastService.value = ''; 
            if(settingInterval) settingInterval.value = 10000;
            renderApp();
            settingsScreen.classList.add('hidden');
            alert("App reiniciada.");
        }
    });
}

// --- CÁLCULO Y RENDER ---
function recalculateAll() {
    refills.sort((a, b) => a.odometer - b.odometer);
    for (let i = 0; i < refills.length; i++) {
        const current = refills[i];
        if (i === 0) { current.distanceTraveled = 0; current.efficiencyKmL = "0.0"; }
        else {
            const previous = refills[i - 1];
            const distance = current.odometer - previous.odometer;
            if (distance < 0) { current.distanceTraveled = 0; current.efficiencyKmL = "Error"; }
            else {
                current.distanceTraveled = distance;
                if (current.liters > 0) current.efficiencyKmL = (distance / current.liters).toFixed(1);
                else current.efficiencyKmL = "0.0";
            }
        }
    }
}

function setProgress(percent) {
    if(!circle) return;
    if(percent < 0) percent = 0; if(percent > 100) percent = 100;
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
}

function renderApp() {
    if(!activityList) return;
    activityList.innerHTML = '';
    const filteredRefills = getFilteredRefills();
    const viewList = [...filteredRefills].reverse();

    if (viewList.length === 0) {
        activityList.innerHTML = '<p style="text-align:center; color:#8899a6; padding:20px;">Sin registros en este periodo.</p>';
        if(averageDisplay) averageDisplay.innerText = "--"; 
        if(lastEfficiencyDisplay) lastEfficiencyDisplay.innerText = "--"; 
        if(totalSpentElement) totalSpentElement.innerText = "$0.00"; 
        if(conditionBadge) {
            conditionBadge.innerText = "Sin datos";
            conditionBadge.style.backgroundColor = "rgba(136, 153, 166, 0.2)"; 
            conditionBadge.style.color = "#8899a6";
        }
        setProgress(0); 
        updateChartData([]); 
    } else {
        viewList.forEach(refill => {
             let efficiencyClass = "color:var(--primary-green);";
             let displayEff = refill.efficiencyKmL;
             let displayDist = refill.distanceTraveled > 0 ? `Recorridos: ${refill.distanceTraveled} km` : "Registro Inicial";
             if (displayEff === "Error") efficiencyClass = "color:#ef4444;"; else if (displayEff === "0.0") displayEff = "--";
             let rangeHTML = refill.range ? `<span style="font-size:0.75rem; color:var(--accent-blue); display:block; margin-top:2px;"><i class="fas fa-road"></i> Quedan: ${refill.range}km</span>` : "";
             let notesHTML = refill.notes ? `<p style="color:var(--accent-orange); font-size:0.75rem; margin-top:3px; font-style:italic;"><i class="fas fa-sticky-note" style="margin-right:4px;"></i>${refill.notes}</p>` : "";
             
             const item = document.createElement('div');
             item.className = 'activity-item';
             item.innerHTML = `
                <div class="icon-box"><i class="fas fa-gas-pump"></i></div>
                <div class="details">
                    <h4>${refill.station}</h4>
                    <p>${refill.dateDisplay} • ${refill.odometer} km</p>
                    ${rangeHTML} ${notesHTML}
                </div>
                <div class="cost">
                    <h4 style="${efficiencyClass} font-size:1.2rem;">${displayEff} <small style="font-size:0.7rem;">km/l</small></h4>
                    <p>${displayDist}</p>
                </div>
                <button class="edit-btn-list" onclick="triggerEdit(${refill.id})"><i class="fas fa-pen"></i></button>
            `;
            activityList.appendChild(item);
        });

        const totalCost = filteredRefills.reduce((sum, r) => sum + r.price, 0);
        if(totalSpentElement) totalSpentElement.innerText = `$${totalCost.toFixed(2)}`;
        const validEffs = filteredRefills.filter(r => parseFloat(r.efficiencyKmL) > 0);
        
        if (validEffs.length > 0) {
            const sum = validEffs.reduce((s, r) => s + parseFloat(r.efficiencyKmL), 0);
            const avg = (sum / validEffs.length).toFixed(1);
            if(averageDisplay) averageDisplay.innerText = avg;
            let percent = (avg / 20) * 100;
            setProgress(percent);
            
            if(conditionBadge) {
                if (avg > 14) { conditionBadge.innerText = "Excelente"; conditionBadge.style.color = "#22c55e"; conditionBadge.style.backgroundColor = "rgba(34, 197, 94, 0.2)"; }
                else if (avg > 10) { conditionBadge.innerText = "Buena"; conditionBadge.style.color = "#d97706"; conditionBadge.style.backgroundColor = "rgba(217, 119, 6, 0.2)"; }
                else { conditionBadge.innerText = "Baja"; conditionBadge.style.color = "#ef4444"; conditionBadge.style.backgroundColor = "rgba(239, 68, 68, 0.2)"; }
            }
            if(lastEfficiencyDisplay) {
                if(viewList[0].efficiencyKmL !== "0.0") lastEfficiencyDisplay.innerText = viewList[0].efficiencyKmL;
                else if (viewList.length > 1) lastEfficiencyDisplay.innerText = viewList[1].efficiencyKmL;
            }
        }

        const allRefillsReversed = [...refills].reverse();
        if(allRefillsReversed.length > 0) {
            const currentOdo = allRefillsReversed[0].odometer;
            if(vehicleOdometerDisplay) vehicleOdometerDisplay.innerText = currentOdo.toLocaleString();
            const lastServiceKm = vehicleConfig.lastService;
            const interval = vehicleConfig.interval;
            const nextServiceKm = lastServiceKm + interval;
            const remaining = nextServiceKm - currentOdo;
            if(nextServiceDisplay) nextServiceDisplay.innerText = `${remaining.toLocaleString()} km`;
            if(serviceIntervalLabel) serviceIntervalLabel.innerText = `Próx: ${nextServiceKm.toLocaleString()} km`;
            
            let progressPercent = 0;
            if (currentOdo >= lastServiceKm) progressPercent = ((currentOdo - lastServiceKm) / interval) * 100;
            if(progressPercent > 100) progressPercent = 100; if(progressPercent < 0) progressPercent = 0;
            
            if(serviceProgress) {
                serviceProgress.style.width = `${progressPercent}%`;
                if (progressPercent > 90) serviceProgress.style.background = "#ef4444"; else serviceProgress.style.background = "#d97706";
            }
        }
        
        const distanceFiltered = filteredRefills.reduce((sum, r) => sum + parseFloat(r.distanceTraveled || 0), 0);
        if(costPerKmDisplay) {
            if (distanceFiltered > 0) costPerKmDisplay.innerText = `$${(totalCost / distanceFiltered).toFixed(2)}`;
            else costPerKmDisplay.innerText = "--";
        }
        if(bestEfficiencyDisplay && validEffs.length > 0) bestEfficiencyDisplay.innerText = Math.max(...validEffs.map(r => parseFloat(r.efficiencyKmL))).toFixed(1);
        if(totalLitersDisplay) totalLitersDisplay.innerText = filteredRefills.reduce((sum, r) => sum + r.liters, 0).toFixed(1);
    }
    updateChartData(filteredRefills);
}

window.triggerEdit = function(id) { const found = refills.find(r => r.id === id); if(found) openModal(found); };

function initChart() {
    const canvas = document.getElementById('efficiencyChart');
    if (!canvas) return; // Si no encuentra el canvas, no intenta crear el gráfico
    const ctx = canvas.getContext('2d');
    
    // Verificar si Chart está definido para evitar errores si la librería tarda en cargar
    if (typeof Chart !== 'undefined') {
        myChart = new Chart(ctx, { type: 'line', data: { labels: [], datasets: [{ label: 'Km/L', data: [], borderColor: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderWidth: 3, tension: 0.3, pointBackgroundColor: '#0f1a15', fill: true }] }, options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { grid: { color: '#2d3b33' }, ticks: { color: '#8899a6' } } } } });
    } else {
        console.warn('Chart.js no cargó correctamente');
    }
}

function updateChartData(dataList) {
    if (!myChart) return;
    const validData = dataList.filter(r => parseFloat(r.efficiencyKmL) > 0);
    myChart.data.labels = validData.map(r => r.dateDisplay);
    myChart.data.datasets[0].data = validData.map(r => r.efficiencyKmL);
    myChart.update();
}