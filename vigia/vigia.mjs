// Vigía: monitoreo sin Docker y sin dependencias (solo Node ≥ 20).
// Consulta /salud cada N segundos, calcula la disponibilidad y avisa por webhook
// SOLO cuando el estado cambia (arriba -> caída, caída -> arriba).
//
// Uso:
//   node vigia.mjs
//   node vigia.mjs --url=http://127.0.0.1:3000/salud --cada=5 --webhook=http://127.0.0.1:9099/alerta
// También por variables de entorno: VIGIA_URL, VIGIA_CADA, VIGIA_WEBHOOK, VIGIA_TIEMPO_MAX_MS

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => /^--([^=]+)=(.*)$/.exec(a)).filter(Boolean).map((m) => [m[1], m[2]]),
);
const URL_SALUD = args.url ?? process.env.VIGIA_URL ?? 'http://127.0.0.1:3000/salud';
const CADA_S = Number(args.cada ?? process.env.VIGIA_CADA ?? 5);
const WEBHOOK = args.webhook ?? process.env.VIGIA_WEBHOOK ?? '';
const TIEMPO_MAX_MS = Number(args['tiempo-max'] ?? process.env.VIGIA_TIEMPO_MAX_MS ?? 3000);

let total = 0, buenos = 0, estadoAnterior = null, caidaDesde = null;
const latencias = [];

const hora = () => new Date().toLocaleTimeString('es-PE', { timeZone: 'America/Lima' });

async function avisar(estado, mensaje) {
  console.log(`\n>>> ${mensaje}\n`);
  if (!WEBHOOK) return;
  try {
    await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ servicio: 'tienda-sol', estado, mensaje, url: URL_SALUD, hora: new Date().toISOString() }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    console.log(`(no pude avisar al webhook: ${e.message})`);
  }
}

async function sondear() {
  const t0 = performance.now();
  let ok = false, detalle;
  try {
    const r = await fetch(URL_SALUD, { signal: AbortSignal.timeout(TIEMPO_MAX_MS) });
    const cuerpo = await r.json().catch(() => ({}));
    ok = r.ok && cuerpo.estado === 'ok';
    detalle = `HTTP ${r.status}`;
  } catch (e) {
    detalle = e.name === 'TimeoutError' ? `sin respuesta en ${TIEMPO_MAX_MS} ms` : e.cause?.code ?? e.message;
  }
  const ms = Math.round(performance.now() - t0);
  total++; if (ok) buenos++;
  latencias.push(ms); if (latencias.length > 50) latencias.shift();
  const disponibilidad = ((buenos / total) * 100).toFixed(1);
  const p95 = [...latencias].sort((a, b) => a - b)[Math.floor(latencias.length * 0.95) - 1] ?? ms;

  console.log(`[${hora()}] ${ok ? 'ARRIBA' : 'CAÍDA '}  ${detalle.padEnd(22)} ${String(ms).padStart(5)} ms   disponibilidad ${disponibilidad}% (${buenos}/${total})   p95 ${p95} ms`);

  const estado = ok ? 'arriba' : 'caido';
  if (estadoAnterior === null && estado === 'caido') {
    // Ya estaba caída al arrancar el vigía: avisar de una vez.
    caidaDesde = Date.now();
    await avisar('caido', `Tienda Sol CAÍDA al iniciar el vigía (${detalle}) — ${URL_SALUD}`);
  } else if (estadoAnterior !== null && estado !== estadoAnterior) {
    if (estado === 'caido') {
      caidaDesde = Date.now();
      await avisar('caido', `Tienda Sol CAÍDA (${detalle}) — ${URL_SALUD}`);
    } else {
      const duro = Math.round((Date.now() - caidaDesde) / 1000);
      await avisar('arriba', `Tienda Sol se RECUPERÓ tras ${duro} s caída`);
    }
  }
  estadoAnterior = estado;
}

console.log(`Vigía: revisando ${URL_SALUD} cada ${CADA_S} s${WEBHOOK ? ` · avisos a ${WEBHOOK}` : ' · sin webhook (solo consola)'}. Ctrl+C para salir.`);
// Un sondeo a la vez: si la app está lenta, no se enciman las consultas.
for (;;) {
  const inicio = Date.now();
  await sondear();
  await new Promise((r) => setTimeout(r, Math.max(0, CADA_S * 1000 - (Date.now() - inicio))));
}
