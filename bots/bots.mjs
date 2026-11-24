#!/usr/bin/env node
// Usuarios sintéticos: 4 bots con personalidad usan Tienda Sol a la vez, como personas (mueven el mouse en curvas,
// escriben tecla a tecla, dudan). Se ven en vivo (pantalla + cursor + «escribiendo…») y cada fallo queda
// registrado con evidencia: captura, pasos, peticiones y una prueba Playwright que lo reproduce.
//
//   BASE_URL=https://jmd-learn.online/tienda-sol/ node bots/bots.mjs      -> cada bot crea su propia tienda
//   BASE_URL=http://127.0.0.1:3000 node bots/bots.mjs                      -> tu app local (node app/servidor.mjs --modo=prueba)
//   http://localhost:3300   (también funciona bajo un prefijo, p. ej. /qa-bots/)
//
// Variables: PUERTO (3300), HOST (127.0.0.1; 0.0.0.0 en Docker), BASE_URL, FALLOS_DIR (./fallos).
// Usa el Playwright instalado en ../pruebas (npm install allí primero).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = await import(new URL('../pruebas/node_modules/playwright/index.mjs', import.meta.url).href);

const PUERTO = Number(process.env.PUERTO ?? 3300);
const HOST = process.env.HOST ?? '127.0.0.1';
const BASE = (process.env.BASE_URL ?? 'https://jmd-learn.online/tienda-sol/').replace(/\/?$/, '/');
const DIR_FALLOS = process.env.FALLOS_DIR ?? path.join(AQUI, 'fallos');
// Opcional: cada fallo NUEVO se manda por POST a esta URL (el bot QA lo reenvía a WhatsApp con la sugerencia).
const FALLOS_WEBHOOK = process.env.FALLOS_WEBHOOK ?? '';
fs.mkdirSync(DIR_FALLOS, { recursive: true });
const VIEW = { width: 1000, height: 700 };
const VELOCIDAD = { lento: 2.2, normal: 1, rapido: 0.4 };
const horaLima = (d = new Date()) => d.toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour12: false });

// ---------- personas ----------
const PERSONAS = [
  { id: 'rosa', nombre: 'Rosa', rol: 'cajera apurada', color: '#e8322f', tecla: [25, 60], pausa: [120, 400], curva: 0.3,
    rasgos: 'Teclea rápido, redondea el efectivo y a veces cobra de menos.' },
  { id: 'luis', nombre: 'Luis', rol: 'cliente curioso', color: '#1d4fd8', tecla: [60, 140], pausa: [400, 1200], curva: 0.6,
    rasgos: 'Busca muchos productos, hace scroll y cambia cantidades.' },
  { id: 'mia', nombre: 'Mía', rol: 'meticulosa', color: '#0f9d58', tecla: [80, 160], pausa: [600, 1500], curva: 0.2,
    rasgos: 'Revisa cada total y mira el reporte después de cada venta.' },
  { id: 'beto', nombre: 'Beto', rol: 'torpe', color: '#f29f05', tecla: [90, 220], pausa: [300, 900], curva: 0.9,
    rasgos: 'Se equivoca al escribir, corrige, hace doble clic y usa «atrás».' },
];

// ---------- azar reproducible ----------
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------- estado global y SSE ----------
const estado = { corriendo: false, semilla: 7, velocidad: 'normal', corregida: false, viajes: 3, base: BASE, inicio: null, bots: [], fallos: [] };
const clientes = new Set();
function emitir(evento, datos) {
  const linea = `event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`;
  for (const res of clientes) res.write(linea);
}
function publico() {
  return { ...estado, bots: estado.bots.map(({ frame, pagina, contexto, ...b }) => b), fallos: estado.fallos.map(resumenFallo) };
}
function resumenFallo(f) { return { id: f.id, hora: f.hora, bot: f.bot, persona: f.persona, regla: f.regla, mensaje: f.mensaje, pantalla: f.pantalla, veces: f.veces, conocido: !!f.conocido }; }

// ---------- fallos ----------
function cargarFallos() {
  try {
    for (const n of fs.readdirSync(DIR_FALLOS).filter((x) => x.endsWith('.json')).sort()) {
      estado.fallos.push(JSON.parse(fs.readFileSync(path.join(DIR_FALLOS, n), 'utf8')));
    }
  } catch { /* sin historial */ }
  estado.fallos = estado.fallos.slice(-100);
}
cargarFallos();

