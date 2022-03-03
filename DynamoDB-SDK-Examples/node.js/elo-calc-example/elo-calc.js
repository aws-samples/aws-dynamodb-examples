


function CalcElo(winnerScore, loserScore){
    // Calculate elo base
    const elo2 = 1 / (1 + (Math.pow(10, (winnerScore - loserScore)/400)));

    // Calculate the winner and loser score with the base
    let retVal = "{\"winner\": " + Math.round( winnerScore + (20 * (1-elo2))) + ", \"loser\": " + Math.round( loserScore + (20 * (0-elo2))) + "}";
    return retVal;
}

console.log(CalcElo(1827,1867));