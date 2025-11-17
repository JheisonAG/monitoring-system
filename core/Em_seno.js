// =============================================
// SIMULACIÓN DE SENSORES EN TIEMPO REAL (API)
// =============================================

import dotenv from 'dotenv';

dotenv.config();

// =============================================
// Realtime Database (Firebase)
// =============================================
import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let rtdbRef = null;
let rtdbInitialized = false;

function initRTDBIfConfigured() {
  try {
    if (rtdbInitialized) return;
    
    const serviceAccountPath = join(__dirname, '..', 'serviceAccountKey.json');
    
    if (!existsSync(serviceAccountPath)) {
      console.log('ℹ️ serviceAccountKey.json no encontrado. RTDB deshabilitada.');
      return;
    }
    
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://orchid-care-pro-default-rtdb.firebaseio.com"
    });

    rtdbRef = admin.database().ref();
    rtdbInitialized = true;
    console.log('✅ RTDB inicializada: https://orchid-care-pro-default-rtdb.firebaseio.com');
  } catch (err) {
    console.error('⚠️ No se pudo inicializar RTDB:', err && err.message ? err.message : err);
  }
}

// =============================================
// CONFIGURACIÓN DE PARÁMETROS DE SIMULACIÓN
// =============================================

const CONFIG = {
  // Rango óptimo de temperatura: 18°C - 24°C
  temperatura: {
    min: parseFloat(process.env.TEMP_MIN) || 18,
    max: parseFloat(process.env.TEMP_MAX) || 24,
    optimo: 21,
    variacion: 0.5 // Variación máxima por actualización
  },
  
  // Rango óptimo de humedad: 75% - 82% (objetivo ~80%)
  humedad: {
    min: parseFloat(process.env.HUMIDITY_MIN) || 75,
    max: parseFloat(process.env.HUMIDITY_MAX) || 82,
    optimo: 80,
    variacion: 1.0 // Variación máxima por actualización
  },
  
  // Intervalo de actualización en milisegundos
  intervaloActualizacion: parseInt(process.env.SENSOR_UPDATE_INTERVAL) || 5000
};

// =============================================
// ESTADO ACTUAL DE LOS SENSORES
// =============================================

let estadoActual = {
  temperatura: CONFIG.temperatura.optimo,
  humedad: CONFIG.humedad.optimo,
  timestamp: new Date(),
  estado: 'NORMAL', // NORMAL, ADVERTENCIA, CRITICO
  sistemaActivo: true
};

// =============================================
// ESTADO DE RIEGO Y ALERTAS
// =============================================

let configuracionRiego = {
  frecuenciaDias: 7, // Frecuencia en días entre riegos
  duracionMinutos: 15, // Duración del riego en minutos
  horaInicio: '08:00', // Hora de inicio del riego automático
  activo: true, // Si el riego automático está activo
  tipoRiego: 'automatico' // automatico, manual
};

let estadoRiego = {
  ultimoRiego: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Hace 5 días
  proximoRiegoProgramado: null, // Sin riego programado inicialmente
  riegoEnCurso: false,
  progreso: 0, // Progreso del riego actual (0-100)
  tiempoRestante: 0, // Minutos restantes del riego actual
  riegosProgramados: [] // Array de riegos programados con fechas específicas
};

let alertasActivas = [];
let intervalVerificacionRiego = null;

// =============================================
// FUNCIÓN: Generar variación aleatoria suave
// Simula cambios graduales en las lecturas de sensores
// =============================================
function generarVariacion(valorActual, config) {
  // Aplicar variación aleatoria con tendencia hacia el valor óptimo
  const tendenciaOptimo = (config.optimo - valorActual) * 0.1;
  const variacionAleatoria = (Math.random() - 0.5) * 2 * config.variacion;
  
  let nuevoValor = valorActual + tendenciaOptimo + variacionAleatoria;
  
  // Asegurar que el valor esté dentro del rango permitido
  nuevoValor = Math.max(config.min - 2, Math.min(config.max + 2, nuevoValor));
  
  return parseFloat(nuevoValor.toFixed(1));
}

