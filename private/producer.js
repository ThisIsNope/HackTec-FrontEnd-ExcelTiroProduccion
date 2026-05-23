const userStr = sessionStorage.getItem("user");
if (!userStr) {
    alert("Debes iniciar sesión para poder publicar un lote.");
    window.location.href = "../public/login.html";
}
const user = JSON.parse(userStr);

if (user) console.log("Usuario actual:", user.usuario);


// 0. Manejo de subida de imagen (Convertir a Data URL para la base de datos)
let uploadedImageUrl = "sin_imagen";

async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const btnFoto = document.getElementById('btn-foto');
        if(btnFoto) {
            btnFoto.innerHTML = "Subiendo a la nube...";
            btnFoto.disabled = true;
        }

        const formData = new FormData();
        formData.append("image", file);

        try {
            // Nota: Para producción, crea una API key gratis en api.imgbb.com
            const API_KEY = "a778269952031145c642a14d4008741c"; // Key pública de prueba (mejor obtener una propia)
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${API_KEY}`, {
                method: "POST",
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Reemplazamos el link falso por el link real devuelto por la nube
                uploadedImageUrl = result.data.url; 
                
                btnFoto.innerHTML = "✅ Foto Guardada";
                btnFoto.classList.remove('btn-outline-secondary');
                btnFoto.classList.add('btn-success', 'text-white');
            } else {
                alert("Error al subir la imagen. Intenta de nuevo.");
                btnFoto.innerHTML = "📷 Reintentar Foto";
            }
        } catch (error) {
            console.error("Error subiendo foto:", error);
            alert("No se pudo conectar al servidor de imágenes.");
            btnFoto.innerHTML = "📷 Reintentar Foto";
        } finally {
            if(btnFoto) btnFoto.disabled = false;
        }
    }
}

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
let mapOrigen = null;
let markerOrigen = null;

// Búsqueda manual de dirección por texto
async function searchAddress() {
    const query = document.getElementById('address-search').value;
    const status = document.getElementById('gps-status');
    const btnGps = document.getElementById('btn-gps');
    
    if (!query) {
        alert("Por favor ingresa una dirección para buscar.");
        return;
    }

    status.innerText = "⏳ Buscando dirección...";
    btnGps.style.display = 'none';

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            
            currentCoords = { latitude: lat, longitude: lon };
            status.innerText = "✅ Ubicación encontrada en el mapa.";
            
            mostrarMapaLeaflet(lat, lon);
        } else {
            status.innerText = "❌ No se encontró la dirección. Intenta de nuevo o usa el GPS.";
            btnGps.style.display = 'block';
        }
    } catch (error) {
        console.error("Error buscando dirección:", error);
        status.innerText = "❌ Error de conexión al buscar la dirección.";
        btnGps.style.display = 'block';
    }
}

function captureGPS() {
    const btn = document.getElementById('btn-gps');
    const status = document.getElementById('gps-status');
    if (navigator.geolocation) {
        btn.innerText = "⏳ Buscando señal de satélite...";
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                currentCoords = position.coords;
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                btn.style.display = 'none';
                status.innerText = "✅ Ubicación precisa en el mapa.";
                
                mostrarMapaLeaflet(lat, lon);
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

// Función auxiliar para renderizar el mapa sin repetir código
function mostrarMapaLeaflet(lat, lon) {
    const mapContainer = document.getElementById('map-origen');
    mapContainer.style.display = 'block';
    
    if (!mapOrigen) {
        mapOrigen = L.map('map-origen', { scrollWheelZoom: false }).setView([lat, lon], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapOrigen);
        markerOrigen = L.marker([lat, lon]).addTo(mapOrigen);
    } else {
        mapOrigen.setView([lat, lon], 16);
        markerOrigen.setLatLng([lat, lon]);
    }
    // Corregir tamaño del mapa al mostrarlo por primera vez
    setTimeout(() => mapOrigen.invalidateSize(), 100);
}

// 2. Envío del Formulario y Lógica Offline
async function handleFormSubmit(event) {
    event.preventDefault();

    // 1. Cambiamos el texto del botón para dar feedback de carga
    const btnSubmit = document.getElementById('btn-submit');
    const originalText = btnSubmit.innerHTML;
    btnSubmit.innerHTML = "⏳ Guardando...";
    btnSubmit.disabled = true;

    const sessionUser = JSON.parse(sessionStorage.getItem("user"));
    if (!sessionUser) {
        alert("Sesión expirada. Por favor inicia sesión nuevamente.");
        window.location.href = "../public/login.html";
        return;
    }
    const idUsuarios = sessionUser.usuario;
    
    // Validar que se haya obtenido la ubicación GPS
    if (!currentCoords) {
        alert("Por favor, obtén la ubicación GPS del lote antes de guardar.");
        btnSubmit.disabled = false;
        return;
    }

    const idCategoria = getCategoriaId(document.getElementById('category').value);
    const idTipoPublicacion = document.getElementById('transaction-type').value === 'venta' ? 1 : 2;
    const nombre = document.getElementById('product-name').value;
    const descripcion = document.getElementById('product-description').value;
    const cantidad = document.getElementById('quantity').value;
    const precio = idTipoPublicacion === 1 ? document.getElementById('price').value : null;
    const unidadMedida = document.getElementById('unit').value;
    const urlImagen = uploadedImageUrl;
    const latitud = currentCoords.latitude;
    const longitud = currentCoords.longitude;
    const peso = document.getElementById('peso').value;

    const API_URL = "https://calamity-hypertext-strenuous.ngrok-free.dev";

    try {
        const res = await fetch(`${API_URL}/producto`, {
            method: "POST",
            // Asegúrate de que tu backend espera este orden y tipos de datos
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true"
            },
            body: JSON.stringify([idCategoria, idTipoPublicacion, idUsuarios, nombre, descripcion, cantidad, precio, unidadMedida, urlImagen, latitud, longitud, peso])
        });

        const data = await res.json(); // Se espera que el backend devuelva un objeto JSON

        if (data.ok) {
            // 2. Mostrar el modal de QR en lugar de solo un alert
            document.getElementById('qr-product-name-display').innerText = nombre;
            const randomId = Math.floor(1000 + Math.random() * 9000);
            document.getElementById('lote-id-text').innerText = `LOTE-MX-${randomId}`;
            
            // Generar QR visual usando una API pública basada en los datos
            document.getElementById('qr-code-img').src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ConectaLocal-LOTE-MX-${randomId}`;
            
            document.getElementById('qr-modal').style.display = 'block';
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
        alert("Error al conectar con el servidor");
    } finally {
        // 3. Restaurar el botón al terminar (ya sea éxito o error)
        btnSubmit.innerHTML = originalText;
        btnSubmit.disabled = false;
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