const API_URL = "/api";

let incidentsCache = [];
let resourcesCache = [];
let teamsCache = [];


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    initializeNavigation();
    initializeDate();

    loadDashboard();
    loadIncidents();
    loadResources();
    loadTeams();

    initializeModals();

});


// ============================================================
// NAVIGATION
// ============================================================

function initializeNavigation() {

    const navButtons =
        document.querySelectorAll(".nav-btn");

    navButtons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                navButtons.forEach(btn =>
                    btn.classList.remove("active")
                );

                button.classList.add("active");

                const page =
                    button.dataset.page;

                showPage(page);

            }
        );

    });

}


function showPage(page) {

    document
        .querySelectorAll(".page")
        .forEach(section => {

            section.classList.remove("active");

        });


    const selectedPage =
        document.getElementById(
            `${page}Page`
        );


    if (selectedPage) {

        selectedPage.classList.add(
            "active"
        );

    }


    const pageTitle =
        document.getElementById(
            "pageTitle"
        );


    const titles = {

        dashboard: "Emergency Command Center",

        emergencies: "Emergency Management",

        resources: "Resource Management",

        teams: "Response Teams",

        reports: "Emergency Reports"

    };


    if (pageTitle) {

        pageTitle.textContent =
            titles[page] ||
            "ResQDeploy";

    }

}


// ============================================================
// DATE
// ============================================================

function initializeDate() {

    const dateElement =
        document.getElementById(
            "currentDate"
        );


    function updateDate() {

        if (!dateElement) return;

        const now =
            new Date();

        dateElement.textContent =
            now.toLocaleDateString(
                "en-IN",
                {
                    weekday: "long",
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                }
            );

    }


    updateDate();

    setInterval(
        updateDate,
        60000
    );

}


// ============================================================
// API HELPER
// ============================================================

async function apiRequest(
    endpoint,
    options = {}
) {

    try {

        const response =
            await fetch(
                `${API_URL}${endpoint}`,
                {
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    ...options
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Request failed"
            );

        }


        return data;

    } catch (error) {

        console.error(
            "API Error:",
            error
        );

        throw error;

    }

}


// ============================================================
// DASHBOARD
// ============================================================

async function loadDashboard() {

    try {

        const response =
            await apiRequest(
                "/dashboard"
            );


        if (!response.success)
            return;


        const data =
            response.data;


        setText(
            "activeIncidents",
            data.incidents.active
        );


        setText(
            "peopleAffectedCount",
            data.incidents.peopleAffected
        );


        setText(
            "resourceCount",
            data.resources.available
        );


        setText(
            "teamCount",
            data.teams.available
        );


        setText(
            "criticalCount",
            data.incidents.critical
        );


        setText(
            "highCount",
            data.incidents.high
        );


        setText(
            "mediumCount",
            data.incidents.medium
        );


        setText(
            "lowCount",
            data.incidents.low
        );


        setText(
            "availableResources",
            data.resources.available
        );


        setText(
            "deployedResources",
            data.resources.deployed
        );


        setText(
            "availableTeams",
            data.teams.available
        );


        setText(
            "deployedTeams",
            data.teams.deployed
        );


        updateProgress(
            "resourceProgress",
            data.resources.available,
            data.resources.total
        );


        updateProgress(
            "deployedResourceProgress",
            data.resources.deployed,
            data.resources.total
        );


        updateProgress(
            "teamProgress",
            data.teams.available,
            data.teams.total
        );


        updateProgress(
            "deployedTeamProgress",
            data.teams.deployed,
            data.teams.total
        );


        renderRecentIncidents(
            data.recentIncidents || []
        );


    } catch (error) {

        console.error(
            "Dashboard loading failed:",
            error
        );

    }

}


// ============================================================
// INCIDENTS
// ============================================================

async function loadIncidents() {

    try {

        const response =
            await apiRequest(
                "/incidents"
            );


        incidentsCache =
            response.data || [];


        renderIncidents(
            incidentsCache
        );


        renderEmergencyTable(
            incidentsCache
        );


        updateReports();


    } catch (error) {

        console.error(
            "Incident loading failed:",
            error
        );

    }

}


