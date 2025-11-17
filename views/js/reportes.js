// ===================================
// CONFIGURACIÓN Y ESTADO GLOBAL
// ===================================
let trendsChart = null;
let alertsChart = null;
let tempRangeChart = null;

// ===================================
// INICIALIZACIÓN
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('📊 Inicializando OrchidCare Pro Reportes...');
    inicializarGraficos();
    cargarDatosReportes();
    configurarEventListeners();
});

// ===================================
// INICIALIZAR GRÁFICOS
// ===================================
function inicializarGraficos() {
    inicializarGraficoTendencias();
    inicializarGraficoAlertas();
    inicializarGraficoRangoTemperatura();
}

function inicializarGraficoTendencias() {
    const ctx = document.getElementById('trendsChart');
    if (!ctx) return;

    trendsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
            datasets: [
                {
                    label: 'Temperatura (°C)',
                    data: [21.5, 21.2, 20.8, 21.3, 21.7, 21.4, 21.0],
                    borderColor: '#f6ad55',
                    backgroundColor: 'rgba(246, 173, 85, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Humedad (%)',
                    data: [78.3, 77.8, 79.2, 78.5, 77.9, 78.8, 79.5],
                    borderColor: '#4299e1',
                    backgroundColor: 'rgba(66, 153, 225, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
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
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: '#e2e8f0'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function inicializarGraficoAlertas() {
    const ctx = document.getElementById('alertsChart');
    if (!ctx) return;

    alertsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Temperatura Alta', 'Humedad Baja', 'Sistema', 'Riego'],
            datasets: [{
                data: [5, 4, 2, 4],
                backgroundColor: [
                    '#fc8181',
                    '#f6ad55',
                    '#4299e1',
                    '#48bb78'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                }
            }
        }
    });
}

function inicializarGraficoRangoTemperatura() {
    const ctx = document.getElementById('tempRangeChart');
    if (!ctx) return;

    tempRangeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['< 18°C', '18-21°C', '21-24°C', '> 24°C'],
            datasets: [{
                label: 'Horas',
                data: [12, 45, 95, 16],
                backgroundColor: [
                    '#4299e1',
                    '#48bb78',
                    '#48bb78',
                    '#fc8181'
                ],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#e2e8f0'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// ===================================
// CARGAR DATOS DE REPORTES
// ===================================
async function cargarDatosReportes() {
    try {
        const periodo = document.getElementById('date-range').value || '7';
        
        // Cargar estadísticas
        await cargarEstadisticas(periodo);
        
        // Cargar tabla de datos
        await cargarTablaDatos(periodo);
        
        // Cargar alertas
        await cargarAlertas();
        
        console.log('✅ Datos de reportes cargados');
    } catch (error) {
        console.error('Error al cargar datos de reportes:', error);
    }
}

async function cargarEstadisticas(periodo) {
    try {
        const response = await fetch(`/api/registros/reportes?id_invernadero=1&periodo=${periodo}dias`);
        const result = await response.json();

        if (result.success && result.data) {
            actualizarEstadisticas(result.data);
        } else {
            mostrarEstadisticasEjemplo();
        }
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        mostrarEstadisticasEjemplo();
    }
}

function mostrarEstadisticasEjemplo() {
    document.getElementById('avg-temp-report').textContent = '21.5°C';
    document.getElementById('temp-range').textContent = '19.5°C - 23.8°C';
    document.getElementById('avg-humidity-report').textContent = '78.3%';
    document.getElementById('humidity-range').textContent = '75% - 82%';
}

function actualizarEstadisticas(data) {
    if (data.temperatura) {
        document.getElementById('avg-temp-report').textContent = `${data.temperatura.promedio.toFixed(1)}°C`;
        document.getElementById('temp-range').textContent = `${data.temperatura.minimo.toFixed(1)}°C - ${data.temperatura.maximo.toFixed(1)}°C`;
    }
    
    if (data.humedad) {
        document.getElementById('avg-humidity-report').textContent = `${data.humedad.promedio.toFixed(1)}%`;
        document.getElementById('humidity-range').textContent = `${data.humedad.minimo.toFixed(1)}% - ${data.humedad.maximo.toFixed(1)}%`;
    }
}

async function cargarTablaDatos(periodo) {
    try {
        const response = await fetch(`/api/registros?id_invernadero=1&periodo=${periodo}dias&limite=7`);
        const result = await response.json();

        if (result.success && result.data && result.data.registros) {
            mostrarTablaDatos(result.data.registros);
        } else {
            mostrarTablaDatosEjemplo();
        }
    } catch (error) {
        console.error('Error al cargar tabla de datos:', error);
        mostrarTablaDatosEjemplo();
    }
}

function mostrarTablaDatos(registros) {
    const tbody = document.getElementById('data-table-body');
    if (!tbody) return;

    // Agrupar registros por día
    const registrosPorDia = agruparPorDia(registros);
    
    tbody.innerHTML = Object.keys(registrosPorDia).map(fecha => {
        const datos = registrosPorDia[fecha];
        return `
            <tr>
                <td>${formatearFecha(fecha)}</td>
                <td>${datos.tempPromedio.toFixed(1)}°C</td>
                <td>${datos.tempMax.toFixed(1)}°C</td>
                <td>${datos.tempMin.toFixed(1)}°C</td>
                <td>${datos.humPromedio.toFixed(1)}%</td>
                <td>${datos.humMax.toFixed(1)}%</td>
                <td>${datos.humMin.toFixed(1)}%</td>
                <td><span class="status-badge badge-${datos.alertas > 0 ? 'alert' : 'normal'}">${datos.alertas}</span></td>
            </tr>
        `;
    }).join('');
}

function mostrarTablaDatosEjemplo() {
    const tbody = document.getElementById('data-table-body');
    if (!tbody) return;

    const diasEjemplo = [
        { fecha: '10/11/2025', tempProm: 21.5, tempMax: 23.2, tempMin: 19.8, humProm: 78.3, humMax: 82.1, humMin: 75.2, alertas: 2 },
        { fecha: '09/11/2025', tempProm: 21.2, tempMax: 22.8, tempMin: 19.5, humProm: 77.8, humMax: 81.5, humMin: 74.8, alertas: 1 },
        { fecha: '08/11/2025', tempProm: 20.8, tempMax: 22.5, tempMin: 19.2, humProm: 79.2, humMax: 82.8, humMin: 76.1, alertas: 0 },
        { fecha: '07/11/2025', tempProm: 21.3, tempMax: 23.1, tempMin: 19.7, humProm: 78.5, humMax: 81.9, humMin: 75.5, alertas: 1 },
        { fecha: '06/11/2025', tempProm: 21.7, tempMax: 23.5, tempMin: 20.1, humProm: 77.9, humMax: 81.2, humMin: 74.9, alertas: 3 },
        { fecha: '05/11/2025', tempProm: 21.4, tempMax: 23.0, tempMin: 19.9, humProm: 78.8, humMax: 82.5, humMin: 75.8, alertas: 0 },
        { fecha: '04/11/2025', tempProm: 21.0, tempMax: 22.6, tempMin: 19.4, humProm: 79.5, humMax: 82.9, humMin: 76.5, alertas: 1 }
    ];

    tbody.innerHTML = diasEjemplo.map(dia => `
        <tr>
            <td>${dia.fecha}</td>
            <td>${dia.tempProm}°C</td>
            <td>${dia.tempMax}°C</td>
            <td>${dia.tempMin}°C</td>
            <td>${dia.humProm}%</td>
            <td>${dia.humMax}%</td>
            <td>${dia.humMin}%</td>
            <td><span class="status-badge badge-${dia.alertas > 0 ? 'alert' : 'normal'}">${dia.alertas}</span></td>
        </tr>
    `).join('');
}

async function cargarAlertas() {
    try {
        const response = await fetch('/api/dashboard/alertas?id_usuario=1&limite=5');
        const result = await response.json();

        const alertasList = document.getElementById('sidebar-alerts');
        const alertCount = document.getElementById('sidebar-alert-count');
        
        if (result.success && result.data && result.data.length > 0) {
            if (alertCount) {
                alertCount.textContent = result.data.length;
            }
            
            if (alertasList) {
                alertasList.innerHTML = result.data.map(alerta => `
                    <div class="alert-item ${alerta.prioridad || 'info'}">
                        <strong>${alerta.titulo || 'Alerta'}</strong>
                        <div style="font-size: 12px; color: #718096; margin-top: 4px;">
                            ${alerta.mensaje || 'Sin descripción'}
                        </div>
                    </div>
                `).join('');
            }
        } else {
            if (alertCount) alertCount.textContent = '3';
            if (alertasList) {
                alertasList.innerHTML = `
                    <div class="alert-item info">
                        <strong>Sistema Activo</strong>
                        <div style="font-size: 12px; color: #718096; margin-top: 4px;">
                            Todos los sensores funcionando
                        </div>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Error al cargar alertas:', error);
    }
}

// ===================================
// CONFIGURAR EVENT LISTENERS
// ===================================
function configurarEventListeners() {
    // Filtros
    const dateRange = document.getElementById('date-range');
    if (dateRange) {
        dateRange.addEventListener('change', () => {
            cargarDatosReportes();
        });
    }

    // Botones de tendencias
    const trendBtns = document.querySelectorAll('[data-trend]');
    trendBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            trendBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            actualizarGraficoTendencias(this.getAttribute('data-trend'));
        });
    });

    // Generar reporte
    const btnGenerate = document.getElementById('btn-generate-report');
    if (btnGenerate) {
        btnGenerate.addEventListener('click', generarReporte);
    }

    // Exportar tabla
    const btnExport = document.getElementById('btn-export-table');
    if (btnExport) {
        btnExport.addEventListener('click', exportarTabla);
    }

    // Control de riego
    const btnRiegoHeader = document.getElementById('btnRiegoHeader');
    if (btnRiegoHeader) {
        btnRiegoHeader.addEventListener('click', abrirModalRiego);
    }

    const modalRiegoClose = document.getElementById('modal-riego-close');
    const modalRiegoOverlay = document.getElementById('modal-riego-overlay');
    if (modalRiegoClose) modalRiegoClose.addEventListener('click', cerrarModalRiego);
    if (modalRiegoOverlay) modalRiegoOverlay.addEventListener('click', cerrarModalRiego);

    // Notificaciones
    const btnNotifications = document.getElementById('btnNotifications');
    if (btnNotifications) {
        btnNotifications.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleNotificationsDropdown();
        });
    }

    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('notifications-dropdown');
        const btn = document.getElementById('btnNotifications');
        if (dropdown && !dropdown.contains(e.target) && e.target !== btn) {
            dropdown.classList.remove('active');
        }
    });
}

// ===================================
// FUNCIONES AUXILIARES
// ===================================
function agruparPorDia(registros) {
    const agrupados = {};
    
    registros.forEach(registro => {
        const fecha = new Date(registro.fecha_hora).toISOString().split('T')[0];
        
        if (!agrupados[fecha]) {
            agrupados[fecha] = {
                temperaturas: [],
                humedades: [],
                alertas: 0
            };
        }
        
        agrupados[fecha].temperaturas.push(registro.temperatura);
        agrupados[fecha].humedades.push(registro.humedad);
        if (registro.estado && registro.estado !== 'NORMAL') {
            agrupados[fecha].alertas++;
        }
    });
    
    // Calcular promedios
    Object.keys(agrupados).forEach(fecha => {
        const datos = agrupados[fecha];
        datos.tempPromedio = datos.temperaturas.reduce((a, b) => a + b, 0) / datos.temperaturas.length;
        datos.tempMax = Math.max(...datos.temperaturas);
        datos.tempMin = Math.min(...datos.temperaturas);
        datos.humPromedio = datos.humedades.reduce((a, b) => a + b, 0) / datos.humedades.length;
        datos.humMax = Math.max(...datos.humedades);
        datos.humMin = Math.min(...datos.humedades);
    });
    
    return agrupados;
}

function formatearFecha(fechaISO) {
    const fecha = new Date(fechaISO);
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
}

function actualizarGraficoTendencias(periodo) {
    console.log(`Actualizando gráfico de tendencias para: ${periodo}`);
    // Aquí se cargarían datos según el período seleccionado
}

function generarReporte() {
    const tipo = document.getElementById('report-type').value;
    const formato = document.getElementById('format').value;
    const periodo = document.getElementById('date-range').value;
    
    alert(`Generando reporte:\nTipo: ${tipo}\nFormato: ${formato}\nPeríodo: ${periodo} días`);
    console.log('📄 Generando reporte...');
}

function exportarTabla() {
    const tabla = document.getElementById('data-table-body');
    if (!tabla) return;
    
    let csv = 'Fecha,Temp. Promedio,Temp. Max,Temp. Min,Humedad Promedio,Humedad Max,Humedad Min,Alertas\n';
    
    Array.from(tabla.rows).forEach(row => {
        const cols = Array.from(row.cells).map(cell => cell.textContent);
        csv += cols.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_orchidcare_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    console.log('📥 Tabla exportada');
}

function abrirModalRiego() {
    const modal = document.getElementById('modal-riego');
    if (modal) {
        modal.classList.add('active');
    }
}

function cerrarModalRiego() {
    const modal = document.getElementById('modal-riego');
    if (modal) {
        modal.classList.remove('active');
    }
}

function toggleNotificationsDropdown() {
    const dropdown = document.getElementById('notifications-dropdown');
    if (!dropdown) return;
    
    const isActive = dropdown.classList.contains('active');
    
    if (!isActive) {
        cargarNotificacionesDropdown();
        dropdown.classList.add('active');
    } else {
        dropdown.classList.remove('active');
    }
}

async function cargarNotificacionesDropdown() {
    const notificationsList = document.getElementById('notifications-list');
    if (notificationsList) {
        notificationsList.innerHTML = `
            <div class="notification-item unread">
                <div class="notification-title">Reporte Generado</div>
                <div class="notification-message">El reporte mensual está listo</div>
                <div class="notification-time">Hace 10 minutos</div>
            </div>
        `;
    }
}

console.log('✅ OrchidCare Pro Reportes cargado completamente');
