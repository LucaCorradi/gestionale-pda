import { In, LessThan, Not } from "typeorm";
import { dataSource } from "../../appDataSource";
import { fridgeDataSource } from "../../fridgeDataSource";
import { passepartoutDataSource } from "../../passepartoutDataSource";
import { Operation } from "../models/operationEntity";
import { OperationRow } from "../models/operationRowEntity";
import { FridgeResponse } from "../schemas/fridgeSchema";

import { startOfDay, format, endOfDay, addDays } from "date-fns";
import { InternalServerError } from "../errors/internalServer";
export class FridgeService {
    constructor(
        private operationRepository = dataSource.getRepository(Operation),
        private operationRowRepository = dataSource.getRepository(OperationRow)
    ) { }

    public async getFridges(): Promise<FridgeResponse[]> {
        const query = `
            SELECT
                DISPOSITIVI_CORRENTI.DESCRI AS Description,
                DISPOSITIVI_CORRENTI.IDDISPOSITIVO AS FridgeUUID
            FROM [TELENET].[dbo].[DISPOSITIVI_CORRENTI]
        `;

        const result = await fridgeDataSource.query<FridgeResponse[]>(query);
        
        return result;
    }

    public async getFridgeByUUID(uuid: string): Promise<FridgeResponse | null> {
        const query = `
            SELECT
                DISPOSITIVI_CORRENTI.DESCRI AS Description,
                DISPOSITIVI_CORRENTI.IDDISPOSITIVO AS FridgeUUID
            FROM [TELENET].[dbo].[DISPOSITIVI_CORRENTI]
            WHERE DISPOSITIVI_CORRENTI.IDDISPOSITIVO = @0
        `;

        const result = await fridgeDataSource.query<FridgeResponse[]>(query, [ uuid ]);

        if (result.length == 1) {
            return result[0];
        }

        return null;
    }

    

    // /**
    //     1. Dato un alias di prodotto ed un range di date, la funzione restituisce in quali frighi e per quali intervallo di tempo quel prodotto è stato presente.
    // */
    // public async getFridgeDataByProductAlias(alias: number, fromDate: string, toDate: string) { 
    //     // Estrazione del prodotto reale
    //     const product = await PassepartoutHandler.getProductByAlias(alias);
    //     const productCode = product.Code;

    //     // Normalizzazione delle date di inizio e fine
    //     const start = startOfDay(new Date(fromDate));
    //     const end = endOfDay(new Date(toDate));

    //     /*
    //         Estrazione delle operazioni che contengono almeno una riga con quel prodotto (non solo nel range, ma fino ad end)
    //         Le operazioni sono ordinate cronologicamente (IMPORTANTISSIMO)
    //     */
    //     const operations = await this.operationRepository.find({
    //         where: {
    //             OperationRows: {
    //                 ProductCode: productCode
    //             },
    //             CreatedAt: LessThan(end)
    //         },
    //         order: {
    //             CreatedAt: "ASC"
    //         },
    //         relations: ["OperationRows"]
    //     });
        
    //     /*
    //         Vars di supporto:
    //             - openFridges: tiene traccia di quali frighi, in fase algoritmica, sono attualmente aperti (cioè con il prodotto all'interno) e da quale data
    //             - results: tiene traccia dei risultati finali, cioè per ogni frigo gli intervalli di presenza del prodotto
    //             - lastWarehouseByFridge: associazione frigo e magazzino, con data di inserimento
    //     */
    //     const openFridges: Record<string, Date> = {}          // FridgeUUID - Data di inserimento del prodotto nel frigo
    //     const results: Record<string, { Start: Date; End: Date }[]> = {} // FridgeUUID - Intervalli di presenza del prodotto nel frigo
    //     const lastWarehouseByFridge: Record<string, { Warehouse: string, Date: Date} | null> = {}; // FridgeUUID - Magazzino attuale

        
    //     // Funzione di supporto per la chiusura del frigo. Se il frigo è aperto, chiude il frigo e lo aggiunge ai risultati. Toglie il frigo dallo stato "aperto".
    //     const closeFridge = (fridgeUUID: string, closeDate: Date) => {
    //         const openFridge = openFridges[fridgeUUID];
    //         if (!openFridge) {
    //             return;
    //         }

    //         // Creo il frigo all'interno dell'array dei risultati
    //         if (!results[fridgeUUID]) {
    //             results[fridgeUUID] = [];
    //         }
    //         // Aggiungo l'intervallo di presenza del prodotto nel frigo
    //         results[fridgeUUID].push({
    //             Start: openFridge, 
    //             End: closeDate,
    //         })

    //         // Rimuovo il frigo dallo stato "aperto"
    //         delete openFridges[fridgeUUID];
    //     }

