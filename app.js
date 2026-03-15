// =====================================================
// GEO PORTAL GIRARDOTA - APP.JS
// 1. Inicialización del mapa
// 2. Capas base
// 3. Carga de veredas
// 4. Carga de puntos críticos
// 5. Llenado de selectores
// 6. Filtros por vereda y riesgo
// 7. Tabla de resultados
// 8. Tarjetas resumen
// 9. Estadísticas
// 10. Gráficos con Chart.js
//

const map = L.map("map", {
    zoomControl: true
}).setView([6.3778, -75.4467], 13);
 
/*   1. CAPAS BASE*/
const capaOSM = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
});

const capaSatelital = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { attribution: "Tiles &copy; Esri" }
);

const capaTerreno = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    { attribution: "Tiles &copy; Esri" }
);

const capaClaro = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    { attribution: "&copy; OpenStreetMap &copy; CARTO" }
);

// Capa visible por defecto
capaOSM.addTo(map);

// Control de capas
L.control.layers(
    {
        "Mapa base": capaOSM,
        "Satelital": capaSatelital,
        "Terreno": capaTerreno,
        "Mapa claro": capaClaro
    },
    null,
    { collapsed: false }
).addTo(map);

// Escala
L.control.scale({
    position: "bottomleft",
    metric: true,
    imperial: false
}).addTo(map);

/*    2. NORTE DEL MAPA (no sale en el Geoportal) */
const north = L.control({ position: "topright" });
north.onAdd = function () {
    const div = L.DomUtil.create("div", "north-arrow");
    div.innerHTML = '<img src="img/norte.png" width="70" alt="Norte" onerror="this.style.display=\'none\'">';
    return div;
};
north.addTo(map);

/*   3. VARIABLES GLOBALES */
let veredasLayer = null;
let puntosLayer = null;
let puntosData = null;
let veredasData = null;
let graficoRiesgos = null;
let graficoVeredas = null;

const coloresGraficos = [
    "#1f5a43",
    "#2f7a57",
    "#4f9a6a",
    "#8ccf4d",
    "#79b85d",
    "#5c8f6b",
    "#aacd8f",
    "#d7ead8"
];

/*    4. FUNCIONES DE LECTURA DE ATRIBUTOS (permite leer datos aunque cambien los nombres de los campos en el GeoJSON.) */
function obtenerNombreVereda(properties = {}) {
    return (
        properties.vereda ||
        properties.VEREDA ||
        properties.nombre_vereda ||
        properties.NOMBRE_VEREDA ||
        properties.Layer ||
        properties.layer ||
        properties.nombre ||
        properties.NOMBRE ||
        properties.nombre_ver ||
        properties.NOM_VEREDA ||
        properties.vereda_nom ||
        properties.Vereda ||
        "Sin dato"
    );
}

function obtenerRiesgo(properties = {}) {
    return (
        properties.riesgo ||
        properties.RIESGO ||
        properties.tipo_riesgo ||
        properties.TIPO_RIESGO ||
        properties.evento ||
        properties.EVENTO ||
        properties.tipo_evento ||
        properties.TIPO_EVENTO ||
        "Sin clasificar"
    );
}

function obtenerSector(properties = {}) {
    return (
        properties.sector ||
        properties.SECTOR ||
        properties.lugar ||
        properties.LUGAR ||
        properties.sitio ||
        properties.SITIO ||
        properties.subsector ||
        properties.SUBSECTOR ||
        "Sin dato"
    );
}

function obtenerDescripcion(properties = {}) {
    return (
        properties.description ||
        properties.descripcion ||
        properties.DESCRIPCION ||
        properties.observacion ||
        properties.OBSERVACION ||
        properties.detalle ||
        properties.DETALLE ||
        "Sin descripción"
    );
}

function obtenerImage(properties = {}) {
    return (
        properties.image ||
        properties.IMAGE ||
        properties.imagen ||
        properties.IMAGEN ||
        properties.foto ||
        properties.FOTO ||
        ""
    );
}

