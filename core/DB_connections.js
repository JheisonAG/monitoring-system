// =============================================
// GESTIÓN DE CONEXIONES A LA BASE DE DATOS
// =============================================

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// =============================================
// CONFIGURACIÓN DE SUPABASE
// =============================================

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Validar que las variables de entorno estén configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Advertencia: Faltan las credenciales de Supabase en el archivo .env');
  console.warn('⚠️ El sistema funcionará en modo simulación sin base de datos');
}

// =============================================
// CLIENTE DE SUPABASE - Cliente público (para frontend)
// =============================================
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
export const supabaseClient = supabase; // Alias para compatibilidad

// =============================================
// CLIENTE DE SUPABASE - Cliente con privilegios de servicio (para backend)
// =============================================
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// =============================================
// FUNCIÓN: Verificar conexión a la base de datos
// =============================================
export async function verificarConexion() {
  if (!supabase) {
    console.log('ℹ️ Modo simulación: Base de datos no configurada');
    return false;
  }
  
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Error al conectar con Supabase:', error.message);
      return false;
    }

    console.log('✅ Conexión exitosa con Supabase');
    return true;
  } catch (error) {
    console.error('❌ Error al verificar la conexión:', error);
    return false;
  }
}

// =============================================
// FUNCIÓN: Obtener estadísticas de conexión
// =============================================
export async function obtenerEstadisticasDB() {
  try {
    const estadisticas = {
      usuarios: 0,
      invernaderos: 0,
      sensores: 0,
      registros: 0
    };

    // Contar usuarios
    const { count: countUsuarios } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true });
    estadisticas.usuarios = countUsuarios || 0;

    // Contar invernaderos
    const { count: countInvernaderos } = await supabase
      .from('invernaderos')
      .select('*', { count: 'exact', head: true });
    estadisticas.invernaderos = countInvernaderos || 0;

    // Contar registros de riego
    const { count: countRegistros } = await supabase
      .from('riegos_ejecutados')
      .select('*', { count: 'exact', head: true });
    estadisticas.registros = countRegistros || 0;

    return estadisticas;
  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
    return null;
  }
}

// =============================================
// EXPORTACIONES POR DEFECTO
// =============================================
export default {
  supabase,
  supabaseAdmin,
  verificarConexion,
  obtenerEstadisticasDB
};
