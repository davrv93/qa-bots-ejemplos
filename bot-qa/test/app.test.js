// Pruebas del bot con dobles inyectados: un LLM falso y un WhatsApp falso.
// No necesitan llave, ni red, ni teléfono:  node --test test/*.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { crearApp, leerMensaje } from '../src/app.js';
import { crearLLMFalso } from '../src/llm/falso.js';
import { crearWhatsAppFalso } from '../src/whatsapp/falso.js';
import { crearConocimiento } from '../src/sugerencia.js';
import { crearClienteOpenAICompatible } from '../src/llm/openai-compatible.js';
import { crearLLM } from '../src/llm/index.js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = process.env.CONTEXTO_DIR || path.resolve(AQUI, '..', '..'); // la raíz del repositorio (en Docker, /contexto)
const mapa = JSON.parse(fs.readFileSync(path.join(AQUI, '..', 'conocimiento.json')));
const SECRETO = 'secreto-de-prueba-1234567890';
const PERMITIDO = '51900000001';

// Mensaje con la forma que manda Evolution Go en el webhook.
const mensaje = (texto, extra = {}) => ({
  event: 'Message',
  data: { Info: { ID: 'id-' + Math.random(), Chat: `${PERMITIDO}@s.whatsapp.net`, Sender: `${PERMITIDO}@s.whatsapp.net`, IsFromMe: false, IsGroup: false, ...extra }, Message: { conversation: texto } },
});

function armar({ respuesta, ...otros } = {}) {
  const llm = crearLLMFalso(respuesta);
  const whatsapp = crearWhatsAppFalso();
  let reloj = 1_000_000;
  const app = crearApp({
    llm, whatsapp, conocimiento: crearConocimiento({ mapa, raiz: RAIZ }),
    permitidos: [PERMITIDO], secreto: SECRETO, claveAdmin: 'clave', log: () => {}, ahora: () => reloj, ...otros,
  });
  return { app, llm, whatsapp, avanzar: (ms) => { reloj += ms; } };
}

