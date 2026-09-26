import { format } from "date-fns";
import { NotFoundError } from "../../errors/notFound";
import { InternalServerError } from "../../errors/internalServer";
import { OperationTypeName } from "../../models/operationTypeEntity";
import { OperationConfirmRequest, OperationConfirmResponse } from "../../schemas/operationConfirmSchema";
import { Supplier, Warehouse, Employee } from "../../schemas/operationDetailSchema";
import { ProductLookupResponse } from "../../schemas/productLookupSchema";
import { SOAPArgs, SOAPHandler } from "../soapHandler";
import { buildPPDocument, buildPutDocumentoXml } from "./document/documentHandler";
import { escapeXml } from "./article/articleXml";
import { getEanPrefix } from "../labels/labelConfig";
import { productCodeFromBarcode, productEan8 } from "../labels/ean8";
import { GetDocumentiResult, PPDocument, PPDocumentTypeEnum } from "./document/documentTypes";
import { PPEmployeesResult } from "./types/employeeTypes";
import { PPProductResult } from "./types/productTypes";
import { PPSuppliersResult } from "./types/supplierTypes";
import { PPWarehousesResult } from "./types/warehouseTypes";

interface LoginData {
    Password: string;
    Utente: string;
}

export class PassepartoutHandler {

    private static loginData: LoginData = {
        Password: process.env.PASSEPARTOUT_SOAP_PASSWORD || '',
        Utente: process.env.PASSEPARTOUT_SOAP_USER || ''
    };

    public static async getEmployees(): Promise<Employee[]> {
        const soapHandler = SOAPHandler.getInstance();

        const args: SOAPArgs = {
            datiLogin: PassepartoutHandler.loginData
        };
        const ppEmployees = await soapHandler.callMethod<PPEmployeesResult>('GetPersonale', args);

        // Configurazione: gruppo (o più gruppi separati da virgola) da cui prendere gli operatori dei palmari.
        // Se non impostata vengono mostrati tutti.
        const groups = (process.env.PASSEPARTOUT_EMPLOYEES_GROUP ?? '')
            .split(',')
            .map(group => group.trim().toLowerCase())
            .filter(group => group.length > 0);

        const employees = groups.length === 0
            ? ppEmployees.ContrattoPersonale
            : ppEmployees.ContrattoPersonale.filter(employee => groups.includes(String(employee.Gruppo ?? '').trim().toLowerCase()));

        // Un gruppo configurato male farebbe sparire il campo Operatore dal palmare: meglio un errore chiaro
        if (groups.length > 0 && employees.length === 0) {
            throw new InternalServerError(`Nessun operatore nel gruppo "${groups.join(', ')}" di Passepartout: controllare PASSEPARTOUT_EMPLOYEES_GROUP`);
        }

        const data = employees.map(employee => ({
            ID: +employee.IdGestionale,
            EmployeeName: employee.Nome,
            EmployeeGroup: employee.Gruppo
        }));

        return data;
    }

    public static async getWarehouses(): Promise<Warehouse[]> {
        const soapHandler = SOAPHandler.getInstance();

        const args: SOAPArgs = {
            datiLogin: PassepartoutHandler.loginData,
            ultimaModifica: ''
        };

        const ppWarehouses = await soapHandler.callMethod<PPWarehousesResult>('GetMagazzini', args);

        // Configurazione: magazzini da non mostrare nei palmari (nomi separati da virgola, senza distinguere maiuscole).
        // Servono per quelli che in Passepartout non si possono eliminare ma non sono in uso.
        const hidden = (process.env.PASSEPARTOUT_HIDDEN_WAREHOUSES ?? '')
            .split(',')
            .map(name => name.trim().toLowerCase())
            .filter(name => name.length > 0);

        const visible = ppWarehouses.string.filter(warehouse => !hidden.includes(String(warehouse).trim().toLowerCase()));

        // Un elenco da nascondere sbagliato non deve far sparire il campo Magazzino dal palmare: meglio un errore chiaro
        if (hidden.length > 0 && visible.length === 0) {
            throw new InternalServerError('Nessun magazzino da mostrare: controllare PASSEPARTOUT_HIDDEN_WAREHOUSES');
        }

        const data = visible.map(warehouse => ({
            Name: warehouse
        }));

        return data;
    }