// =============================================
// FUNCIÓN: Determinar estado del sistema
// Evalúa si las condiciones están en rango óptimo
// =============================================
function determinarEstado(temperatura, humedad) {
  const tempOptima = temperatura >= CONFIG.temperatura.min && temperatura <= CONFIG.temperatura.max;
  const humOptima = humedad >= CONFIG.humedad.min && humedad <= CONFIG.humedad.max;
  
  if (tempOptima && humOptima) {
    return 'NORMAL';
  } else if (
    (temperatura >= CONFIG.temperatura.min - 2 && temperatura <= CONFIG.temperatura.max + 2) &&
    (humedad >= CONFIG.humedad.min - 5 && humedad <= CONFIG.humedad.max + 5)
  ) {
    return 'ADVERTENCIA';
  } else {
    return 'CRITICO';
  }
}

// =============================================
// FUNCIÓN: Actualizar lecturas de sensores
// Simula la actualización periódica de los sensores
// =============================================
export function actualizarSensores() {
  estadoActual.temperatura = generarVariacion(estadoActual.temperatura, CONFIG.temperatura);
  estadoActual.humedad = generarVariacion(estadoActual.humedad, CONFIG.humedad);
  estadoActual.timestamp = new Date();
  estadoActual.estado = determinarEstado(estadoActual.temperatura, estadoActual.humedad);
  
  // Verificar condiciones y generar alertas si es necesario
  verificarCondicionesYGenerarAlertas();
  
  // Enviar datos simulados a Realtime Database si está configurada
  try {
    // Inicializar RTDB si corresponde (no bloqueante)
    if (typeof initRTDBIfConfigured === 'function') {
      initRTDBIfConfigured();
    }
    if (rtdbRef) {
      const lectura = {
        temperatura: estadoActual.temperatura,
        humedad: estadoActual.humedad,
        estado: estadoActual.estado,
        timestamp: (estadoActual.timestamp || new Date()).toISOString(),
        riego: {
          enCurso: estadoRiego.riegoEnCurso,
          progreso: estadoRiego.progreso || 0
        }
      };

      // Solo actualizar el nodo /device con el único dispositivo
      rtdbRef.child('device').set(lectura).catch(err => console.error('RTDB set error:', err));
    }
  } catch (err) {
    // No bloquear la simulación por errores en RTDB
    // console.debug('RTDB disabled or init pending');
  }
  
  return { ...estadoActual };
}

// =============================================
// FUNCIÓN: Obtener lectura actual de sensores
// Retorna el estado actual sin actualizar
// =============================================
export function obtenerLecturaActual() {
  return { ...estadoActual };
}

// =============================================
// FUNCIÓN: Iniciar simulación automática
// Actualiza los sensores periódicamente
// NOTA: Este método simula la recepción de datos en tiempo real
// TODO: Reemplazar con la integración de sensores físicos (Bluetooth/Wi-Fi)
// cuando estén disponibles. Ver RF3 y RF4 del proyecto.
// =============================================
export function iniciarSimulacion(callback) {
  console.log('🔄 Simulación de sensores iniciada');
  console.log(`📊 Actualizando cada ${CONFIG.intervaloActualizacion}ms`);
  
  const intervalo = setInterval(() => {
    const lectura = actualizarSensores();
    
    // Ejecutar callback si fue proporcionado
    if (callback && typeof callback === 'function') {
      callback(lectura);
    }
    
    // Log de la lectura (opcional, comentar en producción)
    console.log(`🌡️  Temp: ${lectura.temperatura}°C | 💧 Humedad: ${lectura.humedad}% | Estado: ${lectura.estado}`);
  }, CONFIG.intervaloActualizacion);
  
  return intervalo;
}

// =============================================
// FUNCIÓN: Detener simulación
// =============================================
export function detenerSimulacion(intervalo) {
  if (intervalo) {
    clearInterval(intervalo);
    console.log('⏹️  Simulación de sensores detenida');
  }
}

// =============================================
// FUNCIÓN: Configurar parámetros manualmente
// Permite ajustar los valores de simulación
// =============================================
export function configurarSensores(temperatura, humedad) {
  if (temperatura !== undefined) {
    estadoActual.temperatura = temperatura;
  }
  if (humedad !== undefined) {
    estadoActual.humedad = humedad;
  }
  estadoActual.timestamp = new Date();
  estadoActual.estado = determinarEstado(estadoActual.temperatura, estadoActual.humedad);
  
  return { ...estadoActual };
}

