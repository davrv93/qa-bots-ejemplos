# Tienda Sol: la app bajo prueba. Node puro, sin dependencias.
FROM node:22-alpine
WORKDIR /app
COPY . .
ENV HOST=0.0.0.0 PORT=3000 MODO=prueba
EXPOSE 3000
USER node
CMD ["node", "servidor.mjs"]