    //     // Scansione operazioni
    //     for (const operation of operations) {
    //         const operationDate = new Date(operation.CreatedAt);

    //         const warehouse = operation.WarehouseTo || operation.WarehouseFrom;

    //         // Trova i frighi coinvolti per il prodotto in input in questa operazione. Restituisco i valori UNICI
    //         const fridgesFromOperation = operation.OperationRows
    //             .filter(row => row.ProductCode === productCode && row.FridgeUUID)
    //             .map(row => row.FridgeUUID!);

    //         const currentFridges = Array.from(
    //             new Set(fridgesFromOperation)
    //         );

    //         // Nessun frigo coinvolto, salto
    //         if (currentFridges.length === 0) {
    //             continue;
    //         }

    //         // Se la quantità è 0 nella data dell'operazione, chiudiamo tutti i frighi aperti che hanno associato come frigo.
    //         // TO DO - POTREI DOVER SCORRERE TUTTI I GIORNI DALLA DATA DI INSERIMENTO DEL PRODOTTO NEL MAGAZZINO, DATO UN FRIGO ED UN OPERAZIONE, ALLA DATA DELLA OPERAZIONE IN ANALISI, PER ADESSO VA BENE ANCHE COSi'
    //         if (warehouse && this.isStockZero(productCode, warehouse, operationDate)) {
    //             for (const openFridge of Object.keys(openFridges)) {
    //                 const lastWarehouse = lastWarehouseByFridge[openFridge];
    //                 if (lastWarehouse && lastWarehouse.Warehouse === warehouse) {
    //                     console.log(`Il frigo ${openFridge} è in chiusura in quanto la giacenza del prodotto è 0 per la data ${format(operationDate, "yyyy-MM-dd HH:mm")} `)
    //                     closeFridge(openFridge, operationDate);
    //                 }
    //             }
    //         }

    //         for (const fridge of currentFridges) {
    //             // Apro il frigo se non presente in quelli aperti
    //             if (!openFridges[fridge]) {
    //                 openFridges[fridge] = operationDate; 
    //             }
    //             // Aggiorna o imposta il magazzino associato
    //             if (warehouse) {
    //                 lastWarehouseByFridge[fridge] = {
    //                     Warehouse: warehouse,
    //                     Date: operationDate
    //                 }
    //                 continue;
    //             } 
                
    //             if (lastWarehouseByFridge[fridge] === undefined) {
    //                 lastWarehouseByFridge[fridge] = null;
    //             }
    //         }
    //     }

    //     // Chiudo tutti i frigo ancora aperti alla fine del periodo. La fine è end
    //     for (const fridge of Object.keys(openFridges)) {
    //         closeFridge(fridge, end);
    //     }

    //     // Tronco i risultati precedenti a startDate
    //     for (const fridge of Object.keys(results)) {
    //         results[fridge] = results[fridge]
    //             .map(interval => {
    //                 const clippedStart = interval.Start < start ? start : interval.Start;
    //                 const clippedEnd = interval.End > end ? end : interval.End;
    //                 return {
    //                     Start: clippedStart,
    //                     End: clippedEnd,
    //                 }
    //             });
    //     }

    //     return results;
    // }

    // private isStockZero(warehouse: string, productCode: string, date: Date): boolean {
    //     // Simula il controllo della giacenza restituendo true o false in modo casuale
    //     return Math.random() < 0.5;
    // }

    public async getLastFridgeUUIDByProductCode(productCode: string): Promise<string | null> {
        const operationRows = await this.operationRowRepository.find({
            where: {
                ProductCode: productCode
            },
            order: {
                ID: "DESC"
            },
            take: 1
        });

        
        const fridgeUUID = operationRows[0]?.FridgeUUID;
        if (!fridgeUUID) {
            return null;
        }

        return fridgeUUID;
    }

