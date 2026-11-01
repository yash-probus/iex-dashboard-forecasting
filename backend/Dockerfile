# --- Build Stage ---
FROM node:20-slim AS builder

WORKDIR /app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Install openssl (required for Prisma to run migrations in builder)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy configuration files
COPY package*.json tsconfig.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy the rest of the backend source code
COPY src ./src
COPY scripts ./scripts
COPY assets ./assets
COPY market_selection_forecast ./market_selection_forecast
COPY *.csv ./

# Generate Prisma Client and build the TypeScript application
RUN npx prisma generate
RUN npm run build


# --- Production Stage ---
FROM node:20-slim AS runner

WORKDIR /app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Install openssl, chromium, and Python dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    chromium \
    postgresql-client \
    python3 \
    python3-pip \
    python3-numpy \
    python3-pandas \
    python3-scipy \
    python3-sklearn \
    && rm -rf /var/lib/apt/lists/*

# Install python-docx and lightgbm (pre-compiled binary wheels)
RUN pip3 install --break-system-packages lightgbm python-docx SQLAlchemy psycopg2-binary python-dotenv pdfplumber requests python-dateutil

# Copy package configurations and prisma files
COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --only=production

# Copy compiled JS files and prisma client binaries from the builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/assets ./assets
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/market_selection_forecast ./market_selection_forecast

# Expose backend port
EXPOSE 5001

ENV PORT=5001
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Start command
CMD ["node", "dist/server.js"]
