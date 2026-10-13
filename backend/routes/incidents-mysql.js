const express = require("express");
const router = express.Router();
const { getPool } = require("../mysqlDatabase");

const lifecycle = [
    "Active",
    "Under Investigation",
    "Response In Progress",
    "Contained",
    "Resolved",
    "Closed"
];

const lifecycleTransitions = {
    "Active": ["Under Investigation"],
    "Under Investigation": ["Response In Progress"],
    "Response In Progress": ["Contained"],
    "Contained": ["Resolved"],
    "Resolved": ["Closed"],
    "Closed": []
};

function normalizeIncident(row) {
    if (!row) return row;

    function parseArray(value) {
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

    return {
        ...row,
        id: Number(row.id),
        peopleAffected: Number(row.peopleAffected) || 0,
        assignedResources: parseArray(row.assignedResources),
        assignedTeams: parseArray(row.assignedTeams)
    };
}

async function findIncident(id) {
    const [rows] = await getPool().execute(
        "SELECT * FROM incidents WHERE id = ?",
        [id]
    );

    return rows.length ? normalizeIncident(rows[0]) : null;
}

// GET all incidents
router.get("/", async (req, res) => {
    try {
        const [rows] = await getPool().query(
            "SELECT * FROM incidents ORDER BY id ASC"
        );

        const data = rows.map(normalizeIncident);

        res.json({
            success: true,
            count: data.length,
            data
        });
    } catch (error) {
        console.error("Get incidents error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to fetch incidents"
        });
    }
});

// GET incident lifecycle
router.get("/:id/lifecycle", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid incident ID"
            });
        }

        const incident = await findIncident(id);

        if (!incident) {
            return res.status(404).json({
                success: false,
                message: "Incident not found"
            });
        }

        const currentIndex = lifecycle.indexOf(incident.status);

        res.json({
            success: true,
            data: {
                incidentId: incident.id,
                currentStatus: incident.status,
                lifecycle,
                completedStages: lifecycle.filter(
                    (stage, index) => index <= currentIndex
                ),
                nextStages: lifecycle.filter(
                    (stage, index) => index > currentIndex
                ),
                allowedNextStatuses:
                    lifecycleTransitions[incident.status] || [],
                progress: currentIndex >= 0
                    ? Math.round(
                        currentIndex / (lifecycle.length - 1) * 100
                    )
                    : 0
            }
        });
    } catch (error) {
        console.error("Get lifecycle error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to fetch incident lifecycle"
        });
    }
});

// Advance incident status
router.patch("/:id/status", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid incident ID"
            });
        }

        const incident = await findIncident(id);

        if (!incident) {
            return res.status(404).json({
                success: false,
                message: "Incident not found"
            });
        }

        const newStatus = req.body.status;

        if (!newStatus || !lifecycle.includes(newStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Allowed values: ${lifecycle.join(", ")}`
            });
        }

        const currentStatus = incident.status;

        if (currentStatus === newStatus) {
            return res.status(400).json({
                success: false,
                message: `Incident is already "${newStatus}"`
            });
        }

        const allowed = lifecycleTransitions[currentStatus] || [];

        if (!allowed.includes(newStatus)) {
            return res.status(400).json({
                success: false,
                message:
                    `Invalid lifecycle transition: "${currentStatus}" → "${newStatus}". ` +
                    `Allowed next status: ${allowed.length ? allowed.join(", ") : "None"}`
            });
        }

        await getPool().execute(
            "UPDATE incidents SET status = ?, updatedAt = NOW(3) WHERE id = ?",
            [newStatus, id]
        );

        const updatedIncident = await findIncident(id);

        res.json({
            success: true,
            message: `Incident moved from "${currentStatus}" to "${newStatus}"`,
            data: {
                incident: updatedIncident,
                previousStatus: currentStatus,
                currentStatus: newStatus,
                nextAllowedStatuses: lifecycleTransitions[newStatus] || []
            }
        });
    } catch (error) {
        console.error("Update incident lifecycle error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to update incident lifecycle"
        });
    }
});

// GET incident by ID
router.get("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid incident ID"
            });
        }

        const incident = await findIncident(id);

        if (!incident) {
            return res.status(404).json({
                success: false,
                message: "Incident not found"
            });
        }

        res.json({
            success: true,
            data: incident
        });
    } catch (error) {
        console.error("Get incident error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to fetch incident"
        });
    }
});

// CREATE incident
router.post("/", async (req, res) => {
    try {
        const {
            name,
            type,
            severity,
            location,
            peopleAffected,
            description
        } = req.body;

        if (!name || !type || !severity || !location) {
            return res.status(400).json({
                success: false,
                message: "Name, type, severity and location are required"
            });
        }

        const now = new Date();

        const [result] = await getPool().execute(
            `INSERT INTO incidents
            (name, type, location, severity, peopleAffected, status,
             description, createdAt, updatedAt, assignedResources, assignedTeams)
             VALUES (?, ?, ?, ?, ?, 'Active', ?, ?, ?, ?, ?)`,
            [
                name,
                type,
                location,
                severity,
                Math.max(0, Number(peopleAffected) || 0),
                description || "",
                now,
                now,
                JSON.stringify([]),
                JSON.stringify([])
            ]
        );

        const incident = await findIncident(result.insertId);

        res.status(201).json({
            success: true,
            message: "Incident created successfully",
            data: incident
        });
    } catch (error) {
        console.error("Create incident error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to create incident"
        });
    }
});

// UPDATE incident
router.put("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid incident ID"
            });
        }

        const existing = await findIncident(id);

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Incident not found"
            });
        }

        const allowedFields = [
            "name",
            "type",
            "severity",
            "location",
            "peopleAffected",
            "description"
        ];

        const updates = [];
        const values = [];

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                let value = req.body[field];

                if (field === "peopleAffected") {
                    value = Math.max(0, Number(value) || 0);
                }

                updates.push(`\`${field}\` = ?`);
                values.push(value);
            }
        }

        updates.push("updatedAt = NOW(3)");
        values.push(id);

        await getPool().execute(
            `UPDATE incidents SET ${updates.join(", ")} WHERE id = ?`,
            values
        );

        const updatedIncident = await findIncident(id);

        res.json({
            success: true,
            message: "Incident updated successfully",
            data: updatedIncident
        });
    } catch (error) {
        console.error("Update incident error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to update incident"
        });
    }
});

// DELETE incident and release linked resources/teams
router.delete("/:id", async (req, res) => {
    const connection = await getPool().getConnection();

    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid incident ID"
            });
        }

        await connection.beginTransaction();

        const [rows] = await connection.execute(
            "SELECT * FROM incidents WHERE id = ? FOR UPDATE",
            [id]
        );

        if (!rows.length) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "Incident not found"
            });
        }

        const incident = normalizeIncident(rows[0]);

        await connection.execute(
            `UPDATE resources
             SET assignedIncidentId = NULL, status = 'Available'
             WHERE assignedIncidentId = ?`,
            [id]
        );

        await connection.execute(
            `UPDATE teams
             SET assignedIncidentId = NULL, status = 'Available'
             WHERE assignedIncidentId = ?`,
            [id]
        );

        await connection.execute(
            "DELETE FROM incidents WHERE id = ?",
            [id]
        );

        await connection.commit();

        res.json({
            success: true,
            message: "Incident deleted successfully",
            data: incident
        });
    } catch (error) {
        await connection.rollback().catch(() => {});
        console.error("Delete incident error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to delete incident"
        });
    } finally {
        connection.release();
    }
});

module.exports = router;