test('un fallo por WhatsApp vuelve como código sugerido, con la regla y el archivo correctos', async () => {
  const { app, llm, whatsapp } = armar({ respuesta: '1. *Causa probable*: x\n```diff\n- a\n+ b\n```' });
  const r = await app.alWhatsApp(mensaje('Al cambiar la cantidad con promo, el descuento se aplica dos veces'));
  assert.equal(r.respondido, 'sugerencia');
  assert.equal(r.regla, 'promo-aplicada-dos-veces');
  // La IA recibió la regla y el trozo real de venta.js, no todo el repositorio.
  assert.match(llm.pedidos[0].usuario, /REGLA DE NEGOCIO \(promo-aplicada-dos-veces\)/);
  assert.match(llm.pedidos[0].usuario, /ARCHIVO tienda\/publico\/js\/venta\.js/);
  assert.match(llm.pedidos[0].usuario, /recalcularLinea/);
  // Al usuario le llegan dos mensajes: «revisando…» y la sugerencia con el diff.
  assert.equal(whatsapp.enviados.length, 2);
  assert.equal(whatsapp.enviados[1].numero, PERMITIDO);
  assert.match(whatsapp.enviados[1].texto, /```diff/);
  assert.match(whatsapp.enviados[1].texto, /Es una sugerencia/);
});

test('un número fuera de la lista no recibe nada ni gasta IA', async () => {
  const { app, llm, whatsapp } = armar();
  const r = await app.alWhatsApp(mensaje('hola', { Sender: '51999999999@s.whatsapp.net', Chat: '51999999999@s.whatsapp.net' }));
  assert.equal(r.ignorado, 'no-permitido');
  assert.equal(llm.pedidos.length, 0);
  assert.equal(whatsapp.enviados.length, 0);
});

test('ignora grupos, mensajes propios y duplicados', async () => {
  const { app, whatsapp } = armar();
  assert.equal((await app.alWhatsApp(mensaje('x', { IsGroup: true }))).ignorado, 'grupo');
  assert.equal((await app.alWhatsApp(mensaje('x', { IsFromMe: true }))).ignorado, 'propio');
  const m = mensaje('ayuda');
  await app.alWhatsApp(m);
  assert.equal((await app.alWhatsApp(m)).ignorado, 'duplicado');
  assert.equal(whatsapp.enviados.length, 1);
});

test('si la IA falla, el usuario recibe un aviso claro y nada se cae', async () => {
  const { app, whatsapp } = armar({ respuesta: new Error('401 sin llave') });
  const r = await app.alWhatsApp(mensaje('me dejó pagar con efectivo insuficiente'));
  assert.equal(r.respondido, 'sugerencia');
  assert.match(whatsapp.enviados.at(-1).texto, /La IA no respondió/);
  assert.doesNotMatch(whatsapp.enviados.at(-1).texto, /401/);
});

test('limita a un pedido cada 20 s por número', async () => {
  const { app, avanzar, whatsapp } = armar();
  await app.alWhatsApp(mensaje('el stock queda negativo'));
  const r = await app.alWhatsApp(mensaje('el stock queda negativo otra vez'));
  assert.equal(r.respondido, 'espera');
  avanzar(21_000);
  assert.equal((await app.alWhatsApp(mensaje('el reporte no cuadra'))).respondido, 'sugerencia');
  assert.ok(whatsapp.enviados.some((e) => /Dame \d+ s/.test(e.texto)));
});

test('un fallo de los bots avisa a los números de alerta y manda la sugerencia', async () => {
  const { app, llm, whatsapp } = armar();
  await app.alFallo({ regla: 'pago-insuficiente-aceptado', bot: 'Rosa', persona: 'cajera', mensaje: 'Aceptó S/ 5 por una venta de S/ 12', pasos: [{ texto: 'escribe 5 en efectivo' }] });
  assert.match(whatsapp.enviados[0].texto, /Fallo nuevo/);
  assert.match(whatsapp.enviados[1].texto, /Sugerencia del bot QA/);
  assert.match(llm.pedidos[0].usuario, /escribe 5 en efectivo/);
  // El trozo que recibe la IA empieza en la función que de verdad decide el cobro.
  assert.match(llm.pedidos[0].usuario, /async function confirmar/);
  assert.match(llm.pedidos[0].usuario, /cobroExacto/);
  // Y queda en la lista para pedirlo por WhatsApp con «fallo 1».
  const r = await app.alWhatsApp(mensaje('fallos'));
  assert.equal(r.respondido, 'fallos');
  assert.match(whatsapp.enviados.at(-1).texto, /pago-insuficiente-aceptado/);
});

test('leerMensaje usa el número alterno cuando el remitente viene como @lid', () => {
  const m = leerMensaje({ event: 'Message', data: { Info: { ID: 'a', Chat: 'x@lid', Sender: '123@lid', SenderAlt: '51900000001@s.whatsapp.net' }, Message: { extendedTextMessage: { text: 'hola' } } } });
  assert.equal(m.numero, '51900000001');
  assert.equal(m.texto, 'hola');
});

test('el cliente OpenAI-compatible manda la llave solo en la cabecera y nunca la devuelve en un error', async () => {
  const llamadas = [];
  const fetchFalso = async (url, op) => { llamadas.push({ url, op }); return new Response('{"error":"bad key"}', { status: 401 }); };
  const c = crearClienteOpenAICompatible({ baseUrl: 'https://api.ejemplo.com/', apiKey: 'sk-SECRETA', modelo: 'm', fetchImpl: fetchFalso });
  await assert.rejects(c.sugerir({ sistema: 's', usuario: 'u' }), (e) => !e.message.includes('sk-SECRETA') && /401/.test(e.message));
  assert.equal(llamadas[0].url, 'https://api.ejemplo.com/chat/completions');
  assert.equal(llamadas[0].op.headers.authorization, 'Bearer sk-SECRETA');
  assert.doesNotMatch(llamadas[0].op.body, /sk-SECRETA/);
});

test('la fábrica elige el proveedor por .env y exige llave cuando hace falta', () => {
  assert.equal(crearLLM({}).nombre, 'falso');
  assert.equal(crearLLM({ LLM_PROVEEDOR: 'deepseek', LLM_API_KEY: 'x' }).nombre, 'deepseek · deepseek-flash');
  assert.equal(crearLLM({ LLM_PROVEEDOR: 'ollama' }).nombre, 'ollama · qwen2.5-coder:14b');
  assert.throws(() => crearLLM({ LLM_PROVEEDOR: 'deepseek' }), /LLM_API_KEY/);
});

test('las rutas de entrada exigen el secreto y el panel exige clave', async () => {
  const { app } = armar();
  const http = await import('node:http');
  const srv = http.createServer(app.manejar).listen(0);
  const base = `http://127.0.0.1:${srv.address().port}`;
  try {
    assert.equal((await fetch(`${base}/entrada/otro/whatsapp`, { method: 'POST', body: '{}' })).status, 404);
    assert.equal((await fetch(`${base}/entrada/${SECRETO}/whatsapp`, { method: 'POST', body: '{}' })).status, 200);
    assert.equal((await fetch(`${base}/api/estado`)).status, 401);
    const ok = await fetch(`${base}/api/estado`, { headers: { authorization: 'Basic ' + Buffer.from('admin:clave').toString('base64') } });
    assert.equal(ok.status, 200);
  } finally { srv.close(); }
});
