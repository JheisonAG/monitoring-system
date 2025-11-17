// =============================================
// ORCHIDCARE PRO - SERVIDOR PRINCIPAL
// Archivo: index.js
// Descripción: Punto de entrada de la aplicación
// =============================================

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Importar módulos del sistema
import { verificarConexion } from './core/DB_connections.js';
import { iniciarSimulacion, detenerSimulacion } from './core/Em_seno.js';
import { iniciarRegistroAutomatico, detenerRegistroAutomatico } from './features/controller/registroController.js';

// Configuración de ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config();

// =============================================
// CONFIGURACIÓN DEL SERVIDOR
// =============================================

const app = express();
const PORT = process.env.PORT || 3000;

// Variables globales para controlar intervalos
let intervaloSimulacion = null;
let intervaloRegistro = null;

// =============================================
// MIDDLEWARES
// =============================================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde views
app.use('/views', express.static(path.join(__dirname, 'views')));

// =============================================
// RUTAS PRINCIPALES
// =============================================

// Ruta raíz - Redirigir al dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// Ruta del dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// Ruta de reportes
app.get('/reportes', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'reportes.html'));
});

// =============================================
// API ENDPOINTS
// =============================================

// Importar controladores
import * as registroController from './features/controller/registroController.js';
import * as calendarioController from './features/controller/calendarioController.js';
import * as notificacionController from './features/controller/notificacionController.js';

// ===== DASHBOARD ENDPOINTS =====