function renderIncidents(
    incidents
) {

    const table =
        document.getElementById(
            "incidentTable"
        );


    if (!table) return;


    table.innerHTML = "";


    incidents.forEach(
        incident => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    <strong>
                        ${escapeHtml(
                            incident.name
                        )}
                    </strong>
                </td>

                <td>
                    ${escapeHtml(
                        incident.type
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        incident.location
                    )}
                </td>

                <td>
                    <span class="badge ${getSeverityClass(
                        incident.severity
                    )}">
                        ${escapeHtml(
                            incident.severity
                        )}
                    </span>
                </td>

                <td>
                    <span class="badge ${getStatusClass(
                        incident.status
                    )}">
                        ${escapeHtml(
                            formatStatus(
                                incident.status
                            )
                        )}
                    </span>
                </td>

                <td>
                    <div class="table-actions">

                        <button
                            class="action-btn"
                            onclick="viewIncident(${incident.id})"
                        >
                            View
                        </button>

                        ${
                            incident.status !==
                            "Closed"
                                ? `
                            <button
                                class="action-btn primary"
                                onclick="advanceIncident(${incident.id})"
                            >
                                Advance
                            </button>
                            `
                                : ""
                        }

                        <button
                            class="action-btn danger"
                            onclick="deleteIncident(${incident.id})"
                        >
                            Delete
                        </button>

                    </div>
                </td>

            `;


            table.appendChild(row);

        }
    );

}


function renderEmergencyTable(
    incidents
) {

    const table =
        document.getElementById(
            "emergencyTable"
        );


    if (!table) return;


    table.innerHTML = "";


    incidents.forEach(
        incident => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    <strong>
                        ${escapeHtml(
                            incident.name
                        )}
                    </strong>
                </td>

                <td>
                    ${escapeHtml(
                        incident.location
                    )}
                </td>

                <td>
                    <span class="badge ${getSeverityClass(
                        incident.severity
                    )}">
                        ${escapeHtml(
                            incident.severity
                        )}
                    </span>
                </td>

                <td>
                    <span class="badge ${getStatusClass(
                        incident.status
                    )}">
                        ${escapeHtml(
                            formatStatus(
                                incident.status
                            )
                        )}
                    </span>
                </td>

                <td>
                    ${incident.peopleAffected || 0}
                </td>

                <td>
                    <button
                        class="action-btn primary"
                        onclick="viewIncident(${incident.id})"
                    >
                        View Details
                    </button>
                </td>

            `;


            table.appendChild(row);

        }
    );

}


// ============================================================
// INCIDENT DETAILS + LIFECYCLE
// ============================================================

async function viewIncident(
    id
) {

    try {

        let incident =
            incidentsCache.find(
                item =>
                    Number(item.id) ===
                    Number(id)
            );


        if (!incident) {

            const response =
                await apiRequest(
                    `/incidents/${id}`
                );

            incident =
                response.data;

        }


        await loadResources();
        await loadTeams();


        await showIncidentDetails(
            incident
        );

    } catch (error) {

        alert(
            error.message ||
            "Unable to load incident"
        );

    }

}


