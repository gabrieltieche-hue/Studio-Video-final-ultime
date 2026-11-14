FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    curl \
  && rm -rf /var/lib/apt/lists/*

# Optional Treg CLI fallback (app also calls https://treg.to directly over HTTP)
RUN curl -fsSL https://treg.to/install.sh | sh || true
ENV PATH="/root/.local/bin:${PATH}"

WORKDIR /app

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi

COPY . .
RUN npm run build

ENV NODE_ENV=production \
    PORT=3000 \
    STORAGE_DIR=/app/storage \
    ALWAYS_ON_SERVER=true

RUN mkdir -p /app/storage/social /app/storage/renders

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-3000}/api/health" || exit 1

CMD ["npm", "run", "start"]
