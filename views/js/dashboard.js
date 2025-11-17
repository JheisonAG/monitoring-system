// ===================================
// CONFIGURACIÓN Y ESTADO GLOBAL
// ===================================
let realTimeChart = null;
let sensorData = {
    temperature: [],
    humidity: [],
    timestamps: []
};
const MAX_DATA_POINTS = 30;
let currentPeriod = 'hoy';
let currentPage = 1;
let totalPages = 1;
let allRecords = [];

// Realtime Database URL - consumiendo datos del único dispositivo
const RTDB_URL = 'https://orchid-care-pro-default-rtdb.firebaseio.com';

// ===================================
// INICIALIZACIÓN
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌺 Inicializando OrchidCare Pro Dashboard...');
    inicializarGrafico();
    cargarDatosIniciales();
    iniciarActualizacionTiempoReal();
    configurarEventListeners();
});

// ===================================
// GRÁFICO CHART.JS
// ===================================
function inicializarGrafico() {
    const ctx = document.getElementById('realTimeChart');
    if (!ctx) {
        console.error('Canvas para gráfico no encontrado');
        return;
    }

    realTimeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Temperatura (°C)',
                    data: [],
                    borderColor: '#f6ad55',
                    backgroundColor: 'rgba(246, 173, 85, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#f6ad55',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                },
                {
                    label: 'Humedad (%)',
                    data: [],
                    borderColor: '#4299e1',
                    backgroundColor: 'rgba(66, 153, 225, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#4299e1',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 13,
                            weight: '600'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#2d3748',
                    bodyColor: '#2d3748',
                    borderColor: '#e2e8f0',
                    borderWidth: 1,
                    padding: 12,
                    bodyFont: {
                        size: 13
                    },
                    titleFont: {
                        size: 14,
                        weight: '600'
                    },
                    boxPadding: 6
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: '#e2e8f0',
                        drawBorder: false
                    },
                    ticks: {
                        font: {
                            size: 12
                        },
                        color: '#4a5568'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 12
                        },
                        color: '#4a5568',
                        maxRotation: 0
                    }
                }
            }
        }
    });
    
    console.log('✅ Gráfico inicializado');
}

// ===================================
// ACTUALIZACIÓN EN TIEMPO REAL
// ===================================
function iniciarActualizacionTiempoReal() {
    actualizarDatosTiempoReal();
    setInterval(actualizarDatosTiempoReal, 5000); // Cada 5 segundos
    console.log('🔄 Actualización en tiempo real iniciada (cada 5 segundos)');
}

async function actualizarDatosTiempoReal() {
    try {
        // Intentar obtener datos directamente desde RTDB (Realtime Database)
        let temperatura, humedad, proximoRiego, estadoSistema;
        try {
            const rtdb = await fetch(`${RTDB_URL}/device.json?_=${Date.now()}`);
            if (rtdb.ok) {
                const rtdbData = await rtdb.json();
                if (rtdbData && (rtdbData.temperatura !== undefined || rtdbData.humedad !== undefined)) {
                    temperatura = parseFloat(rtdbData.temperatura);
                    humedad = parseFloat(rtdbData.humedad);
                    estadoSistema = rtdbData.estado || null;
                    proximoRiego = (rtdbData.riego && rtdbData.riego.enCurso) ? rtdbData.riego : null;
                }
            }
        } catch (err) {
            // Si falla RTDB, fallback a API
            console.debug('RTDB fetch failed, falling back to API:', err && err.message);
        }

        // Si no obtuvimos datos desde RTDB, usar la API local
        if (temperatura === undefined || humedad === undefined) {
            const response = await fetch('/api/dashboard/tiempo-real?id_invernadero=1');
            const result = await response.json();

            if (result.success && result.data) {
                temperatura = result.data.temperatura;
                humedad = result.data.humedad;
                proximoRiego = result.data.proximoRiego;
                estadoSistema = result.data.estadoSistema;
            } else {
                console.warn('⚠️ No se recibieron datos válidos del servidor');
                return;
            }
        }
            
            // Actualizar widgets
            actualizarWidgets(temperatura, humedad, proximoRiego, estadoSistema);
            
            // Actualizar gráfico
            actualizarGrafico(temperatura, humedad);
            
            // Actualizar estadísticas promedio
            actualizarEstadisticas();
            
            // Actualizar alertas en tiempo real
            await cargarAlertas();
            
            // Actualizar badge de notificaciones
            await actualizarBadgeNotificaciones();
            
            // Actualizar última actualización
            actualizarUltimaActualizacion();
            
            console.log(`📊 Datos actualizados: ${temperatura}°C, ${humedad}%`);
    } catch (error) {
        console.error('❌ Error al obtener datos en tiempo real:', error);
    }
}

