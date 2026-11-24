import { test, expect } from '../fixtures';
import type { APIRequestContext } from '@playwright/test';

async function iniciarSesion(request: APIRequestContext) {
  const r = await request.post('api/login', { data: { usuario: 'cajero', clave: 'cajero123' } });
  expect(r.ok()).toBeTruthy();
  const { token } = await r.json();
  return { authorization: `Bearer ${token}` };
}

test.describe('API', () => {
  test('API-SAL-001 /salud responde 200 con estado ok', async ({ request }) => {
    const r = await request.get('salud');
    expect(r.status()).toBe(200);
    expect(await r.json()).toMatchObject({ estado: 'ok', modo: 'prueba' });
  });

  test('API-LOG-001 login correcto devuelve un token', async ({ request }) => {
    const r = await request.post('api/login', { data: { usuario: 'admin', clave: 'admin123' } });
    expect(r.status()).toBe(200);
    expect(await r.json()).toMatchObject({ nombre: 'Rosa Quispe', rol: 'administrador', token: expect.any(String) });
  });

  test('API-LOG-002 login con clave incorrecta devuelve 401', async ({ request }) => {
    const r = await request.post('api/login', { data: { usuario: 'admin', clave: 'x' } });
    expect(r.status()).toBe(401);
  });

  test('API-SEG-001 sin token no se ven los productos', async ({ request }) => {
    const r = await request.get('api/productos');
    expect(r.status()).toBe(401);
  });

  test('API-VEN-001 el servidor rechaza efectivo insuficiente (422)', async ({ request }) => {
    const headers = await iniciarSesion(request);
    const r = await request.post('api/ventas', { headers, data: { items: [{ codigo: 'P004', cantidad: 1 }], efectivo: 5 } });
    expect(r.status()).toBe(422);
    expect((await r.json()).error).toContain('Efectivo insuficiente');
  });

  test('API-VEN-002 una venta descuenta el stock', async ({ request }) => {
    const headers = await iniciarSesion(request);
    const venta = await request.post('api/ventas', { headers, data: { items: [{ codigo: 'P010', cantidad: 2 }], efectivo: 40 } });
    expect(venta.status()).toBe(201);
    const productos = await (await request.get('api/productos?q=P010', { headers })).json();
    expect(productos[0].stock).toBe(4); // la semilla trae 6
  });

  test('API-VEN-003 no se vende un producto sin stock (422)', async ({ request }) => {
    const headers = await iniciarSesion(request);
    const r = await request.post('api/ventas', { headers, data: { items: [{ codigo: 'P018', cantidad: 1 }], efectivo: 20 } });
    expect(r.status()).toBe(422);
    expect((await r.json()).error).toContain('Stock insuficiente');
  });

  test('API-SEM-001 la semilla aleatoria es reproducible con la misma semilla', async ({ request }) => {
    const headers = async () => iniciarSesion(request);
    await request.post('api/semilla', { data: { semilla: 2026 } });
    const a = await (await request.get('api/productos', { headers: await headers() })).json();
    await request.post('api/semilla', { data: { semilla: 2026 } });
    const b = await (await request.get('api/productos', { headers: await headers() })).json();
    expect(b).toEqual(a);
  });
});
