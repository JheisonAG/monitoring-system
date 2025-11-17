// =============================================
// CONTROLADOR: REGISTRO DE SENSORES (RF5, RF6)
// Archivo: features/controller/registroController.js
// Descripción: Gestiona el registro histórico de datos ambientales
// =============================================

import { supabaseClient } from '../../core/DB_connections.js';
import { obtenerLecturaActual } from '../../core/Em_seno.js';
import * as RegistroSensorDomain from '../domain/RegistroSensorDomain.js';
// import * as ReportesView from '../view/ReportesView.js'; // Eliminado - no se usa

// Variable para control de registro automático
let intervaloRegistro = null;

// =============================================
// CONTROLADOR: Guardar registro de sensor
// =============================================
export async function guardarRegistro(idInvernadero, temperatura, humedad) {
  try {
    // 1. Validar datos usando la capa de dominio
    const validacion = RegistroSensorDomain.validarYCrearRegistro({
      temperatura,
      humedad,
      id_invernadero: idInvernadero
    });

    if (!validacion.exito) {
      return {
        exito: false,
        errores: validacion.errores
      };
    }

    // 2. Insertar en la base de datos
    const { data: registro, error } = await supabaseClient
      .from('registros_sensores')
      .insert({
        id_invernadero: idInvernadero,
        temperatura: temperatura,
        humedad: humedad,
        fecha_hora: new Date()
      })
      .select()
      .single();

    if (error) {
      console.error('Error al guardar registro:', error);
      return {
        exito: false,
        error: error.message
      };
    }

    return {
      exito: true,
      registro: registro,
      estado: validacion.estado
    };

  } catch (error) {
    console.error('Error en guardarRegistro:', error);
    return {
      exito: false,
      error: error.message
    };
  }
}

// =============================================
// CONTROLADOR: Iniciar registro automático
// Guarda lecturas periódicamente según intervalo configurado
// =============================================
export function iniciarRegistroAutomatico(idInvernadero = 1, intervaloMinutos = 1) {
  // Detener registro anterior si existe
  if (intervaloRegistro) {
    clearInterval(intervaloRegistro);
  }

  console.log(`Iniciando registro automático cada ${intervaloMinutos} minuto(s)...`);

  // Configurar nuevo intervalo
  intervaloRegistro = setInterval(async () => {
    try {
      const lectura = obtenerLecturaActual();
      
      const resultado = await guardarRegistro(
        idInvernadero,
        lectura.temperatura,
        lectura.humedad
      );

      if (resultado.exito) {
        console.log(`Registro guardado: ${lectura.temperatura}°C, ${lectura.humedad}% - Estado: ${resultado.estado}`);
      } else {
        console.error('Error al guardar registro:', resultado.error);
      }

    } catch (error) {
      console.error('Error en registro automático:', error);
    }
  }, intervaloMinutos * 60 * 1000);

  return {
    exito: true,
    mensaje: `Registro automático iniciado cada ${intervaloMinutos} minuto(s)`
  };
}

// =============================================
// CONTROLADOR: Detener registro automático
// =============================================
export function detenerRegistroAutomatico() {
  if (intervaloRegistro) {
    clearInterval(intervaloRegistro);
    intervaloRegistro = null;
    console.log('🛑 Registro automático detenido');
    return {
      exito: true,
      mensaje: 'Registro automático detenido'
    };
  }

  return {
    exito: false,
    mensaje: 'No hay registro automático activo'
  };
}

// =============================================
// CONTROLADOR: Obtener registros históricos
// =============================================
export async function obtenerRegistros(idInvernadero, filtros = {}) {
  try {
    let query = supabaseClient
      .from('registros_sensores')
      .select('*')
      .eq('id_invernadero', idInvernadero)
      .order('fecha_hora', { ascending: false });

    // Aplicar filtro de fecha si existe
    if (filtros.fechaInicio) {
      query = query.gte('fecha_hora', filtros.fechaInicio);
    }

    if (filtros.fechaFin) {
      query = query.lte('fecha_hora', filtros.fechaFin);
    }

    if (filtros.limite) {
      query = query.limit(filtros.limite);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener registros:', error);
      return {
        exito: false,
        error: error.message,
        registros: []
      };
    }

    return {
      exito: true,
      registros: data || [],
      total: (data || []).length
    };

  } catch (error) {
    console.error('Error en obtenerRegistros:', error);
    return {
      exito: false,
      error: error.message,
      registros: []
    };
  }
}

