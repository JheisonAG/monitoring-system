# OrchidCare Pro - Sistema de Monitoreo de Orquídeas

## 📋 Descripción
Sistema web para monitoreo de cultivo de orquídeas en invernaderos con control de temperatura, humedad y calendario de riego automatizado.

## 🏗️ Estructura del Proyecto

```
orchid_care_pro/
│
├── core/                        # Núcleo del sistema
│   ├── DB_connections.js        # Conexión a Supabase
│   └── Em_seno.js               # Simulación de sensores
│
├── features/                    # Funcionalidades principales
│   ├── domain/                  # Lógica de negocio
│   │   ├── CalendarioRiegoDomain.js
│   │   ├── NotificacionDomain.js
│   │   └── RegistroSensorDomain.js
│   ├── view/                    # Lógica de presentación
│   │   ├── DashboardView.js
│   │   └── ReportesView.js
│   └── controller/              # Controladores
│       ├── dashboardController.js
│       ├── calendarioController.js
│       ├── notificacionController.js
│       └── registroController.js
│
├── models/                      # Modelos de datos
│   ├── Usuario.js
│   ├── Invernadero.js
│   ├── CalendarioRiego.js
│   ├── Notificacion.js
│   └── RegistroSensor.js
│
├── utils/                       # Utilidades
│   ├── dateFormatter.js
│   └── validator.js
│
├── views/                       # Vistas HTML
│   ├── dashboard.html
│   └── reportes.html
│
├── schema_supabase.sql          # Script de base de datos PostgreSQL
├── index.js                     # Servidor Express
├── package.json                 # Dependencias
├── .env.example                 # Plantilla de variables de entorno
└── firebase.json                # Configuración de Firebase Hosting
```

## 🚀 Instalación

1. **Clonar el repositorio**
```bash
cd orchid_care_pro
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
```

Editar `.env` y agregar credenciales de Supabase:
```
SUPABASE_URL=tu_url_de_supabase
SUPABASE_KEY=tu_clave_publica
PORT=3000
```

4. **Crear base de datos**
- Ir a Supabase → SQL Editor
- Ejecutar el script `schema_supabase.sql`

5. **Iniciar servidor**
```bash
npm start
```

6. **Abrir en navegador**
```
http://localhost:3000
```

## 📦 Tecnologías

- **Backend**: Node.js + Express
- **Base de Datos**: PostgreSQL (Supabase)
- **Hosting**: Firebase
- **Frontend**: HTML5, CSS3, JavaScript ES6+

## 🎯 Requerimientos Funcionales

- **RF1**: Calendario de riego programable
- **RF2**: Notificaciones de hora de riego
- **RF3**: Integración de sensores (Bluetooth/Wi-Fi)
- **RF4**: Monitoreo de nivel de humedad
- **RF5**: Registro histórico de condiciones
- **RF6**: Base de datos para almacenamiento
- **RF7**: Visualización de datos en tiempo real

## 📊 Condiciones Óptimas

- **Temperatura**: 18-24°C
- **Humedad Relativa**: 75-82%

## 🔧 Desarrollo

El sistema actualmente usa datos simulados. Para integrar sensores reales, modificar `core/Em_seno.js` siguiendo los comentarios TODO en el código.

## 📝 Notas

- Los controladores usan la arquitectura MVC separando lógica de negocio (domain), presentación (view) y coordinación (controller)
- Todos los archivos están comentados con explicaciones detalladas
- El sistema incluye validaciones y manejo de errores

---

**Desarrollado para el monitoreo de orquídeas en invernaderos** 🌺
