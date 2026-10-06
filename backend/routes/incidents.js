const express = require("express");
const router = express.Router();

const {
    readDatabase,
    writeDatabase
} = require("../database");


// ============================================================
// INCIDENT LIFECYCLE
// ============================================================

const lifecycle = [
    "Active",
    "Under Investigation",
    "Response In Progress",
    "Contained",
    "Resolved",
    "Closed"
];


const lifecycleTransitions = {

    "Active": [
        "Under Investigation"
    ],

    "Under Investigation": [
        "Response In Progress"
    ],

    "Response In Progress": [
        "Contained"
    ],

    "Contained": [
        "Resolved"
    ],

    "Resolved": [
        "Closed"
    ],

    "Closed": []

};


// ============================================================
// GET ALL INCIDENTS
// ============================================================

router.get("/", (req, res) => {

    try {

        const db = readDatabase();

        res.json({
            success: true,
            count: db.incidents.length,
            data: db.incidents
        });

    } catch (error) {

        console.error(
            "Get incidents error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to fetch incidents"
        });
    }
});


// ============================================================
// GET INCIDENT BY ID
// ============================================================

router.get("/:id", (req, res) => {

    try {

        const db = readDatabase();

        const incident =
            db.incidents.find(
                item =>
                    item.id ===
                    Number(req.params.id)
            );


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

        console.error(
            "Get incident error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to fetch incident"
        });
    }
});


// ============================================================
// CREATE INCIDENT
// ============================================================

router.post("/", (req, res) => {

    try {

        const db = readDatabase();


        const {
            name,
            type,
            severity,
            location,
            peopleAffected,
            description
        } = req.body;


        if (
            !name ||
            !type ||
            !severity ||
            !location
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Name, type, severity and location are required"
            });
        }


        const nextId =
            db.incidents.length > 0
                ? Math.max(
                    ...db.incidents.map(
                        incident =>
                            Number(incident.id)
                    )
                ) + 1
                : 1;


        const now =
            new Date().toISOString();


        const incident = {

            id: nextId,

            name,

            type,

            location,

            severity,

            peopleAffected:
                Number(
                    peopleAffected
                ) || 0,

            status: "Active",

            description:
                description || "",

            assignedResources: [],

            assignedTeams: [],

            createdAt: now,

            updatedAt: now

        };


        db.incidents.push(
            incident
        );


        writeDatabase(db);


        res.status(201).json({

            success: true,

            message:
                "Incident created successfully",

            data: incident

        });

    } catch (error) {

        console.error(
            "Create incident error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Unable to create incident"
        });
    }
});


// ============================================================
// UPDATE INCIDENT
// ============================================================

router.put("/:id", (req, res) => {

    try {

        const db = readDatabase();


        const incident =
            db.incidents.find(
                item =>
                    item.id ===
                    Number(req.params.id)
            );


        if (!incident) {

            return res.status(404).json({
                success: false,
                message: "Incident not found"
            });
        }


        const {
            name,
            type,
            severity,
            location,
            peopleAffected,
            description
        } = req.body;


        if (name !== undefined) {
            incident.name = name;
        }


        if (type !== undefined) {
            incident.type = type;
        }


        if (severity !== undefined) {
            incident.severity = severity;
        }


        if (location !== undefined) {
            incident.location = location;
        }


        if (
            peopleAffected !==
            undefined
        ) {

            incident.peopleAffected =
                Number(
                    peopleAffected
                ) || 0;
        }


        if (
            description !==
            undefined
        ) {

            incident.description =
                description;
        }


        incident.updatedAt =
            new Date().toISOString();


        writeDatabase(db);


        res.json({

            success: true,

            message:
                "Incident updated successfully",

            data: incident

        });

    } catch (error) {

        console.error(
            "Update incident error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Unable to update incident"
        });
    }
});


// ============================================================
// GET LIFECYCLE INFORMATION
// ============================================================

