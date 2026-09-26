import { Request, Response, NextFunction } from "express";
import { DataSource } from "typeorm";
import { LoggerHandler } from "../utils/loggerHandler";

type DataSourceData = {
    name: string;
    ds: DataSource;
}

const MAX_RETRIES = 3;

const tryConnect = async (dataSource: DataSource, label: string): Promise<void> => {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            if (dataSource.isInitialized) {
                await dataSource.destroy(); // Distruzione stato connessione deprecato
            }
            await dataSource.initialize();
            LoggerHandler.log(`[database]: ${label} connected`);
            return;
        } catch (err) {
            LoggerHandler.error(`[database]: ${label} connection attempt ${attempt}/${MAX_RETRIES} failed`);
            if (attempt < MAX_RETRIES) {
                await new Promise((resolve) => setTimeout(resolve, 1000)); // Attesa di un secondo
            }
        }
    }
    throw new Error(`[database]: ${label} failed to connect after ${MAX_RETRIES} attempts`);
};

const ensureInitialized = async (dataSource: DataSource, name: string): Promise<void> => {
    // Se non è mai stato inizializzato
    if (!dataSource.isInitialized) {
        LoggerHandler.log(`[database]: ${name} not initialized, attempting connection...`);
        await tryConnect(dataSource, name);
        return;
    }

    // Se è inizializzato, verifica che la connessione sia viva
    try {
        await dataSource.query("SELECT 1");
    } catch (err) {
        LoggerHandler.log(`[database]: ${name} connection lost, reconnecting...`);
        await tryConnect(dataSource, name);
    }
};

export const databaseMiddleware = (dataSources: DataSourceData[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await Promise.all(
                dataSources.map(({ ds, name }) => ensureInitialized(ds, name))
            );
            next();
        } catch(e) {
            next(e);
        }
    };
}