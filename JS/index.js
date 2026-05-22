const API_URL = "https://calamity-hypertext-strenuous.ngrok-free.dev";
const user = JSON.parse(sessionStorage.getItem("user"));
let cotizacion = []; // productos en el cotizador

// Cargar productos al iniciar
document.addEventListener("DOMContentLoaded", async () => {
    await cargarProductos();
});

async function cargarProductos() {
    try {
        const res = await fetch(`${API_URL}/productos`, {
            headers: { "ngrok-skip-browser-warning": "true" }
        });
        const data = await res.json();
        if (data.ok) {
            renderProductos(data.productos);
        }
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
        col.innerHTML = `
            <div class="card h-100 shadow-sm">
                <img src="${p.urlImagen}" class="card-img-top" alt="${p.nombre}" style="height: 150px; object-fit: cover;"
                     onerror="this.src='https://via.placeholder.com/400x150?text=Sin+imagen'">
                <div class="card-body">
                    <h5 class="card-title fw-bold">${p.nombre}</h5>
                    <p class="card-text text-muted small mb-1">${p.productor}</p>
                    <p class="fw-bold text-primary mb-2">${precio}</p>
                    <div class="badge bg-light text-success mb-3">🏷️ ${p.categoria}</div>
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
    // Evitar duplicados
    const existe = cotizacion.find(p => p.idProducto === idProducto);
    if (existe) {
        alert("Este producto ya está en tu cotización");
        return;
    }

    cotizacion.push({ idProducto, nombre, precio });
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

async function generarOrden() {
    if (cotizacion.length === 0) {
        alert("No hay productos en la cotización");
        return;
    }
    if (!user) {
        alert("Debes iniciar sesión para generar una orden");
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
                body: JSON.stringify([p.idProducto, user.usuario])
            });
        }
        alert("¡Orden generada correctamente!");
        cotizacion = [];
        actualizarCotizador();
    } catch (err) {
        console.error(err);
        alert("Error al generar la orden");
    }
}

function logout() {
    sessionStorage.clear();
    window.location.href = "login.html";
}

async function aplicarFiltros() {
    const tipo = document.getElementById("filter-tipo-productor").value;
    try {
        const res = await fetch(`${API_URL}/productos/filtro?tipo=${tipo}`, {
            headers: { "ngrok-skip-browser-warning": "true" }
        });
        const data = await res.json();
        if (data.ok) {
            renderProductos(data.productos);
        }
    } catch (err) {
        console.error(err);
    }
}

function quitarCotizacion(idProducto) {
    cotizacion = cotizacion.filter(p => p.idProducto !== idProducto);
    actualizarCotizador();
}