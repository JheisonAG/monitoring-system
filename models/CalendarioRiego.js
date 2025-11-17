// =============================================
// MODELO: CALENDARIO DE RIEGO
// Archivo: models/CalendarioRiego.js
// Descripción: Modelo para configuración de riego (RF1)
// =============================================

export class CalendarioRiego {
  constructor(data = {}) {
    this.id_calendario = data.id_calendario || null;
    this.id_invernadero = data.id_invernadero || null;
    this.nombre_configuracion = data.nombre_configuracion || 'Calendario Principal';
    this.hora_riego = data.hora_riego || '08:00:00';
    this.duracion_minutos = data.duracion_minutos || 10;
    this.dias_semana = data.dias_semana || []; // Array de números (1=Domingo, 2=Lunes, etc.)
    this.activo = data.activo !== undefined ? data.activo : true;
    this.fecha_creacion = data.fecha_creacion || new Date();
  }

  // =============================================
  // MÉTODO: Validar configuración del calendario
  // =============================================
  validar() {
    const errores = [];

    if (!this.id_invernadero) {
      errores.push('El ID del invernadero es requerido');
    }

    if (!this.hora_riego || !this.validarHora(this.hora_riego)) {
      errores.push('La hora de riego no es válida (formato: HH:MM:SS)');
    }

    if (!this.duracion_minutos || this.duracion_minutos < 1 || this.duracion_minutos > 120) {
      errores.push('La duración debe estar entre 1 y 120 minutos');
    }

    if (!Array.isArray(this.dias_semana) || this.dias_semana.length === 0) {
      errores.push('Debe seleccionar al menos un día de la semana');
    }

    if (this.dias_semana.some(dia => dia < 1 || dia > 7)) {
      errores.push('Los días de la semana deben estar entre 1 (Domingo) y 7 (Sábado)');
    }

    return {
      valido: errores.length === 0,
      errores
    };
  }

  // =============================================
  // MÉTODO: Validar formato de hora
  // =============================================
  validarHora(hora) {
    const regex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
    return regex.test(hora);
  }

  // =============================================
  // MÉTODO: Obtener nombres de días
  // =============================================
  obtenerNombresDias() {
    const nombres = {
      1: 'Domingo',
      2: 'Lunes',
      3: 'Martes',
      4: 'Miércoles',
      5: 'Jueves',
      6: 'Viernes',
      7: 'Sábado'
    };

    return this.dias_semana
      .sort((a, b) => a - b)
      .map(dia => nombres[dia]);
  }

  // =============================================
  // MÉTODO: Verificar si debe regar hoy
  // =============================================
  debeRegarHoy() {
    const hoy = new Date().getDay() + 1; // JavaScript usa 0=Domingo, convertimos a 1=Domingo
    return this.activo && this.dias_semana.includes(hoy);
  }

  // =============================================
  // MÉTODO: Calcular próximo riego
  // =============================================
  calcularProximoRiego() {
    if (!this.activo || this.dias_semana.length === 0) {
      return null;
    }

    const ahora = new Date();
    const hoy = ahora.getDay() + 1;
    const [horas, minutos] = this.hora_riego.split(':').map(Number);

    // Verificar si el riego es hoy
    if (this.dias_semana.includes(hoy)) {
      const proximoRiegoHoy = new Date();
      proximoRiegoHoy.setHours(horas, minutos, 0, 0);

      if (proximoRiegoHoy > ahora) {
        return proximoRiegoHoy;
      }
    }

    // Buscar el próximo día de riego
    for (let i = 1; i <= 7; i++) {
      const diaBuscado = ((hoy + i - 1) % 7) + 1;
      
      if (this.dias_semana.includes(diaBuscado)) {
        const proximoRiego = new Date();
        proximoRiego.setDate(proximoRiego.getDate() + i);
        proximoRiego.setHours(horas, minutos, 0, 0);
        return proximoRiego;
      }
    }

    return null;
  }

  // =============================================
  // MÉTODO: Convertir a objeto plano (para DB)
  // =============================================
  toJSON() {
    return {
      id_calendario: this.id_calendario,
      id_invernadero: this.id_invernadero,
      nombre_configuracion: this.nombre_configuracion,
      hora_riego: this.hora_riego,
      duracion_minutos: this.duracion_minutos,
      dias_semana: this.dias_semana,
      activo: this.activo,
      fecha_creacion: this.fecha_creacion
    };
  }
}

export default CalendarioRiego;
