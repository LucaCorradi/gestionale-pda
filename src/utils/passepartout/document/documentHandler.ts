import { BadRequestError } from "../../../errors/badRequest";
import { OperationTypeName } from "../../../models/operationTypeEntity";
import { OperationConfirmRequest } from "../../../schemas/operationConfirmSchema";
import { PPDocument, PPDocumentRow, PPDocumentTypeEnum } from "./documentTypes";

type OpConfig = {
    // Tipo documento PP da inviare
    documentType: PPDocumentTypeEnum;

    // Funzione che genera il testo causale in base al dipartimento
    causal: (departmentName: string) => string;
    
    documentNumberSource: "none" | "fromRequest";

    supplier: "required" | "none";

    magazzinoTestataKey?: "WarehouseFrom" | "WarehouseTo";
    magDestTestataKey?: "WarehouseFrom" | "WarehouseTo";
};

const OP_CONFIG: Record<OperationTypeName, OpConfig> = {
    [OperationTypeName.MOVIMENTA_CARICO]: {
        documentType: "MovimentaCarico",
        causal: (departmentName: string) => `CARICO PRODUZIONE ${departmentName}`,

        documentNumberSource: "none",
        
        supplier: "none",
        
        magazzinoTestataKey: "WarehouseTo",
    },
    [OperationTypeName.MOVIMENTA_SCARICO]: {
        documentType: "MovimentaScarico",
        causal: (departmentName: string) => `SCARICO ${departmentName}`,

        documentNumberSource: "none",

        supplier: "none",

        magazzinoTestataKey: "WarehouseFrom",
    },
    [OperationTypeName.SPOSTAMENTO_MAGAZZINO]: {
        documentType: "BollaDeposito",
        causal: () => "SPOSTAMENTO INTERNO",
        
        documentNumberSource: "none",
        
        supplier: "none",
        
        magazzinoTestataKey: "WarehouseFrom",
        
        magDestTestataKey: "WarehouseTo"
    },
    [OperationTypeName.CARICO_FORNITORE]: {
        documentType: "BollaFornitore",
        causal: () => "ARRIVO MERCE",

        documentNumberSource: "fromRequest",

        supplier: "required",
        
        magazzinoTestataKey: "WarehouseTo",
    }
};

export function buildPPDocument(request: OperationConfirmRequest, operationType: OperationTypeName, departmentName: string): PPDocument {
    const cfg: OpConfig = OP_CONFIG[operationType];

    const rows: PPDocumentRow[] = request.Products.map(p => ({
        Codice: p.Code,
        // NoMovMag: operationType == OperationTypeName.SPOSTAMENTO_MAGAZZINO,

        Quantita: p.Quantity.toFixed(2),

        Magazzino: "",

        TipoRigaEnum: "Standard"
    }));    


    const doc: PPDocument = {
        AnagraficaRagioneSociale: "",
        Causale: cfg.causal(departmentName),
        TipoEnum: cfg.documentType,
        Data: request.DocumentDate,
        MagazzinoTestata: "",
        MagDestTestata: "",
        Nota: "",
        Righe: {
            PMBRigaDocumento: rows
        },
    };

    // Numero
    if (cfg.documentNumberSource === "fromRequest") {
        if (!request.DocumentNumber) {
            throw new BadRequestError("Missing document number");
        }

        doc.Numero = request.DocumentNumber;
    }

    // Fornitore
    if (cfg.supplier === "required") {
        if (!request.Supplier) {
            throw new BadRequestError("Missing supplier");
        }

        doc.AnagraficaRagioneSociale = request.Supplier;
    }

    // magazzinoTestata
    if (cfg.magazzinoTestataKey) {
        if (request[cfg.magazzinoTestataKey] == null) {
            throw new BadRequestError(`Missing ${cfg.magazzinoTestataKey}`);
        }
        doc.MagazzinoTestata = request[cfg.magazzinoTestataKey] ?? "";

        rows.forEach(row => {
            row.Magazzino = doc.MagazzinoTestata;
        });
    }


    // magDestTestata
    if (cfg.magDestTestataKey) {
        if (request[cfg.magDestTestataKey] == null) {
            throw new BadRequestError(`Missing ${cfg.magDestTestataKey}`);
        }
        doc.MagDestTestata = request[cfg.magDestTestataKey] ?? "";

        rows.forEach(row => {
            row.Magazzino2 = doc.MagDestTestata;
        });
    }

    doc.Nota = `Dipendente: ${request.EmployeeName}`;

    // Ordinamento chiavi alfabetico
    const docWithKeySorted = Object.fromEntries(
        Object.entries(doc).sort(([a], [b]) => a.localeCompare(b))
    );

    return docWithKeySorted as PPDocument;
}

