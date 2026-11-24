# IA para escribir pruebas: prompts listos y herramientas

En este taller se usan Claude o GPT. Si tu asistente
trabaja dentro de la carpeta `pruebas/` (Claude Code o Codex), ya lee las reglas de
`pruebas/AGENTS.md` / `pruebas/CLAUDE.md`. Si usas un chat web, **pega primero el contenido de
`pruebas/AGENTS.md`** y luego el prompt.

> Regla de oro: la IA **propone**, tú **verificas**. Corre cada prueba generada y hazla fallar una
> vez a propósito antes de creerle.

---

## 1. Generar un Page Object a partir del HTML

```text
Eres QA senior con Playwright + TypeScript. Te paso el HTML de una pantalla.
Escribe un Page Object en TypeScript con estas reglas:
- Clase <NombrePage> con constructor(private readonly page: Page).
- Un `readonly` Locator por cada elemento con el que el usuario interactúa o que se verifica.
- Usa getByRole con { name } primero, luego getByLabel. Nada de CSS/XPath salvo que no haya otra opción
  (si lo usas, explica por qué en un comentario).
- Métodos con nombre de negocio en español (abrir, buscar, agregar, cobrar…), sin aserciones de negocio
  dentro, salvo esperar a que la pantalla esté lista.
- Nada de waitForTimeout.
HTML:
<pega aquí el HTML, por ejemplo app/publico/venta.html>
```

## 2. Convertir una fila de la matriz / caso de uso en un spec

```text
Con las reglas de AGENTS.md (te las pego abajo) escribe UNA prueba Playwright para este caso:
ID: E2E-VEN-005
Caso de uso: CU-03 Registrar venta, flujo alterno 2b «Quitar un producto»
Descripción: Quitar un producto del carrito actualiza el total
Datos de la semilla: Inca Kola 500 ml S/ 2.50, Arroz Costeño 5 kg S/ 24.50
Page Objects disponibles: LoginPage (ingresarComoCajero), CatalogoPage (agregar, irAVenta),
VentaPage (total, cambiarCantidad, cobrar). Si falta un método (por ejemplo quitar), agrégalo al Page
Object y muéstrame los dos archivos.
Archivo destino: specs/venta.spec.ts. Importa desde '../fixtures'.
<pega AGENTS.md>
```

## 3. Arreglar una prueba inestable (flaky) a partir de su error o traza

```text
Esta prueba de Playwright a veces pasa y a veces falla. Te paso el código, el error y los últimos
pasos de la traza (npx playwright show-trace …).
1) Explica la causa más probable en 3 líneas (carrera, espera fija, dato compartido, selector ambiguo…).
2) Propón el arreglo MÍNIMO respetando: sin waitForTimeout, aserciones que reintentan, datos por semilla.
3) Dime cómo comprobar que quedó estable: npx playwright test <archivo> --repeat-each=20 --project=chromium
Código:
<pega>
Error:
<pega>
Pasos de la traza:
<pega>
```

Ejemplo real de este kit: en `E2E-VEN-002` la aserción «la confirmación está vacía» pasaba **antes**
de que respondiera el servidor (falso verde). El arreglo fue que `VentaPage.cobrar()` espere a que
aparezca la respuesta (error o confirmación). Pídele a la IA que encuentre ese tipo de carrera.

## 4. Generar semillas de datos

```text
Genera un JSON con la misma forma que app/datos/semilla.json (te pego un extracto) con 30 productos
de bodega peruana: nombres reales de marcas peruanas, categoría, precio en soles con 1 decimal,
stock entero, vencimiento AAAA-MM-DD, promo (0 o 10).
Incluye a propósito: 2 productos con stock 0, 2 vencidos antes de 2026-01-01, 1 con promo y precio
con céntimos que obligue a redondear (ej. 18.90).
Además escribe una función JS con PRNG con semilla (mulberry32) que genere variaciones reproducibles:
misma semilla => mismos datos.
<pega extracto>
```

## 5. Del caso de uso a la lista de casos de prueba (antes de escribir código)

```text
Te paso un caso de uso con flujo principal y alternos. Devuélveme una tabla CSV con columnas
caso_uso,modulo,id_prueba,descripcion,spec,prioridad,estado
- Al menos una fila por flujo (principal y cada alterno).
- Agrega valores límite (0, negativo, exacto, un céntimo menos).
- prioridad Alta si toca dinero o stock.
- estado = pendiente.
<pega el caso de uso de docs/casos-de-uso.md>
```

---

## Herramientas de IA de Playwright (verificadas con Playwright 1.64.1)

### `npx playwright codegen` — grabar en vez de escribir
```bash
cd pruebas
npm run codegen          # = npx playwright codegen http://localhost:3000 (con la app corriendo: npm start en app/)
```
Abre un navegador y escribe el código mientras haces clic. Úsalo para descubrir localizadores;
después **mueve** los localizadores al Page Object.

