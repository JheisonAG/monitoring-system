// =============================================
// CAPA DE DOMINIO - NOTIFICACIONES (RF2)
// Archivo: features/domain/NotificacionDomain.js
// =============================================
// Contiene la lógica de negocio relacionada con notificaciones

import { Notificacion, NotificacionRiego, NotificacionAlerta } from '../../models/Notificacion.js';

/**
 * LÓGICA DE NEGOCIO: Crear notificación de riego
 * @param {Object} calendarioInfo - Información del calendario
 * @returns {Object}
 */
export function crearNotificacionRiego(calendarioInfo) {
  const { nombreInvernadero, horaRiego, duracionMinutos } = calendarioInfo;
  
  const titulo = `⏰ Hora de Riego - ${nombreInvernadero}`;
  const mensaje = `Es momento de regar ${nombreInvernadero}. Duración programada: ${duracionMinutos} minutos a las ${horaRiego}.`;
  
  return NotificacionRiego.crearRecordatorio(
    nombreInvernadero,
    horaRiego,
    duracionMinutos
  );
}

/**
 * LÓGICA DE NEGOCIO: Crear notificación de alerta ambiental
 * @param {String} tipo - 'temperatura' o 'humedad'
 * @param {Number} valor - Valor actual
 * @param {Object} rangos - Rangos óptimos {min, max}
 * @param {String} invernadero - Nombre del invernadero
 * @returns {Object}
 */
export function crearNotificacionAlerta(tipo, valor, rangos, invernadero) {
  if (tipo === 'temperatura') {
    return NotificacionAlerta.crearAlertaTemperatura(valor, rangos, invernadero);
  } else if (tipo === 'humedad') {
    return NotificacionAlerta.crearAlertaHumedad(valor, rangos, invernadero);
  }
  
  throw new Error(`Tipo de alerta no válido: ${tipo}`);
}

/**
 * LÓGICA DE NEGOCIO: Determinar prioridad según desviación
 * @param {Number} valor - Valor actual
 * @param {Object} rangos - {min, max}
 * @returns {String} BAJA, MEDIA, ALTA, URGENTE
 */
export function determinarPrioridad(valor, rangos) {
  const { min, max } = rangos;
  
  // Calcular porcentaje de desviación
  let desviacion = 0;
  if (valor < min) {
    desviacion = ((min - valor) / min) * 100;
  } else if (valor > max) {
    desviacion = ((valor - max) / max) * 100;
  }
  
  if (desviacion === 0) return 'BAJA';
  if (desviacion < 5) return 'MEDIA';
  if (desviacion < 15) return 'ALTA';
  return 'URGENTE';
}

/**
 * LÓGICA DE NEGOCIO: Verificar si valor está fuera de rango
 * @param {Number} valor - Valor a verificar
 * @param {Object} rangos - {min, max}
 * @returns {Boolean}
 */
export function estaFueraDeRango(valor, rangos) {
  return valor < rangos.min || valor > rangos.max;
}

/**
 * LÓGICA DE NEGOCIO: Formatear mensaje de notificación
 * @param {String} tipo - Tipo de notificación
 * @param {Object} datos - Datos para el mensaje
 * @returns {String}
 */
export function formatearMensajeNotificacion(tipo, datos) {
  switch(tipo) {
    case 'RIEGO':
      return `🚿 Riego programado para ${datos.invernadero} a las ${datos.hora}`;
    
    case 'ALERTA_TEMPERATURA':
      return `🌡️ Temperatura ${datos.valor}°C fuera del rango óptimo (${datos.min}-${datos.max}°C)`;
    
    case 'ALERTA_HUMEDAD':
      return `💧 Humedad ${datos.valor}% fuera del rango óptimo (${datos.min}-${datos.max}%)`;
    
    case 'SISTEMA':
      return datos.mensaje || 'Notificación del sistema';
    
    default:
      return 'Nueva notificación';
  }
}

/**
 * LÓGICA DE NEGOCIO: Agrupar notificaciones por prioridad
 * @param {Array} notificaciones - Array de notificaciones
 * @returns {Object}
 */
export function agruparPorPrioridad(notificaciones) {
  return {
    urgente: notificaciones.filter(n => n.prioridad === 'URGENTE'),
    alta: notificaciones.filter(n => n.prioridad === 'ALTA'),
    media: notificaciones.filter(n => n.prioridad === 'MEDIA'),
    baja: notificaciones.filter(n => n.prioridad === 'BAJA')
  };
}

/**
 * LÓGICA DE NEGOCIO: Filtrar notificaciones no leídas
 * @param {Array} notificaciones - Array de notificaciones
 * @returns {Array}
 */
export function obtenerNoLeidas(notificaciones) {
  return notificaciones.filter(n => !n.leida);
}

/**
 * LÓGICA DE NEGOCIO: Contar notificaciones por tipo
 * @param {Array} notificaciones - Array de notificaciones
 * @returns {Object}
 */
export function contarPorTipo(notificaciones) {
  return {
    riego: notificaciones.filter(n => n.tipo === 'RIEGO').length,
    alerta: notificaciones.filter(n => n.tipo === 'ALERTA').length,
    sistema: notificaciones.filter(n => n.tipo === 'SISTEMA').length
  };
}
