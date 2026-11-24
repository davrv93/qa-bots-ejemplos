import { test, expect } from '../fixtures';

test.describe('Venta', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.ingresarComoCajero();
  });

  test('E2E-VEN-001 una venta en efectivo calcula bien el total y el vuelto', async ({ catalogoPage, ventaPage }) => {
    await test.step('Agregar 2 Inca Kola y 1 Arroz Costeño', async () => {
      await catalogoPage.agregar('Inca Kola 500 ml', 2);
      await catalogoPage.agregar('Arroz Costeño 5 kg');
      await catalogoPage.irAVenta();
    });
    await test.step('Total = 2 × 2.50 + 24.50', async () => {
      await expect(ventaPage.total).toHaveText('S/ 29.50');
    });
    await test.step('Cobrar con S/ 50 y confirmar', async () => {
      await ventaPage.cobrar(50);
      await expect(
        ventaPage.confirmacion,
        'El comprobante debe mostrar el vuelto real: 50.00 − 29.50 = S/ 20.50',
      ).toHaveText('Venta N° 1 registrada. Total S/ 29.50 · Vuelto S/ 20.50');
    });
  });

  test('E2E-VEN-002 si el efectivo no alcanza, la venta se rechaza', async ({ catalogoPage, ventaPage }) => {
    await catalogoPage.agregar('Café Altomayo 200 g');
    await catalogoPage.irAVenta();
    await expect(ventaPage.total).toHaveText('S/ 17.01');

    await ventaPage.cobrar(5);

    await expect(
      ventaPage.confirmacion,
      'Con S/ 5.00 no se paga S/ 17.01: el POS NO debe registrar la venta',
    ).toHaveText('');
    await expect(ventaPage.error, 'El POS debe avisar «Efectivo insuficiente»').toHaveText(/Efectivo insuficiente/);
  });

  test('E2E-VEN-003 la promo de 10 % se aplica una sola vez al cambiar la cantidad', async ({ catalogoPage, ventaPage }) => {
    await catalogoPage.agregar('Café Altomayo 200 g');
    await catalogoPage.irAVenta();
    await expect(ventaPage.total).toHaveText('S/ 17.01'); // 18.90 − 10 %

    await ventaPage.cambiarCantidad('Café Altomayo 200 g', 2);

    await expect(
      ventaPage.total,
      'Total esperado: 2 × 17.01 = S/ 34.02. Si sale menos, el descuento se aplicó dos veces al recalcular',
    ).toHaveText('S/ 34.02');
  });

  test('E2E-VEN-004 el vuelto se actualiza mientras se escribe el efectivo', async ({ catalogoPage, ventaPage }) => {
    await catalogoPage.agregar('Aceite Primor 1 L');
    await catalogoPage.irAVenta();
    await ventaPage.efectivo.fill('10');
    await expect(ventaPage.vuelto).toHaveText('Falta S/ 1.90');
    await ventaPage.efectivo.fill('20');
    await expect(ventaPage.vuelto).toHaveText('S/ 8.10');
  });
});
