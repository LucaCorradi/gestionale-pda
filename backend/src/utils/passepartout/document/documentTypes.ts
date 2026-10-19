export type GetDocumentiResult = {
	ContrattoDocumentoMagazzino: PPDocument[]
}


/**
 * MC = MOVIMENTA CARICO
 * MS = MOVIMENTA SCARICO
 * BF = BOLLA FORNITORE
 * BD = BOLLA DEPOSITO
 */
export type PPDocumentTypeEnum = 'MovimentaCarico' | 'MovimentaScarico' | 'BollaFornitore' | 'BollaDeposito';

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
