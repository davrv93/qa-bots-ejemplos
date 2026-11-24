# Prompts del curso, paso a paso

Pausa el video, copia el prompt y pégalo en tu asistente de código (Claude Code, OpenCode, Cursor o el que uses)
abierto en la carpeta del repositorio. Cada prompt dice qué archivo tocar y cómo comprobar que quedó bien:
así la IA no adivina y tú puedes revisar lo que hizo.

Los prompts del taller anterior (Page Objects, specs desde la matriz, pruebas inestables, semillas) siguen en
[`kit-prompts.md`](kit-prompts.md).

---

## Paso 1 · Explora: un bot nuevo con otra personalidad

```text
Lee bots/bots.mjs. Hay cuatro personas (Rosa, Luis, Mía y Beto) en la constante PERSONAS.
Agrega una quinta persona, «Nora», adulta mayor que lee todo dos veces, escribe despacio y
siempre paga con un billete grande. Usa el mismo formato de las otras personas y no cambies
las reglas del oráculo. Al terminar, dime qué líneas cambiaste y cómo la veo trabajar en
http://127.0.0.1:3300.
```

**Compruébalo:** `docker compose --profile explora up -d --build`, abre el panel y suelta los bots: Nora aparece
con las demás.

## Paso 2 · Explora: del fallo a la prueba que lo reproduce

```text
Te paso la ficha de un fallo que encontró un bot (regla, pasos, peticiones y la spec generada).
Conviértela en una prueba de Playwright en pruebas/specs/ que use los Page Objects de
pruebas/pages/. La prueba debe FALLAR hoy por el mismo motivo que vio el bot. No arregles la
app. Explícame en dos líneas qué afirma la prueba.

<pega aquí la ficha del fallo>
```

## Paso 2b · Explora: un oráculo que no se equivoque

```text
En bots/bots.mjs, la regla «reporte-no-cuadra» compara el total del reporte con las ventas del
propio bot. Cuando los cuatro bots comparten la misma tienda (BASE_URL local), salta aunque no
haya un fallo: es un falso positivo. Corrige el oráculo para que compare el reporte con la suma
de las ventas de TODOS los bots de esa tienda, sin tocar la app. Explícame cómo compruebo que con
BUGS=0 ya no aparece y que con BUGS=1 sigue detectando los fallos reales.
```

## Paso 3 · Vigila: decidir cuándo avisar

```text
Lee vigia/vigia.mjs. Hoy avisa solo cuando el estado cambia (arriba → caído y caído → arriba).
Agrega un tercer aviso: «lenta», cuando 3 sondeos seguidos tarden más de 1500 ms, y que no se
repita hasta que vuelva a estar rápida. Sin dependencias nuevas. Dime cómo lo pruebo con
docker compose sin tocar el código de la tienda.
```

**Pista para probarlo:** la tienda acepta `LATENCIA_MS` (milisegundos de demora en cada respuesta).

## Paso 4 · Repara: que la IA proponga la corrección

```text
Esta prueba falla en rojo: <ruta de la spec>. La regla que rompe la app es: <una línea>.
La evidencia del bot es: <captura o pasos>.
Arregla la APP, no la prueba. Haz el cambio mínimo. Después corre la prueba y todo
pruebas/specs/ y muéstrame que pasan en verde. Si para arreglarlo tienes que cambiar la prueba,
detente y explícame por qué antes de hacerlo.
```

## Paso 5 · Repara: el pull request para que tú apruebes

```text
Crea una rama fix/<regla>, haz commit del arreglo y de la prueba, y abre el pull request con
gh pr create. En la descripción pon: la regla rota, la evidencia del bot (pasos y captura),
qué cambiaste y la salida de la prueba en verde. No hagas merge: lo apruebo yo.
```

## Paso 6 · Proyecto final: el bot QA con la IA inyectada

El repositorio ya trae el bot terminado en `bot-qa/`. Estos prompts son para **entenderlo y extenderlo**:

```text
Lee bot-qa/src/app.js y bot-qa/src/servidor.js. Explícame en 5 líneas qué es la inyección de
dependencias en este bot: qué recibe crearApp, dónde se decide qué IA y qué WhatsApp se usan,
y por qué las pruebas de bot-qa/test/ no necesitan llave ni teléfono.
```

```text
Agrega a bot-qa un proveedor de IA nuevo sin tocar app.js: <nombre> con su URL base compatible
con OpenAI. Solo cambia bot-qa/src/llm/index.js y .env.example. Agrega una prueba en
bot-qa/test/ que compruebe que la fábrica lo elige con LLM_PROVEEDOR=<nombre>. Corre
docker compose run --rm bot-qa npm test y muéstrame que todo pasa.
```

```text
Agrega a bot-qa/conocimiento.json la regla <id> de la tienda: qué dice la regla, qué archivo la
implementa y qué función buscar. Luego escribe una prueba en bot-qa/test/ que mande ese fallo por
WhatsApp (con el LLM falso) y compruebe que a la IA le llegó el trozo correcto del archivo.
```

## Prompt que usa el bot (para leerlo, no para copiarlo)

Está en `bot-qa/src/sugerencia.js` (constante `SISTEMA`). Pide cuatro cosas en un formato fijo: causa probable,
archivo, parche en `diff` y prueba de Playwright. Un formato fijo hace que la respuesta se pueda revisar rápido
en el teléfono y que, si la IA inventa un archivo, se note.