// Obtener datos en tiempo real
app.get('/api/dashboard/tiempo-real', async (req, res) => {
  try {
    const idInvernadero = parseInt(req.query.id_invernadero) || 1;
    
    // Obtener lectura actual del sensor y estado de riego
    const { obtenerLecturaActual, obtenerEstadoRiego } = await import('./core/Em_seno.js');
    const lecturaSensor = obtenerLecturaActual();
    const estadoRiego = obtenerEstadoRiego();
    
    // Crear respuesta simplificada
    res.json({
      success: true,
      data: {
        temperatura: lecturaSensor.temperatura,
        humedad: lecturaSensor.humedad,
        proximoRiego: {
          diasRestantes: estadoRiego.diasRestantes,
          diasDesdeUltimo: estadoRiego.diasDesdeUltimo,
          horaRiego: '08:00'
        },
        estadoSistema: {
          salud: 100,
          rendimiento: 'Excelente',
          operativo: true,
          ultimaActualizacion: new Date()
        }
      },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error en /api/dashboard/tiempo-real:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener alertas
app.get('/api/dashboard/alertas', async (req, res) => {
  try {
    const limite = parseInt(req.query.limite) || 10;
    
    // Obtener alertas del sistema de simulación
    const { obtenerAlertas } = await import('./core/Em_seno.js');
    const resultado = obtenerAlertas(limite);
    
    res.json({
      success: true,
      data: resultado.alertas,
      totalNoLeidas: resultado.totalNoLeidas,
      total: resultado.total
    });
  } catch (error) {
    console.error('Error en /api/dashboard/alertas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener estadísticas del día
app.get('/api/dashboard/estadisticas', async (req, res) => {
  try {
    // Obtener datos simulados
    const { obtenerLecturaActual } = await import('./core/Em_seno.js');
    const lectura = obtenerLecturaActual();
    
    // Calcular estadísticas del día
    const estadisticas = {
      tempActual: lectura.temperatura,
      tempMax: Math.round((lectura.temperatura + 2) * 10) / 10,
      tempMin: Math.round((lectura.temperatura - 2) * 10) / 10,
      tempPromedio: lectura.temperatura,
      humedadActual: lectura.humedad,
      humedadMax: Math.round((lectura.humedad + 5) * 10) / 10,
      humedadMin: Math.round((lectura.humedad - 5) * 10) / 10,
      humedadPromedio: lectura.humedad,
      riegosHoy: 2,
      alertasHoy: 3,
      estadoGeneral: 'Óptimo'
    };
    
    res.json({
      success: true,
      data: estadisticas
    });
  } catch (error) {
    console.error('Error en /api/dashboard/estadisticas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== REGISTROS ENDPOINTS =====

// Obtener registros históricos
app.get('/api/registros', async (req, res) => {
  try {
    const { generarDatosHistoricos } = await import('./core/Em_seno.js');
    const limite = parseInt(req.query.limite) || 100;
    
    // Usar datos del simulador en lugar de BD
    const registros = generarDatosHistoricos(limite);
    
    res.json({
      success: true,
      data: registros
    });
  } catch (error) {
    console.error('Error en /api/registros:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener datos para reportes
app.get('/api/registros/reportes', async (req, res) => {
  try {
    const periodo = req.query.periodo || 'hoy';
    
    // Generar datos de ejemplo para los últimos 30 días
    const registros = [];
    const diasPeriodo = periodo === 'hoy' ? 1 : periodo === 'semana' ? 7 : periodo === 'mes' ? 30 : 90;
    
    for (let i = diasPeriodo - 1; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      
      // Generar valores aleatorios dentro de rangos realistas
      const tempBase = 21;
      const humBase = 78;
      
      registros.push({
        fecha: fecha.toISOString().split('T')[0],
        temperatura: {
          promedio: Math.round((tempBase + (Math.random() - 0.5) * 4) * 10) / 10,
          minima: Math.round((tempBase - 2 + Math.random() * 2) * 10) / 10,
          maxima: Math.round((tempBase + 2 + Math.random() * 2) * 10) / 10
        },
        humedad: {
          promedio: Math.round((humBase + (Math.random() - 0.5) * 8) * 10) / 10,
          minima: Math.round((humBase - 4 + Math.random() * 2) * 10) / 10,
          maxima: Math.round((humBase + 4 + Math.random() * 2) * 10) / 10
        },
        alertas: Math.floor(Math.random() * 3),
        riegosRealizados: Math.random() > 0.7 ? 1 : 0
      });
    }
    
    res.json({
      success: true,
      data: registros
    });
  } catch (error) {
    console.error('Error en /api/registros/reportes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== CALENDARIO ENDPOINTS =====

// Obtener calendarios de riego
app.get('/api/calendario', async (req, res) => {
  try {
    const idInvernadero = parseInt(req.query.id_invernadero) || 1;
    const resultado = await calendarioController.obtenerCalendarios(idInvernadero);
    
    res.json({
      success: true,
      data: resultado.calendarios || []
    });
  } catch (error) {
    console.error('Error en /api/calendario:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Crear calendario de riego
app.post('/api/calendario', async (req, res) => {
  try {
    const resultado = await calendarioController.crearCalendario(req.body);
    
    res.json({
      success: resultado.exito,
      data: resultado.calendario || null,
      message: resultado.mensaje || 'Calendario creado exitosamente'
    });
  } catch (error) {
    console.error('Error en POST /api/calendario:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Actualizar calendario de riego
app.put('/api/calendario/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const resultado = await calendarioController.actualizarCalendario(id, req.body);
    
    res.json({
      success: resultado.exito,
      data: resultado.calendario || null,
      message: resultado.mensaje || 'Calendario actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error en PUT /api/calendario:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== NOTIFICACIONES ENDPOINTS =====

// Obtener notificaciones de usuario
app.get('/api/notificaciones', async (req, res) => {
  try {
    const limite = parseInt(req.query.limite) || 20;
    const { obtenerAlertas } = await import('./core/Em_seno.js');
    const resultado = obtenerAlertas(limite);
    
    res.json({
      success: true,
      data: resultado.alertas || [],
      totalNoLeidas: resultado.totalNoLeidas || 0,
      total: resultado.total || 0
    });
  } catch (error) {
    console.error('Error en /api/notificaciones:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Marcar notificación como leída
app.put('/api/notificaciones/:id/leer', async (req, res) => {
  try {
    // En modo simulación, simplemente confirmamos sin hacer nada
    res.json({
      success: true,
      message: 'Notificación marcada como leída (modo simulación)'
    });
  } catch (error) {
    console.error('Error en PUT /api/notificaciones/leer:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== RIEGO ENDPOINTS =====

// Iniciar riego manual
app.post('/api/riego/iniciar', async (req, res) => {
  try {
    const { iniciarRiegoManual } = await import('./core/Em_seno.js');
    const duracion = req.body.duracion; // Opcional: duración en minutos
    const resultado = iniciarRiegoManual(duracion);
    
    res.json({
      success: resultado.success,
      message: resultado.mensaje,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error en POST /api/riego/iniciar:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener estado del riego
app.get('/api/riego/estado', async (req, res) => {
  try {
    const { obtenerEstadoRiego } = await import('./core/Em_seno.js');
    const estado = obtenerEstadoRiego();
    
    res.json({
      success: true,
      data: estado
    });
  } catch (error) {
    console.error('Error en GET /api/riego/estado:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Detener riego
app.post('/api/riego/detener', async (req, res) => {
  try {
    const { detenerRiego } = await import('./core/Em_seno.js');
    const resultado = detenerRiego();
    
    res.json({
      success: resultado.success,
      message: resultado.mensaje
    });
  } catch (error) {
    console.error('Error en POST /api/riego/detener:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener configuración de riego
app.get('/api/riego/configuracion', async (req, res) => {
  try {
    const { obtenerConfiguracionRiego } = await import('./core/Em_seno.js');
    const configuracion = obtenerConfiguracionRiego();
    
    res.json({
      success: true,
      data: configuracion
    });
  } catch (error) {
    console.error('Error en GET /api/riego/configuracion:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Actualizar configuración de riego
app.put('/api/riego/configuracion', async (req, res) => {
  try {
    const { actualizarConfiguracionRiego } = await import('./core/Em_seno.js');
    const resultado = actualizarConfiguracionRiego(req.body);
    
    res.json({
      success: resultado.success,
      data: resultado.configuracion,
      message: 'Configuración actualizada correctamente'
    });
  } catch (error) {
    console.error('Error en PUT /api/riego/configuracion:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Programar riego específico
app.post('/api/riego/programar', async (req, res) => {
  try {
    const { programarRiegoEspecifico } = await import('./core/Em_seno.js');
    const { fecha, hora, duracion } = req.body;
    const resultado = programarRiegoEspecifico(fecha, hora, duracion);
    
    res.json({
      success: resultado.success,
      data: resultado.riego,
      message: resultado.mensaje || 'Riego programado correctamente'
    });
  } catch (error) {
    console.error('Error en POST /api/riego/programar:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener riegos programados
app.get('/api/riego/programados', async (req, res) => {
  try {
    const { obtenerRiegosProgramados } = await import('./core/Em_seno.js');
    const riegos = obtenerRiegosProgramados();
    
    res.json({
      success: true,
      data: riegos
    });
  } catch (error) {
    console.error('Error en GET /api/riego/programados:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Cancelar riego programado
app.delete('/api/riego/programados/:id', async (req, res) => {
  try {
    const { cancelarRiegoProgramado } = await import('./core/Em_seno.js');
    const idRiego = parseInt(req.params.id);
    const resultado = cancelarRiegoProgramado(idRiego);
    
    res.json({
      success: resultado.success,
      message: resultado.mensaje
    });
  } catch (error) {
    console.error('Error en DELETE /api/riego/programados:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== ALERTAS ENDPOINTS =====

// Marcar alerta como leída
app.put('/api/alertas/:id/leer', async (req, res) => {
  try {
    const idAlerta = parseInt(req.params.id);
    const { marcarAlertaComoLeida } = await import('./core/Em_seno.js');
    const resultado = marcarAlertaComoLeida(idAlerta);
    
    res.json({
      success: resultado.success,
      message: resultado.mensaje || 'Alerta marcada como leída'
    });
  } catch (error) {
    console.error('Error en PUT /api/alertas/leer:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Marcar todas las alertas como leídas
app.put('/api/alertas/leer-todas', async (req, res) => {
  try {
    const { marcarTodasAlertasComoLeidas } = await import('./core/Em_seno.js');
    const resultado = marcarTodasAlertasComoLeidas();
    
    res.json({
      success: resultado.success,
      message: resultado.mensaje
    });
  } catch (error) {
    console.error('Error en PUT /api/alertas/leer-todas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Eliminar alerta
app.delete('/api/alertas/:id', async (req, res) => {
  try {
    const idAlerta = parseInt(req.params.id);
    const { eliminarAlerta } = await import('./core/Em_seno.js');
    const resultado = eliminarAlerta(idAlerta);
    
    res.json({
      success: resultado.success,
      message: resultado.mensaje || 'Alerta eliminada'
    });
  } catch (error) {
    console.error('Error en DELETE /api/alertas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =============================================
// RUTA DE HEALTH CHECK
// =============================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    uptime: process.uptime(),
    message: 'OrchidCare Pro está funcionando correctamente'
  });
});

// =============================================
// MANEJO DE ERRORES 404
// =============================================

app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.path
  });
});

// =============================================
// INICIALIZACIÓN DEL SERVIDOR
// =============================================

async function iniciarServidor() {
  try {
    console.log('🌺 ========================================');
    console.log('🌺   ORCHIDCARE PRO - SISTEMA INICIANDO');
    console.log('🌺 ========================================\n');

    // Verificar conexión a la base de datos
    console.log('🔌 Verificando conexión a Supabase...');
    const conexionExitosa = await verificarConexion();
    
    if (!conexionExitosa) {
      console.warn('⚠️  No se pudo conectar a Supabase. Continuando en modo simulación...\n');
    }

    // Iniciar simulación de sensores
    console.log('🔄 Iniciando simulación de sensores...');
    intervaloSimulacion = iniciarSimulacion((lectura) => {
      // Callback opcional para procesar cada lectura
      // console.log(`📊 Lectura: ${lectura.temperatura}°C, ${lectura.humedad}%`);
    });

    // Iniciar registro automático (cada 60 minutos)
    // TODO: Descomentar cuando la tabla registros_sensores esté creada en Supabase
    // console.log('📝 Iniciando registro automático de datos...');
    // intervaloRegistro = iniciarRegistroAutomatico(1, 60);

    // Iniciar servidor Express
    app.listen(PORT, () => {
      console.log('\n✅ Servidor iniciado correctamente');
      console.log(`🌐 Servidor ejecutándose en: http://localhost:${PORT}`);
      console.log(`📊 Dashboard disponible en: http://localhost:${PORT}/dashboard`);
      console.log(`📈 Reportes disponibles en: http://localhost:${PORT}/reportes`);
      console.log('\n🔧 Presiona CTRL+C para detener el servidor\n');
    });

  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

// =============================================
// MANEJO DE CIERRE GRACEFUL
// =============================================

process.on('SIGINT', () => {
  console.log('\n\n🛑 Deteniendo OrchidCare Pro...');
  
  // Detener simulación
  if (intervaloSimulacion) {
    detenerSimulacion(intervaloSimulacion);
  }
  
  // Detener registro automático
  if (intervaloRegistro) {
    detenerRegistroAutomatico(intervaloRegistro);
  }
  
  console.log('👋 Servidor detenido correctamente\n');
  process.exit(0);
});

// =============================================
// INICIAR APLICACIÓN
// =============================================

iniciarServidor();
