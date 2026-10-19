import soap, { Client } from 'soap';
import { XMLParser } from 'fast-xml-parser';
import { InternalServerError } from '../errors/internalServer';

export interface SOAPArgs {
    [key: string]: any;
}

export class SOAPHandler {
    private static INSTANCE: SOAPHandler;
    private soapUrl: string;
    private soapEndpoint: string;
    private client?: Promise<Client>;

    private constructor(baseURL: string) {
        this.soapUrl = `${baseURL}/?wsdl`;
        this.soapEndpoint = `${baseURL}/AdapterWS`;
    }

    public static getInstance(): SOAPHandler {
        if (!SOAPHandler.INSTANCE) {
            const host = process.env.PASSEPARTOUT_SOAP_HOST;
            const port = process.env.PASSEPARTOUT_SOAP_PORT;
            const user = process.env.PASSEPARTOUT_SOAP_USER;
            const password = process.env.PASSEPARTOUT_SOAP_PASSWORD;

            if (!host || !port || !user || !password) {
                throw new InternalServerError('Missing SOAP configuration in environment variables');
            }

            const baseUrl = `http://${host}:${port}`;
            SOAPHandler.INSTANCE = new SOAPHandler(baseUrl);
        }
        return SOAPHandler.INSTANCE;
    }

    private async getClient() {
        if (!this.client) {
            this.client = soap.createClientAsync(this.soapUrl).then((client) => {
                return client;
            });
        }
        return this.client;
    }

    /**
     * Come callMethod, ma restituisce null quando il servizio risponde con un risultato vuoto
     * (es. GetArticoloAlias su un alias che non esiste) invece di lanciare un errore.
     */
    public async callMethodNullable<T>(methodName: string, args: SOAPArgs): Promise<T | null> {
        const client = await this.getClient();
        const asyncMethod = client[`${methodName}Async` as keyof Client] as Function;

        if (typeof asyncMethod !== 'function') {
            throw new InternalServerError(`Method ${methodName} does not exist on SOAP client`);
        }

        const [res] = await asyncMethod(args);
        if (res == null) {
            return null;
        }

        const resultKey = `${methodName}Result`;
        return resultKey in res ? res[resultKey] : res;
    }

    public async callMethod<T>(methodName: string, args: SOAPArgs): Promise<T> {
        const result = await this.callMethodNullable<T>(methodName, args);
        if (result == null) {
            throw new InternalServerError(`SOAP method ${methodName} returned null result`);
        }

        return result;
    }

    /**
     * Invia una busta SOAP costruita a mano e restituisce il testo XML della risposta, senza interpretarlo.
     * Serve quando bisogna rileggere e rimandare un contratto intero (es. articolo) senza perdere campi.
     */
    public async callMethodRawText(methodName: string, xmlBody: string): Promise<string> {
        const response = await fetch(this.soapEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': `"http://tempuri.org/IAdapterWS/${methodName}"`
            },
            body: xmlBody
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('SOAP Error Response:', errorText);

            // Passepartout descrive l'errore di validazione nel faultstring: lo giro al chiamante
            const fault = errorText.match(/<faultstring[^>]*>([\s\S]*?)<\/faultstring>/)?.[1];
            const detail = fault ? fault.replace(/&#xD;/g, ' ').replace(/\s+/g, ' ').trim() : '';
            throw new InternalServerError(`SOAP method ${methodName} failed: ${response.status}${detail ? ` - ${detail}` : ''}`);
        }

        return await response.text();
    }

    public async callMethodRaw<T>(methodName: string, xmlBody: string): Promise<T> {
        const xmlResponse = await this.callMethodRawText(methodName, xmlBody);

        const parser = new XMLParser({
            ignoreAttributes: true,
            removeNSPrefix: true 
        });

        const parsed = parser.parse(xmlResponse);

        // Naviga nella struttura SOAP: Envelope > Body > {MethodName}Response > {MethodName}Result
        const body = parsed?.Envelope?.Body;
        const responseKey = `${methodName}Response`;
        const resultKey = `${methodName}Result`;

        const result = body?.[responseKey]?.[resultKey];

        return result as T;
    }
}