// =============================================
// FUNCIÓN: Generar datos históricos simulados
// Útil para poblar la base de datos con datos de prueba
// =============================================
export function generarDatosHistoricos(cantidad = 100) {
  const datos = [];
  let tempActual = CONFIG.temperatura.optimo;
  let humActual = CONFIG.humedad.optimo;
  
  for (let i = 0; i < cantidad; i++) {
    tempActual = generarVariacion(tempActual, CONFIG.temperatura);
    humActual = generarVariacion(humActual, CONFIG.humedad);
    
    const fecha = new Date();
    fecha.setHours(fecha.getHours() - (cantidad - i));
    
    datos.push({
      temperatura: tempActual,
      humedad: humActual,
      timestamp: fecha,
      estado: determinarEstado(tempActual, humActual)
    });
  }
  
  return datos;
}

// =============================================
// FUNCIONES DE GESTIÓN DE RIEGO
// =============================================

export function iniciarRiegoManual(duracion = null) {
  if (estadoRiego.riegoEnCurso) {
    return { success: false, mensaje: 'Ya hay un riego en curso' };
  }
  
  const ahora = new Date();
  const duracionMinutos = duracion || configuracionRiego.duracionMinutos;
  
  estadoRiego.riegoEnCurso = true;
  estadoRiego.ultimoRiego = ahora;
  estadoRiego.progreso = 0;
  estadoRiego.tiempoRestante = duracionMinutos;
  
  // NO programar automáticamente - solo si el usuario lo configura manualmente
  
  // Crear alerta de riego iniciado
  const alerta = {
    id: Date.now(),
    tipo: 'info',
    titulo: 'Riego Manual Iniciado',
    descripcion: `El riego manual se ha iniciado. Duración: ${duracionMinutos} minutos`,
    fecha: ahora.toISOString(),
    leido: false,
    importante: true
  };
  alertasActivas.unshift(alerta);
  
  console.log(`🚰 Iniciando riego manual (${duracionMinutos} minutos)...`);
  
  // Simular progreso del riego
  const intervaloProgreso = setInterval(() => {
    if (estadoRiego.riegoEnCurso) {
      estadoRiego.progreso += (100 / duracionMinutos) * (5 / 60); // Actualizar cada 5 segundos
      estadoRiego.tiempoRestante = Math.max(0, duracionMinutos - (estadoRiego.progreso / 100 * duracionMinutos));
      
      if (estadoRiego.progreso >= 100) {
        finalizarRiego();
        clearInterval(intervaloProgreso);
      }
    }
  }, 5000);
  
  return { success: true, mensaje: 'Riego manual iniciado', duracion: duracionMinutos };
}

function finalizarRiego() {
  estadoRiego.riegoEnCurso = false;
  estadoRiego.progreso = 100;
  estadoRiego.tiempoRestante = 0;
  
  // Eliminar alerta de riego en curso
  eliminarAlertaPorClave('alerta_riego_curso');
  
  // Mensaje según si hay próximo riego programado o no
  const tieneProximoRiego = estadoRiego.proximoRiegoProgramado && estadoRiego.proximoRiegoProgramado > new Date();
  const descripcion = tieneProximoRiego 
    ? `✅ Riego completado exitosamente. Próximo riego programado para ${obtenerFechaFormateada(estadoRiego.proximoRiegoProgramado)}`
    : '✅ Riego completado exitosamente. No hay próximo riego programado.';
  
  // Crear alerta de finalización
  actualizarOCrearAlerta(
    'success',
    'Riego Completado',
    descripcion,
    'alerta_riego_completado'
  );
  
  // Auto-eliminar la alerta de completado después de 2 minutos
  setTimeout(() => eliminarAlertaPorClave('alerta_riego_completado'), 120000);
  
  // Forzar actualización inmediata de alertas para reflejar cambios en humedad
  setTimeout(() => {
    verificarCondicionesYGenerarAlertas();
    console.log('🔄 Alertas actualizadas después de completar el riego');
  }, 1000);
  
  console.log('✅ Riego completado');
}

