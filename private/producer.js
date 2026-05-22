// Archivo privado: Lógica de Productor
// 1. Navegación del Wizard
function goToStep(stepNumber) {
    document.querySelectorAll('.wizard-step').forEach(step => {
        step.classList.remove('active');
    });
    document.getElementById(`step-${stepNumber}`).classList.add('active');
}

// Sugerencia de Precio Dinámico
function showPriceSuggestion() {
    const category = document.getElementById('category').value;
    const hintBox = document.getElementById('price-suggestion');
    if(category === 'frutas') hintBox.innerText = "💡 Sugerencia regional: $18 - $25 MXN";
    else if (category === 'verduras') hintBox.innerText = "💡 Sugerencia regional: $12 - $16 MXN";
    else hintBox.innerText = "💡 Revisa los precios de mercado local.";
}

// Restaurar lógica original de Trueque / Venta
function togglePriceField() {
    const transactionType = document.getElementById('transaction-type').value;
    const priceInput = document.getElementById('price');
    const priceContainer = document.getElementById('price-container');
    if (transactionType === 'venta') {
        priceContainer.style.display = 'block';
        priceInput.required = true;
    } else {
        priceContainer.style.display = 'none';
        priceInput.required = false;
        priceInput.value = '';
    }
}

// Captura de Coordenadas GPS
let currentCoords = null;
function captureGPS() {
    const btn = document.getElementById('btn-gps');
    const status = document.getElementById('gps-status');
    
    if (navigator.geolocation) {
        btn.innerText = "⏳ Buscando señal...";
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentCoords = position.coords;
                btn.style.display = 'none';
                status.innerText = `✅ Ubicación validada: Lat ${position.coords.latitude.toFixed(4)}, Lon ${position.coords.longitude.toFixed(4)}`;
            },
            (error) => {
                alert("No se pudo obtener la ubicación. Verifica los permisos de tu navegador.");
                btn.innerText = "📍 Reintentar GPS";
            }
        );
    } else {
        alert("Tu dispositivo no soporta geolocalización.");
    }
}

// 2. Envío del Formulario y Lógica Offline
function handleFormSubmit(event) {
    event.preventDefault();
    const btnSubmit = document.getElementById('btn-submit');
    const name = document.getElementById('product-name').value;
    
    // Generar un ID único de Lote
    const loteID = "LOTE-MX-2026-" + Math.floor(Math.random() * 90000 + 10000);
    
    // LÓGICA OFFLINE CRUCIAL
    if (!navigator.onLine) {
        alert("⚠️ Estás sin conexión a internet. El lote se guardó en la memoria local de tu teléfono.");
        btnSubmit.innerText = "Guardado (En espera de red)";
        btnSubmit.style.backgroundColor = "#ffc107";
        btnSubmit.style.color = "black";
        
        // Guardado local (Simulación)
        localStorage.setItem('pending_lote', loteID);
        return;
    }

    // --- COMUNICACIÓN CON EL MARKETPLACE (SIMULACIÓN DE BASE DE DATOS) ---
    const loteData = {
        id: loteID,
        name: name,
        date: new Date().toLocaleDateString(),
        coords: currentCoords ? `${currentCoords.latitude.toFixed(4)}, ${currentCoords.longitude.toFixed(4)}` : "No registradas"
    };
    let db = JSON.parse(localStorage.getItem('roceel_db') || '[]');
    db.push(loteData);
    localStorage.setItem('roceel_db', JSON.stringify(db));

    // Si hay conexión: Generar URL Firmada para el QR
    const urlFirmada = `https://conectalocal.id/lote/${loteID}`;
    
    // Renderizar QR
    document.getElementById('qr-product-name-display').innerHTML = `<strong>Producto:</strong> ${name}`;
    document.getElementById('lote-id-text').innerText = loteID;
    document.getElementById('qr-code-img').src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(urlFirmada)}`;
    
    // Mostrar Modal a pantalla completa
    document.getElementById('qr-modal').style.display = 'block';
}

// 3. Lógica de la Billetera Verde
function switchWalletTab(tabName) {
    // Apagar ambas pestañas y vistas
    document.querySelectorAll('.wallet-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('view-monetary').style.display = 'none';
    document.getElementById('view-eco').style.display = 'none';
    
    // Encender la seleccionada
    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.getElementById(`view-${tabName}`).style.display = 'block';
}

function shareOnWhatsApp() {
    const url = "https://conectalocal.id/lote/" + document.getElementById('lote-id-text').innerText;
    window.open(`https://api.whatsapp.com/send?text=¡Hola! He registrado un nuevo lote de producción local. Puedes ver su trazabilidad aquí: ${url}`, '_blank');
}

// Restaurar función original para descargar QR
function downloadQR() {
    const img = document.getElementById('qr-code-img');
    if(!img.src) return;
    const link = document.createElement('a');
    link.href = img.src;
    link.download = 'Codigo_QR_Lote.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Evento para detectar cuando el celular recupera conexión (Service Worker mock)
window.addEventListener('online', () => {
    if(localStorage.getItem('pending_lote')) {
        alert("📶 Conexión recuperada. Subiendo lote pendiente en segundo plano...");
        localStorage.removeItem('pending_lote');
        document.getElementById('btn-submit').innerText = "Guardar y Generar QR";
        document.getElementById('btn-submit').style.backgroundColor = "var(--primary)";
        document.getElementById('btn-submit').style.color = "white";
    }
});