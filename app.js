// =====================================================
// GEO PORTAL GIRARDOTA - APP.JS 
// Este archivo controla:
// 1. Inicialización del mapa
// 2. Carga de veredas
// 3. Carga de puntos críticos
// 4. Llenado automático de selectores
// 5. Filtro por vereda y tipo de riesgo
// 6. Tabla de resultados
// 7. Tarjetas resumen
// 8. Estadísticas detalladas
// 9. Gráficos con Chart.js
// =====================================================

const map = L.map("map", {
    zoomControl: true
}).setView([6.3778, -75.4467], 13);

/* CAPAS BASE DEL MAPA: VISUALIZACIÓN DE MAPAS TEMÁTICOS */

/* 1. OpenStreetMap estándar */
const capaOSM = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors'
});

/* 2. Satelital ESRI */
const capaSatelital = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
        attribution: 'Tiles &copy; Esri'
    }
);

/* 3. Terreno / relieve ESRI*/ 
const capaTerreno = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    {
        attribution: 'Tiles &copy; Esri'
    }
);

/* 4. Mapa claro */
const capaClaro = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
        attribution: '&copy; OpenStreetMap &copy; CARTO'
    }
);

capaOSM.addTo(map);  /*capa del geoportal*/

/*CONTROL DE CAPAS BASE: Permite al usuario escoger el tipo de mapa */
const mapasBase = {
    "Mapa base": capaOSM,
    "Satelital": capaSatelital,
    "Terreno": capaTerreno,
    "Mapa claro": capaClaro
};

L.control.layers(mapasBase, null, {
    collapsed: false
}).addTo(map);

/* ESCALA DEL MAPA */

L.control.scale({
    position: "bottomleft",
    metric: true,
    imperial: false
}).addTo(map);


/* NORTE DEL MAPA (NO FUNCIONA, COPIADO  DE LA LIBRERIA Leaflet */ 

const north = L.control({ position: "topright" });
north.onAdd = function () {
    const div = L.DomUtil.create("div", "north-arrow");
    div.innerHTML = '<img src="img/norte.png" width="70px">';
    return div;
};
north.addTo(map);

/* 2. VARIABLES DE LEYENDA Y DE GRAFICOS*/
let sLayer = null;
let puntosLayer = null;

let puntosData = null;
let sData = null;

let graficoRiesgos = null;
let graficos = null;

/* 3. IDENTIFICACION DE COLORES INSTITUCIONALES DE LA ALCALDIA DE GIRARDOTA 2024-2027*/
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


/* 4. FUNCIONES QUE SE CONSULTARON PARA QUE SE PUEDAN LEER LOS ATRIBUTOS*/
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

function obtenerColorPorRiesgo(riesgo = "") {
    const valor = String(riesgo).toLowerCase().trim();

    if (valor.includes("avenida")) return "#c542b3";
    if (valor.includes("inund")) return "#4db7ff";
    if (valor.includes("estruct")) return "#57b85c";
    if (valor.includes("socav") || valor.includes("hund")) return "#d9e73f";
    if (valor.includes("movimiento") || valor.includes("masa")) return "#f04b44";

    return "#2f7a57";
}


/* 5. CARGAR CAPA DE VEREDAS */
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
                        veredasLayer.resetStyle(e.target);
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


/* 6. CARGAR PUNTOS CRÍTICOS */
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

        llenarSelectorVeredas(data);
        llenarSelectorRiesgos(data);
        calcularEstadisticas(data);
        limpiarTabla();
    })
    .catch(error => {
        console.error("Error cargando puntos críticos:", error);
    });

/*7. LLENAR SELECTOR DE veredas* (corregido varias veces por IA)*/
function llenarSelectorVeredas(data) {
    const select = document.getElementById("veredaSelect");

    if (!select) {
        console.warn("No existe el select con id 'veredaSelect'.");
        return;
    }

    select.innerHTML = `<option value="">Seleccione vereda</option>`;

    if (!data || !data.features || !Array.isArray(data.features)) {
        select.innerHTML = `<option value="">No hay veredas disponibles</option>`;
        return;
    }

    const veredasUnicas = new Set();

    data.features.forEach(feature => {
        const vereda = obtenerNombreVereda(feature.properties).trim();

        if (vereda && vereda !== "Sin dato") {
            veredasUnicas.add(vereda);
        }
    });

    const veredasOrdenadas = Array.from(veredasUnicas).sort((a, b) =>
        a.localeCompare(b, "es", { sensitivity: "base" })
    );

    veredasOrdenadas.forEach(vereda => {
        const option = document.createElement("option");
        option.value = vereda;
        option.textContent = vereda;
        select.appendChild(option);
    });

    console.log("Veredas cargadas:", veredasOrdenadas);
}

/* 8. LLENAR SELECTOR DE RIESGOS*/

