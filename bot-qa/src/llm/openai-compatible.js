// Cliente para cualquier API compatible con OpenAI (/chat/completions):
// DeepSeek, OpenAI, OpenRouter, Groq u Ollama local. Lo único que cambia es la configuración.
//
// Contrato que cumple (el mismo que el falso): { nombre, sugerir({ sistema, usuario }) -> Promise<string> }

export function crearClienteOpenAICompatible({ baseUrl, apiKey, modelo, nombre = 'openai-compatible', extra = {}, timeoutMs = 120_000, fetchImpl = fetch }) {
  if (!baseUrl) throw new Error('Falta la URL base del LLM (LLM_BASE_URL).');
  if (!modelo) throw new Error('Falta el modelo del LLM (LLM_MODELO).');
  const url = baseUrl.replace(/\/+$/, '') + '/chat/completions';

  return {
    nombre: `${nombre} · ${modelo}`,
    async sugerir({ sistema, usuario }) {
      const headers = { 'content-type': 'application/json' };
      if (apiKey) headers.authorization = `Bearer ${apiKey}`;
      const res = await fetchImpl(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: modelo,
          temperature: 0.2,
          max_tokens: 1500,
          messages: [
            { role: 'system', content: sistema },
            { role: 'user', content: usuario },
          ],
          ...extra,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const texto = await res.text();
      if (!res.ok) {
        // Nunca se devuelve la cabecera ni la llave: solo el código y un trozo del error.
        throw new Error(`El LLM respondió ${res.status}: ${texto.slice(0, 200)}`);
      }
      const datos = JSON.parse(texto);
      const contenido = datos?.choices?.[0]?.message?.content;
      if (!contenido) throw new Error('El LLM respondió sin contenido.');
      return String(contenido).trim();
    },
  };
}