async function showIncidentDetails(
    incident
) {

    const assignedResources =
        incident.assignedResources ||
        [];


    const assignedTeams =
        incident.assignedTeams ||
        [];


    const resourceItems =
        assignedResources
            .map(resourceId =>
                resourcesCache.find(
                    resource =>
                        Number(resource.id) ===
                        Number(resourceId)
                )
            )
            .filter(Boolean);


    const teamItems =
        assignedTeams
            .map(teamId =>
                teamsCache.find(
                    team =>
                        Number(team.id) ===
                        Number(teamId)
                )
            )
            .filter(Boolean);


    let lifecycleData;


    try {

        const response =
            await apiRequest(
                `/incidents/${incident.id}/lifecycle`
            );


        lifecycleData =
            response.data;

    } catch (error) {

        console.error(
            "Lifecycle loading failed:",
            error
        );

        lifecycleData = {

            currentStatus:
                incident.status,

            lifecycle: [
                "Active",
                "Under Investigation",
                "Response In Progress",
                "Contained",
                "Resolved",
                "Closed"
            ],

            allowedNextStatuses: [],

            progress: 0

        };

    }


    createIncidentDetailsModal();


    const modal =
        document.getElementById(
            "incidentDetailsModal"
        );


    const currentStatus =
        lifecycleData.currentStatus ||
        incident.status;


    const allowedNext =
        lifecycleData.allowedNextStatuses ||
        [];


    const lifecycleSteps =
        lifecycleData.lifecycle ||
        [];


    modal.innerHTML = `

        <div class="modal-content incident-details-modal">

            <div class="modal-header">

                <div>

                    <span class="eyebrow">
                        EMERGENCY RESPONSE
                    </span>

                    <h2>
                        Incident Details
                    </h2>

                </div>

                <button
                    class="modal-close"
                    onclick="closeIncidentDetailsModal()"
                >
                    &times;
                </button>

            </div>


            <div class="incident-detail-header">

                <div class="incident-main-info">

                    <div class="incident-title-row">

                        <h3>
                            ${escapeHtml(
                                incident.name
                            )}
                        </h3>

                        <span class="badge ${getSeverityClass(
                            incident.severity
                        )}">
                            ${escapeHtml(
                                incident.severity
                            )}
                        </span>

                        <span class="badge ${getStatusClass(
                            currentStatus
                        )}">
                            ${escapeHtml(
                                formatStatus(
                                    currentStatus
                                )
                            )}
                        </span>

                    </div>


                    <p class="incident-location">

                        📍
                        ${escapeHtml(
                            incident.location
                        )}

                    </p>


                    <p class="incident-description">

                        ${escapeHtml(
                            incident.description ||
                            "No description available."
                        )}

                    </p>

                </div>

            </div>


            <div class="incident-info-grid">

                <div class="incident-info-card">

                    <span>
                        INCIDENT ID
                    </span>

                    <strong>
                        #${incident.id}
                    </strong>

                </div>


                <div class="incident-info-card">

                    <span>
                        TYPE
                    </span>

                    <strong>
                        ${escapeHtml(
                            incident.type
                        )}
                    </strong>

                </div>


                <div class="incident-info-card">

                    <span>
                        PEOPLE AFFECTED
                    </span>

                    <strong>
                        ${incident.peopleAffected || 0}
                    </strong>

                </div>


                <div class="incident-info-card">

                    <span>
                        LAST UPDATED
                    </span>

                    <strong>
                        ${formatDateTime(
                            incident.updatedAt
                        )}
                    </strong>

                </div>

            </div>


            <!-- ==================================================
                 LIFECYCLE
                 ================================================== -->

            <div class="incident-lifecycle-section">

                <div class="lifecycle-header">

                    <div>

                        <span class="eyebrow">
                            RESPONSE PROGRESS
                        </span>

                        <h3>
                            Emergency Response Lifecycle
                        </h3>

                    </div>

                    <div class="lifecycle-progress-value">
                        ${lifecycleData.progress || 0}%
                    </div>

                </div>


                <div class="lifecycle-progress-bar">

                    <div
                        class="lifecycle-progress-fill"
                        style="width:${lifecycleData.progress || 0}%"
                    ></div>

                </div>


                <div class="lifecycle-timeline">

                    ${lifecycleSteps
                        .map(
                            (stage, index) => {

                                const currentIndex =
                                    lifecycleSteps.indexOf(
                                        currentStatus
                                    );

                                let state =
                                    "upcoming";

                                if (
                                    index <
                                    currentIndex
                                ) {

                                    state =
                                        "completed";

                                } else if (
                                    index ===
                                    currentIndex
                                ) {

                                    state =
                                        "current";

                                }


                                return `

                                    <div
                                        class="lifecycle-step ${state}"
                                    >

                                        <div class="lifecycle-node">

                                            ${
                                                state ===
                                                "completed"
                                                    ? "✓"
                                                    : index + 1
                                            }

                                        </div>


                                        <div class="lifecycle-step-label">

                                            ${escapeHtml(
                                                formatStatus(
                                                    stage
                                                )
                                            )}

                                        </div>

                                    </div>

                                `;

                            }
                        )
                        .join("")}

                </div>


                <div class="lifecycle-action-area">

                    <div>

                        <span class="lifecycle-current-label">
                            CURRENT STATUS
                        </span>

                        <strong>
                            ${escapeHtml(
                                formatStatus(
                                    currentStatus
                                )
                            )}
                        </strong>

                    </div>


                    ${
                        allowedNext.length > 0
                            ? `

                            <button
                                class="lifecycle-action-btn"
                                onclick="advanceIncident(${incident.id})"
                            >

                                Move to
                                ${escapeHtml(
                                    formatStatus(
                                        allowedNext[0]
                                    )
                                )}

                                <span>
                                    →
                                </span>

                            </button>

                            `
                            : `

                            <div class="lifecycle-complete">

                                ✓
                                Emergency lifecycle completed

                            </div>

                            `
                    }

                </div>

            </div>


            <!-- ==================================================
                 RESOURCES
                 ================================================== -->

            <div class="incident-assignment-section">

                <div class="assignment-section-header">

                    <div>

                        <span class="eyebrow">
                            DEPLOYED ASSETS
                        </span>

                        <h3>
                            Assigned Resources
                        </h3>

                    </div>

                    <div class="assignment-count">
                        ${resourceItems.length}
                    </div>

                </div>


                <div class="incident-assignment-list">

                    ${
                        resourceItems.length > 0
                            ? resourceItems
                                  .map(
                                      resource => `

                                <div class="incident-assignment-item">

                                    <div class="assignment-icon">
                                        🚑
                                    </div>

                                    <div class="assignment-info">

                                        <strong>
                                            ${escapeHtml(
                                                resource.name
                                            )}
                                        </strong>

                                        <span>
                                            ${escapeHtml(
                                                resource.type
                                            )}
                                            •
                                            ${escapeHtml(
                                                resource.location
                                            )}
                                        </span>

                                    </div>

                                    <span class="badge ${getStatusClass(
                                        resource.status
                                    )}">
                                        ${escapeHtml(
                                            resource.status
                                        )}
                                    </span>

                                </div>

                            `
                                  )
                                  .join("")
                            : `

                            <div class="incident-detail-empty">

                                No resources currently assigned.

                            </div>

                        `
                    }

                </div>

            </div>


            <!-- ==================================================
                 TEAMS
                 ================================================== -->

            <div class="incident-assignment-section">

                <div class="assignment-section-header">

                    <div>

                        <span class="eyebrow">
                            FIELD OPERATIONS
                        </span>

                        <h3>
                            Assigned Response Teams
                        </h3>

                    </div>

                    <div class="assignment-count">
                        ${teamItems.length}
                    </div>

                </div>


                <div class="incident-assignment-list">

                    ${
                        teamItems.length > 0
                            ? teamItems
                                  .map(
                                      team => `

                                <div class="incident-assignment-item">

                                    <div class="assignment-icon">
                                        👥
                                    </div>

                                    <div class="assignment-info">

                                        <strong>
                                            ${escapeHtml(
                                                team.name
                                            )}
                                        </strong>

                                        <span>
                                            ${escapeHtml(
                                                team.type
                                            )}
                                            •
                                            ${team.members}
                                            members
                                        </span>

                                    </div>

                                    <span class="badge ${getStatusClass(
                                        team.status
                                    )}">
                                        ${escapeHtml(
                                            team.status
                                        )}
                                    </span>

                                </div>

                            `
                                  )
                                  .join("")
                            : `

                            <div class="incident-detail-empty">

                                No response teams currently assigned.

                            </div>

                        `
                    }

                </div>

            </div>


            <div class="modal-footer">

                <button
                    class="secondary-btn"
                    onclick="closeIncidentDetailsModal()"
                >
                    Close
                </button>

                ${
                    allowedNext.length > 0
                        ? `

                        <button
                            class="primary-btn"
                            onclick="advanceIncident(${incident.id})"
                        >
                            Advance Response
                        </button>

                        `
                        : ""
                }

            </div>

        </div>

    `;


    modal.classList.add(
        "show"
    );

}


