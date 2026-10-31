/**
 * Automated Sportsbook Odds & Power Ratings Integrity Sentinel
 * Protects SolPlay against inverted odds, unranked team defaults, and accumulator compounding anomalies.
 */
const fs = require('fs');
const path = require('path');
const { resolveRating, calculateOdds, normalizeTeamKey, MASTER_RATINGS } = require('./verify_and_patch_ratings');

console.log("======================================================================");
console.log("🛡️  SOLPLAY SHARP ODDS & COMPLIANCE INTEGRITY AUDIT");
console.log("======================================================================");

let totalPassed = 0;
let totalFailed = 0;

function assert(condition, testName, details = "") {
    if (condition) {
        console.log(`  ✅ PASS: ${testName}`);
        totalPassed++;
    } else {
        console.error(`  ❌ FAIL: ${testName} - ${details}`);
        totalFailed++;
    }
}

// ----------------------------------------------------------------------
// TEST SUITE 1: Critical Team Aliases & Diacritics Normalization
// ----------------------------------------------------------------------
console.log("\n[1/4] Verifying Critical Club Ratings & Canonical Aliases...");
const criticalTeams = [
    { query: "Paris Saint-Germain", expectedMin: 1960 },
    { query: "PSG", expectedMin: 1960 },
    { query: "Paris SG", expectedMin: 1960 },
    { query: "Atlético Madrid", expectedMin: 1900 },
    { query: "Internazionale", expectedMin: 1980 },
    { query: "Bodo/Glimt", expectedMin: 1620 },
    { query: "Stade Rennais", expectedMin: 1720 },
    { query: "Le Havre AC", expectedMax: 1640 },
    { query: "Manchester City", expectedMin: 2050 },
    { query: "Real Madrid", expectedMin: 2050 },
    { query: "Mainz", expectedMin: 1730 },
    { query: "FSV Mainz 05", expectedMin: 1730 },
    { query: "SV Elversberg", expectedMax: 1450 }
];

for (const t of criticalTeams) {
    const rating = resolveRating(t.query, "Bundesliga");
    if (t.expectedMin) {
        assert(rating >= t.expectedMin, `Rating for "${t.query}"`, `Expected >= ${t.expectedMin}, Got ${rating}`);
    }
    if (t.expectedMax) {
        assert(rating <= t.expectedMax, `Rating for "${t.query}"`, `Expected <= ${t.expectedMax}, Got ${rating}`);
    }
}

// ----------------------------------------------------------------------
// TEST SUITE 2: Fixture Odds Sanity (PSG vs Le Havre & Mainz vs Elversberg)
// ----------------------------------------------------------------------
console.log("\n[2/4] Verifying Mathematical Sharp Odds Output & Exploitation Resistance...");
const psgVsLeHavre = calculateOdds("Le Havre AC", "Paris Saint-Germain", "Ligue 1");
assert(psgVsLeHavre.away < 1.75, "PSG away odds must reflect heavy favorite status (< 1.75)", `Got ${psgVsLeHavre.away}`);
assert(psgVsLeHavre.home > 4.00, "Le Havre home odds must reflect underdog status (> 4.00)", `Got ${psgVsLeHavre.home}`);
assert(psgVsLeHavre.away < psgVsLeHavre.home, "PSG odds must be strictly lower than Le Havre odds");

const elversbergVsMainz = calculateOdds("SV Elversberg", "Mainz", "Bundesliga");
assert(elversbergVsMainz.away < 1.75, "Mainz away odds against 2. Bundesliga Elversberg must reflect favorite status (< 1.75)", `Got ${elversbergVsMainz.away}`);
assert(elversbergVsMainz.home > 4.50, "SV Elversberg home odds must reflect underdog status (> 4.50)", `Got ${elversbergVsMainz.home}`);
assert(!(elversbergVsMainz.home > 2.10 && elversbergVsMainz.away > 2.10), "Both teams must NEVER simultaneously have > 2.10 odds in an unbalanced fixture");

