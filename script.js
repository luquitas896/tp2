// ===== VARIABLES GLOBALES =====
let map;
let fireMarkers = [];
let isScanning = false;
let animationFrameId = null;
let lastDetectedFire = null;
let detectionData = {
    fireCount: 0,
    confidence: 0,
    areaRisk: 0,
    alertLevel: 'safe',
    fires: []
};

// ===== PROVINCIAS ARGENTINAS CON COORDENADAS =====
const ARGENTINA_PROVINCES = {
    'Buenos Aires': {
        lat: -34.6,
        lon: -58.4,
        bounds: [[-35.5, -62.7], [-33.7, -56.5]]
    },
    'Catamarca': {
        lat: -28.5,
        lon: -65.5,
        bounds: [[-30.8, -67.5], [-26.7, -63.5]]
    },
    'Chaco': {
        lat: -25.3,
        lon: -60.7,
        bounds: [[-26.8, -63.0], [-22.0, -58.4]]
    },
    'Chubut': {
        lat: -43.2,
        lon: -65.3,
        bounds: [[-45.7, -73.0], [-42.0, -65.5]]
    },
    'Córdoba': {
        lat: -31.4,
        lon: -64.2,
        bounds: [[-33.8, -66.9], [-29.0, -62.0]]
    },
    'Corrientes': {
        lat: -27.5,
        lon: -55.5,
        bounds: [[-29.8, -58.8], [-27.0, -54.6]]
    },
    'Entre Ríos': {
        lat: -32.4,
        lon: -60.6,
        bounds: [[-34.1, -62.1], [-30.1, -58.6]]
    },
    'Formosa': {
        lat: -25.6,
        lon: -60.0,
        bounds: [[-28.0, -62.7], [-21.8, -59.5]]
    },
    'Jujuy': {
        lat: -23.6,
        lon: -65.4,
        bounds: [[-24.7, -65.8], [-21.8, -63.8]]
    },
    'La Pampa': {
        lat: -36.5,
        lon: -64.3,
        bounds: [[-38.1, -67.4], [-35.0, -63.7]]
    },
    'La Rioja': {
        lat: -29.4,
        lon: -66.9,
        bounds: [[-31.8, -69.1], [-28.0, -66.2]]
    },
    'Mendoza': {
        lat: -32.9,
        lon: -68.4,
        bounds: [[-34.8, -70.6], [-32.2, -66.7]]
    },
    'Misiones': {
        lat: -27.4,
        lon: -55.5,
        bounds: [[-28.1, -56.0], [-25.5, -54.6]]
    },
    'Neuquén': {
        lat: -38.9,
        lon: -68.1,
        bounds: [[-41.0, -71.6], [-37.8, -67.6]]
    },
    'Río Negro': {
        lat: -41.1,
        lon: -65.1,
        bounds: [[-43.0, -73.6], [-38.7, -64.6]]
    },
    'Salta': {
        lat: -24.8,
        lon: -65.4,
        bounds: [[-27.5, -67.5], [-21.8, -62.0]]
    },
    'San Juan': {
        lat: -31.5,
        lon: -68.5,
        bounds: [[-32.2, -70.2], [-28.4, -67.5]]
    },
    'San Luis': {
        lat: -33.3,
        lon: -66.3,
        bounds: [[-35.8, -67.1], [-30.5, -65.1]]
    },
    'Santa Cruz': {
        lat: -50.5,
        lon: -71.4,
        bounds: [[-52.6, -73.6], [-47.7, -69.2]]
    },
    'Santa Fe': {
        lat: -31.6,
        lon: -60.7,
        bounds: [[-34.2, -63.8], [-29.0, -58.3]]
    },
    'Santiago del Estero': {
        lat: -27.8,
        lon: -64.3,
        bounds: [[-28.7, -66.4], [-26.8, -63.2]]
    },
    'Tierra del Fuego': {
        lat: -54.0,
        lon: -67.0,
        bounds: [[-55.6, -73.6], [-52.3, -65.8]]
    },
    'Tucumán': {
        lat: -26.8,
        lon: -65.2,
        bounds: [[-27.8, -66.0], [-25.5, -64.2]]
    }
};

// Coordenadas de Argentina (Centro)
const ARGENTINA_CENTER = [-38.4161, -63.6167];

// ===== FUNCIONES DE INICIALIZACIÓN =====
function initializeMap() {
    // Crear mapa centrado en Argentina
    map = L.map('map').setView(ARGENTINA_CENTER, 4);
    
    // Añadir capa oscura de CartoDB para estilo minimalista
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors © CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    console.log('Mapa inicializado en Argentina');
}

