import { DataSource } from "typeorm";

export const passepartoutDataSource: DataSource = new DataSource({
    type: "mssql",
    host: process.env.PASSEPARTOUT_DB_HOST,
    port: parseInt(process.env.PASSEPARTOUT_DB_PORT ?? "3306"),
    username: process.env.PASSEPARTOUT_DB_USER,
    password: process.env.PASSEPARTOUT_DB_PASSWORD,
    database: process.env.PASSEPARTOUT_DB_NAME,
    synchronize: false,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
});