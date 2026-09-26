export interface PPProductResult {
    attributes: {
        "z:Id": string;
    };
    IDDati: string;
    IsParziale: [boolean, boolean];
    UltimaModifica: string;
    Alias: any;

    // AliquotaIVA: AliquotaIVA;

    AllegatoNome: string;
    AttivaLotto: boolean;
    AttivaRDA: boolean;
    CatPrezzi: number;
    CatSconti: number;
    CatStatCodice: string;
    CatStatDescrizione: string;

    // Categoria: Categoria;

    Codice: string;
    ColoreSfondo: number;
    ColoreTesto: number;

    // Componenti: any;
    ContoCorrispettivi: string;
    ContropartitaRicavo: string;

    CostoUltimo: number;
    DecimaliBarcode: number;

    Descrizione: string;
    // DescrizioneInLingua: any | null;
    DescrizioneSecondaria: string;
    DescrizioneStampa: string;

    DimensioneMatricola: number;

    // Fornitori: any[] | null;

    FotoNome: string;

    GestioneMatricola: number;
    // GestioneMatricolaEnum: GestioneMatricolaEnum;

    IdGestionale: number;

    ImmagineNome: string;

    IsAbbinatiMexalSpec: boolean;
    IsAliasSpec: boolean;
    IsAliquotaIVASpec: boolean;
    IsAttivo: boolean;
    IsCampionario: boolean;
    IsCategoriaSpec: boolean;
    IsComponentiSpec: boolean;
    IsDBA: boolean;
    IsDescLinguaSpec: boolean;
    IsFornitoriSpec: boolean;
    IsMagazziniSpec: boolean;
    IsPrezziSpec: boolean;
    IsScontoListinoSpec: boolean;
    IsSerieTagliaSpec: boolean;
    IsSoloAlias: boolean;
    IsSoloPrezzi: boolean;
    IsVariantiSpec: boolean;
    IsWeb: boolean;

    LayoutEtichette: string;

    // ListeArticolo: { string: string[] };

    // Magazzini: UnknownObject[] | null;

    NaturaCodice: string;
    NaturaDescrizione: string;

    OrdineGrafico: number;

    Prezzi: any;

    Prezzo: number;

    QtaConfezione: number;
    ScontoListino: number | null;
    ScortaMassima: number;
    ScortaMinima: number;

    Struttura: string;
    Tara: number;

    Tipo: number;
    TipoBarcode: number;
    // TipoBarcodeEnum: TipoBarcodeEnum;

    TipoConfezione: number;
    // TipoConfezioneEnum: TipoConfezioneEnum;

    // TipoEnum: TipoEnum;

    TipoSpesaSanitaria: string;

    UM1: string;
    UM2: string;
    UM2Fc: number;

    // Varianti: any[] | null;

    VoceAddebito: string;

    vvCodice: string;
}