/* 5. COLOR SEGÚN TIPO DE RIESGO */
function obtenerColorPorRiesgo(riesgo = "") {
    const valor = String(riesgo).toLowerCase().trim();

    if (valor.includes("avenida")) return "#c542b3";
    if (valor.includes("inund")) return "#4db7ff";
    if (valor.includes("estruct")) return "#57b85c";
    if (valor.includes("socav") || valor.includes("hund")) return "#d9e73f";
    if (valor.includes("movimiento") || valor.includes("masa")) return "#f04b44";

    return "#2f7a57";
}

/* 6. ACTIVACION DE INFORMACION DE LAS VEREDAS  */
fetch("veredas.geojson")
    .then(response => {
        if (!response.ok) {
            throw new Error("No fue posible cargar veredas.geojson");
        }
        return response.json();
    })
    .then(data => {
        veredasData = data;

        veredasLayer = L.geoJSON(data, {
            style: function () {
                return {
                    color: "#2f7a57",
                    weight: 2,
                    fillColor: "#8ccf4d",
                    fillOpacity: 0.08
                };
            },
            onEachFeature: function (feature, layer) {
                const nombreVereda = obtenerNombreVereda(feature.properties);

                layer.bindPopup(`
                    <div>
                        <b>Vereda:</b> ${nombreVereda}
                    </div>
                `);

                layer.bindTooltip(nombreVereda, {
                    permanent: false,
                    direction: "center",
                    className: "tooltip-vereda"
                });

                layer.on({
                    mouseover: function (e) {
                        e.target.setStyle({
                            weight: 3,
                            color: "#1f5a43",
                            fillOpacity: 0.18
                        });
                    },
                    mouseout: function (e) {
                        if (veredasLayer) {
                            veredasLayer.resetStyle(e.target);
                        }
                    }
                });
            }
        }).addTo(map);

        if (veredasLayer.getBounds && veredasLayer.getBounds().isValid()) {
            map.fitBounds(veredasLayer.getBounds(), { padding: [20, 20] });
        }
    })
    .catch(error => {
        console.error("Error cargando veredas:", error);
    });

/*  7. CARGA DE PUNTOS CRÍTICOS*/
fetch("puntos_criticos.geojson")
    .then(response => {
        if (!response.ok) {
            throw new Error("No fue posible cargar puntos_criticos.geojson");
        }
        return response.json();
    })
    .then(data => {
        console.log("GeoJSON de puntos cargado correctamente:", data);

        puntosData = data;

        // Solo llenar selectores
        llenarSelectorVeredas(data);
        llenarSelectorRiesgos(data);

        // Estado inicial vacío
        limpiarTabla();
        limpiarEstadisticas();
    })
    .catch(error => {
        console.error("Error cargando puntos críticos:", error);
    });

/*    8. LLENAR SELECTOR DE VEREDAS*/
function llenarSelectorVeredas(data) {
    const select = document.getElementById("veredaSelect");
    if (!select) return;

    select.innerHTML = `<option value="">Seleccione vereda</option>`;

    if (!data || !Array.isArray(data.features)) return;

    const veredasUnicas = new Set();

    data.features.forEach(feature => {
        const vereda = obtenerNombreVereda(feature.properties).trim();
        if (vereda && vereda !== "Sin dato") {
            veredasUnicas.add(vereda);
        }
    });

    Array.from(veredasUnicas)
        .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
        .forEach(vereda => {
            const option = document.createElement("option");
            option.value = vereda;
            option.textContent = vereda;
            select.appendChild(option);
        });

    console.log("Veredas cargadas:", Array.from(veredasUnicas));
}

