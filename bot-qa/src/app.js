// El corazón del bot. Todo lo de afuera llega inyectado:
//   llm          { nombre, sugerir({sistema, usuario}) }     DeepSeek, Ollama, OpenAI… o el falso
//   whatsapp     { asegurarInstancia, qr, estado, enviarTexto } Evolution Go o el falso
//   conocimiento { elegirRegla, contexto }                      reglas de negocio → archivos
// Así las pruebas cambian la IA y WhatsApp por dobles sin tocar este archivo.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SISTEMA, armarPedido, formatoWhatsApp, partir } from './sugerencia.js';

const PUBLICO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const AYUDA = [
  '🤖 *Bot QA* · escríbeme el fallo y te devuelvo el código sugerido.',
  'Ejemplos:',
  '• _Al cambiar la cantidad, el descuento se aplica dos veces_',
  '• _Me dejó vender con efectivo insuficiente_',
  'Comandos: *fallos* (los últimos que encontraron los bots) · *fallo 1* (sugerencia para ese fallo) · *ayuda*',
].join('\n');

export function soloDigitos(x) { return String(x ?? '').replace(/\D/g, ''); }

// Saca del payload de Evolution Go: quién escribe, qué dice y si hay que ignorarlo.
export function leerMensaje(cuerpo) {
  if (String(cuerpo?.event ?? '') !== 'Message') return { ignorar: 'evento' };
  const info = cuerpo?.data?.Info ?? {};
  const msg = cuerpo?.data?.Message ?? {};
  if (info.IsFromMe === true) return { ignorar: 'propio' };
  const chat = String(info.Chat ?? '');
  if (info.IsGroup === true || chat.endsWith('@g.us')) return { ignorar: 'grupo' };
  let remitente = String(info.Sender ?? chat);
  if (remitente.endsWith('@lid')) remitente = String(info.SenderAlt ?? '');
  const numero = soloDigitos(remitente.split('@')[0].split(':')[0]);
  const texto = String(msg.conversation ?? msg.extendedTextMessage?.text ?? '').trim();
  return { id: info.ID ?? null, numero, texto };
}

