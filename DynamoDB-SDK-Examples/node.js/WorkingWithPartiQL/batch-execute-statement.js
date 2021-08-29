const REGION = "us-west-2";
// I am using the DynamoDB low level because the DocClient does not support executeStatement used with PartiQL
const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

// Create low level client
const dbclient = new DynamoDB({ region: REGION });

// In PartiQL, we can perform batchWrite operation with backExecuteStatement.
const insertTeams = async (event) => {
    let partiqlInsertParams = {
        Statements: []
    }
    for (let team of event.teams) {
        let teamParams = {
            pk: "TEAM",
            sk: team.name + "#" + team.group + "#" + team.ranking,
            display_name: team.name,
            team_group: team.group,
            ranking: team.ranking,
            matches_played: team.matches_played,
            matches_won: team.matches_won,
            matches_drew: team.matches_drew,
            matches_lost: team.matches_lost,
            goals_for: team.goals_for,
            goals_against: team.goals_against,
            goals_difference: team.goals_difference,
            team_points: team.team_points
        }
        //PartiQL INSERT statement, with the data passed as parameters.
        let partiqlStmt = {
            Statement: `INSERT INTO "testing-partiql" VALUE "{'pk':'${teamParams.pk}','sk':'${teamParams.sk}','display_name':'${teamParams.display_name}','team_group':'${teamParams.team_group}','ranking':${teamParams.ranking},'matches_played':${teamParams.matches_played},'matches_won':${teamParams.matches_won},'matches_drew':${teamParams.matches_drew},'matches_lost':${teamParams.matches_lost},'goals_for':${teamParams.goals_for},'goals_against':${teamParams.goals_against},'goals_difference':${teamParams.goals_difference},'team_points':${teamParams.team_points}}"`,
        }
        partiqlInsertParams.Statements.push(partiqlStmt)
    }
    //batchExecuteStatement also limits upto max 25 items when performing a put action to DynamoDB.
    return response = await dbclient.batchExecuteStatement(partiqlInsertParams).promise()
}
let teamsList = [
    {
        "name": "Argentina",
        "group": "Group A",
        "ranking": 1,
        "matches_played": 4,
        "matches_won": 3,
        "matches_drew": 1,
        "matches_lost": 0,
        "goals_for": 7,
        "goals_against": 2,
        "goals_difference": 5,
        "team_points": 10
    },
    {
        "name": "Uruguay",
        "group": "Group A",
        "ranking": 2,
        "matches_played": 4,
        "matches_won": 2,
        "matches_drew": 1,
        "matches_lost": 1,
        "goals_for": 4,
        "goals_against": 2,
        "goals_difference": 2,
        "team_points": 7
    },
    {
        "name": "Paraguay",
        "group": "Group A",
        "ranking": 3,
        "matches_played": 4,
        "matches_won": 2,
        "matches_drew": 0,
        "matches_lost": 2,
        "goals_for": 5,
        "goals_against": 3,
        "goals_difference": 2,
        "team_points": 6
    },
    {
        "name": "Chile",
        "group": "Group A",
        "ranking": 4,
        "matches_played": 4,
        "matches_won": 1,
        "matches_drew": 2,
        "matches_lost": 1,
        "goals_for": 3,
        "goals_against": 4,
        "goals_difference": -1,
        "team_points": 5
    },
    {
        "name": "Bolivia",
        "group": "Group A",
        "ranking": 5,
        "matches_played": 4,
        "matches_won": 0,
        "matches_drew": 0,
        "matches_lost": 4,
        "goals_for": 2,
        "goals_against": 10,
        "goals_difference": -8,
        "team_points": 0
    },
    {
        "name": "Brazil",
        "group": "Group b",
        "ranking": 1,
        "matches_played": 4,
        "matches_won": 3,
        "matches_drew": 1,
        "matches_lost": 0,
        "goals_for": 10,
        "goals_against": 2,
        "goals_difference": 8,
        "team_points": 10
    },
    {
        "name": "Peru",
        "group": "Group b",
        "ranking": 2,
        "matches_played": 4,
        "matches_won": 2,
        "matches_drew": 1,
        "matches_lost": 1,
        "goals_for": 5,
        "goals_against": 7,
        "goals_difference": -2,
        "team_points": 7
    },
    {
        "name": "Colombia",
        "group": "Group B",
        "ranking": 3,
        "matches_played": 4,
        "matches_won": 1,
        "matches_drew": 1,
        "matches_lost": 2,
        "goals_for": 3,
        "goals_against": 4,
        "goals_difference": -1,
        "team_points": 4
    },
    {
        "name": "Ecuador",
        "group": "Group B",
        "ranking": 5,
        "matches_played": 4,
        "matches_won": 0,
        "matches_drew": 3,
        "matches_lost": 1,
        "goals_for": 6,
        "goals_against": 6,
        "goals_difference": -1,
        "team_points": 3
    },
    {
        "name": "Venezuela",
        "group": "Group B",
        "ranking": 5,
        "matches_played": 4,
        "matches_won": 0,
        "matches_drew": 2,
        "matches_lost": 2,
        "goals_for": 2,
        "goals_against": 6,
        "goals_difference": -4,
        "team_points": 2
    }
]

let payload = {
    teams: teamsList
}
insertTeams(payload)
    .then((data) => {
        console.log(JSON.stringify(data, null, 2));
    });
      }
  )
  .catch ((error) => console.error(JSON.stringify(error, null, 2)));