FROM node:22-alpine

WORKDIR /app

# Primero solo los manifiestos: si no cambian, Docker reutiliza la capa de npm ci.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production

# El puerto real lo define compose.yaml con la variable PORT.
ARG PORT=3000
ENV PORT=${PORT}
EXPOSE ${PORT}

USER node

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "src/server.js"]