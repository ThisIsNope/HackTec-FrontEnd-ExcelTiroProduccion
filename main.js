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
    // Simula la obtención de trazabilidad mostrando la línea de tiempo
    document.getElementById('timeline-results').style.display = 'block';
}