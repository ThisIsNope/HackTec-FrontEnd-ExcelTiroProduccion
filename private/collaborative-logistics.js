const API_URL = "https://calamity-hypertext-strenuous.ngrok-free.dev";
const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";

const userStr = sessionStorage.getItem("user");
if (!userStr) {
    alert("Debes iniciar sesión.");
    window.location.href = "../public/login.html";
}
const user = JSON.parse(userStr);

let mapRuta = null;
let intercambios = [];
let viajes = [];
const CAPACIDAD_MAX = 3.5;

document.addEventListener("DOMContentLoaded", async () => {
    cargarLeaflet(() => {
        iniciarMapa();
        cargarViajes();
    });
});

function cargarLeaflet(callback) {
    if (window.L) { callback(); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = callback;
    document.body.appendChild(script);
}

function iniciarMapa() {
    mapRuta = L.map('map-ruta').setView([25.6866, -100.3161], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(mapRuta);
}

async function cargarViajes() {
    try {
        const res = await fetch(`${API_URL}/viajes`, {
            headers: { "ngrok-skip-browser-warning": "true" }
        });
        const data = await res.json();
        if (data.ok) {
            viajes = data.viajes;
            // Juntar todos los intercambios para capacidad e itinerario
            intercambios = viajes.flatMap(v => v.intercambios);
            renderViajes(viajes);
            calcularCapacidad(intercambios);
            renderItinerario(viajes);
            renderMarcadores(viajes);
        }
    } catch (err) {
        console.error(err);
    }
}

async function generarViajes() {
    const btn = document.getElementById("btn-generar");
    btn.disabled = true;
    btn.innerText = "⏳ Generando...";
    try {
        const res = await fetch(`${API_URL}/viaje/generar`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true"
            }
        });
        const data = await res.json();
        alert(data.message);
        if (data.ok) await cargarViajes();
    } catch (err) {
        console.error(err);
        alert("Error al generar viajes");
    } finally {
        btn.disabled = false;
        btn.innerText = "🚛 Agrupar y Generar Viajes";
    }
}

async function obtenerRutaOSRM(paradas) {
    // paradas: array de {lat, lng}
    if (paradas.length < 2) return null;
    const coords = paradas.map(p => `${p.lng},${p.lat}`).join(";");
    try {
        const res = await fetch(`${OSRM_URL}/${coords}?overview=full&geometries=geojson`);
        const data = await res.json();
        if (data.code === "Ok") return data.routes[0];
    } catch (err) {
        console.error("OSRM error:", err);
    }
    return null;
}

async function renderMarcadores(viajes) {
    if (!mapRuta) return;
    mapRuta.eachLayer(layer => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.GeoJSON) {
            mapRuta.removeLayer(layer);
        }
    });

    const coloresViaje = ['#0d6efd', '#198754', '#dc3545', '#fd7e14', '#6f42c1'];
    let totalCO2 = 0;

    for (let vi = 0; vi < viajes.length; vi++) {
        const viaje = viajes[vi];
        const color = coloresViaje[vi % coloresViaje.length];

        // Poner marcadores en el mapa
        viaje.intercambios.forEach(i => {
            if (i.origen_lat && i.origen_lng) {
                L.marker([i.origen_lat, i.origen_lng])
                    .addTo(mapRuta)
                    .bindPopup(`<b>📦 ${i.producto}</b><br>Productor: ${i.productor}<br>${i.cantidad} ${i.unidadMedida}`);
            }
            if (i.destino_lat && i.destino_lng) {
                L.marker([i.destino_lat, i.destino_lng], {
                    icon: L.icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
                        iconSize: [25, 41], iconAnchor: [12, 41]
                    })
                }).addTo(mapRuta)
                .bindPopup(`<b>🏁 Destino: ${i.comprador}</b><br>${i.producto}`);
            }
        });

        // Obtener ruta continua ordenada
        const paradasOrdenadas = ordenarParadasContinuas(
            viaje.intercambios,
            viaje.ultima_lat,
            viaje.ultima_lng
        );

        if (paradasOrdenadas.length >= 2) {
            const ruta = await obtenerRutaOSRM(paradasOrdenadas);
            if (ruta) {
                L.geoJSON(ruta.geometry, {
                    style: { color, weight: 4, opacity: 0.8 }
                }).addTo(mapRuta);

                const kmReal = ruta.distance / 1000;
                const pesoViaje = viaje.intercambios.reduce((a, i) => a + (parseFloat(i.peso) || 0), 0);
                totalCO2 += kmReal * pesoViaje * 0.062;

                viaje._paradasOrdenadas = paradasOrdenadas;
            }
        }
    }

    document.getElementById("co2-ruta").innerText = `${totalCO2.toFixed(2)} kg`;
}

