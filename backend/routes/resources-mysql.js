const express = require("express");
const router = express.Router();
const { getPool } = require("../mysqlDatabase");

const allowedStatuses = [
    "Available",
    "Deployed",
    "Maintenance",
    "Unavailable",
    "Returned"
];

function normalizeResource(row) {
    if (!row) return row;

    return {
        ...row,
        id: Number(row.id),
        quantity: Number(row.quantity) || 0,
        assignedIncidentId: row.assignedIncidentId == null
            ? null
            : Number(row.assignedIncidentId)
    };
}

function normalizeIncident(row) {
    if (!row) return row;

    const parseArray = value => {
        if (Array.isArray(value)) return value;
        if (typeof value === "string") {
            try {
                const result = JSON.parse(value);
                return Array.isArray(result) ? result : [];
            } catch {
                return [];
            }
        }
        return [];
    };

    return {
        ...row,
        id: Number(row.id),
        peopleAffected: Number(row.peopleAffected) || 0,
        assignedResources: parseArray(row.assignedResources),
        assignedTeams: parseArray(row.assignedTeams)
    };
}

async function findResource(id) {
    const [rows] = await getPool().execute(
        "SELECT * FROM resources WHERE id = ?",
        [id]
    );

    return rows.length ? normalizeResource(rows[0]) : null;
}

// GET ALL RESOURCES
router.get("/", async (req, res) => {
    try {
        const [rows] = await getPool().query(
            "SELECT * FROM resources ORDER BY id ASC"
        );

        const data = rows.map(normalizeResource);

        res.json({
            success: true,
            count: data.length,
            data
        });
    } catch (error) {
        console.error("Get resources error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to fetch resources"
        });
    }
});

// CREATE RESOURCE
router.post("/", async (req, res) => {
    try {
        const { name, type, quantity, location } = req.body;

        if (!name || !type || !location) {
            return res.status(400).json({
                success: false,
                message: "Name, type and location are required"
            });
        }

        const qty = quantity === undefined
            ? 1
            : Number(quantity);

        if (!Number.isInteger(qty) || qty < 1) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be a positive integer"
            });
        }

        const [result] = await getPool().execute(
            `INSERT INTO resources
             (name, type, quantity, location, status,
              assignedIncidentId, createdAt)
             VALUES (?, ?, ?, ?, 'Available', NULL, NOW(3))`,
            [name, type, qty, location]
        );

        const resource = await findResource(result.insertId);

        res.status(201).json({
            success: true,
            message: "Resource created successfully",
            data: resource
        });
    } catch (error) {
        console.error("Create resource error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to create resource"
        });
    }
});

// DEPLOY RESOURCE TO INCIDENT
router.patch("/:id/deploy", async (req, res) => {
    let connection;

    try {
        const resourceId = Number(req.params.id);
        const incidentId = Number(req.body.incidentId);

        if (!Number.isSafeInteger(resourceId) || resourceId < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid resource ID"
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

        // Lock the incident first to coordinate assignment changes.
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

        const [resourceRows] = await connection.execute(
            "SELECT * FROM resources WHERE id = ? FOR UPDATE",
            [resourceId]
        );

        if (!resourceRows.length) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        const resource = normalizeResource(resourceRows[0]);
        const incident = normalizeIncident(incidentRows[0]);

        if (resource.status === "Deployed") {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: "Resource is already deployed"
            });
        }

        incident.assignedResources =
            incident.assignedResources.filter(
                id => Number(id) !== resource.id
            );

        incident.assignedResources.push(resource.id);

        await connection.execute(
            `UPDATE resources
             SET status = 'Deployed', assignedIncidentId = ?
             WHERE id = ?`,
            [incidentId, resourceId]
        );

        await connection.execute(
            `UPDATE incidents
             SET assignedResources = ?, updatedAt = NOW(3)
             WHERE id = ?`,
            [
                JSON.stringify(incident.assignedResources),
                incidentId
            ]
        );

        await connection.commit();

        const updatedResource = await findResource(resourceId);

        res.json({
            success: true,
            message: "Resource deployed successfully",
            data: updatedResource
        });
    } catch (error) {
        if (connection) {
            await connection.rollback().catch(() => {});
        }

        console.error("Deploy resource error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to deploy resource"
        });
    } finally {
        if (connection) connection.release();
    }
});