async function actualizarWidgets(temperatura, humedad, proximoRiego, estadoSistema) {
    // Widget Humedad
    const humedadValue = document.getElementById('humidity-value');
    const humedadProgress = document.getElementById('humidity-progress');
    const humedadBadge = document.getElementById('humidity-badge');
    
    if (humedadValue) {
        humedadValue.textContent = `${humedad.toFixed(1)}%`;
    }
    if (humedadProgress) {
        const humedadPercent = ((humedad - 75) / (82 - 75)) * 100;
        humedadProgress.style.width = `${Math.max(0, Math.min(100, humedadPercent))}%`;
    }
    if (humedadBadge) {
        const diff = humedad - 78; // 78 es el promedio óptimo
        humedadBadge.innerHTML = `<i class="fas fa-arrow-${diff >= 0 ? 'up' : 'down'}"></i> ${Math.abs(diff).toFixed(1)}%`;
    }

    // Widget Temperatura
    const temperaturaValue = document.getElementById('temperature-value');
    const temperaturaProgress = document.getElementById('temperature-progress');
    const temperaturaBadge = document.getElementById('temperature-badge');
    
    if (temperaturaValue) {
        temperaturaValue.textContent = `${temperatura.toFixed(1)}°C`;
    }
    if (temperaturaProgress) {
        const tempPercent = ((temperatura - 18) / (24 - 18)) * 100;
        temperaturaProgress.style.width = `${Math.max(0, Math.min(100, tempPercent))}%`;
    }
    if (temperaturaBadge) {
        const diff = temperatura - 21; // 21 es el promedio óptimo
        temperaturaBadge.innerHTML = `<i class="fas fa-arrow-${diff >= 0 ? 'up' : 'down'}"></i> ${Math.abs(diff).toFixed(1)}°C`;
    }

    // Widget Próximo Riego - Verificar si hay riego en curso
    try {
        const estadoRiegoResponse = await fetch('/api/riego/estado');
        const estadoRiegoResult = await estadoRiegoResponse.json();
        
        if (estadoRiegoResult.success && estadoRiegoResult.data) {
            actualizarWidgetRiego(estadoRiegoResult.data, proximoRiego);
        }
    } catch (error) {
        console.error('Error al obtener estado de riego:', error);
        // Fallback al comportamiento anterior
        actualizarWidgetRiegoSinEstado(proximoRiego);
    }

    // Widget Estado del Sistema
    const systemStatus = document.getElementById('system-status');
    const statusBadge = document.getElementById('status-badge');
    const statusLabel = document.getElementById('status-label');
    const statusProgress = document.getElementById('status-progress');
    
    if (estadoSistema) {
        const estado = determinarEstadoSistema(temperatura, humedad);
        if (systemStatus) systemStatus.textContent = estado.texto;
        if (statusBadge) {
            statusBadge.className = `widget-badge badge-${estado.clase}`;
            statusBadge.innerHTML = `<i class="fas fa-circle"></i> ${estado.estado}`;
        }
        if (statusProgress) {
            statusProgress.style.width = `${estado.porcentaje}%`;
        }
        if (statusLabel) {
            statusLabel.textContent = 'Última actualización: Hace 5s';
        }
    }
}

function determinarEstadoSistema(temp, hum) {
    const tempOptima = temp >= 18 && temp <= 24;
    const humOptima = hum >= 75 && hum <= 82;
    
    if (tempOptima && humOptima) {
        return { texto: 'Óptimo', estado: 'Activo', clase: 'success', porcentaje: 100 };
    }
    if (!tempOptima && !humOptima) {
        return { texto: 'Crítico', estado: 'Alerta', clase: 'danger', porcentaje: 50 };
    }
    return { texto: 'Normal', estado: 'Advertencia', clase: 'warning', porcentaje: 75 };
}

function actualizarWidgetRiego(estadoRiego, proximoRiego) {
    const widgetWatering = document.getElementById('widget-watering');
    const labelText = document.getElementById('watering-label-text');
    const nextWatering = document.getElementById('next-watering');
    const wateringBadge = document.getElementById('watering-badge');
    const wateringIcon = document.getElementById('watering-icon');
    const wateringProgressContainer = document.getElementById('watering-progress-container');
    const wateringProgress = document.getElementById('watering-progress');
    const wateringProgressText = document.getElementById('watering-progress-text');
    const wateringTimeRemaining = document.getElementById('watering-time-remaining');
    const wateringPercentage = document.getElementById('watering-percentage');
    const wateringDurationTotal = document.getElementById('watering-duration-total');
    const wateringFooterLabel = document.getElementById('watering-footer-label');
    
    // Si hay riego en curso, mostrar información de progreso EN EL DASHBOARD
    if (estadoRiego.riegoEnCurso) {
        // Agregar clase visual para destacar el widget
        if (widgetWatering) {
            widgetWatering.classList.add('riego-activo');
        }
        
        // Actualizar título y estado
        if (labelText) labelText.textContent = '🚰 Riego en Proceso';
        if (nextWatering) {
            nextWatering.textContent = 'ACTIVO AHORA';
            nextWatering.style.color = 'var(--info-color)';
            nextWatering.style.fontWeight = '700';
        }
        if (wateringBadge) {
            wateringBadge.className = 'widget-badge badge-info';
            wateringBadge.innerHTML = `<i class="fas fa-spinner fa-spin"></i> En Progreso`;
        }
        
        // Cambiar ícono a animado
        if (wateringIcon) {
            wateringIcon.innerHTML = '<i class="fas fa-tint"></i>';
        }
        
        // Mostrar contenedor de progreso con detalles
        if (wateringProgressContainer) {
            wateringProgressContainer.style.display = 'block';
        }
        
        // Actualizar detalles del estado
        if (wateringTimeRemaining) {
            wateringTimeRemaining.textContent = `${estadoRiego.tiempoRestante} min`;
        }
        if (wateringPercentage) {
            wateringPercentage.textContent = `${estadoRiego.progreso.toFixed(0)}%`;
        }
        if (wateringDurationTotal) {
            wateringDurationTotal.textContent = `${estadoRiego.configuracion.duracionMinutos} min`;
        }
        
        // Actualizar barra de progreso animada
        if (wateringProgress) {
            wateringProgress.style.width = `${estadoRiego.progreso}%`;
        }
        if (wateringProgressText) {
            wateringProgressText.textContent = `${estadoRiego.progreso.toFixed(0)}%`;
        }
        
        // Footer con información del riego
        if (wateringFooterLabel) {
            wateringFooterLabel.textContent = `⏱️ Riego iniciado hace ${Math.ceil(estadoRiego.progreso / 100 * estadoRiego.configuracion.duracionMinutos)} minuto(s)`;
        }
    } else {
        // No hay riego en curso - remover estilo de riego activo
        if (widgetWatering) {
            widgetWatering.classList.remove('riego-activo');
        }
        
        // Restaurar título normal
        if (labelText) labelText.textContent = 'Próximo Riego';
        
        // Restaurar ícono normal
        if (wateringIcon) {
            wateringIcon.innerHTML = '<i class="fas fa-water"></i>';
        }
        
        // Restaurar estilo del valor
        if (nextWatering) {
            nextWatering.style.color = '';
            nextWatering.style.fontWeight = '';
        }
        
        // Ocultar barra de progreso
        if (wateringProgressContainer) {
            wateringProgressContainer.style.display = 'none';
        }
        
        // Verificar si hay próximo riego válido (no null y con diasRestantes)
        const tieneProximoRiego = proximoRiego && proximoRiego.diasRestantes !== null;
        
        if (tieneProximoRiego) {
            if (nextWatering) {
                nextWatering.textContent = proximoRiego.diasRestantes > 0 
                    ? `En ${proximoRiego.diasRestantes} día${proximoRiego.diasRestantes > 1 ? 's' : ''}`
                    : 'Hoy';
            }
            if (wateringBadge) {
                wateringBadge.className = 'widget-badge badge-success';
                wateringBadge.innerHTML = `<i class="fas fa-check"></i> Programado`;
            }
            if (wateringFooterLabel) {
                wateringFooterLabel.textContent = `Última vez: Hace ${proximoRiego.diasDesdeUltimo || 0} días`;
            }
        } else {
            if (nextWatering) nextWatering.textContent = 'Sin programar';
            if (wateringBadge) {
                wateringBadge.className = 'widget-badge badge-warning';
                wateringBadge.innerHTML = `<i class="fas fa-exclamation"></i> Sin programar`;
            }
            if (wateringFooterLabel) {
                wateringFooterLabel.textContent = 'Programa tu próximo riego';
            }
        }
    }
}

