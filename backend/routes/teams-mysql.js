const express = require("express");
const router = express.Router();
const { getPool } = require("../mysqlDatabase");

const allowedStatuses = [
    "Available",
    "Deployed",
    "Standby",
    "Unavailable",
    "Returned"
];

function normalizeTeam(row) {
    if (!row) return row;

    return {
        ...row,
        id: Number(row.id),
        members: Number(row.members) || 0,
        assignedIncidentId: row.assignedIncidentId == null
            ? null
            : Number(row.assignedIncidentId)
    };
}

function normalizeIncident(row) {
    if (!row) return row;

    let assignedTeams = row.assignedTeams;

    if (typeof assignedTeams === "string") {
        try {
            assignedTeams = JSON.parse(assignedTeams);
        } catch {
            assignedTeams = [];
        }
    }

    if (!Array.isArray(assignedTeams)) {
        assignedTeams = [];
    }

    return {
        ...row,
        id: Number(row.id),
        assignedTeams: assignedTeams.map(Number)
    };
}

async function findTeam(id) {
    const [rows] = await getPool().execute(
        "SELECT * FROM teams WHERE id = ?",
        [id]
    );

    return rows.length ? normalizeTeam(rows[0]) : null;
}

// GET ALL RESPONSE TEAMS
router.get("/", async (req, res) => {
    try {
        const [rows] = await getPool().query(
            "SELECT * FROM teams ORDER BY id ASC"
        );

        const data = rows.map(normalizeTeam);

        res.json({
            success: true,
            count: data.length,
            data
        });
    } catch (error) {
        console.error("Get teams error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to fetch response teams"
        });
    }
});

// CREATE RESPONSE TEAM
router.post("/", async (req, res) => {
    try {
        const { name, type, members, location } = req.body;

        if (!name || !type || !location) {
            return res.status(400).json({
                success: false,
                message: "Name, type and location are required"
            });
        }

        const memberCount = members === undefined
            ? 1
            : Number(members);

        if (!Number.isInteger(memberCount) || memberCount < 1) {
            return res.status(400).json({
                success: false,
                message: "Members must be a positive integer"
            });
        }

        const [result] = await getPool().execute(
            `INSERT INTO teams
             (name, type, members, location, status,
              assignedIncidentId, createdAt)
             VALUES (?, ?, ?, ?, 'Available', NULL, NOW(3))`,
            [name, type, memberCount, location]
        );

        res.status(201).json({
            success: true,
            message: "Response team created successfully",
            data: await findTeam(result.insertId)
        });
    } catch (error) {
        console.error("Create team error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to create response team"
        });
    }
});

// DEPLOY TEAM TO INCIDENT
router.patch("/:id/deploy", async (req, res) => {
    let connection;

    try {
        const teamId = Number(req.params.id);
        const incidentId = Number(req.body.incidentId);

        if (!Number.isSafeInteger(teamId) || teamId < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid response team ID"
            });
        }

        if (!Number.isSafeInteger(incidentId) || incidentId < 1) {
            return res.status(400).json({
                success: false,
                message: "incidentId is required"
            });
        }

        connection = await getPool().getConnection();
        await connection.beginTransaction();

        // Lock the incident before updating the assignment.
        const [incidentRows] = await connection.execute(
            "SELECT * FROM incidents WHERE id = ? FOR UPDATE",
            [incidentId]
        );

        if (!incidentRows.length) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "Incident not found"
            });
        }

        const [teamRows] = await connection.execute(
            "SELECT * FROM teams WHERE id = ? FOR UPDATE",
            [teamId]
        );

        if (!teamRows.length) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "Response team not found"
            });
        }

        const team = normalizeTeam(teamRows[0]);
        const incident = normalizeIncident(incidentRows[0]);

        if (team.status === "Deployed") {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: "Response team is already deployed"
            });
        }

        // Remove any previous assignment before adding the new one.
        if (team.assignedIncidentId !== null &&
            team.assignedIncidentId !== incidentId) {
            const [previousRows] = await connection.execute(
                "SELECT * FROM incidents WHERE id = ? FOR UPDATE",
                [team.assignedIncidentId]
            );

            if (previousRows.length) {
                const previous = normalizeIncident(previousRows[0]);

                previous.assignedTeams =
                    previous.assignedTeams.filter(
                        id => id !== team.id
                    );

                await connection.execute(
                    `UPDATE incidents
                     SET assignedTeams = ?, updatedAt = NOW(3)
                     WHERE id = ?`,
                    [
                        JSON.stringify(previous.assignedTeams),
                        previous.id
                    ]
                );
            }
        }

        if (!incident.assignedTeams.includes(team.id)) {
            incident.assignedTeams.push(team.id);
        }

        await connection.execute(
            `UPDATE teams
             SET status = 'Deployed', assignedIncidentId = ?
             WHERE id = ?`,
            [incidentId, teamId]
        );

        await connection.execute(
            `UPDATE incidents
             SET assignedTeams = ?, updatedAt = NOW(3)
             WHERE id = ?`,
            [JSON.stringify(incident.assignedTeams), incidentId]
        );

        await connection.commit();

        res.json({
            success: true,
            message: "Response team deployed successfully",
            data: await findTeam(teamId)
        });
    } catch (error) {
        if (connection) {
            await connection.rollback().catch(() => {});
        }

        console.error("Deploy team error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to deploy response team"
        });
    } finally {
        if (connection) connection.release();
    }
});

