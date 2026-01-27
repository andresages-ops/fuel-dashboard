const addBtn = document.querySelector('.fab-btn');
const addScreen = document.getElementById('add-screen');
const cancelBtn = document.getElementById('cancel-btn');
const saveBtn = document.getElementById('save-btn');

// 1. Mostrar/Ocultar Pantalla
addBtn.addEventListener('click', () => addScreen.classList.remove('hidden'));
cancelBtn.addEventListener('click', () => addScreen.classList.add('hidden'));

// 2. Guardar Datos
saveBtn.addEventListener('click', () => {
    const litros = document.getElementById('liters').value;
    const costo = document.getElementById('price').value;
    const km = document.getElementById('odometer').value;

    if(litros && costo && km) {
        const nuevoRegistro = {
            litros: parseFloat(litros),
            costo: parseFloat(costo),
            km: parseInt(km),
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
        
        cargarApp();
    } else {
        alert("Por favor llena todos los campos");
    }
});

// 3. Cargar Datos y Cálculos
function cargarApp() {
    const historial = JSON.parse(localStorage.getItem('fuelLogs')) || [];
    const activityList = document.getElementById('activity-list');
    
    if (historial.length === 0) return;

    // Actualizar Gasto Total
    const total = historial.reduce((acc, r) => acc + r.costo, 0);
    document.getElementById('total-spent').textContent = `$${total.toFixed(2)}`;

    // Calcular Eficiencia
    if (historial.length >= 2) {
        const last = historial[historial.length - 1];
        const prev = historial[historial.length - 2];
        
        const kmRecorridosTotal = last.km - historial[0].km;
        const litrosTotales = historial.slice(1).reduce((acc, r) => acc + r.litros, 0);
        
        const avgEff = kmRecorridosTotal / litrosTotales;
        document.getElementById('avg-efficiency').textContent = avgEff.toFixed(1);

        const lastEff = (last.km - prev.km) / last.litros;
        document.getElementById('last-efficiency').textContent = lastEff.toFixed(1);
    }

    // Dibujar Lista (últimos 3)
    activityList.innerHTML = '';
    historial.slice(-3).reverse().forEach(reg => {
        const div = document.createElement('div');
        div.className = 'activity-item';
        div.innerHTML = `
            <div class="icon-box"><i class="fas fa-gas-pump"></i></div>
            <div class="details">
                <h4>Carga ${reg.fecha}</h4>
                <p>${reg.litros}L @ $${(reg.costo/reg.litros).toFixed(2)}/L</p>
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