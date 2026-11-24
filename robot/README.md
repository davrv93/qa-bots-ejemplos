# Tu robot que prueba todo el día

> **En este repositorio** el robot se levantan desde la raíz con Docker, contra la Tienda Sol local:
> `docker compose --profile vigila up -d --build` (ver el README principal). Lo de abajo es la referencia
> de cómo correrlo sin Docker, con Node y Playwright instalados.


Un robot = la misma suite E2E del kit, corriendo sola cada N minutos, con una **URL** donde cualquiera
del equipo ve si la app sigue bien. Las pruebas E2E revisan antes de desplegar; el robot las repite
**después**, todo el día, y avisa cuando algo se rompe aunque nadie haya tocado el código (un cambio
de datos, un servidor caído, un certificado vencido).

## 1. En tu laptop (2 minutos)

```bash
node robot/robot.mjs                          # cada 10 min, Chromium, app local en modo prueba
# abre http://localhost:3200
CADA_MIN=5 node robot/robot.mjs               # cada 5 min
MOTOR=lightpanda node robot/robot.mjs         # con Lightpanda (necesitas un Lightpanda escuchando en CDP_URL)
BASE_URL=https://jmd-learn.online/tienda-sol/ node robot/robot.mjs   # contra la web: crea su propia tienda y la mantiene viva
```

Windows (PowerShell): `$env:CADA_MIN=5; node robot/robot.mjs`.

La página muestra el semáforo (VERDE/ROJO), la última corrida, la tira de las últimas 24 h (un cuadro
por corrida), el porcentaje de corridas en verde y la tabla de pruebas. «Correr ahora» dispara una
corrida y muestra el avance («12 de 22 · 31 s»). El botón **▶ Reproducir** de cada prueba abre la
película: paso a paso, con la pantalla tal como la vio el navegador en cada acción (abrir, escribir,
clic, comprobar) y el error marcado en el paso donde falló. Sale de la traza de Playwright
(`--trace on`), que el robot lee sin dependencias. Con `MOTOR=lightpanda` no hay película (no dibuja).
El historial queda en `robot/historial/` (últimas 200).

## 2. En un servidor con Docker (la URL de verdad)

```bash
docker compose --profile vigila up -d --build   # desde la raíz del repositorio
# http://localhost:3200  → detrás de nginx: https://tu-dominio/qa-robot/
```

Usa la imagen oficial de Playwright (Chromium incluido, misma versión que `pruebas/package.json`) para
poder grabar la película de cada prueba. Las variables se leen de `robot/.env` (`PUERTO_ROBOT`,
`BASE_URL`, `CADA_MIN`). Si apuntas a tu app local desde Docker: `BASE_URL=http://host.docker.internal:3000`
y levanta la app con `node tienda/servidor.mjs --modo=prueba` (la semilla de cada prueba necesita el modo
prueba). Versión ligera sin película: Lightpanda (~20 MiB), ver el comentario en `docker-compose.yml`.

Fragmento de nginx (dentro del `server` HTTPS):

```nginx
location = /qa-robot { return 302 /qa-robot/; }
location ^~ /qa-robot/ {
    proxy_pass http://127.0.0.1:3200;
    proxy_set_header Host $host;
    proxy_read_timeout 30s;
    # el robot entiende el prefijo /qa-robot/ y la página usa rutas relativas
}
```

## 3. Con GitHub Actions + Pages (sin servidor)

`.github/workflows/e2e-robot.yml` corre la suite cada 30 minutos en GitHub y publica el reporte en
`https://<usuario>.github.io/<repo>/`. Pasos en el propio archivo (secreto `BASE_URL`, Pages →
GitHub Actions). Ojo: el cron de GitHub puede atrasarse en horas de carga; para avisos en minutos
usa la opción 2.

| Dónde | Costo | Está siempre | Avisa en | Para quién |
|---|---|---|---|---|
| Laptop | 0 | mientras la tengas abierta | minutos | tú, hoy |
| Servidor + Docker | un contenedor de 768 MB (con Chromium y película) | 24/7 | minutos | tu equipo |
| GitHub Actions + Pages | gratis (cuota de minutos) | 24/7 | 30 min o más | proyectos públicos y repos pequeños |

## Qué mirar cuando el robot se pone rojo

1. ¿Falla la **misma prueba** varias corridas seguidas? → bug o cambio real. Abre el reporte y la traza.
2. ¿Falla **una sola corrida** y luego vuelve a verde? → prueba inestable o servidor lento: revisa esperas y semilla.
3. ¿Todo gris (el robot no pudo correr)? → la app o el navegador no estaban disponibles: es un problema de infraestructura, no del código.

Combínalo con el monitoreo (`monitoreo/`): Grafana dice si la app **responde**; el robot dice si la app
**funciona** como el usuario la usa.
