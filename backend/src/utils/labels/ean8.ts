/**
 * Cifra di controllo EAN-8 su 7 cifre: pesi 3,1,3,1,3,1,3 da sinistra.
 */
export function ean8CheckDigit(sevenDigits: string): number {
    if (!/^\d{7}$/.test(sevenDigits)) {
        throw new Error(`EAN-8: servono 7 cifre, ricevuto "${sevenDigits}"`);
    }

    const sum = [...sevenDigits].reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 3 : 1), 0);
    return (10 - (sum % 10)) % 10;
}

/**
 * Le 7 cifre da stampare: prefisso (2 cifre) + codice interno del prodotto (5 cifre).
 * Restituisce null se il codice non è di esattamente 5 cifre (es. gli articoli a peso "PLU 0085").
 */
export function productBarcodeBase(productCode: string, prefix: string): string | null {
    const code = productCode.trim();
    return /^\d{5}$/.test(code) && /^\d{2}$/.test(prefix) ? `${prefix}${code}` : null;
}

/**
 * Operazione inversa: da un barcode letto (es. 99208820) ricava il codice interno del prodotto (20882).
 * Restituisce null se non è un EAN-8 con quel prefisso e la cifra di controllo giusta.
 */
export function productCodeFromBarcode(barcode: string, prefix: string): string | null {
    const value = barcode.trim();
    if (!/^\d{8}$/.test(value) || !/^\d{2}$/.test(prefix) || !value.startsWith(prefix)) return null;

    const base = value.slice(0, 7);
    return Number(value[7]) === ean8CheckDigit(base) ? value.slice(2, 7) : null;
}

/** Barcode EAN-8 completo (8 cifre) di un prodotto, o null se il codice non è utilizzabile. Es. 20882 -> 99208820 */
export function productEan8(productCode: string, prefix: string): string | null {
    const base = productBarcodeBase(productCode, prefix);
    return base ? `${base}${ean8CheckDigit(base)}` : null;
}
