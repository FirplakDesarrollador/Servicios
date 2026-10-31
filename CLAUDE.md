# FIRPLAK Servicios

Plataforma de servicios postventa, Mesa de Atención al Cliente (MAC), agenda técnica e indicadores de FIRPLAK S.A.
Visión general, módulos, variables de entorno y estructura: ver [README.md](README.md).

- Responder siempre en español.
- Stack: Next.js 16 (App Router) + React 19 + TypeScript estricto + Tailwind v4 + Supabase, con integraciones a SAP Business One (`src/lib/sap*.ts`, `/api/sap/*`) y WhatsApp Cloud API (`/api/whatsapp/*`).
- Alias de imports: `@/*` → `src/*`. Cliente Supabase del navegador en `@/lib/supabase`; el de Service Role (`@/lib/supabaseAdmin`) solo en código de servidor (`src/app/api/**`).

## Comandos

```bash
npm run dev          # servidor de desarrollo (Turbopack) en http://localhost:3000
npx tsc --noEmit     # validar tipos
npm run lint         # ESLint
npm run build        # build de producción (lo que corre Vercel)
```

Antes de dar un cambio por terminado: `npx tsc --noEmit` sin errores. Vercel compila en modo estricto y falla con tipos implícitos.

## Ramas y despliegue

- Se trabaja siempre en la rama `mayerly` y se sube a `origin/mayerly`.
- `main` es producción: cada push a `main` despliega automáticamente en Vercel. Solo fusionar `mayerly` → `main` cuando se pida explícitamente.
- No subir `.env` (está en `.gitignore`).

## Reglas de negocio y de código

@.agents/AGENTS.md

Nota: `RegistroMAC` en `src/app/indicadores-mac/types.ts` todavía declara `fecha_cierre` opcional y `DetalleMac.tsx` hace `d.fecha_cierre || d.fecha_verificacion`. Eso contradice la regla de cierre; en código nuevo usar solo `fecha_verificacion`, y no "corregir" lo existente sin confirmarlo antes.
