const express = require("express");
const cors = require("cors");

const incidentRoutes = require("./routes/incidents");
const resourceRoutes = require("./routes/resources");
const teamRoutes = require("./routes/teams");
const dashboardRoutes = require("./routes/dashboard");


const app = express();

const PORT = 5000;


// ==============================
// MIDDLEWARE
// ==============================

app.use(cors());

app.use(express.json());


// ==============================
// ROOT ROUTE
// ==============================

app.get("/", (req, res) => {

    res.json({

        message: "ResQDeploy Backend is running!",

        status: "success"

    });

});


// ==============================
// HEALTH CHECK
// ==============================

app.get("/api/health", (req, res) => {

    res.json({

        service: "ResQDeploy API",

        status: "healthy"

    });

});


// ==============================
// API ROUTES
// ==============================

app.use(
    "/api/incidents",
    incidentRoutes
);


app.use(
    "/api/resources",
    resourceRoutes
);


app.use(
    "/api/teams",
    teamRoutes
);


app.use(
    "/api/dashboard",
    dashboardRoutes
);


// ==============================
// START SERVER
// ==============================

app.listen(PORT, () => {

    console.log(
        `ResQDeploy backend running on http://localhost:${PORT}`
    );

});