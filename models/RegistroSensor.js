// =============================================
// MODELO: REGISTRO DE SENSOR
// Archivo: models/RegistroSensor.js
// Descripción: Modelo para datos históricos de sensores (RF5, RF6)
// =============================================

export class RegistroSensor {
  constructor(data = {}) {
    this.id_registro = data.id_registro || null;
    this.id_invernadero = data.id_invernadero || null;
    this.temperatura = data.temperatura || null;
    this.humedad = data.humedad || null;
    this.timestamp = data.timestamp || new Date();
    this.estado = data.estado || 'NORMAL'; // NORMAL, ADVERTENCIA, CRITICO
  }

  // =============================================
  // MÉTODO: Validar datos del registro
  // =============================================
  validar() {
    const errores = [];

    if (!this.id_invernadero) {
      errores.push('El ID del invernadero es requerido');
    }

    if (this.temperatura === null || this.temperatura === undefined) {
      errores.push('La temperatura es requerida');
    }

    if (this.temperatura && (this.temperatura < -10 || this.temperatura > 50)) {
      errores.push('La temperatura debe estar entre -10°C y 50°C');
    }

    if (this.humedad === null || this.humedad === undefined) {
      errores.push('La humedad es requerida');
    }

    if (this.humedad && (this.humedad < 0 || this.humedad > 100)) {
      errores.push('La humedad debe estar entre 0% y 100%');
    }

    const estadosValidos = ['NORMAL', 'ADVERTENCIA', 'CRITICO'];
    if (!estadosValidos.includes(this.estado)) {
      errores.push('El estado no es válido');
    }

    return {
      valido: errores.length === 0,
      errores
    };
  }

  // =============================================
  // MÉTODO: Evaluar si los valores están en rango óptimo
  // =============================================
  evaluarEstado() {
    const tempOptima = this.temperatura >= 18 && this.temperatura <= 24;
    const humOptima = this.humedad >= 75 && this.humedad <= 82;

    if (tempOptima && humOptima) {
      this.estado = 'NORMAL';
    } else if (
      (this.temperatura >= 16 && this.temperatura <= 26) &&
      (this.humedad >= 70 && this.humedad <= 87)
    ) {
      this.estado = 'ADVERTENCIA';
    } else {
      this.estado = 'CRITICO';
    }

    return this.estado;
  }

  // =============================================
  // MÉTODO: Obtener color según estado
  // =============================================
  obtenerColorEstado() {
    const colores = {
      NORMAL: '#4CAF50',
      ADVERTENCIA: '#FF9800',
      CRITICO: '#F44336'
    };
    return colores[this.estado] || '#9E9E9E';
  }

  // =============================================
  // MÉTODO: Obtener icono según estado
  // =============================================
  obtenerIconoEstado() {
    const iconos = {
      NORMAL: '✓',
      ADVERTENCIA: '⚠',
      CRITICO: '✗'
    };
    return iconos[this.estado] || '?';
  }

  // =============================================
  // MÉTODO: Formatear temperatura para visualización
  // =============================================
  formatearTemperatura() {
    return `${this.temperatura.toFixed(1)}°C`;
  }

  // =============================================
  // MÉTODO: Formatear humedad para visualización
  // =============================================
  formatearHumedad() {
    return `${this.humedad.toFixed(1)}%`;
  }

  // =============================================
  // MÉTODO: Convertir a objeto plano (para DB)
  // =============================================
  toJSON() {
    return {
      id_registro: this.id_registro,
      id_invernadero: this.id_invernadero,
      temperatura: this.temperatura,
      humedad: this.humedad,
      timestamp: this.timestamp,
      estado: this.estado
    };
  }
}

export default RegistroSensor;