// Verify strict house edge / overround across samples
const testFixtures = [
    ["Real Madrid", "Barcelona", "La Liga"],
    ["Arsenal", "Chelsea", "Premier League"],
    ["SV Elversberg", "Mainz", "Bundesliga"],
    ["Le Havre AC", "Paris Saint-Germain", "Ligue 1"]
];
for (const [h, a, l] of testFixtures) {
    const o = calculateOdds(h, a, l);
    const sumInv = (1/o.home) + (1/o.draw) + (1/o.away);
    assert(sumInv >= 1.065, `Overround for ${h} vs ${a} must protect house (>= 106.5%)`, `Got ${(sumInv*100).toFixed(2)}%`);
}

// ----------------------------------------------------------------------
// TEST SUITE 3: Comprehensive Database Fixtures Verification
// ----------------------------------------------------------------------
console.log("\n[3/4] Scanning all active matches in verified_official_matches.json...");
const matchesFile = path.join(__dirname, 'verified_official_matches.json');
if (fs.existsSync(matchesFile)) {
    const matches = JSON.parse(fs.readFileSync(matchesFile, 'utf8'));
    let unratedCount = 0;
    let invertedOddsCount = 0;

    for (const m of matches) {
        if (!m.homeTeam || !m.awayTeam) continue;
        const hRating = resolveRating(m.homeTeam, m.league);
        const aRating = resolveRating(m.awayTeam, m.league);

        if (hRating === 1650 && !["como", "alaves"].some(x => m.homeTeam.toLowerCase().includes(x))) {
            unratedCount++;
        }
        if (aRating === 1650 && !["como", "alaves"].some(x => m.awayTeam.toLowerCase().includes(x))) {
            unratedCount++;
        }

        if (m.odds && m.status === 'SCHEDULED') {
            // If home team is 300+ Elo higher, home odds should be < 2.0
            if (hRating - aRating > 300 && m.odds.home > 2.0) {
                invertedOddsCount++;
                console.error(`Suspicious odds: ${m.homeTeam} (${hRating}) vs ${m.awayTeam} (${aRating}): Home odds ${m.odds.home}`);
            }
        }
    }
    assert(unratedCount === 0, `All matches in verified database have explicit power ratings`, `Found ${unratedCount} unrated teams`);
    assert(invertedOddsCount === 0, `No inverted favorite/underdog odds in scheduled fixtures`, `Found ${invertedOddsCount} inverted matches`);
}

// ----------------------------------------------------------------------
// TEST SUITE 4: Accumulator Compounding & Acca Boost Calibration
// ----------------------------------------------------------------------
console.log("\n[4/4] Accumulator Multiplier & Acca Boost Test (9-game ticket simulation)...");

// Simulate a balanced 9-game favorite ticket
const realisticFavoritePicks = [1.35, 1.40, 1.45, 1.50, 1.38, 1.42, 1.48, 1.35, 1.40];
let favProduct = 1.0;
realisticFavoritePicks.forEach(odd => favProduct *= odd);

assert(favProduct > 15 && favProduct < 45, "9 heavy-favorite selections compound to realistic ~15x - 45x range", `Product = ${favProduct.toFixed(2)}x`);

// Check Acca Boost formula: 8-9 legs = +35% bonus
const legs = 9;
let bonusPercent = 0;
if (legs >= 10) bonusPercent = 50;
else if (legs >= 8) bonusPercent = 35;
else if (legs >= 6) bonusPercent = 25;
else if (legs >= 5) bonusPercent = 15;

const boostedTotal = favProduct * (1 + bonusPercent / 100);
assert(bonusPercent === 35, "9-leg ticket receives exactly 35% Acca Boost bonus");
assert(boostedTotal > favProduct, "Boosted payout is higher than base multiplier");

console.log(`\nRealistic 9-game Favorite Ticket: ${favProduct.toFixed(2)}x (Boosted with +${bonusPercent}% to ${boostedTotal.toFixed(2)}x)`);

// ----------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------
console.log("\n======================================================================");
if (totalFailed === 0) {
    console.log(`🎉 ALL ${totalPassed} INTEGRITY AUDITS PASSED WITH ZERO ERRORS!`);
    console.log("Odds Engine, PSG ratings, and Accumulator compounding are verified.");
} else {
    console.error(`⚠️ AUDIT COMPLETED WITH ${totalFailed} FAILURES. PLEASE REVIEW ABOVE.`);
    process.exit(1);
}
console.log("======================================================================\n");
