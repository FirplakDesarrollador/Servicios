# 🛁 FIRPLAK Servicios & Indicadores MAC

Sistema integral de gestión de servicios postventa, atención al cliente (MAC), agenda técnica e inteligencia de negocios de **FIRPLAK S.A.** Desarrollado con **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS v4**, **Supabase** y conectado en tiempo real con **SAP Business One Service Layer** y **WhatsApp Cloud API**.

---

## 📌 Tabla de Contenido
1. [Visión General](#-visión-general)
2. [Ecosistema de Módulos](#-ecosistema-de-módulos)
   - [1. Indicadores MAC (Business Intelligence)](#1-indicadores-mac-business-intelligence)
   - [2. Gestión de Solicitudes y Servicios](#2-gestión-de-solicitudes-y-servicios)
   - [3. Agenda Técnica y Operaciones de Campo](#3-agenda-técnica-y-operaciones-de-campo)
   - [4. Flujos de Aprobaciones y Exhibiciones](#4-flujos-de-aprobaciones-y-exhibiciones)
   - [5. Integración con WhatsApp Cloud API](#5-integración-con-whatsapp-cloud-api)
   - [6. Integración con SAP Business One](#6-integración-con-sap-business-one)
3. [Reglas de Negocio Críticas](#-reglas-de-negocio-críticas)
4. [Stack Tecnológico](#-stack-tecnológico)
5. [Estructura del Proyecto](#-estructura-del-proyecto)
6. [Variables de Entorno (.env)](#-variables-de-entorno-env)
7. [Instalación y Puesta en Marcha](#-instalación-y-puesta-en-marcha)
8. [Estrategia de Ramas y Despliegue](#-estrategia-de-ramas-y-despliegue)

---

## 🔭 Visión General

**FIRPLAK Servicios** centraliza la atención de novedades, garantías, quejas y requerimientos postventa de los clientes de Firplak. La plataforma ofrece dos experiencias unificadas:
* **Portal Interno (Colaboradores Firplak / MAC / Operaciones):** Tableros de control analítico, radicación de servicios, asignación de técnicos, mapa de relaciones de pedidos SAP, gestión documental y seguimiento de costos de calidad.
* **Portal Clientes / Formulario Público:** Acceso seguro para distribuidores, constructoras y clientes finales para consultar el estado de sus trámites o radicar nuevas solicitudes sin fricción.

---

## 🧩 Ecosistema de Módulos

### 1. Indicadores MAC (Business Intelligence)
Ruta: `/indicadores-mac`
Centro de mando analítico para la Mesa de Atención al Cliente (MAC):
* **General MAC:**
  * **Tarjetas KPI Compactas:** Participación por **Mercados** (*Nacional* e *Internacional*) y por **Canales de Venta** (*Distribución*, *Constructor*, *Canal Propio*) con barras proporcionales y métricas de registros, unidades e inversión.
  * **Tooltips Inteligentes:** Despliegue adaptable (hacia abajo o hacia arriba según el espacio disponible en pantalla) con desglose completo por canal y mercado sin cortes.
  * **Filtros Cruzados Interactivos:** Al hacer clic en un mercado o canal de venta, todo el dashboard se recalcula dinámicamente.
  * **Métricas Globales:** Total de radicados, valor invertido, casos abiertos vs. cerrados, promedio mensual y distribución temporal por mes de creación.
  * **Gráficas de Análisis:** Tipo de problemas, áreas responsables, plantas de fabricación y familias de producto.
* **Detalle MAC:** Tabla granular de radicados con búsqueda rápida, filtros multicriterio, estado de cierre y exportación completa a Excel.
* **Agentes MAC:** Métricas de rendimiento, tiempos de respuesta y carga de trabajo individual de los agentes de servicio.
* **Informe MAC:** Resumen formal gerencial que cruza costos de servicio e inversión MAC contra las ventas totales del período por canal.
* **Análisis MAC & QRR:** Profundización en Quejas, Reclamos y Requerimientos con matrices de causa-raíz y severidad.

### 2. Gestión de Solicitudes y Servicios
* **Solicitar Servicio (`/solicitar-servicio` & `/solicitud-pedido-cliente`):** Creación de casos con carga de evidencias (fotos/videos), identificación de producto y cliente.
* **Servicios Abiertos (`/servicios-abiertos` & `/servicios-abiertos-clientes`):** Bandeja operativa de casos en curso con estados, asignación técnica, modales para edición de productos, condebe y distribuidor.
* **Servicios Cerrados (`/servicios-cerrados`):** Consulta histórica de casos resueltos con actas de servicio generadas en PDF.
* **Formulario Cliente (`/formulario-cliente`):** Enlace público compartible para clientes finales.

### 3. Agenda Técnica y Operaciones de Campo
* **Mi Agenda (`/mi-agenda`):** Vista de calendario interactivo para cada técnico de servicio.
* **Agenda Técnicos (`/agenda-tecnicos`):** Panel de despacho para programar citas, rutas y disponibilidad del equipo operativo.

### 4. Flujos de Aprobaciones y Exhibiciones
* **Aprobaciones (`/aprobaciones`):** Bandeja de autorizaciones para reposiciones de producto, notas crédito y costos extraordinarios.
* **Exhibiciones (`/exhibiciones`):** Seguimiento y auditoría de salas de exhibición de distribuidores comerciales.

### 5. Integración con WhatsApp Cloud API
Rutas: `/api/whatsapp/*` y `/whatsapp`
* **Webhooks bidireccionales:** Recepción y procesamiento en tiempo real de mensajes de WhatsApp de clientes.
* **Envío de Plantillas y Multimedia:** Notificación automática del estado del radicado y envío de evidencias o actas en PDF.
* **Asignación automática:** Enrutamiento de conversaciones hacia agentes MAC activos.

### 6. Integración con SAP Business One
Rutas: `/api/sap/*` y `/consultas-sap`
* Conexión directa mediante **SAP Service Layer** (REST API) y consultas SQL analíticas sobre base de datos SAP HANA / SQL Server:
  * Mapa de relaciones de pedidos (`ORDR`), cotizaciones (`OQUT`) y entregas (`ODLN`).
  * Consulta de listas de materiales (`LDM`) y órdenes de fabricación (`OWOR`).
  * Datos maestros de artículos (`OITM`), clientes (`OCRD`) y centros de costos.

---

## ⚖️ Reglas de Negocio Críticas

> [!IMPORTANT]
> Estas directrices deben respetarse en cualquier desarrollo o modificación sobre el módulo MAC:

1. **Regla de Cierre de Radicados:**
   * **Fecha real y oficial de cierre:** Únicamente el campo **`Fecha de Verificación`** (`fecha_verificacion`).
   * **Casos Abiertos:** Si `Fecha de Verificación` está vacío (`NULL`).
   * **Casos Cerrados:** Si `Fecha de Verificación` contiene una fecha válida.
2. **Jerarquía de Fechas:**
   1. `Fecha de Creación`: Para conteo inicial y asignación de presupuesto mensual.
   2. `Fecha Objetivo de Cierre`: Para mes presupuestado y proyección operativa.
   3. `Fecha de Verificación`: Única fecha válida para contabilizar cierres reales y SLA.
3. **TypeScript & Calidad de Código:**
   * **Propiedad en `RegistroMAC`:** **NUNCA** usar `fecha_cierre` al interactuar con el tipo `RegistroMAC` (la propiedad oficial es `fecha_verificacion`).
   * **Tipado de Arrays en Hooks:** Siempre tipar explícitamente arrays vacíos (e.g. `const res: any[] = [];`) para evitar fallos de compilación estricta en Vercel (`Variable implicitly has an 'any[]' type`).

---

## 💻 Stack Tecnológico

| Capa | Tecnología |
| :--- | :--- |
| **Framework Web** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack / Webpack) |
| **Librería UI** | [React 19](https://react.dev/) |
| **Lenguaje** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Estilos** | [Tailwind CSS v4](https://tailwindcss.com/) & Vanilla CSS |
| **Animaciones & Iconos** | [Framer Motion](https://www.framer.com/motion/) & [Lucide React](https://lucide.dev/) |
| **Visualización de Datos** | [Recharts](https://recharts.org/) |
| **Calendario** | [React Big Calendar](https://github.com/jquense/react-big-calendar) |
| **Generación de Reportes** | [XLSX (SheetJS)](https://sheetjs.com/) & [html2pdf.js](https://ekoopmans.github.io/html2pdf.js/) |
| **Base de Datos & Auth** | [Supabase](https://supabase.com/) (PostgreSQL, Storage, RLS, Edge Functions) |
| **ERP** | [SAP Business One Service Layer](https://help.sap.com/) & Microsoft SQL Server (`mssql`) |
| **Mensajería** | [Meta WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api) |

---

## 📁 Estructura del Proyecto

```text
├── .agents/                      # Configuración de agentes, reglas globales y skills (SAP, MAC)
├── public/                       # Activos estáticos (logos, fuentes, favicon)
├── src/
│   ├── app/                      # Rutas de Next.js (App Router)
│   │   ├── api/                  # Endpoints Backend (Route Handlers)
│   │   │   ├── cron/             # Tareas programadas (sync-ventas, sync-productos)
│   │   │   ├── sap/              # Endpoints SAP (relationship-map, ldm-costos, items, etc.)
│   │   │   └── whatsapp/         # Webhook y envío de mensajes WhatsApp Cloud API
│   │   ├── agenda-tecnicos/      # Gestión de agenda técnica global
│   │   ├── aprobaciones/         # Módulo de autorizaciones y garantías
│   │   ├── base-de-datos/        # Administración de catálogos y maestros
│   │   ├── bi/                   # Tableros de inteligencia de negocios
│   │   ├── configuracion/        # Ajustes de sistema y permisos de rol
│   │   ├── consultas-sap/        # Explorador de consultas y órdenes SAP
│   │   ├── formulario-cliente/   # Formulario web público para clientes externos
│   │   ├── indicadores-mac/      # Centro de Inteligencia de Negocios MAC
│   │   │   ├── components/       # Filtros, modales y barras de control
│   │   │   ├── tabs/             # Pestañas (GeneralMac, DetalleMac, AgentesMac, InformeMac, etc.)
│   │   │   ├── types.ts          # Interfaces de tipado MAC (RegistroMAC, FilterState)
│   │   │   └── utils/            # Normalización de canales, mercados y métricas
│   │   ├── mi-agenda/            # Vista individual del técnico
│   │   ├── servicios-abiertos/   # Bandeja de radicados en gestión
│   │   ├── servicios-cerrados/   # Archivo de radicados finalizados
│   │   ├── solicitar-servicio/   # Formulario interno de radicación
│   │   ├── solicitudes-clientes/ # Bandeja de solicitudes entrantes de clientes
│   │   ├── whatsapp/             # Bandeja de chat y mensajería
│   │   ├── layout.tsx            # Layout raíz de la aplicación
│   │   └── page.tsx              # Página de inicio / Menú principal con control de accesos
│   ├── components/               # Componentes UI reutilizables (Modales, Tablas, Forms)
│   ├── lib/                      # Clientes y utilidades centrales
│   │   ├── apiSap.ts             # Cliente de integración SAP REST
│   │   ├── dateUtils.ts          # Normalización y cálculo de fechas y horas hábiles
│   │   ├── pdfGenerator.ts       # Generación de actas e informes técnicos en PDF
│   │   ├── sap.ts                # Conexión directa a SQL Server SAP
│   │   ├── sapServiceLayer.ts    # Conexión a SAP Service Layer (B1S v1)
│   │   ├── supabase.ts           # Cliente público de Supabase
│   │   ├── supabaseAdmin.ts      # Cliente administrativo con Service Role
│   │   └── whatsappAssignment.ts # Algoritmo de asignación de chats
│   └── types/                    # Tipos globales TypeScript y modelos de Supabase
├── package.json                  # Dependencias y scripts del proyecto
├── tsconfig.json                 # Configuración estricta de TypeScript
└── README.md                     # Documentación general del sistema
```

---

## 🔑 Variables de Entorno (.env)

Crea un archivo `.env` en la raíz del proyecto basado en las siguientes variables:

```env
# -----------------------------------------------------------------------------
# SUPABASE CONFIGURATION
# -----------------------------------------------------------------------------
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# -----------------------------------------------------------------------------
# SAP BUSINESS ONE SERVICE LAYER
# -----------------------------------------------------------------------------
SAP_BASE_URL=https://<ip-o-dominio-sap>:50000/b1s/v1
SAP_COMPANY_DB=Firplak_SA
SAP_USERNAME=manager
SAP_PASSWORD=tu_password_sap

# -----------------------------------------------------------------------------
# API SAP COMPLEMENTARIA (Opcional si aplica)
# -----------------------------------------------------------------------------
API_SAP_URL=https://api.firplak.com/sap
API_SAP_KEY=tu_api_key

# -----------------------------------------------------------------------------
# WHATSAPP CLOUD API (META)
# -----------------------------------------------------------------------------
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_PERMANENT_TOKEN=EAAB...
WHATSAPP_WEBHOOK_VERIFY_TOKEN=token_verificacion_seguro_firplak

# -----------------------------------------------------------------------------
# CRON JOBS / TAREAS PROGRAMADAS
# -----------------------------------------------------------------------------
CRON_SECRET=tu_secreto_para_cron_jobs
```

---

## 🚀 Instalación y Puesta en Marcha

### Requisitos Previos
* **Node.js** 20.x o superior.
* **npm**, **pnpm** o **yarn**.
* Acceso a la instancia de **Supabase** y a la red corporativa de **SAP B1**.

### 1. Clonar el Repositorio
```bash
git clone https://github.com/FirplakDesarrollador/Servicios.git
cd Servicios
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Ejecutar en Modo Desarrollo
```bash
npm run dev
```
La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

### 4. Validar Tipado y Compilación
Antes de enviar cambios o desplegar a producción:
```bash
npx tsc --noEmit
npm run build
```

---

## 🌿 Estrategia de Ramas y Despliegue

* **`mayerly`**: Rama principal de trabajo y validación de funcionalidades activas.
* **`main`**: Rama de producción conectada a despliegue automático en **Vercel**.
* **Flujo habitual de sincronización:**
  ```powershell
  # 1. Comitear y subir a la rama de trabajo
  git add .
  git commit -m "Descripción clara del cambio"
  git push origin mayerly

  # 2. Fusionar a main para desplegar
  git checkout main
  git merge mayerly
  git push origin main
  git checkout mayerly
  ```

---

## 🏢 Créditos y Mantenimiento
Desarrollado y mantenido por el equipo de tecnología y desarrollo de **FIRPLAK S.A.** &copy; 2026. Todos los derechos reservados.
