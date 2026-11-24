import { existsSync } from 'node:fs';
import { test, expect } from '../fixtures';

// Pruebas visuales: comparan una captura con una «línea base» guardada.
// Lightpanda no dibuja la página (no tiene motor gráfico): estas pruebas llevan la etiqueta
// @visual y los proyectos lightpanda/obscura las excluyen con grepInvert.
//
// La primera vez genera la línea base en TU máquina:  npm run test:visual:base
// (las fuentes cambian entre Windows, Mac y Linux, por eso no se comparte la imagen).

test('VIS-CAT-001 el catálogo se ve igual que la línea base', { tag: '@visual' }, async ({ loginPage, page }, testInfo) => {
  const base = testInfo.snapshotPath('catalogo.png');
  test.skip(!existsSync(base) && testInfo.config.updateSnapshots !== 'all' && testInfo.config.updateSnapshots !== 'changed',
    'Aún no hay línea base. Créala con: npm run test:visual:base');
  await loginPage.ingresarComoCajero();
  await expect(page.getByRole('listitem')).toHaveCount(20);
  await expect(page).toHaveScreenshot('catalogo.png', { fullPage: true, maxDiffPixelRatio: 0.01, mask: [page.getByLabel('Usuario actual'), page.getByRole('complementary', { name: 'Controles de mi tienda' })] });
});
