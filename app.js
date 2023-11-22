const express = require("express");
const bodyParser = require("body-parser");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const app = express();

app.use(bodyParser.json());

const dbPath = path.join(__dirname, "covid19India.db");
let db = null;

const initialize = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3002, () =>
      console.log("Server is running on http://localhost:3002")
    );
  } catch (e) {
    console.log(`Db error ${e.message}`);
    process.exit(1);
  }
};

initialize();
const convertStateDbObjectToResponse = (dbobject) => {
  return {
    stateId: dbobject.state_id,
    stateName: dbobject.state_name,
    population: dbobject.population,
  };
};

const convertDistrictDbObjectToResponse = (dbobject) => {
  return {
    districtId: dbobject.district_id,
    districtName: dbobject.district_name,
    stateId: dbobject.state_id,
    cases: dbobject.cases,
    cured: dbobject.cured,
    active: dbobject.active,
    deaths: dbobject.deaths,
  };
};

// API 1
app.get("/states/", async (request, response) => {
  const getStatesQuery = `
    SELECT 
        state_id,
        state_name,
        population
     FROM 
        state
  `;
  const statesArray = await db.all(getStatesQuery);
  response.send(
    statesArray.map((each_state) => ({
      stateId: each_state.state_id,
      stateName: each_state.state_name,
      population: each_state.population,
    }))
  );
});

// API 2
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT 
        *
     FROM 
        state
    WHERE 
        state_id = ${stateId}
  `;
  const state = await db.get(getStateQuery);
  response.send(convertStateDbObjectToResponse(state));
});

// API 3
app.post("/districts/", async (request, response) => {
  const details = request.body;
  const { districtName, stateId, cases, cured, active, deaths } = details;
  const postDistrictQuery = `
    INSERT INTO district (district_name, state_id, cases, cured, active, deaths)
    VALUES ('${districtName}',
    ${stateId},
    ${cases},
    ${cured},
    ${active},
    ${deaths})
  `;
  await db.run(postDistrictQuery);
  response.send("District Successfully Added");
});

// API 4
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
    SELECT 
        *
     FROM 
        district
    WHERE 
        district_id = ${districtId}
  `;
  const district = await db.get(getDistrictQuery);
  response.send(convertDistrictDbObjectToResponse(district));
});

// API 5
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
    DELETE FROM district WHERE district_id = ${districtId}
  `;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

// API 6
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const details = request.body;
  const { districtName, stateId, cases, cured, active, deaths } = details;
  const putDistrictQuery = `
    UPDATE district
    SET district_name = ?, state_id = ?, cases = ?, cured = ?, active = ?, deaths = ?
    WHERE district_id = ?
  `;
  await db.run(putDistrictQuery, [
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
    districtId,
  ]);
  response.send("District Details Updated");
});

// API 7
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateStatsQuery = `
    SELECT 
        SUM(cases) as totalCases,
        SUM(cured) as totalCured,
        SUM(active) as totalActive,
        SUM(deaths) as totalDeaths
     FROM 
        district
    WHERE 
        state_id = ${stateId}
  `;
  const stats = await db.get(getStateStatsQuery);
  response.send(stats);
});

// API 8
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
    SELECT 
        state_id
     FROM 
        district
    WHERE 
        district_id = ${districtId}
  `;
  const getDistrictQueryResponse = await db.get(getDistrictQuery);

  const getStateNameQuery = `
    SELECT 
        state_name as StateName
     FROM 
        state
    WHERE 
        state_id = ${getDistrictQueryResponse.state_id}
  `;
  const getStateNameQueryResponse = await db.get(getStateNameQuery);
  response.send(getStateNameQueryResponse);
});

module.exports = app;
