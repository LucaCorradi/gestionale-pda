export type GetDocumentiResult = {
	ContrattoDocumentoMagazzino: PPDocument[]
}


/**
 * MC = MOVIMENTA CARICO
 * MS = MOVIMENTA SCARICO
 * BF = BOLLA FORNITORE
 * BD = BOLLA DEPOSITO
 */
// Inventario: la quantità della riga si SOMMA all'inventario dell'articolo nel magazzino (provato il 20/10/2026: 3 poi 5 → 8,
// anche negativa): per portare la giacenza al contato si manda la differenza (vedi services/inventoryService.ts)
export type PPDocumentTypeEnum = 'MovimentaCarico' | 'MovimentaScarico' | 'BollaFornitore' | 'BollaDeposito' | 'Inventario';

/** Riga documento completa */
export type PPDocumentRow = {
	Codice: string;

	Quantita: string;

	Magazzino: string;
	Magazzino2?: string;

	TipoRigaEnum: 'Standard' | 'Nota' | 'Componente'; // default: 'Standard'
};

export type PPDocument = {
	AnagraficaRagioneSociale?: string;

	Causale: string;

	MagDestTestata: string;
	MagazzinoTestata: string;

	Data: string;
	Numero?: number;

	Nota: string;

	TipoEnum: PPDocumentTypeEnum;

	Righe: {
    	PMBRigaDocumento: PPDocumentRow[];
  	};
};
