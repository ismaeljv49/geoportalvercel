const configCapas = {
    uso_suelo:          { color: "#8b5cf6", label: "Uso de Suelo" },
    predios:            { color: "#ef4444", label: "Predios (Lotes)" },
    parroquias:         { color: "#f59e0b", label: "Parroquias" },
    edificaciones:      { color: "#10b981", label: "Edificaciones" },
    limite_urbano:      { color: "#3b82f6", label: "Límite Urbano" },
    reportes_ciudadanos: { color: "#f97316", label: "Reportes Ciudadanos", puntos: true }
};

const camposLegibles = {
    clave_cata:    "Clave Catastral",
    uso_suelo1:    "Uso de Suelo",
    propietari:    "Propietario",
    zona_nombr:    "Zona",
    sector_nom:    "Sector",
    predio_nom:    "Nombre Predio",
    predio_are:    "Area (m²)",
    entity:        "Entidad",
    layer:         "Capa CAD",
    refname:       "Referencia",
    dpa_despar:    "Parroquia",
    dpa_descan:    "Cantón",
    dpa_provin:    "Provincia",
    area:          "Area (m²)",
    piso:          "Pisos",
    nombre:        "Nombre",
    tipo_problema: "Problema",
    comentario:    "Comentario",
    estado:        "Estado",
    created_at:    "Fecha"
};

const popupFields = {
    uso_suelo:           ["clave_cata", "uso_suelo1", "propietari", "zona_nombr", "sector_nom", "predio_nom", "predio_are"],
    predios:             ["entity", "layer", "refname"],
    parroquias:          ["dpa_despar", "dpa_descan", "dpa_provin"],
    edificaciones:       ["area", "piso"],
    limite_urbano:       ["nombre", "area"],
    reportes_ciudadanos: ["tipo_problema", "comentario", "estado", "created_at"]
};

const map = L.map('map', {
    zoomControl: false
}).setView([-4.066, -78.966], 14);

L.control.zoom({ position: 'bottomright' }).addTo(map);
L.control.scale({ position: 'bottomleft', metric: true, imperial: false, maxWidth: 200 }).addTo(map);

const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });
const satelital = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19, attribution: 'Esri'
});

const mapasBase = { "Calle": osm, "Satelital": satelital };
satelital.addTo(map);