// ============================================================
// ADVANCE INCIDENT
// ============================================================

async function advanceIncident(
    id
) {

    try {

        const lifecycleResponse =
            await apiRequest(
                `/incidents/${id}/lifecycle`
            );


        const lifecycle =
            lifecycleResponse.data;


        const nextStatus =
            lifecycle.allowedNextStatuses &&
            lifecycle.allowedNextStatuses[0];


        if (!nextStatus) {

            alert(
                "This incident has completed its lifecycle."
            );

            return;

        }


        const confirmed =
            confirm(
                `Move incident to "${nextStatus}"?`
            );


        if (!confirmed)
            return;


        await apiRequest(
            `/incidents/${id}/status`,
            {
                method: "PATCH",

                body: JSON.stringify({
                    status:
                        nextStatus
                })
            }
        );


        await loadIncidents();
        await loadDashboard();


        const updatedIncident =
            incidentsCache.find(
                incident =>
                    Number(incident.id) ===
                    Number(id)
            );


        if (updatedIncident) {

            await showIncidentDetails(
                updatedIncident
            );

        }


    } catch (error) {

        alert(
            error.message ||
            "Unable to advance incident"
        );

    }

}


// ============================================================
// DELETE INCIDENT
// ============================================================

async function deleteIncident(
    id
) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this incident?"
        );


    if (!confirmed)
        return;


    try {

        await apiRequest(
            `/incidents/${id}`,
            {
                method: "DELETE"
            }
        );


        await loadIncidents();
        await loadDashboard();

        alert(
            "Incident deleted successfully."
        );


    } catch (error) {

        alert(
            error.message ||
            "Unable to delete incident"
        );

    }

}


