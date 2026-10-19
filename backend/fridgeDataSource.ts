import { DataSource } from "typeorm";

export const fridgeDataSource: DataSource = new DataSource({
    type: "mssql",
    host: process.env.FRIDGES_DB_HOST,
    port: parseInt(process.env.FRIDGES_DB_PORT ?? "1433"),
    username: process.env.FRIDGES_DB_USER,
    password: process.env.FRIDGES_DB_PASSWORD,
    database: process.env.FRIDGES_DB_NAME,
    synchronize: false,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
});