function renderViajes(viajes) {
    const contenedor = document.getElementById("lotes-lista");
    if (viajes.length === 0) {
        contenedor.innerHTML = `
            <p class="text-muted small text-center mb-3">No hay viajes generados aún.</p>
            <button id="btn-generar" class="btn btn-primary w-100 rounded-pill fw-bold" onclick="generarViajes()">
                🚛 Agrupar y Generar Viajes
            </button>`;
        return;
    }

    const colores = ['primary', 'success', 'danger', 'warning', 'info'];
    contenedor.innerHTML = `
        <button id="btn-generar" class="btn btn-outline-primary w-100 rounded-pill fw-bold mb-3" onclick="generarViajes()">
            🚛 Reagrupar Pendientes
        </button>
        ${viajes.map((v, vi) => `
            <div class="card border rounded-3 mb-3 bg-light">
                <div class="card-body p-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="badge bg-${colores[vi % colores.length]}">Viaje #${v.idViaje}</span>
                        <span class="small fw-bold text-muted">${v.pesoTotal.toFixed(2)} ton | ${v.estado}</span>
                    </div>
                    ${v.intercambios.map(i => `
                        <div class="border-bottom pb-2 mb-2">
                            <h6 class="fw-bold mb-0 small">${i.producto}</h6>
                            <p class="text-muted mb-1" style="font-size:0.75rem;">
                                🏭 ${i.productor} → 🧑 ${i.comprador}<br>
                                📦 ${i.cantidad} ${i.unidadMedida}
                            </p>
                        </div>
                    `).join("")}
                    <div class="d-flex gap-2 mt-2">
                        <button class="btn btn-success btn-sm rounded-pill fw-bold w-50"
                            onclick="actualizarEstadoViaje(${v.idViaje}, 'en_camino')">
                            🚛 En Camino
                        </button>
                        <button class="btn btn-outline-danger btn-sm rounded-pill fw-bold w-50"
                            onclick="actualizarEstadoViaje(${v.idViaje}, 'cancelado')">
                            ✕ Cancelar
                        </button>
                    </div>
                </div>
            </div>
        `).join("")}
    `;
}

function renderItinerario(viajes) {
    const contenedor = document.getElementById("itinerario");
    if (viajes.length === 0) {
        contenedor.innerHTML = `<p class="text-muted small">No hay paradas aún.</p>`;
        return;
    }

    const colores = ['bg-primary', 'bg-success', 'bg-danger', 'bg-warning', 'bg-info'];
    let html = '';
    let numParada = 1;

    viajes.forEach((v, vi) => {
        const color = colores[vi % colores.length];
        // Usar el orden calculado si existe, si no usar el orden original
        const paradas = v._paradasOrdenadas || v.intercambios.flatMap(i => [
            { label: i.producto, tipo: 'origen', lat: i.origen_lat, lng: i.origen_lng },
            { label: i.comprador, tipo: 'destino', lat: i.destino_lat, lng: i.destino_lng }
        ]);

        paradas.forEach(p => {
            html += `
                <div class="mb-3 position-relative">
                    <div class="position-absolute ${color} rounded-circle" style="width:16px;height:16px;left:-33px;top:4px;"></div>
                    <h6 class="fw-bold mb-0 small">
                        Parada ${numParada}: ${p.tipo === 'origen' ? '📦 Recoger' : '🏁 Entregar'} — ${p.label}
                    </h6>
                    <span class="badge bg-light text-dark border mt-1">Viaje #${v.idViaje}</span>
                </div>
            `;
            numParada++;
        });
    });

    contenedor.innerHTML = html;
}