// ============================================================
// INCIDENT MODAL
// ============================================================

function openIncidentModal() {

    const modal =
        document.getElementById(
            "incidentModal"
        );


    if (modal) {

        modal.classList.add(
            "show"
        );

    }

}


function closeIncidentModal() {

    const modal =
        document.getElementById(
            "incidentModal"
        );


    if (modal) {

        modal.classList.remove(
            "show"
        );

    }

}


function initializeModals() {

    const incidentForm =
        document.getElementById(
            "incidentForm"
        );


    if (incidentForm) {

        incidentForm.addEventListener(
            "submit",
            createIncident
        );

    }


    const resourceForm =
        document.getElementById(
            "resourceForm"
        );


    if (resourceForm) {

        resourceForm.addEventListener(
            "submit",
            createResource
        );

    }


    const teamForm =
        document.getElementById(
            "teamForm"
        );


    if (teamForm) {

        teamForm.addEventListener(
            "submit",
            createTeam
        );

    }


    document.addEventListener(
        "click",
        event => {

            const target =
                event.target;


            if (
                target.classList.contains(
                    "modal"
                )
            ) {

                target.classList.remove(
                    "show"
                );

            }

        }
    );

}


// ============================================================
// CREATE INCIDENT
// ============================================================

async function createIncident(
    event
) {

    event.preventDefault();


    const incident = {

        name:
            document.getElementById(
                "incidentName"
            ).value.trim(),

        type:
            document.getElementById(
                "incidentType"
            ).value,

        severity:
            document.getElementById(
                "incidentSeverity"
            ).value,

        location:
            document.getElementById(
                "incidentLocation"
            ).value.trim(),

        peopleAffected:
            Number(
                document.getElementById(
                    "peopleAffected"
                ).value
            ) || 0,

        description:
            document.getElementById(
                "incidentDescription"
            ).value.trim()

    };


    try {

        await apiRequest(
            "/incidents",
            {
                method: "POST",

                body:
                    JSON.stringify(
                        incident
                    )
            }
        );


        document
            .getElementById(
                "incidentForm"
            )
            .reset();


        closeIncidentModal();


        await loadIncidents();
        await loadDashboard();


        alert(
            "Incident created successfully."
        );


    } catch (error) {

        alert(
            error.message ||
            "Unable to create incident"
        );

    }

}


// ============================================================
// RESOURCES
// ============================================================

async function loadResources() {

    try {

        const response =
            await apiRequest(
                "/resources"
            );


        resourcesCache =
            response.data || [];


        renderResources(
            resourcesCache
        );


        updateResourceSummary(
            resourcesCache
        );


    } catch (error) {

        console.error(
            "Resource loading failed:",
            error
        );

    }

}


