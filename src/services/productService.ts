import { BadRequestError } from "../errors/badRequest";
import { ConflictError } from "../errors/conflict";
import { InternalServerError } from "../errors/internalServer";
import { NotFoundError } from "../errors/notFound";
import { ProductLookupResponse } from "../schemas/productLookupSchema";
import { ProductAddAliasRequest, ProductCatalogResponse, ProductCreateRequest, ProductSearchResponse } from "../schemas/productManageSchema";
import { ALIAS_TYPE_NAMES, ARTICLE_CODE_LENGTH, PDA_CODE_FIRST, PDA_CODE_LAST, UNITS_OF_MEASURE, VAT_RATES } from "../utils/passepartout/article/articleCatalog";
import { ArticleSummary, CategoryEntry, addAliasToBody, buildNewArticleXml, extractArticleBody, extractArticleIndex, wrapArticleBody } from "../utils/passepartout/article/articleXml";
import { PassepartoutHandler } from "../utils/passepartout/passepartoutHandler";
import { logCreatedProduct } from "../utils/createdProductsLog";
import { LoggerHandler } from "../utils/loggerHandler";

const SEARCH_LIMIT = 100;
const MAX_CODE_ATTEMPTS = 10;

const FULL_RELOAD_MS = 6 * 60 * 60 * 1000;   // ricarico tutto ogni tanto (non arrivano le cancellazioni fatte in Passepartout)
const DELTA_MIN_INTERVAL_MS = 60 * 1000;     // tra una ricerca e l'altra non rileggo più di una volta al minuto
const DELTA_MARGIN_MS = 5 * 60 * 1000;       // margine per differenze di orologio tra server e Passepartout

const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/*
    Per ricerche, categorie e calcolo del prossimo codice serve conoscere gli articoli, ma Passepartout via SOAP
    non ha né una ricerca per descrizione né un elenco delle categorie. Si tiene quindi in memoria un indice
    ricavato da GetArticoli: completo all'avvio (circa 30 secondi, in background) e poi aggiornato con le sole
    modifiche recenti. Nessun accesso diretto al database di Passepartout.
*/
export class ProductService {
    private articles = new Map<string, ArticleSummary>();
    private categories = new Map<string, CategoryEntry>();
    private lastFullLoadAt = 0;
    private lastSyncStartedAt: Date | null = null;
    private lastSyncAt = 0;
    private syncing: Promise<void> | null = null;

    // Le scritture su Passepartout passano una alla volta: il codice nuovo si calcola sull'ultimo esistente
    private writeQueue: Promise<unknown> = Promise.resolve();

    private runExclusive<T>(task: () => Promise<T>): Promise<T> {
        const result = this.writeQueue.then(task, task);
        this.writeQueue = result.catch(() => undefined);
        return result;
    }

    private async runSync(full: boolean): Promise<void> {
        const startedAt = new Date();
        const since = full || !this.lastSyncStartedAt ? undefined : new Date(this.lastSyncStartedAt.getTime() - DELTA_MARGIN_MS);

        const xml = await PassepartoutHandler.getArticlesXml(since);
        const { articles, categories } = extractArticleIndex(xml);

        // Svuoto solo a lettura riuscita: se la ricarica fallisce resta l'indice precedente
        if (!since) {
            this.articles.clear();
            this.categories.clear();
            this.lastFullLoadAt = Date.now();
        }
        articles.forEach(a => this.articles.set(a.Code, a));
        categories.forEach(c => this.categories.set(c.Code, c));

        this.lastSyncStartedAt = startedAt;
        this.lastSyncAt = Date.now();
        LoggerHandler.log(`[products]: indice ${since ? 'aggiornato' : 'caricato'} (${articles.length} articoli letti, ${this.articles.size} in memoria, ${this.categories.size} categorie)`);
    }

    /**
     * Porta l'indice a un livello di aggiornamento accettabile.
     * `force` rilegge le modifiche recenti anche se la lettura precedente è di pochi secondi fa.
     */
    private sync(force = false): Promise<void> {
        const needsFull = this.lastSyncStartedAt === null || Date.now() - this.lastFullLoadAt > FULL_RELOAD_MS;
        const stale = Date.now() - this.lastSyncAt > DELTA_MIN_INTERVAL_MS;

        if (!needsFull && !force && !stale) return Promise.resolve();

        if (!this.syncing) {
            this.syncing = this.runSync(needsFull).finally(() => { this.syncing = null; });
        }
        return this.syncing;
    }