router.get(
    "/:id/lifecycle",
    (req, res) => {

        try {

            const db =
                readDatabase();


            const incident =
                db.incidents.find(
                    item =>
                        item.id ===
                        Number(
                            req.params.id
                        )
                );


            if (!incident) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Incident not found"
                });
            }


            const currentIndex =
                lifecycle.indexOf(
                    incident.status
                );


            const completedStages =
                lifecycle.filter(
                    (stage, index) =>
                        index <=
                        currentIndex
                );


            const nextStages =
                lifecycle.filter(
                    (stage, index) =>
                        index >
                        currentIndex
                );


            const allowedNextStatuses =
                lifecycleTransitions[
                    incident.status
                ] || [];


            res.json({

                success: true,

                data: {

                    incidentId:
                        incident.id,

                    currentStatus:
                        incident.status,

                    lifecycle,

                    completedStages,

                    nextStages,

                    allowedNextStatuses,

                    progress:
                        currentIndex >= 0
                            ? Math.round(
                                (
                                    currentIndex /
                                    (lifecycle.length - 1)
                                ) * 100
                            )
                            : 0
                }

            });

        } catch (error) {

            console.error(
                "Get lifecycle error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to fetch incident lifecycle"
            });
        }
    }
);


// ============================================================
// ADVANCE INCIDENT STATUS
// ============================================================

router.patch(
    "/:id/status",
    (req, res) => {

        try {

            const db =
                readDatabase();


            const incident =
                db.incidents.find(
                    item =>
                        item.id ===
                        Number(
                            req.params.id
                        )
                );


            if (!incident) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Incident not found"
                });
            }


            const newStatus =
                req.body.status;


            if (!newStatus) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Status is required"
                });
            }


            if (
                !lifecycle.includes(
                    newStatus
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        `Invalid status. Allowed values: ${lifecycle.join(", ")}`

                });
            }


            const currentStatus =
                incident.status;


            if (
                currentStatus ===
                newStatus
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        `Incident is already "${newStatus}"`

                });
            }


            const allowedNextStatuses =
                lifecycleTransitions[
                    currentStatus
                ] || [];


            if (
                !allowedNextStatuses.includes(
                    newStatus
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        `Invalid lifecycle transition: "${currentStatus}" → "${newStatus}". ` +
                        `Allowed next status: ${
                            allowedNextStatuses.length
                                ? allowedNextStatuses.join(", ")
                                : "None"
                        }`

                });
            }


            incident.status =
                newStatus;


            incident.updatedAt =
                new Date().toISOString();


            writeDatabase(db);


            res.json({

                success: true,

                message:
                    `Incident moved from "${currentStatus}" to "${newStatus}"`,

                data: {

                    incident,

                    previousStatus:
                        currentStatus,

                    currentStatus:
                        newStatus,

                    nextAllowedStatuses:
                        lifecycleTransitions[
                            newStatus
                        ] || []

                }

            });

        } catch (error) {

            console.error(
                "Update incident lifecycle error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to update incident lifecycle"

            });
        }
    }
);


// ============================================================
// DELETE INCIDENT
// ============================================================

router.delete(
    "/:id",
    (req, res) => {

        try {

            const db =
                readDatabase();


            const index =
                db.incidents.findIndex(
                    item =>
                        item.id ===
                        Number(
                            req.params.id
                        )
                );


            if (index === -1) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Incident not found"
                });
            }


            const incident =
                db.incidents[index];


            /*
                Remove incident references
                from resources.
            */

            db.resources.forEach(
                resource => {

                    if (
                        Number(
                            resource.assignedIncidentId
                        ) ===
                        Number(
                            incident.id
                        )
                    ) {

                        resource.assignedIncidentId =
                            null;

                        resource.status =
                            "Available";
                    }

                }
            );


            /*
                Remove incident references
                from teams.
            */

            db.teams.forEach(
                team => {

                    if (
                        Number(
                            team.assignedIncidentId
                        ) ===
                        Number(
                            incident.id
                        )
                    ) {

                        team.assignedIncidentId =
                            null;

                        team.status =
                            "Available";
                    }

                }
            );


            db.incidents.splice(
                index,
                1
            );


            writeDatabase(db);


            res.json({

                success: true,

                message:
                    "Incident deleted successfully",

                data: incident

            });

        } catch (error) {

            console.error(
                "Delete incident error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to delete incident"

            });
        }
    }
);


module.exports = router;