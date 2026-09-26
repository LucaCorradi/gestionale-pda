import { BadRequestError } from "../errors/badRequest";
import { NotFoundError } from "../errors/notFound";
import { ProductPrintLabelResponse } from "../schemas/productManageSchema";
import { getLabelConfig } from "../utils/labels/labelConfig";
import { ean8CheckDigit, productBarcodeBase } from "../utils/labels/ean8";
import { sendRawTcp } from "../utils/labels/rawTcp";
import { buildBarcodeLabelZpl } from "../utils/labels/zpl";
import { LoggerHandler } from "../utils/loggerHandler";
import { PassepartoutHandler } from "../utils/passepartout/passepartoutHandler";

export class LabelService {
    /**
     * Stampa `copies` etichette barcode (EAN-8) per un articolo di Passepartout.
     * Barcode = prefisso configurato + codice interno a 5 cifre + cifra di controllo. La descrizione è quella attuale di Passepartout.
     */
    public async printProductLabel(code: string, copies: number): Promise<ProductPrintLabelResponse> {
        // La configurazione si controlla per prima: senza stampante inutile andare a leggere l'articolo
        const config = getLabelConfig();

        const product = await PassepartoutHandler.findProductByCode(code);
        if (!product) {
            throw new NotFoundError("Product not found");
        }

        const barcodeBase = productBarcodeBase(product.Code, config.eanPrefix);
        if (!barcodeBase) {
            throw new BadRequestError(`Il codice ${product.Code} non è di 5 cifre numeriche: non si può ricavare il barcode`);
        }

        const zpl = buildBarcodeLabelZpl({
            description: product.Name,
            barcodeBase,
            copies,
            dpi: config.dpi,
            widthMm: config.widthMm,
            heightMm: config.heightMm,
            barcodeModuleDots: config.barcodeModuleDots,
        });

        await sendRawTcp(config.host, config.port, Buffer.from(zpl, "utf8"));

        const barcode = `${barcodeBase}${ean8CheckDigit(barcodeBase)}`;
        LoggerHandler.log(`[labels]: stampate ${copies} etichette per ${product.Code} (${barcode}) su ${config.host}:${config.port}`);

        return { Code: product.Code, Barcode: barcode, Copies: copies };
    }
}

export const labelService = new LabelService();
