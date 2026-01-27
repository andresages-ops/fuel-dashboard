// Selección de elementos
const addBtn = document.getElementById('open-add');
const addScreen = document.getElementById('add-screen');
const detailScreen = document.getElementById('detail-screen');
const reportsScreen = document.getElementById('reports-screen');
const cancelBtn = document.getElementById('cancel-btn');
const saveBtn = document.getElementById('save-btn');
const deleteBtn = document.getElementById('delete-btn');
const dateInput = document.getElementById('log-date');

let selectedFuel = "Regular";
let currentDetailIndex = null;
let chartInstance = null;

// 1. GESTIÓN DEL BOTÓN ATRÁS (Para que no se cierre la app)
// Creamos un estado falso en el historial cada vez que abrimos un modal
function pushModalState() {
    window.history.pushState({ modalOpen: true }, "");
}

window.onpopstate = function() {
    // Si el usuario da "atrás", cerramos todos los modales
    addScreen.classList.add('hidden');
    detailScreen.classList.add('hidden');
    reportsScreen.classList.add('hidden');
};

// 2. SWITCH ANIMADO (Referencia Condominio)
function switchFuel(type, index) {
    selectedFuel = type;
    const slider = document.getElementById('fuel-slider');
    const buttons = document.querySelectorAll('.seg-btn');
    
    // Movemos el fondo (píldora)
    slider.style.transform = `translateX(${index * 100}%)`;
    
    // Cambiamos clases activas
    buttons.forEach(btn => btn.classList.remove('active'));
    buttons[index].classList.add('active');
}

// 3. MANEJO DE MODALES
addBtn.addEventListener('click', () => {
    // Ponemos la fecha de hoy por defecto cada vez que se abre
    const hoy = new Date().toISOString().split('T')[0];
    dateInput.value = hoy;
    
    addScreen.classList.remove('hidden');
    pushModalState();
});

cancelBtn.addEventListener('click', () => {
    addScreen.classList.add('hidden');
    window.history.back(); // Limpiamos el historial
});

// 4. GUARDAR DATOS
saveBtn.addEventListener('click', () => {
    const l = document.getElementById('liters').value;
    const p = document.getElementById('price').value;
    const km = document.getElementById('odometer').value;
    const fechaElegida = dateInput.value;

    if(l && p && km && fechaElegida) {
        // Formatear fecha para mostrar
        const dateParts = fechaElegida.split('-');
        const fechaFormateada = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

        const nuevo = {
            litros: parseFloat(l),
            costo: parseFloat(p),
            km: parseInt(km),
            gasolinera: document.getElementById('location').value || "Desconocida",
            tipo: selectedFuel,
            notas: document.getElementById('notes').value || "",
            fecha: fechaFormateada,
            fechaRaw: fechaElegida // Guardamos la raw para ordenar si es necesario
        };

        let historial = JSON.parse(localStorage.getItem('fuelLogs')) || [];
        historial.push(nuevo);
        // Ordenar por kilometraje para que los cálculos sean correctos
        historial.sort((a, b) => a.km - b.km);
        localStorage.setItem('fuelLogs', JSON.stringify(historial));

        addScreen.classList.add('hidden');
        window.history.back();
        resetForm();
        cargarApp();
    } else {
        alert("Llena Litros, Costo, KM y Fecha");
    }
});

function resetForm() {
    document.getElementById('liters').value = '';
    document.getElementById('price').value = '';
    document.getElementById('odometer').value = '';
    document.getElementById('location').value = '';
    document.getElementById('notes').value = '';
}

