import { test, expect } from '../fixtures';

test.describe('Reporte del día', () => {
  test('E2E-REP-001 al empezar (semilla limpia) el reporte está en cero', async ({ loginPage, reportePage }) => {
    await loginPage.ingresarComoCajero();
    await reportePage.abrir();
    await expect(reportePage.totalVendido).toHaveText('S/ 0.00');
    await expect(reportePage.numeroVentas).toHaveText('0');
  });

  test('E2E-REP-002 el reporte suma las ventas registradas', async ({ app, loginPage, reportePage }) => {
    // Preparamos los datos por API (rápido y estable); la UI solo se usa para lo que se prueba.
    await test.step('Registrar 2 ventas por API', async () => {
      const login = await (await app.post('api/login', { data: { usuario: 'cajero', clave: 'cajero123' } })).json();
      const headers = { authorization: `Bearer ${login.token}` };
      for (const items of [[{ codigo: 'P001', cantidad: 4 }], [{ codigo: 'P005', cantidad: 1 }]]) {
        const r = await app.post('api/ventas', { headers, data: { items, efectivo: 100 } });
        expect(r.status()).toBe(201);
      }
    });
    await loginPage.ingresarComoCajero();
    await reportePage.abrir();
    await expect(reportePage.numeroVentas).toHaveText('2');
    await expect(reportePage.totalVendido).toHaveText('S/ 34.50'); // 4 × 2.50 + 24.50
    await expect(reportePage.filas).toHaveCount(2);
  });
});