// ===== FUNCIONES DE DETECCIÓN =====
function getRandomProvinceCoords() {
    const provinces = Object.entries(ARGENTINA_PROVINCES);
    const randomProvince = provinces[Math.floor(Math.random() * provinces.length)];
    const [provinceName, provinceData] = randomProvince;
    
    const bounds = provinceData.bounds;
    const lat = bounds[0][0] + Math.random() * (bounds[1][0] - bounds[0][0]);
    const lon = bounds[0][1] + Math.random() * (bounds[1][1] - bounds[0][1]);
    
    return { lat, lon, provinceName };
}

function startScanning() {
    if (isScanning) return;
    isScanning = true;
    detectionData = {
        fireCount: 0,
        confidence: 0,
        areaRisk: 0,
        alertLevel: 'safe',
        fires: []
    };
    lastDetectedFire = null;

    updateStatus('Escaneando Provincias...');
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
    document.getElementById('detectionLog').innerHTML = '';

    // Limpiar marcadores previos
    fireMarkers.forEach(marker => map.removeLayer(marker));
    fireMarkers = [];

    animate();
}

function stopScanning() {
    isScanning = false;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    updateStatus('Escaneo Completado');
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;

    // Mostrar información del último fuego detectado
    if (lastDetectedFire) {
        const tempCelsius = Math.round(lastDetectedFire.temperature - 273.15);
        updateCoordinates(
            lastDetectedFire.provinceName,
            lastDetectedFire.lat.toFixed(4),
            lastDetectedFire.lon.toFixed(4),
            tempCelsius,
            lastDetectedFire.humidity,
            lastDetectedFire.windSpeed
        );
    }
}

function resetScanning() {
    stopScanning();
    detectionData = {
        fireCount: 0,
        confidence: 0,
        areaRisk: 0,
        alertLevel: 'safe',
        fires: []
    };
    lastDetectedFire = null;
    
    // Limpiar marcadores
    fireMarkers.forEach(marker => map.removeLayer(marker));
    fireMarkers = [];
    
    updateUI();
    document.getElementById('detectionLog').innerHTML = '<p class="log-entry empty">Esperando análisis...</p>';
    updateCoordinates('--', '--', '--', '--', '--', '--');
    document.getElementById('provinceLabel').textContent = '--';
}

function animate() {
    if (!isScanning) return;

    // Simular detecciones (probabilidad reducida: 0.98)
    if (Math.random() > 0.98) {
        detectFire();
    }

    // Actualizar UI
    updateUI();

    animationFrameId = requestAnimationFrame(animate);
}

function detectFire() {
    const intensity = parseInt(document.getElementById('intensitySlider').value);
    const sensitivity = parseInt(document.getElementById('sensitivitySlider').value);

    // Obtener coordenadas dentro de una provincia argentina
    const { lat, lon, provinceName } = getRandomProvinceCoords();

    const radius = 10 + Math.random() * 30;

    // Calcular confianza basada en sensibilidad
    const confidence = Math.min(100, 40 + sensitivity * 0.6 + Math.random() * 30);

    // Crear fuego
    const fire = {
        lat: lat,
        lon: lon,
        radius: radius,
        temperature: 300 + Math.random() * 500, // Kelvin
        confidence: confidence,
        intensity: intensity,
        timestamp: new Date(),
        humidity: (40 + Math.random() * 50).toFixed(1),
        windSpeed: (5 + Math.random() * 20).toFixed(1),
        area: (radius * radius * 0.01).toFixed(2),
        provinceName: provinceName
    };

    detectionData.fires.push(fire);
    lastDetectedFire = fire;
    detectionData.fireCount = detectionData.fires.length;
    detectionData.confidence = Math.min(100, confidence);
    detectionData.areaRisk += parseFloat(fire.area);

    // Actualizar nivel de alerta
    if (detectionData.fireCount >= 5) {
        detectionData.alertLevel = 'danger';
    } else if (detectionData.fireCount >= 2) {
        detectionData.alertLevel = 'warning';
    } else {
        detectionData.alertLevel = 'safe';
    }

    // Actualizar provincia en panel
    document.getElementById('provinceLabel').textContent = provinceName;

    // Añadir marcador al mapa
    addFireMarker(fire);

    // Log de detección
    addDetectionLog(fire);
}

