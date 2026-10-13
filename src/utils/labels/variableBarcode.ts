import fs from "fs";
import path from "path";
import { z } from "zod";
import { LoggerHandler } from "../loggerHandler";

/*
    Barcode a quantità variabile (es. teglia di lasagne etichettata: 299 + 00451 + 0300 + controllo).
    Passepartout li riconosce alla cassa con la sua "impostazione codici a barre", ma il web service no: qui si scompone il
    codice letto secondo i formati descritti in un file JSON (BARCODE_VARIABILI_FILE, di default config/barcode-variabili.json).
    Il file si rilegge a ogni scansione: una modifica si vede subito, senza riavviare.
*/

const campoSchema = z.discriminatedUnion("tipo", [
    z.object({ tipo: z.literal("prefisso"), cifre: z.number().int().min(1), valore: z.string().regex(/^\d+$/) }),
    z.object({ tipo: z.literal("codice"), cifre: z.number().int().min(1) }),
    z.object({ tipo: z.literal("quantita"), cifre: z.number().int().min(1), decimali: z.number().int().min(0).default(0) }),
    z.object({ tipo: z.literal("controllo"), cifre: z.literal(1) }),
    // cifre che ci sono nel barcode ma non servono (riservate, versione, ecc.)
    z.object({ tipo: z.literal("ignora"), cifre: z.number().int().min(1) })
]);

const formatoSchema = z.object({
    nome: z.string(),
    campi: z.array(campoSchema).min(2),
    // Come cercare l'articolo con il "codice" estratto, nell'ordine (si ferma al primo che trova):
    //  - "codice": campo Codice dell'articolo, così com'è (es. 90054)
    //  - "aliasSenzaZeri": alias dell'articolo, con gli zeri iniziali tolti (es. 00345 -> 345, il PLU bilancia)
    ricerca: z.array(z.enum(["codice", "aliasSenzaZeri"])).min(1).default(["codice", "aliasSenzaZeri"]),
    // Se indicato, "aliasSenzaZeri" accetta solo alias di quel tipo (es. "PLUBilance"): evita di scambiare un alias qualsiasi con lo stesso numero
    tipoAlias: z.string().optional()
}).superRefine((formato, ctx) => {
    const conta = (tipo: string) => formato.campi.filter(c => c.tipo === tipo).length;
    if (conta("codice") !== 1) ctx.addIssue({ code: "custom", message: "serve esattamente un campo \"codice\"" });
    if (conta("quantita") > 1) ctx.addIssue({ code: "custom", message: "al massimo un campo \"quantita\"" });
    if (conta("controllo") > 1) ctx.addIssue({ code: "custom", message: "al massimo un campo \"controllo\"" });
    for (const campo of formato.campi) {
        if (campo.tipo === "prefisso" && campo.valore.length !== campo.cifre) {
            ctx.addIssue({ code: "custom", message: `il prefisso "${campo.valore}" non è di ${campo.cifre} cifre` });
        }
    }
});
const configSchema = z.array(formatoSchema);
export type VariableBarcodeFormat = z.infer<typeof formatoSchema>;

export type ParsedVariableBarcode = {
    format: VariableBarcodeFormat;
    /** Cifre del campo "codice" così come stampate (es. "00451") */
    code: string;
    /** Quantità letta dal barcode, già con i decimali applicati; null se il formato non ha il campo quantità */
    quantity: number | null;
};

/** Cifra di controllo EAN/UPC: dalla cifra più a destra dei dati, pesi 3,1,3,1... (vale per EAN-13 su 12 cifre e EAN-8 su 7) */
export function eanCheckDigit(payload: string): number {
    const sum = [...payload].reverse().reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 3 : 1), 0);
    return (10 - (sum % 10)) % 10;
}

export function configPath(): string {
    return path.resolve((process.env.BARCODE_VARIABILI_FILE ?? "").trim() || "config/barcode-variabili.json");
}

// Un file mancante non è un errore (funzione non usata); uno sbagliato viene segnalato una volta per contenuto, non a ogni scansione
let lastReportedError = "";
function reportOnce(message: string): void {
    if (message === lastReportedError) return;
    lastReportedError = message;
    LoggerHandler.warn(`[barcode-variabili]: ${message}`);
}

export function loadVariableBarcodeFormats(): VariableBarcodeFormat[] {
    const file = configPath();
    if (!fs.existsSync(file)) return [];

    try {
        const formats = configSchema.parse(JSON.parse(fs.readFileSync(file, "utf8")));
        lastReportedError = "";
        return formats;
    } catch (error) {
        const detail = error instanceof z.ZodError
            ? error.issues.map(i => `${i.path.join(".") || "(radice)"}: ${i.message}`).join("; ")
            : (error as Error).message;
        reportOnce(`file ${file} non valido, formati ignorati -> ${detail}`);
        return [];
    }
}

/** Scompone un barcode secondo un formato; null se lunghezza, prefisso o cifra di controllo non tornano. */
export function parseWithFormat(format: VariableBarcodeFormat, barcode: string): ParsedVariableBarcode | null {
    const total = format.campi.reduce((sum, c) => sum + c.cifre, 0);
    if (barcode.length !== total || !/^\d+$/.test(barcode)) return null;

    let position = 0;
    let code = "";
    let quantity: number | null = null;

    for (const campo of format.campi) {
        const digits = barcode.slice(position, position + campo.cifre);

        if (campo.tipo === "prefisso" && digits !== campo.valore) return null;
        if (campo.tipo === "controllo" && Number(digits) !== eanCheckDigit(barcode.slice(0, position))) return null;
        if (campo.tipo === "codice") code = digits;
        if (campo.tipo === "quantita") quantity = Number(digits) / 10 ** campo.decimali;

        position += campo.cifre;
    }

    return { format, code, quantity };
}

/** Il primo formato configurato che riconosce il barcode, o null (anche se il file manca o è sbagliato). */
export function parseVariableBarcode(barcode: string): ParsedVariableBarcode | null {
    const value = barcode.trim();
    for (const format of loadVariableBarcodeFormats()) {
        const parsed = parseWithFormat(format, value);
        if (parsed) return parsed;
    }
    return null;
}
