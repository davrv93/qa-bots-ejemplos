# Usuarios sintéticos · 4 bots que usan Tienda Sol como personas

> **En este repositorio** los bots se levantan desde la raíz con Docker, contra la Tienda Sol local:
> `docker compose --profile explora up -d --build` (ver el README principal). Lo de abajo es la referencia
> de cómo correrlos sin Docker, con Node y Playwright instalados.


Cuatro bots con personalidad (Rosa, cajera apurada · Luis, cliente curioso · Mía, meticulosa · Beto, torpe)
entran a Tienda Sol **a la vez**, mueven el mouse en curvas, teclean letra por letra, dudan, se equivocan y
corrigen. Los ves en vivo (pantalla, cursor y «escribiendo…») y **cada fallo queda registrado con evidencia**:
captura, pasos con sus localizadores, peticiones a la API y una prueba Playwright que lo reproduce.

## Correr

```bash
cd pruebas && npm install          # una sola vez: trae Playwright y Chromium
cd ..
BASE_URL=https://jmd-learn.online/tienda-sol/ node bots/bots.mjs     # cada bot crea su propia tienda en la nube
# o contra tu app local:  node tienda/servidor.mjs --modo=prueba   y   BASE_URL=http://127.0.0.1:3000 node bots/bots.mjs
```

Abre <http://localhost:3300>. Elige semilla (misma semilla = mismos viajes), velocidad, viajes por bot y si la
tienda va **corregida** (`BUGS=0`) o con sus defectos; pulsa **Iniciar 4 bots**.

- Clic en un bot: pantalla grande, registro de acciones y de peticiones.
- Panel **Fallos registrados**: miniatura, regla rota, bot, pantalla y hora. Clic para ver la captura, los pasos
  hasta el fallo y la prueba generada; **⬇ spec de Playwright** la descarga (`reproducir-<id>.spec.ts`: cópiala a
  `pruebas/specs/` y córrela con `BASE_URL=... npx playwright test specs/reproducir-*.spec.ts`).
  «Marcar como conocido» lo saca del contador sin borrarlo.

## Qué vigila (el «oráculo»)

| Regla | Qué detecta |
|---|---|
| `pago-insuficiente-aceptado` | Tecleó menos que el total y la venta se registró igual (bug A). |
| `promo-aplicada-dos-veces` | Cambió la cantidad y el subtotal ≠ precio con promo × cantidad (bug B). |
| `reporte-no-cuadra` | El total del reporte no es la suma de sus ventas confirmadas. |
| `stock-negativo` | El catálogo muestra stock por debajo de cero. |
| `http-inesperado` | La API respondió ≥ 400 cuando la acción no lo esperaba (sí se esperan 401 en clave mala y 422 en pago corto). |
| `error-js` / `error-consola` | Excepción o error de consola en la página. |
| `timeout` / `excepcion` | La pantalla no respondió a tiempo o el bot no pudo seguir. |

Un mismo fallo (regla + pantalla + bot) en la misma corrida se cuenta una vez con `×n`. Se guardan los últimos 100
en `bots/fallos/` (`<id>.json`, `<id>.png`, `<id>.spec.ts`).

## Docker

```bash
docker compose --profile explora up -d --build   # desde la raíz del repositorio · http://127.0.0.1:3300
```

Imagen base de Playwright (≈ 3,5 GB), `mem_limit` 1 GiB. También sirve detrás de nginx bajo un prefijo
(`/qa-bots/`): todas las rutas son relativas.
