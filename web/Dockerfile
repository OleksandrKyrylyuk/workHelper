# --- Dev stage (used by docker-compose for local dev) ---
FROM node:24-alpine AS dev

WORKDIR /app

COPY package*.json ./
RUN npm install

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# --- Builder stage ---
FROM dev AS builder

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY . .
RUN npm run build

# --- Production image ---
FROM node:24-alpine

WORKDIR /app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