async function registrarFallo(bot, regla, mensaje, extra = {}) {
  const pantalla = (bot.pagina && new URL(bot.pagina.url()).pathname.split('/').pop()) || '?';
  const dup = estado.fallos.find((f) => f.corrida === estado.inicio && f.regla === regla && f.pantalla === pantalla && f.persona === bot.persona.id);
  if (dup) { dup.veces = (dup.veces ?? 1) + 1; guardarFallo(dup); emitir('fallo', resumenFallo(dup)); return dup; }
  const id = `${Date.now().toString(36)}-${bot.persona.id}`;
  const f = {
    id, hora: new Date().toISOString(), corrida: estado.inicio, bot: bot.nombre, persona: bot.persona.id, semilla: estado.semilla,
    regla, mensaje, pantalla, url: bot.pagina?.url(), tienda: bot.tienda, veces: 1, conocido: false,
    pasos: bot.log.slice(-40), red: bot.red.slice(-20), ...extra,
  };
  try { if (bot.pagina) await bot.pagina.screenshot({ path: path.join(DIR_FALLOS, id + '.png'), type: 'png' }); } catch { /* la página pudo cerrarse */ }
  try { fs.writeFileSync(path.join(DIR_FALLOS, id + '.spec.ts'), generarSpec(f)); } catch { /* sin spec */ }
  estado.fallos.push(f);
  while (estado.fallos.length > 100) { const v = estado.fallos.shift(); for (const ext of ['.json', '.png', '.spec.ts']) fs.rmSync(path.join(DIR_FALLOS, v.id + ext), { force: true }); }
  guardarFallo(f);
  if (FALLOS_WEBHOOK) {
    const { pasos, red, ...ficha } = f;
    fetch(FALLOS_WEBHOOK, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...ficha, pasos: pasos.slice(-12) }), signal: AbortSignal.timeout(5000) })
      .catch((e) => console.log(`(no pude avisar del fallo al webhook: ${e.message})`));
  }
  bot.fallos++; bot.estado = '¡fallo!'; bot.accion = mensaje;
  anotar(bot, 'fallo', `✗ ${regla}: ${mensaje}`);
  emitir('fallo', resumenFallo(f)); emitir('bot', botPublico(bot));
  return f;
}
function guardarFallo(f) { fs.writeFileSync(path.join(DIR_FALLOS, f.id + '.json'), JSON.stringify(f, null, 2)); }

