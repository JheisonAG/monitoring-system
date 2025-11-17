-- =============================================
-- SISTEMA DE MONITOREO DE ORQUÍDEAS
-- Base de datos PostgreSQL (Supabase) - Adaptado de MariaDB
-- =============================================

-- =============================================
-- CREACIÓN DE TABLAS
-- =============================================

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE
);

-- Tabla de invernaderos
CREATE TABLE IF NOT EXISTS invernaderos (
    id_invernadero SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    ubicacion VARCHAR(200),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

-- Tabla de calendario de riego (RF1)
CREATE TABLE IF NOT EXISTS calendario_riego (
    id_calendario SERIAL PRIMARY KEY,
    id_invernadero INTEGER NOT NULL,
    nombre_configuracion VARCHAR(100) DEFAULT 'Calendario Principal',
    hora_riego TIME NOT NULL,
    duracion_minutos INTEGER NOT NULL DEFAULT 10,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_invernadero) REFERENCES invernaderos(id_invernadero) ON DELETE CASCADE
);

-- Tabla de días del calendario (Normalización 1FN)
CREATE TABLE IF NOT EXISTS calendario_dias (
    id_calendario_dia SERIAL PRIMARY KEY,
    id_calendario INTEGER NOT NULL,
    dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
    activo BOOLEAN DEFAULT TRUE,
    UNIQUE (id_calendario, dia_semana),
    FOREIGN KEY (id_calendario) REFERENCES calendario_riego(id_calendario) ON DELETE CASCADE
);

-- Tabla de riegos ejecutados
CREATE TABLE IF NOT EXISTS riegos_ejecutados (
    id_riego BIGSERIAL PRIMARY KEY,
    id_calendario INTEGER NOT NULL,
    fecha_programada TIMESTAMP NOT NULL,
    fecha_ejecucion TIMESTAMP NULL,
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('PROGRAMADO', 'EJECUTADO', 'CANCELADO', 'ERROR')),
    duracion_real INTEGER NULL,
    observaciones TEXT NULL,
    FOREIGN KEY (id_calendario) REFERENCES calendario_riego(id_calendario) ON DELETE CASCADE
);

-- Tabla de métricas del riego (Normalización 3FN)
CREATE TABLE IF NOT EXISTS riego_metricas (
    id_riego BIGINT PRIMARY KEY,
    temperatura_ambiente DECIMAL(5,2) NULL,
    humedad_ambiente DECIMAL(5,2) NULL,
    cantidad_agua_ml INTEGER NULL,
    FOREIGN KEY (id_riego) REFERENCES riegos_ejecutados(id_riego) ON DELETE CASCADE
);

-- Tabla de notificaciones (RF2)
CREATE TABLE IF NOT EXISTS notificaciones (
    id_notificacion BIGSERIAL PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('RIEGO', 'ALERTA', 'SISTEMA')),
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    prioridad VARCHAR(20) DEFAULT 'MEDIA' CHECK (prioridad IN ('BAJA', 'MEDIA', 'ALTA', 'URGENTE')),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_envio TIMESTAMP NULL
);

-- Tabla de relación notificaciones-usuarios (Normalización 2FN)
CREATE TABLE IF NOT EXISTS notificacion_usuarios (
    id_notificacion BIGINT,
    id_usuario INTEGER,
    leida BOOLEAN DEFAULT FALSE,
    fecha_lectura TIMESTAMP NULL,
    PRIMARY KEY (id_notificacion, id_usuario),
    FOREIGN KEY (id_notificacion) REFERENCES notificaciones(id_notificacion) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

-- Tabla de relación notificaciones-calendarios
CREATE TABLE IF NOT EXISTS notificacion_calendarios (
    id_notificacion BIGINT,
    id_calendario INTEGER,
    PRIMARY KEY (id_notificacion, id_calendario),
    FOREIGN KEY (id_notificacion) REFERENCES notificaciones(id_notificacion) ON DELETE CASCADE,
    FOREIGN KEY (id_calendario) REFERENCES calendario_riego(id_calendario) ON DELETE CASCADE
);

-- Tabla de registros de sensores (RF5, RF6)
CREATE TABLE IF NOT EXISTS registros_sensores (
    id_registro BIGSERIAL PRIMARY KEY,
    id_invernadero INTEGER NOT NULL,
    temperatura DECIMAL(5,2) NOT NULL,
    humedad DECIMAL(5,2) NOT NULL,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_invernadero) REFERENCES invernaderos(id_invernadero) ON DELETE CASCADE
);

-- =============================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =============================================

