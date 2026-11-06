-- Motivo por el que WhatsApp no pudo entregar un mensaje (lo envía Meta en el webhook de estados).
-- Se guarda el código y la descripción del primer error, por ejemplo:
--   131047 · Re-engagement message  (pasaron más de 24 horas sin respuesta del cliente)
alter table public.whatsapp_messages
  add column if not exists error_codigo integer,
  add column if not exists error_detalle text;
