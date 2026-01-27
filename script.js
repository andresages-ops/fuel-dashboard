// Selección de elementos
const addBtn = document.getElementById('open-add');
const addScreen = document.getElementById('add-screen');
const detailScreen = document.getElementById('detail-screen');
const cancelBtn = document.getElementById('cancel-btn');
const closeDetail = document.getElementById('close-detail');
const saveBtn = document.getElementById('save-btn');
const deleteBtn = document.getElementById('delete-btn');
const reportsScreen = document.getElementById('reports-screen');
const navReports = document.getElementById('nav-reports');

let selectedFuel = "Regular";
let chartInstance = null;
let currentDetailIndex = null;

// 1. Manejo del Switch Segmentado
document.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        selectedFuel = e.target.dataset.type;
    });
});

// 2. Mostrar/Ocultar Modales
addBtn.addEventListener('click', () => addScreen.classList.remove('hidden'));
cancelBtn.addEventListener('click', () => addScreen.classList.add('hidden'));
closeDetail.addEventListener('click', () => detailScreen.classList.add('hidden'));

// 3. Guardar Datos
saveBtn.addEventListener('click', () => {
    const litros = document.getElementById('liters').value;
    const costo = document.getElementById('price').value;
    const km = document.getElementById('odometer').value;
    const loc = document.getElementById('location').value;
    const note = document.getElementById('notes').value;

    if(litros && costo && km) {
        const nuevoRegistro = {
            litros: parseFloat(litros),
            costo: parseFloat(costo),
            km: parseInt(km),
            gasolinera: loc || "Desconocida",
            tipo: selectedFuel,
            notas: note || "",
            fecha: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
        };

        let historial = JSON.parse(localStorage.getItem('fuelLogs')) || [];
        historial.push(nuevoRegistro);
        localStorage.setItem('fuelLogs', JSON.stringify(historial));

        addScreen.classList.add('hidden');
        resetForm();
        cargarApp();
    } else {
        alert("Completa Litros, Costo y KM");
    }
});

function resetForm() {
    document.getElementById('liters').value = '';
    document.getElementById('price').value = '';
    document.getElementById('odometer').value = '';
    document.getElementById('location').value = '';
    document.getElementById('notes').value = '';
}

// 4. Detalle y Borrado
function verDetalle(index) {
    const historial = JSON.parse(localStorage.getItem('fuelLogs')) || [];
    const reg = historial[index];
    currentDetailIndex = index;
    
    let eficienciaHTML = "N/A (Primer registro)";
    if (index > 0) {
        const kmRecorridos = reg.km - historial[index-1].km;
        eficienciaHTML = `${(kmRecorridos / reg.litros).toFixed(2)} KM/L`;
    }

    document.getElementById('detail-body').innerHTML = `
        <div class="detail-item"><span>Fecha</span><span>${reg.fecha}</span></div>
        <div class="detail-item"><span>Rendimiento</span><span style="color:var(--primary-green)">${eficienciaHTML}</span></div>
        <div class="detail-item"><span>Kilometraje</span><span>${reg.km.toLocaleString()} km</span></div>
        <div class="detail-item"><span>Litros</span><span>${reg.litros} L</span></div>
        <div class="detail-item"><span>Tipo</span><span>${reg.tipo}</span></div>
        <div class="detail-item"><span>Costo Total</span><span>$${reg.costo.toFixed(2)}</span></div>
        <div class="detail-item"><span>Gasolinera</span><span>${reg.gasolinera}</span></div>
        <div class="detail-item"><span>Notas</span><span>${reg.notas || "Sin notas"}</span></div>
    `;
    detailScreen.classList.remove('hidden');
}

deleteBtn.addEventListener('click', () => {
    if(confirm("¿Estás seguro de eliminar este registro?")) {
        let historial = JSON.parse(localStorage.getItem('fuelLogs')) || [];
        historial.splice(currentDetailIndex, 1);
        localStorage.setItem('fuelLogs', JSON.stringify(historial));
        detailScreen.classList.add('hidden');
        cargarApp();
    }
});

// 5. Cargar Dashboard
function cargarApp() {
    const historial = JSON.parse(localStorage.getItem('fuelLogs')) || [];
    const activityList = document.getElementById('activity-list');
    
    if (historial.length === 0) {
        document.getElementById('activity-list').innerHTML = "<p style='color:var(--text-gray); text-align:center;'>Sin actividad</p>";
        return;
    }

    document.getElementById('data-status').textContent = "Actualizado";

    // Totales
    const total = historial.reduce((acc, r) => acc + r.costo, 0);
    document.getElementById('total-spent').textContent = `$${total.toLocaleString()}`;

    // Eficiencias
    if (historial.length >= 2) {
        const last = historial[historial.length - 1];
        const prev = historial[historial.length - 2];
        const avg = (last.km - historial[0].km) / historial.slice(1).reduce((acc, r) => acc + r.litros, 0);
        document.getElementById('avg-efficiency').textContent = avg.toFixed(1);
        document.getElementById('last-efficiency').textContent = ((last.km - prev.km) / last.litros).toFixed(1);
    }

    // Dibujar Lista
    activityList.innerHTML = '';
    historial.slice(-5).reverse().forEach((reg, i) => {
        const realIndex = historial.length - 1 - i;
        const div = document.createElement('div');
        div.className = 'activity-item';
        div.onclick = () => verDetalle(realIndex);
        div.innerHTML = `
            <div class="icon-box"><i class="fas fa-gas-pump"></i></div>
            <div class="details">
                <h4>${reg.fecha.split(',')[0]}</h4>
                <p>${reg.gasolinera} • ${reg.tipo}</p>
            </div>
            <div class="cost"><h4>$${reg.costo.toFixed(0)}</h4><p>${reg.km.toLocaleString()} km</p></div>
        `;
        activityList.appendChild(div);
    });
}

// 6. Reportes
function mostrarGrafica() {
    const historial = JSON.parse(localStorage.getItem('fuelLogs')) || [];
    if (historial.length < 2) return alert("Necesitas al menos 2 registros");
    reportsScreen.classList.remove('hidden');
    const labels = [];
    const data = [];
    for (let i = 1; i < historial.length; i++) {
        labels.push(historial[i].fecha.split(' ')[0]);
        data.push(((historial[i].km - historial[i-1].km) / historial[i].litros).toFixed(2));
    }
    const ctx = document.getElementById('efficiencyChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{ data, borderColor: '#22c55e', tension: 0.4, fill: true, backgroundColor: 'rgba(34, 197, 94, 0.1)' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

function cerrarReportes() { reportsScreen.classList.add('hidden'); }
navReports.addEventListener('click', (e) => { e.preventDefault(); mostrarGrafica(); });
window.onload = cargarApp;