// Fábrica del LLM. Aquí, y solo aquí, se decide qué API se usa; el resto del bot
// recibe el cliente ya armado (inyección de dependencias) y no sabe cuál es.
import { crearClienteOpenAICompatible } from './openai-compatible.js';
import { crearLLMFalso } from './falso.js';

const PROVEEDORES = {
  deepseek: { baseUrl: 'https://api.deepseek.com', modelo: 'deepseek-flash', extra: { thinking: { type: 'disabled' } } },
  openai: { baseUrl: 'https://api.openai.com/v1', modelo: '' },
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1', modelo: '' },
  ollama: { baseUrl: 'http://host.docker.internal:11434/v1', modelo: 'qwen2.5-coder:14b' },
};

export function crearLLM(env = process.env) {
  const proveedor = (env.LLM_PROVEEDOR || 'falso').toLowerCase();
  if (proveedor === 'falso') return crearLLMFalso();
  const base = PROVEEDORES[proveedor];
  if (!base && !env.LLM_BASE_URL) {
    throw new Error(`Proveedor «${proveedor}» desconocido. Usa deepseek, openai, openrouter, ollama o falso, o define LLM_BASE_URL.`);
  }
  if (proveedor !== 'ollama' && !env.LLM_API_KEY) {
    throw new Error(`Falta LLM_API_KEY en .env para usar ${proveedor}.`);
  }
  return crearClienteOpenAICompatible({
    nombre: proveedor,
    baseUrl: env.LLM_BASE_URL || base.baseUrl,
    modelo: env.LLM_MODELO || base?.modelo,
    apiKey: env.LLM_API_KEY || '',
    extra: base?.extra ?? {},
  });
}
