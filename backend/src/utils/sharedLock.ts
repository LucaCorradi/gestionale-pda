import { mkdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConflictError } from "../errors/conflict";

/*
    Blocco tra PROGRAMMI diversi: il palmare e gestionale-fatture creano entrambi articoli in Passepartout con i codici della
    serie 90001+ (vedi articleCatalog). Se scegliessero il prossimo codice libero nello stesso momento userebbero lo stesso
    numero e PutArticolo, che sovrascrive, ne cancellerebbe uno. Il blocco è una cartella creata in modo atomico in una
    directory dell'host montata in entrambi i container (PASSEPARTOUT_LOCK_DIR, /var/lib/cdf-condivisi/passepartout).
    Stesso meccanismo e stesso nome di blocco di gestionale-fatture (backend/src/lib/blocco-condiviso.ts): vanno tenuti uguali.
    Senza PASSEPARTOUT_LOCK_DIR vale solo dentro questo processo.
*/

const EXPIRY_MS = 2 * 60_000;
const MAX_WAIT_MS = 30_000;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function withSharedLock<T>(name: string, task: () => Promise<T>): Promise<T> {
    const dir = join(process.env.PASSEPARTOUT_LOCK_DIR || tmpdir(), `${name}.lock`);
    const start = Date.now();
    for (;;) {
        try {
            await mkdir(dir);
            break;
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
            // Blocco rimasto da un programma morto a metà: dopo la scadenza si considera abbandonato
            const createdAt = await stat(dir).then((s) => s.mtimeMs).catch(() => 0);
            if (Date.now() - createdAt > EXPIRY_MS) await rm(dir, { recursive: true, force: true });
            else if (Date.now() - start > MAX_WAIT_MS) throw new ConflictError("Creazione articoli occupata da un altro programma: riprova tra poco");
            else await wait(300);
        }
    }
    try {
        return await task();
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
}
