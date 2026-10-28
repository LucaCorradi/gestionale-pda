import { BadRequestError } from "../errors/badRequest";
import { ConflictError } from "../errors/conflict";
import { InternalServerError } from "../errors/internalServer";
import { NotFoundError } from "../errors/notFound";
import { ProductLookupResponse } from "../schemas/productLookupSchema";
import { ProductAddAliasRequest, ProductCatalogResponse, ProductCreateRequest, ProductSearchResponse, ProductUpdateRequest } from "../schemas/productManageSchema";
import { ALIAS_TYPE_NAMES, ARTICLE_CODE_LENGTH, PDA_CODE_FIRST, PDA_CODE_LAST, UNITS_OF_MEASURE, VAT_RATES } from "../utils/passepartout/article/articleCatalog";
import { ArticleChanges, ArticleSummary, CategoryEntry, addAliasToBody, applyArticleChanges, buildNewArticleXml, extractArticleBody, extractArticleIndex, wrapArticleBody } from "../utils/passepartout/article/articleXml";
import { PassepartoutHandler } from "../utils/passepartout/passepartoutHandler";
import { logCreatedProduct } from "../utils/createdProductsLog";
import { LoggerHandler } from "../utils/loggerHandler";
import { withSharedLock } from "../utils/sharedLock";

const SEARCH_LIMIT = 100;
const MAX_CODE_ATTEMPTS = 10;

const FULL_RELOAD_MS = 6 * 60 * 60 * 1000;   // ricarico tutto ogni tanto (non arrivano le cancellazioni fatte in Passepartout)
const DELTA_MIN_INTERVAL_MS = 60 * 1000;     // tra una ricerca e l'altra non rileggo più di una volta al minuto
const DELTA_MARGIN_MS = 5 * 60 * 1000;       // margine per differenze di orologio tra server e Passepartout
const INDEX_WAIT_MS = 3 * 1000;              // attesa massima di una ricerca per l'aggiornamento, se l'indice c'è già
const BACKGROUND_REFRESH_MS = 15 * 60 * 1000; // aggiornamento periodico in background (completo quando sono passate FULL_RELOAD_MS)