export function detenerRiego() {
  if (!estadoRiego.riegoEnCurso) {
    return { success: false, mensaje: 'No hay riego en curso' };
  }
  
  const progresoAlDetener = estadoRiego.progreso;
  estadoRiego.riegoEnCurso = false;
  estadoRiego.progreso = 0;
  estadoRiego.tiempoRestante = 0;
  
  // Eliminar alerta de riego en curso
  eliminarAlertaPorClave('alerta_riego_curso');
  
  // Crear alerta de detención manual
  actualizarOCrearAlerta(
    'warning',
    'Riego Detenido',
    `⏹️ El riego fue detenido manualmente al ${progresoAlDetener.toFixed(0)}% de completado`,
    'alerta_riego_detenido'
  );
  
  // Auto-eliminar después de 1 minuto
  setTimeout(() => eliminarAlertaPorClave('alerta_riego_detenido'), 60000);
  
  // Actualizar alertas para reflejar estado actual
  setTimeout(() => {
    verificarCondicionesYGenerarAlertas();
    console.log('🔄 Alertas actualizadas después de detener el riego');
  }, 1000);
  
  console.log('⏹️ Riego detenido manualmente');
  return { success: true, mensaje: 'Riego detenido' };
}

export function obtenerEstadoRiego() {
  const ahora = new Date();
  const diasDesdeUltimo = Math.floor((ahora - estadoRiego.ultimoRiego) / (24 * 60 * 60 * 1000));
  
  // Verificar si hay próximo riego programado y es futuro
  const tieneProximoRiego = estadoRiego.proximoRiegoProgramado && estadoRiego.proximoRiegoProgramado > ahora;
  const diasHastaProximo = tieneProximoRiego 
    ? Math.ceil((estadoRiego.proximoRiegoProgramado - ahora) / (24 * 60 * 60 * 1000))
    : null;
  
  return {
    ultimoRiego: estadoRiego.ultimoRiego,
    proximoRiego: tieneProximoRiego ? estadoRiego.proximoRiegoProgramado : null,
    diasDesdeUltimo,
    diasRestantes: diasHastaProximo,
    riegoEnCurso: estadoRiego.riegoEnCurso,
    progreso: estadoRiego.progreso,
    tiempoRestante: Math.round(estadoRiego.tiempoRestante),
    configuracion: { ...configuracionRiego }
  };
}

export function obtenerConfiguracionRiego() {
  return { ...configuracionRiego };
}

export function actualizarConfiguracionRiego(nuevaConfig) {
  const configAnterior = { ...configuracionRiego };
  
  if (nuevaConfig.frecuenciaDias !== undefined) {
    configuracionRiego.frecuenciaDias = parseInt(nuevaConfig.frecuenciaDias);
  }
  if (nuevaConfig.duracionMinutos !== undefined) {
    configuracionRiego.duracionMinutos = parseInt(nuevaConfig.duracionMinutos);
  }
  if (nuevaConfig.horaInicio !== undefined) {
    configuracionRiego.horaInicio = nuevaConfig.horaInicio;
  }
  if (nuevaConfig.activo !== undefined) {
    configuracionRiego.activo = nuevaConfig.activo;
  }
  
  // Si se proporciona una fecha específica, usarla
  if (nuevaConfig.fechaEspecifica) {
    const fechaRiego = new Date(nuevaConfig.fechaEspecifica);
    const [horas, minutos] = configuracionRiego.horaInicio.split(':');
    fechaRiego.setHours(parseInt(horas), parseInt(minutos), 0, 0);
    estadoRiego.proximoRiegoProgramado = fechaRiego;
  } else {
    // Recalcular próximo riego desde la última vez que se regó
    const ahora = new Date();
    const [horas, minutos] = configuracionRiego.horaInicio.split(':');
    const proximoRiego = new Date(estadoRiego.ultimoRiego);
    proximoRiego.setDate(proximoRiego.getDate() + configuracionRiego.frecuenciaDias);
    proximoRiego.setHours(parseInt(horas), parseInt(minutos), 0, 0);
    
    // Si la fecha calculada ya pasó, programar para el siguiente ciclo
    if (proximoRiego <= ahora) {
      proximoRiego.setDate(proximoRiego.getDate() + configuracionRiego.frecuenciaDias);
    }
    
    estadoRiego.proximoRiegoProgramado = proximoRiego;
  }
  
  // Crear alerta de cambio de configuración
  const cambios = [];
  if (nuevaConfig.frecuenciaDias !== undefined && nuevaConfig.frecuenciaDias !== configAnterior.frecuenciaDias) {
    cambios.push(`Frecuencia: ${nuevaConfig.frecuenciaDias} días`);
  }
  if (nuevaConfig.duracionMinutos !== undefined && nuevaConfig.duracionMinutos !== configAnterior.duracionMinutos) {
    cambios.push(`Duración: ${nuevaConfig.duracionMinutos} minutos`);
  }
  if (nuevaConfig.horaInicio !== undefined && nuevaConfig.horaInicio !== configAnterior.horaInicio) {
    cambios.push(`Hora: ${nuevaConfig.horaInicio}`);
  }
  
  if (cambios.length > 0) {
    const alerta = {
      id: Date.now(),
      tipo: 'info',
      titulo: 'Configuración de Riego Actualizada',
      descripcion: `Se actualizó la configuración: ${cambios.join(', ')}`,
      fecha: new Date().toISOString(),
      leido: false,
      importante: false
    };
    alertasActivas.unshift(alerta);
  }
  
  console.log('⚙️ Configuración de riego actualizada:', configuracionRiego);
  return { success: true, configuracion: { ...configuracionRiego } };
}

