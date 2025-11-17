// =============================================
// CAPA DE DOMINIO - REGISTRO DE SENSORES (RF5, RF6)
// Archivo: features/domain/RegistroSensorDomain.js
// =============================================
// Contiene la lógica de negocio para registros históricos de sensores

import { RegistroSensor } from '../../models/RegistroSensor.js';

/**
 * LÓGICA DE NEGOCIO: Validar y crear registro de sensor
 * @param {Object} datosLectura - Datos de la lectura
 * @returns {Object}
 */
export function validarYCrearRegistro(datosLectura) {
  const { temperatura, humedad, id_invernadero } = datosLectura;
  
  // Validar rangos
  const errores = [];
  
  if (temperatura < -50 || temperatura > 100) {
    errores.push('Temperatura fuera de rango válido (-50 a 100°C)');
  }
  
  if (humedad < 0 || humedad > 100) {
    errores.push('Humedad fuera de rango válido (0-100%)');
  }
  
  if (!id_invernadero) {
    errores.push('ID de invernadero requerido');
  }
  
  if (errores.length > 0) {
    return {
      exito: false,
      errores: errores
    };
  }
  
  const registro = new RegistroSensor(
    null,
    id_invernadero,
    temperatura,
    humedad,
    new Date()
  );
  
  return {
    exito: true,
    registro: registro,
    estado: registro.estado
  };
}

/**
 * LÓGICA DE NEGOCIO: Calcular estadísticas de registros
 * @param {Array} registros - Array de registros
 * @returns {Object}
 */
export function calcularEstadisticas(registros) {
  if (!registros || registros.length === 0) {
    return {
      temperatura: { promedio: 0, minima: 0, maxima: 0 },
      humedad: { promedio: 0, minima: 0, maxima: 0 },
      totalRegistros: 0
    };
  }
  
  const temperaturas = registros.map(r => r.temperatura);
  const humedades = registros.map(r => r.humedad);
  
  return {
    temperatura: {
      promedio: calcularPromedio(temperaturas),
      minima: Math.min(...temperaturas),
      maxima: Math.max(...temperaturas)
    },
    humedad: {
      promedio: calcularPromedio(humedades),
      minima: Math.min(...humedades),
      maxima: Math.max(...humedades)
    },
    totalRegistros: registros.length
  };
}

/**
 * LÓGICA DE NEGOCIO: Calcular promedio
 * @param {Array} valores - Array de números
 * @returns {Number}
 */
function calcularPromedio(valores) {
  if (valores.length === 0) return 0;
  const suma = valores.reduce((acc, val) => acc + val, 0);
  return Math.round((suma / valores.length) * 10) / 10;
}

/**
 * LÓGICA DE NEGOCIO: Agrupar registros por hora
 * @param {Array} registros - Array de registros
 * @returns {Object}
 */
export function agruparPorHora(registros) {
  const agrupados = {};
  
  registros.forEach(registro => {
    const fecha = new Date(registro.fecha_hora);
    const hora = fecha.getHours();
    const clave = `${fecha.toISOString().split('T')[0]}-${hora}`;
    
    if (!agrupados[clave]) {
      agrupados[clave] = {
        fecha: fecha,
        hora: hora,
        registros: [],
        temperatura: { sum: 0, count: 0 },
        humedad: { sum: 0, count: 0 }
      };
    }
    
    agrupados[clave].registros.push(registro);
    agrupados[clave].temperatura.sum += registro.temperatura;
    agrupados[clave].temperatura.count++;
    agrupados[clave].humedad.sum += registro.humedad;
    agrupados[clave].humedad.count++;
  });
  
  // Calcular promedios
  Object.keys(agrupados).forEach(clave => {
    const grupo = agrupados[clave];
    grupo.temperaturaPromedio = grupo.temperatura.sum / grupo.temperatura.count;
    grupo.humedadPromedio = grupo.humedad.sum / grupo.humedad.count;
  });
  
  return agrupados;
}

