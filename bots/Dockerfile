# Usuarios sintéticos: 4 bots con Chromium que usan Tienda Sol a la vez.
# Base oficial de Playwright (misma versión que pruebas/package.json): trae Chromium y sus librerías.
# Se construye desde la raíz del repositorio (docker compose lo hace solo).
FROM mcr.microsoft.com/playwright:v1.64.1-noble
WORKDIR /kit
COPY pruebas/package.json pruebas/package-lock.json ./pruebas/
RUN cd pruebas && npm ci --no-audit --no-fund
COPY bots ./bots
ENV HOST=0.0.0.0 PUERTO=3300 FALLOS_DIR=/kit/bots/fallos
EXPOSE 3300
CMD ["node", "bots/bots.mjs"]
