# Endpoints / funciones que escriben en Supabase

A continuación se listan las rutas, controladores y funciones del workspace que realizan operaciones de escritura (INSERT / UPDATE / DELETE) contra Supabase, junto con las tablas afectadas y enlaces a los archivos/símbolos relevantes.

---

## Endpoints expuestos (index.js -> controlador)
- POST /api/calendario  
  - Controlador: [`calendarioController.crearCalendario`](features/controller/calendarioController.js) — [features/controller/calendarioController.js](features/controller/calendarioController.js)  
  - Tablas afectadas: `calendario_riego`, `calendario_dias` (INSERT)  
- PUT /api/calendario/:id  
  - Controlador: [`calendarioController.actualizarCalendario`](features/controller/calendarioController.js) — [features/controller/calendarioController.js](features/controller/calendarioController.js)  
  - Tablas afectadas: `calendario_riego` (UPDATE), `calendario_dias` (DELETE + INSERT al reemplazar días)  
- DELETE /api/calendario/:id  
  - Controlador: [`calendarioController.eliminarCalendario`](features/controller/calendarioController.js) — [features/controller/calendarioController.js](features/controller/calendarioController.js)  
  - Tablas afectadas: `calendario_riego` (soft delete: UPDATE campo `activo`)  

Nota: Las rutas anteriores están declaradas en [index.js](index.js) y delegan a los controladores citados.

---

## Funciones / controladores que realizan escrituras (pueden ser llamadas desde endpoints o tareas internas)
- [`registroController.guardarRegistro`](features/controller/registroController.js) — [features/controller/registroController.js](features/controller/registroController.js)  
  - Inserta en: `registros_sensores` (INSERT).  
  - Observación: no se muestra explícitamente un POST `/api/registros` en los excerpts, pero la función existe y realiza la inserción.

- [`calendarioController.crearCalendario`](features/controller/calendarioController.js) — [features/controller/calendarioController.js](features/controller/calendarioController.js)  
  - Inserta en: `calendario_riego`, `calendario_dias`.

- [`notificacionController.crearNotificacion`](features/controller/notificacionController.js) — [features/controller/notificacionController.js](features/controller/notificacionController.js)  
  - Inserta en: `notificaciones`, `notificacion_usuarios`, y (desde otras funciones) `notificacion_calendarios`.  
  - Uso: llamada desde funciones de verificación (p. ej. [`notificacionController.verificarNotificacionesRiego`](features/controller/notificacionController.js) — [features/controller/notificacionController.js](features/controller/notificacionController.js)), que pueden ejecutarse periódicamente.

- [`notificacionController.marcarComoLeida`](features/controller/notificacionController.js) — [features/controller/notificacionController.js](features/controller/notificacionController.js)  
  - Actualiza: `notificacion_usuarios` (UPDATE: `leida`, `fecha_lectura`).

- [`notificacionController.verificarNotificacionesRiego`](features/controller/notificacionController.js) — [features/controller/notificacionController.js](features/controller/notificacionController.js)  
  - Llama a `crearNotificacion` y también inserta asociaciones en `notificacion_calendarios`.

- [`core/Em_seno.actualizarSensores`](core/Em_seno.js) — [core/Em_seno.js](core/Em_seno.js)  
  - Inserta en: `registros_sensores` durante la simulación (INSERT).  
  - Esta función se ejecuta por la simulación (iniciada en `iniciarSimulacion`) y por lo tanto realiza escrituras periódicas en Supabase si está configurado.

---

## Cliente DB utilizado
- Cliente: [`supabaseClient`](core/DB_connections.js) — [core/DB_connections.js](core/DB_connections.js)  
  - Todas las operaciones `.from(...).insert(...)`, `.update(...)`, `.delete(...)` en los archivos anteriores utilizan este cliente.

---

## Recomendaciones rápidas
- Revisar qué rutas realmente exponen las funciones de escritura (p.ej. `guardarRegistro`) en [index.js](index.js) y unificarlas si hay duplicidad entre modos simulación / producción.  
- Añadir logs y validaciones en las funciones que realizan INSERT/UPDATE para asegurar shape de datos (ej.: `registros_sensores`, `notificaciones`, `calendario_dias`).  
- Documentar el contrato JSON esperado por cada endpoint que escribe en DB.

---

Archivos/símbolos referenciados:
- [`calendarioController.crearCalendario`](features/controller/calendarioController.js) — [features/controller/calendarioController.js](features/controller/calendarioController.js)  
- [`calendarioController.actualizarCalendario`](features/controller/calendarioController.js) — [features/controller/calendarioController.js](features/controller/calendarioController.js)  
- [`calendarioController.eliminarCalendario`](features/controller/calendarioController.js) — [features/controller/calendarioController.js](features/controller/calendarioController.js)  
- [`registroController.guardarRegistro`](features/controller/registroController.js) — [features/controller/registroController.js](features/controller/registroController.js)  
- [`notificacionController.crearNotificacion`](features/controller/notificacionController.js) — [features/controller/notificacionController.js](features/controller/notificacionController.js)  
- [`notificacionController.verificarNotificacionesRiego`](features/controller/notificacionController.js) — [features/controller/notificacionController.js](features/controller/notificacionController.js)  
- [`notificacionController.marcarComoLeida`](features/controller/notificacionController.js) — [features/controller/notificacionController.js](features/controller/notificacionController.js)  
- [`core/Em_seno.actualizarSensores`](core/Em_seno.js) — [core/Em_seno.js](core/Em_seno.js)  
- Cliente DB: [`supabaseClient`](core/DB_connections.js) — [core/DB_connections.js](core/DB_connections.js)