import { format } from "date-fns";
import { InternalServerError } from "../../../errors/internalServer";
import { ALIAS_TYPES, AliasType, UnitOfMeasure, VatRate } from "./articleCatalog";

/*
    Costruzione e modifica dell'XML del contratto articolo (PutArticolo).

    WCF vuole i campi in ordine alfabetico e con i namespace giusti: per questo la creazione parte da un modello
    fisso ricavato da un articolo reale (creato con successo in prova) e la modifica rilegge l'articolo da
    Passepartout e lo rimanda intero, cambiando solo il necessario.
*/

const NS_ARTICLE = "http://schemas.datacontract.org/2004/07/PMessageBox.Contract.Articolo";
const NS_CONTRACT = "http://schemas.datacontract.org/2004/07/PMessageBox.Contract";
const NS_COMMON = "http://schemas.datacontract.org/2004/07/PMessageBox.Contract.Common";
const NS_ARRAYS = "http://schemas.microsoft.com/2003/10/Serialization/Arrays";

export type CategoryEntry = {
    Code: string;
    Description: string;
    ParentCode: string | null;
    ParentDescription: string | null;
    // Frammento <a:Categoria>…</a:Categoria> così come lo restituisce Passepartout, pronto da reinserire
    Xml: string;
};

export type NewArticle = {
    code: string;
    name: string;
    unit: UnitOfMeasure;
    vat: VatRate;
    category: CategoryEntry | null;
    aliases: { code: string; type: AliasType }[];
};

export function escapeXml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

type Element = { start: number; end: number; inner: string; selfClosed: boolean };

/**
 * Trova <tag …>…</tag> a partire da `from`, contando gli annidamenti dello stesso tag (es. Padre dentro Padre).
 * Evita regex sull'intera risposta: GetArticoli pesa decine di MB.
 */
export function findElement(xml: string, tag: string, from = 0): Element | null {
    const open = `<${tag}`;
    let start = xml.indexOf(open, from);
    // deve essere proprio quel tag e non uno che inizia allo stesso modo (es. a:Alias / a:AliasSpec)
    while (start >= 0 && !/[\s>/]/.test(xml[start + open.length] ?? "")) {
        start = xml.indexOf(open, start + open.length);
    }
    if (start < 0) return null;

    const openEnd = xml.indexOf(">", start);
    if (xml[openEnd - 1] === "/") {
        return { start, end: openEnd + 1, inner: "", selfClosed: true };
    }

    const close = `</${tag}>`;
    let depth = 1;
    let pos = openEnd + 1;
    while (depth > 0) {
        const nextClose = xml.indexOf(close, pos);
        if (nextClose < 0) return null;

        // apertura annidata dello stesso tag prima della prossima chiusura?
        let nextOpen = xml.indexOf(open, pos);
        while (nextOpen >= 0 && nextOpen < nextClose && !/[\s>/]/.test(xml[nextOpen + open.length] ?? "")) {
            nextOpen = xml.indexOf(open, nextOpen + open.length);
        }
        if (nextOpen >= 0 && nextOpen < nextClose) {
            const nestedEnd = xml.indexOf(">", nextOpen);
            if (xml[nestedEnd - 1] !== "/") depth++;
            pos = nestedEnd + 1;
        } else {
            depth--;
            pos = nextClose + close.length;
        }
    }

    return { start, end: pos, inner: xml.slice(openEnd + 1, pos - close.length), selfClosed: false };
}

export function unescapeXml(str: string): string {
    return str
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, "&");
}

const removeRefs = (xml: string) => xml.replace(/ z:Id="[^"]*"/g, "");

const textOf = (xml: string, tag: string): string | null => {
    const m = xml.match(new RegExp(`<${tag}(?: [^>]*)?>([^<]*)</${tag}>`));
    return m ? unescapeXml(m[1]) : null;
};

// Blocchi annidati che hanno campi con lo stesso nome dell'articolo (Codice, Descrizione, IdGestionale...)
const NESTED_BLOCKS = ["a:Alias", "a:AliquotaIVA", "a:Categoria", "a:Prezzi", "a:Fornitori", "a:Componenti", "a:Magazzini"];

