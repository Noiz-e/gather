# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY src/db/*.sql ./dist/db/
COPY src/data/*.json ./dist/data/

# Pre-generated voice samples (avoids API calls on startup)
COPY .voice-cache ./.voice-cache

# Cloud Run uses PORT env var
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/index.js"]
