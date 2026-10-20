import { promises as fs } from "fs";
import path from "path";
import { LoggerHandler } from "./loggerHandler";

/*
    Registri su file del palmare (prodotti creati, inventari): una riga JSON per evento, leggibile a occhio e facile da
    rielaborare. Stanno in logs/, montata fuori dal container: non si perdono a ogni ricostruzione.
    Scrivere il registro non deve mai far fallire l'operazione: in Passepartout è già stata fatta.
*/
export async function appendJsonLog(file: string, tag: string, entry: object): Promise<void> {
    try {
        const fullPath = path.resolve(file);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.appendFile(fullPath, JSON.stringify({ timestamp: new Date().toISOString(), ...entry }) + "\n", "utf8");
    } catch (err) {
        LoggerHandler.error(`[${tag}]: impossibile scrivere il registro - ${err}`);
    }
}
