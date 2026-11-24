import { type Page, type Locator, expect } from '@playwright/test';

export class ReportePage {
  readonly totalVendido: Locator;
  readonly numeroVentas: Locator;
  readonly filas: Locator;

  constructor(private readonly page: Page) {
    this.totalVendido = page.getByRole('status', { name: 'Total vendido' });
    this.numeroVentas = page.getByRole('status', { name: 'Número de ventas' });
    this.filas = page.getByRole('table', { name: 'Ventas del día' }).locator('tbody tr');
  }

  async abrir() {
    await this.page.goto('reporte.html');
    await expect(this.page.getByRole('heading', { name: 'Reporte del día' })).toBeVisible();
    await expect(this.totalVendido).not.toHaveText('—'); // espera a que cargue
  }
}
