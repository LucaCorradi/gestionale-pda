import { format } from "date-fns";
import { NotFoundError } from "../../errors/notFound";
import { OperationTypeName } from "../../models/operationTypeEntity";
import { OperationConfirmRequest, OperationConfirmResponse } from "../../schemas/operationConfirmSchema";
import { Supplier, Warehouse, Employee } from "../../schemas/operationDetailSchema";
import { ProductLookupResponse } from "../../schemas/productLookupSchema";
import { SOAPArgs, SOAPHandler } from "../soapHandler";
import { buildPPDocument, buildPutDocumentoXml } from "./document/documentHandler";
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

        const data = ppEmployees.ContrattoPersonale.map(employee => ({
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

        const data = ppWarehouses.string.map(warehouse => ({
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

    public static async getProductByAlias(alias: number): Promise<ProductLookupResponse> {
        const soapHandler = SOAPHandler.getInstance();

        const args: SOAPArgs = {
            datiLogin: PassepartoutHandler.loginData,
            alias,
        };

        const product = await soapHandler.callMethod<PPProductResult>('GetArticoloAlias', args);
        if (!product) {
            throw new NotFoundError("Product not found");
        }

        const payload: ProductLookupResponse = {
            Code: product.Codice,
            Name: product.Descrizione,
            UnitOfMeasure: product.UM1,
            Price: `${product.Prezzo.toFixed(2)} €`,
            FridgeUUID: null
        };

        return payload;
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
