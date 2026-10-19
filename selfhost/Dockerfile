# Imagen del servidor de sincronización. Se construye desde la raíz del repositorio
# (docker-compose.yml ya lo hace) para poder incluir sql/schema.sql.
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY selfhost/package.json selfhost/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY selfhost/server.js selfhost/db.js selfhost/manage.js ./
COPY sql/schema.sql ./schema.sql
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:8787/health || exit 1
CMD ["node", "server.js"]
