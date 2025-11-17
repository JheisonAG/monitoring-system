// =============================================
// CONTROLADOR: CALENDARIO DE RIEGO (RF1)
// Archivo: features/controller/calendarioController.js
// Descripción: Gestiona operaciones CRUD de calendarios de riego
// =============================================

import { supabaseClient } from '../../core/DB_connections.js';
import * as CalendarioRiegoDomain from '../domain/CalendarioRiegoDomain.js';

// =============================================
// CONTROLADOR: Crear calendario de riego
// =============================================
export async function crearCalendario(datosCalendario) {
  try {
    // 1. Validar datos usando la capa de dominio
    const validacion = await CalendarioRiegoDomain.validarYCrearCalendario(datosCalendario);
    
    if (!validacion.exito) {
      return {
        exito: false,
        errores: validacion.errores,
        mensaje: 'Error de validación'
      };
    }

    // 2. Insertar calendario en la base de datos
    const { data: calendario, error: errorCalendario } = await supabaseClient
      .from('calendario_riego')
      .insert({
        id_invernadero: datosCalendario.id_invernadero,
        nombre_configuracion: datosCalendario.nombre_configuracion || 'Calendario Principal',
        hora_riego: datosCalendario.hora_riego,
        duracion_minutos: datosCalendario.duracion_minutos || 10,
        activo: true
      })
      .select()
      .single();

    if (errorCalendario) {
      console.error('Error al crear calendario:', errorCalendario);
      return {
        exito: false,
        error: errorCalendario.message
      };
    }

    // 3. Insertar días del calendario
    if (datosCalendario.dias && datosCalendario.dias.length > 0) {
      const diasInsert = datosCalendario.dias.map(dia => ({
        id_calendario: calendario.id_calendario,
        dia_semana: dia,
        activo: true
      }));

      const { error: errorDias } = await supabaseClient
        .from('calendario_dias')
        .insert(diasInsert);

      if (errorDias) {
        console.error('Error al insertar días:', errorDias);
        // Si falla, intentar eliminar el calendario creado
        await supabaseClient
          .from('calendario_riego')
          .delete()
          .eq('id_calendario', calendario.id_calendario);

        return {
          exito: false,
          error: 'Error al configurar días del calendario'
        };
      }
    }

    return {
      exito: true,
      calendario: calendario,
      mensaje: 'Calendario creado exitosamente'
    };

  } catch (error) {
    console.error('Error en crearCalendario:', error);
    return {
      exito: false,
      error: error.message
    };
  }
}

// =============================================
// CONTROLADOR: Obtener calendarios de un invernadero
// =============================================
export async function obtenerCalendarios(idInvernadero) {
  try {
    const { data, error } = await supabaseClient
      .from('calendario_riego')
      .select(`
        *,
        calendario_dias (dia_semana, activo)
      `)
      .eq('id_invernadero', idInvernadero)
      .eq('activo', true)
      .order('hora_riego', { ascending: true });

    if (error) {
      console.error('Error al obtener calendarios:', error);
      return {
        exito: false,
        error: error.message,
        calendarios: []
      };
    }

    // Transformar formato de dias usando lógica de dominio
    const calendariosFormateados = (data || []).map(calendario => {
      const dias = calendario.calendario_dias
        .filter(d => d.activo)
        .map(d => d.dia_semana);

      return {
        ...calendario,
        dias: dias,
        diasTexto: CalendarioRiegoDomain.formatearDiasCalendario(dias),
        proximoRiego: CalendarioRiegoDomain.calcularProximoRiego({
          ...calendario,
          dias: dias
        })
      };
    });

    return {
      exito: true,
      calendarios: calendariosFormateados
    };

  } catch (error) {
    console.error('Error en obtenerCalendarios:', error);
    return {
      exito: false,
      error: error.message,
      calendarios: []
    };
  }
}

// =============================================
// CONTROLADOR: Actualizar calendario
// =============================================
export async function actualizarCalendario(idCalendario, datosActualizados) {
  try {
    // 1. Validar nuevo formato de hora si se proporciona
    if (datosActualizados.hora_riego) {
      if (!CalendarioRiegoDomain.validarFormatoHora(datosActualizados.hora_riego)) {
        return {
          exito: false,
          error: 'Formato de hora inválido. Use HH:MM'
        };
      }
    }

    // 2. Validar duración si se proporciona
    if (datosActualizados.duracion_minutos) {
      const validacionDuracion = CalendarioRiegoDomain.validarDuracionRiego(
        datosActualizados.duracion_minutos
      );

      if (!validacionDuracion.valido) {
        return {
          exito: false,
          error: validacionDuracion.mensaje
        };
      }
    }

    // 3. Actualizar calendario
    const { data: calendario, error: errorUpdate } = await supabaseClient
      .from('calendario_riego')
      .update(datosActualizados)
      .eq('id_calendario', idCalendario)
      .select()
      .single();

    if (errorUpdate) {
      console.error('Error al actualizar calendario:', errorUpdate);
      return {
        exito: false,
        error: errorUpdate.message
      };
    }

    // 4. Actualizar días si se proporcionan
    if (datosActualizados.dias) {
      // Eliminar días anteriores
      await supabaseClient
        .from('calendario_dias')
        .delete()
        .eq('id_calendario', idCalendario);

      // Insertar nuevos días
      const diasInsert = datosActualizados.dias.map(dia => ({
        id_calendario: idCalendario,
        dia_semana: dia,
        activo: true
      }));

      const { error: errorDias } = await supabaseClient
        .from('calendario_dias')
        .insert(diasInsert);

      if (errorDias) {
        console.error('Error al actualizar días:', errorDias);
        return {
          exito: false,
          error: 'Error al actualizar días del calendario'
        };
      }
    }

    return {
      exito: true,
      calendario: calendario,
      mensaje: 'Calendario actualizado exitosamente'
    };

  } catch (error) {
    console.error('Error en actualizarCalendario:', error);
    return {
      exito: false,
      error: error.message
    };
  }
}

// =============================================
// CONTROLADOR: Eliminar calendario (soft delete)
// =============================================
export async function eliminarCalendario(idCalendario) {
  try {
    const { error } = await supabaseClient
      .from('calendario_riego')
      .update({ activo: false })
      .eq('id_calendario', idCalendario);

    if (error) {
      console.error('Error al eliminar calendario:', error);
      return {
        exito: false,
        error: error.message
      };
    }

    return {
      exito: true,
      mensaje: 'Calendario eliminado exitosamente'
    };

  } catch (error) {
    console.error('Error en eliminarCalendario:', error);
    return {
      exito: false,
      error: error.message
    };
  }
}

// =============================================
// CONTROLADOR: Verificar si debe regar hoy
// =============================================
export async function verificarRiegoHoy(idInvernadero) {
  try {
    const resultado = await obtenerCalendarios(idInvernadero);
    
    if (!resultado.exito || resultado.calendarios.length === 0) {
      return {
        debeRegar: false,
        calendarios: []
      };
    }

    // Usar lógica de dominio para verificar
    const calendariosHoy = resultado.calendarios.filter(cal => 
      CalendarioRiegoDomain.debeRegarHoy(cal.dias)
    );

    return {
      debeRegar: calendariosHoy.length > 0,
      calendarios: calendariosHoy
    };

  } catch (error) {
    console.error('Error en verificarRiegoHoy:', error);
    return {
      debeRegar: false,
      error: error.message
    };
  }
}

export default {
  crearCalendario,
  obtenerCalendarios,
  actualizarCalendario,
  eliminarCalendario,
  verificarRiegoHoy
};
