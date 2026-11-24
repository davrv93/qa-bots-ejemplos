// Cliente mínimo de Evolution Go: crear la instancia, fijar el webhook, leer el QR y enviar texto.
// Contrato (el mismo que el falso): { asegurarInstancia(webhookUrl), qr(), estado(), enviarTexto(numero, texto) }

export function crearEvolution({ url, claveGlobal, instancia, tokenInstancia, fetchImpl = fetch }) {
  async function llamar(ruta, { metodo = 'GET', clave = tokenInstancia, cuerpo } = {}) {
    const res = await fetchImpl(url.replace(/\/+$/, '') + ruta, {
      method: metodo,
      headers: { 'content-type': 'application/json', apikey: clave },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(30_000),
    });
    const texto = await res.text();
    let json = {};
    try { json = texto ? JSON.parse(texto) : {}; } catch { json = { crudo: texto }; }
    if (!res.ok) throw new Error(`${metodo} ${ruta} → ${res.status}: ${String(json.error ?? json.message ?? texto).slice(0, 200)}`);
    return json;
  }

  return {
    async asegurarInstancia(webhookUrl) {
      const todas = await llamar('/instance/all', { clave: claveGlobal });
      const lista = Array.isArray(todas?.data) ? todas.data : [];
      if (!lista.some((i) => i.name === instancia)) {
        await llamar('/instance/create', { metodo: 'POST', clave: claveGlobal, cuerpo: { name: instancia, token: tokenInstancia } });
      }
      // «connect» fija el webhook y se suscribe a los eventos; si no hay sesión, prepara el QR.
      await llamar('/instance/connect', { metodo: 'POST', cuerpo: { webhookUrl, subscribe: ['ALL'] } });
    },
    async qr() {
      const d = (await llamar('/instance/qr'))?.data ?? {};
      const imagen = String(d.qrcode ?? '');
      return imagen.startsWith('data:image') ? imagen : null;
    },
    async estado() {
      const d = (await llamar('/instance/status'))?.data ?? {};
      return { conectado: Boolean(d.connected ?? d.Connected), sesion: Boolean(d.loggedIn ?? d.LoggedIn) };
    },
    async enviarTexto(numero, texto) {
      return llamar('/send/text', { metodo: 'POST', cuerpo: { number: String(numero), text: String(texto) } });
    },
  };
}