function calcularCapacidad(intercambios) {
    const pesoTotal = intercambios.reduce((acc, i) => acc + (parseFloat(i.peso) || 0), 0);
    const porcentaje = Math.min((pesoTotal / CAPACIDAD_MAX) * 100, 100).toFixed(0);
    document.getElementById("peso-actual").innerText = pesoTotal.toFixed(2);
    document.getElementById("porcentaje-capacidad").innerText = `${porcentaje}% Lleno`;
    document.getElementById("barra-capacidad").style.width = `${porcentaje}%`;
    document.getElementById("barra-capacidad").className = `progress-bar ${porcentaje > 80 ? 'bg-danger' : 'bg-warning'}`;
}

async function actualizarEstadoViaje(idViaje, estado) {
    try {
        // Si va en camino, guardar la última parada del viaje
        if (estado === 'en_camino') {
            const viaje = viajes.find(v => v.idViaje === idViaje);
            if (viaje && viaje._paradasOrdenadas) {
                const ultimaParada = viaje._paradasOrdenadas[viaje._paradasOrdenadas.length - 1];
                await fetch(`${API_URL}/viaje/${idViaje}/ultima-parada`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "ngrok-skip-browser-warning": "true"
                    },
                    body: JSON.stringify([ultimaParada.lat, ultimaParada.lng])
                });
            }
        }

        const res = await fetch(`${API_URL}/viaje/${idViaje}/estado`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true"
            },
            body: JSON.stringify([estado])
        });
        const data = await res.json();
        if (data.ok) {
            alert(estado === 'en_camino' ? "🚛 Viaje en camino" : "❌ Viaje cancelado");
            await cargarViajes();
        }
    } catch (err) {
        console.error(err);
    }
}

function ordenarParadasContinuas(intercambios, ultimaLat, ultimaLng) {
    if (intercambios.length === 0) return [];

    // Construir pares origen-destino
    const pares = intercambios.map(i => ({
        origen: { lat: parseFloat(i.origen_lat), lng: parseFloat(i.origen_lng), label: i.producto, tipo: 'origen' },
        destino: { lat: parseFloat(i.destino_lat), lng: parseFloat(i.destino_lng), label: i.comprador, tipo: 'destino' }
    }));

    const ruta = [];
    const usados = new Set();

    // Punto de partida: última parada guardada o el primer origen
    let puntoActual = (ultimaLat && ultimaLng)
        ? { lat: parseFloat(ultimaLat), lng: parseFloat(ultimaLng) }
        : pares[0].origen;

    // Algoritmo: siempre ir al origen más cercano que no haya sido visitado
    while (usados.size < pares.length) {
        let minDist = Infinity;
        let minIdx = -1;

        pares.forEach((par, idx) => {
            if (usados.has(idx)) return;
            const dist = haversineKm(puntoActual.lat, puntoActual.lng, par.origen.lat, par.origen.lng);
            if (dist < minDist) {
                minDist = dist;
                minIdx = idx;
            }
        });

        if (minIdx === -1) break;

        // Agregar origen y destino de este par en secuencia
        ruta.push(pares[minIdx].origen);
        ruta.push(pares[minIdx].destino);

        // El siguiente punto parte desde el destino de este par
        puntoActual = pares[minIdx].destino;
        usados.add(minIdx);
    }

    return ruta;
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