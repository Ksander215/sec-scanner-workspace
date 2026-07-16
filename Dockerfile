# Multi-stage build for Security Intelligence Platform
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
RUN addgroup -g 1001 -S si-group && adduser -S si-user -u 1001 -G si-group
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=builder /app/dist ./dist

# Security: run as non-root
USER si-user

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

EXPOSE 8080
ENV NODE_ENV=production
ENV SI_SERVER_PORT=8080
ENV SI_DATA_DIR=/app/data

ENTRYPOINT ["node", "dist/cli/index.js"]
CMD ["server", "start", "--port", "8080"]
