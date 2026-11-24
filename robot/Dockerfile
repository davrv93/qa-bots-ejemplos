# Robot de pruebas E2E: corre la suite de pruebas/ cada CADA_MIN minutos con Chromium
# y guarda la película (traza) de cada prueba. Se construye desde la raíz del repositorio.
FROM mcr.microsoft.com/playwright:v1.64.1-noble
WORKDIR /kit
COPY pruebas/package.json pruebas/package-lock.json ./pruebas/
RUN cd pruebas && npm ci --no-audit --no-fund
COPY tienda ./app
COPY pruebas ./pruebas
COPY robot ./robot
ENV HOST=0.0.0.0 PUERTO=3200 CADA_MIN=10 MOTOR=chromium
EXPOSE 3200
CMD ["node", "robot/robot.mjs"]
