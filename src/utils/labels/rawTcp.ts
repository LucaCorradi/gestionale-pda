import net from "net";
import { InternalServerError } from "../../errors/internalServer";

const CONNECT_TIMEOUT_MS = 5000;

/**
 * Invia dati grezzi a una stampante di rete (es. Zebra, porta 9100) e chiude la connessione.
 * Le Zebra non rispondono: si considera inviato quando i dati sono stati scritti e il socket si chiude.
 */
export function sendRawTcp(host: string, port: number, data: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
        const socket = net.createConnection({ host, port });
        let settled = false;

        const fail = (message: string) => {
            if (settled) return;
            settled = true;
            socket.destroy();
            reject(new InternalServerError(message));
        };

        socket.setTimeout(CONNECT_TIMEOUT_MS);
        socket.once("timeout", () => fail(`Stampante ${host}:${port} non raggiungibile (timeout)`));
        socket.once("error", (err: NodeJS.ErrnoException) => fail(`Stampante ${host}:${port} non raggiungibile (${err.code ?? err.message})`));

        socket.once("connect", () => {
            socket.write(data, (err) => {
                if (err) return fail(`Invio alla stampante ${host}:${port} fallito (${err.message})`);
                socket.end();
            });
        });

        socket.once("close", () => {
            if (settled) return;
            settled = true;
            resolve();
        });
    });
}
