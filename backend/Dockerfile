FROM node:24-bookworm-slim
WORKDIR /app

# tzdata: le date dei documenti di Passepartout e dei grafici dei frigoriferi sono in ora italiana (TZ nel compose)
RUN apt-get update && apt-get install -y --no-install-recommends tzdata \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --no-audit --no-fund && rm -rf /root/.npm

# Il backend gira con tsx (TypeORM carica le entità dai file .ts e gli import non hanno estensione): niente compilazione
# in JavaScript. Il controllo dei tipi lo fa "npm run build" sul PC prima del push.
COPY tsconfig.json appDataSource.ts fridgeDataSource.ts passepartoutDataSource.ts ./
COPY src ./src
COPY config ./config
RUN mkdir -p logs

EXPOSE 8789
CMD ["npx", "tsx", "src/index.ts"]