function renderResources(
    resources
) {

    const table =
        document.getElementById(
            "resourceTable"
        );


    if (!table) return;


    table.innerHTML = "";


    resources.forEach(
        resource => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    <strong>
                        ${escapeHtml(
                            resource.name
                        )}
                    </strong>
                </td>

                <td>
                    ${escapeHtml(
                        resource.type
                    )}
                </td>

                <td>
                    ${resource.quantity}
                </td>

                <td>
                    ${escapeHtml(
                        resource.location
                    )}
                </td>

                <td>
                    <span class="badge ${getStatusClass(
                        resource.status
                    )}">
                        ${escapeHtml(
                            resource.status
                        )}
                    </span>
                </td>

                <td>

                    ${
                        resource.status ===
                        "Deployed"
                            ? `

                            <button
                                class="action-btn warning"
                                onclick="returnResource(${resource.id})"
                            >
                                Return
                            </button>

                            `
                            : resource.status ===
                              "Available"
                            ? `

                            <button
                                class="action-btn primary"
                                onclick="deployResourcePrompt(${resource.id})"
                            >
                                Deploy
                            </button>

                            `
                            : ""
                    }

                    <button
                        class="action-btn danger"
                        onclick="deleteResource(${resource.id})"
                    >
                        Delete
                    </button>

                </td>

            `;


            table.appendChild(row);

        }
    );

}


function updateResourceSummary(
    resources
) {

    setText(
        "resourceTotal",
        resources.length
    );


    setText(
        "resourceAvailable",
        resources.filter(
            r =>
                r.status ===
                "Available"
        ).length
    );


    setText(
        "resourceDeployed",
        resources.filter(
            r =>
                r.status ===
                "Deployed"
        ).length
    );


    setText(
        "resourceOther",
        resources.filter(
            r =>
                ![
                    "Available",
                    "Deployed"
                ].includes(
                    r.status
                )
        ).length
    );

}


function openResourceModal() {

    const modal =
        document.getElementById(
            "resourceModal"
        );


    if (modal) {

        modal.classList.add(
            "show"
        );

    }

}


function closeResourceModal() {

    const modal =
        document.getElementById(
            "resourceModal"
        );


    if (modal) {

        modal.classList.remove(
            "show"
        );

    }

}


async function createResource(
    event
) {

    event.preventDefault();


    const resource = {

        name:
            document.getElementById(
                "resourceName"
            ).value.trim(),

        type:
            document.getElementById(
                "resourceType"
            ).value.trim(),

        quantity:
            Number(
                document.getElementById(
                    "resourceQuantity"
                ).value
            ) || 0,

        location:
            document.getElementById(
                "resourceLocation"
            ).value.trim()

    };


    try {

        await apiRequest(
            "/resources",
            {
                method: "POST",

                body:
                    JSON.stringify(
                        resource
                    )
            }
        );


        document
            .getElementById(
                "resourceForm"
            )
            .reset();


        closeResourceModal();


        await loadResources();
        await loadDashboard();


        alert(
            "Resource added successfully."
        );


    } catch (error) {

        alert(
            error.message ||
            "Unable to create resource"
        );

    }

}


async function deployResourcePrompt(
    resourceId
) {

    const incidentId =
        prompt(
            "Enter Incident ID to deploy this resource:"
        );


    if (!incidentId)
        return;


    try {

        await apiRequest(
            `/resources/${resourceId}/deploy`,
            {
                method: "PATCH",

                body: JSON.stringify({
                    incidentId:
                        Number(
                            incidentId
                        )
                })
            }
        );


        await loadResources();
        await loadIncidents();
        await loadDashboard();


        alert(
            "Resource deployed successfully."
        );


    } catch (error) {

        alert(
            error.message ||
            "Unable to deploy resource"
        );

    }

}


async function returnResource(
    resourceId
) {

    try {

        await apiRequest(
            `/resources/${resourceId}/return`,
            {
                method: "PATCH"
            }
        );


        await loadResources();
        await loadIncidents();
        await loadDashboard();


        alert(
            "Resource returned successfully."
        );


    } catch (error) {

        alert(
            error.message ||
            "Unable to return resource"
        );

    }

}


async function deleteResource(
    resourceId
) {

    if (
        !confirm(
            "Delete this resource?"
        )
    )
        return;


    try {

        await apiRequest(
            `/resources/${resourceId}`,
            {
                method: "DELETE"
            }
        );


        await loadResources();
        await loadIncidents();
        await loadDashboard();


    } catch (error) {

        alert(
            error.message ||
            "Unable to delete resource"
        );

    }

}


// ============================================================
// TEAMS
// ============================================================

async function loadTeams() {

    try {

        const response =
            await apiRequest(
                "/teams"
            );


        teamsCache =
            response.data || [];


        renderTeams(
            teamsCache
        );


        updateTeamSummary(
            teamsCache
        );


    } catch (error) {

        console.error(
            "Team loading failed:",
            error
        );

    }

}


function renderTeams(
    teams
) {

    const grid =
        document.getElementById(
            "teamGrid"
        );


    if (!grid) return;


    grid.innerHTML = "";


    teams.forEach(
        team => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "team-card";


            card.innerHTML = `

                <div class="team-card-header">

                    <div class="team-icon">
                        👥
                    </div>

                    <span class="badge ${getStatusClass(
                        team.status
                    )}">
                        ${escapeHtml(
                            team.status
                        )}
                    </span>

                </div>


                <h3>
                    ${escapeHtml(
                        team.name
                    )}
                </h3>


                <p>
                    ${escapeHtml(
                        team.type
                    )}
                </p>


                <div class="team-meta">

                    <span>
                        👤
                        ${team.members}
                        members
                    </span>

                    <span>
                        📍
                        ${escapeHtml(
                            team.location
                        )}
                    </span>

                </div>


                <div class="team-actions">

                    ${
                        team.status ===
                        "Deployed"
                            ? `

                            <button
                                class="action-btn warning"
                                onclick="returnTeam(${team.id})"
                            >
                                Return
                            </button>

                            `
                            : team.status ===
                              "Available"
                            ? `

                            <button
                                class="action-btn primary"
                                onclick="deployTeamPrompt(${team.id})"
                            >
                                Deploy
                            </button>

                            `
                            : ""
                    }

                    <button
                        class="action-btn danger"
                        onclick="deleteTeam(${team.id})"
                    >
                        Delete
                    </button>

                </div>

            `;


            grid.appendChild(
                card
            );

        }
    );

}


function updateTeamSummary(
    teams
) {

    setText(
        "teamTotal",
        teams.length
    );


    setText(
        "teamAvailable",
        teams.filter(
            team =>
                team.status ===
                "Available"
        ).length
    );


    setText(
        "teamDeployed",
        teams.filter(
            team =>
                team.status ===
                "Deployed"
        ).length
    );


    setText(
        "teamMembers",
        teams.reduce(
            (
                total,
                team
            ) =>
                total +
                Number(
                    team.members
                ),
            0
        )
    );

}


function openTeamModal() {

    const modal =
        document.getElementById(
            "teamModal"
        );


    if (modal) {

        modal.classList.add(
            "show"
        );

    }

}


function closeTeamModal() {

    const modal =
        document.getElementById(
            "teamModal"
        );


    if (modal) {

        modal.classList.remove(
            "show"
        );

    }

}


async function createTeam(
    event
) {

    event.preventDefault();


    const team = {

        name:
            document.getElementById(
                "teamName"
            ).value.trim(),

        type:
            document.getElementById(
                "teamType"
            ).value.trim(),

        members:
            Number(
                document.getElementById(
                    "teamMemberCount"
                ).value
            ) || 0,

        location:
            document.getElementById(
                "teamLocation"
            ).value.trim()

    };


    try {

        await apiRequest(
            "/teams",
            {
                method: "POST",

                body:
                    JSON.stringify(
                        team
                    )
            }
        );


        document
            .getElementById(
                "teamForm"
            )
            .reset();


        closeTeamModal();


        await loadTeams();
        await loadDashboard();


        alert(
            "Response team added successfully."
        );


    } catch (error) {

        alert(
            error.message ||
            "Unable to create team"
        );

    }

}


async function deployTeamPrompt(
    teamId
) {

    const incidentId =
        prompt(
            "Enter Incident ID to deploy this team:"
        );


    if (!incidentId)
        return;


    try {

        await apiRequest(
            `/teams/${teamId}/deploy`,
            {
                method: "PATCH",

                body: JSON.stringify({
                    incidentId:
                        Number(
                            incidentId
                        )
                })
            }
        );


        await loadTeams();
        await loadIncidents();
        await loadDashboard();


        alert(
            "Response team deployed successfully."
        );


    } catch (error) {

        alert(
            error.message ||
            "Unable to deploy team"
        );

    }

}


async function returnTeam(
    teamId
) {

    try {

        await apiRequest(
            `/teams/${teamId}/return`,
            {
                method: "PATCH"
            }
        );


        await loadTeams();
        await loadIncidents();
        await loadDashboard();


        alert(
            "Response team returned successfully."
        );


    } catch (error) {

        alert(
            error.message ||
            "Unable to return team"
        );

    }

}


async function deleteTeam(
    teamId
) {

    if (
        !confirm(
            "Delete this response team?"
        )
    )
        return;


    try {

        await apiRequest(
            `/teams/${teamId}`,
            {
                method: "DELETE"
            }
        );


        await loadTeams();
        await loadIncidents();
        await loadDashboard();


    } catch (error) {

        alert(
            error.message ||
            "Unable to delete team"
        );

    }

}


// ============================================================
// REPORTS
// ============================================================

function updateReports() {

    const totalIncidents =
        incidentsCache.length;


    const totalPeople =
        incidentsCache.reduce(
            (
                total,
                incident
            ) =>
                total +
                Number(
                    incident.peopleAffected
                || 0
                ),
            0
        );


    setText(
        "reportIncidentCount",
        totalIncidents
    );


    setText(
        "reportPeopleCount",
        totalPeople
    );


    setText(
        "reportResourceCount",
        resourcesCache.length
    );


    setText(
        "reportTeamCount",
        teamsCache.length
    );

}


// ============================================================
// REFRESH
// ============================================================

async function refreshDashboard() {

    await Promise.all([
        loadDashboard(),
        loadIncidents(),
        loadResources(),
        loadTeams()
    ]);

}


// ============================================================
// INCIDENT DETAILS MODAL
// ============================================================

function createIncidentDetailsModal() {

    let modal =
        document.getElementById(
            "incidentDetailsModal"
        );


    if (modal)
        return;


    modal =
        document.createElement(
            "div"
        );


    modal.id =
        "incidentDetailsModal";


    modal.className =
        "modal";


    document.body.appendChild(
        modal
    );


    modal.addEventListener(
        "click",
        function(event) {

            if (
                event.target ===
                modal
            ) {

                closeIncidentDetailsModal();

            }

        }
    );

}


function closeIncidentDetailsModal() {

    const modal =
        document.getElementById(
            "incidentDetailsModal"
        );


    if (modal) {

        modal.classList.remove(
            "show"
        );

    }

}


// ============================================================
// HELPERS
// ============================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value;

    }

}


function updateProgress(
    id,
    value,
    total
) {

    const element =
        document.getElementById(
            id
        );


    if (!element)
        return;


    const percentage =
        total > 0
            ? Math.round(
                (
                    value /
                    total
                ) * 100
            )
            : 0;


    element.style.width =
        `${percentage}%`;

}


function getSeverityClass(
    severity
) {

    const value =
        String(
            severity || ""
        ).toLowerCase();


    if (value === "critical")
        return "danger";


    if (value === "high")
        return "warning";


    if (value === "medium")
        return "medium";


    return "success";

}


function getStatusClass(
    status
) {

    const value =
        String(
            status || ""
        ).toLowerCase();


    if (
        value.includes(
            "active"
        )
    )
        return "danger";


    if (
        value.includes(
            "investigation"
        )
    )
        return "warning";


    if (
        value.includes(
            "response"
        )
    )
        return "primary";


    if (
        value.includes(
            "contained"
        )
    )
        return "purple";


    if (
        value.includes(
            "resolved"
        )
    )
        return "success";


    if (
        value.includes(
            "closed"
        )
    )
        return "success";


    if (
        value.includes(
            "deployed"
        )
    )
        return "primary";


    if (
        value.includes(
            "available"
        )
    )
        return "success";


    if (
        value.includes(
            "returned"
        )
    )
        return "success";


    return "medium";

}


function formatStatus(
    status
) {

    if (!status)
        return "Unknown";


    return String(
        status
    );

}


function formatDateTime(
    dateString
) {

    if (!dateString)
        return "N/A";


    const date =
        new Date(
            dateString
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "N/A";

    }


    return date.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


function escapeHtml(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(
        value
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// Make important functions available
// to HTML onclick attributes.

window.openIncidentModal =
    openIncidentModal;

window.closeIncidentModal =
    closeIncidentModal;

window.openResourceModal =
    openResourceModal;

window.closeResourceModal =
    closeResourceModal;

window.openTeamModal =
    openTeamModal;

window.closeTeamModal =
    closeTeamModal;

window.viewIncident =
    viewIncident;

window.advanceIncident =
    advanceIncident;

window.deleteIncident =
    deleteIncident;

window.deployResourcePrompt =
    deployResourcePrompt;

window.returnResource =
    returnResource;

window.deleteResource =
    deleteResource;

window.deployTeamPrompt =
    deployTeamPrompt;

window.returnTeam =
    returnTeam;

window.deleteTeam =
    deleteTeam;

window.closeIncidentDetailsModal =
    closeIncidentDetailsModal;

window.refreshDashboard =
    refreshDashboard;

window.showPage =
    showPage;