/*   9. LLENAR SELECTOR DE RIESGOS */
function llenarSelectorRiesgos(data) {
    const select = document.getElementById("riesgoSelect");
    if (!select) return;

    select.innerHTML = `<option value="">Todos los riesgos</option>`;

    if (!data || !Array.isArray(data.features)) return;

    const riesgosUnicos = new Set();

    data.features.forEach(feature => {
        const riesgo = obtenerRiesgo(feature.properties).trim();
        if (riesgo && riesgo !== "Sin clasificar") {
            riesgosUnicos.add(riesgo);
        }
    });

    Array.from(riesgosUnicos)
        .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
        .forEach(riesgo => {
            const option = document.createElement("option");
            option.value = riesgo;
            option.textContent = riesgo;
            select.appendChild(option);
        });

    console.log("Riesgos cargados:", Array.from(riesgosUnicos));
}

/* 10. CREAR CAPA DE PUNTOS */
function crearCapaPuntos(data) {
    return L.geoJSON(data, {
        pointToLayer: function (feature, latlng) {
            const riesgo = obtenerRiesgo(feature.properties);
            const colorMarcador = obtenerColorPorRiesgo(riesgo);

            return L.circleMarker(latlng, {
                radius: 8,
                fillColor: colorMarcador,
                color: "#ffffff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9
            });
        },

        onEachFeature: function (feature, layer) {
            const riesgo = obtenerRiesgo(feature.properties);
            const vereda = obtenerNombreVereda(feature.properties);
            const sector = obtenerSector(feature.properties);
            const descripcion = obtenerDescripcion(feature.properties);
            const image = obtenerImage(feature.properties);

            let popupHTML = `
                <div style="min-width:240px;">
                    <b>Evento:</b> ${riesgo}<br>
                    <b>Vereda:</b> ${vereda}<br>
                    <b>Sector:</b> ${sector}<br>
                    <b>Descripción:</b> ${descripcion}
            `;

            if (image && image.trim() !== "") {
                popupHTML += `
                    <br><br>
                    <img
                        src="${image}"
                        alt="Imagen del punto crítico"
                        style="width:100%; max-width:240px; border-radius:8px; display:block; border:1px solid #d9e2d9;"
                        onerror="this.style.display='none'; this.insertAdjacentHTML('afterend','<div style=&quot;color:#666;font-size:12px;margin-top:6px;&quot;>No se encontró la imagen asociada.</div>');"
                    >
                `;
            }

            popupHTML += `</div>`;

            layer.bindPopup(popupHTML);
        }
    });
}

/*    11. FILTRAR DATOS */
function filtrarDatos() {

    const veredaSeleccionada = document.getElementById("veredaSelect").value;
    const riesgoSeleccionado = document.getElementById("riesgoSelect").value;

    const filtrados = {
        type: "FeatureCollection",
        features: puntosData.features.filter(feature => {

            const vereda = obtenerNombreVereda(feature.properties);
            const riesgo = obtenerRiesgo(feature.properties);

            return (
                (!veredaSeleccionada || vereda === veredaSeleccionada) &&
                (!riesgoSeleccionado || riesgo === riesgoSeleccionado)
            );
        })
    };

    if (puntosLayer) {
        map.removeLayer(puntosLayer);
    }

    puntosLayer = crearCapaPuntos(filtrados).addTo(map);

    generarTabla(filtrados);
    calcularEstadisticas(filtrados);
}


/*  12. LIMPIAR FILTRO*/
function limpiarFiltro() {
    const veredaSelect = document.getElementById("veredaSelect");
    const riesgoSelect = document.getElementById("riesgoSelect");

    if (veredaSelect) veredaSelect.value = "";
    if (riesgoSelect) riesgoSelect.value = "";

    if (!puntosData || !Array.isArray(puntosData.features)) {
        return;
    }

    if (puntosLayer && map.hasLayer(puntosLayer)) {
        map.removeLayer(puntosLayer);
    }

    // Volver a cargar todos los puntos
    puntosLayer = crearCapaPuntos(puntosData).addTo(map);

    generarTabla(puntosData);
    calcularEstadisticas(puntosData);

    if (veredasLayer && veredasLayer.getBounds && veredasLayer.getBounds().isValid()) {
        map.fitBounds(veredasLayer.getBounds(), { padding: [20, 20] });
    } else if (puntosLayer && puntosLayer.getBounds && puntosLayer.getBounds().isValid()) {
        map.fitBounds(puntosLayer.getBounds(), { padding: [20, 20] });
    }
}

