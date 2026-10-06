const fs = require("fs");
const path = require("path");

const databasePath = path.join(
    __dirname,
    "..",
    "database",
    "db.json"
);


// READ DATABASE

function readDatabase() {

    try {

        const data = fs.readFileSync(
            databasePath,
            "utf8"
        );

        return JSON.parse(data);

    } catch (error) {

        console.error(
            "Database read error:",
            error
        );

        return {
            incidents: [],
            resources: [],
            teams: []
        };

    }

}


// WRITE DATABASE

function writeDatabase(data) {

    try {

        fs.writeFileSync(
            databasePath,
            JSON.stringify(data, null, 4),
            "utf8"
        );

        console.log("Database updated successfully.");

    } catch (error) {

        console.error(
            "Database write error:",
            error
        );

        throw error;

    }

}


module.exports = {
    readDatabase,
    writeDatabase
};