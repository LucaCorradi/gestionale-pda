import { startOfDay } from "date-fns";
import express from 'express';
import { inputValidationMiddleware, outputValidationMiddleware } from "../middlewares/validationMiddleware";
import { FridgeChart, FridgeChartRequest, fridgeChartRequestSchema, fridgeChartResponseSchema } from "../schemas/fridgeChartSchema";
import { FridgeService } from '../services/fridgeService';
import { OperationService } from '../services/operationService';

export const fridgeRoutes = express.Router();

const fridgeService = new FridgeService();
const operationService = new OperationService();

fridgeRoutes.post('/chart', inputValidationMiddleware(fridgeChartRequestSchema), outputValidationMiddleware(fridgeChartResponseSchema), async (req, res, next) => {
    try {
        const payload = req.body as FridgeChartRequest;
        
        // Ottengo la lista di tutti i frigoriferi disponibili nel sistema
        const allFridges = await fridgeService.getFridges();

        // Ottengo le giacenze giornaliere del prodotto indicato. La funzione restituisce una lista di date con il relativo stock
        const stocksByDate = await fridgeService.getStockByProductCode(payload.ProductCode, payload.FromDate, payload.ToDate);
        
        // Estraggo la lista delle operazioni per ogni data. Il valore è null nel momento in cui il documento non esiste o la giacenza è minore uguale a 0
        const lastOperationsByStockDate = await Promise.all(
            stocksByDate.map(s => {
                if (s.Stock <= 0) {
                    return null;
                }
                return operationService.getLastDocumentByProductCodeAndDate(payload.ProductCode, s.Date);
            })
        );
        
        const fridgeRecords: Record<string, number[][]> = {}; // Record frigo - temperatures
        const timestamps = new Set<number>(); // Set di tutti i timestamp

        // Estraggo per ogni operazioni i frigoriferi
        for (let i = 0; i < stocksByDate.length; ++i) {
            const stock = stocksByDate[i];
            const operation = lastOperationsByStockDate[i];
            const day = new Date(stock.Date);
            
            // Se non esiste alcuna operazione per quel giorno,
            // registro solo il timestamp di inizio giornata e passo al successivo
            if (!operation) {
                const start = startOfDay(day);
                timestamps.add(start.getTime());
                continue;
            }

            // Dall’operazione, ricavo i frigoriferi coinvolti per quel prodotto
            const fridgeUUIDs = [...new Set(operation.OperationRows
                .filter(row => row.ProductCode === payload.ProductCode && row.FridgeUUID)
                .map(row => row.FridgeUUID!)
            )];
            // Per ogni frigorifero trovato, leggo le temperature del giorno
            const temperaturesPromises = fridgeUUIDs.map(async (fridgeUUID) => {
                const fridgeData = allFridges.find(fridge => fridge.FridgeUUID == fridgeUUID);
                if (!fridgeData) {
                    return;
                }
                const fridgeName = fridgeData.Description;

                if (!fridgeRecords[fridgeName]) {
                    fridgeRecords[fridgeName] = [];
                }

                // Recupero le temperature di quel frigo in quella data
                // La funzione restituisce una lista di coppie [timestamp, temperature]
                const temperatures = await fridgeService.getFridgeTemperatureData(fridgeUUID, day, day); 

                // Aggiungo tutte le letture alla lista del frigo
                fridgeRecords[fridgeName].push(...temperatures);

                // Aggiungo i timestamp al set globale (per poterli ordinare dopo)
                for (const value of temperatures) {
                    const timestamp = value[0];
                    timestamps.add(timestamp);
                }
            });

            await Promise.all(temperaturesPromises);
        }

        // Ordino i timestamp
        const orderedTimestamps = [...timestamps].sort((a, b) => a - b);

        /*
            Matrice finale dei dati
            Ogni riga rappresenta un timestamp
            La prima colonna è il timestamp stesso
            Le colonne successive sono le temperature per ciascun frigo, ordinate
        */
        const data = orderedTimestamps.map(timestamp => {
            const row: (number | null)[] = [timestamp];
            for (const fridgeName in fridgeRecords) {
                const fridgeData = fridgeRecords[fridgeName];
    
                const record = fridgeData.find(r => r[0] === timestamp);
                if (record) {
                    row.push(record[1]);
                } else {
                    row.push(null);
                }

            }
            return row;
        });

        const returnObj: FridgeChart = {
            Metadata: { 
                FridgeNames: Object.keys(fridgeRecords)
            },
            Data: data
        };

        res.json(returnObj);        
    } catch (error) {
        next(error);
    }
});