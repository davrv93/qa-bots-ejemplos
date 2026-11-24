// Fixtures del proyecto: aquí se arma TODO lo que una prueba necesita antes de empezar.
//
// 1. `browser`  -> lanza Chromium o se conecta por CDP a Lightpanda / Obscura (según el proyecto).
// 2. `semilla`  -> automática: reinicia los datos de la app ANTES de cada prueba (aislamiento).
// 3. `app`      -> cliente HTTP hacia la app (para preparar datos por API, sin pasar por la UI).
// 4. Page Objects listos para usar: loginPage, catalogoPage, ventaPage, reportePage.

import { test as base, expect, request as pwRequest, type APIRequestContext, type Browser } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { CatalogoPage } from './pages/CatalogoPage';
import { VentaPage } from './pages/VentaPage';
import { ReportePage } from './pages/ReportePage';

export type Motor = 'chromium' | 'lightpanda' | 'obscura';

// Opciones que cada proyecto de playwright.config.ts puede fijar en `use`.
export type OpcionesMotor = {
  motor: Motor;
  cdpUrl: string | undefined;
  cdpHeaders: Record<string, string> | undefined;
};

type Fixtures = {
  semilla: void;
  app: APIRequestContext;
  loginPage: LoginPage;
  catalogoPage: CatalogoPage;
  ventaPage: VentaPage;
  reportePage: ReportePage;
};

const URL_APP = (process.env.BASE_URL ?? `http://127.0.0.1:${process.env.PUERTO ?? 3100}`).replace(/\/$/, '') + '/';

export const test = base.extend<Fixtures, OpcionesMotor>({
  motor: ['chromium', { scope: 'worker', option: true }],
  cdpUrl: [undefined, { scope: 'worker', option: true }],
  cdpHeaders: [undefined, { scope: 'worker', option: true }],

  // Sustituye el navegador por defecto de Playwright.
  browser: [
    async ({ playwright, motor, cdpUrl, cdpHeaders, headless, channel, launchOptions }, use) => {
      let browser: Browser;
      if (motor === 'chromium') {
        browser = await playwright.chromium.launch({ ...launchOptions, headless, channel });
      } else {
        const destino = cdpUrl ?? 'ws://127.0.0.1:9222';
        try {
          browser = await playwright.chromium.connectOverCDP(destino, { headers: cdpHeaders, timeout: 10_000 });
        } catch (err) {
          throw new Error(
            `No pude conectarme a ${motor} en ${destino}.\n` +
            `¿Lo levantaste? -> cd motores && docker compose up -d ${motor}\n` +
            `Detalle: ${(err as Error).message.split('\n')[0]}`,
          );
        }
      }
      await use(browser);
      await browser.close();
    },
    { scope: 'worker' },
  ],

  app: async ({}, use) => {
    const ctx = await pwRequest.newContext({ baseURL: URL_APP });
    await use(ctx);
    await ctx.dispose();
  },

  // `auto: true` = corre en TODAS las pruebas aunque no la pidan.
  semilla: [
    async ({ app }, use) => {
      const r = await app.post('api/semilla', { data: { bugs: process.env.BUGS !== '0' } });
      expect(r.ok(), 'La app debe correr con MODO=prueba para poder sembrar datos').toBeTruthy();
      await use();
    },
    { auto: true },
  ],

  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  catalogoPage: async ({ page }, use) => use(new CatalogoPage(page)),
  ventaPage: async ({ page }, use) => use(new VentaPage(page)),
  reportePage: async ({ page }, use) => use(new ReportePage(page)),
});

export { expect };