// =============================================
// FUNCIONES DE CALENDARIO DE RIEGO
// =============================================

export function programarRiegoEspecifico(fecha, hora, duracion) {
  const fechaRiego = new Date(fecha);
  const [horas, minutos] = hora.split(':');
  fechaRiego.setHours(parseInt(horas), parseInt(minutos), 0, 0);
  
  const ahora = new Date();
  if (fechaRiego <= ahora) {
    return { success: false, mensaje: 'La fecha debe ser futura' };
  }
  
  const nuevoRiego = {
    id: Date.now(),
    fecha: fechaRiego.toISOString(),
    duracion: duracion || configuracionRiego.duracionMinutos,
    estado: 'programado', // programado, completado, cancelado
    creado: new Date().toISOString()
  };
  
  estadoRiego.riegosProgramados.push(nuevoRiego);
  estadoRiego.riegosProgramados.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  
  // Actualizar próximo riego si este es el más cercano
  if (fechaRiego < estadoRiego.proximoRiegoProgramado) {
    estadoRiego.proximoRiegoProgramado = fechaRiego;
  }
  
  const alerta = {
    id: Date.now(),
    tipo: 'info',
    titulo: 'Riego Programado',
    descripcion: `📅 Riego programado para ${obtenerFechaFormateada(fechaRiego)} a las ${hora}`,
    fecha: new Date().toISOString(),
    leido: false,
    importante: false
  };
  alertasActivas.unshift(alerta);
  
  console.log('📅 Riego programado:', nuevoRiego);
  return { success: true, riego: nuevoRiego };
}

export function obtenerRiegosProgramados() {
  // Filtrar solo riegos futuros y programados
  const ahora = new Date();
  estadoRiego.riegosProgramados = estadoRiego.riegosProgramados.filter(r => 
    new Date(r.fecha) > ahora && r.estado === 'programado'
  );
  
  return estadoRiego.riegosProgramados;
}

export function cancelarRiegoProgramado(idRiego) {
  const index = estadoRiego.riegosProgramados.findIndex(r => r.id === idRiego);
  if (index !== -1) {
    estadoRiego.riegosProgramados[index].estado = 'cancelado';
    estadoRiego.riegosProgramados.splice(index, 1);
    
    // Recalcular próximo riego
    if (estadoRiego.riegosProgramados.length > 0) {
      estadoRiego.proximoRiegoProgramado = new Date(estadoRiego.riegosProgramados[0].fecha);
    } else {
      // Volver al riego automático por frecuencia
      const [horas, minutos] = configuracionRiego.horaInicio.split(':');
      const proximoRiego = new Date(estadoRiego.ultimoRiego);
      proximoRiego.setDate(proximoRiego.getDate() + configuracionRiego.frecuenciaDias);
      proximoRiego.setHours(parseInt(horas), parseInt(minutos), 0, 0);
      estadoRiego.proximoRiegoProgramado = proximoRiego;
    }
    
    return { success: true, mensaje: 'Riego cancelado' };
  }
  return { success: false, mensaje: 'Riego no encontrado' };
}

