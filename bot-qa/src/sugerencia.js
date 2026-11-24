// Arma el pedido para la IA con el contexto justo (regla + trozo del archivo que la implementa)
// y da formato de WhatsApp a la respuesta. No sabe qué LLM hay detrás.
import fs from 'node:fs';
import path from 'node:path';

export const SISTEMA = [
  'Eres un ingeniero de QA y desarrollo. Te paso un fallo de la app «Tienda Sol» (Node y JavaScript),',
  'la regla de negocio que rompe y el código relevante. Responde en español, breve, con este formato exacto:',
  '1. *Causa probable*: una o dos líneas.',
  '2. *Archivo*: la ruta que hay que cambiar (solo una de las que te paso).',
  '3. *Parche*: un bloque ```diff``` unificado, mínimo, que arregle la app (no la prueba).',
  '4. *Prueba*: un bloque ```ts``` con una prueba de Playwright que falle antes del parche y pase después.',
  'No inventes archivos ni funciones que no estén en el contexto. Si el contexto no alcanza, dilo.',
].join('\n');

export function crearConocimiento({ mapa, raiz }) {
  const reglas = mapa?.reglas ?? {};

  function elegirRegla({ regla, texto = '' }) {
    if (regla && reglas[regla]) return regla;
    const t = texto.toLowerCase();
    let mejor = null, puntos = 0;
    for (const [id, r] of Object.entries(reglas)) {
      const p = (r.palabras ?? []).filter((w) => t.includes(w)).length;
      if (p > puntos) { mejor = id; puntos = p; }
    }
    return mejor;
  }

  function extracto(rutaRel, buscar, max = 3500) {
    const ruta = path.resolve(raiz, rutaRel);
    if (!ruta.startsWith(path.resolve(raiz) + path.sep)) return ''; // nada fuera del repo
    let codigo;
    try { codigo = fs.readFileSync(ruta, 'utf8'); } catch { return ''; }
    const lineas = codigo.split('\n');
    const i = buscar ? lineas.findIndex((l) => l.includes(buscar)) : -1;
    const desde = Math.max(0, i - 15), hasta = i < 0 ? 80 : i + 45;
    return lineas.slice(desde, hasta).map((l, k) => `${desde + k + 1}: ${l}`).join('\n').slice(0, max);
  }

  return {
    reglas,
    elegirRegla,
    contexto(id) {
      const r = reglas[id];
      if (!r) return { regla: null, archivos: [] };
      return { id, regla: r.regla, archivos: r.archivos.map((a) => ({ ruta: a, codigo: extracto(a, r.buscar) })) };
    },
  };
}

export function armarPedido({ texto, ficha, contexto }) {
  const partes = [];
  if (ficha) {
    partes.push(`FALLO ENCONTRADO POR EL BOT «${ficha.bot ?? '?'}» (${ficha.persona ?? '?'}), regla «${ficha.regla}»:`);
    partes.push(ficha.mensaje ?? '');
    if (Array.isArray(ficha.pasos) && ficha.pasos.length) {
      partes.push('Últimos pasos del bot:\n' + ficha.pasos.slice(-12).map((p) => '- ' + (p.texto ?? p.accion ?? JSON.stringify(p))).join('\n'));
    }
  } else {
    partes.push(`FALLO REPORTADO POR WHATSAPP:\n${texto}`);
  }
  if (contexto?.regla) {
    partes.push(`REGLA DE NEGOCIO (${contexto.id}): ${contexto.regla}`);
    for (const a of contexto.archivos) if (a.codigo) partes.push(`ARCHIVO ${a.ruta}:\n${a.codigo}`);
  } else {
    partes.push('No encontré la regla en el mapa de conocimiento: pide más datos si hace falta.');
  }
  return partes.join('\n\n');
}

export function formatoWhatsApp({ sugerencia, contexto, llm }) {
  const cabeza = [
    '🧪 *Sugerencia del bot QA*',
    contexto?.id ? `Regla: _${contexto.id}_` : null,
    `IA: ${llm}`,
    '',
  ].filter((x) => x !== null).join('\n');
  const pie = '\n\n_Es una sugerencia: revísala, aplícala en una rama y abre el pull request. Nada se cambia solo._';
  return cabeza + sugerencia + pie;
}

export function partir(texto, max = 3500) {
  if (texto.length <= max) return [texto];
  const out = [];
  let resto = texto;
  while (resto.length > max) {
    let corte = resto.lastIndexOf('\n', max);
    if (corte < max * 0.5) corte = max;
    out.push(resto.slice(0, corte));
    resto = resto.slice(corte).replace(/^\n/, '');
  }
  if (resto) out.push(resto);
  return out;
}