function actualizarWidgetRiegoSinEstado(proximoRiego) {
    const labelText = document.getElementById('watering-label-text');
    const nextWatering = document.getElementById('next-watering');
    const wateringBadge = document.getElementById('watering-badge');
    const wateringProgressContainer = document.getElementById('watering-progress-container');
    const wateringFooterLabel = document.getElementById('watering-footer-label');
    
    if (labelText) labelText.textContent = 'Próximo Riego';
    
    // Ocultar barra de progreso
    if (wateringProgressContainer) {
        wateringProgressContainer.style.display = 'none';
    }
    
    // Verificar si hay próximo riego válido
    const tieneProximoRiego = proximoRiego && proximoRiego.diasRestantes !== null;
    
    if (tieneProximoRiego) {
        if (nextWatering) {
            nextWatering.textContent = proximoRiego.diasRestantes > 0 
                ? `En ${proximoRiego.diasRestantes} día${proximoRiego.diasRestantes > 1 ? 's' : ''}`
                : 'Hoy';
        }
        if (wateringBadge) {
            wateringBadge.className = 'widget-badge badge-success';
            wateringBadge.innerHTML = `<i class="fas fa-check"></i> Programado`;
        }
        if (wateringFooterLabel) {
            wateringFooterLabel.textContent = `Última vez: Hace ${proximoRiego.diasDesdeUltimo || 0} días`;
        }
    } else {
        if (nextWatering) nextWatering.textContent = 'Sin programar';
        if (wateringBadge) {
            wateringBadge.className = 'widget-badge badge-warning';
            wateringBadge.innerHTML = `<i class="fas fa-exclamation"></i> Sin programar`;
        }
        if (wateringFooterLabel) {
            wateringFooterLabel.textContent = 'Programa tu próximo riego';
        }
    }
}

function actualizarGrafico(temperatura, humedad) {
    if (!realTimeChart) return;

    const now = new Date();
    const timeLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Agregar nuevos datos
    sensorData.timestamps.push(timeLabel);
    sensorData.temperature.push(temperatura);
    sensorData.humidity.push(humedad);

    // Mantener solo los últimos MAX_DATA_POINTS
    if (sensorData.timestamps.length > MAX_DATA_POINTS) {
        sensorData.timestamps.shift();
        sensorData.temperature.shift();
        sensorData.humidity.shift();
    }

    // Actualizar gráfico
    realTimeChart.data.labels = sensorData.timestamps;
    realTimeChart.data.datasets[0].data = sensorData.temperature;
    realTimeChart.data.datasets[1].data = sensorData.humidity;
    realTimeChart.update('none');
}

function actualizarEstadisticas() {
    if (sensorData.temperature.length === 0) return;

    // Calcular promedio temperatura
    const avgTemp = sensorData.temperature.reduce((a, b) => a + b, 0) / sensorData.temperature.length;
    const avgTempElement = document.getElementById('avg-temperature');
    if (avgTempElement) {
        avgTempElement.textContent = `${avgTemp.toFixed(1)}°C`;
    }

    // Calcular promedio humedad
    const avgHum = sensorData.humidity.reduce((a, b) => a + b, 0) / sensorData.humidity.length;
    const avgHumElement = document.getElementById('avg-humidity');
    if (avgHumElement) {
        avgHumElement.textContent = `${avgHum.toFixed(1)}%`;
    }
}

function actualizarUltimaActualizacion() {
    const lastUpdateElement = document.getElementById('last-update');
    if (lastUpdateElement) {
        lastUpdateElement.textContent = 'Ahora';
    }
}

// ===================================
// CARGAR DATOS INICIALES
// ===================================
async function cargarDatosIniciales() {
    console.log('📂 Cargando datos iniciales...');
    try {
        // Cargar alertas
        await cargarAlertas();
        
        // Cargar notificaciones
        await cargarNotificaciones();
        
        // Cargar historial de registros
        await cargarHistorialRegistros(currentPeriod);
        
        console.log('✅ Datos iniciales cargados');
    } catch (error) {
        console.error('❌ Error al cargar datos iniciales:', error);
    }
}

