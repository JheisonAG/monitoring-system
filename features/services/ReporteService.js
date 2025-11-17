// =============================================
// SERVICIO: REPORTES Y ANALÍTICA
// Genera reportes con tendencias diarias, semanales y mensuales
// =============================================

import { supabase } from '../../core/DB_connections.js';

// =============================================
// Obtener datos agrupados por periodo
// =============================================
export async function obtenerDatosPorPeriodo(idInvernadero, dias) {
  try {
    if (!supabase) {
      return { exito: false, error: 'Supabase no está configurado' };
    }

    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - dias);
    fechaInicio.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('registros_sensores')
      .select('*')
      .eq('id_invernadero', idInvernadero)
      .gte('fecha_hora', fechaInicio.toISOString())
      .order('fecha_hora', { ascending: true });

    if (error) throw error;

    return { exito: true, datos: data || [] };
  } catch (error) {
    console.error('Error en obtenerDatosPorPeriodo:', error);
    return { exito: false, error: error.message };
  }
}

// =============================================
// Agrupar datos por día y calcular promedios
// =============================================
function agruparPorDia(registros) {
  const agrupados = {};

  registros.forEach(reg => {
    const fecha = new Date(reg.fecha_hora).toISOString().split('T')[0];
    
    if (!agrupados[fecha]) {
      agrupados[fecha] = {
        fecha,
        temperaturas: [],
        humedades: [],
        estados: []
      };
    }

    agrupados[fecha].temperaturas.push(reg.temperatura);
    agrupados[fecha].humedades.push(reg.humedad);
    agrupados[fecha].estados.push(reg.estado);
  });

  return Object.values(agrupados).map(grupo => ({
    fecha: grupo.fecha,
    temperatura: {
      promedio: promedio(grupo.temperaturas),
      minima: Math.min(...grupo.temperaturas),
      maxima: Math.max(...grupo.temperaturas)
    },
    humedad: {
      promedio: promedio(grupo.humedades),
      minima: Math.min(...grupo.humedades),
      maxima: Math.max(...grupo.humedades)
    },
    registros: grupo.temperaturas.length,
    alertas: grupo.estados.filter(e => e !== 'NORMAL').length
  }));
}

// =============================================
// Calcular promedio
// =============================================
function promedio(valores) {
  if (!valores || valores.length === 0) return 0;
  const suma = valores.reduce((acc, val) => acc + val, 0);
  return Math.round((suma / valores.length) * 10) / 10;
}

// =============================================
// Generar reporte con tendencias
// =============================================
export async function generarReporte(idInvernadero, periodo) {
  try {
    let dias;
    switch (periodo) {
      case 'hoy':
      case 'dia':
        dias = 1;
        break;
      case 'semana':
      case '7dias':
        dias = 7;
        break;
      case 'mes':
      case '30dias':
        dias = 30;
        break;
      case '90dias':
        dias = 90;
        break;
      case 'anio':
      case '1anio':
        dias = 365;
        break;
      default:
        dias = 7;
    }

    const resultado = await obtenerDatosPorPeriodo(idInvernadero, dias);
    
    if (!resultado.exito) {
      return resultado;
    }

    const datosAgrupados = agruparPorDia(resultado.datos);
    
    // Calcular tendencias generales
    const todasTemps = resultado.datos.map(d => d.temperatura);
    const todasHums = resultado.datos.map(d => d.humedad);
    
    const tendencias = {
      temperatura: {
        promedio: promedio(todasTemps),
        minima: Math.min(...todasTemps),
        maxima: Math.max(...todasTemps),
        tendencia: calcularTendencia(datosAgrupados.map(d => d.temperatura.promedio))
      },
      humedad: {
        promedio: promedio(todasHums),
        minima: Math.min(...todasHums),
        maxima: Math.max(...todasHums),
        tendencia: calcularTendencia(datosAgrupados.map(d => d.humedad.promedio))
      }
    };

    return {
      exito: true,
      periodo,
      dias,
      datosAgrupados,
      tendencias,
      totalRegistros: resultado.datos.length
    };
  } catch (error) {
    console.error('Error en generarReporte:', error);
    return { exito: false, error: error.message };
  }
}

// =============================================
// Calcular tendencia (creciente, decreciente, estable)
// =============================================
function calcularTendencia(valores) {
  if (!valores || valores.length < 2) return 'estable';
  
  const primerMitad = valores.slice(0, Math.floor(valores.length / 2));
  const segundaMitad = valores.slice(Math.floor(valores.length / 2));
  
  const promPrimera = promedio(primerMitad);
  const promSegunda = promedio(segundaMitad);
  
  const diferencia = promSegunda - promPrimera;
  
  if (Math.abs(diferencia) < 0.5) return 'estable';
  return diferencia > 0 ? 'creciente' : 'decreciente';
}

// =============================================
// Obtener resumen de alertas por periodo
// =============================================
export async function obtenerResumenAlertas(idInvernadero, dias) {
  try {
    if (!supabase) {
      return { exito: false, error: 'Supabase no está configurado' };
    }

    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - dias);

    const { data, error } = await supabase
      .from('registros_sensores')
      .select('estado')
      .eq('id_invernadero', idInvernadero)
      .gte('fecha_hora', fechaInicio.toISOString());

    if (error) throw error;

    const resumen = {
      total: data.length,
      normal: data.filter(d => d.estado === 'NORMAL').length,
      advertencia: data.filter(d => d.estado === 'ADVERTENCIA').length,
      critico: data.filter(d => d.estado === 'CRITICO').length
    };

    return { exito: true, resumen };
  } catch (error) {
    console.error('Error en obtenerResumenAlertas:', error);
    return { exito: false, error: error.message };
  }
}

export default {
  obtenerDatosPorPeriodo,
  generarReporte,
  obtenerResumenAlertas
};
