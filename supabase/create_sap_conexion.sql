-- Conexión a SAP Service Layer, privada: solo la lee el servidor con la service_role key.
-- Con RLS activo y sin políticas, ningún usuario puede leerla desde el navegador, ni siquiera con sesión.
-- Antes de ejecutar, reemplaza ESCRIBE_AQUI_LA_CLAVE. No guardes este archivo con la clave ni lo subas a GitHub.

create table if not exists public.sap_conexion (
  id integer primary key default 1 check (id = 1),
  base_url text not null,
  company_db text not null default 'Firplak_SA',
  usuario text not null,
  clave text not null,
  updated_at timestamptz not null default now()
);

alter table public.sap_conexion enable row level security;
revoke all on public.sap_conexion from anon, authenticated;

insert into public.sap_conexion (id, base_url, company_db, usuario, clave)
values (1, 'https://200.7.96.194:50000/b1s/v1', 'Firplak_SA', 'manager', 'ESCRIBE_AQUI_LA_CLAVE')
on conflict (id) do update
  set base_url = excluded.base_url,
      company_db = excluded.company_db,
      usuario = excluded.usuario,
      clave = excluded.clave,
      updated_at = now();
