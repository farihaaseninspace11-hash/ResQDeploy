const express = require("express");
const { readDatabase } = require("../database");

const router = express.Router();


// GET DASHBOARD STATISTICS
router.get("/", (req, res) => {

    try {

        const db = readDatabase();

        const incidents = Array.isArray(db.incidents)
            ? db.incidents
            : [];

        const resources = Array.isArray(db.resources)
            ? db.resources
            : [];

        const teams = Array.isArray(db.teams)
            ? db.teams
            : [];


        // ==============================
        // INCIDENT STATISTICS
        // ==============================

        const activeIncidents = incidents.filter(
            incident =>
                String(incident.status || "").toLowerCase() === "active"
        ).length;


        const criticalIncidents = incidents.filter(
            incident =>
                String(incident.severity || "").toLowerCase() === "critical"
        ).length;


        const highIncidents = incidents.filter(
            incident =>
                String(incident.severity || "").toLowerCase() === "high"
        ).length;


        const mediumIncidents = incidents.filter(
            incident =>
                String(incident.severity || "").toLowerCase() === "medium"
        ).length;


        const lowIncidents = incidents.filter(
            incident =>
                String(incident.severity || "").toLowerCase() === "low"
        ).length;


        const peopleAffected = incidents.reduce(
            (total, incident) =>
                total + Number(incident.peopleAffected || 0),
            0
        );


        // ==============================
        // RESOURCE STATISTICS
        // ==============================

        const availableResources = resources.filter(
            resource =>
                String(resource.status || "").toLowerCase() === "available"
        ).length;


        const deployedResources = resources.filter(
            resource =>
                String(resource.status || "").toLowerCase() === "deployed"
        ).length;


        const activeResources = resources.filter(
            resource =>
                String(resource.status || "").toLowerCase() === "active"
        ).length;


        // ==============================
        // TEAM STATISTICS
        // ==============================

        const activeTeams = teams.filter(
            team =>
                String(team.status || "").toLowerCase() === "active"
        ).length;


        const availableTeams = teams.filter(
            team =>
                String(team.status || "").toLowerCase() === "available"
        ).length;


        const deployedTeams = teams.filter(
            team =>
                String(team.status || "").toLowerCase() === "deployed"
        ).length;


        // ==============================
        // RECENT INCIDENTS
        // ==============================

        const recentIncidents = [...incidents]
            .sort(
                (a, b) =>
                    new Date(b.createdAt || 0) -
                    new Date(a.createdAt || 0)
            )
            .slice(0, 5);


        // ==============================
        // RESPONSE
        // ==============================

        res.json({

            success: true,

            data: {

                incidents: {

                    total: incidents.length,

                    active: activeIncidents,

                    critical: criticalIncidents,

                    high: highIncidents,

                    medium: mediumIncidents,

                    low: lowIncidents,

                    peopleAffected: peopleAffected

                },


                resources: {

                    total: resources.length,

                    available: availableResources,

                    deployed: deployedResources,

                    active: activeResources

                },


                teams: {

                    total: teams.length,

                    active: activeTeams,

                    available: availableTeams,

                    deployed: deployedTeams

                },


                recentIncidents: recentIncidents

            }

        });

    }

    catch (error) {

        console.error(
            "Dashboard error:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Unable to load dashboard data",

            error: error.message

        });

    }

});


module.exports = router;