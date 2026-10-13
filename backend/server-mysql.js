const express = require("express");
const cors = require("cors");

const {
    initializeMySql,
    getPool,
    closePool
} = require("./mysqlDatabase");

const incidentRoutes = require("./routes/incidents-mysql");
const resourceRoutes = require("./routes/resources-mysql");
const teamRoutes = require("./routes/teams-mysql");
const dashboardRoutes = require("./routes/dashboard-mysql");

const app = express();

const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || "0.0.0.0";

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
    res.json({
        service: "ResQDeploy Backend",
        status: "running",
        database: "RDS MySQL"
    });
});

app.get("/api/health", async (req, res) => {
    try {
        await getPool().query("SELECT 1");

        res.json({
            service: "ResQDeploy API",
            status: "healthy",
            database: "connected"
        });
    } catch (error) {
        console.error("Health check failed:", error.message);

        res.status(503).json({
            service: "ResQDeploy API",
            status: "unhealthy",
            database: "unavailable"
        });
    }
});

app.use("/api/incidents", incidentRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API route not found"
    });
});

async function startServer() {
    await initializeMySql();

    const server = app.listen(PORT, HOST, () => {
        console.log(`ResQDeploy server listening on ${HOST}:${PORT}`);
        console.log("Database: RDS MySQL");
    });

    async function shutdown() {
        server.close(async () => {
            await closePool();
            process.exit(0);
        });
    }

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
}

startServer().catch((error) => {
    console.error("ResQDeploy server failed to start:", error.message);
    process.exitCode = 1;
});