// RETURN TEAM
router.patch("/:id/return", async (req, res) => {
    let connection;

    try {
        const teamId = Number(req.params.id);

        if (!Number.isSafeInteger(teamId) || teamId < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid response team ID"
            });
        }

        connection = await getPool().getConnection();

        // Read the current assignment before locking incident then team.
        const [initialRows] = await connection.execute(
            "SELECT * FROM teams WHERE id = ?",
            [teamId]
        );

        if (!initialRows.length) {
            return res.status(404).json({
                success: false,
                message: "Response team not found"
            });
        }

        const initialTeam = normalizeTeam(initialRows[0]);
        const incidentId = initialTeam.assignedIncidentId;

        await connection.beginTransaction();

        let incident = null;

        if (incidentId !== null) {
            const [incidentRows] = await connection.execute(
                "SELECT * FROM incidents WHERE id = ? FOR UPDATE",
                [incidentId]
            );

            if (incidentRows.length) {
                incident = normalizeIncident(incidentRows[0]);
            }
        }

        const [teamRows] = await connection.execute(
            "SELECT * FROM teams WHERE id = ? FOR UPDATE",
            [teamId]
        );

        const team = normalizeTeam(teamRows[0]);

        if (team.assignedIncidentId !== incidentId) {
            await connection.rollback();

            return res.status(409).json({
                success: false,
                message: "Team assignment changed. Retry the operation."
            });
        }

        await connection.execute(
            `UPDATE teams
             SET status = 'Returned', assignedIncidentId = NULL
             WHERE id = ?`,
            [teamId]
        );

        if (incident) {
            incident.assignedTeams =
                incident.assignedTeams.filter(
                    id => id !== team.id
                );

            await connection.execute(
                `UPDATE incidents
                 SET assignedTeams = ?, updatedAt = NOW(3)
                 WHERE id = ?`,
                [
                    JSON.stringify(incident.assignedTeams),
                    incident.id
                ]
            );
        }

        await connection.commit();

        res.json({
            success: true,
            message: "Response team returned successfully",
            data: await findTeam(teamId)
        });
    } catch (error) {
        if (connection) {
            await connection.rollback().catch(() => {});
        }

        console.error("Return team error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to return response team"
        });
    } finally {
        if (connection) connection.release();
    }
});

// UPDATE RESPONSE TEAM
router.put("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid response team ID"
            });
        }

        const team = await findTeam(id);

        if (!team) {
            return res.status(404).json({
                success: false,
                message: "Response team not found"
            });
        }

        const fields = {
            name: "name",
            type: "type",
            members: "members",
            location: "location",
            status: "status"
        };

        const updates = [];
        const values = [];

        for (const [input, column] of Object.entries(fields)) {
            if (req.body[input] === undefined) continue;

            let value = req.body[input];

            if (input === "status" &&
                !allowedStatuses.includes(value)) {
                return res.status(400).json({
                    success: false,
                    message:
                        `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`
                });
            }

            if (input === "members") {
                value = Number(value);

                if (!Number.isInteger(value) || value < 1) {
                    return res.status(400).json({
                        success: false,
                        message: "Members must be a positive integer"
                    });
                }
            }

            updates.push(`\`${column}\` = ?`);
            values.push(value);
        }

        if (updates.length) {
            values.push(id);

            await getPool().execute(
                `UPDATE teams SET ${updates.join(", ")} WHERE id = ?`,
                values
            );
        }

        res.json({
            success: true,
            message: "Response team updated successfully",
            data: await findTeam(id)
        });
    } catch (error) {
        console.error("Update team error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to update response team"
        });
    }
});

// DELETE RESPONSE TEAM
router.delete("/:id", async (req, res) => {
    let connection;

    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid response team ID"
            });
        }

        connection = await getPool().getConnection();

        const [initialRows] = await connection.execute(
            "SELECT * FROM teams WHERE id = ?",
            [id]
        );

        if (!initialRows.length) {
            return res.status(404).json({
                success: false,
                message: "Response team not found"
            });
        }

        const initialTeam = normalizeTeam(initialRows[0]);
        const incidentId = initialTeam.assignedIncidentId;

        await connection.beginTransaction();

        let incident = null;

        if (incidentId !== null) {
            const [incidentRows] = await connection.execute(
                "SELECT * FROM incidents WHERE id = ? FOR UPDATE",
                [incidentId]
            );

            if (incidentRows.length) {
                incident = normalizeIncident(incidentRows[0]);
            }
        }

        const [teamRows] = await connection.execute(
            "SELECT * FROM teams WHERE id = ? FOR UPDATE",
            [id]
        );

        const team = normalizeTeam(teamRows[0]);

        if (team.assignedIncidentId !== incidentId) {
            await connection.rollback();

            return res.status(409).json({
                success: false,
                message: "Team assignment changed. Retry the operation."
            });
        }

        if (incident) {
            const remaining = incident.assignedTeams.filter(
                teamId => teamId !== team.id
            );

            await connection.execute(
                `UPDATE incidents
                 SET assignedTeams = ?, updatedAt = NOW(3)
                 WHERE id = ?`,
                [JSON.stringify(remaining), incident.id]
            );
        }

        await connection.execute(
            "DELETE FROM teams WHERE id = ?",
            [id]
        );

        await connection.commit();

        res.json({
            success: true,
            message: "Response team deleted successfully",
            data: team
        });
    } catch (error) {
        if (connection) {
            await connection.rollback().catch(() => {});
        }

        console.error("Delete team error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to delete response team"
        });
    } finally {
        if (connection) connection.release();
    }
});

// GET RESPONSE TEAM BY ID
router.get("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid response team ID"
            });
        }

        const team = await findTeam(id);

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
        console.error("Get team error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to fetch response team"
        });
    }
});

module.exports = router;