async function cargarAlertas() {
    try {
        const response = await fetch('/api/dashboard/alertas?id_usuario=1&limite=5');
        const result = await response.json();

        const alertasList = document.getElementById('sidebar-alerts');
        const alertCount = document.getElementById('sidebar-alert-count');
        
        if (result.success && result.data && result.data.length > 0) {
            // Mostrar widget de alertas si hay alertas
            const widgetAlerts = document.getElementById('widget-alerts');
            if (widgetAlerts) {
                widgetAlerts.style.display = 'block';
            }
            
            if (alertCount) {
                alertCount.textContent = result.data.length;
            }
            
            if (alertasList) {
                alertasList.innerHTML = result.data.map(alerta => {
                    // Usar descripcion o mensaje como fallback
                    const descripcion = alerta.descripcion || alerta.mensaje || '';
                    
                    return `
                        <div class="alert-item ${alerta.tipo || alerta.prioridad || 'info'}" onclick="verDetalleAlerta(${JSON.stringify(alerta).replace(/"/g, '&quot;')})">
                            <strong>${alerta.titulo || 'Alerta'}</strong>
                            ${descripcion ? `<div style="font-size: 12px; color: #718096; margin-top: 4px;">${descripcion}</div>` : ''}
                        </div>
                    `;
                }).join('');
            }
            
            console.log(`📢 ${result.data.length} alertas cargadas`);
        } else {
            // No hay alertas - mostrar mensaje
            const widgetAlerts = document.getElementById('widget-alerts');
            if (widgetAlerts) {
                widgetAlerts.style.display = 'none';
            }
            
            if (alertCount) {
                alertCount.textContent = '0';
            }
            
            if (alertasList) {
                alertasList.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: #a0aec0; font-size: 13px;">
                        <i class="fas fa-check-circle" style="font-size: 32px; margin-bottom: 8px; display: block;"></i>
                        No hay alertas
                    </div>
                `;
            }
            
            console.log('ℹ️ No hay alertas activas');
        }
    } catch (error) {
        console.error('Error al cargar alertas:', error);
        mostrarAlertasEjemplo();
    }
}

function mostrarAlertasEjemplo() {
    const alertasList = document.getElementById('sidebar-alerts');
    const alertCount = document.getElementById('sidebar-alert-count');
    
    if (alertCount) alertCount.textContent = '3';
    
    if (alertasList) {
        alertasList.innerHTML = `
            <div class="alert-item info" onclick="verDetalleAlerta({titulo: 'Temperatura Estable', mensaje: 'La temperatura se mantiene en rango óptimo', prioridad: 'baja'})">
                <strong>Temperatura Estable</strong>
                <div style="font-size: 12px; color: #718096; margin-top: 4px;">
                    La temperatura se mantiene en 21.3°C
                </div>
            </div>
            <div class="alert-item warning" onclick="verDetalleAlerta({titulo: 'Humedad Baja', mensaje: 'La humedad está por debajo del rango óptimo', prioridad: 'media'})">
                <strong>Humedad Baja</strong>
                <div style="font-size: 12px; color: #718096; margin-top: 4px;">
                    Humedad en 76.5%, considere riego
                </div>
            </div>
            <div class="alert-item info" onclick="verDetalleAlerta({titulo: 'Sistema Activo', mensaje: 'Todos los sensores están funcionando correctamente', prioridad: 'baja'})">
                <strong>Sistema Activo</strong>
                <div style="font-size: 12px; color: #718096; margin-top: 4px;">
                    Todos los sensores funcionando correctamente
                </div>
            </div>
        `;
    }
}

async function cargarNotificaciones() {
    try {
        const response = await fetch('/api/notificaciones?id_usuario=1&limite=20');
        const result = await response.json();

        const badge = document.getElementById('notification-badge');
        
        if (result.success && result.totalNoLeidas) {
            if (badge) {
                badge.textContent = result.totalNoLeidas;
            }
        } else {
            if (badge) badge.textContent = '3';
        }
        
        console.log('🔔 Notificaciones cargadas');
    } catch (error) {
        console.error('Error al cargar notificaciones:', error);
        const badge = document.getElementById('notification-badge');
        if (badge) badge.textContent = '3';
    }
}

async function actualizarBadgeNotificaciones() {
    try {
        const response = await fetch('/api/dashboard/alertas?limite=10');
        const result = await response.json();

        const badge = document.querySelector('.notification-badge');
        
        if (result.success && result.totalNoLeidas > 0) {
            if (badge) {
                badge.textContent = result.totalNoLeidas;
                badge.style.display = 'flex';
            }
        } else {
            if (badge) {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error al actualizar badge de notificaciones:', error);
    }
}

async function cargarHistorialRegistros(periodo = 'hoy') {
    try {
        const response = await fetch(`/api/registros?id_invernadero=1&periodo=${periodo}&limite=100`);
        const result = await response.json();

        const tbody = document.getElementById('records-tbody');
        
        if (result.success && result.data && result.data.registros && result.data.registros.length > 0) {
            allRecords = result.data.registros;
            mostrarPaginaRegistros(1);
            console.log(`📋 ${allRecords.length} registros cargados`);
        } else {
            // Mostrar registros de ejemplo
            mostrarRegistrosEjemplo();
        }
    } catch (error) {
        console.error('Error al cargar historial:', error);
        mostrarRegistrosEjemplo();
    }
}

function mostrarPaginaRegistros(pagina) {
    const registrosPorPagina = 10;
    const inicio = (pagina - 1) * registrosPorPagina;
    const fin = inicio + registrosPorPagina;
    const registrosPagina = allRecords.slice(inicio, fin);
    
    totalPages = Math.ceil(allRecords.length / registrosPorPagina);
    currentPage = pagina;
    
    const tbody = document.getElementById('records-tbody');
    if (tbody) {
        tbody.innerHTML = registrosPagina.map(registro => `
            <tr>
                <td>${formatearFechaHora(registro.fecha_hora)}</td>
                <td>${registro.temperatura.toFixed(1)}°C</td>
                <td>${registro.humedad.toFixed(1)}%</td>
                <td>
                    <span class="status-badge badge-${registro.estado === 'NORMAL' ? 'normal' : 'alert'}">
                        ${registro.estado || 'NORMAL'}
                    </span>
                </td>
                <td>
                    <button class="btn-action" onclick="verDetalleRegistro(${registro.id})">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    actualizarPaginacion();
}

function actualizarPaginacion() {
    const paginationInfo = document.getElementById('pagination-info');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    
    if (paginationInfo) {
        paginationInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    }
    
    if (btnPrev) {
        btnPrev.disabled = currentPage === 1;
    }
    
    if (btnNext) {
        btnNext.disabled = currentPage === totalPages;
    }
}

function mostrarRegistrosEjemplo() {
    const tbody = document.getElementById('records-tbody');
    if (!tbody) return;
    
    const registrosEjemplo = [];
    const now = new Date();
    
    for (let i = 0; i < 20; i++) {
        const fecha = new Date(now - i * 300000); // 5 minutos atrás
        registrosEjemplo.push({
            id: i + 1,
            fecha_hora: fecha,
            temperatura: 20 + Math.random() * 3,
            humedad: 76 + Math.random() * 5,
            estado: Math.random() > 0.8 ? 'ALERTA' : 'NORMAL'
        });
    }
    
    allRecords = registrosEjemplo;
    mostrarPaginaRegistros(1);
}

// ===================================
// CONFIGURAR EVENT LISTENERS
// ===================================
function configurarEventListeners() {
    console.log('⚙️ Configurando event listeners...');
    
    // Botones de control de tiempo del gráfico
    const chartControls = document.querySelectorAll('.btn-control');
    chartControls.forEach(btn => {
        btn.addEventListener('click', function() {
            chartControls.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const period = this.getAttribute('data-period');
            console.log(`📊 Cambiando período del gráfico a ${period}H`);
        });
    });

    // Tabs de historial
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', async function() {
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const periodo = this.getAttribute('data-period');
            currentPeriod = periodo;
            await cargarHistorialRegistros(periodo);
        });
    });

    // Control de riego en header
    const btnRiegoHeader = document.getElementById('btnRiegoHeader');
    if (btnRiegoHeader) {
        btnRiegoHeader.addEventListener('click', () => {
            abrirModalRiego();
        });
    }

    // Modal de riego
    const modalRiego = document.getElementById('modal-riego');
    const modalRiegoClose = document.getElementById('modal-riego-close');
    const modalRiegoOverlay = document.getElementById('modal-riego-overlay');
    const btnStartRiego = document.getElementById('btn-start-riego');
    const btnStopRiego = document.getElementById('btn-stop-riego');
    const btnGuardarConfig = document.getElementById('btn-guardar-config');
    
    if (modalRiegoClose) {
        modalRiegoClose.addEventListener('click', () => cerrarModalRiego());
    }
    if (modalRiegoOverlay) {
        modalRiegoOverlay.addEventListener('click', () => cerrarModalRiego());
    }
    if (btnStartRiego) {
        btnStartRiego.addEventListener('click', () => iniciarRiegoManual());
    }
    if (btnStopRiego) {
        btnStopRiego.addEventListener('click', () => detenerRiego());
    }
    if (btnGuardarConfig) {
        btnGuardarConfig.addEventListener('click', () => guardarConfiguracion());
    }

    // Botón de notificaciones
    const btnNotifications = document.getElementById('btnNotifications');
    if (btnNotifications) {
        btnNotifications.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleNotificationsDropdown();
        });
    }

    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('notifications-dropdown');
        const btn = document.getElementById('btnNotifications');
        if (dropdown && !dropdown.contains(e.target) && e.target !== btn) {
            dropdown.classList.remove('active');
        }
    });

    // Modal de detalle de alerta
    const modalAlertClose = document.getElementById('modal-alert-close');
    const modalAlertOverlay = document.getElementById('modal-alert-overlay');
    
    if (modalAlertClose) {
        modalAlertClose.addEventListener('click', () => cerrarModalAlert());
    }
    if (modalAlertOverlay) {
        modalAlertOverlay.addEventListener('click', () => cerrarModalAlert());
    }

    // Paginación
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    
    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            if (currentPage > 1) {
                mostrarPaginaRegistros(currentPage - 1);
            }
        });
    }
    
    if (btnNext) {
        btnNext.addEventListener('click', () => {
            if (currentPage < totalPages) {
                mostrarPaginaRegistros(currentPage + 1);
            }
        });
    }

    // Botón de exportar
    const btnExport = document.getElementById('btn-export');
    if (btnExport) {
        btnExport.addEventListener('click', () => exportarRegistros());
    }

    // Buscador
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filtrarRegistros(e.target.value);
        });
    }
    
    // Botón de programar riego
    const btnProgramar = document.getElementById('btn-programar-riego');
    if (btnProgramar) {
        btnProgramar.addEventListener('click', () => programarRiegoEspecifico());
    }
    
    console.log('✅ Event listeners configurados');
}