// Prueba Playwright que repite los pasos del bot hasta el fallo y afirma lo que debía pasar.
function generarSpec(f) {
  const q = (t) => "'" + String(t).split("'").join("\\'") + "'";
  const loc = (l) => l.tipo === 'label' ? `page.getByLabel(${q(l.name)})` : l.tipo === 'role' ? `page.getByRole(${q(l.role)}, { name: ${q(l.name)} })` : `page.getByText(${q(l.name)})`;
  const L = [];
  L.push(`import { test, expect } from '@playwright/test';`);
  L.push(`// Generado por el bot «${f.bot}» (${f.persona}) con semilla ${f.semilla} el ${f.hora}. Regla rota: ${f.regla}.`);
  L.push(`// ${f.mensaje}`);
  L.push(`// Corre con BASE_URL apuntando a tu tienda; BUGS=0 prueba la versión corregida.`);
  L.push(``);
  L.push(`test('reproducir fallo ${f.id}', async ({ page, request }) => {`);
  L.push(`  await request.post('/api/semilla', { data: { bugs: process.env.BUGS !== '0' } });`);
  L.push(`  await page.goto('/');`);
  let efectivo = null; let cantidad = null; let producto = null; let precio = null;
  for (const p of f.pasos) {
    if (!p.loc) continue;
    if (p.tipo === 'escribe') {
      L.push(`  await ${loc(p.loc)}.fill(${/clave/i.test(p.loc.name) ? "process.env.CLAVE_PRUEBA ?? 'cajero123'" : q(p.valor)});`);
      if (/efectivo/i.test(p.loc.name)) efectivo = Number(p.valor);
      if (/^Cantidad de /.test(p.loc.name)) { cantidad = Number(p.valor); producto = p.loc.name.replace(/^Cantidad de /, ''); precio = p.precio ?? precio; }
      if (/^Cantidad de /.test(p.loc.name)) L.push(`  await ${loc(p.loc)}.press('Tab');`);
    } else if (p.tipo === 'clic') {
      L.push(`  await ${loc(p.loc)}.click();`);
      if (/^Agregar /.test(p.loc.name) && p.precio) { producto = p.loc.name.replace(/^Agregar /, ''); precio = p.precio; }
    } else if (p.tipo === 'ir') L.push(`  await page.goto(${q(p.valor)});`);
  }
  L.push(``);
  L.push(`  // ---- Lo que DEBÍA pasar ----`);
  if (f.regla === 'pago-insuficiente-aceptado') {
    L.push(`  // Con S/ ${efectivo} no se paga el total: el POS debe avisar y NO registrar la venta.`);
    L.push(`  await expect(page.getByRole('alert')).toHaveText(/Efectivo insuficiente/);`);
    L.push(`  await expect(page.getByRole('status').filter({ hasText: /Venta N°/ })).toHaveCount(0);`);
  } else if (f.regla === 'promo-aplicada-dos-veces') {
    L.push(`  // ${producto ?? 'El producto'} cuesta S/ ${precio ?? '?'} con promo; ${cantidad ?? 'n'} unidades deben sumar precio × cantidad, una sola vez el descuento.`);
    L.push(`  await expect(page.getByRole('row', { name: ${q(producto ?? '')} }).getByRole('cell').nth(3)).toHaveText(${q('S/ ' + (precio && cantidad ? (Math.round(precio * cantidad * 100) / 100).toFixed(2) : '?'))});`);
  } else if (f.regla === 'reporte-no-cuadra') {
    L.push(`  // El total del reporte debe ser la suma exacta de las ventas confirmadas: ${f.esperado ?? '?'}.`);
    L.push(`  await expect(page.getByLabel('Total vendido')).toHaveText(${q(f.esperado ?? '')});`);
  } else if (f.regla === 'http-inesperado') {
    L.push(`  // ${f.recibido ?? 'La API respondió un error que la pantalla no esperaba.'}`);
    L.push(`  await expect(page.getByRole('alert')).toHaveText('');`);
  } else {
    L.push(`  // ${f.mensaje}`);
    L.push(`  // Escribe aquí el expect de lo que debía pasar.`);
  }
  L.push(`});`);
  return L.join('\n');
}

// ---------- bots ----------
function botPublico(b) { const { frame, pagina, contexto, ...r } = b; return r; }
function anotar(bot, tipo, texto, extra = {}) {
  const e = { t: horaLima(), tipo, texto, ...extra };
  bot.log.push(e); if (bot.log.length > 300) bot.log.shift();
  emitir('accion', { bot: bot.id, ...e });
}
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function crearTienda() {
  if (!/\/tienda-sol\/$/.test(BASE)) return { url: BASE, cookie: '' };
  const r = await fetch(BASE, { redirect: 'manual' });
  const destino = r.headers.get('location');
  if (!destino) throw new Error(`No pude crear una tienda en ${BASE} (HTTP ${r.status})`);
  return { url: new URL(destino, BASE).toString(), cookie: (r.headers.get('set-cookie') ?? '').split(';')[0] };
}

