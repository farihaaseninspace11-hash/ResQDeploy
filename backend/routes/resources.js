const express = require("express");
const router = express.Router();

const {
    readDatabase,
    writeDatabase
} = require("../database");

const allowedStatuses = [
    "Available",
    "Deployed",
    "Maintenance",
    "Unavailable",
    "Returned"
];

// GET all resources
router.get("/", (req, res) => {
    try {
        const db = readDatabase();

        res.json({
            success: true,
            count: db.resources.length,
            data: db.resources
        });
    } catch (error) {
        console.error("Get resources error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch resources"
        });
    }
});

// GET resource by ID
router.get("/:id", (req, res) => {
    try {
        const db = readDatabase();

        const resource = db.resources.find(
            item => item.id === Number(req.params.id)
        );

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
        console.error("Get resource error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch resource"
        });
    }
});

// CREATE resource
router.post("/", (req, res) => {
    try {
        const db = readDatabase();

        const {
            name,
            type,
            quantity,
            location
        } = req.body;

        if (!name || !type || !location) {
            return res.status(400).json({
                success: false,
                message: "Name, type and location are required"
            });
        }

        const nextId =
            db.resources.length > 0
                ? Math.max(...db.resources.map(r => Number(r.id))) + 1
                : 1;

        const resource = {
            id: nextId,
            name,
            type,
            quantity: Number(quantity) || 1,
            location,
            status: "Available",
            assignedIncidentId: null,
            createdAt: new Date().toISOString()
        };

        db.resources.push(resource);

        writeDatabase(db);

        res.status(201).json({
            success: true,
            message: "Resource created successfully",
            data: resource
        });
    } catch (error) {
        console.error("Create resource error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to create resource"
        });
    }
});

// UPDATE resource
router.put("/:id", (req, res) => {
    try {
        const db = readDatabase();

        const resource = db.resources.find(
            item => item.id === Number(req.params.id)
        );

        if (!resource) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        const {
            name,
            type,
            quantity,
            location,
            status
        } = req.body;

        if (name !== undefined) {
            resource.name = name;
        }

        if (type !== undefined) {
            resource.type = type;
        }

        if (quantity !== undefined) {
            resource.quantity = Number(quantity);
        }

        if (location !== undefined) {
            resource.location = location;
        }

        if (status !== undefined) {
            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`
                });
            }

            resource.status = status;
        }

        writeDatabase(db);

        res.json({
            success: true,
            message: "Resource updated successfully",
            data: resource
        });
    } catch (error) {
        console.error("Update resource error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to update resource"
        });
    }
});

// DEPLOY RESOURCE TO INCIDENT
router.patch("/:id/deploy", (req, res) => {
    try {
        const db = readDatabase();

        const resource = db.resources.find(
            item => item.id === Number(req.params.id)
        );

        if (!resource) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
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

        if (resource.status === "Deployed") {
            return res.status(400).json({
                success: false,
                message: "Resource is already deployed"
            });
        }

        resource.status = "Deployed";
        resource.assignedIncidentId = incidentId;

        if (!incident.assignedResources) {
            incident.assignedResources = [];
        }

        if (!incident.assignedResources.includes(resource.id)) {
            incident.assignedResources.push(resource.id);
        }

        incident.updatedAt = new Date().toISOString();

        writeDatabase(db);

        res.json({
            success: true,
            message: "Resource deployed successfully",
            data: resource
        });
    } catch (error) {
        console.error("Deploy resource error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to deploy resource"
        });
    }
});

// RETURN RESOURCE
router.patch("/:id/return", (req, res) => {
    try {
        const db = readDatabase();

        const resource = db.resources.find(
            item => item.id === Number(req.params.id)
        );

        if (!resource) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        const incidentId = resource.assignedIncidentId;

        resource.status = "Returned";
        resource.assignedIncidentId = null;

        if (incidentId) {
            const incident = db.incidents.find(
                item => item.id === incidentId
            );

            if (incident && incident.assignedResources) {
                incident.assignedResources =
                    incident.assignedResources.filter(
                        id => id !== resource.id
                    );

                incident.updatedAt = new Date().toISOString();
            }
        }

        writeDatabase(db);

        res.json({
            success: true,
            message: "Resource returned successfully",
            data: resource
        });
    } catch (error) {
        console.error("Return resource error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to return resource"
        });
    }
});

// DELETE resource
router.delete("/:id", (req, res) => {
    try {
        const db = readDatabase();

        const index = db.resources.findIndex(
            item => item.id === Number(req.params.id)
        );

        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        const resource = db.resources[index];

        if (resource.assignedIncidentId) {
            const incident = db.incidents.find(
                item => item.id === resource.assignedIncidentId
            );

            if (incident && incident.assignedResources) {
                incident.assignedResources =
                    incident.assignedResources.filter(
                        id => id !== resource.id
                    );
            }
        }

        db.resources.splice(index, 1);

        writeDatabase(db);

        res.json({
            success: true,
            message: "Resource deleted successfully",
            data: resource
        });
    } catch (error) {
        console.error("Delete resource error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to delete resource"
        });
    }
});

module.exports = router;