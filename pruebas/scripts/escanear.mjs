// Escáner de Tienda Sol: recorre la tienda que le des en BASE_URL, entra como cajero y describe cada pantalla
// para que puedas escribir pruebas sin adivinar localizadores.
//
// Uso (desde pruebas/):
//   BASE_URL=https://jmd-learn.online/tienda-sol/TU_CODIGO npm run escanear
//   BASE_URL=http://localhost:3000 npm run escanear            (tienda local, opcional)
//
// Escribe:
//   docs/mapa-tienda.md            mapa legible: pantallas, elementos con su mejor localizador, formularios y API
//   docs/mapa-tienda.json          lo mismo en JSON (para la IA o para otros scripts)
//   pages/generado/<Pantalla>Page.ts   esqueletos de Page Object (solo localizadores y métodos TODO)
//
// No modifica tus page objects de pages/*.ts: compara y copia lo que te sirva.

import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, '..', '..');
const BASE = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '') + '/';
const USUARIO = process.env.USUARIO ?? 'cajero';
const CLAVE = process.env.CLAVE ?? 'cajero123';

// ---------- navegador: el Chromium de Playwright o, si falta, el Chrome instalado ----------
async function abrirNavegador() {
  try { return await chromium.launch(); }
  catch (e) {
    try { return await chromium.launch({ channel: 'chrome' }); }
    catch { throw new Error('No hay navegador. Corre: npx playwright install chromium\n' + e.message.split('\n')[0]); }
  }
}

// ---------- inventario de una pantalla (se ejecuta DENTRO de la página) ----------
function inventario() {
  const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const nombreAccesible = (el) => {
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
    const por = el.getAttribute('aria-labelledby');
    if (por) return texto(document.getElementById(por));
    if (el.id) { const l = document.querySelector(`label[for="${el.id}"]`); if (l) return texto(l); }
    const padre = el.closest('label'); if (padre) return texto(padre).replace(texto(el), '').trim();
    if (el.placeholder) return el.placeholder;
    return texto(el);
  };
  const rol = (el) => {
    if (el.getAttribute('role')) return el.getAttribute('role');
    const t = el.tagName.toLowerCase(); const tipo = (el.type || '').toLowerCase();
    if (t === 'a' && el.href) return 'link';
    if (t === 'button' || (t === 'input' && ['button', 'submit', 'reset'].includes(tipo))) return 'button';
    if (t === 'input') return { checkbox: 'checkbox', radio: 'radio', number: 'spinbutton', search: 'searchbox', range: 'slider', password: 'textbox' }[tipo] ?? 'textbox';
    if (t === 'select') return 'combobox';
    if (t === 'textarea') return 'textbox';
    if (/^h[1-6]$/.test(t)) return 'heading';
    if (t === 'table') return 'table';
    return t;
  };
  const q = 'a[href], button, input:not([type=hidden]), select, textarea, [role="button"], [role="link"], h1, h2, [role="status"], [role="alert"], table';
  const elementos = [];
  for (const el of document.querySelectorAll(q)) {
    const r = rol(el); const nombre = nombreAccesible(el); const testid = el.getAttribute('data-testid');
    const esCampo = ['textbox', 'spinbutton', 'searchbox', 'combobox', 'checkbox', 'radio'].includes(r);
    let localizador;
    if (testid) localizador = `getByTestId('${testid}')`;
    else if (esCampo && nombre && (document.querySelector(`label[for="${el.id}"]`) || el.closest('label'))) localizador = `getByLabel('${nombre}')`;
    else if (nombre && r !== 'table') localizador = `getByRole('${r}', { name: '${nombre.replace(/'/g, "\\'")}' })`;
    else if (el.id) localizador = `locator('#${el.id}')`;
    else localizador = `locator('${el.tagName.toLowerCase()}')`;
    const tipoCampo = el.tagName.toLowerCase() === 'input' ? el.type : el.tagName.toLowerCase();
    const visible = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    elementos.push({ rol: r, nombre, localizador, tipo: tipoCampo, id: el.id || undefined, testid: testid || undefined, visible, href: el.href ? el.getAttribute('href') : undefined });
  }
  const formularios = [...document.querySelectorAll('form')].map((f) => ({
    nombre: nombreAccesible(f) || f.id || 'formulario',
    campos: [...f.querySelectorAll('input:not([type=hidden]), select, textarea')].map((c) => `${nombreAccesible(c) || c.name || c.id} (${c.type || c.tagName.toLowerCase()})`),
    boton: texto(f.querySelector('button[type=submit], button:not([type]), input[type=submit]')),
  }));
  return { titulo: document.title, h1: texto(document.querySelector('h1')), elementos, formularios };
}

