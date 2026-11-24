// LLM falso: no llama a nadie y responde siempre lo mismo. Sirve para las pruebas
// y para probar el bot sin llave. Guarda lo que le pidieron, así la prueba puede revisarlo.

export function crearLLMFalso(respuesta) {
  const pedidos = [];
  return {
    nombre: 'falso',
    pedidos,
    async sugerir({ sistema, usuario }) {
      pedidos.push({ sistema, usuario });
      if (respuesta instanceof Error) throw respuesta;
      return respuesta ?? [
        'Causa probable: (respuesta del LLM falso, sin IA real).',
        'Archivo: tienda/publico/js/venta.js',
        '```diff',
        '- // aquí iría el parche que propone la IA',
        '+ // configura LLM_PROVEEDOR=deepseek para una sugerencia real',
        '```',
      ].join('\n');
    },
  };
}
