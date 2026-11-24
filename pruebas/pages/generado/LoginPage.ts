import { type Page, type Locator, expect } from '@playwright/test';

// Generado por scripts/escanear.mjs desde https://jmd-learn.online/tienda-sol/TU_CODIGO/
// Es un ESQUELETO: revisa los nombres, borra lo que no uses y escribe los métodos de negocio (TODO).
export class LoginPage {
  readonly usuario: Locator; // textbox «Usuario»
  readonly clave: Locator; // textbox «Clave»
  readonly ingresar: Locator; // button «Ingresar»
  readonly solBugs: Locator; // checkbox «Con bugs»
  readonly solReiniciar: Locator; // button «Reiniciar mi tienda»
  readonly solEstado: Locator; // status

  constructor(private readonly page: Page) {
    this.usuario = page.getByLabel('Usuario');
    this.clave = page.getByLabel('Clave');
    this.ingresar = page.getByRole('button', { name: 'Ingresar' });
    this.solBugs = page.getByLabel('Con bugs');
    this.solReiniciar = page.getByRole('button', { name: 'Reiniciar mi tienda' });
    this.solEstado = page.locator('#sol-estado');
  }

  async abrir() {
    await this.page.goto('./');
    await expect(this.page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  }

  // TODO: métodos con nombre de negocio, por ejemplo: async ingresar(usuario, clave) { … }
}
