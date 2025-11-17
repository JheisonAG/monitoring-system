// =============================================
// MODELO: NOTIFICACIÓN
// Archivo: models/Notificacion.js
// Descripción: Modelo para notificaciones del sistema (RF2)
// =============================================

export class Notificacion {
  constructor(data = {}) {
    this.id_notificacion = data.id_notificacion || null;
    this.tipo = data.tipo || 'SISTEMA'; // RIEGO, ALERTA, SISTEMA
    this.titulo = data.titulo || '';
    this.mensaje = data.mensaje || '';
    this.prioridad = data.prioridad || 'MEDIA'; // BAJA, MEDIA, ALTA, URGENTE
    this.fecha_creacion = data.fecha_creacion || new Date();
    this.fecha_envio = data.fecha_envio || null;
    this.leida = data.leida || false;
    this.usuarios = data.usuarios || []; // Array de IDs de usuarios destinatarios
  }

  // =============================================
  // MÉTODO: Validar datos de la notificación
  // =============================================
  validar() {
    const errores = [];

    const tiposValidos = ['RIEGO', 'ALERTA', 'SISTEMA'];
    if (!tiposValidos.includes(this.tipo)) {
      errores.push('El tipo de notificación no es válido');
    }

    if (!this.titulo || this.titulo.trim().length === 0) {
      errores.push('El título es requerido');
    }

    if (this.titulo && this.titulo.length > 200) {
      errores.push('El título no puede exceder 200 caracteres');
    }

    if (!this.mensaje || this.mensaje.trim().length === 0) {
      errores.push('El mensaje es requerido');
    }

    const prioridadesValidas = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'];
    if (!prioridadesValidas.includes(this.prioridad)) {
      errores.push('La prioridad no es válida');
    }

    return {
      valido: errores.length === 0,
      errores
    };
  }

  // =============================================
  // MÉTODO: Marcar como leída
  // =============================================
  marcarComoLeida() {
    this.leida = true;
  }

  // =============================================
  // MÉTODO: Marcar como enviada
  // =============================================
  marcarComoEnviada() {
    this.fecha_envio = new Date();
  }

  // =============================================
  // MÉTODO: Obtener icono según tipo
  // =============================================
  obtenerIcono() {
    const iconos = {
      RIEGO: '💧',
      ALERTA: '⚠️',
      SISTEMA: 'ℹ️'
    };
    return iconos[this.tipo] || '📢';
  }

  // =============================================
  // MÉTODO: Obtener color según prioridad
  // =============================================
  obtenerColor() {
    const colores = {
      BAJA: '#4CAF50',
      MEDIA: '#2196F3',
      ALTA: '#FF9800',
      URGENTE: '#F44336'
    };
    return colores[this.prioridad] || '#9E9E9E';
  }

  // =============================================
  // MÉTODO: Convertir a objeto plano (para DB)
  // =============================================
  toJSON() {
    return {
      id_notificacion: this.id_notificacion,
      tipo: this.tipo,
      titulo: this.titulo,
      mensaje: this.mensaje,
      prioridad: this.prioridad,
      fecha_creacion: this.fecha_creacion,
      fecha_envio: this.fecha_envio,
      leida: this.leida
    };
  }
}

// =============================================
// CLASE: Notificación de Riego (especialización)
// =============================================
export class NotificacionRiego extends Notificacion {
  constructor(data = {}) {
    super({
      ...data,
      tipo: 'RIEGO'
    });
    this.id_calendario = data.id_calendario || null;
    this.invernadero = data.invernadero || '';
  }

  // =============================================
  // MÉTODO: Crear notificación de recordatorio
  // =============================================
  static crearRecordatorio(invernadero, horaRiego, duracion) {
    return new NotificacionRiego({
      titulo: 'Recordatorio de Riego',
      mensaje: `Es hora de regar el invernadero "${invernadero}". Duración programada: ${duracion} minutos.`,
      prioridad: 'MEDIA',
      invernadero: invernadero
    });
  }

  // =============================================
  // MÉTODO: Crear notificación de riego completado
  // =============================================
  static crearRiegoCompletado(invernadero, duracion) {
    return new NotificacionRiego({
      titulo: 'Riego Completado',
      mensaje: `El riego del invernadero "${invernadero}" ha sido completado exitosamente (${duracion} minutos).`,
      prioridad: 'BAJA',
      invernadero: invernadero
    });
  }
}

// =============================================
// CLASE: Notificación de Alerta (especialización)
// =============================================
export class NotificacionAlerta extends Notificacion {
  constructor(data = {}) {
    super({
      ...data,
      tipo: 'ALERTA'
    });
    this.parametro = data.parametro || ''; // temperatura, humedad, etc.
    this.valor_actual = data.valor_actual || null;
    this.valor_optimo = data.valor_optimo || null;
  }

  // =============================================
  // MÉTODO: Crear alerta de temperatura
  // =============================================
  static crearAlertaTemperatura(temperatura, rangoOptimo) {
    const prioridad = Math.abs(temperatura - 21) > 4 ? 'URGENTE' : 'ALTA';
    
    return new NotificacionAlerta({
      titulo: 'Temperatura Fuera de Rango',
      mensaje: `La temperatura actual es ${temperatura}°C. Rango óptimo: ${rangoOptimo}.`,
      prioridad: prioridad,
      parametro: 'temperatura',
      valor_actual: temperatura,
      valor_optimo: rangoOptimo
    });
  }

  // =============================================
  // MÉTODO: Crear alerta de humedad
  // =============================================
  static crearAlertaHumedad(humedad, rangoOptimo) {
    const prioridad = humedad < 70 || humedad > 85 ? 'URGENTE' : 'ALTA';
    
    return new NotificacionAlerta({
      titulo: 'Humedad Fuera de Rango',
      mensaje: `La humedad actual es ${humedad}%. Rango óptimo: ${rangoOptimo}.`,
      prioridad: prioridad,
      parametro: 'humedad',
      valor_actual: humedad,
      valor_optimo: rangoOptimo
    });
  }
}

export default Notificacion;