// Verificar si es hora de regar automáticamente
function verificarRiegoAutomatico() {
  if (!configuracionRiego.activo || estadoRiego.riegoEnCurso) {
    return;
  }
  
  const ahora = new Date();
  
  // Primero verificar riegos programados específicamente
  const riegoPendiente = estadoRiego.riegosProgramados.find(r => {
    const fechaRiego = new Date(r.fecha);
    return r.estado === 'programado' && 
           fechaRiego <= ahora && 
           fechaRiego > new Date(ahora.getTime() - 5 * 60 * 1000); // Dentro de los últimos 5 min
  });
  
  if (riegoPendiente) {
    console.log('🤖 Iniciando riego programado...');
    riegoPendiente.estado = 'completado';
    iniciarRiegoAutomatico(riegoPendiente.duracion);
    return;
  }
  
  // Verificar si llegó la fecha y hora del próximo riego recurrente
  if (ahora >= estadoRiego.proximoRiegoProgramado) {
    const [hora, minuto] = configuracionRiego.horaInicio.split(':').map(Number);
    const horaActual = ahora.getHours();
    const minutoActual = ahora.getMinutes();
    
    // Ejecutar riego si es la hora configurada (con margen de 5 minutos)
    if (horaActual === hora && Math.abs(minutoActual - minuto) <= 5) {
      console.log('🤖 Iniciando riego automático programado...');
      iniciarRiegoAutomatico();
    }
  }
}

function iniciarRiegoAutomatico() {
  const ahora = new Date();
  
  estadoRiego.riegoEnCurso = true;
  estadoRiego.ultimoRiego = ahora;
  estadoRiego.progreso = 0;
  estadoRiego.tiempoRestante = configuracionRiego.duracionMinutos;
  
  // Programar próximo riego
  const proximoRiego = new Date(ahora.getTime() + configuracionRiego.frecuenciaDias * 24 * 60 * 60 * 1000);
  estadoRiego.proximoRiegoProgramado = proximoRiego;
  
  // Crear alerta
  const alerta = {
    id: Date.now(),
    tipo: 'success',
    titulo: 'Riego Automático Iniciado',
    descripcion: `Riego automático iniciado según programación. Duración: ${configuracionRiego.duracionMinutos} minutos`,
    fecha: ahora.toISOString(),
    leido: false,
    importante: true
  };
  alertasActivas.unshift(alerta);
  
  // Simular progreso del riego
  const duracionMinutos = configuracionRiego.duracionMinutos;
  const intervaloProgreso = setInterval(() => {
    if (estadoRiego.riegoEnCurso) {
      estadoRiego.progreso += (100 / duracionMinutos) * (5 / 60);
      estadoRiego.tiempoRestante = Math.max(0, duracionMinutos - (estadoRiego.progreso / 100 * duracionMinutos));
      
      if (estadoRiego.progreso >= 100) {
        finalizarRiego();
        clearInterval(intervaloProgreso);
      }
    }
  }, 5000);
}

// =============================================
// FUNCIONES DE GESTIÓN DE ALERTAS
// =============================================

export function obtenerAlertas(limite = 10) {
  return {
    alertas: alertasActivas.slice(0, limite),
    totalNoLeidas: alertasActivas.filter(a => !a.leido).length,
    total: alertasActivas.length
  };
}

export function marcarAlertaComoLeida(idAlerta) {
  const alerta = alertasActivas.find(a => a.id === idAlerta);
  if (alerta) {
    alerta.leido = true;
    return { success: true };
  }
  return { success: false, mensaje: 'Alerta no encontrada' };
}

export function marcarTodasAlertasComoLeidas() {
  alertasActivas.forEach(a => a.leido = true);
  return { success: true, mensaje: 'Todas las alertas marcadas como leídas' };
}

export function eliminarAlerta(idAlerta) {
  const index = alertasActivas.findIndex(a => a.id === idAlerta);
  if (index !== -1) {
    alertasActivas.splice(index, 1);
    return { success: true };
  }
  return { success: false, mensaje: 'Alerta no encontrada' };
}

