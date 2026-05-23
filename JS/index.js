const API_URL = "https://calamity-hypertext-strenuous.ngrok-free.dev";
const user = JSON.parse(sessionStorage.getItem("user"));
let cotizacion = [];
let mapDestino = null;
let markerDestino = null;
let destinoLat = null;
let destinoLng = null;

document.addEventListener("DOMContentLoaded", async () => {
    await cargarProductos();
    iniciarMapa();
});

function iniciarMapa() {
    mapDestino = L.map('map-destino').setView([25.6866, -100.3161], 12); // Monterrey por default
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(mapDestino);

    // Click en el mapa para seleccionar destino
    mapDestino.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        await setDestino(lat, lng);
    });
}

async function setDestino(lat, lng) {
    destinoLat = lat;
    destinoLng = lng;

    if (markerDestino) markerDestino.remove();
    markerDestino = L.marker([lat, lng]).addTo(mapDestino);

    // Reverse geocoding
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
    const data = await res.json();
    document.getElementById("destino-texto").innerText = `📍 ${data.display_name}`;

    // Calcular distancia a cada producto y actualizar cards
    actualizarDistancias(lat, lng);
}

let searchTimeout = null;
async function buscarDireccion() {
    const query = document.getElementById("search-destino").value;
    if (query.length < 3) return;

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`);
        const resultados = await res.json();

        const lista = document.getElementById("search-results");
        lista.innerHTML = resultados.map(r => `
            <button class="list-group-item list-group-item-action small py-1"
                onclick="seleccionarResultado(${r.lat}, ${r.lon}, '${r.display_name.replace(/'/g, "")}')">
                ${r.display_name}
            </button>
        `).join("");
    }, 400);
}

async function seleccionarResultado(lat, lng, nombre) {
    document.getElementById("search-results").innerHTML = "";
    document.getElementById("search-destino").value = nombre;
    mapDestino.setView([lat, lng], 15);
    await setDestino(lat, lng);
}

async function generarOrden() {
    if (cotizacion.length === 0) {
        alert("No hay productos en la cotización");
        return;
    }
    if (!user) {
        alert("Debes iniciar sesión para generar una orden");
        return;
    }
    if (!destinoLat || !destinoLng) {
        alert("Por favor selecciona tu dirección de entrega en el mapa");
        return;
    }

    try {
        for (const p of cotizacion) {
            await fetch(`${API_URL}/intercambio`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "ngrok-skip-browser-warning": "true"
                },
                body: JSON.stringify([p.idProducto, user.usuario, destinoLat, destinoLng])
            });
        }
        alert("¡Orden generada correctamente!");
        cotizacion = [];
        destinoLat = null;
        destinoLng = null;
        if (markerDestino) markerDestino.remove();
        document.getElementById("destino-texto").innerText = "";
        document.getElementById("search-destino").value = "";
        actualizarCotizador();
    } catch (err) {
        console.error(err);
        alert("Error al generar la orden");
    }
}

async function cargarProductos() {
    try {
        const res = await fetch(`${API_URL}/productos`, {
            headers: { "ngrok-skip-browser-warning": "true" }
        });
        const data = await res.json();
        if (data.ok) renderProductos(data.productos);
    } catch (err) {
        console.error(err);
    }
}

function renderProductos(productos) {
    const grid = document.getElementById("products-grid");
    grid.innerHTML = "";
    productos.forEach(p => {
        const precio = p.precio ? `$${p.precio.toLocaleString()} / ${p.unidadMedida}` : "Trueque";
        const col = document.createElement("div");
        col.className = "col-md-6";
        col.dataset.lat = p.lat || "";
        col.dataset.lng = p.lng || "";
        col.innerHTML = `
            <div class="card h-100 shadow-sm">
                <img src="${p.urlImagen}" class="card-img-top" alt="${p.nombre}" 
                     style="height: 150px; object-fit: cover;"
                     onerror="this.src='https://via.placeholder.com/400x150?text=Sin+imagen'">
                <div class="card-body">
                    <h5 class="card-title fw-bold">${p.nombre}</h5>
                    <p class="card-text text-muted small mb-1">${p.productor}</p>
                    <p class="fw-bold text-primary mb-2">${precio}</p>
                    <div class="badge bg-light text-success mb-1">🏷️ ${p.categoria}</div>
                    <div class="badge bg-light text-primary mb-3 dist-badge">
                        ${destinoLat ? `📦 ${haversineKm(p.lat, p.lng, destinoLat, destinoLng).toFixed(1)} km` : "📦 Selecciona destino para ver distancia"}
                    </div>
                    <button class="btn btn-outline-primary btn-sm w-100 rounded-pill"
                        onclick="agregarCotizacion(${p.idProducto}, '${p.nombre}', ${p.precio || 0})">
                        Añadir a Cotización
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(col);
    });
}

function agregarCotizacion(idProducto, nombre, precio) {
    const existe = cotizacion.find(p => p.idProducto === idProducto);
    if (existe) {
        alert("Este producto ya está en tu cotización");
        return;
    }
    cotizacion.push({ idProducto, nombre, precio });
    actualizarCotizador();
}

function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function quitarCotizacion(idProducto) {
    cotizacion = cotizacion.filter(p => p.idProducto !== idProducto);
    actualizarCotizador();
}

function actualizarCotizador() {
    const contenedor = document.getElementById("cotizacion-lista");
    const subtotalEl = document.getElementById("subtotal");

    if (cotizacion.length === 0) {
        contenedor.innerHTML = `<p class="text-muted small">No hay lotes seleccionados</p>`;
    } else {
        contenedor.innerHTML = cotizacion.map(p => `
            <div class="d-flex justify-content-between align-items-center mb-2 small">
                <span>${p.nombre}</span>
                <div class="d-flex align-items-center gap-2">
                    <span class="fw-bold">${p.precio ? '$' + p.precio.toLocaleString() : 'Trueque'}</span>
                    <button class="btn btn-sm btn-outline-danger rounded-pill px-2 py-0"
                        onclick="quitarCotizacion(${p.idProducto})">✕</button>
                </div>
            </div>
        `).join("");
    }

    const subtotal = cotizacion.reduce((acc, p) => acc + (p.precio || 0), 0);
    subtotalEl.innerText = `$${subtotal.toLocaleString()}`;
}

async function aplicarFiltros() {
    const tipo = document.getElementById("filter-tipo-productor").value;
    try {
        const res = await fetch(`${API_URL}/productos/filtro?tipo=${tipo}`, {
            headers: { "ngrok-skip-browser-warning": "true" }
        });
        const data = await res.json();
        if (data.ok) renderProductos(data.productos);
    } catch (err) {
        console.error(err);
    }
}

function actualizarDistancias(destLat, destLng) {
    // Obtener productos actuales del grid
    const cards = document.querySelectorAll("#products-grid .col-md-6");
    cards.forEach(card => {
        const distBadge = card.querySelector(".dist-badge");
        const prodLat = card.dataset.lat;
        const prodLng = card.dataset.lng;

        if (prodLat && prodLng && distBadge) {
            const km = haversineKm(parseFloat(prodLat), parseFloat(prodLng), destLat, destLng);
            distBadge.innerText = `📦 ${km.toFixed(1)} km de distancia`;
        } else if (distBadge) {
            distBadge.innerText = "📦 Distancia no disponible";
        }
    });
}

function logout() {
    sessionStorage.clear();
    window.location.href = "login.html";
}