export function buildPutDocumentoXml(document: PPDocument): string {

    const user = process.env.PASSEPARTOUT_SOAP_USER!;
    const password = process.env.PASSEPARTOUT_SOAP_PASSWORD!;

    return `
        <soapenv:Envelope 
            xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
            xmlns:tem="http://tempuri.org/" 
            xmlns:pmes="http://schemas.datacontract.org/2004/07/PMessageBox.Kernel" 
            xmlns:ser="http://schemas.microsoft.com/2003/10/Serialization/" 
            xmlns:pmes1="http://schemas.datacontract.org/2004/07/PMessageBox.Contract" 
            xmlns:pmes2="http://schemas.datacontract.org/2004/07/PMessageBox.Contract.Magazzino" 
            xmlns:pmes3="http://schemas.datacontract.org/2004/07/PMessageBox.Contract.Common">
            <soapenv:Header/>
            <soapenv:Body>
                <tem:PutDocumento>
                    <tem:datiLogin>
                        <pmes:Password>${password}</pmes:Password>
                        <pmes:Utente>${user}</pmes:Utente>
                    </tem:datiLogin>
                    <tem:documento>
                        <pmes2:AnagraficaRagioneSociale>${escapeXml(document.AnagraficaRagioneSociale ?? "")}</pmes2:AnagraficaRagioneSociale>
                        <pmes2:Causale>${escapeXml(document.Causale)}</pmes2:Causale>
                        <pmes2:Data>${escapeXml(document.Data)}</pmes2:Data>
                        <pmes2:MagDestTestata>${escapeXml(document.MagDestTestata)}</pmes2:MagDestTestata>
                        <pmes2:MagazzinoTestata>${escapeXml(document.MagazzinoTestata)}</pmes2:MagazzinoTestata>
                        <pmes2:Nota>${escapeXml(document.Nota)}</pmes2:Nota>
                        ${
                            document.Numero ?
                                `<pmes2:Numero>${escapeXml(String(document.Numero))}</pmes2:Numero>`
                            : ""
                        }
                        <pmes2:Righe>
                                ${
                                    document.Righe.PMBRigaDocumento.map(row => {
                                        return `
                                            <pmes2:PMBRigaDocumento>
                                                <pmes2:Codice>${escapeXml(row.Codice)}</pmes2:Codice>
                                                <pmes2:Magazzino>${escapeXml(row.Magazzino)}</pmes2:Magazzino>
                                                <pmes2:Magazzino2>${escapeXml(row.Magazzino2 ?? row.Magazzino)}</pmes2:Magazzino2>
                                                <pmes2:Quantita>${escapeXml(row.Quantita)}</pmes2:Quantita>
                                                <pmes2:TipoRigaEnum>${escapeXml(row.TipoRigaEnum)}</pmes2:TipoRigaEnum>
                                            </pmes2:PMBRigaDocumento>
                                        `
                                    }).join('')
                                }    
                        </pmes2:Righe>
                        <pmes2:TipoEnum>${escapeXml(document.TipoEnum)}</pmes2:TipoEnum>
                    </tem:documento>
                </tem:PutDocumento>
            </soapenv:Body>
        </soapenv:Envelope>
    `;
}

function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
