function logout() {
    alert('Sesión cerrada');
    // Aquí podrías agregar lógica para limpiar tokens o redirigir a la página de inicio de sesión
}

function renderGreenChart() {
    const ctx = document.getElementById('co2Chart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
            datasets: [{
                label: 'Ahorro CO2 Mitigado (kg)',
                data: [300, 450, 600, 800, 1200, 2450],
                borderColor: '#28a745',
                backgroundColor: 'rgba(40, 167, 69, 0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
        }
    });
}

function scanHistory() {
    const query = document.getElementById('lote-id').value.trim();
    const resultsDiv = document.getElementById('timeline-results');
    
    // Buscar en la base de datos simulada (comunicación con el Productor)
    let db = JSON.parse(localStorage.getItem('roceel_db') || '[]');
    let loteEncontrado = db.find(l => l.id === query);
    
    if (loteEncontrado || query === "LOTE-DEMO") {
        const data = loteEncontrado || { name: "Manzanas Demo", date: "Hoy", coords: "25.43, -100.97" };
        resultsDiv.style.display = 'block';
        resultsDiv.innerHTML = `
            <div class="timeline-node">
                <strong>Nodo Origen:</strong> Cosechado el ${data.date}. <br>
                <em>Producto:</em> ${data.name} | <em>Coordenadas:</em> ${data.coords}
            </div>
            <div class="timeline-node">
                <strong>Nodo Tránsito:</strong> En espera de asignación de transporte logístico.
            </div>
        `;
    } else {
        alert("Lote no encontrado. Asegúrate de ingresar el ID exacto (Ej: LOTE-MX-...).");
        resultsDiv.style.display = 'none';
    }
}