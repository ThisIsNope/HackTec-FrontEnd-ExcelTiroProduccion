const user = JSON.parse(sessionStorage.getItem("user"));

console.log(user.usuario);









// Archivo privado: Lógica de Productor
// 1. Navegación del Wizard
function goToStep(stepNumber) {
    if (stepNumber === 2) {
        const nombre = document.getElementById('product-name').value;
        const descripcion = document.getElementById('product-description').value;
        if (!nombre || !descripcion) {
            alert("Por favor llena todos los campos antes de continuar");
            return;
        }
    }

    if (stepNumber === 3) {
        const cantidad = document.getElementById('quantity').value;
        const transactionType = document.getElementById('transaction-type').value;
        const precio = document.getElementById('price').value;
        if (!cantidad) {
            alert("Por favor llena la cantidad");
            return;
        }
        if (transactionType === 'venta' && !precio) {
            alert("Por favor ingresa el precio");
            return;
        }
    }

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
async function handleFormSubmit(event) {
    event.preventDefault();

    const user = JSON.parse(sessionStorage.getItem("user"));
    const idUsuarios = user.usuario;

    const idCategoria = getCategoriaId(document.getElementById('category').value);
    const idTipoPublicacion = document.getElementById('transaction-type').value === 'venta' ? 1 : 2;
    const nombre = document.getElementById('product-name').value;
    const descripcion = document.getElementById('product-description').value;
    const cantidad = document.getElementById('quantity').value;
    const precio = idTipoPublicacion === 1 ? document.getElementById('price').value : null;
    const unidadMedida = document.getElementById('unit').value;
    const urlImagen = "sin_imagen"; // placeholder por ahora

    const API_URL = "https://calamity-hypertext-strenuous.ngrok-free.dev";

    try {
        const res = await fetch(`${API_URL}/producto`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true"
            },
            body: JSON.stringify([idCategoria, idTipoPublicacion, idUsuarios, nombre, descripcion, cantidad, precio, unidadMedida, urlImagen])
        });

        const data = await res.json();

        if (data.ok) {
            alert("Producto registrado correctamente");
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
        alert("Error al conectar con el servidor");
    }
}

function getCategoriaId(categoria) {
    const categorias = {
        "frutas": 1,
        "verduras": 2,
        "madera": 3,
        "textil": 4,
        "carton": 5
    };
    return categorias[categoria] || 1;
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