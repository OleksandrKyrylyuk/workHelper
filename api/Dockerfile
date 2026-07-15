# --- Dev stage (used by docker-compose for local dev) ---
FROM node:24-alpine AS dev

WORKDIR /app

RUN apk add --no-cache \
    ffmpeg \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    ttf-dejavu \
    fontconfig \
    poppler-utils

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package*.json ./
RUN npm install -g npm@latest && npm ci

EXPOSE 3001

# --- Builder stage ---
FROM dev AS builder

COPY . .
RUN npm run build

# --- Production image ---
FROM node:24-alpine

# Install ffmpeg + chromium + dependencies for Puppeteer
RUN apk add --no-cache \
    ffmpeg \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    ttf-dejavu \
    fontconfig \
    poppler-utils

# Tell Puppeteer to use Alpine Chromium instead of bundled one
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_DOWNLOAD=true

WORKDIR /app

COPY package*.json ./
RUN npm install -g npm@latest && npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY drizzle ./drizzle
COPY drizzle.config.ts ./drizzle.config.ts

EXPOSE 3001

CMD ["npm", "run", "start"]

