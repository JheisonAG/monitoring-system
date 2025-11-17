// =============================================
// CONTROLADOR: NOTIFICACIONES (RF2)
// Archivo: features/controller/notificacionController.js
// Descripción: Gestiona el sistema de notificaciones y alertas
// =============================================

import { supabaseClient } from '../../core/DB_connections.js';
import { obtenerLecturaActual } from '../../core/Em_seno.js';
import * as NotificacionDomain from '../domain/NotificacionDomain.js';
import * as CalendarioController from './calendarioController.js';

// =============================================
// CONTROLADOR: Crear notificación
// =============================================
export async function crearNotificacion(tipoNotificacion, datos) {
  try {
    let notificacionData;

    switch(tipoNotificacion) {
      case 'RIEGO':
        notificacionData = NotificacionDomain.crearNotificacionRiego(datos);
        break;
      
      case 'ALERTA_TEMPERATURA':
        notificacionData = NotificacionDomain.crearNotificacionAlerta(
          'temperatura',
          datos.valor,
          datos.rangos,
          datos.invernadero
        );
        break;
      
      case 'ALERTA_HUMEDAD':
        notificacionData = NotificacionDomain.crearNotificacionAlerta(
          'humedad',
          datos.valor,
          datos.rangos,
          datos.invernadero
        );
        break;
      
      default:
        return {
          exito: false,
          error: 'Tipo de notificación no válido'
        };
    }

    // Insertar notificación en la base de datos
    const { data: notificacion, error } = await supabaseClient
      .from('notificaciones')
      .insert({
        tipo: notificacionData.tipo,
        titulo: notificacionData.titulo,
        mensaje: notificacionData.mensaje,
        prioridad: notificacionData.prioridad,
        fecha_envio: new Date()
      })
      .select()
      .single();

    if (error) {
      console.error('Error al crear notificación:', error);
      return {
        exito: false,
        error: error.message
      };
    }

    // Asociar con usuarios
    if (datos.idUsuarios && datos.idUsuarios.length > 0) {
      const asociaciones = datos.idUsuarios.map(idUsuario => ({
        id_notificacion: notificacion.id_notificacion,
        id_usuario: idUsuario,
        leida: false
      }));

      await supabaseClient
        .from('notificacion_usuarios')
        .insert(asociaciones);
    }

    return {
      exito: true,
      notificacion: notificacion
    };

  } catch (error) {
    console.error('Error en crearNotificacion:', error);
    return {
      exito: false,
      error: error.message
    };
  }
}

// =============================================
// CONTROLADOR: Verificar y crear notificaciones de riego
// Se ejecuta periódicamente para verificar calendarios
// =============================================
export async function verificarNotificacionesRiego(idInvernadero = 1) {
  try {
    // Verificar si debe regar hoy
    const verificacion = await CalendarioController.verificarRiegoHoy(idInvernadero);

    if (!verificacion.debeRegar || verificacion.calendarios.length === 0) {
      return {
        exito: true,
        notificacionesCreadas: 0,
        mensaje: 'No hay riegos programados para hoy'
      };
    }

    const notificacionesCreadas = [];

    // Crear notificación para cada calendario activo
    for (const calendario of verificacion.calendarios) {
      const resultado = await crearNotificacion('RIEGO', {
        nombreInvernadero: `Invernadero ${idInvernadero}`,
        horaRiego: calendario.hora_riego,
        duracionMinutos: calendario.duracion_minutos,
        idUsuarios: [1] // TODO: Obtener usuarios del invernadero
      });

      if (resultado.exito) {
        notificacionesCreadas.push(resultado.notificacion);

        // Asociar notificación con el calendario
        await supabaseClient
          .from('notificacion_calendarios')
          .insert({
            id_notificacion: resultado.notificacion.id_notificacion,
            id_calendario: calendario.id_calendario
          });
      }
    }

    return {
      exito: true,
      notificacionesCreadas: notificacionesCreadas.length,
      notificaciones: notificacionesCreadas
    };

  } catch (error) {
    console.error('Error en verificarNotificacionesRiego:', error);
    return {
      exito: false,
      error: error.message
    };
  }
}

