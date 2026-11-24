// Robot de pruebas: corre la suite E2E del kit cada N minutos y publica una página de estado con
// reproducción paso a paso de cada prueba (desde la traza de Playwright). Sin dependencias.
//
//   node robot/robot.mjs                      -> cada 10 min, Chromium, app local en modo prueba (la levanta Playwright)
//   CADA_MIN=5 node robot/robot.mjs
//   BASE_URL=https://jmd-learn.online/tienda-sol/ node robot/robot.mjs   -> crea su propia tienda y la mantiene viva
//
// Variables: PUERTO (3200), CADA_MIN (10), MOTOR (chromium | lightpanda | obscura; solo chromium graba la
//            película de cada paso), BASE_URL (opcional), CDP_URL (para lightpanda/obscura), HOST (127.0.0.1;
//            0.0.0.0 dentro de Docker).
// Página: http://localhost:3200 (también sirve bajo /qa-robot/ detrás de nginx).
// API: GET api/estado · POST api/correr · GET api/traza/<n> · GET api/traza/<n>/recurso/<archivo> · reporte/ (HTML de Playwright)

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile, unlink, stat } from 'node:fs/promises';
import { join, dirname, normalize, extname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const aqui = dirname(fileURLToPath(import.meta.url));
const PRUEBAS = process.env.PRUEBAS_DIR ?? join(aqui, '..', 'pruebas');
const HISTORIAL = join(aqui, 'historial');
const PUERTO = Number(process.env.PUERTO ?? 3200);
const HOST = process.env.HOST ?? '127.0.0.1';
const CADA_MS = Math.max(1, Number(process.env.CADA_MIN ?? 10)) * 60_000;
const MOTOR = process.env.MOTOR ?? 'chromium';
const MAX_HISTORIAL = 200;

let corriendo = false;
let progreso = null; // { inicio, motivo, total, hechas, fallidas, actual }
let ultima = null;
let proxima = Date.now() + CADA_MS;
let historial = [];
let cookieTienda = ''; // cuando BASE_URL es /tienda-sol/ (sin código), el robot crea su tienda y la conserva
let baseResuelta = process.env.BASE_URL ?? '';

const fechaLima = (d = new Date()) => new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'medium' }).format(d);

// ---------- tienda propia en la web pública (opcional) ----------
async function resolverBase() {
  const base = process.env.BASE_URL ?? '';
  if (!/\/tienda-sol\/?$/.test(base)) return base;
  if (baseResuelta !== base) {
    try { const r = await fetch(baseResuelta + 'salud', { headers: { cookie: cookieTienda } }); if (r.ok) return baseResuelta; } catch { /* se vuelve a crear */ }
  }
  const r = await fetch(base.replace(/\/?$/, '/'), { redirect: 'manual', headers: { cookie: cookieTienda } });
  const destino = r.headers.get('location');
  const galleta = r.headers.get('set-cookie');
  if (!destino) throw new Error(`No pude crear una tienda en ${base} (HTTP ${r.status})`);
  if (galleta) cookieTienda = galleta.split(';')[0];
  baseResuelta = new URL(destino, base).toString();
  console.log('Tienda del robot:', baseResuelta);
  return baseResuelta;
}

// ---------- una corrida ----------
function ejecutar(cmd, args, opciones, alLeer) {
  return new Promise((resolver) => {
    const p = spawn(cmd, args, { ...opciones, shell: process.platform === 'win32' });
    let salida = '';
    const leer = (d) => { salida += d; alLeer?.(String(d)); };
    p.stdout.on('data', leer);
    p.stderr.on('data', leer);
    p.on('close', (codigo) => resolver({ codigo, salida }));
    p.on('error', (err) => resolver({ codigo: -1, salida: String(err) }));
  });
}

// El reporter «list» imprime una línea por prueba terminada: «  ✓  3 [chromium] › specs/x.spec.ts:5:3 › … (1.2s)».
function leerProgreso(texto) {
  if (!progreso) return;
  for (const linea of texto.split('\n')) {
    const total = /Running (\d+) tests?/.exec(linea);
    if (total) progreso.total = Number(total[1]);
    const hecha = /^\s*(✓|✘|-|×)\s+\d+\s+(.*)$/.exec(linea);
    if (hecha) { progreso.hechas++; if (hecha[1] === '✘' || hecha[1] === '×') progreso.fallidas++; progreso.actual = hecha[2].replace(/\s*\(\d+(\.\d+)?m?s\)\s*$/, '').slice(0, 120); }
  }
}