// 5. CARGAR APP
function cargarApp() {
    const historial = JSON.parse(localStorage.getItem('fuelLogs')) || [];
    const list = document.getElementById('activity-list');
    
    if (historial.length === 0) {
        list.innerHTML = "<p style='text-align:center; color:gray; margin-top:20px;'>Sin registros</p>";
        return;
    }

    document.getElementById('total-spent').textContent = `$${historial.reduce((a,b)=>a+b.costo,0).toLocaleString()}`;

    if (historial.length >= 2) {
        const last = historial[historial.length-1];
        const first = historial[0];
        const totalL = historial.slice(1).reduce((a,b)=>a+b.litros,0);
        document.getElementById('avg-efficiency').textContent = ((last.km - first.km)/totalL).toFixed(1);
        
        const prev = historial[historial.length-2];
        document.getElementById('last-efficiency').textContent = ((last.km - prev.km)/last.litros).toFixed(1);
        document.getElementById('data-status').textContent = "Actualizado";
    }

    list.innerHTML = '';
    historial.slice().reverse().forEach((reg, i) => {
        const realIdx = historial.length - 1 - i;
        const div = document.createElement('div');
        div.className = 'activity-item';
        div.onclick = () => verDetalle(realIdx);
        div.innerHTML = `
            <div class="icon-box"><i class="fas fa-gas-pump"></i></div>
            <div class="details">
                <h4>${reg.fecha}</h4>
                <p>${reg.gasolinera} • ${reg.tipo}</p>
            </div>
            <div class="cost"><h4>$${reg.costo.toFixed(0)}</h4><p>${reg.km.toLocaleString()} km</p></div>
        `;
        list.appendChild(div);
    });
}

// 6. DETALLE Y BORRADO
function verDetalle(idx) {
    const historial = JSON.parse(localStorage.getItem('fuelLogs')) || [];
    const reg = historial[idx];
    currentDetailIndex = idx;
    
    let eff = "N/A";
    if (idx > 0) eff = `${((reg.km - historial[idx-1].km)/reg.litros).toFixed(2)} KM/L`;

    document.getElementById('detail-body').innerHTML = `
        <div class="detail-item"><span>Fecha</span><span>${reg.fecha}</span></div>
        <div class="detail-item"><span>Rendimiento</span><span style="color:var(--primary-green)">${eff}</span></div>
        <div class="detail-item"><span>KM Actual</span><span>${reg.km.toLocaleString()}</span></div>
        <div class="detail-item"><span>Litros</span><span>${reg.litros} L</span></div>
        <div class="detail-item"><span>Costo</span><span>$${reg.costo}</span></div>
        <div class="detail-item"><span>Tipo</span><span>${reg.tipo}</span></div>
        <div class="detail-item"><span>Notas</span><span>${reg.notas || "-"}</span></div>
    `;
    detailScreen.classList.remove('hidden');
    pushModalState();
}

deleteBtn.onclick = () => {
    if(confirm("¿Borrar este registro?")) {
        let h = JSON.parse(localStorage.getItem('fuelLogs'));
        h.splice(currentDetailIndex, 1);
        localStorage.setItem('fuelLogs', JSON.stringify(h));
        detailScreen.classList.add('hidden');
        window.history.back();
        cargarApp();
    }
};

// 7. REPORTES
document.getElementById('nav-reports').onclick = (e) => {
    e.preventDefault();
    const h = JSON.parse(localStorage.getItem('fuelLogs')) || [];
    if(h.length < 2) return alert("Necesitas 2 registros");
    
    reportsScreen.classList.remove('hidden');
    pushModalState();

    const labels = [];
    const data = [];
    for(let i=1; i<h.length; i++) {
        labels.push(h[i].fecha);
        data.push(((h[i].km - h[i-1].km)/h[i].litros).toFixed(2));
    }

    const ctx = document.getElementById('efficiencyChart').getContext('2d');
    if(chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets:[{ data, borderColor:'#22c55e', tension:0.4, fill:true, backgroundColor:'rgba(34,197,94,0.1)' }] },
        options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}} }
    });
};

function cerrarReportes() { reportsScreen.classList.add('hidden'); }
document.getElementById('close-detail').onclick = () => { detailScreen.classList.add('hidden'); window.history.back(); };

window.onload = cargarApp;