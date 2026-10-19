import "reflect-metadata";

import http from "http";
import express, { Express } from "express";
import cors from "cors";
import { errorMiddleware } from "./middlewares/errorMiddleware";

import { LoggerHandler } from "./utils/loggerHandler";
import { operationRoutes } from "./routes/operationRoutes";
import { InternalServerError } from "./errors/internalServer";
import { productRoutes } from "./routes/productRoutes";
import { fridgeRoutes } from "./routes/fridgeRoutes";
import { dataSource } from "../appDataSource";
import { fridgeDataSource } from "../fridgeDataSource";
import { passepartoutDataSource } from "../passepartoutDataSource";
import { databaseMiddleware } from "./middlewares/databaseMiddleware";
import { productService } from "./services/productService";

const dataSources = [
	{ name: "DataSource", ds: dataSource },
	{ name: "FridgeDataSource", ds: fridgeDataSource },
	{ name: "PassepartoutDataSource", ds: passepartoutDataSource },
];

const initDatabase = async () => {
	await Promise.allSettled(
		dataSources.map(async ({ name, ds }) => {
			try {
				// Dove e come si sta per collegare (mai la password): aiuta a capire errori di configurazione (host o password sbagliati o vuoti)
				const options = ds.options as any;
				LoggerHandler.log(`[database]: ${name} -> ${options.host}:${options.port}/${options.database} come "${options.username}" (password ${options.password ? "impostata" : "VUOTA"})`);
				await ds.initialize();
				LoggerHandler.log(`[database]: ${name} connected`);
			} catch (err) {
				LoggerHandler.error(`[database]: ${name} failed to connect - ${err}`);
			}
		})
	);
};

const destroyDatabase = async () => {
	await Promise.allSettled(
		dataSources.map(async ({ name, ds }) => {
			try {
				await ds.destroy();
				LoggerHandler.log(`[database]: ${name} disconnected`);
			} catch (err) {
				LoggerHandler.error(`[database]: ${name} failed to disconnect - ${err}`);
			}
		})
	);
};

const initApp = () => {
	const app = express();
	const apiRouter = express.Router();

	// MIDDLEWARES
	app.use(express.json());

	const isDev = process.env.NODE_ENV !== "production";

	if (!isDev && !process.env.CLIENT_URL) {
		throw new InternalServerError("Missing CLIENT URL ENV");
	}

	const corsOptions: cors.CorsOptions = {
		origin: isDev ? true : process.env.CLIENT_URL,
		methods: ["GET", "POST", "PUT", "DELETE"],
		optionsSuccessStatus: 200,
	};

	app.use(cors(corsOptions));

	// HELLO WORLD ROUTE
	app.get("/api/whoami", (req, res) => {
		res.send("I am online!");
	});

	apiRouter.use(databaseMiddleware(dataSources));

	// ROUTES
	apiRouter.use("/products", productRoutes);
	apiRouter.use("/fridges", fridgeRoutes);
	apiRouter.use("/", operationRoutes);

	app.use("/api", apiRouter);

	// ERROR HANDLER
	app.use(errorMiddleware);

	return app;
};

const initServer = (app: Express) => {
	const port = Number(process.env.PORT) || 8787;

	const httpServer = http.createServer(app);

	// LISTEN_HOST=127.0.0.1 fa ascoltare solo in locale (dietro nginx): l'API non ha autenticazione e non deve essere raggiungibile dalla rete
	const listenHost = process.env.LISTEN_HOST?.trim();
	const onListening = () => {
		LoggerHandler.log(
			`[server]: Server is running at http://${listenHost || "localhost"}:${port}`,
		);
	};

	if (listenHost) {
		httpServer.listen(port, listenHost, onListening);
	} else {
		httpServer.listen(port, onListening);
	}

	httpServer.on("error", (error: Error) => {
		LoggerHandler.error(`[server]: Error: ${error}`);
	});

	httpServer.on("close", () => {
		destroyDatabase()
	});
};

const init = async () => {
	try {
		LoggerHandler.log("[server]: Starting server initialization...");

		await initDatabase();

		const app = initApp();

		initServer(app);

		// Carica in background l'elenco categorie (serve alla creazione prodotti, richiede circa 30 secondi)
		productService.warmUp();
	} catch (e: any) {
		LoggerHandler.error(e.message);
	}
};

init();