export function crearApp({ llm, whatsapp, conocimiento, permitidos = [], alertas = [], secreto, claveAdmin, autoSugerir = true, log = console.log, esperaMs = 20_000, ahora = Date.now }) {
  if (!secreto || secreto.length < 16) throw new Error('WEBHOOK_SECRETO debe tener al menos 16 caracteres.');
  const lista = new Set(permitidos.map(soloDigitos).filter(Boolean));
  const destinos = (alertas.length ? alertas : [...lista]).map(soloDigitos).filter(Boolean);
  const vistos = new Set();
  const ultimo = new Map();
  const fallos = [];
  const historial = [];

  async function responder(numero, texto) {
    for (const parte of partir(texto)) await whatsapp.enviarTexto(numero, parte);
  }

  async function sugerir({ texto, ficha }) {
    const id = conocimiento.elegirRegla({ regla: ficha?.regla, texto });
    const contexto = id ? conocimiento.contexto(id) : null;
    const usuario = armarPedido({ texto, ficha, contexto });
    let sugerencia;
    try {
      sugerencia = await llm.sugerir({ sistema: SISTEMA, usuario });
    } catch (e) {
      log(`LLM falló: ${e.message}`);
      return { ok: false, texto: '⚠️ La IA no respondió ahora. Revisa LLM_PROVEEDOR y LLM_API_KEY en .env e inténtalo otra vez.' };
    }
    const salida = formatoWhatsApp({ sugerencia, contexto, llm: llm.nombre });
    historial.unshift({ hora: new Date(ahora()).toISOString(), regla: id, origen: ficha ? 'bot' : 'whatsapp', texto: salida });
    historial.length = Math.min(historial.length, 20);
    return { ok: true, texto: salida, regla: id };
  }

  async function alWhatsApp(cuerpo) {
    const m = leerMensaje(cuerpo);
    if (m.ignorar) return { ignorado: m.ignorar };
    if (m.id && vistos.has(m.id)) return { ignorado: 'duplicado' };
    if (m.id) { vistos.add(m.id); if (vistos.size > 500) vistos.delete(vistos.values().next().value); }
    if (!lista.has(m.numero)) { log(`ignorado: número fuera de la lista (${m.numero.slice(0, 3)}…)`); return { ignorado: 'no-permitido' }; }
    if (!m.texto) return { ignorado: 'sin-texto' };

    const t = m.texto.toLowerCase();
    if (t === 'ayuda' || t === 'hola') { await responder(m.numero, AYUDA); return { respondido: 'ayuda' }; }
    if (t === 'fallos') {
      const txt = fallos.length
        ? '*Últimos fallos de los bots*\n' + fallos.slice(0, 5).map((f, i) => `${i + 1}. ${f.regla} · ${f.bot ?? '?'} · ${f.mensaje ?? ''}`).join('\n')
        : 'Todavía no llegó ningún fallo de los bots.';
      await responder(m.numero, txt); return { respondido: 'fallos' };
    }
    const n = /^fallo\s+(\d+)$/.exec(t);
    if (n && !fallos[Number(n[1]) - 1]) { await responder(m.numero, 'No tengo ese fallo. Escribe *fallos* para ver la lista.'); return { respondido: 'sin-fallo' }; }

    const espera = (ultimo.get(m.numero) ?? 0) + esperaMs - ahora();
    if (espera > 0) { await responder(m.numero, `⏳ Dame ${Math.ceil(espera / 1000)} s antes del siguiente pedido.`); return { respondido: 'espera' }; }
    ultimo.set(m.numero, ahora());

    await responder(m.numero, '🔎 Revisando el fallo con la IA…');
    const r = await sugerir(n ? { ficha: fallos[Number(n[1]) - 1] } : { texto: m.texto });
    await responder(m.numero, r.texto);
    return { respondido: 'sugerencia', regla: r.regla ?? null };
  }

  async function alFallo(ficha) {
    if (!ficha?.regla) return { ignorado: 'sin-regla' };
    fallos.unshift({ regla: ficha.regla, bot: ficha.bot, persona: ficha.persona, mensaje: ficha.mensaje, pasos: ficha.pasos, hora: ficha.hora });
    fallos.length = Math.min(fallos.length, 20);
    const aviso = `🐞 *Fallo nuevo* · ${ficha.regla}\nBot: ${ficha.bot ?? '?'} (${ficha.persona ?? '?'})\n${ficha.mensaje ?? ''}`;
    for (const d of destinos) await responder(d, aviso);
    if (autoSugerir) {
      const r = await sugerir({ ficha });
      for (const d of destinos) await responder(d, r.texto);
    }
    return { avisados: destinos.length };
  }

  async function alAlerta(a) {
    const txt = `${a?.estado === 'arriba' ? '✅' : '🚨'} ${a?.mensaje ?? 'Alerta sin mensaje'}`;
    for (const d of destinos) await responder(d, txt);
    return { avisados: destinos.length };
  }

  function adminOk(req) {
    if (!claveAdmin) return false;
    const h = String(req.headers.authorization ?? '');
    if (!h.startsWith('Basic ')) return false;
    const [u, ...c] = Buffer.from(h.slice(6), 'base64').toString().split(':');
    return u === 'admin' && c.join(':') === claveAdmin;
  }

  async function leerJSON(req, max = 1_000_000) {
    let n = 0; const trozos = [];
    for await (const t of req) { n += t.length; if (n > max) throw Object.assign(new Error('cuerpo muy grande'), { status: 413 }); trozos.push(t); }
    try { return JSON.parse(Buffer.concat(trozos).toString() || '{}'); } catch { throw Object.assign(new Error('JSON inválido'), { status: 400 }); }
  }

  function enviar(res, status, datos, tipo = 'application/json; charset=utf-8') {
    res.writeHead(status, { 'content-type': tipo, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    res.end(typeof datos === 'string' || Buffer.isBuffer(datos) ? datos : JSON.stringify(datos));
  }

  // Manejador HTTP (node:http). Rutas de máquina bajo /entrada/<secreto>/…; panel con usuario admin.
  async function manejar(req, res) {
    const url = new URL(req.url, 'http://bot');
    const p = url.pathname;
    try {
      if (req.method === 'GET' && p === '/salud') return enviar(res, 200, { ok: true, llm: llm.nombre });
      const m = /^\/entrada\/([^/]+)\/(whatsapp|fallo|alerta)$/.exec(p);
      if (m && req.method === 'POST') {
        if (m[1] !== secreto) return enviar(res, 404, { error: 'no existe' });
        const cuerpo = await leerJSON(req);
        // Evolution Go espera respuesta rápida: se contesta 200 y se trabaja después.
        enviar(res, 200, { ok: true });
        const tarea = m[2] === 'whatsapp' ? alWhatsApp(cuerpo) : m[2] === 'fallo' ? alFallo(cuerpo) : alAlerta(cuerpo);
        tarea.then((r) => log(`${m[2]}: ${JSON.stringify(r)}`)).catch((e) => log(`${m[2]} falló: ${e.message}`));
        return;
      }
      if (p === '/' || p.startsWith('/api/')) {
        if (!adminOk(req)) { res.writeHead(401, { 'www-authenticate': 'Basic realm="bot-qa"' }); return res.end('Clave requerida'); }
        if (p === '/') return enviar(res, 200, fs.readFileSync(path.join(PUBLICO, 'index.html')), 'text/html; charset=utf-8');
        if (p === '/api/estado' && req.method === 'GET') {
          let wa; try { wa = await whatsapp.estado(); } catch (e) { wa = { error: e.message }; }
          return enviar(res, 200, { llm: llm.nombre, whatsapp: wa, permitidos: lista.size, fallos: fallos.length, historial });
        }
        if (p === '/api/qr' && req.method === 'GET') {
          try { return enviar(res, 200, { imagen: await whatsapp.qr() }); } catch (e) { return enviar(res, 502, { error: e.message }); }
        }
        if (p === '/api/probar' && req.method === 'POST') {
          const { texto } = await leerJSON(req, 20_000);
          if (!texto || String(texto).length > 2000) return enviar(res, 400, { error: 'texto vacío o muy largo' });
          return enviar(res, 200, await sugerir({ texto: String(texto) }));
        }
      }
      return enviar(res, 404, { error: 'no existe' });
    } catch (e) {
      if (!res.headersSent) return enviar(res, e.status ?? 500, { error: e.status ? e.message : 'error interno' });
      log(`error: ${e.message}`);
    }
  }

  return { manejar, alWhatsApp, alFallo, alAlerta, sugerir, fallos, historial };
}