// Función auxiliar para generar alertas automáticas basadas en sensores
function verificarCondicionesYGenerarAlertas() {
  const { temperatura, humedad } = estadoActual;
  const ahora = new Date();
  
  // 1. Verificar temperatura fuera de rango
  if (temperatura < CONFIG.temperatura.min) {
    actualizarOCrearAlerta(
      'warning',
      'Temperatura Baja',
      `⚠️ La temperatura está por debajo del rango óptimo: ${temperatura.toFixed(1)}°C (mínimo: ${CONFIG.temperatura.min}°C)`,
      'alerta_temp_baja'
    );
  } else if (temperatura > CONFIG.temperatura.max) {
    actualizarOCrearAlerta(
      'warning',
      'Temperatura Alta',
      `⚠️ La temperatura está por encima del rango óptimo: ${temperatura.toFixed(1)}°C (máximo: ${CONFIG.temperatura.max}°C)`,
      'alerta_temp_alta'
    );
  } else {
    // Eliminar alertas de temperatura si volvió a rango normal
    eliminarAlertaPorClave('alerta_temp_baja');
    eliminarAlertaPorClave('alerta_temp_alta');
  }
  
  // 2. Verificar humedad fuera de rango
  if (humedad < CONFIG.humedad.min) {
    // Si el riego está en curso, mostrar que está siendo corregido
    if (estadoRiego.riegoEnCurso) {
      actualizarOCrearAlerta(
        'info',
        'Humedad Baja - Riego en Curso',
        `💧 La humedad está siendo corregida con el riego actual: ${humedad.toFixed(1)}% → ${CONFIG.humedad.optimo}% (objetivo)`,
        'alerta_hum_baja'
      );
    } else {
      actualizarOCrearAlerta(
        'warning',
        'Humedad Baja',
        `⚠️ La humedad está por debajo del rango óptimo: ${humedad.toFixed(1)}% (mínimo: ${CONFIG.humedad.min}%)`,
        'alerta_hum_baja'
      );
      
      // Sugerir riego si humedad muy baja
      if (humedad < CONFIG.humedad.min - 5) {
        actualizarOCrearAlerta(
          'error',
          'Humedad Crítica - Riego Urgente',
          `🚨 La humedad está críticamente baja: ${humedad.toFixed(1)}%. Se recomienda riego inmediato`,
          'alerta_hum_critica'
        );
      }
    }
  } else if (humedad > CONFIG.humedad.max) {
    actualizarOCrearAlerta(
      'warning',
      'Humedad Alta',
      `⚠️ La humedad está por encima del rango óptimo: ${humedad.toFixed(1)}% (máximo: ${CONFIG.humedad.max}%)`,
      'alerta_hum_alta'
    );
  } else {
    // Eliminar alertas de humedad si volvió a rango normal
    eliminarAlertaPorClave('alerta_hum_baja');
    eliminarAlertaPorClave('alerta_hum_alta');
    eliminarAlertaPorClave('alerta_hum_critica');
    
    // Si acababa de estar fuera de rango y volvió a la normalidad, notificar
    const alertaAnterior = alertasActivas.find(a => a.clave === 'alerta_hum_normalizada');
    if (!alertaAnterior && configuracionRiego.activo) {
      const ultimasAlertas = alertasActivas.filter(a => 
        a.clave && (a.clave.includes('hum_') || a.clave.includes('riego_'))
      );
      if (ultimasAlertas.length > 0) {
        actualizarOCrearAlerta(
          'success',
          'Humedad Normalizada',
          `✅ La humedad ha vuelto al rango óptimo: ${humedad.toFixed(1)}%`,
          'alerta_hum_normalizada'
        );
        // Auto-eliminar después de 30 segundos
        setTimeout(() => eliminarAlertaPorClave('alerta_hum_normalizada'), 30000);
      }
    }
  }
  
  // 3. Verificar si necesita riego pronto (SOLO si hay próximo riego programado)
  const estadoRiegoActual = obtenerEstadoRiego();
  if (estadoRiegoActual.proximoRiego && 
      estadoRiegoActual.diasRestantes !== null && 
      estadoRiegoActual.diasRestantes <= 1 && 
      !estadoRiego.riegoEnCurso && 
      configuracionRiego.activo) {
    const descripcion = estadoRiegoActual.diasRestantes === 0 
      ? `📅 El riego automático está programado para hoy a las ${configuracionRiego.horaInicio}` 
      : `📅 El riego automático está programado para mañana a las ${configuracionRiego.horaInicio}`;
    
    actualizarOCrearAlerta(
      'info',
      'Riego Programado Próximamente',
      descripcion,
      'alerta_riego_proximo'
    );
  } else {
    eliminarAlertaPorClave('alerta_riego_proximo');
  }
  
  // 4. Alertas sobre el riego en curso
  if (estadoRiego.riegoEnCurso) {
    const minRestantes = Math.round(estadoRiego.tiempoRestante);
    actualizarOCrearAlerta(
      'info',
      'Riego en Curso',
      `💧 Riego en progreso: ${estadoRiego.progreso.toFixed(0)}% completado. Tiempo restante: ${minRestantes} minuto${minRestantes !== 1 ? 's' : ''}`,
      'alerta_riego_curso'
    );
  } else {
    eliminarAlertaPorClave('alerta_riego_curso');
  }
  
  // 5. Verificar riego automático
  verificarRiegoAutomatico();
  
  // 6. Limpiar alertas antiguas (más de 24 horas y ya leídas)
  const hace24h = ahora.getTime() - 24 * 60 * 60 * 1000;
  alertasActivas = alertasActivas.filter(a => {
    const fechaAlerta = new Date(a.fecha).getTime();
    return !a.leido || fechaAlerta > hace24h || a.importante;
  });
}

