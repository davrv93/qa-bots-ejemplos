import { type Page, type Locator, expect } from '@playwright/test';

export class CatalogoPage {
  readonly titulo: Locator;
  readonly buscador: Locator;
  readonly productos: Locator;
  readonly resumen: Locator;
  readonly contadorCarrito: Locator;

  constructor(private readonly page: Page) {
    this.titulo = page.getByRole('heading', { name: 'Catálogo' });
    this.buscador = page.getByRole('searchbox', { name: 'Buscar producto' });
    this.productos = page.getByRole('list', { name: 'Productos' }).getByRole('listitem');
    this.resumen = page.locator('#resumen');
    this.contadorCarrito = page.locator('#contador-carrito');
  }

  async abrir() {
    await this.page.goto('catalogo.html');
    await expect(this.titulo).toBeVisible();
    await expect(this.resumen).toHaveText(/productos|No se encontraron productos/);
  }

  async buscar(texto: string) {
    await this.buscador.fill(texto);
    await this.buscador.press('Enter');
  }

  producto(nombre: string): Locator {
    return this.page.getByRole('listitem', { name: nombre });
  }

  botonAgregar(nombre: string): Locator {
    return this.page.getByRole('button', { name: `Agregar ${nombre}`, exact: true });
  }

  async agregar(nombre: string, veces = 1) {
    for (let i = 0; i < veces; i++) {
      await this.botonAgregar(nombre).click();
      await expect(this.resumen).toHaveText(`Agregado: ${nombre}`);
    }
  }

  async irAVenta() {
    await this.page.getByRole('link', { name: /Venta/ }).click();
    await expect(this.page.getByRole('heading', { name: 'Venta' })).toBeVisible();
  }
}
