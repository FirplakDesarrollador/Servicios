# Reglas Globales del Módulo de Indicadores MAC

## Regla de Cierre de Radicados
- **Fecha real de cierre:** La fecha oficial de cierre de un radicado es **únicamente** el campo `Fecha de Verificación`.
- **Casos abiertos:** Si `Fecha de Verificación` está vacío (NULL), el radicado es ABIERTO.
- **Casos cerrados:** Si `Fecha de Verificación` tiene una fecha válida, el radicado es CERRADO.
- **Jerarquía de Fechas:** 
  1. `Fecha de Creación`: Para iniciar conteo y asignar presupuesto.
  2. `Fecha Objetivo de Cierre`: Para mes presupuestado.
  3. `Fecha de Verificación`: Única fecha válida para cierres y SLA.

## Fecha de Cierre (`fecha_cierre`) = el día del agente
- `fecha_verificacion` es la fecha **real** en que se le dio solución al cliente (ej.: el día que le llegó la reposición del lavamanos). Define estado, SLA, tiempos de solución y experiencia del cliente.
- `fecha_cierre` es el día en que el **agente registró** el cierre del consecutivo (puede ser días después de la solución real). Se usa **solo** para medir la productividad del agente: cuántos casos cerró en su día, metas diarias, tendencia diaria del agente.
- Por eso `DetalleMac` cuenta "cerrados hoy" por agente con `d.fecha_cierre || d.fecha_verificacion`: es correcto y no se debe cambiar.
- Nunca usar `fecha_cierre` para estado, SLA ni tiempos de solución.

## Cumplimiento de SLA (definición única)
- **% de cumplimiento oficial** = casos cerrados y abiertos que no han superado 15 días hábiles / total de casos. Un abierto vencido también descuenta.
- Días del caso: hasta `fecha_verificacion` si está cerrado (`_tiempoCierre`); hasta hoy si sigue abierto (`_diasHabilesAbierta`).
- Se calcula solo con `src/app/indicadores-mac/utils/metricas.ts` (`porcentajeCumplimiento`, `estaFueraDeSla`). No repetir la fórmula en las hojas.

## Conteo de problemas (definición única)
- Un mismo defecto cuenta una vez por cada producto comprado que lo presenta, no por pieza; defectos distintos cuentan aparte. Ej.: 1 mueble con 3 piezas despicadas = 1; 1 mueble con despique, faltante y pieza repetida = 3; 2 muebles con 2 piezas repetidas = 2.
- Responsables, plantas y grupos suman esos mismos problemas. Total de radicados, canales, mercados y agentes siguen contando radicados.
- Se calcula solo con `src/app/indicadores-mac/utils/conteoProblemas.ts`. No repetir la fórmula en las hojas.

## Familias de Ventas
- Los grupos se muestran como en los radicados: `ROPAS` = Labores; `HIDROPOR`, `HIDROEMP`, `BAÑERA` = Hidroterapia. `REPUESTO`, `MPDIRECT` y `FINANZAS` siguen sumando como vendidos y se reportan como comercializados (`filterEngine.ts`).

## Regla de cierre: productos
- Un radicado no se cierra (ni recibe Fecha de Verificación) sin producto de compra, ni con menos productos con novedad que productos de compra: `src/lib/reglasRadicado.ts`.

## Prevención de Errores Comunes de TypeScript
- **Fechas en el RegistroMAC:** `fecha_cierre` existe como opcional en `RegistroMAC`; úsala solo para productividad del agente (ver arriba). Para cierres, SLA y estado usar siempre `fecha_verificacion` o el campo calculado respectivo (`_fechaCierre`, `_tiempoCierre`, que también salen de la verificación).
- **Tipado de Arrays en Hooks/Variables:** Siempre tipar explícitamente los arrays vacíos (por ejemplo, `const res: any[] = [];` o usando su tipo/interfaz específica) para evitar el error estricto de compilación en Vercel `Variable 'res' implicitly has type 'any[]'`.