async function apiGet(endpoint) {
    const res = await fetch(`/api${endpoint}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

async function apiPost(endpoint, body) {
    const res = await fetch(`/api${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

async function apiPatch(endpoint, body) {
    const res = await fetch(`/api${endpoint}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

function cargarCapa(nombreTabla, estiloColor) {
    const grupoCapa = L.layerGroup();
    const limite = 1000;
    let offset = 0;
    let todasLasFeatures = [];

    function pedirFragmento() {
        apiGet(`/data?table=${nombreTabla}&limit=${limite}&offset=${offset}`)
        .then(data => {
            if (!Array.isArray(data) || data.length === 0) {
                finalizarCarga(todasLasFeatures, grupoCapa, nombreTabla, estiloColor);
                return;
            }

            const features = data.map(item => {
                if (!item.geom) return null;
                return {
                    type: "Feature",
                    geometry: item.geom,
                    properties: { ...item, geom: null }
                };
            }).filter(f => f !== null);

            todasLasFeatures = todasLasFeatures.concat(features);

            if (data.length === limite) {
                offset += limite;
                pedirFragmento();
            } else {
                finalizarCarga(todasLasFeatures, grupoCapa, nombreTabla, estiloColor);
            }
        })
        .catch(err => console.error(`Error en ${nombreTabla}:`, err));
    }

    pedirFragmento();
    return grupoCapa;
}

function finalizarCarga(features, grupoCapa, nombreTabla, estiloColor) {
    if (features.length === 0) return;

    const geojson = { type: "FeatureCollection", features };
    const campos = popupFields[nombreTabla] || [];
    const esPuntos = configCapas[nombreTabla] && configCapas[nombreTabla].puntos;

    const opts = {
        onEachFeature: (feature, layer) => {
            const label = configCapas[nombreTabla].label;
            let filas = "";

            campos.forEach(campo => {
                const val = feature.properties[campo];
                if (val !== null && val !== undefined && val !== "") {
                    const etiqueta = camposLegibles[campo] || campo;
                    filas += `<tr><td>${etiqueta}</td><td>${val}</td></tr>`;
                }
            });

            if (!filas) filas = '<tr><td style="text-align:center;padding:12px;color:#94a3b8">Sin datos disponibles</td></tr>';

            let extra = "";
            if (nombreTabla === "reportes_ciudadanos" && feature.properties.id) {
                extra = buildStatusSelector(feature.properties.id, feature.properties.estado);
            }

            layer.bindPopup(`
                <div>
                    <div class="popup-header">${label}</div>
                    <table>${filas}</table>
                    ${extra}
                </div>
            `);
        }
    };

    if (esPuntos) {
        opts.pointToLayer = (feature, latlng) => {
            return L.circleMarker(latlng, {
                radius: 7,
                fillColor: estiloColor,
                color: "#ffffff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            });
        };
    } else {
        opts.style = {
            color: estiloColor,
            weight: 1.5,
            fillColor: estiloColor,
            fillOpacity: 0.25
        };
    }

    const capaLayer = L.geoJSON(geojson, opts).addTo(grupoCapa);

    capaGeoJSONs.push(capaLayer);
    if (++capasCargadas >= totalCapas) {
        ocultarLoading();
        const bounds = L.featureGroup(capaGeoJSONs).getBounds();
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] });
    }
}

function buildStatusSelector(id, estadoActual) {
    const estados = [
        { valor: "pendiente", label: "Pendiente", color: "#f59e0b" },
        { valor: "en_proceso", label: "En Proceso", color: "#3b82f6" },
        { valor: "resuelto", label: "Resuelto", color: "#10b981" }
    ];
    let btns = "";
    estados.forEach(e => {
        const activo = e.valor === estadoActual ? "leyenda-estado-btn activo" : "leyenda-estado-btn";
        btns += `<button class="${activo}" data-id="${id}" data-estado="${e.valor}" style="background:${e.color}">${e.label}</button>`;
    });
    return `<div class="leyenda-estado"><div class="leyenda-estado-titulo">Estado:</div><div class="leyenda-estado-grupo">${btns}</div></div>`;
}

function ocultarLoading() {
    const el = document.getElementById('loading');
    if (el) el.classList.add('hidden');
    crearLeyenda();
}

function crearLeyenda() {
    const leyenda = L.control({ position: 'bottomright' });
    leyenda.onAdd = function() {
        const div = L.DomUtil.create('div', 'leyenda');
        let html = '<div class="leyenda-title">Leyenda</div>';
        Object.keys(configCapas).forEach(nombre => {
            const cfg = configCapas[nombre];
            const icono = cfg.puntos
                ? `<span class="leyenda-circulo" style="background:${cfg.color}"></span>`
                : `<span class="leyenda-cuadrado" style="background:${cfg.color}"></span>`;
            html += `<div class="leyenda-item">${icono}<span>${cfg.label}</span></div>`;
        });
        div.innerHTML = html;
        return div;
    };
    leyenda.addTo(map);
}

const capaGeoJSONs = [];
let capasCargadas = 0;
const nombresCapas = Object.keys(configCapas);
const totalCapas = nombresCapas.length;
const capasVisor = {};

nombresCapas.forEach(nombre => {
    const cfg = configCapas[nombre];
    capasVisor[cfg.label] = cargarCapa(nombre, cfg.color);
});

Object.values(capasVisor).forEach(capa => capa.addTo(map));

L.control.layers(mapasBase, capasVisor, { collapsed: false }).addTo(map);

// ---- Reportes ciudadanos ----

let reportMarker = null;

function recargarReportes() {
    const grupo = capasVisor["Reportes Ciudadanos"];
    if (!grupo) return;
    grupo.clearLayers();
    const cfg = configCapas.reportes_ciudadanos;
    const nombreTabla = "reportes_ciudadanos";
    const estiloColor = cfg.color;
    const limite = 1000;
    let offset = 0;

    function pedirFragmento() {
        apiGet(`/data?table=${nombreTabla}&limit=${limite}&offset=${offset}`)
        .then(data => {
            if (!Array.isArray(data) || data.length === 0) return;
            const features = data.map(item => {
                if (!item.geom) return null;
                return { type: "Feature", geometry: item.geom, properties: { ...item, geom: null } };
            }).filter(f => f !== null);
            if (features.length === 0) return;

            const geojson = { type: "FeatureCollection", features };
            const campos = popupFields[nombreTabla] || [];

            L.geoJSON(geojson, {
                pointToLayer: (f, latlng) => L.circleMarker(latlng, {
                    radius: 7, fillColor: estiloColor, color: "#ffffff", weight: 2, fillOpacity: 0.8
                }),
                onEachFeature: (f, layer) => {
                    let filas = "";
                    campos.forEach(c => {
                        const v = f.properties[c];
                        if (v !== null && v !== undefined && v !== "") {
                            filas += `<tr><td>${camposLegibles[c] || c}</td><td>${v}</td></tr>`;
                        }
                    });
                    if (!filas) filas = '<tr><td style="text-align:center;padding:12px;color:#94a3b8">Sin datos</td></tr>';
                    let extra = "";
                    if (f.properties.id) extra = buildStatusSelector(f.properties.id, f.properties.estado);
                    layer.bindPopup(`<div><div class="popup-header">${cfg.label}</div><table>${filas}</table>${extra}</div>`);
                }
            }).addTo(grupo);

            if (data.length === limite) { offset += limite; pedirFragmento(); }
        })
        .catch(err => console.error(`Error recargando reportes:`, err));
    }
    pedirFragmento();
}

function abrirPanelReporte() {
    document.getElementById('report-panel').classList.remove('panel-hidden');
}

function cerrarPanelReporte() {
    document.getElementById('report-panel').classList.add('panel-hidden');
    if (reportMarker) {
        map.removeLayer(reportMarker);
        reportMarker = null;
    }
    document.getElementById('latitud').value = '';
    document.getElementById('longitud').value = '';
    document.getElementById('btn-enviar').disabled = true;
}

function colocarMarcadorReporte(lat, lng) {
    const icon = L.divIcon({ className: 'leaflet-report-marker', iconSize: [16, 16] });
    if (reportMarker) map.removeLayer(reportMarker);
    reportMarker = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
    document.getElementById('latitud').value = lat.toFixed(6);
    document.getElementById('longitud').value = lng.toFixed(6);
    document.getElementById('btn-enviar').disabled = false;
    reportMarker.on('dragend', function() {
        const p = reportMarker.getLatLng();
        document.getElementById('latitud').value = p.lat.toFixed(6);
        document.getElementById('longitud').value = p.lng.toFixed(6);
    });
}

function resetForm() {
    document.getElementById('tipo').value = '';
    document.getElementById('comentario').value = '';
    document.getElementById('latitud').value = '';
    document.getElementById('longitud').value = '';
    document.getElementById('btn-enviar').disabled = true;
    document.getElementById('btn-enviar').textContent = 'Enviar reporte';
    document.getElementById('btn-enviar').disabled = false;
    if (reportMarker) { map.removeLayer(reportMarker); reportMarker = null; }
    document.querySelector('.panel-body').style.display = 'block';
    document.getElementById('panel-success').classList.remove('show');
}

// ---- Generar PDF ----

function generarPDF() {
    const btn = document.getElementById('btn-pdf');
    btn.textContent = 'Generando...';
    btn.disabled = true;

    apiGet('/reportes?order=created_at.desc')
    .then(data => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        const etiquetaProblema = { bache: 'Bache', alumbrado: 'Alumbrado', basura: 'Basura', alcantarillado: 'Alcantarillado', vereda: 'Vereda', senaletica: 'Señaletica', arbol: 'Arbol', inundacion: 'Inundacion', vandalismo: 'Vandalismo', otro: 'Otro' };
        const etiquetaEstado = { pendiente: 'Pendiente', en_proceso: 'En proceso', resuelto: 'Resuelto' };

        const filas = (data || []).map(r => [
            r.id,
            etiquetaProblema[r.tipo_problema] || r.tipo_problema,
            r.comentario || '-',
            etiquetaEstado[r.estado] || r.estado,
            r.latitud ? r.latitud.toFixed(5) : '-',
            r.longitud ? r.longitud.toFixed(5) : '-',
            r.created_at ? new Date(r.created_at).toLocaleDateString('es-EC') : '-'
        ]);

        doc.setFontSize(16);
        doc.text('Reportes Ciudadanos - Zamora', 14, 18);
        doc.setFontSize(10);
        doc.text(`Generado: ${new Date().toLocaleString('es-EC')}`, 14, 25);
        doc.text(`Total de reportes: ${filas.length}`, 14, 31);

        doc.autoTable({
            startY: 37,
            head: [['#', 'Problema', 'Comentario', 'Estado', 'Latitud', 'Longitud', 'Fecha']],
            body: filas,
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [59, 130, 246], fontSize: 8, halign: 'center' },
            columnStyles: {
                0: { cellWidth: 8, halign: 'center' },
                1: { cellWidth: 28 },
                2: { cellWidth: 70 },
                3: { cellWidth: 20, halign: 'center' },
                4: { cellWidth: 28, halign: 'center' },
                5: { cellWidth: 28, halign: 'center' },
                6: { cellWidth: 22, halign: 'center' }
            },
            alternateRowStyles: { fillColor: [248, 250, 252] }
        });

        doc.save(`reportes_ciudadanos_${new Date().toISOString().slice(0, 10)}.pdf`);
    })
    .catch(err => {
        alert('Error al generar PDF');
        console.error(err);
    })
    .finally(() => {
        btn.textContent = 'PDF';
        btn.disabled = false;
    });
}

async function actualizarEstadoReporte(id, nuevoEstado) {
    try {
        await apiPatch('/reporte', { id, estado: nuevoEstado });
        recargarReportes();
    } catch (err) {
        console.error('Error actualizando estado:', err);
        alert('Error al actualizar el estado');
    }
}

document.getElementById('map').addEventListener('click', function(e) {
    const btn = e.target.closest('.leyenda-estado-btn');
    if (!btn) return;
    const id = btn.dataset.id;
    const estado = btn.dataset.estado;
    if (id && estado) actualizarEstadoReporte(parseInt(id), estado);
});

document.getElementById('btn-pdf').addEventListener('click', generarPDF);
document.getElementById('btn-reportar').addEventListener('click', abrirPanelReporte);
document.getElementById('btn-cerrar-panel').addEventListener('click', cerrarPanelReporte);

map.on('click', function(e) {
    if (!document.getElementById('report-panel').classList.contains('panel-hidden')) {
        colocarMarcadorReporte(e.latlng.lat, e.latlng.lng);
    }
});

document.getElementById('btn-enviar').addEventListener('click', async function() {
    const tipo = document.getElementById('tipo').value;
    const comentario = document.getElementById('comentario').value.trim();
    const lat = parseFloat(document.getElementById('latitud').value);
    const lng = parseFloat(document.getElementById('longitud').value);

    if (!tipo) { alert('Selecciona un tipo de problema.'); return; }
    if (isNaN(lat) || isNaN(lng)) { alert('Haz clic en el mapa para marcar la ubicacion.'); return; }

    const btn = this;
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
        await apiPost('/reportes', {
            tipo_problema: tipo,
            comentario: comentario || null,
            latitud: lat,
            longitud: lng
        });
        document.querySelector('.panel-body').style.display = 'none';
        document.getElementById('panel-success').classList.add('show');
        recargarReportes();
    } catch (err) {
        alert('Error al enviar el reporte. Intenta de nuevo.');
        console.error(err);
        btn.disabled = false;
        btn.textContent = 'Enviar reporte';
    }
});