// =============================================
// CONTROLADOR: Obtener estadísticas
// =============================================
export async function obtenerEstadisticas(idInvernadero, dias = 7) {
  try {
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - dias);

    const resultado = await obtenerRegistros(idInvernadero, {
      fechaInicio: fechaInicio.toISOString()
    });

    if (!resultado.exito) {
      return resultado;
    }

    // Calcular estadísticas usando la capa de dominio
    const estadisticas = RegistroSensorDomain.calcularEstadisticas(resultado.registros);

    // Detectar anomalías
    const anomalias = RegistroSensorDomain.detectarAnomalias(resultado.registros, {
      temperatura: { min: 18, max: 24 },
      humedad: { min: 75, max: 82 }
    });

    // Calcular tendencias
    const temperaturas = resultado.registros.map(r => r.temperatura);
    const humedades = resultado.registros.map(r => r.humedad);

    return {
      exito: true,
      estadisticas: estadisticas,
      anomalias: {
        total: anomalias.length,
        porcentaje: ((anomalias.length / resultado.registros.length) * 100).toFixed(1),
        registros: anomalias
      },
      tendencias: {
        temperatura: RegistroSensorDomain.calcularTendencia(temperaturas),
        humedad: RegistroSensorDomain.calcularTendencia(humedades)
      },
      periodo: {
        dias: dias,
        fechaInicio: fechaInicio,
        fechaFin: new Date()
      }
    };

  } catch (error) {
    console.error('Error en obtenerEstadisticas:', error);
    return {
      exito: false,
      error: error.message
    };
  }
}

// =============================================
// CONTROLADOR: Obtener datos para reportes
// =============================================
export async function obtenerDatosReportes(idInvernadero, filtros = {}) {
  try {
    // Obtener registros según filtros
    const diasRango = filtros.rangoFecha || 7;
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - diasRango);

    const resultado = await obtenerRegistros(idInvernadero, {
      fechaInicio: fechaInicio.toISOString()
    });

    if (!resultado.exito) {
      return resultado;
    }

    // Obtener estadísticas
    const estadisticas = RegistroSensorDomain.calcularEstadisticas(resultado.registros);

    // Retornar estadísticas directamente (sin capa de vista ya que no se usa)
    return {
      exito: true,
      estadisticas: {
        temperatura: estadisticas.temperatura,
        humedad: estadisticas.humedad,
        ciclosRiego: 42, // TODO: Obtener de base de datos
        minutosRiego: 630,
        totalAlertas: 15,
        alertasResueltas: 13,
        alertasCriticas: 3
      },
      registros: resultado.registros,
      filtrosAplicados: filtros
    };

  } catch (error) {
    console.error('Error en obtenerDatosReportes:', error);
    return {
      exito: false,
      error: error.message
    };
  }
}

// =============================================
// CONTROLADOR: Generar resumen diario
// =============================================
export async function generarResumenDiario(idInvernadero, fecha = new Date()) {
  try {
    const fechaInicio = new Date(fecha);
    fechaInicio.setHours(0, 0, 0, 0);

    const fechaFin = new Date(fecha);
    fechaFin.setHours(23, 59, 59, 999);

    const resultado = await obtenerRegistros(idInvernadero, {
      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFin.toISOString()
    });

    if (!resultado.exito) {
      return resultado;
    }

    // Generar resumen usando la capa de dominio
    const resumen = RegistroSensorDomain.generarResumenDiario(resultado.registros);

    return {
      exito: true,
      resumen: resumen
    };

  } catch (error) {
    console.error('Error en generarResumenDiario:', error);
    return {
      exito: false,
      error: error.message
    };
  }
}

export default {
  guardarRegistro,
  iniciarRegistroAutomatico,
  detenerRegistroAutomatico,
  obtenerRegistros,
  obtenerEstadisticas,
  obtenerDatosReportes,
  generarResumenDiario
};
