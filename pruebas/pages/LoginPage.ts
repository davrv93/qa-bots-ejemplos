import { type Page, type Locator, expect } from '@playwright/test';

// Page Object de la pantalla de inicio de sesión.
// Regla: las pruebas NO conocen selectores; solo llaman métodos con nombre de negocio.
export class LoginPage {
  readonly usuario: Locator;
  readonly clave: Locator;
  readonly botonIngresar: Locator;
  readonly error: Locator;

  constructor(private readonly page: Page) {
    this.usuario = page.getByLabel('Usuario');
    this.clave = page.getByLabel('Clave');
    this.botonIngresar = page.getByRole('button', { name: 'Ingresar' });
    this.error = page.getByRole('alert');
  }

  async abrir() {
    await this.page.goto('./');
    await expect(this.page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  }

  async ingresar(usuario: string, clave: string) {
    await this.usuario.fill(usuario);
    await this.clave.fill(clave);
    await this.botonIngresar.click();
  }

  /** Atajo para las pruebas que no tratan del login: abre, ingresa y espera el catálogo. */
  async ingresarComoCajero() {
    await this.abrir();
    await this.ingresar('cajero', 'cajero123');
    await expect(this.page.getByRole('heading', { name: 'Catálogo' })).toBeVisible();
    // El título se pinta antes de cargar el módulo y los datos (visible en HTTPS).
    await expect(this.page.getByRole('list', { name: 'Productos' }).getByRole('listitem').first()).toBeVisible();
  }
}