// Stessi codici, senza badare a ordine e ripetizioni (lo stesso codice può comparire con due tipi diversi)
const sameCodes = (a: string[], b: string[]) => a.every(c => b.includes(c)) && b.every(c => a.includes(c));

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
    private refreshTimer: NodeJS.Timeout | null = null;

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

    /*
        Se ho già un indice, la ricerca non aspetta più di INDEX_WAIT_MS: un aggiornamento lento (la ricarica completa
        richiede 30 secondi e più) o fallito non la blocca, si risponde con quello che c'è e l'aggiornamento finisce
        in background. Era la causa della prima ricerca del mattino "bloccata": scadute le 6 ore, aspettava la ricarica completa.
    */
    private async ensureIndex(): Promise<void> {
        const update = this.sync();

        if (this.lastSyncStartedAt === null) {
            await update;
            return;
        }

        update.catch(err => LoggerHandler.error(`[products]: aggiornamento indice fallito - ${err}`));
        let timer: NodeJS.Timeout | undefined;
        await Promise.race([
            update.catch(() => undefined),
            new Promise<void>(resolve => { timer = setTimeout(resolve, INDEX_WAIT_MS); })
        ]);
        clearTimeout(timer);
    }

    // Caricamento all'avvio, poi ricarica periodica in background: così la ricarica completa non capita durante una ricerca
    public warmUp(): void {
        const run = () => this.sync().catch(err => LoggerHandler.error(`[products]: aggiornamento indice fallito - ${err}`));
        run();
        if (!this.refreshTimer) {
            this.refreshTimer = setInterval(run, BACKGROUND_REFRESH_MS);
            this.refreshTimer.unref();
        }
    }

    public async getCatalog(): Promise<ProductCatalogResponse> {
        // Le categorie si ricavano dall'indice degli articoli: di solito è già in memoria e il form si apre subito.
        // Solo appena riavviato il backend si aspetta il primo caricamento (circa 30 secondi); se fallisce il form
        // si apre lo stesso, senza categorie.
        if (this.categories.size === 0) {
            await this.ensureIndex().catch(() => undefined);
        } else {
            this.warmUp();
        }

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

        // Blocco condiviso con gestionale-fatture, che crea articoli nella stessa serie di codici (utils/sharedLock)
        return this.runExclusive(() => withSharedLock("codici-articolo", async () => {
            // Rileggo le novità di Passepartout: potrebbe essere stato creato qualcosa da poco (ufficio, altro palmare, gestionale-fatture)
            await this.sync(true);

            const category = request.CategoryCode ? this.getCategory(request.CategoryCode) : null;

            // Prima di scrivere: nessuno degli alias deve già esistere e la descrizione deve essere nuova
            for (const alias of aliases) {
                await this.assertAliasFree(alias.code);
            }

            this.assertNameFree(request.Name);

            const code = await this.nextArticleCode();

            await PassepartoutHandler.putArticle(buildNewArticleXml({
                code,
                name: request.Name,
                unit: request.UnitOfMeasure,
                vat,
                category,
                price: request.SalePrice ?? 0,
                aliases
            }));

            // Passepartout risponde vuoto: rileggo l'articolo per essere sicuro che sia stato creato
            const created = await PassepartoutHandler.findProductByCode(code);
            if (!created) {
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
                salePrice: request.SalePrice ?? null,
                aliases: aliases.map(a => ({ code: a.code, type: a.type }))
            });
            LoggerHandler.log(`[products]: creato articolo ${code} - ${created.Name}`);

            return created;
        }));
    }

    public async updateProduct(request: ProductUpdateRequest): Promise<ProductLookupResponse> {
        const vat = VAT_RATES.find(v => v.Code === request.VatRate);
        if (!vat) {
            throw new BadRequestError(`Aliquota IVA non valida: ${request.VatRate}`);
        }

        return this.runExclusive(async () => {
            const current = await this.getByCode(request.Code);

            // Si scrive solo ciò che è cambiato: il resto dell'articolo torna a Passepartout com'era
            const changes: ArticleChanges = {};
            const logChanges: Record<string, { from: string | number | null; to: string | number | null }> = {};

            if (request.Name !== current.Name) {
                await this.ensureIndex();
                this.assertNameFree(request.Name, current.Code);
                changes.name = request.Name;
                logChanges.name = { from: current.Name, to: request.Name };
            }
            if (vat.Code !== current.VatRate) {
                changes.vat = vat;
                logChanges.vatRate = { from: current.VatRate, to: vat.Code };
            }
            if (request.CategoryCode !== current.CategoryCode) {
                if (request.CategoryCode) await this.ensureIndex();
                changes.category = request.CategoryCode ? this.getCategory(request.CategoryCode) : null;
                logChanges.category = { from: current.Category, to: changes.category?.Description ?? null };
            }
            if (request.SalePrice.toFixed(2) !== current.SalePrice.toFixed(2)) {
                changes.price = request.SalePrice;
                logChanges.salePrice = { from: current.SalePrice, to: request.SalePrice };
            }

            if (new Set(request.Aliases).size !== request.Aliases.length) {
                throw new BadRequestError("Alias duplicati nella richiesta");
            }
            const currentAliases = current.Aliases.map(a => a.Code);
            const keep = currentAliases.filter(c => request.Aliases.includes(c));
            const added = request.Aliases.filter(c => !currentAliases.includes(c));
            if (added.length > 0 || keep.length !== currentAliases.length) {
                for (const alias of added) {
                    await this.assertAliasFree(alias, current.Code);
                }
                changes.aliases = { keep, add: added.map(code => ({ code, type: "Generico" as const })) };
                logChanges.aliases = { from: currentAliases.join(", ") || null, to: request.Aliases.join(", ") || null };
            }

            if (Object.keys(logChanges).length === 0) {
                return current;
            }

            // Rileggo l'articolo intero e lo rimando con i campi cambiati: PutArticolo sostituisce tutto il contratto
            const xml = await PassepartoutHandler.getArticleXml(request.Code);
            if (!xml) {
                throw new NotFoundError("Product not found");
            }

            const { body, code } = extractArticleBody(xml);
            if (code !== request.Code) {
                throw new InternalServerError(`Letto l'articolo ${code} invece di ${request.Code}`);
            }

            await PassepartoutHandler.putArticle(wrapArticleBody(applyArticleChanges(body, changes)));

            // Passepartout risponde vuoto: rileggo e controllo che ogni campo cambiato sia arrivato
            const updated = await this.getByCode(code);
            const notApplied = [
                changes.name !== undefined && updated.Name !== changes.name ? "descrizione" : null,
                changes.vat !== undefined && updated.VatRate !== changes.vat.Code ? "IVA" : null,
                changes.category !== undefined && updated.CategoryCode !== (changes.category?.Code ?? null) ? "categoria" : null,
                changes.price !== undefined && updated.SalePrice.toFixed(2) !== changes.price.toFixed(2) ? "prezzo" : null,
                changes.aliases !== undefined && !sameCodes(updated.Aliases.map(a => a.Code), request.Aliases) ? "alias" : null,
            ].filter(Boolean);
            if (notApplied.length > 0) {
                throw new InternalServerError(`Modifica inviata ma in Passepartout non risulta: ${notApplied.join(", ")}. Controllare a mano l'articolo ${code}`);
            }

            this.articles.set(code, { Code: code, Name: updated.Name, IsActive: updated.IsActive });

            await logCreatedProduct({ event: "updated", code, name: updated.Name, changes: logChanges });
            LoggerHandler.log(`[products]: modificato articolo ${code} (${Object.keys(logChanges).join(", ")})`);

            return updated;
        });
    }

    private getCategory(categoryCode: string): CategoryEntry {
        const category = this.categories.get(categoryCode);
        if (!category) {
            throw new BadRequestError(`Categoria sconosciuta: ${categoryCode}`);
        }
        return category;
    }

    // La descrizione deve essere unica (senza distinguere maiuscole e accenti); `ownCode` è l'articolo che si sta modificando
    private assertNameFree(name: string, ownCode?: string): void {
        const sameName = [...this.articles.values()].find(a => a.Code !== ownCode && normalize(a.Name) === normalize(name));
        if (sameName) {
            throw new ConflictError(`Esiste già un articolo con questa descrizione (codice ${sameName.Code})`, { Code: sameName.Code, Name: sameName.Name });
        }
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
