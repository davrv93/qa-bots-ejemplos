// WhatsApp falso: guarda los mensajes en vez de enviarlos. Para pruebas y para el modo sin teléfono.
export function crearWhatsAppFalso() {
  const enviados = [];
  return {
    enviados,
    async asegurarInstancia() {},
    async qr() { return null; },
    async estado() { return { conectado: false, sesion: false, falso: true }; },
    async enviarTexto(numero, texto) { enviados.push({ numero: String(numero), texto: String(texto) }); return { ok: true }; },
  };
}
