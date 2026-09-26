import "reflect-metadata";
import { DataSource } from "typeorm";

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const dataSource: DataSource = new DataSource({
    type: "mysql",
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? "3306"),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    // Solo le entità di questo progetto. Il vecchio percorso "/../**" cercava in tutta la cartella superiore
    // (in Docker: nell'intero file system) e caricava anche copie del progetto rimaste accanto.
    entities: [__dirname + "/src/models/*Entity.ts"],
    synchronize: false,
    timezone: "local",
    // logging: process.env.ENVIRONMENT === "LOCAL",
    // logLevel: 'all',
    migrations: [__dirname + "/migrations/**/*.ts"],
});