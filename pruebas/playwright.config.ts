import { defineConfig, devices } from '@playwright/test';
import type { OpcionesMotor } from './fixtures';

// Dónde corre la app durante las pruebas (lo levanta webServer más abajo).
const PUERTO = Number(process.env.PUERTO ?? 3100);
export const URL_APP = (process.env.BASE_URL ?? `http://127.0.0.1:${PUERTO}`).replace(/\/$/, '') + '/';

// Un navegador dentro de Docker NO ve 127.0.0.1 de tu máquina: entra por host.docker.internal.
// Si usas el binario de Lightpanda/Obscura instalado en tu máquina, pon URL_MOTOR=http://127.0.0.1:3100
const URL_MOTOR = process.env.BASE_URL ? URL_APP : (process.env.URL_MOTOR ?? `http://host.docker.internal:${PUERTO}`);

// Ficha local de Obscura (solo para el contenedor ligado a 127.0.0.1; ver motores/docker-compose.yml).
const OBSCURA_TOKEN = process.env.OBSCURA_CDP_TOKEN ?? 'taller-qa-ficha-local-no-secreta-0123456789';

export default defineConfig<OpcionesMotor>({
  testDir: './specs',
  // La app guarda los datos en memoria y cada prueba los reinicia con /api/semilla:
  // por eso corremos de a una (workers: 1). Así ninguna prueba pisa los datos de otra.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  forbidOnly: !!process.env.CI,
  snapshotPathTemplate: '{testDir}/__capturas__/{testFilePath}/{arg}' + (process.env.BASE_URL ? '-web' : '') + '-{projectName}{ext}',

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'resultados/resultados.json' }],
  ],

  use: {
    baseURL: URL_APP,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 720 },
    locale: 'es-PE',
    timezoneId: 'America/Lima',
  },

  webServer: process.env.BASE_URL ? undefined : {
    command: 'node ../app/servidor.mjs',
    url: `${URL_APP}salud`,
    reuseExistingServer: process.env.REUSAR === '1',
    timeout: 15_000,
    env: {
      MODO: 'prueba',
      PORT: String(PUERTO),
      // Docker Desktop (Mac/Windows) llega a 127.0.0.1 por host.docker.internal.
      // En Linux con Docker Engine usa HOST=0.0.0.0 para que el contenedor vea la app.
      HOST: process.env.HOST ?? '127.0.0.1',
      BUGS: process.env.BUGS ?? '1',
    },
  },

  projects: [
    // Pruebas de API: no abren navegador.
    { name: 'api', testMatch: /api\.spec\.ts/, use: { baseURL: URL_APP } },

    // Chromium que Playwright lanza solo (headless). Es el motor de referencia.
    { name: 'chromium', testIgnore: /api\.spec\.ts/, use: { ...devices['Desktop Chrome'], ...(process.env.CANAL ? { channel: process.env.CANAL } : {}) } },

    // Igual que chromium pero graba la traza SIEMPRE (para la demo de reproducción paso a paso).
    { name: 'chromium-traza', testIgnore: /api\.spec\.ts/, use: { ...devices['Desktop Chrome'], ...(process.env.CANAL ? { channel: process.env.CANAL } : {}), trace: 'on' } },

    // El del robot (robot/robot.mjs): Chromium con la película de la pantalla en cada prueba, pero sin
    // instantáneas del DOM ni fuentes (son lo que hace lenta una traza «on»). Sin pruebas @visual.
    { name: 'chromium-robot', testIgnore: /api\.spec\.ts/, grepInvert: /@visual/, expect: { timeout: 10_000 }, use: { ...devices['Desktop Chrome'], trace: { mode: 'on', screenshots: true, snapshots: false, sources: false } } },

    // Lightpanda: navegador sin interfaz ni motor de dibujo; se conecta por CDP.
    // No saca capturas: se saltan las pruebas @visual.
    {
      name: 'lightpanda',
      testIgnore: /api\.spec\.ts/,
      grepInvert: /@visual/,
      use: {
        motor: 'lightpanda',
        cdpUrl: process.env.CDP_URL ?? 'ws://127.0.0.1:9222',
        baseURL: URL_MOTOR,
        screenshot: 'off',
      },
    },

    // Obscura: navegador sin interfaz en Rust (V8), también por CDP.
    {
      name: 'obscura',
      testIgnore: /api\.spec\.ts/,
      grepInvert: /@visual/,
      use: {
        motor: 'obscura',
        cdpUrl: process.env.CDP_URL ?? 'ws://127.0.0.1:9223',
        cdpHeaders: { Authorization: `Bearer ${OBSCURA_TOKEN}` },
        baseURL: URL_MOTOR,
        screenshot: 'off',
      },
    },
  ],
});