    public static async getSuppliers(): Promise<Supplier[]> {
        const soapHandler = SOAPHandler.getInstance();

        const args: SOAPArgs = {
            datiLogin: PassepartoutHandler.loginData,
            ultimaModifica: ''
        };
        const ppSuppliers = await soapHandler.callMethod<PPSuppliersResult>('GetFornitori', args);

        const data = ppSuppliers.ContrattoFornitore.map(supplier => ({
            ID: supplier.IdGestionale,
            CompanyName: supplier.RagioneSociale
        }));

        return data;
    }

    // Un prefisso mal configurato non deve far fallire la ricerca del prodotto: semplicemente niente etichetta
    private static labelBarcode(productCode: string): string | null {
        try {
            return productEan8(productCode, getEanPrefix());
        } catch {
            return null;
        }
    }

    private static mapProduct(product: PPProductResult): ProductLookupResponse {
        // Con un solo alias la libreria soap restituisce un oggetto, con più alias un array, senza alias una stringa vuota
        const rawAliases = typeof product.Alias === "object" && product.Alias ? product.Alias.PMBAlias : undefined;
        const aliases = (Array.isArray(rawAliases) ? rawAliases : rawAliases ? [rawAliases] : [])
            .map(alias => ({ Code: String(alias.Codice).trim(), Type: alias.TipoEnum }));

        return {
            Code: product.Codice,
            Name: product.Descrizione,
            UnitOfMeasure: product.UM1,
            Price: `${Number(product.Prezzo).toFixed(2)} €`,
            FridgeUUID: null,
            VatRate: product.AliquotaIVA?.Codice ?? null,
            Category: product.Categoria?.Descrizione ?? null,
            IsActive: product.IsAttivo,
            LabelBarcode: PassepartoutHandler.labelBarcode(product.Codice),
            Aliases: aliases
        };
    }

    /** Restituisce l'articolo che ha quell'alias, o null se nessun articolo lo usa. */
    public static async findProductByAlias(alias: string): Promise<ProductLookupResponse | null> {
        const soapHandler = SOAPHandler.getInstance();

        const args: SOAPArgs = {
            datiLogin: PassepartoutHandler.loginData,
            alias,
        };

        const product = await soapHandler.callMethodNullable<PPProductResult>('GetArticoloAlias', args);
        return product ? PassepartoutHandler.mapProduct(product) : null;
    }

    /**
     * Risolve un valore digitato o letto con lo scanner. Nell'ordine:
     * 1. alias esatto di un articolo
     * 2. barcode delle nostre etichette (prefisso + codice a 5 cifre + controllo): Passepartout lo riconosce alla cassa
     *    come formato speciale, ma il web service no, quindi si ricava il codice prodotto da qui
     * 3. codice prodotto diretto
     * Non usarlo per controllare se un alias è libero: per quello serve findProductByAlias, che guarda solo gli alias.
     */
    public static async findProductByScan(scanned: string): Promise<ProductLookupResponse | null> {
        const value = scanned.trim();
        if (!value) return null;

        const byAlias = await PassepartoutHandler.findProductByAlias(value);
        if (byAlias) return byAlias;

        let labelCode: string | null = null;
        try {
            labelCode = productCodeFromBarcode(value, getEanPrefix());
        } catch {
            // prefisso mal configurato: si salta questo passaggio
        }
        if (labelCode) {
            const byLabel = await PassepartoutHandler.findProductByCode(labelCode);
            if (byLabel) return byLabel;
        }

        return await PassepartoutHandler.findProductByCode(value);
    }

    public static async getProductByAlias(alias: string): Promise<ProductLookupResponse> {
        const product = await PassepartoutHandler.findProductByScan(alias);
        if (!product) {
            throw new NotFoundError("Product not found");
        }

        return product;
    }

    /** Restituisce l'articolo con quel codice (il "nome" in Passepartout), o null se non esiste. */
    public static async findProductByCode(code: string): Promise<ProductLookupResponse | null> {
        const soapHandler = SOAPHandler.getInstance();

        const args: SOAPArgs = {
            datiLogin: PassepartoutHandler.loginData,
            codice: code,
        };

        const product = await soapHandler.callMethodNullable<PPProductResult>('GetArticolo', args);
        return product ? PassepartoutHandler.mapProduct(product) : null;
    }

    /*
        Chiamate "grezze" sugli articoli: servono per rileggere e rimandare il contratto intero senza perdere campi
        (aggiunta alias) e per scrivere un articolo nuovo.
    */
    private static buildRequest(methodName: string, body: string): string {
        const { Utente, Password } = PassepartoutHandler.loginData;

        return `
            <soapenv:Envelope
                xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                xmlns:tem="http://tempuri.org/"
                xmlns:pmes="http://schemas.datacontract.org/2004/07/PMessageBox.Kernel">
                <soapenv:Header/>
                <soapenv:Body>
                    <tem:${methodName}>
                        <tem:datiLogin>
                            <pmes:Password>${escapeXml(Password)}</pmes:Password>
                            <pmes:Utente>${escapeXml(Utente)}</pmes:Utente>
                        </tem:datiLogin>
                        ${body}
                    </tem:${methodName}>
                </soapenv:Body>
            </soapenv:Envelope>
        `;
    }

