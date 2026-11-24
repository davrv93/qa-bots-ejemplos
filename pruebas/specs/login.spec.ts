import { test, expect } from '../fixtures';

test.describe('Login', () => {
  test('E2E-LOG-001 el cajero ingresa con usuario y clave válidos', async ({ loginPage, page }) => {
    await loginPage.abrir();
    await loginPage.ingresar('cajero', 'cajero123');
    await expect(page.getByRole('heading', { name: 'Catálogo' })).toBeVisible();
    await expect(page.getByLabel('Usuario actual')).toHaveText('Luis Huamán');
  });

  test('E2E-LOG-002 una clave incorrecta muestra un error y no deja entrar', async ({ loginPage, page }) => {
    await loginPage.abrir();
    await loginPage.ingresar('cajero', 'clave-mala');
    await expect(loginPage.error).toHaveText('Usuario o clave incorrectos');
    await expect(page).toHaveURL(/index\.html$|\/$/);
  });

  test('E2E-LOG-003 sin sesión, entrar a una página interna devuelve al login', async ({ page }) => {
    await page.goto('venta.html');
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  });
});