// RETURN RESOURCE
router.patch("/:id/return", async (req, res) => {
    let connection;

    try {
        const resourceId = Number(req.params.id);

        if (!Number.isSafeInteger(resourceId) || resourceId < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid resource ID"
            });
        }

        connection = await getPool().getConnection();
        await connection.beginTransaction();

        const [initialRows] = await connection.execute(
            "SELECT * FROM resources WHERE id = ?",
            [resourceId]
        );

        if (!initialRows.length) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        const initialResource = normalizeResource(initialRows[0]);
        const incidentId = initialResource.assignedIncidentId;

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

        const [resourceRows] = await connection.execute(
            "SELECT * FROM resources WHERE id = ? FOR UPDATE",
            [resourceId]
        );

        const resource = normalizeResource(resourceRows[0]);

        if (resource.assignedIncidentId !== incidentId) {
            await connection.rollback();
            return res.status(409).json({
                success: false,
                message: "Resource assignment changed. Retry the operation."
            });
        }

        await connection.execute(
            `UPDATE resources
             SET status = 'Returned', assignedIncidentId = NULL
             WHERE id = ?`,
            [resourceId]
        );

        if (incident) {
            incident.assignedResources =
                incident.assignedResources.filter(
                    id => Number(id) !== resource.id
                );

            await connection.execute(
                `UPDATE incidents
                 SET assignedResources = ?, updatedAt = NOW(3)
                 WHERE id = ?`,
                [
                    JSON.stringify(incident.assignedResources),
                    incident.id
                ]
            );
        }

        await connection.commit();

        const updatedResource = await findResource(resourceId);

        res.json({
            success: true,
            message: "Resource returned successfully",
            data: updatedResource
        });
    } catch (error) {
        if (connection) {
            await connection.rollback().catch(() => {});
        }

        console.error("Return resource error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to return resource"
        });
    } finally {
        if (connection) connection.release();
    }
});

// UPDATE RESOURCE
router.put("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid resource ID"
            });
        }

        const resource = await findResource(id);

        if (!resource) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        const fields = {
            name: "name",
            type: "type",
            quantity: "quantity",
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

            if (input === "quantity") {
                value = Number(value);

                if (!Number.isInteger(value) || value < 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Quantity must be a non-negative integer"
                    });
                }
            }

            updates.push(`\`${column}\` = ?`);
            values.push(value);
        }

        if (updates.length) {
            values.push(id);

            await getPool().execute(
                `UPDATE resources SET ${updates.join(", ")} WHERE id = ?`,
                values
            );
        }

        res.json({
            success: true,
            message: "Resource updated successfully",
            data: await findResource(id)
        });
    } catch (error) {
        console.error("Update resource error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to update resource"
        });
    }
});

// DELETE RESOURCE
router.delete("/:id", async (req, res) => {
    let connection;

    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid resource ID"
            });
        }

        connection = await getPool().getConnection();
        await connection.beginTransaction();

        const [initialRows] = await connection.execute(
            "SELECT * FROM resources WHERE id = ?",
            [id]
        );

        if (!initialRows.length) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        const initialResource = normalizeResource(initialRows[0]);
        const incidentId = initialResource.assignedIncidentId;

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

        const [resourceRows] = await connection.execute(
            "SELECT * FROM resources WHERE id = ? FOR UPDATE",
            [id]
        );

        const resource = normalizeResource(resourceRows[0]);

        if (resource.assignedIncidentId !== incidentId) {
            await connection.rollback();
            return res.status(409).json({
                success: false,
                message: "Resource assignment changed. Retry the operation."
            });
        }

        if (incident) {
            const remaining = incident.assignedResources.filter(
                resourceId => Number(resourceId) !== resource.id
            );

            await connection.execute(
                `UPDATE incidents
                 SET assignedResources = ?, updatedAt = NOW(3)
                 WHERE id = ?`,
                [JSON.stringify(remaining), incident.id]
            );
        }

        await connection.execute(
            "DELETE FROM resources WHERE id = ?",
            [id]
        );

        await connection.commit();

        res.json({
            success: true,
            message: "Resource deleted successfully",
            data: resource
        });
    } catch (error) {
        if (connection) {
            await connection.rollback().catch(() => {});
        }

        console.error("Delete resource error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to delete resource"
        });
    } finally {
        if (connection) connection.release();
    }
});

// GET RESOURCE BY ID
router.get("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid resource ID"
            });
        }

        const resource = await findResource(id);

        if (!resource) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        res.json({
            success: true,
            data: resource
        });
    } catch (error) {
        console.error("Get resource error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to fetch resource"
        });
    }
});

module.exports = router;
