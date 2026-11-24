# Bot de QA: Node 22 sin dependencias externas (solo módulos de Node).
FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY public ./public
COPY test ./test
COPY conocimiento.json ./
ENV PORT=8090 NODE_ENV=production
EXPOSE 8090
USER node
CMD ["node", "src/servidor.js"]
