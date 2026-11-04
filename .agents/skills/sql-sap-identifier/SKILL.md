---
name: sql-sap-identifier
description: >-
  Identifica consultas SQL de SAP B1 (OWOR, OITM, ORDR, tablas @FIR_) dentro de la aplicación Manufactura,
  mapeándolas con sus rutas de API backend en Next.js (/app/api/sap/...) y con sus endpoints en SAP Service Layer (/SQLQueries).
---

# Skill: SQL SAP Identifier para Manufactura

Esta habilidad le permite al asistente reconocer inmediatamente cualquier consulta T-SQL de SAP B1 compartida por el usuario (consultas sobre `OWOR`, `OITM`, `OCRD`, `ORDR`, `WOR1`, `@FIR_FAM_SYMPH`, `@FIR_AMORTIGUADORES`, `@FIR_FECHAS_PROD`, etc.) y correlacionarla con la arquitectura de la aplicación **Manufactura**.

---

## 🎯 Procedimiento de Identificación

Cuando el usuario comparta una consulta SQL de SAP:

### 1. Análisis de la Consulta SQL
- Identificar las tablas principales de la consulta:
  - `OWOR`: Órdenes de fabricación / producción.
  - `OITM`: Maestro de artículos y moldes.
  - `ORDR` / `OCRD`: Pedidos de venta y Socios de negocio.
  - `@FIR_FAM_SYMPH` / `@FIR_AMORTIGUADORES` / `@FIR_FECHAS_PROD`: Reglas de amortiguación de días hábiles y programación de planta.

### 2. Mapeo en la Aplicación Manufactura
- **Endpoint Next.js (Backend local):**
  - Ubicación: `app/api/sap/ordenes-liberadas/route.ts`
  - URL local: `http://localhost:3000/api/sap/ordenes-liberadas`
- **Endpoint SAP Service Layer (OData):**
  - Registro OData: `SQLQueries('ordenes_marmol_sl136')/List`
  - URL HTTPS: `https://200.7.96.194:50000/b1s/v1/SQLQueries('ordenes_marmol_sl136')/List`
  - Header requerido: `Prefer: odata.maxpagesize=500`

### 3. Respuesta al Usuario
- Confirmar la coincidencia exacta de la consulta SQL con los módulos del sistema.
- Mostrar la ubicación exacta del archivo en el proyecto (`app/api/sap/...`).
- Indicar los comandos o endpoints de Postman/curl para ejecutar y probar la consulta.
