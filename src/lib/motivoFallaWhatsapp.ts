// Motivos más comunes por los que WhatsApp no entrega un mensaje, explicados para el asesor.
// Códigos: https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes
const MOTIVOS: Record<number, string> = {
  131047: 'Pasaron más de 24 horas desde el último mensaje del cliente. Envía una plantilla para retomar la conversación.',
  131026: 'El número no tiene WhatsApp o no puede recibir el mensaje.',
  131049: 'WhatsApp limitó este mensaje para cuidar la experiencia del cliente. Intenta más tarde.',
  131050: 'El cliente pidió no recibir mensajes de marketing.',
  131051: 'Tipo de mensaje no admitido.',
  131052: 'No se pudo descargar el archivo enviado.',
  131053: 'No se pudo subir el archivo. Revisa el formato o el tamaño.',
  131021: 'El número de destino es el mismo número de la empresa.',
  131031: 'La cuenta de WhatsApp de la empresa está bloqueada.',
  131042: 'Hay un problema con el método de pago de la cuenta de WhatsApp.',
  131045: 'El número de la empresa no está registrado correctamente.',
  131048: 'Se alcanzó el límite de envíos de spam para este número.',
  131056: 'Se enviaron demasiados mensajes a este número en poco tiempo.',
  130472: 'WhatsApp no entregó el mensaje como parte de una prueba de Meta.',
  132000: 'Los datos de la plantilla no coinciden con su formato.',
  132001: 'La plantilla no existe o no está aprobada.',
  132015: 'La plantilla está pausada por baja calidad.',
  132016: 'La plantilla está deshabilitada.',
  368: 'La cuenta está restringida por incumplir las políticas de WhatsApp.',
};

/** Motivo de la falla para mostrar al asesor; null si no se guardó ninguno. */
export function motivoFallaWhatsapp(codigo?: number | null, detalle?: string | null): string | null {
  if (codigo && MOTIVOS[codigo]) return MOTIVOS[codigo];
  if (detalle) return codigo ? `${detalle} (código ${codigo})` : detalle;
  if (codigo) return `Error de WhatsApp, código ${codigo}.`;
  return null;
}