const withoutNestedBlocks = (articleInner: string): string => {
    let top = articleInner;
    for (const tag of NESTED_BLOCKS) {
        const el = findElement(top, tag);
        if (el) top = top.slice(0, el.start) + top.slice(el.end);
    }
    return top;
};

/*
    ---------------------------------------------------------------
    Categorie
    ---------------------------------------------------------------
*/

function parseCategory(fragment: string): CategoryEntry | null {
    const cat = findElement(fragment, "a:Categoria");
    if (!cat || cat.selfClosed) return null;

    const padre = findElement(cat.inner, "a:Padre");
    const ownFields = padre ? cat.inner.slice(0, padre.start) + cat.inner.slice(padre.end) : cat.inner;

    const code = textOf(ownFields, "a:Codice");
    if (!code) return null;

    return {
        Code: code,
        Description: textOf(ownFields, "a:Descrizione") ?? code,
        ParentCode: padre && !padre.selfClosed ? textOf(padre.inner, "a:Codice") : null,
        ParentDescription: padre && !padre.selfClosed ? textOf(padre.inner, "a:Descrizione") : null,
        Xml: fragment,
    };
}

export type ArticleSummary = {
    Code: string;
    Name: string;
    IsActive: boolean;
};

/**
 * Legge una risposta di GetArticoli (completa o incrementale) e ne ricava, in un solo passaggio:
 * - l'elenco sintetico degli articoli (codice, descrizione, attivo) per ricerche e calcolo del prossimo codice
 * - le categorie in uso (Passepartout non ha una chiamata per elencarle: si prende un esempio per ogni codice)
 */
export function extractArticleIndex(getArticoliXml: string): { articles: ArticleSummary[]; categories: CategoryEntry[] } {
    const articles: ArticleSummary[] = [];
    const categories = new Map<string, CategoryEntry>();

    let pos = 0;
    while (true) {
        const article = findElement(getArticoliXml, "a:ContrattoArticolo", pos);
        if (!article) break;
        pos = article.end;
        if (article.selfClosed) continue;

        const top = withoutNestedBlocks(article.inner);
        const code = textOf(top, "a:Codice");
        if (code) {
            articles.push({
                Code: code.trim(),
                Name: (textOf(top, "a:Descrizione") ?? "").trim(),
                IsActive: textOf(top, "a:IsAttivo") !== "false"
            });
        }

        const cat = findElement(article.inner, "a:Categoria");
        if (!cat || cat.selfClosed) continue;

        const entry = parseCategory(removeRefs(article.inner.slice(cat.start, cat.end)));
        if (entry && !categories.has(entry.Code)) {
            categories.set(entry.Code, entry);
        }
    }

    return {
        articles,
        categories: [...categories.values()].sort((a, b) => a.Description.localeCompare(b.Description, "it"))
    };
}

/*
    ---------------------------------------------------------------
    Alias
    ---------------------------------------------------------------
*/

function buildAliasXml(alias: { code: string; type: AliasType }): string {
    const code = escapeXml(alias.code);
    return `<a:PMBAlias><a:Codice>${code}</a:Codice><a:Descrizione>${code}</a:Descrizione><a:FornitoreCF/><a:FornitorePIVA/><a:FornitoreRagSoc/><a:IdMexal i:nil="true"/><a:PosTaglia>-1</a:PosTaglia><a:QtaUm>0.0000</a:QtaUm><a:Tipo>${ALIAS_TYPES[alias.type]}</a:Tipo><a:TipoEnum>${alias.type}</a:TipoEnum><a:UM/></a:PMBAlias>`;
}

/*
    ---------------------------------------------------------------
    Nuovo articolo
    ---------------------------------------------------------------
*/

const wrapArticle = (body: string) =>
    `<tem:articolo xmlns:a="${NS_ARTICLE}" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">${body}</tem:articolo>`;

// Listini presenti su tutti gli articoli reali. Il prezzo resta a zero: lo imposta l'ufficio.
const PRICE_LISTS: { name: string; vatIncluded: boolean }[] = [
    { name: "Vendita", vatIncluded: true },
    { name: "Base", vatIncluded: false },
    { name: "App Delivery", vatIncluded: true },
    { name: "Ecommerce", vatIncluded: true },
    { name: "B2B", vatIncluded: true },
];

