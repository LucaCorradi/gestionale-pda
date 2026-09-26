/*
    Etichetta barcode piccola (default 50 x 20 mm): due righe di descrizione in alto, sotto il barcode EAN-8 con il numero.
    Le misure sono calcolate in "dot" dalla risoluzione della stampante (203 dpi = 8 dot/mm).
*/

export type ZplLabelOptions = {
    description: string;
    // 7 cifre: la cifra di controllo la calcola la stampante (^B8), che stampa anche il numero sotto le barre
    barcodeBase: string;
    copies: number;
    dpi: number;
    widthMm: number;
    heightMm: number;
    // Larghezza del modulo (la barra più sottile) in dot: 3 = barcode di circa 25 mm a 203 dpi, 2 = circa 17 mm
    barcodeModuleDots: number;
};

const MARGIN_X_DOTS = 8;
const TOP_MARGIN_DOTS = 6;
const BOTTOM_MARGIN_DOTS = 6;
const LINE_GAP_DOTS = 2;
const TEXT_TO_BARCODE_GAP_DOTS = 6;
// Altezza della riga con il numero sotto le barre, stampata dalla stampante con il suo font di default
const INTERPRETATION_LINE_DOTS = 24;

// Altezze del carattere provate, dalla più grande: si sceglie la prima con cui la descrizione sta in due righe
const FONT_HEIGHTS = [24, 22, 20, 18, 16, 14];

// Larghezza media di un carattere del font 0 in rapporto all'altezza. Le descrizioni sono quasi tutte in maiuscolo,
// che è più largo del minuscolo: la stima è prudente, perché un testo troppo lungo in un ^FB su una riga si sovrappone.
const CHAR_WIDTH_RATIO = 0.62;

const mmToDots = (mm: number, dpi: number) => Math.round((mm * dpi) / 25.4);

// ^ e ~ sono caratteri di comando ZPL, e i caratteri di controllo non servono
const sanitize = (text: string) => text.replace(/\^/g, " ").replace(/~/g, "-").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();

/** Spezza il testo in al massimo due righe, andando a capo tra le parole; se non ci sta, tronca con "..". */
export function wrapInTwoLines(text: string, capacity: number): { lines: string[]; truncated: boolean } {
    // Un trattino separatore ("PRODUTTORE - PRODOTTO") resta in fondo alla riga di sopra invece di aprire quella sotto
    const tokens: string[] = [];
    for (const word of text.split(" ")) {
        if ((word === "-" || word === "–") && tokens.length > 0) tokens[tokens.length - 1] += ` ${word}`;
        else tokens.push(word);
    }

    const words = tokens.flatMap(word => {
        // una parola più lunga di una riga si spezza a forza
        const parts: string[] = [];
        for (let i = 0; i < word.length; i += capacity) parts.push(word.slice(i, i + capacity));
        return parts.length > 0 ? parts : [""];
    });

    const lines: string[] = [""];
    let truncated = false;

    for (const word of words) {
        const current = lines[lines.length - 1];
        const candidate = current ? `${current} ${word}` : word;

        if (candidate.length <= capacity) {
            lines[lines.length - 1] = candidate;
        } else if (lines.length < 2) {
            lines.push(word);
        } else {
            truncated = true;
            break;
        }
    }

    if (truncated) {
        const last = lines[1];
        lines[1] = (last.length + 2 > capacity ? last.slice(0, Math.max(0, capacity - 2)) : last) + "..";
    }

    return { lines: lines.filter(line => line.length > 0), truncated };
}

/** Sceglie il carattere più grande con cui la descrizione sta in due righe. */
function fitDescription(text: string, usableWidthDots: number): { lines: string[]; fontHeight: number } {
    for (const fontHeight of FONT_HEIGHTS) {
        const capacity = Math.floor(usableWidthDots / (fontHeight * CHAR_WIDTH_RATIO));
        const { lines, truncated } = wrapInTwoLines(text, capacity);
        if (!truncated) return { lines, fontHeight };
    }

    // nemmeno col carattere più piccolo: si tronca
    const fontHeight = FONT_HEIGHTS[FONT_HEIGHTS.length - 1];
    const capacity = Math.floor(usableWidthDots / (fontHeight * CHAR_WIDTH_RATIO));
    return { lines: wrapInTwoLines(text, capacity).lines, fontHeight };
}

export function buildBarcodeLabelZpl(options: ZplLabelOptions): string {
    const width = mmToDots(options.widthMm, options.dpi);
    const height = mmToDots(options.heightMm, options.dpi);
    const usableWidth = width - 2 * MARGIN_X_DOTS;

    const { lines, fontHeight } = fitDescription(sanitize(options.description), usableWidth);

    // Lo spazio per il testo è sempre quello di due righe del carattere più grande: così il barcode sta sempre
    // nella stessa posizione, e una descrizione corta (una riga sola) si centra in verticale in quello spazio.
    const maxFont = FONT_HEIGHTS[0];
    const textAreaHeight = 2 * maxFont + LINE_GAP_DOTS;
    const textBlockHeight = lines.length * fontHeight + (lines.length - 1) * LINE_GAP_DOTS;
    const textTop = TOP_MARGIN_DOTS + Math.round((textAreaHeight - textBlockHeight) / 2);

    // Barcode EAN-8: 67 moduli, centrato. Altezza delle barre = spazio rimasto, tolta la riga dei numeri.
    const module = Math.max(1, Math.round(options.barcodeModuleDots));
    const barcodeWidth = 67 * module;
    const barcodeX = Math.max(0, Math.round((width - barcodeWidth) / 2));
    const barcodeY = TOP_MARGIN_DOTS + textAreaHeight + TEXT_TO_BARCODE_GAP_DOTS;
    const barHeight = Math.max(20, height - barcodeY - INTERPRETATION_LINE_DOTS - BOTTOM_MARGIN_DOTS);

    const textFields = lines.map((line, index) =>
        `^FO${MARGIN_X_DOTS},${textTop + index * (fontHeight + LINE_GAP_DOTS)}^A0N,${fontHeight}^FB${usableWidth},1,0,C,0^FD${line}^FS`
    );

    return [
        "^XA",
        "^CI28",                                   // testo in UTF-8 (accenti)
        `^PW${width}`,
        `^LL${height}`,
        "^LH0,0",
        ...textFields,
        `^BY${module},2,${barHeight}`,
        `^FO${barcodeX},${barcodeY}^B8N,${barHeight},Y,N^FD${options.barcodeBase}^FS`,
        `^PQ${options.copies}`,
        "^XZ",
    ].join("\n");
}