// Funciones auxiliares para gestión inteligente de alertas
function actualizarOCrearAlerta(tipo, titulo, descripcion, clave) {
  const alertaExistente = alertasActivas.find(a => a.clave === clave);
  
  if (alertaExistente) {
    // Actualizar alerta existente CON TODOS LOS DATOS en tiempo real
    alertaExistente.tipo = tipo;
    alertaExistente.titulo = titulo;
    alertaExistente.descripcion = descripcion;
    alertaExistente.fecha = new Date().toISOString();
    alertaExistente.importante = tipo === 'warning' || tipo === 'error';
    // NO marcar como no leída nuevamente si ya fue leída, solo actualizar contenido
  } else {
    // Crear nueva alerta
    alertasActivas.unshift({
      id: Date.now(),
      tipo,
      titulo,
      descripcion,
      fecha: new Date().toISOString(),
      leido: false,
      importante: tipo === 'warning' || tipo === 'error',
      clave // Clave única para identificar y actualizar la alerta
    });
  }
}

function eliminarAlertaPorClave(clave) {
  const index = alertasActivas.findIndex(a => a.clave === clave);
  if (index !== -1) {
    alertasActivas.splice(index, 1);
  }
}

function obtenerFechaFormateada(fecha) {
  return new Intl.DateTimeFormat('es-ES', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }).format(fecha);
}

// =============================================
// EXPORTACIONES
// =============================================
export default {
  actualizarSensores,
  obtenerLecturaActual,
  iniciarSimulacion,
  detenerSimulacion,
  configurarSensores,
  generarDatosHistoricos,
  iniciarRiegoManual,
  detenerRiego,
  obtenerEstadoRiego,
  obtenerConfiguracionRiego,
  actualizarConfiguracionRiego,
  obtenerAlertas,
  marcarAlertaComoLeida,
  marcarTodasAlertasComoLeidas,
  eliminarAlerta,
  CONFIG
};

// =============================================
// NOTAS IMPORTANTES PARA LA IMPLEMENTACIÓN REAL:
// =============================================
// 
// 1. INTEGRACIÓN CON SENSORES FÍSICOS (RF3):
//    - Reemplazar las funciones de simulación con lecturas reales
//    - Implementar conexión Bluetooth o Wi-Fi según el hardware
//    - Usar librerías como 'noble' para Bluetooth o 'mqtt' para Wi-Fi
//    - Ejemplo de estructura a implementar:
//      ```
//      import noble from '@abandonware/noble';
//      
//      function conectarSensorBluetooth(uuid) {
//        noble.on('discover', (peripheral) => {
//          if (peripheral.uuid === uuid) {
//            // Conectar y leer datos del sensor
//          }
//        });
//      }
//      ```
//
// 2. PROTOCOLO DE COMUNICACIÓN:
//    - Definir el formato de datos que envían los sensores reales
//    - Parsear los datos según el protocolo del fabricante
//    - Validar la integridad de los datos recibidos
//
// 3. MANEJO DE DESCONEXIONES:
//    - Implementar reconexión automática
//    - Notificar al usuario si un sensor se desconecta
//    - Guardar último valor conocido durante desconexiones
//
// 4. CALIBRACIÓN:
//    - Permitir calibrar los sensores desde la interfaz
//    - Aplicar factores de corrección si es necesario
//
// =============================================
