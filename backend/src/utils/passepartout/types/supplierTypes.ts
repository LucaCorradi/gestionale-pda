export type PPSuppliersResult = {
    ContrattoFornitore: PPSupplier[];
}

export type PPSupplier = {
    attributes: {
        "z:Id": string;
    };
    IDDati: string;
    IsParziale: boolean[];
    UltimaModifica: string;
    BancaAbi: string;
    BancaBic: string;
    BancaCab: string;
    BancaCinBban: string;
    BancaCinIban: string;
    BancaIban: string;
    BancaNome: string;
    BancaNumeroConto: string;
    BancaPaese: string;
    Cap: string;
    Cellulare: string;
    Cittadinanza: string;
    CodiceFiscale: string;
    CodiceMexal: string;
    CodiceRete: string;
    Cognome: string;
    Cortesia: string;
    Email: string;
    Fax: string;
    IdGestionale: number;
    Indirizzo: string;
    IsAliquotaIVASpec: boolean;
    Localita: string;
    LuogoNascita: string;
    Nazione: string;
    NazioneNascita: string;
    NazioneNascitaSigla: string;
    NazioneSigla: string;
    Nome: string;
    Note: string;
    Note2: string;
    PartitaIVA: string;
    Provincia: string;
    ProvinciaNascita: string;
    RagioneSociale: string;
    Telefono: string;
    Telefono2: string;
    TipoAnagrafica: number;
    TipoAnagraficaEnum: string;
    TipoChiave: number;
    TipoChiaveEnum: string;
}