export function buildNewArticleXml(article: NewArticle): string {
    const code = escapeXml(article.code);
    const now = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");

    const vat = article.vat;
    const vatXml = `<a:AliquotaIVA xmlns:b="${NS_COMMON}"><b:ApplicaBollo>false</b:ApplicaBollo><b:Codice>${escapeXml(vat.Code)}</b:Codice><b:Descrizione>${escapeXml(vat.Code)}</b:Descrizione><b:IsAgricola>false</b:IsAgricola><b:Natura>${vat.Nature}</b:Natura><b:Percentuale>${vat.Percentage}</b:Percentuale><b:RepartoFiscale>${vat.TaxDepartment}</b:RepartoFiscale><b:Target>${vat.Target}</b:Target><b:TargetEnum>${vat.TargetEnum}</b:TargetEnum><b:TipoMerceFatturaSM>${vat.InvoiceGoodsType}</b:TipoMerceFatturaSM></a:AliquotaIVA>`;

    const categoryXml = article.category ? article.category.Xml : `<a:Categoria i:nil="true"/>`;
    const aliasesXml = article.aliases.map(buildAliasXml).join("");
    const pricesXml = PRICE_LISTS.map(l =>
        `<a:PMBVoceListino><a:IsIVAInclusa>${l.vatIncluded}</a:IsIVAInclusa><a:NomeListino>${l.name}</a:NomeListino><a:NumMexal i:nil="true"/><a:Prezzo>0</a:Prezzo></a:PMBVoceListino>`
    ).join("");

    const body =
        `<IDDati xmlns="${NS_CONTRACT}"></IDDati><IsParziale xmlns="${NS_CONTRACT}">false</IsParziale><UltimaModifica xmlns="${NS_CONTRACT}">${now}</UltimaModifica>` +
        `<a:AbbinatiMexal i:nil="true" xmlns:b="${NS_ARRAYS}"/>` +
        `<a:Alias>${aliasesXml}</a:Alias>` +
        vatXml +
        `<a:AllegatoBin i:nil="true"/><a:AllegatoNome/><a:AttivaLotto>false</a:AttivaLotto><a:AttivaRDA>false</a:AttivaRDA><a:CatPrezzi>0</a:CatPrezzi><a:CatSconti>0</a:CatSconti><a:CatStatCodice/><a:CatStatDescrizione/>` +
        categoryXml +
        `<a:Codice>${code}</a:Codice><a:ColoreSfondo>0</a:ColoreSfondo><a:ColoreTesto>0</a:ColoreTesto><a:Componenti/><a:ContoCorrispettivi/><a:ContropartitaRicavo/><a:CostoUltimo>0</a:CostoUltimo><a:DecimaliBarcode>0</a:DecimaliBarcode>` +
        `<a:Descrizione>${escapeXml(article.name)}</a:Descrizione>` +
        `<a:DescrizioneInLingua xmlns:b="${NS_ARRAYS}"/><a:DescrizioneSecondaria/><a:DescrizioneStampa/><a:DimensioneMatricola>0</a:DimensioneMatricola><a:Extra i:nil="true"/><a:Fornitori/><a:FotoBin i:nil="true"/><a:FotoNome/><a:GestioneMatricola>0</a:GestioneMatricola><a:GestioneMatricolaEnum>Disabilitata</a:GestioneMatricolaEnum>` +
        `<a:IdGestionale>-1</a:IdGestionale><a:ImmagineBin i:nil="true"/><a:ImmagineNome/>` +
        `<a:IsAbbinatiMexalSpec>false</a:IsAbbinatiMexalSpec><a:IsAliasSpec>true</a:IsAliasSpec><a:IsAliquotaIVASpec>true</a:IsAliquotaIVASpec><a:IsAttivo>true</a:IsAttivo><a:IsCampionario>false</a:IsCampionario><a:IsCategoriaSpec>true</a:IsCategoriaSpec><a:IsComponentiSpec>true</a:IsComponentiSpec><a:IsDBA>false</a:IsDBA><a:IsDescLinguaSpec>false</a:IsDescLinguaSpec><a:IsFornitoriSpec>true</a:IsFornitoriSpec><a:IsMagazziniSpec>true</a:IsMagazziniSpec><a:IsModificabileInConto i:nil="true"/><a:IsParziale>false</a:IsParziale><a:IsPrezziSpec>true</a:IsPrezziSpec><a:IsScontoListinoSpec>false</a:IsScontoListinoSpec><a:IsSerieTagliaSpec>true</a:IsSerieTagliaSpec><a:IsSoloAlias>false</a:IsSoloAlias><a:IsSoloPrezzi>false</a:IsSoloPrezzi><a:IsVariantiSpec>true</a:IsVariantiSpec><a:IsWeb>false</a:IsWeb><a:LayoutEtichette/>` +
        `<a:ListeArticolo xmlns:b="${NS_ARRAYS}"><b:string>Base</b:string></a:ListeArticolo><a:Magazzini/><a:NaturaCodice/><a:NaturaDescrizione/><a:OrdineGrafico>0</a:OrdineGrafico>` +
        `<a:Prezzi>${pricesXml}</a:Prezzi><a:Prezzo>0</a:Prezzo><a:QtaConfezione>0.00</a:QtaConfezione><a:ScontoListino/><a:ScortaMassima>0</a:ScortaMassima><a:ScortaMinima>0</a:ScortaMinima><a:SerieTaglia i:nil="true"/><a:Struttura/><a:Tara>0.0000</a:Tara><a:Tipo>0</a:Tipo><a:TipoBarcode>0</a:TipoBarcode><a:TipoBarcodeEnum>Niente</a:TipoBarcodeEnum><a:TipoConfezione>0</a:TipoConfezione><a:TipoConfezioneEnum>Disabilitata</a:TipoConfezioneEnum><a:TipoEnum>Semplice</a:TipoEnum><a:TipoSpesaSanitaria/>` +
        `<a:UM1>${article.unit}</a:UM1><a:UM2/><a:UM2Fc>1</a:UM2Fc><a:Varianti xmlns:b="${NS_ARRAYS}"/><a:VoceAddebito/><a:vvCodice>${code}</a:vvCodice>`;

    return wrapArticle(body);
}

