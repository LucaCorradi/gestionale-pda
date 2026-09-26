/*
    Valori ammessi per la creazione di un articolo da palmare.
    Le aliquote IVA sono copiate 1:1 dagli oggetti che Passepartout restituisce per gli articoli esistenti
    (non esiste una chiamata SOAP per elencarle). Se in Passepartout ne viene aggiunta una nuova, va aggiunta qui.
*/

export type VatRate = {
    Code: string;
    Percentage: string;
    TaxDepartment: number;
    Nature: string;
    Target: number;
    TargetEnum: "Beni" | "Servizi";
    InvoiceGoodsType: string;
};

export const VAT_RATES: VatRate[] = [
    { Code: "4%", Percentage: "4.00", TaxDepartment: 3, Nature: "Nessuna", Target: 0, TargetEnum: "Beni", InvoiceGoodsType: "MeteriePrime" },
    { Code: "10%", Percentage: "10.00", TaxDepartment: 2, Nature: "Nessuna", Target: 0, TargetEnum: "Beni", InvoiceGoodsType: "MeteriePrime" },
    { Code: "22% Beni", Percentage: "22.00", TaxDepartment: 1, Nature: "Nessuna", Target: 0, TargetEnum: "Beni", InvoiceGoodsType: "MeteriePrime" },
    { Code: "Somministrazione", Percentage: "10.00", TaxDepartment: 8, Nature: "Nessuna", Target: 1, TargetEnum: "Servizi", InvoiceGoodsType: "ServiziContoLavoroSenzaMateriaPrima" },
    { Code: "22% Servizi", Percentage: "22.00", TaxDepartment: 6, Nature: "Nessuna", Target: 1, TargetEnum: "Servizi", InvoiceGoodsType: "ServiziContoLavoroSenzaMateriaPrima" },
];

export const UNITS_OF_MEASURE = ["pz", "kg", "L"] as const;
export type UnitOfMeasure = typeof UNITS_OF_MEASURE[number];

/*
    Tipi di alias di Passepartout (EnumTipoAlias). Il numero è il campo "Tipo" che accompagna TipoEnum:
    Generico=0, PLUBilance=1, EAN8=2 ed EAN13=3 sono verificati sugli articoli esistenti,
    gli altri seguono l'ordine dell'enumerazione nel WSDL.
    "Generico" è il tipo usato anche per i codici a barre (3312 alias su 3325 non da bilancia); EAN13 ed EAN8 sono rari.
*/
export const ALIAS_TYPES = {
    Generico: 0,
    PLUBilance: 1,
    EAN8: 2,
    EAN13: 3,
    Code39: 4,
    Code93: 5,
    Code128: 6,
    CodeI2of5: 7,
    SSN: 8,
    Enoweb: 9,
} as const;
export type AliasType = keyof typeof ALIAS_TYPES;
export const ALIAS_TYPE_NAMES = Object.keys(ALIAS_TYPES) as [AliasType, ...AliasType[]];

/*
    Codice articolo. Passepartout via SOAP non lo genera (errore "Il campo Nome di MetaElemento non è stato valorizzato"):
    va sempre passato. Gli articoli "normali" hanno 5 cifre numeriche in sequenza (es. 20881), quelli a peso da bilancia
    hanno la forma "PLU 0085" e restano di competenza dell'ufficio.
*/
export const ARTICLE_CODE_LENGTH = 5;

/*
    Passepartout tiene un contatore suo per il pulsante "genera codice" (oggi intorno a 20883) e un articolo creato via
    SOAP NON lo fa avanzare: usando la stessa sequenza, l'ufficio si ritroverebbe lo stesso codice già assegnato dal palmare.
    Per questo gli articoli creati da palmare usano un intervallo separato, che il contatore dell'ufficio non raggiungerà.
    Sono comunque codici a 5 cifre, e si riconoscono a colpo d'occhio come "creati da palmare".
*/
export const PDA_CODE_FIRST = 90001;
export const PDA_CODE_LAST = 99999;
