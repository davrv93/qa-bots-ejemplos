import { type Page, type Locator, expect } from '@playwright/test';

// Generado por scripts/escanear.mjs desde https://jmd-learn.online/tienda-sol/TU_CODIGO/reporte.html
// Es un ESQUELETO: revisa los nombres, borra lo que no uses y escribe los métodos de negocio (TODO).
export class ReportePage {
  readonly catalogo: Locator; // link «Catálogo»
  readonly venta0: Locator; // link «Venta (0)»
  readonly reporte: Locator; // link «Reporte»
  readonly botonSalir: Locator; // button «Salir»
  readonly ventasDelDia: Locator; // table «Ventas del día»
  readonly solBugs: Locator; // checkbox «Con bugs»
  readonly solReiniciar: Locator; // button «Reiniciar mi tienda»
  readonly solEstado: Locator; // status

  constructor(private readonly page: Page) {
    this.catalogo = page.getByRole('link', { name: 'Catálogo' });
    this.venta0 = page.getByRole('link', { name: 'Venta (0)' });
    this.reporte = page.getByRole('link', { name: 'Reporte' });
    this.botonSalir = page.getByRole('button', { name: 'Salir' });
    this.ventasDelDia = page.locator('table');
    this.solBugs = page.getByLabel('Con bugs');
    this.solReiniciar = page.getByRole('button', { name: 'Reiniciar mi tienda' });
    this.solEstado = page.locator('#sol-estado');
  }

  async abrir() {
    await this.page.goto('reporte.html');
    await expect(this.page.getByRole('heading', { name: 'Reporte del día' })).toBeVisible();
  }

  // TODO: métodos con nombre de negocio, por ejemplo: async ingresar(usuario, clave) { … }
}