/*
    ---------------------------------------------------------------
    Modifica di un articolo esistente (aggiunta alias)
    ---------------------------------------------------------------
*/

/**
 * Prende la risposta di GetArticolo e restituisce il contenuto del contratto pronto per essere rimandato.
 * Se l'XML contiene riferimenti (z:Ref) non è sicuro rimandarlo: meglio fermarsi che rovinare l'articolo.
 */
export function extractArticleBody(getArticoloXml: string): { body: string; code: string; id: number } {
    // GetArticolo mette i campi direttamente dentro <GetArticoloResult>, GetArticoli dentro ogni <a:ContrattoArticolo>
    const article = findElement(getArticoloXml, "GetArticoloResult") ?? findElement(getArticoloXml, "a:ContrattoArticolo");
    if (!article || article.selfClosed) {
        throw new InternalServerError("Articolo non presente nella risposta di Passepartout");
    }
    if (/ z:Ref="/.test(article.inner)) {
        throw new InternalServerError("Articolo con riferimenti interni, modifica non supportata");
    }

    // dal contratto tolgo i campi annidati con nomi uguali prima di leggere codice e id
    const top = withoutNestedBlocks(article.inner);
    const code = textOf(top, "a:Codice");
    const id = Number(textOf(top, "a:IdGestionale"));
    if (!code || !Number.isInteger(id) || id <= 0) {
        throw new InternalServerError("Codice o id dell'articolo non leggibili");
    }

    return { body: removeRefs(article.inner), code, id };
}

/** Aggiunge un alias alla lista esistente e restituisce il corpo aggiornato. */
export function addAliasToBody(body: string, alias: { code: string; type: AliasType }): string {
    const existing = findElement(body, "a:Alias");
    if (!existing) {
        throw new InternalServerError("Sezione alias non trovata nell'articolo");
    }

    const aliasXml = buildAliasXml(alias);
    const now = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");

    const newAliasBlock = existing.selfClosed
        ? `<a:Alias>${aliasXml}</a:Alias>`
        : `<a:Alias>${existing.inner}${aliasXml}</a:Alias>`;

    return (body.slice(0, existing.start) + newAliasBlock + body.slice(existing.end))
        .replace(/(<UltimaModifica[^>]*>)[^<]*(<\/UltimaModifica>)/, `$1${now}$2`);
}

export const wrapArticleBody = wrapArticle;
