import { appendJsonLog } from "./jsonLog";

/*
    Registro dei prodotti creati o modificati (dati principali, nuovi alias) da palmare (vedi jsonLog.ts).
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

export async function logCreatedProduct(entry: CreatedProductLogEntry): Promise<void> {
    await appendJsonLog(process.env.CREATED_PRODUCTS_LOG_PATH || "./logs/created-products.log", "created-products-log", entry);
}