// ---------- recorrido ----------
const navegador = await abrirNavegador();
const contexto = await navegador.newContext({ viewport: { width: 1280, height: 720 }, locale: 'es-PE' });
const pagina = await contexto.newPage();
const llamadasApi = new Map(); // pantalla -> Set('GET /api/x')
let pantallaActual = 'login';
pagina.on('request', (r) => {
  const u = new URL(r.url());
  if (!u.pathname.includes('/api/')) return;
  const ruta = u.pathname.slice(u.pathname.indexOf('/api/'));
  if (!llamadasApi.has(pantallaActual)) llamadasApi.set(pantallaActual, new Set());
  llamadasApi.get(pantallaActual).add(`${r.method()} ${ruta}`);
});

const pantallas = [];
async function escanear(nombre, ruta) {
  pantallaActual = nombre;
  if (ruta) await pagina.goto(new URL(ruta, BASE).href, { waitUntil: 'networkidle' });
  else await pagina.waitForLoadState('networkidle');
  const inv = await pagina.evaluate(inventario);
  const aria = await pagina.locator('body').ariaSnapshot();
  const enlaces = inv.elementos.filter((e) => e.rol === 'link' && e.href && !/^https?:|^mailto:|^#/.test(e.href)).map((e) => new URL(e.href, pagina.url()).href);
  pantallas.push({ nombre, url: pagina.url(), ...inv, aria, enlaces, api: [] });
  return enlaces;
}

console.log(`Escaneando ${BASE} …`);
await pagina.goto(BASE, { waitUntil: 'networkidle' });
await escanear('login');
const usuario = pagina.getByLabel('Usuario'); const clave = pagina.getByLabel('Clave');
if (await usuario.count()) {
  pantallaActual = '__tras_login__'; // las llamadas que dispare el login se atribuyen a la pantalla siguiente
  await usuario.fill(USUARIO); await clave.fill(CLAVE);
  await pagina.getByRole('button', { name: /Ingresar|Entrar/ }).click();
  // Esperar a que de verdad cambie de pantalla (el click devuelve antes de navegar).
  await pagina.waitForURL((u) => u.href !== BASE && !u.href.endsWith('index.html'), { timeout: 15_000 }).catch(() => {});
  await pagina.waitForLoadState('networkidle');
}
const vistos = new Set(['login']);
const cola = [{ nombre: (new URL(pagina.url()).pathname.split('/').pop() || 'catalogo').replace(/\.html$/, '') || 'catalogo', ruta: null }];
while (cola.length) {
  const { nombre, ruta } = cola.shift();
  if (vistos.has(nombre)) continue;
  vistos.add(nombre);
  if (llamadasApi.has('__tras_login__')) { llamadasApi.set(nombre, llamadasApi.get('__tras_login__')); llamadasApi.delete('__tras_login__'); }
  const enlaces = await escanear(nombre, ruta);
  for (const e of enlaces) {
    const n = (e.replace(/[?#].*$/, '').split('/').pop() || 'inicio').replace(/\.html$/, '') || 'inicio';
    if (!vistos.has(n) && !cola.some((c) => c.nombre === n)) cola.push({ nombre: n, ruta: e });
  }
}
for (const p of pantallas) p.api = [...(llamadasApi.get(p.nombre) ?? [])];
await navegador.close();

// ---------- salidas ----------
const capitalizar = (s) => s.replace(/(^|[-_])(\w)/g, (_, __, c) => c.toUpperCase());
const docs = join(raiz, 'docs'); const generado = join(raiz, 'pruebas', 'pages', 'generado');
mkdirSync(docs, { recursive: true }); mkdirSync(generado, { recursive: true });

let md = `# Mapa de Tienda Sol\n\nEscaneado el ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })} (hora de Lima) desde \`${BASE}\` con el usuario **${USUARIO}**.\n\n`;
md += `Pantallas encontradas: ${pantallas.map((p) => `**${p.nombre}**`).join(', ')}.\n\n`;
md += `> Mejor localizador = el que vería una persona: \`getByRole\` con nombre, luego \`getByLabel\`, luego \`getByTestId\`; \`locator('#id')\` solo cuando no hay nombre accesible.\n\n`;
for (const p of pantallas) {
  md += `## Pantalla «${p.nombre}» · ${p.h1 || p.titulo}\n\nURL: \`${p.url}\`\n\n`;
  const vis = p.elementos.filter((e) => e.visible);
  md += `### Elementos (${vis.length})\n\n| Rol | Nombre | Localizador recomendado |\n|---|---|---|\n`;
  for (const e of vis) md += `| ${e.rol} | ${e.nombre || '—'} | \`${e.localizador}\` |\n`;
  if (p.formularios.length) { md += `\n### Formularios\n\n`; for (const f of p.formularios) md += `- **${f.nombre}**: ${f.campos.join(', ')} → botón «${f.boton}»\n`; }
  if (p.api.length) { md += `\n### Llamadas a la API observadas\n\n`; for (const a of p.api) md += `- \`${a}\`\n`; }
  md += `\n<details><summary>Árbol de accesibilidad (ariaSnapshot)</summary>\n\n\`\`\`yaml\n${p.aria}\n\`\`\`\n\n</details>\n\n`;
}
md += `## Qué hacer con esto\n\n1. Compara con \`pruebas/pages/*.ts\`: ¿faltan elementos? ¿cambió un nombre?\n2. Pídele a Claude Code que convierta \`pages/generado/*.ts\` en page objects con métodos de negocio (ver \`ia/prompts.md\`, «Escanea mi tienda»).\n3. Escribe un spec por fila de \`docs/matriz.csv\` usando solo esos localizadores.\n`;
writeFileSync(join(docs, 'mapa-tienda.md'), md);
writeFileSync(join(docs, 'mapa-tienda.json'), JSON.stringify({ base: BASE, fecha: new Date().toISOString(), pantallas: pantallas.map(({ aria, ...p }) => p) }, null, 2));

for (const p of pantallas) {
  const clase = `${capitalizar(p.nombre)}Page`;
  const vis = p.elementos.filter((e) => e.visible && e.rol !== 'heading');
  const nombreCampo = (e, i) => {
    const base = (e.testid || e.id || e.nombre || e.rol).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, ' ').trim().split(' ').map((w, k) => (k ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())).join('');
    return (base || `elemento${i}`).replace(/^\d/, (d) => `e${d}`);
  };
  const usados = new Set();
  const campos = vis.map((e, i) => { let n = nombreCampo(e, i); while (usados.has(n)) n += '2'; usados.add(n); return { n, e }; });
  const ts = `import { type Page, type Locator, expect } from '@playwright/test';

// Generado por scripts/escanear.mjs desde ${p.url}
// Es un ESQUELETO: revisa los nombres, borra lo que no uses y escribe los métodos de negocio (TODO).
export class ${clase} {
${campos.map(({ n, e }) => `  readonly ${n}: Locator; // ${e.rol}${e.nombre ? ` «${e.nombre}»` : ''}`).join('\n')}

  constructor(private readonly page: Page) {
${campos.map(({ n, e }) => `    this.${n} = page.${e.localizador};`).join('\n')}
  }

  async abrir() {
    await this.page.goto('${new URL(p.url).pathname.split('/').pop() || './'}');
    ${p.h1 ? `await expect(this.page.getByRole('heading', { name: '${p.h1.replace(/'/g, "\\'")}' })).toBeVisible();` : '// TODO: espera a algo visible de esta pantalla'}
  }

  // TODO: métodos con nombre de negocio, por ejemplo: async ingresar(usuario, clave) { … }
}
`;
  writeFileSync(join(generado, `${clase}.ts`), ts);
}

console.log(`Pantallas: ${pantallas.length} (${pantallas.map((p) => p.nombre).join(', ')})`);
for (const p of pantallas) console.log(`  ${p.nombre.padEnd(10)} ${String(p.elementos.filter((e) => e.visible).length).padStart(2)} elementos · ${p.formularios.length} formulario(s) · API: ${p.api.join(', ') || '—'}`);
console.log(`Escrito: docs/mapa-tienda.md, docs/mapa-tienda.json y pruebas/pages/generado/*.ts`);