function llenarSelectorRiesgos(data) {
    const select = document.getElementById("riesgoSelect");

    if (!select) {
        console.warn("No existe el select con id 'riesgoSelect'.");
        return;
    }

    select.innerHTML = `<option value="">Todos los riesgos</option>`;

    if (!data || !data.features || !Array.isArray(data.features)) {
        return;
    }

    const riesgosUnicos = new Set();

    data.features.forEach(feature => {
        const riesgo = obtenerRiesgo(feature.properties).trim();

        if (riesgo && riesgo !== "Sin clasificar") {
            riesgosUnicos.add(riesgo);
        }
    });

    const riesgosOrdenados = Array.from(riesgosUnicos).sort((a, b) =>
        a.localeCompare(b, "es", { sensitivity: "base" })
    );

    riesgosOrdenados.forEach(riesgo => {
        const option = document.createElement("option");
        option.value = riesgo;
        option.textContent = riesgo;
        select.appendChild(option);
    });

    console.log("Riesgos cargados:", riesgosOrdenados);
}


/*9. CREAR CAPA DE PUNTOS criticos (REVISAR TABLA ORIGINAL DE KML)*/ 
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


/* 10. FILTRAR DATOS POR VEREDA Y RIESGO (FORMUALDO POR IA-MODIFICADO ALEJA)*/
function filtrarDatos() {
    const veredaSelect = document.getElementById("veredaSelect");
    const riesgoSelect = document.getElementById("riesgoSelect");

    const veredaSeleccionada = veredaSelect ? veredaSelect.value.trim() : "";
    const riesgoSeleccionado = riesgoSelect ? riesgoSelect.value.trim() : "";

    if (!puntosData || !puntosData.features) {
        alert("No se han cargado los puntos críticos.");
        return;
    }

    if (puntosLayer && map.hasLayer(puntosLayer)) {
        map.removeLayer(puntosLayer);
    }

    const filtrados = {
        type: "FeatureCollection",
        features: puntosData.features.filter(feature => {
            const veredaDato = obtenerNombreVereda(feature.properties).trim();
            const riesgoDato = obtenerRiesgo(feature.properties).trim();

            const cumpleVereda = !veredaSeleccionada || veredaDato === veredaSeleccionada;
            const cumpleRiesgo = !riesgoSeleccionado || riesgoDato === riesgoSeleccionado;

            return cumpleVereda && cumpleRiesgo;
        })
    };

    console.log("Resultado del filtro:", filtrados);

    if (filtrados.features.length === 0) {
        generarTabla(filtrados);
        calcularEstadisticas(filtrados);
        return;
    }

    puntosLayer = crearCapaPuntos(filtrados).addTo(map);

    if (puntosLayer.getBounds().isValid()) {
        map.fitBounds(puntosLayer.getBounds(), { padding: [30, 30] });
    }

    generarTabla(filtrados);
    calcularEstadisticas(filtrados);
}

/* 11. LIMPIAR FILTRO*/
function limpiarFiltro() {
    const veredaSelect = document.getElementById("veredaSelect");
    const riesgoSelect = document.getElementById("riesgoSelect");

    if (veredaSelect) veredaSelect.value = "";
    if (riesgoSelect) riesgoSelect.value = "";

    if (puntosLayer && map.hasLayer(puntosLayer)) {
        map.removeLayer(puntosLayer);
    }

    limpiarTabla();

    if (puntosData) {
        calcularEstadisticas(puntosData);
    }

    if (veredasLayer && veredasLayer.getBounds().isValid()) {
        map.fitBounds(veredasLayer.getBounds(), { padding: [20, 20] });
    }
}

/*
// 12. GENERAR TABLA DE RESULTADOS (MUCHA CORRECION DE IA)*/
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

/* 13. LIMPIAR TABLA*/
function limpiarTabla() {
    const tbody = document.getElementById("tablaResultados");

    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="5">Aún no se ha aplicado ningún filtro.</td>
        </tr>
    `;
}

/* 14. CALCULAR ESTADÍSTICAS (MUCHA CORRECION DE IA -REFORMULADO TOTALMENTE)*/
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

/* 15. ACTUALIZAR TARJETAS RESUMEN (MUCHA CORRECION DE IA -REFORMULADO TOTALMENTE)*/
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

/* 16. MOSTRAR DETALLE ESTADÍSTICO*/
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

/* 17. CREAR GRÁFICO DE BARRAS - EVENTOS DE RIESGO (REVISAR LOS DATOS EN CSS E INDEX QUE SEAN COHERENTES, NO - CORRE*/
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

/*18. CREAR GRÁFICO CIRCULAR - VEREDAS*/
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


/* 19. ESTADO INICIAL DEL SISTEMA (AYUDA IA)*/
document.addEventListener("DOMContentLoaded", function () {
    limpiarTabla();
});