// ===================================
// FUNCIONES DE MODAL DE RIEGO
// ===================================
async function abrirModalRiego() {
    const modal = document.getElementById('modal-riego');
    if (modal) {
        modal.classList.add('active');
        
        // Configurar fecha mínima del input a hoy
        const inputFecha = document.getElementById('input-fecha-riego');
        if (inputFecha) {
            const hoy = new Date().toISOString().split('T')[0];
            inputFecha.min = hoy;
            inputFecha.value = hoy;
        }
        
        await cargarConfiguracionRiego();
        await actualizarEstadoRiego();
        await cargarRiegosProgramados();
        console.log('🚰 Modal de riego abierto');
    }
}

function cerrarModalRiego() {
    const modal = document.getElementById('modal-riego');
    if (modal) {
        modal.classList.remove('active');
    }
}

async function cargarConfiguracionRiego() {
    try {
        const response = await fetch('/api/riego/configuracion');
        const result = await response.json();
        
        if (result.success && result.data) {
            const config = result.data;
            
            // Actualizar formulario
            document.getElementById('input-duracion').value = config.duracionMinutos;
            document.getElementById('input-frecuencia').value = config.frecuenciaDias;
            document.getElementById('input-hora').value = config.horaInicio;
            document.getElementById('input-activo').checked = config.activo;
            
            // Actualizar información mostrada
            document.getElementById('riego-duration').textContent = `${config.duracionMinutos} minutos`;
            document.getElementById('riego-frequency').textContent = `Cada ${config.frecuenciaDias} día${config.frecuenciaDias > 1 ? 's' : ''}`;
            document.getElementById('riego-hora').textContent = config.horaInicio;
        }
    } catch (error) {
        console.error('Error al cargar configuración de riego:', error);
    }
}

