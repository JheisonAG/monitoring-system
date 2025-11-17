// =============================================
// CAPA DE DOMINIO - CALENDARIO DE RIEGO (RF1)
// Archivo: features/domain/CalendarioRiegoDomain.js
// =============================================
// Contiene la lógica de negocio relacionada con el calendario de riego

import { supabaseClient } from '../../core/DB_connections.js';
import { CalendarioRiego } from '../../models/CalendarioRiego.js';

/**
 * LÓGICA DE NEGOCIO: Validar y crear un calendario de riego
 * @param {Object} datosCalendario - Datos del calendario
 * @returns {Object} Resultado de la operación
 */
export async function validarYCrearCalendario(datosCalendario) {
  // Validar datos con el modelo
  const calendario = new CalendarioRiego(
    null,
    datosCalendario.id_invernadero,
    datosCalendario.nombre_configuracion || 'Calendario Principal',
    datosCalendario.hora_riego,
    datosCalendario.duracion_minutos || 10,
    datosCalendario.dias || [],
    true
  );

  const errores = calendario.validar();
  if (errores.length > 0) {
    return {
      exito: false,
      errores: errores,
      mensaje: 'Errores de validación en el calendario'
    };
  }

  return {
    exito: true,
    calendario: calendario,
    mensaje: 'Calendario validado correctamente'
  };
}

/**
 * LÓGICA DE NEGOCIO: Calcular próximo riego
 * @param {Object} calendario - Datos del calendario
 * @returns {Object|null} Información del próximo riego
 */
export function calcularProximoRiego(calendario) {
  if (!calendario || !calendario.dias || calendario.dias.length === 0) {
    return null;
  }

  const ahora = new Date();
  const diaActual = ahora.getDay() + 1; // JS: 0=Domingo, DB: 1=Domingo
  const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
  
  // Parsear hora del calendario
  const [horas, minutos] = calendario.hora_riego.split(':').map(Number);
  const horaRiego = horas * 60 + minutos;

  // Verificar si hoy es día de riego y aún no ha pasado la hora
  if (calendario.dias.includes(diaActual) && horaActual < horaRiego) {
    return {
      esHoy: true,
      fecha: ahora,
      hora: calendario.hora_riego,
      minutosFaltantes: horaRiego - horaActual
    };
  }

  // Buscar el próximo día de riego
  let diasOrdenados = [...calendario.dias].sort((a, b) => a - b);
  let proximoDia = null;

  // Buscar siguiente día en la misma semana
  for (let dia of diasOrdenados) {
    if (dia > diaActual || (dia === diaActual && horaActual >= horaRiego)) {
      proximoDia = dia;
      break;
    }
  }

  // Si no hay día siguiente esta semana, tomar el primero de la próxima semana
  if (!proximoDia) {
    proximoDia = diasOrdenados[0];
  }

  // Calcular fecha del próximo riego
  let diasHastaProximoRiego = proximoDia - diaActual;
  if (diasHastaProximoRiego <= 0) {
    diasHastaProximoRiego += 7;
  }

  const fechaProximoRiego = new Date(ahora);
  fechaProximoRiego.setDate(ahora.getDate() + diasHastaProximoRiego);

  return {
    esHoy: false,
    fecha: fechaProximoRiego,
    hora: calendario.hora_riego,
    diasFaltantes: diasHastaProximoRiego
  };
}

/**
 * LÓGICA DE NEGOCIO: Verificar si debe regar hoy
 * @param {Array} dias - Array de días de la semana
 * @returns {Boolean}
 */
export function debeRegarHoy(dias) {
  if (!dias || dias.length === 0) return false;
  const hoy = new Date().getDay() + 1; // Convertir a formato DB (1=Domingo)
  return dias.includes(hoy);
}

/**
 * LÓGICA DE NEGOCIO: Obtener nombre del día
 * @param {Number} numeroDia - Número del día (1-7)
 * @returns {String}
 */
export function obtenerNombreDia(numeroDia) {
  const nombres = {
    1: 'Domingo',
    2: 'Lunes',
    3: 'Martes',
    4: 'Miércoles',
    5: 'Jueves',
    6: 'Viernes',
    7: 'Sábado'
  };
  return nombres[numeroDia] || 'Desconocido';
}

/**
 * LÓGICA DE NEGOCIO: Formatear días para mostrar
 * @param {Array} dias - Array de números de días
 * @returns {String}
 */
export function formatearDiasCalendario(dias) {
  if (!dias || dias.length === 0) return 'Sin días configurados';
  
  const nombresCortos = {
    1: 'Dom', 2: 'Lun', 3: 'Mar', 4: 'Mié',
    5: 'Jue', 6: 'Vie', 7: 'Sáb'
  };
  
  return dias.sort().map(d => nombresCortos[d]).join(', ');
}

/**
 * LÓGICA DE NEGOCIO: Validar formato de hora
 * @param {String} hora - Hora en formato HH:MM
 * @returns {Boolean}
 */
export function validarFormatoHora(hora) {
  const regex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
  return regex.test(hora);
}

/**
 * LÓGICA DE NEGOCIO: Validar duración del riego
 * @param {Number} duracion - Duración en minutos
 * @returns {Object}
 */
export function validarDuracionRiego(duracion) {
  if (duracion < 1) {
    return { valido: false, mensaje: 'La duración debe ser al menos 1 minuto' };
  }
  if (duracion > 120) {
    return { valido: false, mensaje: 'La duración no puede exceder 120 minutos' };
  }
  return { valido: true };
}