function addFireMarker(fire) {
    const tempCelsius = Math.round(fire.temperature - 273.15);
    const popupContent = `
        <div style="text-align: center; font-family: Arial, sans-serif; font-size: 12px;">
            <p style="margin: 5px 0; font-weight: bold;">Foco #${detectionData.fireCount}</p>
            <p style="margin: 5px 0;"><strong>Provincia:</strong> ${fire.provinceName}</p>
            <p style="margin: 5px 0;"><strong>Temperatura:</strong> ${tempCelsius}°C</p>
            <p style="margin: 5px 0;"><strong>Confianza:</strong> ${Math.round(fire.confidence)}%</p>
            <p style="margin: 5px 0;"><strong>Área:</strong> ${fire.area} ha</p>
        </div>
    `;

    // Crear marcador con icono personalizado
    const marker = L.circleMarker([fire.lat, fire.lon], {
        radius: 8,
        fillColor: '#e74c3c',
        color: '#c0392b',
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.7
    }).bindPopup(popupContent)
      .addTo(map);

    fireMarkers.push(marker);

    // Auto-abrir popup para algunos focos
    if (detectionData.fireCount % 2 === 0) {
        marker.openPopup();
    }
}

// ===== FUNCIONES DE UI =====
function updateUI() {
    document.getElementById('fireCount').textContent = detectionData.fireCount;
    document.getElementById('confidence').textContent = Math.round(detectionData.confidence) + '%';
    document.getElementById('areaRisk').textContent = detectionData.areaRisk.toFixed(1);

    // Actualizar nivel de alerta
    const alertElement = document.getElementById('alertLevel');
    const statusElement = document.getElementById('alertStatus');

    alertElement.innerHTML = '';
    const badge = document.createElement('span');
    badge.className = `alert-badge ${detectionData.alertLevel}`;

    switch (detectionData.alertLevel) {
        case 'danger':
            badge.textContent = 'CRÍTICO';
            statusElement.textContent = 'Múltiples focos detectados';
            break;
        case 'warning':
            badge.textContent = 'ADVERTENCIA';
            statusElement.textContent = 'Focos detectados';
            break;
        case 'safe':
            badge.textContent = 'NORMAL';
            statusElement.textContent = 'Sin amenazas detectadas';
            break;
    }

    alertElement.appendChild(badge);
}

function addDetectionLog(fire) {
    const logContent = document.getElementById('detectionLog');

    // Eliminar mensaje vacío
    const emptyEntry = logContent.querySelector('.empty');
    if (emptyEntry) emptyEntry.remove();

    // Crear entrada de log
    const entry = document.createElement('p');
    entry.className = 'log-entry fire';
    const time = fire.timestamp.toLocaleTimeString();
    const tempCelsius = Math.round(fire.temperature - 273.15);
    
    entry.innerHTML = `
        <span class="timestamp">[${time}]</span> Foco #${detectionData.fireCount} - ${fire.provinceName} - ${tempCelsius}°C - ${Math.round(fire.confidence)}%
    `;

    logContent.prepend(entry);

    // Limitar a 10 entradas
    while (logContent.children.length > 10) {
        logContent.removeChild(logContent.lastChild);
    }
}

function updateStatus(message) {
    document.getElementById('statusText').textContent = message;
}

function updateCoordinates(province, lat, lon, temp, humidity, wind) {
    document.getElementById('province').textContent = province;
    document.getElementById('latitude').textContent = lat;
    document.getElementById('longitude').textContent = lon;
    document.getElementById('temperature').textContent = typeof temp === 'number' ? temp + ' °C' : temp;
    document.getElementById('humidity').textContent = typeof humidity === 'number' ? humidity + ' %' : humidity;
    document.getElementById('windSpeed').textContent = typeof wind === 'number' ? wind + ' km/h' : wind;
}

// ===== EVENT LISTENERS =====
document.getElementById('startBtn').addEventListener('click', startScanning);
document.getElementById('stopBtn').addEventListener('click', stopScanning);
document.getElementById('resetBtn').addEventListener('click', resetScanning);

// Sliders
document.getElementById('intensitySlider').addEventListener('input', (e) => {
    document.getElementById('intensityValue').textContent = e.target.value + '%';
});

document.getElementById('sensitivitySlider').addEventListener('input', (e) => {
    document.getElementById('sensitivityValue').textContent = e.target.value + '%';
});

// ===== INICIALIZACIÓN =====
initializeMap();
updateUI();

console.log('Sistema listo. Haz clic en "Iniciar" para comenzar.');

