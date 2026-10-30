const fs = require('fs');
const path = require('path');
const { normalizeTeamKey, MASTER_RATINGS, resolveRating, calculateOdds } = require('./verify_and_patch_ratings');

console.log("=== 1. Patching verified_official_matches.json & active_matches.json ===");

function patchMatchList(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const matches = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let patchedCount = 0;
    for (const m of matches) {
        if (!m.homeTeam || !m.awayTeam) continue;
        // Check if odds were SolPlay Sharp Consensus or scheduled
        if (m.status === 'SCHEDULED' || (m.odds && m.odds.provider === 'SolPlay Sharp Consensus')) {
            const newOdds = calculateOdds(m.homeTeam, m.awayTeam, m.league);
            m.odds = newOdds;
            patchedCount++;
        }
    }
    fs.writeFileSync(filePath, JSON.stringify(matches, null, 2), 'utf8');
    console.log(`Updated ${patchedCount} matches in ${filePath}`);
    return matches;
}

const verifiedMatches = patchMatchList('verified_official_matches.json');
patchMatchList('active_matches.json');

// Check Le Havre vs PSG odds in verifiedMatches
const psgMatch = verifiedMatches.find(m => m.id === 401876421);
console.log("Verified Le Havre vs PSG match odds now:", psgMatch?.odds);

console.log("=== 2. Patching app.js ===");
let appJs = fs.readFileSync('app.js', 'utf8');

// Replace MATCHES_DATA in app.js
const matchesDataRegex = /let MATCHES_DATA = \[[\s\S]*?\n\];/;
const formattedMatchesJson = "let MATCHES_DATA = " + JSON.stringify(verifiedMatches, null, 4) + ";";
if (matchesDataRegex.test(appJs)) {
    appJs = appJs.replace(matchesDataRegex, formattedMatchesJson);
    console.log("Successfully replaced MATCHES_DATA in app.js");
} else {
    console.error("Could not find MATCHES_DATA array in app.js!");
}

fs.writeFileSync('app.js', appJs, 'utf8');
console.log("app.js saved with updated MATCHES_DATA.");