    // Se ho già un indice, un aggiornamento fallito non blocca le ricerche: si usa quello che c'è
    private async ensureIndex(): Promise<void> {
        try {
            await this.sync();
        } catch (err) {
            LoggerHandler.error(`[products]: aggiornamento indice fallito - ${err}`);
            if (this.lastSyncStartedAt === null) throw err;
        }
    }

    public warmUp(): void {
        this.sync().catch(err => LoggerHandler.error(`[products]: caricamento iniziale fallito - ${err}`));
    }

    public async getCatalog(): Promise<ProductCatalogResponse> {
        // Non si aspetta l'indice degli articoli: IVA, unità di misura e tipi di alias sono fissi, e le categorie
        // (che il palmare non chiede più) sono quelle già caricate, se ce ne sono. Così il form si apre subito
        // anche subito dopo un riavvio, quando l'indice è ancora in caricamento.
        this.warmUp();

        const categories = [...this.categories.values()].sort((a, b) => a.Description.localeCompare(b.Description, "it"));

        return {
            UnitsOfMeasure: [...UNITS_OF_MEASURE],
            VatRates: VAT_RATES.map(v => v.Code),
            AliasTypes: [...ALIAS_TYPE_NAMES],
            Categories: categories.map(c => ({ Code: c.Code, Description: c.Description, ParentDescription: c.ParentDescription }))
        };
    }

    /** Cerca per descrizione: ogni parola digitata deve comparire nella descrizione (senza distinguere maiuscole e accenti). */
    public async searchByDescription(query: string): Promise<ProductSearchResponse[]> {
        const words = normalize(query).split(/\s+/).filter(w => w.length > 0);
        if (words.length === 0) {
            return [];
        }

        await this.ensureIndex();

        return [...this.articles.values()]
            .filter(a => {
                const name = normalize(a.Name);
                return words.every(w => name.includes(w));
            })
            .sort((a, b) => Number(b.IsActive) - Number(a.IsActive) || a.Name.localeCompare(b.Name, "it"))
            .slice(0, SEARCH_LIMIT)
            .map(a => ({ Code: a.Code, Name: a.Name, IsActive: a.IsActive }));
    }

    public async getByCode(code: string): Promise<ProductLookupResponse> {
        const product = await PassepartoutHandler.findProductByCode(code);
        if (!product) {
            throw new NotFoundError("Product not found");
        }

        return product;
    }

    // Prossimo codice dell'intervallo riservato al palmare (90001, 90002, ...): vedi articleCatalog per il motivo
    private async nextArticleCode(): Promise<string> {
        const pattern = new RegExp(`^\\d{${ARTICLE_CODE_LENGTH}}$`);
        const used = [...this.articles.keys()]
            .filter(c => pattern.test(c))
            .map(Number)
            .filter(n => n >= PDA_CODE_FIRST && n <= PDA_CODE_LAST);

        // Controllo anche direttamente in Passepartout che il codice sia libero, per sicurezza
        for (let candidate = used.length > 0 ? Math.max(...used) + 1 : PDA_CODE_FIRST, attempt = 0; attempt < MAX_CODE_ATTEMPTS; candidate++, attempt++) {
            if (candidate > PDA_CODE_LAST) break;

            const code = String(candidate);
            if (!(await PassepartoutHandler.findProductByCode(code))) {
                return code;
            }
        }

        throw new InternalServerError("Nessun codice articolo libero trovato nell'intervallo del palmare");
    }

    private async assertAliasFree(aliasCode: string, allowedCode?: string): Promise<void> {
        const existing = await PassepartoutHandler.findProductByAlias(aliasCode);
        if (!existing) return;

        const sameArticle = allowedCode !== undefined && existing.Code === allowedCode;
        throw new ConflictError(
            sameArticle
                ? `L'alias ${aliasCode} è già presente su questo articolo`
                : `L'alias ${aliasCode} è già associato a "${existing.Name}" (codice ${existing.Code})`,
            { Code: existing.Code, Name: existing.Name }
        );
    }