/**
 * LÓGICA DE NEGOCIO: Detectar anomalías en registros
 * @param {Array} registros - Array de registros
 * @param {Object} rangosOptimos - {temperatura: {min, max}, humedad: {min, max}}
 * @returns {Array}
 */
export function detectarAnomalias(registros, rangosOptimos) {
  return registros.filter(registro => {
    const tempFueraRango = 
      registro.temperatura < rangosOptimos.temperatura.min ||
      registro.temperatura > rangosOptimos.temperatura.max;
    
    const humFueraRango = 
      registro.humedad < rangosOptimos.humedad.min ||
      registro.humedad > rangosOptimos.humedad.max;
    
    return tempFueraRango || humFueraRango;
  });
}

/**
 * LÓGICA DE NEGOCIO: Filtrar registros por rango de fechas
 * @param {Array} registros - Array de registros
 * @param {Date} fechaInicio - Fecha inicial
 * @param {Date} fechaFin - Fecha final
 * @returns {Array}
 */
export function filtrarPorFechas(registros, fechaInicio, fechaFin) {
  return registros.filter(registro => {
    const fecha = new Date(registro.fecha_hora);
    return fecha >= fechaInicio && fecha <= fechaFin;
  });
}

/**
 * LÓGICA DE NEGOCIO: Obtener últimos N registros
 * @param {Array} registros - Array de registros
 * @param {Number} cantidad - Número de registros a obtener
 * @returns {Array}
 */
export function obtenerUltimosRegistros(registros, cantidad = 10) {
  return registros
    .sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora))
    .slice(0, cantidad);
}

/**
 * LÓGICA DE NEGOCIO: Formatear datos para gráficos
 * @param {Array} registros - Array de registros
 * @returns {Object}
 */
export function formatearParaGraficos(registros) {
  const ordenados = registros.sort((a, b) => 
    new Date(a.fecha_hora) - new Date(b.fecha_hora)
  );
  
  return {
    labels: ordenados.map(r => {
      const fecha = new Date(r.fecha_hora);
      return `${fecha.getHours().toString().padStart(2, '0')}:${fecha.getMinutes().toString().padStart(2, '0')}`;
    }),
    temperatura: ordenados.map(r => r.temperatura),
    humedad: ordenados.map(r => r.humedad),
    estados: ordenados.map(r => r.estado)
  };
}

/**
 * LÓGICA DE NEGOCIO: Calcular tendencia (ascendente, descendente, estable)
 * @param {Array} valores - Array de valores numéricos
 * @returns {String}
 */
export function calcularTendencia(valores) {
  if (valores.length < 2) return 'ESTABLE';
  
  const mitad = Math.floor(valores.length / 2);
  const primeraMitad = valores.slice(0, mitad);
  const segundaMitad = valores.slice(mitad);
  
  const promedioPrimera = calcularPromedio(primeraMitad);
  const promedioSegunda = calcularPromedio(segundaMitad);
  
  const diferencia = promedioSegunda - promedioPrimera;
  
  if (Math.abs(diferencia) < 0.5) return 'ESTABLE';
  if (diferencia > 0) return 'ASCENDENTE';
  return 'DESCENDENTE';
}

/**
 * LÓGICA DE NEGOCIO: Generar resumen diario
 * @param {Array} registros - Registros de un día
 * @returns {Object}
 */
export function generarResumenDiario(registros) {
  if (registros.length === 0) {
    return {
      fecha: new Date(),
      totalRegistros: 0,
      mensaje: 'Sin registros para este día'
    };
  }
  
  const estadisticas = calcularEstadisticas(registros);
  const anomalias = detectarAnomalias(registros, {
    temperatura: { min: 18, max: 24 },
    humedad: { min: 75, max: 82 }
  });
  
  return {
    fecha: new Date(registros[0].fecha_hora).toISOString().split('T')[0],
    totalRegistros: registros.length,
    estadisticas: estadisticas,
    anomalias: anomalias.length,
    porcentajeOptimo: ((registros.length - anomalias.length) / registros.length * 100).toFixed(1)
  };
}