-- Índices para calendario
CREATE INDEX IF NOT EXISTS idx_calendario_activo ON calendario_riego(activo, id_invernadero);
CREATE INDEX IF NOT EXISTS idx_calendario_hora ON calendario_riego(hora_riego);
CREATE INDEX IF NOT EXISTS idx_calendario_dias_activo ON calendario_dias(activo, dia_semana);

-- Índices para riegos
CREATE INDEX IF NOT EXISTS idx_riegos_fecha ON riegos_ejecutados(fecha_programada);
CREATE INDEX IF NOT EXISTS idx_riegos_estado ON riegos_ejecutados(estado, fecha_ejecucion);
CREATE INDEX IF NOT EXISTS idx_riegos_calendario ON riegos_ejecutados(id_calendario, fecha_programada);

-- Índices para notificaciones
CREATE INDEX IF NOT EXISTS idx_notificaciones_fecha ON notificaciones(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_notificaciones_tipo ON notificaciones(tipo, prioridad);
CREATE INDEX IF NOT EXISTS idx_notif_usuario_leida ON notificacion_usuarios(leida, id_usuario);

-- Índices para registros de sensores
CREATE INDEX IF NOT EXISTS idx_registros_fecha ON registros_sensores(fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_registros_invernadero ON registros_sensores(id_invernadero, fecha_hora DESC);

-- =============================================
-- VISTAS
-- =============================================

-- Vista 1: Calendarios activos básicos
CREATE OR REPLACE VIEW vista_calendarios_activos AS
SELECT 
    cr.id_calendario,
    cr.nombre_configuracion,
    i.nombre as invernadero,
    i.id_invernadero,
    u.id_usuario,
    u.nombre as usuario,
    cr.hora_riego,
    cr.duracion_minutos
FROM calendario_riego cr
JOIN invernaderos i ON cr.id_invernadero = i.id_invernadero
JOIN usuarios u ON i.id_usuario = u.id_usuario
WHERE cr.activo = TRUE;

-- Vista 2: Días de calendario
CREATE OR REPLACE VIEW vista_calendario_dias AS
SELECT 
    cd.id_calendario,
    cd.dia_semana,
    CASE cd.dia_semana
        WHEN 1 THEN 'Domingo'
        WHEN 2 THEN 'Lunes'
        WHEN 3 THEN 'Martes'
        WHEN 4 THEN 'Miércoles'
        WHEN 5 THEN 'Jueves'
        WHEN 6 THEN 'Viernes'
        WHEN 7 THEN 'Sábado'
    END as dia_nombre
FROM calendario_dias cd
WHERE cd.activo = TRUE;

-- Vista 3: Notificaciones no leídas
CREATE OR REPLACE VIEW vista_notificaciones_pendientes AS
SELECT 
    n.id_notificacion,
    n.titulo,
    n.mensaje,
    n.prioridad,
    n.fecha_creacion,
    u.id_usuario,
    u.nombre as usuario
FROM notificaciones n
JOIN notificacion_usuarios nu ON n.id_notificacion = nu.id_notificacion
JOIN usuarios u ON nu.id_usuario = u.id_usuario
WHERE nu.leida = FALSE;

-- Vista 4: Riegos de hoy
CREATE OR REPLACE VIEW vista_riegos_hoy AS
SELECT 
    cr.id_calendario,
    i.nombre as invernadero,
    cr.hora_riego,
    cd.dia_semana
FROM calendario_riego cr
JOIN invernaderos i ON cr.id_invernadero = i.id_invernadero
JOIN calendario_dias cd ON cr.id_calendario = cd.id_calendario
WHERE cr.activo = TRUE 
AND cd.activo = TRUE
AND cd.dia_semana = EXTRACT(DOW FROM CURRENT_DATE) + 1;

-- Vista 5: Estadísticas de sensores por invernadero
CREATE OR REPLACE VIEW vista_estadisticas_sensores AS
SELECT 
    i.id_invernadero,
    i.nombre as invernadero,
    COUNT(rs.id_registro) as total_registros,
    AVG(rs.temperatura) as temperatura_promedio,
    MIN(rs.temperatura) as temperatura_minima,
    MAX(rs.temperatura) as temperatura_maxima,
    AVG(rs.humedad) as humedad_promedio,
    MIN(rs.humedad) as humedad_minima,
    MAX(rs.humedad) as humedad_maxima,
    MAX(rs.fecha_hora) as ultima_lectura
FROM invernaderos i
LEFT JOIN registros_sensores rs ON i.id_invernadero = rs.id_invernadero
WHERE rs.fecha_hora >= CURRENT_DATE
GROUP BY i.id_invernadero, i.nombre;

-- =============================================
-- FUNCIÓN: Obtener estado del sistema
-- =============================================
CREATE OR REPLACE FUNCTION obtener_estado_sistema(p_id_invernadero INTEGER)
RETURNS TABLE (
    total_registros_hoy BIGINT,
    temperatura_actual DECIMAL(5,2),
    humedad_actual DECIMAL(5,2),
    calendarios_activos BIGINT,
    notificaciones_pendientes BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM registros_sensores 
         WHERE id_invernadero = p_id_invernadero 
         AND fecha_hora >= CURRENT_DATE),
        (SELECT temperatura FROM registros_sensores 
         WHERE id_invernadero = p_id_invernadero 
         ORDER BY fecha_hora DESC LIMIT 1),
        (SELECT humedad FROM registros_sensores 
         WHERE id_invernadero = p_id_invernadero 
         ORDER BY fecha_hora DESC LIMIT 1),
        (SELECT COUNT(*) FROM calendario_riego 
         WHERE id_invernadero = p_id_invernadero 
         AND activo = TRUE),
        (SELECT COUNT(*) FROM notificaciones n
         JOIN notificacion_usuarios nu ON n.id_notificacion = nu.id_notificacion
         JOIN invernaderos i ON i.id_usuario = nu.id_usuario
         WHERE i.id_invernadero = p_id_invernadero
         AND nu.leida = FALSE);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- DATOS DE PRUEBA
-- =============================================

-- Usuarios de prueba
INSERT INTO usuarios (nombre, email, password_hash) VALUES 
('Juan Pérez', 'juan@orquideas.com', 'hash_juan_123'),
('María García', 'maria@orquideas.com', 'hash_maria_456')
ON CONFLICT (email) DO NOTHING;

-- Invernaderos de prueba
INSERT INTO invernaderos (id_usuario, nombre, ubicacion) VALUES 
(1, 'Invernadero Principal', 'Zona Norte, Sector A'),
(1, 'Invernadero Secundario', 'Zona Sur, Camino 123'),
(2, 'Invernadero María', 'Zona Este, Lote 5')
ON CONFLICT DO NOTHING;

-- Calendarios de riego
INSERT INTO calendario_riego (id_invernadero, hora_riego, duracion_minutos) VALUES 
(1, '08:00:00', 15),
(1, '16:30:00', 10),
(2, '09:00:00', 20),
(3, '07:30:00', 12)
ON CONFLICT DO NOTHING;

-- Días de la semana (1=Domingo, 2=Lunes, ..., 7=Sábado)
INSERT INTO calendario_dias (id_calendario, dia_semana) VALUES 
(1, 2), (1, 4), (1, 6),  -- Lunes, Miércoles, Viernes
(2, 1), (2, 3), (2, 5),  -- Domingo, Martes, Jueves
(3, 2), (3, 3), (3, 4), (3, 5), (3, 6),  -- Lunes a Viernes
(4, 7)  -- Sábado
ON CONFLICT (id_calendario, dia_semana) DO NOTHING;

-- Notificaciones
INSERT INTO notificaciones (tipo, titulo, mensaje, prioridad, fecha_envio) VALUES 
('RIEGO', 'Recordatorio de Riego', 'Es hora de regar el Invernadero Principal', 'MEDIA', CURRENT_TIMESTAMP),
('ALERTA', 'Humedad Baja', 'La humedad está por debajo del 75%', 'ALTA', CURRENT_TIMESTAMP),
('SISTEMA', 'Sistema Actualizado', 'El sistema se ha actualizado correctamente', 'BAJA', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS en tablas principales
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE invernaderos ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendario_riego ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_sensores ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad (ejemplos básicos)
-- Los usuarios solo pueden ver sus propios datos

CREATE POLICY usuarios_select_own ON usuarios
    FOR SELECT
    USING (auth.uid()::text = id_usuario::text);

CREATE POLICY invernaderos_select_own ON invernaderos
    FOR SELECT
    USING (id_usuario IN (SELECT id_usuario FROM usuarios WHERE auth.uid()::text = id_usuario::text));

-- =============================================
-- COMENTARIOS EN TABLAS
-- =============================================

COMMENT ON TABLE calendario_riego IS 'RF1: Almacena la configuración de calendarios de riego';
COMMENT ON TABLE notificaciones IS 'RF2: Gestiona las notificaciones del sistema';
COMMENT ON TABLE registros_sensores IS 'RF5, RF6: Registro histórico de condiciones ambientales';

-- =============================================
-- FIN DEL SCRIPT
-- =============================================