// =============================================
// CONTROLADOR: Verificar condiciones ambientales
// Crea alertas si temperatura o humedad están fuera de rango
// =============================================
export async function verificarCondicionesAmbientales(idInvernadero = 1) {
  try {
    const lectura = obtenerLecturaActual();
    
    // Rangos óptimos para orquídeas
    const rangos = {
      temperatura: { min: 18, max: 24 },
      humedad: { min: 75, max: 82 }
    };

    const alertasCreadas = [];

    // Verificar temperatura usando lógica de dominio
    if (NotificacionDomain.estaFueraDeRango(lectura.temperatura, rangos.temperatura)) {
      const resultado = await crearNotificacion('ALERTA_TEMPERATURA', {
        valor: lectura.temperatura,
        rangos: rangos.temperatura,
        invernadero: `Invernadero ${idInvernadero}`,
        idUsuarios: [1] // TODO: Obtener usuarios del invernadero
      });

      if (resultado.exito) {
        alertasCreadas.push(resultado.notificacion);
      }
    }

    // Verificar humedad
    if (NotificacionDomain.estaFueraDeRango(lectura.humedad, rangos.humedad)) {
      const resultado = await crearNotificacion('ALERTA_HUMEDAD', {
        valor: lectura.humedad,
        rangos: rangos.humedad,
        invernadero: `Invernadero ${idInvernadero}`,
        idUsuarios: [1]
      });

      if (resultado.exito) {
        alertasCreadas.push(resultado.notificacion);
      }
    }

    return {
      exito: true,
      alertasCreadas: alertasCreadas.length,
      alertas: alertasCreadas
    };

  } catch (error) {
    console.error('Error en verificarCondicionesAmbientales:', error);
    return {
      exito: false,
      error: error.message
    };
  }
}

// =============================================
// CONTROLADOR: Obtener notificaciones de usuario
// =============================================
export async function obtenerNotificaciones(idUsuario, filtros = {}) {
  try {
    let query = supabaseClient
      .from('notificaciones')
      .select(`
        *,
        notificacion_usuarios!inner (
          leida,
          fecha_lectura,
          id_usuario
        )
      `)
      .eq('notificacion_usuarios.id_usuario', idUsuario)
      .order('fecha_creacion', { ascending: false });

    // Aplicar filtros
    if (filtros.soloNoLeidas) {
      query = query.eq('notificacion_usuarios.leida', false);
    }

    if (filtros.tipo) {
      query = query.eq('tipo', filtros.tipo);
    }

    if (filtros.prioridad) {
      query = query.eq('prioridad', filtros.prioridad);
    }

    if (filtros.limite) {
      query = query.limit(filtros.limite);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener notificaciones:', error);
      return {
        exito: false,
        error: error.message,
        notificaciones: []
      };
    }

    // Usar lógica de dominio para agrupar por prioridad
    const agrupadas = NotificacionDomain.agruparPorPrioridad(data || []);

    return {
      exito: true,
      notificaciones: data || [],
      agrupadas: agrupadas,
      totalNoLeidas: NotificacionDomain.obtenerNoLeidas(data || []).length
    };

  } catch (error) {
    console.error('Error en obtenerNotificaciones:', error);
    return {
      exito: false,
      error: error.message,
      notificaciones: []
    };
  }
}

// =============================================
// CONTROLADOR: Obtener notificaciones de usuario
// =============================================
export async function obtenerNotificacionesUsuario(idUsuario = 1, limite = 20) {
  try {
    const { data, error } = await supabaseClient
      .from('notificaciones')
      .select(`
        *,
        notificacion_usuarios!inner (
          leida,
          fecha_lectura,
          id_usuario
        )
      `)
      .eq('notificacion_usuarios.id_usuario', idUsuario)
      .order('fecha_creacion', { ascending: false })
      .limit(limite);

    if (error) {
      console.error('Error al obtener notificaciones de usuario:', error);
      return {
        exito: false,
        error: error.message,
        notificaciones: [],
        totalNoLeidas: 0
      };
    }

    const notificaciones = (data || []).map(notif => ({
      id: notif.id_notificacion,
      titulo: notif.titulo,
      mensaje: notif.mensaje,
      tipo: notif.tipo,
      prioridad: notif.prioridad,
      fecha_creacion: notif.fecha_creacion,
      leida: notif.notificacion_usuarios[0]?.leida || false,
      fecha_lectura: notif.notificacion_usuarios[0]?.fecha_lectura || null
    }));

    const totalNoLeidas = notificaciones.filter(n => !n.leida).length;

    return {
      exito: true,
      notificaciones: notificaciones,
      totalNoLeidas: totalNoLeidas
    };

  } catch (error) {
    console.error('Error en obtenerNotificacionesUsuario:', error);
    return {
      exito: false,
      error: error.message,
      notificaciones: [],
      totalNoLeidas: 0
    };
  }
}

// =============================================
// CONTROLADOR: Marcar notificación como leída
// =============================================
export async function marcarComoLeida(idNotificacion, idUsuario) {
  try {
    const { error } = await supabaseClient
      .from('notificacion_usuarios')
      .update({
        leida: true,
        fecha_lectura: new Date()
      })
      .eq('id_notificacion', idNotificacion)
      .eq('id_usuario', idUsuario);

    if (error) {
      console.error('Error al marcar como leída:', error);
      return {
        exito: false,
        error: error.message
      };
    }

    return {
      exito: true,
      mensaje: 'Notificación marcada como leída'
    };

  } catch (error) {
    console.error('Error en marcarComoLeida:', error);
    return {
      exito: false,
      error: error.message
    };
  }
}

export default {
  crearNotificacion,
  verificarNotificacionesRiego,
  verificarCondicionesAmbientales,
  obtenerNotificaciones,
  obtenerNotificacionesUsuario,
  marcarComoLeida
};
