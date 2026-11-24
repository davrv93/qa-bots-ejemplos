# Reglas para escribir pruebas en este proyecto (para personas y para asistentes de IA)

En este taller, Claude Code o Codex leen estas reglas.
Si generas o corriges pruebas aquí, **sigue estas reglas**.

## Estructura
- Pruebas en `specs/*.spec.ts`. Page Objects en `pages/`. Fixtures en `fixtures.ts`.
- Importa SIEMPRE desde `../fixtures` (no desde `@playwright/test`):
  `import { test, expect } from '../fixtures';`
- El título empieza con el ID de la matriz: `test('E2E-VEN-005 quitar un producto actualiza el total', …)`.
  Si creas un caso nuevo, agrégalo también a `../docs/matriz.csv`.

## Localizadores
1. `getByRole(rol, { name })` primero. Luego `getByLabel`, `getByText`. `getByTestId` solo si no hay otra.
2. **Nada de CSS ni XPath frágiles** (`div > span:nth-child(3)`), salvo dentro de un Page Object y con comentario.
3. Los selectores viven **en el Page Object**, nunca en el spec.

## Esperas
- **Prohibido** `page.waitForTimeout(…)` y cualquier espera fija. Usa aserciones que reintentan:
  `await expect(locator).toHaveText(…)`, `toBeVisible()`, `toHaveCount(n)`.
- Si una acción dispara algo asíncrono (un `fetch`), el Page Object espera el resultado visible
  (ver `VentaPage.cobrar`).

## Una intención por prueba
- Cada prueba verifica **una** regla de negocio. Puede tener varias aserciones si todas apuntan a esa regla.
- Pon un mensaje en español en la aserción que cuenta la regla:
  `await expect(venta.total, 'Total esperado: 2 × 17.01 = S/ 34.02').toHaveText('S/ 34.02');`

## Datos
- Cada prueba arranca con la **semilla determinista** (fixture `semilla`, automática): no la llames a mano.
- Lo que no es el objeto de la prueba se prepara **por API** con el fixture `app`
  (ej. registrar 2 ventas antes de mirar el reporte). La UI se usa solo para lo que se prueba.
- No dependas del orden de las pruebas ni de datos que dejó otra prueba.
- Datos de la semilla: usuarios `cajero/cajero123` y `admin/admin123`; productos en `../app/datos/semilla.json`.

## Motores
- Debe funcionar en `chromium`, `lightpanda` y `obscura`. Si usas capturas, etiqueta la prueba con
  `{ tag: '@visual' }` (Lightpanda no dibuja).
- Corre: `npm run test:chromium`, `npm run test:lightpanda`, `npm run test:obscura`.

## Antes de dar algo por terminado
- Córrelo y míralo fallar al menos una vez (cambia el valor esperado): una prueba que nunca falla no prueba nada.
- `npx playwright test specs/<archivo> --project=chromium` debe pasar con `BUGS=0`.
