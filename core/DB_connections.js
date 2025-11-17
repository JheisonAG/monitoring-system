// =============================================
// GESTIÓN DE CONEXIONES A LA BASE DE DATOS
// =============================================

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import postgres from 'postgres'

// Cargar variables de entorno
dotenv.config();

// =============================================
// CONFIGURACIÓN DE SUPABASE
// =============================================

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const connectionString = process.env.DATABASE_URL
const sql = postgres(connectionString)

// Validar que las variables de entorno estén configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Advertencia: Faltan las credenciales de Supabase en el archivo .env');
  console.warn('El sistema funcionará en modo simulación sin base de datos');
}

// =============================================
// CLIENTE DE SUPABASE - Cliente público
// =============================================
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
export const supabaseClient = supabase; // Alias para compatibilidad
export const supabaseAdmin = supabase; // Usar el mismo cliente

// =============================================
// FUNCIÓN: Verificar conexión a la base de datos
// =============================================
export async function verificarConexion() {
  if (!supabase) {
    console.log('Modo simulación: Base de datos no configurada');
    return false;
  }
  
  try {
    const { data, error } = await supabase
      .from('registros_sensores')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Error al conectar con Supabase:', error.message);
      return false;
    }

    console.log('Conexión exitosa con Supabase');
    return true;
  } catch (error) {
    console.error('Error al verificar la conexión:', error);
    return false;
  }
}

// =============================================
// FUNCIÓN: Obtener estadísticas de conexión
// =============================================
export async function obtenerEstadisticasDB() {
  try {
    const estadisticas = {
      registros: 0
    };

    // Contar registros de sensores
    const { count: countRegistros } = await supabase
      .from('registros_sensores')
      .select('*', { count: 'exact', head: true });
    estadisticas.registros = countRegistros || 0;

    return estadisticas;
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return null;
  }
}

// =============================================
// EXPORTACIONES POR DEFECTO
// =============================================
// EXPORTACIONES POR DEFECTO
// =============================================
export default {
  sql,
  supabase,
  supabaseAdmin,
  verificarConexion,
  obtenerEstadisticasDB
};