    /** Risposta XML completa di GetArticolo, o null se l'articolo non esiste. */
    public static async getArticleXml(code: string): Promise<string | null> {
        const soapHandler = SOAPHandler.getInstance();

        const xml = await soapHandler.callMethodRawText('GetArticolo', PassepartoutHandler.buildRequest('GetArticolo', `<tem:codice>${escapeXml(code)}</tem:codice>`));
        return /<GetArticoloResult[^>]*i:nil="true"/.test(xml) ? null : xml;
    }

    /**
     * Risposta XML di GetArticoli. Senza data restituisce tutti gli articoli (decine di MB, circa 30 secondi),
     * con `modifiedSince` solo quelli nuovi o modificati da quel momento.
     */
    public static async getArticlesXml(modifiedSince?: Date): Promise<string> {
        const soapHandler = SOAPHandler.getInstance();

        const body = modifiedSince
            ? `<tem:ultimaModifica>${format(modifiedSince, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")}</tem:ultimaModifica>`
            : '';

        return await soapHandler.callMethodRawText('GetArticoli', PassepartoutHandler.buildRequest('GetArticoli', body));
    }

    /** Scrive (crea o aggiorna) un articolo. `articleXml` è l'elemento <tem:articolo> completo. */
    public static async putArticle(articleXml: string): Promise<void> {
        const soapHandler = SOAPHandler.getInstance();

        await soapHandler.callMethodRawText('PutArticolo', PassepartoutHandler.buildRequest('PutArticolo', articleXml));
    }

    // public static async getDocument(documentType: PPDocumentTypeEnum): Promise<PPDocument | null> {  
    //     const dateFormatted = format(new Date(), "yyyy-MM-dd");
        
    //     const soapHandler = SOAPHandler.getInstance();

    //     const args: SOAPArgs = {
    //         datiLogin: PassepartoutHandler.loginData,
    //         ultimaModifica: dateFormatted,
    //     };

    //     const documents = await soapHandler.callMethod<GetDocumentiResult>("GetDocumenti", args);

    //     // Ordino i documents per numero e filtro per tipo 
        
    //     const sortedDocuments = documents.ContrattoDocumentoMagazzino.filter(doc => doc.TipoEnum == documentType)
    //         .sort((a, b) => Number(b.Numero) - Number(a.Numero));

    //     return sortedDocuments.length > 0 ? sortedDocuments[0] : null;  
    // }

    public static async putDocument(operationConfirmRequest: OperationConfirmRequest, operationType: OperationTypeName, departmentName: string) {
        const argsPPDocument: PPDocument = buildPPDocument(operationConfirmRequest, operationType, departmentName);

        const soapHandler = SOAPHandler.getInstance();

        const xmlBody = buildPutDocumentoXml(argsPPDocument);

        const ppDocument = await soapHandler.callMethodRaw<PPDocument>('PutDocumento', xmlBody);

        // const ppDocument = await this.getDocument(argsPPDocument.TipoEnum);
        // if (!ppDocument) {
        //     throw new InternalServerError("Impossibile creare un documento Passepartout")
        // }

        const payload: OperationConfirmResponse = {
            Number: ppDocument.Numero!,
            Date: format(new Date(ppDocument.Data), "yyyy-MM-dd"),
            EmployeeName: operationConfirmRequest.EmployeeName,
            OperationType: operationType,
            Products: operationConfirmRequest.Products
        }

        if (ppDocument.AnagraficaRagioneSociale !== "!--NP--!") {
            payload.Supplier = ppDocument.AnagraficaRagioneSociale;
        }
        if (ppDocument.MagazzinoTestata !== "!--NP--!" && (operationType == OperationTypeName.MOVIMENTA_CARICO || operationType == OperationTypeName.CARICO_FORNITORE)) {
            payload.WarehouseFrom = ppDocument.MagazzinoTestata;
        }

        if (argsPPDocument.MagazzinoTestata !== "!--NP--!" && operationType == OperationTypeName.MOVIMENTA_SCARICO) {
            payload.WarehouseTo = ppDocument.MagazzinoTestata;
        }

        return payload;
    }


    
}
