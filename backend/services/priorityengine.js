// ============================================================
// RESQDEPLOY
// INTELLIGENT EMERGENCY PRIORITY ENGINE
// ============================================================


// ============================================================
// SEVERITY WEIGHTS
// ============================================================

const severityWeights = {

    Critical: 40,

    High: 30,

    Medium: 20,

    Low: 10

};


// ============================================================
// INCIDENT TYPE WEIGHTS
// ============================================================

const incidentTypeWeights = {

    Flood: 15,

    Landslide: 15,

    Earthquake: 15,

    Cyclone: 15,

    Fire: 14,

    "Medical Emergency": 14,

    "Building Collapse": 15,

    Accident: 12,

    Drought: 8,

    "Forest Fire": 14,

    Tsunami: 15,

    Other: 8

};


// ============================================================
// RESPONSE STATUS WEIGHTS
// ============================================================

const statusWeights = {

    Active: 20,

    "Under Investigation": 15,

    "Response In Progress": 10,

    Contained: 5,

    Resolved: 2,

    Closed: 0

};


// ============================================================
// PEOPLE AFFECTED SCORE
// ============================================================

function calculatePeopleScore(
    peopleAffected
) {

    const people =
        Number(
            peopleAffected
        ) || 0;


    if (people >= 500) {

        return 25;

    }


    if (people >= 250) {

        return 20;

    }


    if (people >= 100) {

        return 15;

    }


    if (people >= 50) {

        return 10;

    }


    if (people >= 10) {

        return 5;

    }


    return 2;

}


// ============================================================
// SEVERITY SCORE
// ============================================================

function calculateSeverityScore(
    severity
) {

    return (
        severityWeights[
            severity
        ] || 5
    );

}


// ============================================================
// INCIDENT TYPE SCORE
// ============================================================

function calculateIncidentTypeScore(
    type
) {

    if (!type) {

        return 5;

    }


    const normalizedType =
        String(type)
            .trim();


    return (
        incidentTypeWeights[
            normalizedType
        ] || 5
    );

}


// ============================================================
// RESPONSE STATUS SCORE
// ============================================================

function calculateStatusScore(
    status
) {

    return (
        statusWeights[
            status
        ] || 5
    );

}


// ============================================================
// PRIORITY CATEGORY
// ============================================================

function getPriorityCategory(
    score
) {

    if (score >= 80) {

        return "CRITICAL";

    }


    if (score >= 60) {

        return "HIGH";

    }


    if (score >= 40) {

        return "MEDIUM";

    }


    return "LOW";

}


// ============================================================
// PRIORITY COLOR / UI CLASS
// ============================================================

function getPriorityClass(
    priority
) {

    switch (priority) {

        case "CRITICAL":
            return "danger";

        case "HIGH":
            return "warning";

        case "MEDIUM":
            return "medium";

        default:
            return "success";

    }

}


// ============================================================
// MAIN PRIORITY CALCULATION
// ============================================================

function calculatePriority(
    incident
) {

    if (!incident) {

        throw new Error(
            "Incident data is required"
        );

    }


    const severityScore =
        calculateSeverityScore(
            incident.severity
        );


    const peopleScore =
        calculatePeopleScore(
            incident.peopleAffected
        );


    const incidentTypeScore =
        calculateIncidentTypeScore(
            incident.type
        );


    const statusScore =
        calculateStatusScore(
            incident.status
        );


    /*
        Maximum theoretical score:

        Severity       = 40
        People         = 25
        Type           = 15
        Status         = 20

        TOTAL          = 100
    */

    const rawScore =
        severityScore +
        peopleScore +
        incidentTypeScore +
        statusScore;


    const score =
        Math.min(
            100,
            Math.max(
                0,
                rawScore
            )
        );


    const priority =
        getPriorityCategory(
            score
        );


    return {

        score,

        priority,

        priorityClass:
            getPriorityClass(
                priority
            ),

        breakdown: {

            severity: {
                value:
                    incident.severity,
                score:
                    severityScore
            },

            peopleAffected: {
                value:
                    Number(
                        incident.peopleAffected
                    ) || 0,
                score:
                    peopleScore
            },

            incidentType: {
                value:
                    incident.type,
                score:
                    incidentTypeScore
            },

            responseStatus: {
                value:
                    incident.status,
                score:
                    statusScore
            }

        }

    };

}


// ============================================================
// RESOURCE PRIORITY MATCHING
// ============================================================

function getRecommendedResourceTypes(
    incident
) {

    const type =
        String(
            incident.type || ""
        ).toLowerCase();


    const recommendations = [];


    if (
        type.includes(
            "flood"
        )
    ) {

        recommendations.push(
            "Ambulance",
            "Rescue Vehicle",
            "Medical Supplies",
            "Water Supply"
        );

    }


    else if (
        type.includes(
            "landslide"
        )
    ) {

        recommendations.push(
            "Rescue Vehicle",
            "Ambulance",
            "Medical Supplies"
        );

    }


    else if (
        type.includes(
            "earthquake"
        )
    ) {

        recommendations.push(
            "Rescue Vehicle",
            "Ambulance",
            "Medical Supplies"
        );

    }


    else if (
        type.includes(
            "fire"
        )
    ) {

        recommendations.push(
            "Fire Truck",
            "Ambulance",
            "Rescue Vehicle"
        );

    }


    else if (
        type.includes(
            "cyclone"
        )
    ) {

        recommendations.push(
            "Rescue Vehicle",
            "Ambulance",
            "Water Supply",
            "Medical Supplies"
        );

    }


    else if (
        type.includes(
            "medical"
        )
    ) {

        recommendations.push(
            "Ambulance",
            "Medical Supplies"
        );

    }


    else {

        recommendations.push(
            "Ambulance",
            "Rescue Vehicle",
            "Medical Supplies"
        );

    }


    return [
        ...new Set(
            recommendations
        )
    ];

}


// ============================================================
// TEAM TYPE MATCHING
// ============================================================

function getRecommendedTeamTypes(
    incident
) {

    const type =
        String(
            incident.type || ""
        ).toLowerCase();


    const recommendations = [];


    if (
        type.includes(
            "flood"
        )
    ) {

        recommendations.push(
            "Rescue",
            "Medical"
        );

    }


    else if (
        type.includes(
            "landslide"
        )
    ) {

        recommendations.push(
            "Rescue",
            "Medical"
        );

    }


    else if (
        type.includes(
            "earthquake"
        )
    ) {

        recommendations.push(
            "Rescue",
            "Medical",
            "Fire & Safety"
        );

    }


    else if (
        type.includes(
            "fire"
        )
    ) {

        recommendations.push(
            "Fire & Safety",
            "Medical"
        );

    }


    else if (
        type.includes(
            "cyclone"
        )
    ) {

        recommendations.push(
            "Rescue",
            "Medical"
        );

    }


    else if (
        type.includes(
            "medical"
        )
    ) {

        recommendations.push(
            "Medical"
        );

    }


    else {

        recommendations.push(
            "Rescue",
            "Medical"
        );

    }


    return [
        ...new Set(
            recommendations
        )
    ];

}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    calculatePriority,

    calculatePeopleScore,

    calculateSeverityScore,

    calculateIncidentTypeScore,

    calculateStatusScore,

    getPriorityCategory,

    getPriorityClass,

    getRecommendedResourceTypes,

    getRecommendedTeamTypes

};