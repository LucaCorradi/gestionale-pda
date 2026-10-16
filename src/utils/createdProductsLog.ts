import { promises as fs } from "fs";
import path from "path";
import { LoggerHandler } from "./loggerHandler";

/*
    Registro dei prodotti creati o modificati (dati principali, nuovi alias) da palmare.
    Una riga JSON per evento, così è leggibile a occhio e facile da rielaborare.
    Non contiene l'operatore: chi ha creato l'articolo lo registra già Passepartout (utente del web service).
*/

export type CreatedProductLogEntry =
    | {
        event: "created";
        code: string;
        name: string;
        unitOfMeasure: string;
        vatRate: string;
        category: string | null;
        salePrice: number | null;
        aliases: { code: string; type: string }[];
    }
    | {
        event: "updated";
        code: string;
        name: string;
        // solo i campi cambiati, con valore precedente e nuovo
        changes: Record<string, { from: string | number | null; to: string | number | null }>;
    }
    | {
        event: "alias-added";
        code: string;
        name: string;
        alias: { code: string; type: string };
    };

const logPath = () => path.resolve(process.env.CREATED_PRODUCTS_LOG_PATH || "./logs/created-products.log");

export async function logCreatedProduct(entry: CreatedProductLogEntry): Promise<void> {
    try {
        const file = logPath();
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.appendFile(file, JSON.stringify({ timestamp: new Date().toISOString(), ...entry }) + "\n", "utf8");
    } catch (err) {
        // L'articolo è già stato scritto in Passepartout: un problema sul file non deve far fallire l'operazione
        LoggerHandler.error(`[created-products-log]: impossibile scrivere il registro - ${err}`);
    }
}