### Playwright MCP — que el asistente maneje el navegador
Servidor MCP oficial (`@playwright/mcp`, versión 0.0.84 al 01-11-2026). Configuración típica:

```json
{
  "mcpServers": {
    "playwright": { "command": "npx", "args": ["@playwright/mcp@latest"] }
  }
}
```
En Claude Code: `claude mcp add playwright -- npx @playwright/mcp@latest`.
Luego pídele: «Abre http://127.0.0.1:3000, ingresa como cajero, vende un Café Altomayo con S/ 5 de
efectivo y dime qué pasa». La IA lee la página por su **árbol de accesibilidad** (por eso los
`label` y `role` de la app importan también para la IA).

### Escanea mi tienda (verificado con `scripts/escanear.mjs`; el prompt con MCP está documentado, no ejecutado)

Primero sin IA: `BASE_URL=https://jmd-learn.online/tienda-sol/TU_CODIGO npm run escanear` deja
`docs/mapa-tienda.md` y `pages/generado/*.ts`. Luego, en Claude Code (con Playwright MCP instalado):

```
Abre BASE_URL (mi Tienda Sol: https://jmd-learn.online/tienda-sol/TU_CODIGO), entra como cajero / cajero123
y recorre TODAS las pantallas (login, catálogo, venta, reporte y cualquier enlace que encuentres).
Para cada pantalla escribe en docs/mapa-tienda.md: qué hace, sus elementos con el mejor localizador
(getByRole con nombre > getByLabel > getByTestId; nunca #id generado ni nth-child), sus formularios y
las llamadas a /api/* que viste. Después crea un Page Object por pantalla en pages/ con getByRole/getByLabel
y métodos con nombre de negocio (ingresar, buscar, agregar, cobrar…), sin waitForTimeout.
Al final, genera un spec por fila de docs/casos-de-uso.md usando solo esos page objects, con la semilla
antes de cada prueba. No cambies ninguna aserción para que pase: si algo sale rojo, dímelo.
```

Refinar lo que generó el escáner:

```
Lee pages/generado/VentaPage.ts (lo generó scripts/escanear.mjs: solo localizadores y métodos TODO).
Conviértelo en un Page Object útil: agrupa los localizadores por intención, escribe los métodos
cobrar(efectivo), cambiarCantidad(nombre, n) y abrir(), y explica qué localizadores del esqueleto
descartaste y por qué. Compáralo con pages/VentaPage.ts y señala diferencias.
```

### Redacta conmigo el informe de pruebas (no inventes)

```
Lee pruebas/resultados/resultados.json, docs/matriz.csv e informe/datos.json (mis _guia dicen qué va en cada campo).
Ayúdame a redactar «conclusion» y «recomendacion» del informe: cita solo IDs y cifras que estén en el JSON
(casos ejecutados, cuántos pasan, cuántos fallan, qué pruebas fallan y con qué prioridad en la matriz).
No inventes defectos ni cifras. Termina con el veredicto APTO / NO APTO según mi criterio_de_salida.
Devuélveme los dos campos listos para pegar en datos.json.
```

```
Revisa mi informe como jefe de QA: lee informe/datos.json y pruebas/resultados/resultados.json y dime qué
falta o qué no se sostiene con la evidencia (afirmaciones sin ID, cifras que no cuadran, riesgos no declarados,
un veredicto que contradice el criterio de salida). No lo reescribas: lista observaciones concretas.
```

### Agentes de prueba: `npx playwright init-agents`
Existe en 1.64.1 (en este taller usa `--loop=claude` o `--loop=codex`). Probado en una
copia de `pruebas/`:

```bash
cd pruebas
npx playwright init-agents --loop=claude --project=chromium
```
Crea:
- `.claude/agents/playwright-test-planner.md` — **planner**: explora la app y escribe un plan de pruebas en Markdown.
- `.claude/agents/playwright-test-generator.md` — **generator**: convierte el plan en specs.
- `.claude/agents/playwright-test-healer.md` — **healer**: corre las pruebas que fallan y propone arreglos.
- `.mcp.json` — servidor MCP `playwright-test` (`npx playwright run-test-mcp-server`).
- `specs/seed.spec.ts` — prueba «semilla» vacía desde donde arrancan los agentes. **Edítala** para que
  importe de `../fixtures` y haga `await loginPage.ingresarComoCajero()`; así los agentes empiezan
  con sesión y datos limpios.

> Cuidado con el **healer**: si la app tiene un defecto, «arreglar» la prueba para que pase es
> esconder el defecto. En este kit, VEN-002 y VEN-003 deben quedar **rojas** con `BUGS=1`.