async function actualizarEstadoRiego() {
    try {
        const response = await fetch('/api/riego/estado');
        const result = await response.json();
        
        if (result.success && result.data) {
            const estado = result.data;
            const statusBadge = document.getElementById('riego-status');
            const progressContainer = document.getElementById('riego-progress-container');
            const btnStart = document.getElementById('btn-start-riego');
            const btnStop = document.getElementById('btn-stop-riego');
            
            if (estado.riegoEnCurso) {
                // Riego en curso
                statusBadge.className = 'status-badge badge-active';
                statusBadge.textContent = 'Riego en Curso';
                
                // Mostrar progreso
                progressContainer.style.display = 'block';
                document.getElementById('riego-progreso').textContent = `${Math.round(estado.progreso)}%`;
                document.getElementById('riego-tiempo-restante').textContent = `${estado.tiempoRestante} min`;
                document.getElementById('riego-progress-bar').style.width = `${estado.progreso}%`;
                
                // Mostrar botón de detener
                btnStart.style.display = 'none';
                btnStop.style.display = 'inline-flex';
            } else {
                // Riego inactivo
                statusBadge.className = 'status-badge badge-inactive';
                statusBadge.textContent = 'Inactivo';
                
                // Ocultar progreso
                progressContainer.style.display = 'none';
                
                // Mostrar botón de iniciar
                btnStart.style.display = 'inline-flex';
                btnStop.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error al actualizar estado de riego:', error);
    }
}

async function iniciarRiegoManual() {
    const duracion = document.getElementById('input-duracion').value;
    
    if (confirm(`¿Está seguro de iniciar el riego manual (${duracion} minutos)?`)) {
        try {
            console.log('🚰 Iniciando riego manual...');
            
            const response = await fetch('/api/riego/iniciar', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ duracion: parseInt(duracion) })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Mostrar notificación de éxito
                mostrarNotificacionTemporal('Riego manual iniciado correctamente', 'success');
                
                // Actualizar estado del modal
                await actualizarEstadoRiego();
                
                // Actualizar datos del dashboard
                await actualizarDatosTiempoReal();
                
                // Recargar alertas
                await cargarNotificacionesDropdown();
                
                // Actualizar estado cada 5 segundos mientras esté activo
                iniciarMonitoreoRiego();
            } else {
                mostrarNotificacionTemporal(result.mensaje || 'Error al iniciar el riego', 'error');
            }
        } catch (error) {
            console.error('Error al iniciar riego:', error);
            mostrarNotificacionTemporal('Error al iniciar el riego', 'error');
        }
    }
}

async function detenerRiego() {
    if (confirm('¿Está seguro de detener el riego?')) {
        try {
            const response = await fetch('/api/riego/detener', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                mostrarNotificacionTemporal('Riego detenido', 'warning');
                await actualizarEstadoRiego();
                await actualizarDatosTiempoReal();
                await cargarNotificacionesDropdown();
            } else {
                mostrarNotificacionTemporal(result.mensaje || 'Error al detener el riego', 'error');
            }
        } catch (error) {
            console.error('Error al detener riego:', error);
            mostrarNotificacionTemporal('Error al detener el riego', 'error');
        }
    }
}

async function guardarConfiguracion() {
    try {
        const configuracion = {
            duracionMinutos: parseInt(document.getElementById('input-duracion').value),
            frecuenciaDias: parseInt(document.getElementById('input-frecuencia').value),
            horaInicio: document.getElementById('input-hora').value,
            activo: document.getElementById('input-activo').checked
        };
        
        const response = await fetch('/api/riego/configuracion', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(configuracion)
        });
        
        const result = await response.json();
        
        if (result.success) {
            mostrarNotificacionTemporal('Configuración guardada correctamente', 'success');
            await cargarConfiguracionRiego();
            await actualizarDatosTiempoReal();
            await cargarNotificacionesDropdown();
        } else {
            mostrarNotificacionTemporal('Error al guardar configuración', 'error');
        }
    } catch (error) {
        console.error('Error al guardar configuración:', error);
        mostrarNotificacionTemporal('Error al guardar configuración', 'error');
    }
}

let intervaloMonitoreoRiego = null;

function iniciarMonitoreoRiego() {
    if (intervaloMonitoreoRiego) {
        clearInterval(intervaloMonitoreoRiego);
    }
    
    intervaloMonitoreoRiego = setInterval(async () => {
        const response = await fetch('/api/riego/estado');
        const result = await response.json();
        
        if (result.success && result.data) {
            if (result.data.riegoEnCurso) {
                await actualizarEstadoRiego();
                await cargarNotificacionesDropdown(); // Actualizar alertas en tiempo real
            } else {
                // Detener monitoreo si el riego terminó
                clearInterval(intervaloMonitoreoRiego);
                intervaloMonitoreoRiego = null;
                await actualizarEstadoRiego();
                await actualizarDatosTiempoReal();
            }
        }
    }, 5000);
}

// Función auxiliar para mostrar notificaciones temporales
function mostrarNotificacionTemporal(mensaje, tipo = 'info') {
    const notif = document.createElement('div');
    notif.className = `notificacion-temporal notif-${tipo}`;
    notif.textContent = mensaje;
    notif.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${tipo === 'success' ? '#48bb78' : tipo === 'error' ? '#f56565' : '#4299e1'};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        font-weight: 500;
    `;
    
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// ===================================
// FUNCIONES DE NOTIFICACIONES
// ===================================
async function toggleNotificationsDropdown() {
    const dropdown = document.getElementById('notifications-dropdown');
    if (!dropdown) return;
    
    const isActive = dropdown.classList.contains('active');
    
    if (!isActive) {
        // Cargar notificaciones y verificar si hay alertas
        const hayAlertas = await cargarNotificacionesDropdown();
        
        // Solo abrir si hay alertas
        if (hayAlertas) {
            dropdown.classList.add('active');
            console.log('🔔 Dropdown de notificaciones abierto');
        } else {
            console.log('ℹ️ No hay alertas para mostrar');
        }
    } else {
        // SIEMPRE permitir cerrar el dropdown
        dropdown.classList.remove('active');
        console.log('🔔 Dropdown de notificaciones cerrado');
    }
}

async function cargarNotificacionesDropdown() {
    try {
        const response = await fetch('/api/dashboard/alertas?limite=10');
        const result = await response.json();

        const notificationsList = document.getElementById('notifications-list');
        const notificationsDropdown = document.getElementById('notifications-dropdown');
        const badge = document.querySelector('.notification-badge');
        
        if (result.success && result.data && result.data.length > 0) {
            // Actualizar badge con número de no leídas
            if (badge && result.totalNoLeidas > 0) {
                badge.textContent = result.totalNoLeidas;
                badge.style.display = 'flex';
            } else if (badge) {
                badge.style.display = 'none';
            }
            
            notificationsList.innerHTML = result.data.map(alerta => {
                const icono = alerta.tipo === 'success' ? 'fa-check-circle' : 
                             alerta.tipo === 'warning' ? 'fa-exclamation-triangle' : 
                             alerta.tipo === 'error' ? 'fa-times-circle' : 'fa-info-circle';
                
                // Asegurar que descripcion siempre tenga un valor
                const descripcion = alerta.descripcion || alerta.mensaje || '';
                
                return `
                    <div class="notification-item ${alerta.leido ? '' : 'unread'}" onclick="marcarAlertaLeida(${alerta.id})">
                        <div class="notification-icon ${alerta.tipo}">
                            <i class="fas ${icono}"></i>
                        </div>
                        <div class="notification-content">
                            <div class="notification-title">${alerta.titulo || 'Alerta'}</div>
                            ${descripcion ? `<div class="notification-message">${descripcion}</div>` : ''}
                            <div class="notification-time">${formatearTiempoRelativo(alerta.fecha)}</div>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Agregar botón para marcar todas como leídas si hay alertas no leídas
            if (result.totalNoLeidas > 0) {
                notificationsList.innerHTML += `
                    <div class="notification-footer">
                        <button class="btn-marcar-todas" onclick="marcarTodasAlertasLeidas()">
                            <i class="fas fa-check-double"></i> Marcar todas como leídas
                        </button>
                    </div>
                `;
            }
            
            // Retornar true para indicar que hay alertas
            return true;
        } else {
            // Ocultar badge cuando no hay alertas
            if (badge) badge.style.display = 'none';
            
            // Mostrar mensaje de que no hay alertas
            notificationsList.innerHTML = `
                <div class="notification-empty">
                    <i class="fas fa-bell-slash"></i>
                    <p>No hay alertas en este momento</p>
                </div>
            `;
            
            // Retornar false para indicar que no hay alertas
            return false;
        }
    } catch (error) {
        console.error('Error al cargar alertas:', error);
        mostrarNotificacionesVacia();
        return false; // Retornar false en caso de error
    }
}