    public async createProduct(request: ProductCreateRequest): Promise<ProductLookupResponse> {
        const vat = VAT_RATES.find(v => v.Code === request.VatRate);
        if (!vat) {
            throw new BadRequestError(`Aliquota IVA non valida: ${request.VatRate}`);
        }

        const aliases = request.Aliases.map(a => ({ code: a.Code, type: a.Type }));
        if (new Set(aliases.map(a => a.code)).size !== aliases.length) {
            throw new BadRequestError("Alias duplicati nella richiesta");
        }

        return this.runExclusive(async () => {
            // Rileggo le novità di Passepartout: potrebbe essere stato creato qualcosa da poco (ufficio o altro palmare)
            await this.sync(true);

            let category: CategoryEntry | null = null;
            if (request.CategoryCode) {
                category = this.categories.get(request.CategoryCode) ?? null;
                if (!category) {
                    throw new BadRequestError(`Categoria sconosciuta: ${request.CategoryCode}`);
                }
            }

            // Prima di scrivere: nessuno degli alias deve già esistere e la descrizione deve essere nuova
            for (const alias of aliases) {
                await this.assertAliasFree(alias.code);
            }

            const sameName = [...this.articles.values()].find(a => normalize(a.Name) === normalize(request.Name));
            if (sameName) {
                throw new ConflictError(`Esiste già un articolo con questa descrizione (codice ${sameName.Code})`, { Code: sameName.Code, Name: sameName.Name });
            }

            const code = await this.nextArticleCode();

            await PassepartoutHandler.putArticle(buildNewArticleXml({
                code,
                name: request.Name,
                unit: request.UnitOfMeasure,
                vat,
                category,
                aliases
            }));

            // Passepartout risponde vuoto: rileggo l'articolo per essere sicuro che sia stato creato
            const created = await PassepartoutHandler.findProductByAlias(aliases[0].code);
            if (!created || created.Code !== code) {
                throw new InternalServerError(`L'articolo ${code} è stato inviato ma non risulta in Passepartout: controllare a mano`);
            }

            this.articles.set(code, { Code: code, Name: created.Name, IsActive: true });

            await logCreatedProduct({
                event: "created",
                code,
                name: created.Name,
                unitOfMeasure: created.UnitOfMeasure,
                vatRate: vat.Code,
                category: category ? category.Description : null,
                aliases: aliases.map(a => ({ code: a.code, type: a.type }))
            });
            LoggerHandler.log(`[products]: creato articolo ${code} - ${created.Name}`);

            return created;
        });
    }

    public async addAlias(request: ProductAddAliasRequest): Promise<ProductLookupResponse> {
        return this.runExclusive(async () => {
            await this.assertAliasFree(request.AliasCode, request.Code);

            // Rileggo l'articolo intero e lo rimando con l'alias in più: PutArticolo sostituisce tutto il contratto
            const xml = await PassepartoutHandler.getArticleXml(request.Code);
            if (!xml) {
                throw new NotFoundError("Product not found");
            }

            const { body, code } = extractArticleBody(xml);
            if (code !== request.Code) {
                throw new InternalServerError(`Letto l'articolo ${code} invece di ${request.Code}`);
            }

            const updatedBody = addAliasToBody(body, { code: request.AliasCode, type: request.AliasType });
            await PassepartoutHandler.putArticle(wrapArticleBody(updatedBody));

            const updated = await PassepartoutHandler.findProductByAlias(request.AliasCode);
            if (!updated || updated.Code !== code) {
                throw new InternalServerError(`L'alias è stato inviato ma non risulta sull'articolo ${code}: controllare a mano`);
            }

            await logCreatedProduct({
                event: "alias-added",
                code,
                name: updated.Name,
                alias: { code: request.AliasCode, type: request.AliasType }
            });
            LoggerHandler.log(`[products]: aggiunto alias ${request.AliasCode} all'articolo ${code}`);

            return updated;
        });
    }
}

export const productService = new ProductService();
