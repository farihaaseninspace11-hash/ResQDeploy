const express = require("express");
const router = express.Router();

const {
    readDatabase,
    writeDatabase
} = require("../database");

const allowedStatuses = [
    "Available",
    "Deployed",
    "Standby",
    "Unavailable",
    "Returned"
];

// GET all teams
router.get("/", (req, res) => {
    try {
        const db = readDatabase();

        res.json({
            success: true,
            count: db.teams.length,
            data: db.teams
        });
    } catch (error) {
        console.error("Get teams error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch response teams"
        });
    }
});

// GET team by ID
router.get("/:id", (req, res) => {
    try {
        const db = readDatabase();

        const team = db.teams.find(
            item => item.id === Number(req.params.id)
        );

        if (!team) {
            return res.status(404).json({
                success: false,
                message: "Response team not found"
            });
        }

        res.json({
            success: true,
            data: team
        });
    } catch (error) {
        console.error("Get team error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch response team"
        });
    }
});

// CREATE team
router.post("/", (req, res) => {
    try {
        const db = readDatabase();

        const {
            name,
            type,
            members,
            location
        } = req.body;

        if (!name || !type || !location) {
            return res.status(400).json({
                success: false,
                message: "Name, type and location are required"
            });
        }

        const nextId =
            db.teams.length > 0
                ? Math.max(...db.teams.map(t => Number(t.id))) + 1
                : 1;

        const team = {
            id: nextId,
            name,
            type,
            members: Number(members) || 1,
            location,
            status: "Available",
            assignedIncidentId: null,
            createdAt: new Date().toISOString()
        };

        db.teams.push(team);

        writeDatabase(db);

        res.status(201).json({
            success: true,
            message: "Response team created successfully",
            data: team
        });
    } catch (error) {
        console.error("Create team error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to create response team"
        });
    }
});

// UPDATE team
router.put("/:id", (req, res) => {
    try {
        const db = readDatabase();

        const team = db.teams.find(
            item => item.id === Number(req.params.id)
        );

        if (!team) {
            return res.status(404).json({
                success: false,
                message: "Response team not found"
            });
        }

        const {
            name,
            type,
            members,
            location,
            status
        } = req.body;

        if (name !== undefined) {
            team.name = name;
        }

        if (type !== undefined) {
            team.type = type;
        }

        if (members !== undefined) {
            team.members = Number(members);
        }

        if (location !== undefined) {
            team.location = location;
        }

        if (status !== undefined) {
            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`
                });
            }

            team.status = status;
        }

        writeDatabase(db);

        res.json({
            success: true,
            message: "Response team updated successfully",
            data: team
        });
    } catch (error) {
        console.error("Update team error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to update response team"
        });
    }
});

// DEPLOY TEAM TO INCIDENT
router.patch("/:id/deploy", (req, res) => {
    try {
        const db = readDatabase();

        const team = db.teams.find(
            item => item.id === Number(req.params.id)
        );

        if (!team) {
            return res.status(404).json({
                success: false,
                message: "Response team not found"
            });
        }

        const incidentId = Number(req.body.incidentId);

        if (!incidentId) {
            return res.status(400).json({
                success: false,
                message: "incidentId is required"
            });
        }

        const incident = db.incidents.find(
            item => item.id === incidentId
        );

        if (!incident) {
            return res.status(404).json({
                success: false,
                message: "Incident not found"
            });
        }

        if (team.status === "Deployed") {
            return res.status(400).json({
                success: false,
                message: "Response team is already deployed"
            });
        }

        team.status = "Deployed";
        team.assignedIncidentId = incidentId;

        if (!incident.assignedTeams) {
            incident.assignedTeams = [];
        }

        if (!incident.assignedTeams.includes(team.id)) {
            incident.assignedTeams.push(team.id);
        }

        incident.updatedAt = new Date().toISOString();

        writeDatabase(db);

        res.json({
            success: true,
            message: "Response team deployed successfully",
            data: team
        });
    } catch (error) {
        console.error("Deploy team error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to deploy response team"
        });
    }
});

// RETURN TEAM
router.patch("/:id/return", (req, res) => {
    try {
        const db = readDatabase();

        const team = db.teams.find(
            item => item.id === Number(req.params.id)
        );

        if (!team) {
            return res.status(404).json({
                success: false,
                message: "Response team not found"
            });
        }

        const incidentId = team.assignedIncidentId;

        team.status = "Returned";
        team.assignedIncidentId = null;

        if (incidentId) {
            const incident = db.incidents.find(
                item => item.id === incidentId
            );

            if (incident && incident.assignedTeams) {
                incident.assignedTeams =
                    incident.assignedTeams.filter(
                        id => id !== team.id
                    );

                incident.updatedAt = new Date().toISOString();
            }
        }

        writeDatabase(db);

        res.json({
            success: true,
            message: "Response team returned successfully",
            data: team
        });
    } catch (error) {
        console.error("Return team error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to return response team"
        });
    }
});

// DELETE team
router.delete("/:id", (req, res) => {
    try {
        const db = readDatabase();

        const index = db.teams.findIndex(
            item => item.id === Number(req.params.id)
        );

        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: "Response team not found"
            });
        }

        const team = db.teams[index];

        if (team.assignedIncidentId) {
            const incident = db.incidents.find(
                item => item.id === team.assignedIncidentId
            );

            if (incident && incident.assignedTeams) {
                incident.assignedTeams =
                    incident.assignedTeams.filter(
                        id => id !== team.id
                    );
            }
        }

        db.teams.splice(index, 1);

        writeDatabase(db);

        res.json({
            success: true,
            message: "Response team deleted successfully",
            data: team
        });
    } catch (error) {
        console.error("Delete team error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to delete response team"
        });
    }
});

module.exports = router;