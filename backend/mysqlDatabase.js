const fs = require("fs");

const {
    SecretsManagerClient,
    GetSecretValueCommand
} = require("@aws-sdk/client-secrets-manager");

const mysql = require("mysql2/promise");

let pool = null;

async function initializeMySql() {
    if (pool) {
        return pool;
    }

    const requiredVariables = [
        "DB_SECRET_ARN",
        "DB_HOST",
        "DB_NAME",
        "DB_CA_PATH"
    ];

    for (const variable of requiredVariables) {
        if (!process.env[variable]) {
            throw new Error(
                `Missing environment variable: ${variable}`
            );
        }
    }

    if (!fs.existsSync(process.env.DB_CA_PATH)) {
        throw new Error("RDS CA certificate file not found.");
    }

    const secretsClient = new SecretsManagerClient({
        region: process.env.AWS_REGION || "us-east-1"
    });

    const secretResult = await secretsClient.send(
        new GetSecretValueCommand({
            SecretId: process.env.DB_SECRET_ARN
        })
    );

    if (!secretResult.SecretString) {
        throw new Error("RDS secret does not contain a string value.");
    }

    const credentials = JSON.parse(secretResult.SecretString);

    if (!credentials.username || !credentials.password) {
        throw new Error(
            "RDS secret must contain username and password."
        );
    }

    pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: 3306,
        user: credentials.username,
        password: credentials.password,
        database: process.env.DB_NAME,

        ssl: {
            ca: fs.readFileSync(
                process.env.DB_CA_PATH,
                "utf8"
            ),
            rejectUnauthorized: true
        },

        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        connectTimeout: 10000
    });

    try {
        await pool.query("SELECT 1");
        console.log("ResQDeploy MySQL connection initialized.");
    } catch (error) {
        await pool.end();
        pool = null;
        throw error;
    }

    return pool;
}

function getPool() {
    if (!pool) {
        throw new Error(
            "MySQL is not initialized. Initialize it before serving requests."
        );
    }

    return pool;
}

async function closePool() {
    if (pool) {
        const activePool = pool;
        pool = null;
        await activePool.end();
    }
}

module.exports = {
    initializeMySql,
    getPool,
    closePool
};
