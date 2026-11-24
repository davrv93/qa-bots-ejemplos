// Raíz de composición: el único lugar que lee .env y decide qué piezas reales se conectan.
import http from 'node:http';
import fs from 'node:fs';
import { crearApp } from './app.js';
import { crearLLM } from './llm/index.js';
import { crearEvolution } from './whatsapp/evolution.js';
import { crearWhatsAppFalso } from './whatsapp/falso.js';
import { crearConocimiento } from './sugerencia.js';

const env = process.env;
const lista = (x) => String(x ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const log = (m) => console.log(`[${new Date().toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour12: false })}] ${m}`);

const llm = crearLLM(env);
const whatsapp = env.WHATSAPP === 'falso'
  ? crearWhatsAppFalso()
  : crearEvolution({ url: env.EVOLUTION_URL, claveGlobal: env.EVOLUTION_CLAVE_GLOBAL, instancia: env.EVOLUTION_INSTANCIA || 'qa-bot', tokenInstancia: env.EVOLUTION_TOKEN_INSTANCIA });
const conocimiento = crearConocimiento({
  mapa: JSON.parse(fs.readFileSync(new URL('../conocimiento.json', import.meta.url))),
  raiz: env.CONTEXTO_DIR || '/contexto',
});

const app = crearApp({
  llm, whatsapp, conocimiento, log,
  permitidos: lista(env.NUMEROS_PERMITIDOS),
  alertas: lista(env.NUMEROS_ALERTA),
  secreto: env.WEBHOOK_SECRETO,
  claveAdmin: env.ADMIN_CLAVE,
  autoSugerir: env.AUTO_SUGERIR !== '0',
});

const PUERTO = Number(env.PORT || 8090);
http.createServer(app.manejar).listen(PUERTO, '0.0.0.0', async () => {
  log(`bot QA en :${PUERTO} · IA: ${llm.nombre} · WhatsApp: ${env.WHATSAPP === 'falso' ? 'falso' : 'Evolution Go'} · ${lista(env.NUMEROS_PERMITIDOS).length} número(s) permitido(s)`);
  if (env.WHATSAPP === 'falso') return;
  const webhook = `${env.BOT_URL_INTERNA || 'http://bot-qa:8090'}/entrada/${env.WEBHOOK_SECRETO}/whatsapp`;
  for (let i = 1; i <= 10; i++) {
    try { await whatsapp.asegurarInstancia(webhook); log('instancia lista y webhook fijado; abre el panel para escanear el QR'); return; }
    catch (e) { log(`Evolution Go aún no responde (${i}/10): ${e.message}`); await new Promise((r) => setTimeout(r, 3000)); }
  }
});
