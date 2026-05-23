const API_URL = "https://calamity-hypertext-strenuous.ngrok-free.dev";
const userStr = sessionStorage.getItem("user");
if (!userStr) {
    alert("Debes iniciar sesión.");
    window.location.href = "../public/login.html";
}
const user = JSON.parse(userStr);

let mapRuta = null;
let intercambios = [];
let pesoTotal = 0;
const CAPACIDAD_MAX = 3.5; // toneladas

document.addEventListener("DOMContentLoaded", async () => {
    await cargarIntercambios();
    iniciarMapa();
});

function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function cargarIntercambios() {
    try {
        const res = await fetch(`${API_URL}/intercambios/pendientes`, {
            headers: { "ngrok-skip-browser-warning": "true" }
        });
        const data = await res.json();
        if (data.ok) {
            intercambios = data.intercambios;
            renderLotes(intercambios);
            calcularCapacidad(intercambios);
            renderItinerario(intercambios);
        }
    } catch (err) {
        console.error(err);
    }
}

function iniciarMapa() {
    // Leaflet
    const head = document.head;
    const linkLeaflet = document.createElement("link");
    linkLeaflet.rel = "stylesheet";
    linkLeaflet.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    head.appendChild(linkLeaflet);

    const scriptLeaflet = document.createElement("script");
    scriptLeaflet.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    scriptLeaflet.onload = () => {
        mapRuta = L.map('map-ruta').setView([25.6866, -100.3161], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(mapRuta);
        renderMarcadores();
    };
    document.body.appendChild(scriptLeaflet);
}

function renderMarcadores() {
    if (!mapRuta) return;
    intercambios.forEach((i, idx) => {
        if (i.origen_lat && i.origen_lng) {
            L.marker([i.origen_lat, i.origen_lng])
                .addTo(mapRuta)
                .bindPopup(`
                    <b>📦 Origen: ${i.producto}</b><br>
                    Productor: ${i.productor}<br>
                    ${i.cantidad} ${i.unidadMedida}
                `);
        }
        if (i.destino_lat && i.destino_lng) {
            L.marker([i.destino_lat, i.destino_lng], {
                icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
                    iconSize: [25, 41], iconAnchor: [12, 41]
                })
            }).addTo(mapRuta)
            .bindPopup(`
                <b>🏁 Destino: ${i.comprador}</b><br>
                Producto: ${i.producto}
            `);

            // Línea entre origen y destino
            if (i.origen_lat && i.origen_lng) {
                L.polyline([
                    [i.origen_lat, i.origen_lng],
                    [i.destino_lat, i.destino_lng]
                ], { color: '#0d6efd', weight: 2, dashArray: '6,6' }).addTo(mapRuta);
            }
        }
    });

    // CO2 total
    let totalCO2 = 0;
    intercambios.forEach(i => {
        if (i.origen_lat && i.destino_lat && i.peso) {
            const km = haversineKm(i.origen_lat, i.origen_lng, i.destino_lat, i.destino_lng);
            totalCO2 += km * parseFloat(i.peso) * 0.062;
        }
    });
    document.getElementById("co2-ruta").innerText = `${totalCO2.toFixed(2)} kg`;
}

function calcularCapacidad(intercambios) {
    pesoTotal = intercambios.reduce((acc, i) => acc + (parseFloat(i.peso) || 0), 0);
    const porcentaje = Math.min((pesoTotal / CAPACIDAD_MAX) * 100, 100).toFixed(0);
    document.getElementById("peso-actual").innerText = `${pesoTotal.toFixed(2)}`;
    document.getElementById("porcentaje-capacidad").innerText = `${porcentaje}% Lleno`;
    document.getElementById("barra-capacidad").style.width = `${porcentaje}%`;
    document.getElementById("barra-capacidad").className = `progress-bar ${porcentaje > 80 ? 'bg-danger' : 'bg-warning'} `;
}

function renderItinerario(intercambios) {
    const contenedor = document.getElementById("itinerario");
    if (intercambios.length === 0) {
        contenedor.innerHTML = `<p class="text-muted small">No hay paradas pendientes.</p>`;
        return;
    }
    const colores = ['bg-primary', 'bg-warning', 'bg-success', 'bg-info', 'bg-danger'];
    contenedor.innerHTML = intercambios.map((i, idx) => {
        const km = (i.origen_lat && i.destino_lat)
            ? haversineKm(i.origen_lat, i.origen_lng, i.destino_lat, i.destino_lng).toFixed(1)
            : "?";
        return `
            <div class="mb-4 position-relative">
                <div class="position-absolute ${colores[idx % colores.length]} rounded-circle" style="width:16px;height:16px;left:-33px;top:4px;"></div>
                <h6 class="fw-bold mb-1">Parada ${idx + 1}: ${i.productor} → ${i.comprador}</h6>
                <p class="text-muted small mb-0">📦 ${i.producto} | ${i.cantidad} ${i.unidadMedida} | 📍 ${km} km</p>
                <span class="badge bg-light text-dark border mt-1">${i.peso ? i.peso + ' ton' : 'Peso no registrado'}</span>
            </div>
        `;
    }).join("");
}

function renderLotes(intercambios) {
    const contenedor = document.getElementById("lotes-lista");
    if (intercambios.length === 0) {
        contenedor.innerHTML = `<p class="text-muted small text-center">No hay lotes pendientes.</p>`;
        return;
    }
    contenedor.innerHTML = intercambios.map(i => `
        <div class="card border rounded-3 mb-3 bg-light">
            <div class="card-body p-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div>
                        <span class="badge bg-dark">ID: #${i.idIntercambio}</span>
                        <span class="badge ${i.idTipoPublicacion === 1 ? 'bg-primary' : 'bg-info text-dark'} ms-1">
                            ${i.idTipoPublicacion === 1 ? 'Venta' : 'Trueque'}
                        </span>
                    </div>
                    <span class="text-warning small fw-bold">⏳ Pendiente</span>
                </div>
                <h6 class="fw-bold mb-1">${i.producto}</h6>
                <p class="small text-muted mb-1">
                    🏭 Productor: ${i.productor}<br>
                    🧑 Comprador: ${i.comprador}<br>
                    📦 ${i.cantidad} ${i.unidadMedida} ${i.peso ? '| ' + i.peso + ' ton' : ''}
                </p>
                <div class="d-flex gap-2 mt-2">
                    <button class="btn btn-success btn-sm rounded-pill fw-bold w-50"
                        onclick="actualizarEstado(${i.idIntercambio}, 2)">
                        ✅ Aprobar
                    </button>
                    <button class="btn btn-outline-danger btn-sm rounded-pill fw-bold w-50"
                        onclick="actualizarEstado(${i.idIntercambio}, 3)">
                        ✕ Rechazar
                    </button>
                </div>
            </div>
        </div>
    `).join("");
}

async function actualizarEstado(idIntercambio, idEstado) {
    try {
        const res = await fetch(`${API_URL}/intercambio/${idIntercambio}/estado`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true"
            },
            body: JSON.stringify([idEstado])
        });
        const data = await res.json();
        if (data.ok) {
            alert(idEstado === 2 ? "✅ Lote aprobado" : "❌ Lote rechazado");
            await cargarIntercambios();
            renderMarcadores();
        }
    } catch (err) {
        console.error(err);
    }
}