    public async getStockByProductCode(productCode: string, fromDate: string, toDate: string) {
        const query = `
            DECLARE @prodotti varchar(100), @datainizio varchar(100), @datafine varchar(100);

            SET @datainizio = '2025-10-01 00:00:00';
            SET @prodotti = @0;
            SET @datafine = @1;

            SELECT 
                *, 
                CARICO.QTACARICO-SCARICO.QTASCARICO AS GIACENZA 
            FROM
            (
                SELECT 
                    SUM(RigaDocumento.quantita) AS QTASCARICO,
                    Articolo.descrizione AS PRODOTTO
                FROM 
                    PassepartoutMenu.[dbo].[Articolo]
                INNER JOIN 
                    PassepartoutMenu.[dbo].RigaDocumento ON Articolo.id = RigaDocumento.idArticolo
                INNER JOIN 
                    PassepartoutMenu.[dbo].Documento ON RigaDocumento.idMaster = Documento.id
                WHERE 
                    Documento.data BETWEEN @datainizio AND @datafine
                AND
                    Articolo.nome LIKE @prodotti
                AND
                    RigaDocumento.tipoGiacenza = '-1'
                GROUP BY 
                    Articolo.descrizione
            ) AS SCARICO,
            (
                SELECT 
                    SUM(RigaDocumento.quantita) AS QTACARICO,
                    Articolo.descrizione AS PRODOTTO
                FROM 
                    PassepartoutMenu.[dbo].[Articolo]
                INNER JOIN 
                    PassepartoutMenu.[dbo].RigaDocumento ON Articolo.id = RigaDocumento.idArticolo
                INNER JOIN 
                    PassepartoutMenu.[dbo].Documento ON RigaDocumento.idMaster = Documento.id
                WHERE 
                    Documento.data BETWEEN @datainizio AND @datafine
                AND
                    Articolo.nome  LIKE @prodotti
                AND
                    RigaDocumento.tipoGiacenza = '1'
                GROUP BY 
                    Articolo.descrizione
            ) AS CARICO
        `;

        const startDate = startOfDay(new Date(fromDate));
        const endDate = endOfDay(new Date(toDate));

        const result: { Date: string; Stock: number }[] = []

        for (let d = new Date(startDate); d <= endDate; d = addDays(d, 1)) {
            const dayEnd = endOfDay(d)

            const params = [
                `%${productCode}%`,
                format(dayEnd, "yyyy-MM-dd HH:mm:ss")
            ]
            const rows = await passepartoutDataSource.query<{QTASCARICO: number, PRODOTTO: string[], QTACARICO: number, GIACENZA: number}[]>(query, params);
            
            const queryResult = {
                Date: format(d, "yyyy-MM-dd"),
                Stock: 0,
            }

            if (rows.length == 1) {
                queryResult.Stock = rows[0].GIACENZA
            }

            result.push(queryResult)

        }

        return result;
    }


    public async getFridgeTemperatureData(fridgeUUID: string, fromDate: Date, toDate: Date): Promise<number[][]> {
        const fridge = await this.getFridgeByUUID(fridgeUUID);
        if (!fridge) {
            throw new InternalServerError("Invalid Fridge UUID");
        }

        const likeName = `%${fridge.Description}%`; 

        const start = startOfDay(fromDate);
        const end = endOfDay(toDate);

        const startFormatted = format(start, "yyyy-MM-dd HH:mm:ss");
        const endFormatted = format(end, "yyyy-MM-dd HH:mm:ss");
        
        const params = [
            likeName,
            fridgeUUID,
            startFormatted,
            endFormatted,
        ];

        const query = `
            SELECT
                LOG_DISPOSITIVI_DETTAGLIO.VALORE AS Temperature, 
                LOG_DISPOSITIVI_DETTAGLIO.DATA AS Date
                -- , DISPOSITIVI_CORRENTI.DESCRI AS Description
                -- , DISPOSITIVI_CORRENTI.IDDISPOSITIVO AS FridgeUUID
            FROM [TELENET].[dbo].[LOG_DISPOSITIVI_DETTAGLIO]
            INNER JOIN DISPOSITIVI_CORRENTI ON LOG_DISPOSITIVI_DETTAGLIO.IDDISPOSITIVO = DISPOSITIVI_CORRENTI.IDDISPOSITIVO
            INNER JOIN DETTAGLIO_DESCRI ON LOG_DISPOSITIVI_DETTAGLIO.IDDESCRI = DETTAGLIO_DESCRI.IDDESCRI
            WHERE 
                DISPOSITIVI_CORRENTI.DESCRI LIKE @0 
                AND DISPOSITIVI_CORRENTI.IDDISPOSITIVO = @1
                AND [DETTAGLIO_DESCRI].DESCRI = 'Temperatura ambiente'
                AND [DETTAGLIO_DESCRI].IDLINGUA = 'IT'
                AND LOG_DISPOSITIVI_DETTAGLIO.DATA BETWEEN @2 AND @3
            ORDER BY LOG_DISPOSITIVI_DETTAGLIO.DATA
        `;

        const rows = await fridgeDataSource.query<{Temperature: number, Date: string}[]>(query, params);
        
        // const result = rows.map((record) => ({
        //     Temperature: record.Temperature,
        //     Timestamp: new Date(record.Date).getTime()
        // }));

        const result: number[][] = rows.map((record) => ([
            new Date(record.Date).getTime(),
            record.Temperature
        ]));

        return result;

    }

}