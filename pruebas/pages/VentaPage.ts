import { type Page, type Locator, expect } from '@playwright/test';

export class VentaPage {
  readonly carrito: Locator;
  readonly total: Locator;
  readonly efectivo: Locator;
  readonly vuelto: Locator;
  readonly botonConfirmar: Locator;
  readonly error: Locator;
  readonly confirmacion: Locator;
  readonly respuesta: Locator;

  constructor(private readonly page: Page) {
    this.carrito = page.getByRole('table', { name: 'Carrito' });
    this.total = page.getByRole('status', { name: 'Total a pagar' });
    this.efectivo = page.getByLabel('Efectivo recibido (S/)');
    this.vuelto = page.getByRole('status', { name: 'Vuelto' });
    this.botonConfirmar = page.getByRole('button', { name: 'Confirmar venta' });
    this.error = page.getByRole('alert');
    this.confirmacion = page.locator('#exito');
    // El mensaje que aparezca primero: error o confirmación (los vacíos están ocultos).
    this.respuesta = page.locator('#error, #exito').filter({ hasText: /\S/ });
  }

  async abrir() {
    await this.page.goto('venta.html');
    await expect(this.page.getByRole('heading', { name: 'Venta' })).toBeVisible();
  }

  async cambiarCantidad(nombre: string, cantidad: number) {
    const campo = this.page.getByRole('spinbutton', { name: `Cantidad de ${nombre}` });
    await campo.fill(String(cantidad));
    // Sacar el foco dispara el evento «change» (Chromium y Lightpanda).
    // OJO: Obscura 0.2.6 NO dispara «change» al perder el foco: ahí esta prueba sale roja
    // aunque la app esté bien. Ver docs/motores-resultados.md.
    await campo.blur();
  }

  async cobrar(efectivo: number) {
    await this.efectivo.fill(String(efectivo));
    await this.botonConfirmar.click();
    // Esperar a que el POS RESPONDA. Sin esto, una aserción como «confirmación vacía»
    // pasaría al instante, antes de que llegue la respuesta del servidor (falso verde).
    await expect(this.respuesta).toHaveCount(1);
  }
}