function mostrarNotificacionesVacia() {
    const notificationsList = document.getElementById('notifications-list');
    if (notificationsList) {
        notificationsList.innerHTML = `
            <div class="notification-empty">
                <i class="fas fa-bell-slash"></i>
                <p>No se pudieron cargar las alertas</p>
            </div>
        `;
    }
}

function mostrarNotificacionesEjemplo() {
    const notificationsList = document.getElementById('notifications-list');
    if (notificationsList) {
        notificationsList.innerHTML = `
            <div class="notification-item unread" onclick="verNotificacion(1)">
                <div class="notification-title">Temperatura Alta</div>
                <div class="notification-message">La temperatura ha superado los 24°C</div>
                <div class="notification-time">Hace 5 minutos</div>
            </div>
            <div class="notification-item unread" onclick="verNotificacion(2)">
                <div class="notification-title">Riego Programado</div>
                <div class="notification-message">El riego se activará en 2 horas</div>
                <div class="notification-time">Hace 1 hora</div>
            </div>
            <div class="notification-item" onclick="verNotificacion(3)">
                <div class="notification-title">Sistema Actualizado</div>
                <div class="notification-message">El sistema se actualizó correctamente</div>
                <div class="notification-time">Hace 3 horas</div>
            </div>
        `;
    }
}

async function marcarAlertaLeida(id) {
    try {
        const response = await fetch(`/api/alertas/${id}/leer`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        if (result.success) {
            // Recargar notificaciones inmediatamente
            await cargarNotificacionesDropdown();
            console.log('✅ Alerta marcada como leída y lista actualizada');
        }
    } catch (error) {
        console.error('Error al marcar alerta como leída:', error);
    }
}

async function marcarTodasAlertasLeidas() {
    try {
        const response = await fetch('/api/alertas/leer-todas', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        if (result.success) {
            mostrarNotificacionTemporal('Todas las alertas marcadas como leídas', 'success');
            await cargarNotificacionesDropdown();
        }
    } catch (error) {
        console.error('Error al marcar todas las alertas:', error);
    }
}

async function verNotificacion(id) {
    console.log(`📖 Ver notificación ${id}`);
    // Marcar como leída
    try {
        await fetch(`/api/notificaciones/${id}/leer`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_usuario: 1 })
        });
        await cargarNotificaciones();
        await cargarNotificacionesDropdown();
    } catch (error) {
        console.error('Error al marcar notificación como leída:', error);
    }
}

// ===================================
// FUNCIONES DE ALERTAS
// ===================================
function verDetalleAlerta(alerta) {
    const modal = document.getElementById('modal-alert-detail');
    const body = document.getElementById('alert-detail-body');
    
    if (body) {
        body.innerHTML = `
            <div class="alert-detail-content">
                <div class="alert-detail-item">
                    <div class="alert-detail-label">Título</div>
                    <div class="alert-detail-value">${alerta.titulo || 'Sin título'}</div>
                </div>
                <div class="alert-detail-item">
                    <div class="alert-detail-label">Mensaje</div>
                    <div class="alert-detail-value">${alerta.mensaje || 'Sin mensaje'}</div>
                </div>
                <div class="alert-detail-item">
                    <div class="alert-detail-label">Prioridad</div>
                    <div class="alert-detail-value">
                        <span class="alert-priority ${alerta.prioridad || 'baja'}">
                            ${(alerta.prioridad || 'baja').toUpperCase()}
                        </span>
                    </div>
                </div>
                <div class="alert-detail-item">
                    <div class="alert-detail-label">Fecha</div>
                    <div class="alert-detail-value">${alerta.fecha_creacion ? formatearFechaHora(alerta.fecha_creacion) : 'Ahora'}</div>
                </div>
            </div>
        `;
    }
    
    if (modal) {
        modal.classList.add('active');
    }
    
    console.log('📋 Detalle de alerta mostrado:', alerta.titulo);
}

function cerrarModalAlert() {
    const modal = document.getElementById('modal-alert-detail');
    if (modal) {
        modal.classList.remove('active');
    }
}

