# Reglas Globales del Módulo de Indicadores MAC

## Regla de Cierre de Radicados
- **Fecha real de cierre:** La fecha oficial de cierre de un radicado es **únicamente** el campo `Fecha de Verificación`.
- **Casos abiertos:** Si `Fecha de Verificación` está vacío (NULL), el radicado es ABIERTO.
- **Casos cerrados:** Si `Fecha de Verificación` tiene una fecha válida, el radicado es CERRADO.
- **Jerarquía de Fechas:** 
  1. `Fecha de Creación`: Para iniciar conteo y asignar presupuesto.
  2. `Fecha Objetivo de Cierre`: Para mes presupuestado.
  3. `Fecha de Verificación`: Única fecha válida para cierres y SLA.