/*    13. GENERAR TABLA DE RESULTADOS */
function generarTabla(data) {
    const tbody = document.getElementById("tablaResultados");

    if (!tbody) {
        console.warn("No existe el tbody con id 'tablaResultados'.");
        return;
    }

    tbody.innerHTML = "";

    if (!data || !data.features || data.features.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">No se encontraron puntos críticos para el filtro seleccionado.</td>
            </tr>
        `;
        return;
    }

    data.features.forEach((feature, index) => {
        const vereda = obtenerNombreVereda(feature.properties);
        const sector = obtenerSector(feature.properties);
        const riesgo = obtenerRiesgo(feature.properties);
        const descripcion = obtenerDescripcion(feature.properties);

        const fila = document.createElement("tr");
        fila.style.cursor = "pointer";

        fila.innerHTML = `
            <td>${index + 1}</td>
            <td>${vereda}</td>
            <td>${sector}</td>
            <td>${riesgo}</td>
            <td>${descripcion}</td>
        `;

        fila.addEventListener("click", function () {
            const geometry = feature.geometry;

            if (!geometry || !geometry.coordinates) return;

            const coords = geometry.coordinates;

            if (geometry.type === "Point" && Array.isArray(coords) && coords.length >= 2) {
                const lon = coords[0];
                const lat = coords[1];

                map.setView([lat, lon], 17);

                if (puntosLayer) {
                    puntosLayer.eachLayer(layer => {
                        if (
                            layer.feature &&
                            layer.feature.geometry &&
                            layer.feature.geometry.type === "Point"
                        ) {
                            const layerCoords = layer.feature.geometry.coordinates;
                            if (layerCoords[0] === lon && layerCoords[1] === lat) {
                                layer.openPopup();
                            }
                        }
                    });
                }
            }
        });

        tbody.appendChild(fila);
    });
}

/* 
   14. TABLA VACÍA INICIAL */
function limpiarTabla() {
    const tbody = document.getElementById("tablaResultados");

    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="5">Aún no se ha aplicado ningún filtro.</td>
        </tr>
    `;
}

/* 
   15. ESTADÍSTICAS */
function calcularEstadisticas(data) {
    if (!data || !data.features) return;

    const conteoRiesgos = {};
    const conteoVeredas = {};

    data.features.forEach(feature => {
        const riesgo = obtenerRiesgo(feature.properties);
        const vereda = obtenerNombreVereda(feature.properties);

        conteoRiesgos[riesgo] = (conteoRiesgos[riesgo] || 0) + 1;
        conteoVeredas[vereda] = (conteoVeredas[vereda] || 0) + 1;
    });

    actualizarCardsResumen(data, conteoRiesgos, conteoVeredas);
    mostrarDetalleEstadistico(conteoRiesgos);
    crearGraficoRiesgos(conteoRiesgos);
    crearGraficoVeredas(conteoVeredas);
}

/*    16. TARJETAS RESUMEN (Deben existir en HTML:totalEventos, totalVeredas, eventoPredominante) */
function actualizarCardsResumen(data, conteoRiesgos, conteoVeredas) {
    const totalEventosEl = document.getElementById("totalEventos");
    const totalVeredasEl = document.getElementById("totalVeredas");
    const eventoPredominanteEl = document.getElementById("eventoPredominante");

    if (totalEventosEl) {
        totalEventosEl.textContent = data.features.length;
    }

    if (totalVeredasEl) {
        totalVeredasEl.textContent = Object.keys(conteoVeredas).length;
    }

    let eventoMax = "-";
    let cantidadMax = 0;

    Object.keys(conteoRiesgos).forEach(riesgo => {
        if (conteoRiesgos[riesgo] > cantidadMax) {
            cantidadMax = conteoRiesgos[riesgo];
            eventoMax = riesgo;
        }
    });

    if (eventoPredominanteEl) {
        eventoPredominanteEl.textContent = eventoMax;
    }
}


/*    16.1. FUNCIÓN PARA LIMPIAR ESTADISTICAS */
function limpiarEstadisticas() {
    const totalEventosEl = document.getElementById("totalEventos");
    const totalVeredasEl = document.getElementById("totalVeredas");
    const eventoPredominanteEl = document.getElementById("eventoPredominante");
    const contenedor = document.getElementById("estadisticasRiesgo");

    if (totalEventosEl) totalEventosEl.textContent = "-";
    if (totalVeredasEl) totalVeredasEl.textContent = "-";
    if (eventoPredominanteEl) eventoPredominanteEl.textContent = "-";

    if (contenedor) {
        contenedor.innerHTML = `
            <div class="item-estadistica">
                <span>Sin información cargada</span>
                <span>-</span>
            </div>
        `;
    }

    if (graficoRiesgos) {
        graficoRiesgos.destroy();
        graficoRiesgos = null;
    }

    if (graficoVeredas) {
        graficoVeredas.destroy();
        graficoVeredas = null;
    }
}








/*  17. DETALLE ESTADÍSTICO
   Debe existir en HTML: id="estadisticasRiesgo" */
function mostrarDetalleEstadistico(conteoRiesgos) {
    const contenedor = document.getElementById("estadisticasRiesgo");

    if (!contenedor) {
        console.warn("No existe el contenedor 'estadisticasRiesgo'.");
        return;
    }

    contenedor.innerHTML = "";

    const total = Object.values(conteoRiesgos).reduce((acc, val) => acc + val, 0);

    contenedor.innerHTML += `
        <div class="item-estadistica">
            <span>Total de eventos</span>
            <span>${total}</span>
        </div>
    `;

    Object.keys(conteoRiesgos).forEach(tipo => {
        contenedor.innerHTML += `
            <div class="item-estadistica">
                <span>${tipo}</span>
                <span>${conteoRiesgos[tipo]}</span>
            </div>
        `;
    });
}

/*  18. GRÁFICO DE RIESGOS
   Debe existir canvas con id="graficoRiesgos" */
function crearGraficoRiesgos(conteoRiesgos) {
    const canvas = document.getElementById("graficoRiesgos");

    if (!canvas || typeof Chart === "undefined") return;

    const ctx = canvas.getContext("2d");

    if (graficoRiesgos) {
        graficoRiesgos.destroy();
    }

    const labels = Object.keys(conteoRiesgos);
    const valores = Object.values(conteoRiesgos);

    graficoRiesgos = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Cantidad de eventos",
                    data: valores,
                    backgroundColor: labels.map((_, i) => coloresGraficos[i % coloresGraficos.length]),
                    borderColor: "#1f5a43",
                    borderWidth: 1,
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                        stepSize: 1
                    }
                }
            }
        }
    });
}

/*  19. GRÁFICO DE VEREDAS
   Debe existir canvas con id="graficoVeredas"
===================================================== */
function crearGraficoVeredas(conteoVeredas) {
    const canvas = document.getElementById("graficoVeredas");

    if (!canvas || typeof Chart === "undefined") return;

    const ctx = canvas.getContext("2d");

    if (graficoVeredas) {
        graficoVeredas.destroy();
    }

    const labels = Object.keys(conteoVeredas);
    const valores = Object.values(conteoVeredas);

    graficoVeredas = new Chart(ctx, {
        type: "pie",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Eventos por vereda",
                    data: valores,
                    backgroundColor: labels.map((_, i) => coloresGraficos[i % coloresGraficos.length]),
                    borderColor: "#ffffff",
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "bottom"
                }
            }
        }
    });
}

/*  20. EXPONER FUNCIONES PARA BOTONES HTML */
window.filtrarDatos = filtrarDatos;
window.limpiarFiltro = limpiarFiltro;

/* =====================================================
   21. ESTADO INICIAL
===================================================== */
document.addEventListener("DOMContentLoaded", function () {
    limpiarTabla();
});
