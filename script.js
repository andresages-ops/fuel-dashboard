// Variables y Elementos
const addScreen = document.getElementById('add-screen');
const detailScreen = document.getElementById('detail-screen');
const reportsScreen = document.getElementById('reports-screen');
const dateInput = document.getElementById('log-date');

let selectedFuel = "Regular";
let currentDetailIndex = null;
let chartInstance = null;

// GESTIÓN DE ATRÁS
window.onpopstate = () => {
    addScreen.classList.add('hidden');
    detailScreen.classList.add('hidden');
    reportsScreen.classList.add('hidden');
};

// SWITCH DINÁMICO
function switchFuel(type, index) {
    selectedFuel = type;
    const slider = document.getElementById('fuel-slider');
    const buttons = document.querySelectorAll('.seg-btn');
    slider.style.transform = `translateX(${index * 100}%)`;
    slider.style.backgroundColor = type === "Regular" ? "var(--primary-green)" : "var(--premium-red)";
    buttons.forEach(btn => btn.classList.remove('active'));
    buttons[index].classList.add('active');
}

// EXPORTAR / IMPORTAR CSV
function exportarCSV() {
    const h = JSON.parse(localStorage.getItem('fuelLogs')) || [];
    if (!h.length) return alert("No hay datos");
    let csv = "Fecha,Litros,Costo,KM,Gasolinera,Tipo,Notas\n";
    h.forEach(r => csv += `${r.fecha},${r.litros},${r.costo},${r.km},"${r.gasolinera}",${r.tipo},"${r.notas}"\n`);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Fuel_Data.csv`;
    a.click();
}

function importarCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const lines = e.target.result.split('\n').slice(1);
        const nuevos = lines.filter(l => l.trim()).map(l => {
            const c = l.split(',');
            return { fecha: c[0], litros: parseFloat(c[1]), costo: parseFloat(c[2]), km: parseInt(c[3]), gasolinera: c[4].replace(/"/g,''), tipo: c[5], notas: c[6]?.replace(/"/g,'') || "" };
        });
        localStorage.setItem('fuelLogs', JSON.stringify(nuevos));
        cargarApp();
        alert("Datos importados con éxito");
    };
    reader.readAsText(file);
}

// GUARDAR
document.getElementById('save-btn').onclick = () => {
    const l = document.getElementById('liters').value;
    const p = document.getElementById('price').value;
    const km = document.getElementById('odometer').value;
    if(!l || !p || !km || !dateInput.value) return alert("Faltan datos");

    const parts = dateInput.value.split('-');
    const registro = {
        litros: parseFloat(l), costo: parseFloat(p), km: parseInt(km),
        gasolinera: document.getElementById('location').value || "N/A",
        tipo: selectedFuel, notas: document.getElementById('notes').value || "",
        fecha: `${parts[2]}/${parts[1]}/${parts[0]}`
    };

    let h = JSON.parse(localStorage.getItem('fuelLogs')) || [];
    h.push(registro);
    h.sort((a,b) => a.km - b.km);
    localStorage.setItem('fuelLogs', JSON.stringify(h));
    window.history.back();
    cargarApp();
};

// DASHBOARD
function cargarApp() {
    const h = JSON.parse(localStorage.getItem('fuelLogs')) || [];
    const list = document.getElementById('activity-list');
    list.innerHTML = '';
    
    if (h.length > 0) {
        document.getElementById('total-spent').textContent = `$${h.reduce((a,b)=>a+b.costo,0).toLocaleString()}`;
        if(h.length >= 2) {
            const last = h[h.length-1], first = h[0], totL = h.slice(1).reduce((a,b)=>a+b.litros,0);
            document.getElementById('avg-efficiency').textContent = ((last.km-first.km)/totL).toFixed(1);
            document.getElementById('last-efficiency').textContent = ((last.km-h[h.length-2].km)/last.litros).toFixed(1);
            document.getElementById('data-status').textContent = "Actualizado";
        }
    }

    h.slice().reverse().forEach((reg, i) => {
        const idx = h.length - 1 - i;
        const div = document.createElement('div');
        div.className = 'activity-item';
        div.onclick = () => {
            currentDetailIndex = idx;
            let eff = idx > 0 ? `${((reg.km - h[idx-1].km)/reg.litros).toFixed(2)} KM/L` : "N/A";
            document.getElementById('detail-body').innerHTML = `
                <div class="detail-item"><span>Fecha</span><span>${reg.fecha}</span></div>
                <div class="detail-item"><span>Rendimiento</span><span style="color:var(--primary-green)">${eff}</span></div>
                <div class="detail-item"><span>KM Total</span><span>${reg.km.toLocaleString()}</span></div>
                <div class="detail-item"><span>Litros</span><span>${reg.litros} L</span></div>
                <div class="detail-item"><span>Costo</span><span>$${reg.costo}</span></div>`;
            detailScreen.classList.remove('hidden');
            window.history.pushState({m:1},"");
        };
        div.innerHTML = `
            <div class="activity-left">
                <div class="icon-box"><i class="fas fa-gas-pump"></i></div>
                <div class="activity-info"><h4>${reg.fecha}</h4><p>${reg.tipo}</p></div>
            </div>
            <div class="activity-right"><h4>$${reg.costo.toFixed(0)}</h4><p>${reg.km.toLocaleString()} km</p></div>`;
        list.appendChild(div);
    });
}

// REPORTES
document.getElementById('nav-reports').onclick = (e) => {
    e.preventDefault();
    const h = JSON.parse(localStorage.getItem('fuelLogs')) || [];
    if(h.length < 2) return alert("Mínimo 2 registros");
    reportsScreen.classList.remove('hidden');
    window.history.pushState({m:1},"");
    const labels = h.slice(1).map(r => r.fecha);
    const data = h.slice(1).map((r, i) => ((r.km - h[i].km)/r.litros).toFixed(2));
    const ctx = document.getElementById('efficiencyChart').getContext('2d');
    if(chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, { type: 'line', data: { labels, datasets:[{ data, borderColor:'#22c55e', tension:0.4, fill:true, backgroundColor:'rgba(34,197,94,0.1)' }] }, options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}} } });
};

document.getElementById('open-add').onclick = () => { dateInput.value = new Date().toISOString().split('T')[0]; addScreen.classList.remove('hidden'); window.history.pushState({m:1},""); };
document.getElementById('cancel-btn').onclick = () => window.history.back();
document.getElementById('close-detail').onclick = () => window.history.back();
document.getElementById('delete-btn').onclick = () => { if(confirm("¿Borrar?")) { let h = JSON.parse(localStorage.getItem('fuelLogs')); h.splice(currentDetailIndex,1); localStorage.setItem('fuelLogs',JSON.stringify(h)); window.history.back(); cargarApp(); } };
function cerrarReportes() { window.history.back(); }

window.onload = cargarApp;