class Bot {
  constructor(i, persona, navegador) {
    Object.assign(this, { id: persona.id, nombre: persona.nombre, persona, indice: i, navegador, estado: 'esperando', accion: 'Preparándose…', cursor: { x: 0.5, y: 0.5 }, escribiendo: false, log: [], red: [], fallos: 0, viaje: 0, ventas: [], precios: {}, tienda: '', frame: null, activo: true });
  }
  get vel() { return VELOCIDAD[estado.velocidad] ?? 1; }
  async preparar() {
    const t = await crearTienda(); this.tienda = t.url;
    if (estado.corregida || /\/tienda-sol\/[a-f0-9]+\/$/.test(t.url)) {
      try { await fetch(t.url + 'api/semilla', { method: 'POST', headers: { 'content-type': 'application/json', cookie: t.cookie }, body: JSON.stringify({ bugs: !estado.corregida }) }); } catch { /* sin semilla */ }
    }
    this.contexto = await this.navegador.newContext({ viewport: VIEW, locale: 'es-PE', timezoneId: 'America/Lima' });
    if (t.cookie) { const [name, value] = t.cookie.split('='); await this.contexto.addCookies([{ name, value, url: t.url }]); }
    this.pagina = await this.contexto.newPage();
    this.pagina.setDefaultTimeout(15000);
    this.pagina.on('pageerror', (e) => registrarFallo(this, 'error-js', String(e.message).slice(0, 200)));
    this.pagina.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) registrarFallo(this, 'error-consola', m.text().slice(0, 200)); });
    this.pagina.on('response', async (r) => {
      const u = new URL(r.url()); if (!/\/api\//.test(u.pathname)) return;
      const e = { t: horaLima(), metodo: r.request().method(), ruta: u.pathname.replace(/^.*\/tienda-sol\/[a-f0-9]+/, ''), estado: r.status() };
      this.red.push(e); if (this.red.length > 60) this.red.shift();
      emitir('red', { bot: this.id, ...e });
      if (r.status() >= 400 && r.status() !== this.esperaEstado) {
        let cuerpo = ''; try { cuerpo = (await r.text()).slice(0, 160); } catch { /* sin cuerpo */ }
        registrarFallo(this, 'http-inesperado', `${e.metodo} ${e.ruta} → ${r.status()} ${cuerpo}`, { recibido: `${e.metodo} ${e.ruta} respondió ${r.status()}: ${cuerpo}` });
      }
    });
    const cdp = await this.contexto.newCDPSession(this.pagina);
    let ultimo = 0;
    cdp.on('Page.screencastFrame', async (f) => {
      try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch { /* cerrado */ }
      const ahora = Date.now(); if (ahora - ultimo < 300) return; ultimo = ahora;
      this.frame = f.data; emitir('frame', { bot: this.id, data: f.data, cursor: this.cursor, escribiendo: this.escribiendo });
    });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 45, maxWidth: 800, maxHeight: 560, everyNthFrame: 2 });
    this.cdp = cdp;
  }
  // --- gestos humanos ---
  async moverA(locator) {
    const caja = await locator.boundingBox(); if (!caja) throw new Error('elemento sin posición');
    const dx = caja.x + caja.width * (0.3 + this.rnd() * 0.4), dy = caja.y + caja.height * (0.35 + this.rnd() * 0.3);
    const ox = this.cursor.x * VIEW.width, oy = this.cursor.y * VIEW.height;
    const k = this.persona.curva; const cx = (ox + dx) / 2 + (this.rnd() - 0.5) * 300 * k, cy = (oy + dy) / 2 + (this.rnd() - 0.5) * 300 * k;
    const pasos = 14 + Math.floor(this.rnd() * 10);
    for (let i = 1; i <= pasos; i++) {
      const t = i / pasos, e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOut
      const x = (1 - e) * (1 - e) * ox + 2 * (1 - e) * e * cx + e * e * dx, y = (1 - e) * (1 - e) * oy + 2 * (1 - e) * e * cy + e * e * dy;
      await this.pagina.mouse.move(x, y); this.cursor = { x: x / VIEW.width, y: y / VIEW.height };
      if (i % 3 === 0) emitir('cursor', { bot: this.id, cursor: this.cursor });
      await dormir(12 * this.vel);
    }
    return { x: dx, y: dy };
  }
  async pausa() { const [a, b] = this.persona.pausa; await dormir((a + this.rnd() * (b - a)) * this.vel); }
  async clic(locator, loc, extra = {}) {
    this.estado = 'navegando'; this.accion = `clic en ${loc.role === 'button' ? 'botón' : loc.role ?? ''} «${loc.name}»`; emitir('bot', botPublico(this));
    await locator.scrollIntoViewIfNeeded(); const p = await this.moverA(locator);
    await this.pagina.mouse.click(p.x, p.y); if (extra.doble) await this.pagina.mouse.click(p.x, p.y);
    anotar(this, 'clic', this.accion, { loc, ...extra });
    await this.pausa();
  }
  async escribir(locator, loc, texto, { typos = false } = {}) {
    this.accion = `escribe «${/clave/i.test(loc.name) ? '•••' : texto}» en ${loc.name}`; this.estado = 'escribiendo'; this.escribiendo = true; emitir('bot', botPublico(this));
    const p = await this.moverA(locator); await this.pagina.mouse.click(p.x, p.y);
    await locator.fill(''); // deja el campo vacío antes de teclear (como seleccionar todo y borrar)
    const [a, b] = this.persona.tecla;
    if (typos && texto.length > 3 && this.rnd() < 0.7) {
      const mal = texto.slice(0, 2) + 'x'; for (const ch of mal) { await this.pagina.keyboard.type(ch); await dormir((a + this.rnd() * (b - a)) * this.vel); }
      await dormir(350 * this.vel); for (let i = 0; i < 3; i++) { await this.pagina.keyboard.press('Backspace'); await dormir(90 * this.vel); }
    }
    for (const ch of texto) { await this.pagina.keyboard.type(ch); await dormir((a + this.rnd() * (b - a)) * this.vel); }
    this.escribiendo = false; anotar(this, 'escribe', this.accion, { loc, valor: texto });
    await this.pausa();
  }
  async ir(ruta) {
    this.estado = 'navegando'; this.accion = `va a ${ruta}`; emitir('bot', botPublico(this));
    for (let intento = 0; ; intento++) {
      try { await this.pagina.goto(this.tienda + ruta.replace(/^\//, ''), { waitUntil: 'domcontentloaded' }); break; }
      catch (e) { if (intento < 2 && /interrupted by another navigation/.test(String(e.message))) { await dormir(600); continue; } throw e; }
    }
    anotar(this, 'ir', this.accion, { valor: '/' + ruta.replace(/^\//, '') }); await this.pausa();
  }
  async scroll() { const d = 200 + this.rnd() * 500; await this.pagina.mouse.wheel(0, d); await dormir(400 * this.vel); await this.pagina.mouse.wheel(0, -d); }
  // --- viaje ---
  async viajar() {
    const pg = this.pagina; const P = this.persona;
    await this.ir('/');
    if (P.id === 'beto' && this.rnd() < 0.35) {           // Beto se equivoca de clave primero
      this.esperaEstado = 401;
      await this.escribir(pg.getByLabel('Usuario'), { tipo: 'label', name: 'Usuario' }, 'cajero', { typos: true });
      await this.escribir(pg.getByLabel('Clave'), { tipo: 'label', name: 'Clave' }, 'cajero12');
      await this.clic(pg.getByRole('button', { name: 'Ingresar' }), { tipo: 'role', role: 'button', name: 'Ingresar' });
      await pg.getByRole('alert').filter({ hasText: /incorrect/i }).waitFor({ timeout: 5000 }).catch(() => registrarFallo(this, 'login-sin-aviso', 'Clave incorrecta y la pantalla no avisó'));
      this.esperaEstado = null;
    }
    await this.escribir(pg.getByLabel('Usuario'), { tipo: 'label', name: 'Usuario' }, 'cajero', { typos: P.id === 'beto' });
    await this.escribir(pg.getByLabel('Clave'), { tipo: 'label', name: 'Clave' }, 'cajero123');
    await this.clic(pg.getByRole('button', { name: 'Ingresar' }), { tipo: 'role', role: 'button', name: 'Ingresar' });
    await pg.getByRole('heading', { name: 'Catálogo' }).waitFor();
    // buscar y agregar
    const busquedas = P.id === 'luis' ? 2 + Math.floor(this.rnd() * 3) : 1;
    const carrito = []; // {nombre, precio}
    for (let i = 0; i < busquedas; i++) {
      const termino = ['Café', 'Inca', 'Arroz', 'Leche', 'Pan', 'Agua', 'Gall', 'Ace'][Math.floor(this.rnd() * 8)];
      const antesBusq = await pg.locator('#resumen').innerText().catch(() => '');
      await this.escribir(pg.getByLabel('Buscar producto'), { tipo: 'label', name: 'Buscar producto' }, termino, { typos: P.id === 'beto' });
      // espera a que el catálogo termine de repintarse (la respuesta llega después del último tecleo)
      await pg.waitForFunction((a) => document.getElementById('resumen')?.textContent !== a, antesBusq, { timeout: 4000 }).catch(() => {});
      await dormir(400);
      if (P.id === 'luis' && this.rnd() < 0.6) await this.scroll();
      const items = pg.getByRole('list', { name: 'Productos' }).getByRole('listitem');
      const n = await items.count(); if (!n) continue;
      const stockTxt = await items.allInnerTexts();
      for (const s of stockTxt) { const m = /Stock:\s*(-?\d+)/.exec(s); if (m && Number(m[1]) < 0) await registrarFallo(this, 'stock-negativo', `El catálogo muestra stock ${m[1]}`); }
      const idx = Math.floor(this.rnd() * n); const li = items.nth(idx);
      const nombre = (await li.getAttribute('aria-label')) ?? '';
      const boton = li.getByRole('button', { name: `Agregar ${nombre}` });
      if (await boton.isDisabled()) continue;
      const precioTxt = await li.locator('.precio').innerText(); const precio = Number((precioTxt.match(/S\/\s*([\d.]+)\s*$/) ?? [])[1]);
      this.precios[nombre] = precio;
      await this.clic(boton, { tipo: 'role', role: 'button', name: `Agregar ${nombre}` }, { precio, doble: P.id === 'beto' && this.rnd() < 0.3 });
      carrito.push({ nombre, precio });
    }
    if (!carrito.length) { anotar(this, 'nota', 'No encontró nada que agregar; vuelve a empezar'); return; }
    // venta
    await this.clic(pg.getByRole('link', { name: /Venta/ }), { tipo: 'role', role: 'link', name: 'Venta' });
    await pg.getByRole('heading', { name: 'Venta' }).waitFor();
    if (P.id === 'beto' && this.rnd() < 0.3) { await pg.goBack(); anotar(this, 'ir', 'pulsa «atrás»… y vuelve'); await this.pausa(); await this.clic(pg.getByRole('link', { name: /Venta/ }), { tipo: 'role', role: 'link', name: 'Venta' }); }
    if (await pg.locator('#carrito-vacio').isVisible().catch(() => false)) { anotar(this, 'nota', 'El carrito llegó vacío a Venta; vuelve al catálogo'); return; }
    let total = await this.leerSoles(pg.getByLabel('Total a pagar'));
    if ((P.id === 'luis' || P.id === 'mia' || this.rnd() < 0.4)) {
      const item = carrito[Math.floor(this.rnd() * carrito.length)]; const cant = 2 + Math.floor(this.rnd() * 3);
      const campo = pg.getByLabel(`Cantidad de ${item.nombre}`);
      await this.escribir(campo, { tipo: 'label', name: `Cantidad de ${item.nombre}` }, String(cant)); await campo.press('Tab');
      await dormir(300);
      const fila = pg.getByRole('row', { name: item.nombre }); const sub = await this.leerSoles(fila.getByRole('cell').nth(3));
      const esperado = Math.round(item.precio * cant * 100) / 100;
      if (item.precio && Math.abs(sub - esperado) > 0.011) {
        this.totalReal = null; this.esperaEstado = 422; // el servidor cobrará el total real: la pantalla miente
        await registrarFallo(this, 'promo-aplicada-dos-veces', `${item.nombre} × ${cant}: subtotal S/ ${sub.toFixed(2)}, esperado S/ ${esperado.toFixed(2)} (${item.precio} × ${cant})`, { esperado: `S/ ${esperado.toFixed(2)}`, recibido: `S/ ${sub.toFixed(2)}` });
      } else anotar(this, 'ok', `✓ subtotal correcto: ${item.nombre} × ${cant} = S/ ${sub.toFixed(2)}`);
      total = await this.leerSoles(pg.getByLabel('Total a pagar'));
    }
    // efectivo según la persona
    let efectivo;
    if (P.id === 'rosa') efectivo = this.rnd() < 0.5 ? Math.max(1, Math.floor(total / 10) * 10) : Math.ceil(total / 10) * 10;
    else if (P.id === 'beto') efectivo = Math.round(total * (0.4 + this.rnd() * 1.2));
    else efectivo = Math.ceil(total) + Math.floor(this.rnd() * 20);
    const insuficiente = efectivo < total; if (this.esperaEstado !== 422) this.esperaEstado = insuficiente ? 422 : null;
    await this.escribir(pg.getByLabel('Efectivo recibido (S/)'), { tipo: 'label', name: 'Efectivo recibido (S/)' }, String(efectivo));
    await this.clic(pg.getByRole('button', { name: 'Confirmar venta' }), { tipo: 'role', role: 'button', name: 'Confirmar venta' });
    await pg.locator('#exito, #error').filter({ hasText: /\S/ }).first().waitFor({ timeout: 8000 }).catch(() => {});
    const exito = (await pg.locator('#exito').innerText()).trim(); const alerta = (await pg.locator('#error').innerText()).trim();
    this.esperaEstado = null;
    if (insuficiente) {
      if (/Venta N°/.test(exito)) await registrarFallo(this, 'pago-insuficiente-aceptado', `Escribió S/ ${efectivo} para un total de S/ ${total.toFixed(2)} y la venta se registró: «${exito}»`, { esperado: 'Efectivo insuficiente y ninguna venta', recibido: exito });
      else if (/insuficiente/i.test(alerta)) anotar(this, 'ok', `✓ rechazó el pago corto: «${alerta}»`);
      else await registrarFallo(this, 'sin-aviso', `Pago corto (S/ ${efectivo} < S/ ${total.toFixed(2)}) sin mensaje claro`);
    } else if (/Venta N°/.test(exito)) {
      const m = /Total S\/\s*([\d.]+)/.exec(exito); this.ventas.push(Number(m?.[1] ?? total)); anotar(this, 'ok', `✓ ${exito}`);
    } else if (/el total es S\/ ([\d.]+)/.test(alerta) && Number(RegExp.$1) !== total) anotar(this, 'nota', `consecuencia del bug de promo: la pantalla decía S/ ${total.toFixed(2)} y el servidor cobra S/ ${RegExp.$1}`);
    else await registrarFallo(this, 'venta-no-registrada', `Pagó S/ ${efectivo} ≥ S/ ${total.toFixed(2)} y no se registró: «${alerta || exito || 'sin mensaje'}»`);
    // reporte (Mía siempre; otros a veces)
    if (P.id === 'mia' || this.rnd() < 0.4) {
      await this.clic(pg.getByRole('link', { name: 'Reporte' }), { tipo: 'role', role: 'link', name: 'Reporte' });
      await pg.getByRole('heading', { name: 'Reporte del día' }).waitFor();
      await pg.getByLabel('Total vendido').filter({ hasText: /S\// }).waitFor({ timeout: 8000 }).catch(() => {});
      const totalRep = await this.leerSoles(pg.getByLabel('Total vendido'));
      const suma = Math.round(this.ventas.reduce((s, v) => s + v, 0) * 100) / 100;
      if (Math.abs(totalRep - suma) > 0.011) await registrarFallo(this, 'reporte-no-cuadra', `Reporte dice S/ ${totalRep.toFixed(2)}; mis ventas suman S/ ${suma.toFixed(2)}`, { esperado: `S/ ${suma.toFixed(2)}`, recibido: `S/ ${totalRep.toFixed(2)}` });
      else anotar(this, 'ok', `✓ reporte cuadra: S/ ${totalRep.toFixed(2)}`);
    }
    await this.clic(pg.getByRole('button', { name: 'Salir' }), { tipo: 'role', role: 'button', name: 'Salir' });
    await pg.getByRole('heading', { name: 'Iniciar sesión' }).waitFor({ timeout: 8000 }).catch(() => {}); // deja terminar el cierre de sesión
  }
  async leerSoles(locator) { const t = await locator.innerText(); return Number((t.match(/-?[\d.]+/) ?? [0])[0]); }
  async correr() {
    this.rnd = mulberry32(estado.semilla * 1000 + this.indice);
    try { await this.preparar(); } catch (e) { this.estado = 'error'; this.accion = `No pude preparar: ${e.message}`; emitir('bot', botPublico(this)); return; }
    for (this.viaje = 1; this.viaje <= estado.viajes && this.activo; this.viaje++) {
      anotar(this, 'viaje', `— viaje ${this.viaje} de ${estado.viajes} —`); emitir('bot', botPublico(this));
      try { await this.viajar(); }
      catch (e) {
        if (!this.activo) break;
        const msg = String(e.message).split('\n')[0].slice(0, 180);
        await registrarFallo(this, /Timeout|timeout/.test(msg) ? 'timeout' : 'excepcion', msg);
        await dormir(800);
      }
    }
    if (this.activo) { this.estado = 'terminado'; this.accion = `Terminó ${estado.viajes} viajes · ${this.ventas.length} ventas · ${this.fallos} fallos`; emitir('bot', botPublico(this)); }
  }
  async cerrar() { this.activo = false; try { await this.contexto?.close(); } catch { /* ya cerrado */ } }
}

// ---------- orquestación ----------
let navegador = null; let bots = [];
async function iniciar(opts) {
  if (estado.corriendo) return false;
  Object.assign(estado, { semilla: Number(opts.semilla) || 7, velocidad: VELOCIDAD[opts.velocidad] ? opts.velocidad : 'normal', corregida: !!opts.corregida, viajes: Math.min(20, Math.max(1, Number(opts.viajes) || 3)) });
  estado.corriendo = true; estado.inicio = new Date().toISOString();
  navegador = await chromium.launch({ headless: true });
  bots = PERSONAS.map((p, i) => new Bot(i, p, navegador)); estado.bots = bots;
  emitir('estado', publico());
  Promise.all(bots.map((b) => b.correr())).then(async () => { estado.corriendo = false; try { await navegador.close(); } catch { /* ya */ } emitir('estado', publico()); });
  return true;
}
async function detener() {
  if (!estado.corriendo) return;
  for (const b of bots) await b.cerrar();
  estado.corriendo = false; try { await navegador?.close(); } catch { /* ya */ }
  for (const b of bots) { b.estado = 'detenido'; b.accion = 'Detenido por el instructor'; }
  emitir('estado', publico());
}

// ---------- HTTP ----------
const INDEX = fs.readFileSync(path.join(AQUI, 'index.html'));
const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); };
const leer = (req) => new Promise((r) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => { try { r(JSON.parse(b || '{}')); } catch { r({}); } }); });
const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x'); let ruta = url.pathname.replace(/^\/qa-bots(?=\/|$)/, '');
  if (ruta === '' || ruta === '/' || ruta === '/index.html') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); return res.end(INDEX); }
  if (ruta === '/api/estado') return json(res, 200, publico());
  if (ruta === '/api/eventos') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive', 'x-accel-buffering': 'no' });
    res.write(`event: estado\ndata: ${JSON.stringify(publico())}\n\n`);
    for (const b of estado.bots) if (b.frame) res.write(`event: frame\ndata: ${JSON.stringify({ bot: b.id, data: b.frame, cursor: b.cursor, escribiendo: b.escribiendo })}\n\n`);
    clientes.add(res); const latido = setInterval(() => res.write(': latido\n\n'), 20000);
    req.on('close', () => { clientes.delete(res); clearInterval(latido); }); return;
  }
  if (ruta === '/api/iniciar' && req.method === 'POST') { const ok = await iniciar(await leer(req)); return json(res, ok ? 202 : 409, ok ? { ok: true } : { error: 'Ya hay bots corriendo' }); }
  if (ruta === '/api/detener' && req.method === 'POST') { await detener(); return json(res, 200, { ok: true }); }
  if (ruta === '/api/fallos') return json(res, 200, estado.fallos.map(resumenFallo));
  const m = /^\/api\/fallos\/([a-z0-9-]+)(\/(captura\.png|spec\.ts|conocido))?$/.exec(ruta);
  if (m) {
    const f = estado.fallos.find((x) => x.id === m[1]); if (!f) return json(res, 404, { error: 'No existe' });
    if (m[3] === 'captura.png') { const p = path.join(DIR_FALLOS, f.id + '.png'); if (!fs.existsSync(p)) return json(res, 404, { error: 'Sin captura' }); res.writeHead(200, { 'content-type': 'image/png' }); return fs.createReadStream(p).pipe(res); }
    if (m[3] === 'spec.ts') { res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'content-disposition': `attachment; filename="reproducir-${f.id}.spec.ts"` }); return res.end(generarSpec(f)); }
    if (m[3] === 'conocido' && req.method === 'POST') { f.conocido = !f.conocido; guardarFallo(f); emitir('fallo', resumenFallo(f)); return json(res, 200, resumenFallo(f)); }
    return json(res, 200, { ...f, spec: generarSpec(f) });
  }
  json(res, 404, { error: 'Ruta no encontrada' });
});
servidor.listen(PUERTO, HOST, () => console.log(`Usuarios sintéticos en http://${HOST}:${PUERTO}  · tienda ${BASE} · fallos en ${DIR_FALLOS}`));
process.on('SIGTERM', async () => { await detener(); process.exit(0); });
