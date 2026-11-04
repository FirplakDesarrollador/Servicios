-- Un nombre por persona en los chats de WhatsApp: deja los responsables con el apodo.
update public.whatsapp_chats set responsable = 'Xime' where responsable = 'Ximena Ballestas';
update public.whatsapp_chats set responsable = 'Andrey' where responsable in ('Adrew', 'Andrew');

-- Debe mostrar solo apodos.
select responsable, count(*) from public.whatsapp_chats group by responsable order by responsable;
