// Selección de elementos
const addBtn = document.getElementById('open-add');
const addScreen = document.getElementById('add-screen');
const cancelBtn = document.getElementById('cancel-btn');
const saveBtn = document.getElementById('save-btn');
const reportsScreen = document.getElementById('reports-screen');
const navReports = document.getElementById('nav-reports');

let selectedFuel = "Regular";
let chartInstance = null; // Para destruir y recrear la gráfica sin errores

// 1. Manejo de Interfaz
addBtn.addEventListener('click', () => addScreen.classList.remove('hidden'));
cancelBtn.addEventListener('click', () => addScreen.classList.add('hidden'));

document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        selectedFuel = e.target.dataset.type;
    });
});

// 2. Guardar Datos
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
            fecha: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
        };

        let historial = JSON.parse(localStorage.getItem('fuelLogs')) || [];
        historial.push(nuevoRegistro);
        localStorage.setItem('fuelLogs', JSON.stringify(historial));

        addScreen.classList.add('hidden');
        // Limpiar campos
        document.getElementById('liters').value = '';
        document.getElementById('price').value = '';
        document.getElementById('odometer').value = '';
        document.getElementById('location').value = '';
        document.getElementById('notes').value = '';
        
        cargarApp();
    } else {
        alert("Campos obligatorios: Litros, Costo y KM");
    }
});

// 3. Lógica de la Gráfica
function mostrarGrafica() {
    const historial = JSON.parse(localStorage.getItem('fuelLogs')) || [];
    if (historial.length < 2) {
        alert("Necesitas al menos 2 registros para analizar el rendimiento.");
        return;
    }

    reportsScreen.classList.remove('hidden');
    
    const etiquetas = [];
    const datosEficiencia = [];

    // Calcular eficiencia entre puntos
    for (let i = 1; i < historial.length; i++) {
        const kmRecorridos = historial[i].km - historial[i-1].km;
        const eficiencia = kmRecorridos / historial[i].litros;
        etiquetas.push(historial[i].fecha);
        datosEficiencia.push(eficiencia.toFixed(2));
    }

    const ctx = document.getElementById('efficiencyChart').getContext('2d');
    
    if (chartInstance) chartInstance.destroy(); // Limpiar gráfica anterior

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: etiquetas,
            datasets: [{
                label: 'KM/L',
                data: datosEficiencia,
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#22c55e'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: '#2d3b33' }, ticks: { color: '#8899a6' } },
                x: { grid: { display: false }, ticks: { color: '#8899a6' } }
            }
        }
    });
}

function cerrarReportes() {
    reportsScreen.classList.add('hidden');
}

navReports.addEventListener('click', (e) => {
    e.preventDefault();
    mostrarGrafica();
});

// 4. Cargar Dashboard
function cargarApp() {
    const historial = JSON.parse(localStorage.getItem('fuelLogs')) || [];
    const activityList = document.getElementById('activity-list');
    
    if (historial.length === 0) return;

    document.getElementById('data-status').textContent = "Actualizado";

    // Gasto Total
    const total = historial.reduce((acc, r) => acc + r.costo, 0);
    document.getElementById('total-spent').textContent = `$${total.toLocaleString('es-MX', {minimumFractionDigits: 2})}`;

    // Eficiencias
    if (historial.length >= 2) {
        const last = historial[historial.length - 1];
        const prev = historial[historial.length - 2];
        
        // Promedio total desde el inicio
        const kmTotal = last.km - historial[0].km;
        const litrosTotal = historial.slice(1).reduce((acc, r) => acc + r.litros, 0);
        const avg = kmTotal / litrosTotal;
        document.getElementById('avg-efficiency').textContent = avg.toFixed(1);

        // Último tramo
        const lastEff = (last.km - prev.km) / last.litros;
        document.getElementById('last-efficiency').textContent = lastEff.toFixed(1);
    }

    // Lista de actividad
    activityList.innerHTML = '';
    historial.slice(-3).reverse().forEach(reg => {
        const div = document.createElement('div');
        div.className = 'activity-item';
        div.innerHTML = `
            <div class="icon-box"><i class="fas fa-gas-pump"></i></div>
            <div class="details">
                <h4>${reg.fecha} - ${reg.tipo}</h4>
                <p>${reg.gasolinera}</p>
                <p style="font-style: italic; font-size: 0.7rem;">${reg.notas}</p>
            </div>
            <div class="cost">
                <h4>$${reg.costo.toFixed(2)}</h4>
                <p>${reg.km} km</p>
            </div>
        `;
        activityList.appendChild(div);
    });
}

window.onload = cargarApp;