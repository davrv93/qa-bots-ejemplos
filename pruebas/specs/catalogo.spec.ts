import { test, expect } from '../fixtures';

test.describe('Catálogo', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.ingresarComoCajero();
  });

  test('E2E-CAT-001 la semilla carga 20 productos', async ({ catalogoPage }) => {
    await expect(catalogoPage.productos).toHaveCount(20);
  });

  test('E2E-CAT-002 buscar por nombre filtra el catálogo', async ({ catalogoPage }) => {
    await catalogoPage.buscar('inca');
    await expect(catalogoPage.productos).toHaveCount(1);
    await expect(catalogoPage.producto('Inca Kola 500 ml')).toBeVisible();
  });

  test('E2E-CAT-003 una búsqueda sin coincidencias lo dice claramente', async ({ catalogoPage }) => {
    await catalogoPage.buscar('quinua');
    await expect(catalogoPage.productos).toHaveCount(0);
    await expect(catalogoPage.resumen).toHaveText('No se encontraron productos');
  });

  test('E2E-CAT-004 un producto sin stock no se puede agregar', async ({ catalogoPage }) => {
    await catalogoPage.buscar('Opal');
    await expect(catalogoPage.producto('Detergente Opal 900 g')).toContainText('Agotado');
    await expect(catalogoPage.botonAgregar('Detergente Opal 900 g')).toBeDisabled();
  });

  test('E2E-CAT-005 un producto vencido no se puede agregar', async ({ catalogoPage }) => {
    await catalogoPage.buscar('Mazamorra');
    await expect(catalogoPage.producto('Mazamorra morada Negrita 150 g')).toContainText('Vencido');
    await expect(catalogoPage.botonAgregar('Mazamorra morada Negrita 150 g')).toBeDisabled();
  });
});