// ===================================
// FUNCIONES DE REGISTROS
// ===================================
function verDetalleRegistro(id) {
    const registro = allRecords.find(r => r.id === id);
    if (registro) {
        alert(`Detalle del Registro #${id}\n\nFecha: ${formatearFechaHora(registro.fecha_hora)}\nTemperatura: ${registro.temperatura.toFixed(1)}°C\nHumedad: ${registro.humedad.toFixed(1)}%\nEstado: ${registro.estado}`);
    }
}

function filtrarRegistros(termino) {
    if (!termino) {
        mostrarPaginaRegistros(1);
        return;
    }
    
    const registrosFiltrados = allRecords.filter(registro => {
        const fecha = formatearFechaHora(registro.fecha_hora).toLowerCase();
        const temp = registro.temperatura.toFixed(1);
        const hum = registro.humedad.toFixed(1);
        const estado = registro.estado.toLowerCase();
        const search = termino.toLowerCase();
        
        return fecha.includes(search) || temp.includes(search) || hum.includes(search) || estado.includes(search);
    });
    
    allRecords = registrosFiltrados;
    mostrarPaginaRegistros(1);
}

function exportarRegistros() {
    if (allRecords.length === 0) {
        alert('No hay registros para exportar');
        return;
    }
    
    let csv = 'Fecha y Hora,Temperatura,Humedad,Estado\n';
    allRecords.forEach(registro => {
        csv += `${formatearFechaHora(registro.fecha_hora)},${registro.temperatura.toFixed(1)},${registro.humedad.toFixed(1)},${registro.estado}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registros_orchidcare_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    console.log('📥 Registros exportados');
}

// ===================================
// FUNCIONES AUXILIARES
// ===================================
function formatearFechaHora(fecha) {
    const date = new Date(fecha);
    const dia = date.getDate().toString().padStart(2, '0');
    const mes = (date.getMonth() + 1).toString().padStart(2, '0');
    const anio = date.getFullYear();
    const horas = date.getHours().toString().padStart(2, '0');
    const minutos = date.getMinutes().toString().padStart(2, '0');
    return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
}

function formatearTiempoRelativo(fecha) {
    const ahora = new Date();
    const entonces = new Date(fecha);
    const diff = ahora - entonces;
    const minutos = Math.floor(diff / 60000);
    
    if (minutos < 1) return 'Ahora';
    if (minutos < 60) return `Hace ${minutos} minuto${minutos > 1 ? 's' : ''}`;
    
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `Hace ${horas} hora${horas > 1 ? 's' : ''}`;
    
    const dias = Math.floor(horas / 24);
    return `Hace ${dias} día${dias > 1 ? 's' : ''}`;
}

// ===================================
// FUNCIONES DE CALENDARIO DE RIEGO
// ===================================
async function cargarRiegosProgramados() {
    try {
        const response = await fetch('/api/riego/programados');
        const result = await response.json();
        
        const container = document.getElementById('riegos-items');
        if (!container) return;
        
        if (result.success && result.data && result.data.length > 0) {
            container.innerHTML = result.data.map(riego => {
                const fecha = new Date(riego.fecha);
                const fechaFormateada = fecha.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                });
                const horaFormateada = fecha.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                return `
                    <div class="riego-item" data-id="${riego.id}">
                        <div class="riego-item-info">
                            <div class="riego-item-fecha">
                                <i class="fas fa-calendar-day"></i> ${fechaFormateada}
                            </div>
                            <div class="riego-item-detalles">
                                <i class="fas fa-clock"></i> ${horaFormateada} | 
                                <i class="fas fa-stopwatch"></i> ${riego.duracion} min
                            </div>
                        </div>
                        <button class="btn-cancel-riego" onclick="cancelarRiegoProgramado(${riego.id})">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<p class="no-items">No hay riegos programados</p>';
        }
    } catch (error) {
        console.error('Error al cargar riegos programados:', error);
    }
}

async function programarRiegoEspecifico() {
    try {
        const fecha = document.getElementById('input-fecha-riego').value;
        const hora = document.getElementById('input-hora-riego').value;
        const duracion = document.getElementById('input-duracion-riego').value;
        
        if (!fecha || !hora) {
            mostrarNotificacionTemporal('Por favor, complete la fecha y hora', 'error');
            return;
        }
        
        const response = await fetch('/api/riego/programar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fecha, hora, duracion: parseInt(duracion) })
        });
        
        const result = await response.json();
        
        if (result.success) {
            mostrarNotificacionTemporal('Riego programado correctamente', 'success');
            await cargarRiegosProgramados();
            await actualizarDatosTiempoReal();
            await cargarNotificacionesDropdown();
            
            // Limpiar fecha para siguiente programación
            const hoy = new Date().toISOString().split('T')[0];
            document.getElementById('input-fecha-riego').value = hoy;
        } else {
            mostrarNotificacionTemporal(result.message || 'Error al programar riego', 'error');
        }
    } catch (error) {
        console.error('Error al programar riego:', error);
        mostrarNotificacionTemporal('Error al programar riego', 'error');
    }
}

async function cancelarRiegoProgramado(idRiego) {
    if (confirm('¿Está seguro de cancelar este riego programado?')) {
        try {
            const response = await fetch(`/api/riego/programados/${idRiego}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                mostrarNotificacionTemporal('Riego cancelado', 'warning');
                await cargarRiegosProgramados();
                await actualizarDatosTiempoReal();
            } else {
                mostrarNotificacionTemporal(result.message || 'Error al cancelar riego', 'error');
            }
        } catch (error) {
            console.error('Error al cancelar riego:', error);
            mostrarNotificacionTemporal('Error al cancelar riego', 'error');
        }
    }
}

// ===================================
// EXPORTAR FUNCIONES GLOBALES
// ===================================
window.verDetalleRegistro = verDetalleRegistro;
window.verDetalleAlerta = verDetalleAlerta;
window.verNotificacion = verNotificacion;
window.iniciarRiegoManual = iniciarRiegoManual;
window.detenerRiego = detenerRiego;
window.guardarConfiguracion = guardarConfiguracion;
window.marcarAlertaLeida = marcarAlertaLeida;
window.marcarTodasAlertasLeidas = marcarTodasAlertasLeidas;
window.cancelarRiegoProgramado = cancelarRiegoProgramado;

console.log('✅ OrchidCare Pro Dashboard cargado completamente');
