import { InternalServerError } from "../../errors/internalServer";

/*
    Configurazione della stampante etichette (Zebra di rete, ZPL su TCP). Si legge dalle variabili d'ambiente a ogni uso,
    così una modifica ai file env si vede al riavvio senza toccare il codice.
*/
export type LabelConfig = {
    host: string;
    port: number;
    // Le prime due cifre del barcode EAN-8: prefisso + codice interno a 5 cifre = 7 cifre, l'ottava è il controllo
    eanPrefix: string;
    dpi: number;
    widthMm: number;
    heightMm: number;
    barcodeModuleDots: number;
};

const positiveNumber = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export function getEanPrefix(): string {
    const prefix = (process.env.LABEL_EAN8_PREFIX ?? "").trim() || "99";
    if (!/^\d{2}$/.test(prefix)) {
        throw new InternalServerError(`LABEL_EAN8_PREFIX deve essere di 2 cifre (valore attuale: "${prefix}")`);
    }
    return prefix;
}

export function getLabelConfig(): LabelConfig {
    const host = (process.env.LABEL_PRINTER_HOST ?? "").trim();
    if (!host) {
        throw new InternalServerError("Stampante etichette non configurata: impostare LABEL_PRINTER_HOST");
    }

    return {
        host,
        port: positiveNumber(process.env.LABEL_PRINTER_PORT, 9100),
        eanPrefix: getEanPrefix(),
        dpi: positiveNumber(process.env.LABEL_PRINTER_DPI, 203),
        widthMm: positiveNumber(process.env.LABEL_WIDTH_MM, 50),
        heightMm: positiveNumber(process.env.LABEL_HEIGHT_MM, 20),
        barcodeModuleDots: Math.min(6, Math.max(1, Math.round(positiveNumber(process.env.LABEL_BARCODE_MODULE_DOTS, 3)))),
    };
}