async function correr(motivo = 'programada') {
  if (corriendo) return false;
  corriendo = true;
  progreso = { inicio: new Date().toISOString(), motivo, total: 0, hechas: 0, fallidas: 0, actual: 'preparando la tienda…' };
  const inicio = Date.now();
  const archivoJson = join(HISTORIAL, 'ultima-corrida.json');
  const resumen = { inicio: new Date(inicio).toISOString(), motivo, motor: MOTOR, baseUrl: '', pasan: 0, fallan: 0, omitidas: 0, inestables: 0, duracionMs: 0, pruebas: [], error: null };
  try {
    const base = await resolverBase();
    resumen.baseUrl = base || `(app local en modo prueba, puerto ${process.env.PUERTO_APP ?? 3100})`;
    const env = { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: archivoJson, CI: '', FORCE_COLOR: '0', PW_TEST_HTML_REPORT_OPEN: 'never' };
    if (base) env.BASE_URL = base; else delete env.BASE_URL;
    if (process.env.PUERTO_APP) env.PUERTO = process.env.PUERTO_APP; else delete env.PUERTO; // PUERTO es del robot, no de la app
    // Con Chromium usa el proyecto «chromium-robot»: deja trace.zip con la película de la pantalla
    // (sin instantáneas del DOM, que son lo lento) y sin las pruebas @visual (no tienen base en el robot).
    const proyectos = ['api', MOTOR === 'chromium' ? 'chromium-robot' : MOTOR].flatMap((p) => ['--project', p]);
    const args = ['playwright', 'test', ...proyectos, '--reporter=list,json,html', '--retries=0'];
    cacheTrazas.clear();
    const r = await ejecutar('npx', args, { cwd: PRUEBAS, env }, leerProgreso);
    let json = null;
    try { json = JSON.parse(await readFile(archivoJson, 'utf8')); } catch { resumen.error = 'Playwright no dejó reporte JSON. Salida:\n' + r.salida.slice(-1500); }
    if (json) {
      const recorrer = (suite, archivo) => {
        for (const s of suite.suites ?? []) recorrer(s, s.file ?? archivo);
        for (const spec of suite.specs ?? []) for (const t of spec.tests ?? []) {
          const res = t.results?.[t.results.length - 1] ?? {};
          const estado = t.status === 'expected' ? 'pasa' : t.status === 'skipped' ? 'omitida' : t.status === 'flaky' ? 'inestable' : 'falla';
          const traza = res.attachments?.find((a) => a.name === 'trace' && a.path)?.path ?? null;
          resumen.pruebas.push({ id: /^([A-Z0-9-]+)/.exec(spec.title)?.[1] ?? spec.title, titulo: spec.title, archivo: spec.file ?? archivo, proyecto: t.projectName, estado, duracionMs: res.duration ?? 0, error: res.error?.message?.replace(/\u001b\[[0-9;]*m/g, '').split('\n').slice(0, 4).join('\n') ?? null, traza });
        }
      };
      for (const s of json.suites ?? []) recorrer(s, s.file);
      resumen.pasan = json.stats?.expected ?? 0; resumen.fallan = json.stats?.unexpected ?? 0; resumen.omitidas = json.stats?.skipped ?? 0; resumen.inestables = json.stats?.flaky ?? 0;
    }
  } catch (err) {
    resumen.error = String(err.message ?? err);
  }
  resumen.duracionMs = Date.now() - inicio;
  resumen.fin = new Date().toISOString();
  ultima = resumen;
  const nombre = resumen.inicio.replace(/[:.]/g, '-') + '.json';
  await writeFile(join(HISTORIAL, nombre), JSON.stringify(resumen));
  historial.push({ archivo: nombre, inicio: resumen.inicio, motivo, pasan: resumen.pasan, fallan: resumen.fallan, omitidas: resumen.omitidas, duracionMs: resumen.duracionMs, error: resumen.error ? 'sí' : null });
  while (historial.length > MAX_HISTORIAL) { const viejo = historial.shift(); await unlink(join(HISTORIAL, viejo.archivo)).catch(() => {}); }
  console.log(`${fechaLima()} · ${motivo} · ${resumen.pasan} pasan · ${resumen.fallan} fallan · ${(resumen.duracionMs / 1000).toFixed(1)} s${resumen.error ? ' · ERROR: ' + resumen.error.split('\n')[0] : ''}`);
  corriendo = false; progreso = null;
  proxima = Date.now() + CADA_MS;
  return true;
}

// ---------- lector mínimo de ZIP (trace.zip) ----------
// Lee el directorio central del final del archivo; entradas guardadas (0) o deflate (8).
function leerZip(buf) {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('ZIP sin directorio central');
  const n = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entradas = new Map();
  for (let i = 0; i < n; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const metodo = buf.readUInt16LE(p + 10), comprimido = buf.readUInt32LE(p + 20);
    const ln = buf.readUInt16LE(p + 28), lx = buf.readUInt16LE(p + 30), lc = buf.readUInt16LE(p + 32), local = buf.readUInt32LE(p + 42);
    entradas.set(buf.toString('utf8', p + 46, p + 46 + ln), { metodo, comprimido, local });
    p += 46 + ln + lx + lc;
  }
  return (nombre) => {
    const e = entradas.get(nombre);
    if (!e) return null;
    const ln = buf.readUInt16LE(e.local + 26), lx = buf.readUInt16LE(e.local + 28);
    const datos = buf.subarray(e.local + 30 + ln + lx, e.local + 30 + ln + lx + e.comprimido);
    return e.metodo === 8 ? inflateRawSync(datos) : Buffer.from(datos);
  };
}

// Convierte los selectores internos de Playwright en algo que lee una persona.
const ROLES = { button: 'botón', link: 'enlace', heading: 'título', textbox: 'campo', searchbox: 'buscador', checkbox: 'casilla', list: 'lista', listitem: 'ítem', spinbutton: 'campo numérico' };
function describirSelector(sel = '') {
  const m = /(?:internal:)?role=(\w+)\[name=(?:"(.+?)"|\/(.+?)\/)[is]?\]/.exec(sel); if (m) return `${ROLES[m[1]] ?? m[1]} «${m[2] ?? m[3]}»`;
  const l = /(?:internal:)?label="(.+?)"[is]?/.exec(sel); if (l) return `campo «${l[1]}»`;
  const t = /(?:internal:)?text="(.+?)"[is]?/.exec(sel); if (t) return `texto «${t[1]}»`;
  const h = /^(.+?) >> internal:has-text=/.exec(sel); if (h) return h[1];
  const id = /internal:testid=\[data-testid="(.+?)"\]/.exec(sel); if (id) return `testid «${id[1]}»`;
  return sel.replace(/internal:/g, '').replace(/ >> /g, ' › ');
}

function valorEsperado(p) {
  const v = p.expectedValue?.value;
  if (!v || v.v === 'undefined') return '';
  if (v.s !== undefined) return ` = «${v.s}»`;
  if (v.r?.s) return ` ~ /${v.r.s}/`;
  if (v.n !== undefined) return ` = ${v.n}`;
  return '';
}

function describirAccion(e) {
  const p = e.params ?? {};
  switch (e.method) {
    case 'goto': return `Abrir ${p.url}`;
    case 'fill': return `Escribir «${p.value}» en ${describirSelector(p.selector)}`;
    case 'type': case 'pressSequentially': return `Teclear «${p.text}» en ${describirSelector(p.selector)}`;
    case 'click': return `Clic en ${describirSelector(p.selector)}`;
    case 'dblclick': return `Doble clic en ${describirSelector(p.selector)}`;
    case 'press': return `Pulsar ${p.key} en ${describirSelector(p.selector)}`;
    case 'check': return `Marcar ${describirSelector(p.selector)}`;
    case 'uncheck': return `Desmarcar ${describirSelector(p.selector)}`;
    case 'selectOption': return `Elegir opción en ${describirSelector(p.selector)}`;
    case 'hover': return `Pasar el ratón por ${describirSelector(p.selector)}`;
    case 'reload': return 'Recargar la página';
    case 'expect': return `Comprobar que ${describirSelector(p.selector)} ${EXPR[p.expression] ?? (p.expression ?? '').replace(/^to\./, '').replace(/\./g, ' ')}${valorEsperado(p)}${p.isNot ? ' (negado)' : ''}`;
    default: return `${e.method} ${describirSelector(p.selector ?? p.url ?? '')}`.trim();
  }
}

const EXPR = { 'to.be.visible': 'esté visible', 'to.have.text': 'diga', 'to.have.count': 'tenga tantos', 'to.be.enabled': 'esté habilitado', 'to.have.value': 'valga', 'to.contain.text': 'contenga', 'to.have.url': 'tenga la URL', 'to.be.checked': 'esté marcado', 'to.be.hidden': 'esté oculto' };
const ACCIONES = new Set(['goto', 'fill', 'type', 'pressSequentially', 'click', 'dblclick', 'press', 'check', 'uncheck', 'selectOption', 'hover', 'reload', 'expect', 'setInputFiles']);

// Devuelve las acciones de una traza con el fotograma de la pantalla antes y después de cada una.
function leerTraza(abrir) {
  const acciones = [], cuadros = [], abiertas = new Map();
  for (const archivo of ['0-trace.trace', '1-trace.trace', '2-trace.trace', '3-trace.trace', '4-trace.trace', 'trace.trace']) {
    const txt = abrir(archivo); if (!txt) continue;
    for (const linea of txt.toString('utf8').split('\n')) {
      if (!linea) continue;
      let e; try { e = JSON.parse(linea); } catch { continue; }
      if (e.type === 'screencast-frame') cuadros.push({ t: e.timestamp, archivo: e.file });
      else if (e.type === 'before' && ACCIONES.has(e.method) && e.class !== 'Test') { const a = { titulo: describirAccion(e), metodo: e.method, inicio: e.startTime, fin: null, error: null }; abiertas.set(e.callId, a); acciones.push(a); }
      else if (e.type === 'after' && abiertas.has(e.callId)) { const a = abiertas.get(e.callId); a.fin = e.endTime; if (e.error) a.error = e.error.message ?? 'falló'; }
    }
  }
  acciones.sort((a, b) => a.inicio - b.inicio);
  cuadros.sort((a, b) => a.t - b.t);
  const ultimoAntesDe = (t) => { let c = null; for (const q of cuadros) { if (q.t <= t) c = q; else break; } return c; };
  for (const a of acciones) {
    a.antes = ultimoAntesDe(a.inicio)?.archivo ?? cuadros[0]?.archivo ?? null;
    a.despues = ultimoAntesDe((a.fin ?? a.inicio) + 400)?.archivo ?? a.antes;
    a.duracionMs = a.fin ? Math.round(a.fin - a.inicio) : null;
  }
  return { acciones, cuadros: cuadros.length };
}

// ---------- página de estado ----------
const PAGINA = `<!doctype html><html lang="es-PE"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Robot de pruebas · Tienda Sol</title>
<style>
:root{--ok:#1b7f3b;--bad:#b3261e;--line:#e3e6ee;--muted:#5b6472;--acc:#f5a623}*{box-sizing:border-box}
body{margin:0;font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;background:#f4f5f9;color:#1d2433}
header{background:#171b28;color:#fff;padding:16px 22px;display:flex;gap:14px;align-items:center;flex-wrap:wrap}
header h1{margin:0;font-size:20px}header h1 b{color:var(--acc)}header small{color:#aab2c5}
main{padding:18px 22px;max-width:1100px;margin:auto}
.estado{display:flex;gap:16px;align-items:center;flex-wrap:wrap;background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin-bottom:14px}
.sem{font-size:34px;font-weight:800;padding:6px 18px;border-radius:12px;color:#fff;background:var(--ok)}.sem.bad{background:var(--bad);color:#fff}.sem.gris{background:#8a93a6;color:#fff}
.estado p{margin:0;color:var(--muted)}.estado b{color:#1d2433}
button{font:600 15px system-ui,sans-serif;padding:10px 18px;border-radius:10px;border:0;background:var(--acc);cursor:pointer;margin-left:auto}button:disabled{opacity:.55;cursor:default}
.prog{display:none;margin:0 0 14px;background:#fff7e6;border:1px solid #f5d79a;border-radius:12px;padding:12px 16px}.prog.on{display:block}.barra{height:8px;background:#eee;border-radius:99px;overflow:hidden;margin-top:8px}.barra i{display:block;height:100%;background:var(--acc);width:0;transition:width .4s}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:0 0 14px}.kpi{background:#fff;border:1px solid var(--line);border-radius:12px;padding:10px 14px}.kpi b{display:block;font-size:28px}.ok{color:var(--ok)}.bad{color:var(--bad)}.kpi small{color:var(--muted)}
h2{font-size:17px;margin:18px 0 8px}h2 small{font-weight:400;color:var(--muted)}
.tira{display:flex;gap:3px;height:40px;align-items:stretch;background:#fff;border:1px solid var(--line);border-radius:12px;padding:8px}.tira i{flex:1;background:var(--ok);border-radius:3px;min-width:5px;max-width:28px}.tira i.bad{background:var(--bad)}.tira i.err{background:#9aa0ad}.tira i.vacio{background:#eceef3;max-width:none}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden;font-size:14px}th,td{padding:8px 10px;border-bottom:1px solid #eef0f4;text-align:left;vertical-align:top}th{background:#f1f3f8;font-size:13px}td:first-child{white-space:nowrap;font-family:ui-monospace,monospace;font-size:13px}
td.e{font-weight:700;white-space:nowrap}td .err{display:block;color:var(--bad);font:12px/1.4 ui-monospace,monospace;white-space:pre-wrap;margin-top:4px}
.play{background:#171b28;color:#fff;border:0;border-radius:8px;padding:5px 10px;font-size:13px;margin:0;white-space:nowrap}
details{margin-top:14px}summary{cursor:pointer;color:var(--muted)}
.modal{position:fixed;inset:0;background:#0f1220f2;display:none;z-index:9;padding:18px}.modal.on{display:grid;grid-template-rows:auto minmax(0,1fr);gap:10px}
.modal header{background:none;padding:0;gap:10px}.modal h1{font-size:17px}.cerrar{margin-left:auto;background:#fff;color:#171b28;padding:6px 12px}
.esc{display:grid;grid-template-columns:minmax(260px,380px) minmax(0,1fr);gap:14px;min-height:0;overflow:hidden}
.pasos{overflow:auto;background:#1b2030;border-radius:12px;padding:8px}.paso{display:grid;grid-template-columns:28px 1fr auto;gap:8px;padding:8px 10px;border-radius:8px;color:#dbe0ee;cursor:pointer;font-size:14px;align-items:start}.paso:hover{background:#262c40}.paso.act{background:var(--acc);color:#171b28}.paso.bad{color:#ff9f9a}.paso.act.bad{background:var(--bad);color:#fff}.paso small{opacity:.7}
.visor{display:grid;grid-template-rows:minmax(0,1fr) auto;gap:10px;min-height:0}.visor>.lienzo{min-height:0;height:100%;display:grid}.visor img{width:100%;height:100%;object-fit:contain;background:#000;border-radius:12px;border:1px solid #2c3450}.visor .sin{display:grid;place-items:center;color:#aab2c5;background:#1b2030;border-radius:12px;min-height:240px}
.ctrl{display:flex;gap:8px;align-items:center;color:#fff;flex-wrap:wrap}.ctrl>button{flex:0 0 auto;width:auto;margin:0;padding:8px 14px}.ctrl .err{background:#3a1a1a;color:#ffb4ae;padding:8px 12px;border-radius:8px;font:13px/1.4 ui-monospace,monospace;white-space:pre-wrap;flex:1 1 100%}
@media(max-width:760px){.esc{grid-template-columns:1fr;grid-template-rows:180px minmax(0,1fr)}.sem{font-size:24px}header h1{font-size:17px}main{padding:12px}table{display:block;overflow-x:auto}.estado{padding:12px}}
</style>
<header><h1>🤖 Robot de pruebas · <b>Tienda Sol</b></h1><small id="motor"></small><button id="correr">▶ Correr ahora</button></header>
<main>
<div class="estado"><span id="sem" class="sem gris">…</span><p id="resumen">Cargando…</p></div>
<div class="prog" id="prog"><b id="progTxt">Corriendo…</b><div class="barra"><i id="progBar"></i></div></div>
<div class="kpis"><div class="kpi"><b id="pasan" class="ok">–</b><small>pasan</small></div><div class="kpi"><b id="fallan" class="bad">–</b><small>fallan</small></div><div class="kpi"><b id="dur">–</b><small>duró la última corrida</small></div><div class="kpi"><b id="prox">–</b><small>próxima corrida</small></div><div class="kpi"><b id="disp">–</b><small>corridas en verde (24 h)</small></div></div>
<h2>Últimas 24 horas <small>· cada cuadro es una corrida: verde todo pasó · rojo algo falló · gris el robot no pudo correr</small></h2>
<div class="tira" id="tira"></div>
<h2>Última corrida <small id="base"></small></h2>
<table><thead><tr><th>ID</th><th>Prueba</th><th>Estado</th><th>Tiempo</th><th>Ver</th></tr></thead><tbody id="filas"></tbody></table>
<p id="error" class="bad" style="white-space:pre-wrap"></p>
<details><summary>Historial de corridas</summary><table style="margin-top:8px"><thead><tr><th>Hora (Lima)</th><th>Motivo</th><th>Pasan</th><th>Fallan</th><th>Duración</th></tr></thead><tbody id="hist"></tbody></table></details>
<p><small><a id="reporte" href="reporte/" target="_blank">Reporte HTML completo de Playwright ↗</a></small></p>
</main>
<div class="modal" id="modal"><header><h1 id="mTit">Reproducción</h1><small id="mSub"></small><button class="cerrar" id="cerrar">✕ Cerrar</button></header>
<div class="esc"><div class="pasos" id="pasos"></div><div class="visor"><div class="lienzo"><img id="cuadro" alt="pantalla en este paso" hidden><div class="sin" id="sin">Cargando la traza…</div></div>
<div class="ctrl"><button id="ant">‹ Anterior</button><button id="auto">▶ Reproducir</button><button id="sig">Siguiente ›</button><span id="pos"></span><div class="err" id="mErr" hidden></div></div></div></div></div>
<script>
const $=id=>document.getElementById(id);const hora=s=>new Date(s).toLocaleTimeString('es-PE',{timeZone:'America/Lima',hour:'2-digit',minute:'2-digit',second:'2-digit'});
let estado=null;
async function pintar(){try{estado=await (await fetch('api/estado',{cache:'no-store'})).json()}catch{$('resumen').textContent='No se pudo leer el estado del robot.';return}
const e=estado;$('motor').textContent='motor '+e.motor+' · corre cada '+e.cadaMin+' min';
$('correr').disabled=!!e.corriendo;$('correr').textContent=e.corriendo?'⏳ Corriendo…':'▶ Correr ahora';
$('prog').classList.toggle('on',!!e.corriendo);
if(e.corriendo&&e.progreso){const p=e.progreso;const seg=Math.round((Date.now()-new Date(p.inicio))/1000);$('progTxt').textContent='Corriendo '+(p.total?p.hechas+' de '+p.total+' pruebas':'')+' · '+seg+' s'+(p.fallidas?' · '+p.fallidas+' en rojo':'')+' · '+p.actual;$('progBar').style.width=(p.total?Math.max(3,100*p.hechas/p.total):3)+'%'}
if(!e.ultima){$('resumen').textContent=e.corriendo?'Primera corrida en marcha…':'Todavía no corrió.';return}
const u=e.ultima,rojo=u.fallan||u.error;$('sem').className='sem '+(u.error?'gris':rojo?'bad':'');$('sem').textContent=u.error?'SIN DATOS':rojo?'ROJO':'VERDE';
$('resumen').innerHTML='<b>'+(u.error?'El robot no pudo correr la suite':rojo?u.fallan+' prueba(s) fallaron de '+(u.pasan+u.fallan):'Las '+u.pasan+' pruebas pasaron')+'</b><br>Última corrida: '+hora(u.fin)+' · motivo: '+u.motivo+' · motor: '+u.motor;
$('pasan').textContent=u.pasan;$('fallan').textContent=u.fallan;$('dur').textContent=(u.duracionMs/1000).toFixed(0)+' s';$('base').textContent='· '+u.baseUrl;
const h=e.historial.filter(x=>Date.now()-new Date(x.inicio)<864e5);const verdes=h.filter(x=>!x.fallan&&!x.error).length;$('disp').textContent=h.length?Math.round(100*verdes/h.length)+' %':'–';
$('prox').textContent=e.corriendo?'ahora':'en '+Math.max(0,Math.round((new Date(e.proxima)-Date.now())/60000))+' min';
$('tira').innerHTML=(h.length?h:[]).map(x=>'<i class="'+(x.error?'err':x.fallan?'bad':'')+'" title="'+hora(x.inicio)+' · '+x.pasan+' pasan · '+x.fallan+' fallan"></i>').join('')||'<i class="vacio"></i>';
$('filas').innerHTML=u.pruebas.map((p,i)=>'<tr><td>'+p.id+'</td><td>'+p.titulo.replace(/^[A-Z0-9-]+ /,'')+' <small style="color:var(--muted)">'+p.proyecto+'</small>'+(p.error?'<span class="err">'+p.error.replace(/</g,'&lt;')+'</span>':'')+'</td><td class="e '+(p.estado==='pasa'?'ok':p.estado==='omitida'?'':'bad')+'">'+(p.estado==='pasa'?'✓ pasa':p.estado==='omitida'?'– omitida':'✗ falla')+'</td><td>'+(p.duracionMs/1000).toFixed(1)+' s</td><td>'+(p.traza?'<button class="play" data-i="'+i+'">▶ Reproducir</button>':'<small style="color:var(--muted)">sin película</small>')+'</td></tr>').join('');
$('error').textContent=u.error??'';
$('hist').innerHTML=e.historial.slice().reverse().slice(0,30).map(x=>'<tr><td>'+hora(x.inicio)+'</td><td>'+(x.motivo??'')+'</td><td class="ok">'+x.pasan+'</td><td class="'+(x.fallan?'bad':'')+'">'+x.fallan+'</td><td>'+(x.duracionMs/1000).toFixed(0)+' s</td></tr>').join('');
document.querySelectorAll('.play').forEach(b=>b.onclick=()=>abrir(Number(b.dataset.i)));}
$('correr').onclick=async()=>{$('correr').disabled=true;$('correr').textContent='⏳ Arrancando…';$('prog').classList.add('on');$('progTxt').textContent='Arrancando la corrida…';$('progBar').style.width='3%';
try{const r=await fetch('api/correr',{method:'POST'});if(r.status===409)$('progTxt').textContent='Ya hay una corrida en marcha; espera a que termine.'}catch{$('progTxt').textContent='No se pudo hablar con el robot.'}setTimeout(pintar,700)};
pintar();setInterval(()=>{if(estado&&estado.corriendo)pintar()},2000);setInterval(pintar,6000);
// ---- reproductor ----
let traza=null,idx=0,timer=null,trazaN=0;
async function abrir(i){const p=estado.ultima.pruebas[i];trazaN=i;$('modal').classList.add('on');$('mTit').textContent='▶ '+p.titulo;$('mSub').textContent=p.estado==='pasa'?'pasó en '+(p.duracionMs/1000).toFixed(1)+' s':'falló';$('pasos').innerHTML='';$('cuadro').hidden=true;$('sin').hidden=false;$('sin').textContent='Cargando la traza…';$('mErr').hidden=true;
try{traza=await (await fetch('api/traza/'+i)).json()}catch{traza=null}
if(!traza||!traza.acciones||!traza.acciones.length){$('sin').textContent='Esta prueba no dejó película (las pruebas de API no abren navegador).';return}
$('pasos').innerHTML=traza.acciones.map((a,j)=>'<div class="paso'+(a.error?' bad':'')+'" data-j="'+j+'"><span>'+(j+1)+'</span><span>'+a.titulo.replace(/</g,'&lt;')+'</span><small>'+(a.duracionMs!=null?a.duracionMs+' ms':'')+'</small></div>').join('');
document.querySelectorAll('.paso').forEach(d=>d.onclick=()=>ir(Number(d.dataset.j)));ir(0)}
function ir(j){if(!traza)return;idx=Math.max(0,Math.min(traza.acciones.length-1,j));const a=traza.acciones[idx];document.querySelectorAll('.paso').forEach((d,k)=>{d.classList.toggle('act',k===idx);if(k===idx)d.scrollIntoView({block:'nearest'})});
const f=a.despues||a.antes;if(f){$('cuadro').src='api/traza/'+trazaN+'/recurso/'+f;$('cuadro').hidden=false;$('sin').hidden=true}else{$('cuadro').hidden=true;$('sin').hidden=false;$('sin').textContent='Sin fotograma para este paso.'}
$('pos').textContent=(idx+1)+' / '+traza.acciones.length;const p=estado.ultima.pruebas[trazaN];$('mErr').hidden=!a.error;if(a.error)$('mErr').textContent='✗ Falló aquí: '+(p.error||a.error);}
$('ant').onclick=()=>ir(idx-1);$('sig').onclick=()=>ir(idx+1);$('cerrar').onclick=()=>{$('modal').classList.remove('on');clearInterval(timer);timer=null;$('auto').textContent='▶ Reproducir'};
$('auto').onclick=()=>{if(timer){clearInterval(timer);timer=null;$('auto').textContent='▶ Reproducir';return}$('auto').textContent='⏸ Pausar';if(idx>=traza.acciones.length-1)ir(0);timer=setInterval(()=>{if(idx>=traza.acciones.length-1){clearInterval(timer);timer=null;$('auto').textContent='▶ Reproducir';return}ir(idx+1)},900)};
document.addEventListener('keydown',e=>{if(!$('modal').classList.contains('on'))return;if(e.key==='ArrowRight')ir(idx+1);if(e.key==='ArrowLeft')ir(idx-1);if(e.key==='Escape')$('cerrar').click()});
</script></html>`;

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.zip': 'application/zip', '.json': 'application/json', '.md': 'text/markdown', '.webm': 'video/webm', '.svg': 'image/svg+xml' };
async function estatico(res, raiz, ruta) {
  const archivo = normalize(join(raiz, ruta === '' || ruta === '/' ? 'index.html' : ruta));
  if (!archivo.startsWith(raiz)) { res.writeHead(404); return res.end(); }
  try {
    if ((await stat(archivo)).isDirectory()) return estatico(res, raiz, join(ruta, 'index.html'));
    res.writeHead(200, { 'content-type': TIPOS[extname(archivo)] ?? 'application/octet-stream' });
    res.end(await readFile(archivo));
  } catch { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('No hay reporte todavía. Espera la primera corrida.'); }
}

const rutaTraza = (p) => (p?.traza ? (isAbsolute(p.traza) ? p.traza : join(PRUEBAS, p.traza)) : null);
const cacheTrazas = new Map(); // ruta -> { acciones, cuadros, abrir }

async function trazaDe(n) {
  const ruta = rutaTraza(ultima?.pruebas?.[n]);
  if (!ruta) return null;
  if (!cacheTrazas.has(ruta)) {
    const abrir = leerZip(await readFile(ruta));
    cacheTrazas.set(ruta, { ...leerTraza(abrir), abrir });
    if (cacheTrazas.size > 30) cacheTrazas.delete(cacheTrazas.keys().next().value);
  }
  return cacheTrazas.get(ruta);
}

await mkdir(HISTORIAL, { recursive: true });
for (const f of (await readdir(HISTORIAL)).filter((f) => /^\d{4}-.*\.json$/.test(f)).sort().slice(-MAX_HISTORIAL)) {
  try { const r = JSON.parse(await readFile(join(HISTORIAL, f), 'utf8')); historial.push({ archivo: f, inicio: r.inicio, motivo: r.motivo, pasan: r.pasan, fallan: r.fallan, omitidas: r.omitidas, duracionMs: r.duracionMs, error: r.error ? 'sí' : null }); if (!ultima || r.inicio > ultima.inicio) ultima = r; } catch { /* archivo roto */ }
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const ruta = url.pathname.replace(/^\/qa-robot(?=\/|$)/, '') || '/'; // también sirve bajo /qa-robot/ detrás de nginx
  const json = (codigo, cuerpo) => { res.writeHead(codigo, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(cuerpo)); };
  try {
    if (ruta === '/api/estado') return json(200, { corriendo, progreso, motor: MOTOR, cadaMin: CADA_MS / 60_000, proxima: new Date(proxima).toISOString(), ultima: ultima && { ...ultima, pruebas: ultima.pruebas.map((p) => ({ ...p, traza: p.traza && p.proyecto !== 'api' ? true : null })) }, historial });
    if (ruta === '/api/correr' && req.method === 'POST') { if (corriendo) return json(409, { ok: false, motivo: 'ya hay una corrida en marcha' }); correr('manual'); return json(202, { ok: true }); }
    const t = /^\/api\/traza\/(\d+)(?:\/recurso\/(.+))?$/.exec(ruta);
    if (t) {
      const traza = await trazaDe(Number(t[1]));
      if (!traza) return json(404, { error: 'esa prueba no tiene traza' });
      if (!t[2]) return json(200, { acciones: traza.acciones, cuadros: traza.cuadros });
      const nombre = decodeURIComponent(t[2]);
      if (!/^(screencast|resources)\/[\w@.-]+$/.test(nombre)) return json(400, { error: 'recurso inválido' });
      const datos = traza.abrir(nombre);
      if (!datos) return json(404, { error: 'no está en la traza' });
      res.writeHead(200, { 'content-type': TIPOS[extname(nombre)] ?? 'application/octet-stream', 'cache-control': 'public, max-age=3600' }); return res.end(datos);
    }
    if (ruta === '/salud') return json(200, { estado: 'ok', corriendo, ultima: ultima?.fin ?? null });
    if (ruta.startsWith('/reporte')) return estatico(res, join(PRUEBAS, 'playwright-report'), ruta.replace(/^\/reporte\/?/, ''));
    if (ruta === '/' || ruta === '/index.html') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); return res.end(PAGINA); }
    res.writeHead(404, { 'content-type': 'text/plain' }); res.end('No encontrado');
  } catch (err) { json(500, { error: String(err.message ?? err) }); }
}).listen(PUERTO, HOST, () => console.log(`Robot de pruebas en http://localhost:${PUERTO}  · motor ${MOTOR} · cada ${CADA_MS / 60_000} min`));

correr('arranque');
setInterval(() => { if (Date.now() >= proxima) correr('programada'); }, 15_000);
for (const senal of ['SIGINT', 'SIGTERM']) process.on(senal, () => process.exit(0));
