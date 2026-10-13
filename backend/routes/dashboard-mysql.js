const express = require("express");
const router = express.Router();
const { getPool } = require("../mysqlDatabase");

function parseJsonArray(value) {
    if (Array.isArray(value)) return value;

    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    return [];
}

function normalizeIncident(row) {
    return {
        ...row,
        id: Number(row.id),
        peopleAffected: Number(row.peopleAffected) || 0,
        assignedResources: parseJsonArray(row.assignedResources),
        assignedTeams: parseJsonArray(row.assignedTeams)
    };
}

function countByStatus(records, status) {
    return records.filter(
        record =>
            String(record.status || "").toLowerCase() ===
            status.toLowerCase()
    ).length;
}

function countBySeverity(records, severity) {
    return records.filter(
        record =>
            String(record.severity || "").toLowerCase() ===
            severity.toLowerCase()
    ).length;
}

// GET DASHBOARD STATISTICS
router.get("/", async (req, res) => {
    try {
        const pool = getPool();

        const [
            [incidentRows],
            [resourceRows],
            [teamRows]
        ] = await Promise.all([
            pool.query("SELECT * FROM incidents"),
            pool.query("SELECT * FROM resources"),
            pool.query("SELECT * FROM teams")
        ]);

        const incidents = incidentRows.map(normalizeIncident);

        const resources = resourceRows.map(resource => ({
            ...resource,
            id: Number(resource.id),
            quantity: Number(resource.quantity) || 0,
            assignedIncidentId:
                resource.assignedIncidentId == null
                    ? null
                    : Number(resource.assignedIncidentId)
        }));

        const teams = teamRows.map(team => ({
            ...team,
            id: Number(team.id),
            members: Number(team.members) || 0,
            assignedIncidentId:
                team.assignedIncidentId == null
                    ? null
                    : Number(team.assignedIncidentId)
        }));

        const peopleAffected = incidents.reduce(
            (total, incident) =>
                total + incident.peopleAffected,
            0
        );

        const recentIncidents = [...incidents]
            .sort(
                (a, b) =>
                    new Date(b.createdAt || 0) -
                    new Date(a.createdAt || 0)
            )
            .slice(0, 5);

        res.json({
            success: true,
            data: {
                incidents: {
                    total: incidents.length,
                    active: countByStatus(incidents, "Active"),
                    critical: countBySeverity(incidents, "Critical"),
                    high: countBySeverity(incidents, "High"),
                    medium: countBySeverity(incidents, "Medium"),
                    low: countBySeverity(incidents, "Low"),
                    peopleAffected
                },

                resources: {
                    total: resources.length,
                    available: countByStatus(resources, "Available"),
                    deployed: countByStatus(resources, "Deployed"),
                    active: countByStatus(resources, "Active")
                },

                teams: {
                    total: teams.length,
                    active: countByStatus(teams, "Active"),
                    available: countByStatus(teams, "Available"),
                    deployed: countByStatus(teams, "Deployed")
                },

                recentIncidents
            }
        });
    } catch (error) {
        console.error("MySQL dashboard error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to load dashboard data"
        });
    }
});

module.exports = router;
