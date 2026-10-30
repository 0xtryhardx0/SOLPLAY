const fs = require('fs');
const path = require('path');

function normalizeTeamKey(name) {
    if (!name) return "";
    return name.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // strip diacritics
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/[^a-z0-9]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

const MASTER_RATINGS = {
    // English Premier League & Championship
    "manchester city": 2060, "man city": 2060,
    "arsenal": 2025,
    "liverpool": 2020,
    "chelsea": 1890,
    "aston villa": 1865,
    "newcastle united": 1855, "newcastle": 1855,
    "tottenham hotspur": 1845, "tottenham": 1845, "spurs": 1845,
    "brighton & hove albion": 1750, "brighton": 1750,
    "fulham": 1740,
    "west ham united": 1735, "west ham": 1735,
    "brentford": 1725,
    "crystal palace": 1715,
    "afc bournemouth": 1715, "bournemouth": 1715,
    "everton": 1705,
    "nottingham forest": 1700,
    "manchester united": 1820, "man utd": 1820,
    "wolverhampton wanderers": 1675, "wolverhampton": 1675, "wolves": 1675,
    "leicester city": 1655, "leicester": 1655,
    "southampton": 1625,
    "ipswich town": 1585, "ipswich": 1585,
    "leeds united": 1670, "leeds": 1670,
    "sunderland": 1640,
    "coventry city": 1610, "coventry": 1610,
    "hull city": 1520, "hull": 1520,

    // Spanish La Liga & Segunda
    "real madrid": 2060,
    "barcelona": 2040, "barca": 2040,
    "atletico madrid": 1930, "atletico": 1930,
    "athletic bilbao": 1820, "athletic club": 1820, "bilbao": 1820,
    "real sociedad": 1800,
    "villarreal": 1790,
    "girona": 1765,
    "real betis": 1760, "betis": 1760,
    "sevilla": 1740,
    "celta vigo": 1720, "celta": 1720,
    "osasuna": 1705,
    "valencia": 1700,
    "mallorca": 1690,
    "rayo vallecano": 1680, "rayo": 1680,
    "las palmas": 1660,
    "getafe": 1660,
    "alaves": 1650,
    "espanyol": 1640,
    "leganes": 1620,
    "valladolid": 1610,

    // German Bundesliga & 2. Bundesliga
    "bayern munich": 2010, "bayern": 2010,
    "bayer leverkusen": 1970, "leverkusen": 1970,
    "borussia dortmund": 1880, "dortmund": 1880,
    "rb leipzig": 1840, "leipzig": 1840,
    "vfb stuttgart": 1810, "stuttgart": 1810,
    "eintracht frankfurt": 1800, "frankfurt": 1800,
    "sc freiburg": 1740, "freiburg": 1740,
    "borussia monchengladbach": 1710, "monchengladbach": 1710,
    "vfl wolfsburg": 1710, "wolfsburg": 1710,
    "tsg hoffenheim": 1710, "hoffenheim": 1710,
    "union berlin": 1700,
    "werder bremen": 1690, "bremen": 1690,
    "fsv mainz 05": 1680, "mainz": 1680, "mainz 05": 1680,
    "fc augsburg": 1680, "augsburg": 1680,
    "fc heidenheim": 1680, "heidenheim": 1680,
    "st pauli": 1610,
    "holstein kiel": 1590,
    "vfl bochum": 1580, "bochum": 1580,
    "sv elversberg": 1550, "elversberg": 1550,

    // Italian Serie A & Serie B
    "inter milan": 1990, "internazionale": 1990, "inter": 1990,
    "juventus": 1890, "juve": 1890,
    "ac milan": 1875, "milan": 1875,
    "atalanta": 1865,
    "napoli": 1860,
    "as roma": 1810, "roma": 1810,
    "lazio": 1800,
    "fiorentina": 1775,
    "bologna": 1770,
    "torino": 1720,
    "udinese": 1700,
    "empoli": 1670,
    "sassuolo": 1670,
    "genoa": 1670,
    "parma": 1660,
    "hellas verona": 1650, "verona": 1650,
    "como": 1650,
    "cagliari": 1640,
    "monza": 1640,
    "frosinone": 1640,
    "lecce": 1630,
    "venezia": 1600,

    // French Ligue 1 & Ligue 2
    "paris saint-germain": 1970, "paris saint germain": 1970, "psg": 1970, "paris sg": 1970,
    "as monaco": 1820, "monaco": 1820,
    "lille osc": 1805, "lille": 1805,
    "olympique marseille": 1795, "marseille": 1795,
    "rc lens": 1750, "lens": 1750,
    "olympique lyonnais": 1750, "lyon": 1750,
    "ogc nice": 1750, "nice": 1750,
    "stade rennais": 1730, "rennes": 1730,
    "stade brestois 29": 1740, "brest": 1740,
    "stade de reims": 1700, "reims": 1700,
    "rc strasbourg": 1680, "strasbourg": 1680,
    "toulouse fc": 1680, "toulouse": 1680,
    "fc nantes": 1660, "nantes": 1660,
    "lorient": 1655, "fc lorient": 1655,
    "aj auxerre": 1640, "auxerre": 1640,
    "le havre ac": 1620, "le havre": 1620,
    "as saint-etienne": 1620, "saint etienne": 1620,
    "paris fc": 1620,
    "angers sco": 1600, "angers": 1600,
    "montpellier hsc": 1610, "montpellier": 1610,
    "troyes": 1560,
    "le mans": 1520,

    // European & International Contenders
    "sporting cp": 1870, "sporting lisbon": 1870, "sporting": 1870,
    "sl benfica": 1825, "benfica": 1825,
    "fc porto": 1805, "porto": 1805,
    "psv eindhoven": 1795, "psv": 1795,
    "feyenoord rotterdam": 1770, "feyenoord": 1770,
    "afc ajax": 1750, "ajax": 1750,
    "celtic": 1700,
    "rangers": 1680,
    "galatasaray": 1740,
    "fenerbahce": 1735,
    "besiktas": 1690,
    "olympiacos": 1690,
    "shakhtar donetsk": 1690,
    "dynamo kyiv": 1640,
    "slavia prague": 1675,
    "bodo/glimt": 1630, "bodo glimt": 1630,
    "union st.-gilloise": 1690, "union st gilloise": 1690,
    "club brugge": 1710,
    "rb salzburg": 1700, "salzburg": 1700,
    "lask linz": 1570, "lask": 1570,
    "viking": 1530,
    "slovan bratislava": 1540
};

// Build index
const NORMALIZED_INDEX = {};
for (const [k, v] of Object.entries(MASTER_RATINGS)) {
    NORMALIZED_INDEX[normalizeTeamKey(k)] = v;
}

function resolveRating(teamName, leagueName) {
    if (!teamName) return 1650;
    const norm = normalizeTeamKey(teamName);
    
    // 1. Direct normalized lookup
    if (NORMALIZED_INDEX[norm]) return NORMALIZED_INDEX[norm];
    
    // 2. Exact match in raw list
    for (const [k, v] of Object.entries(MASTER_RATINGS)) {
        if (norm === normalizeTeamKey(k)) return v;
    }

    // 3. Substring match
    for (const [k, v] of Object.entries(NORMALIZED_INDEX)) {
        if (norm.length >= 4 && k.length >= 4) {
            if (norm.includes(k) || k.includes(norm)) return v;
        }
    }

    // 4. Default tier fallback
    let base = 1650;
    const l = (leagueName || "").toLowerCase();
    if (l.includes("champions")) base = 1760;
    else if (l.includes("premier")) base = 1720;
    else if (l.includes("la liga") || l.includes("serie a") || l.includes("bundesliga")) base = 1700;
    else if (l.includes("europa")) base = 1680;
    
    return base;
}

function calculateOdds(homeTeam, awayTeam, leagueName) {
    const hElo = resolveRating(homeTeam, leagueName);
    const aElo = resolveRating(awayTeam, leagueName);
    const diff = (hElo + 65) - aElo;
    const pHomeRaw = 1.0 / (1.0 + Math.pow(10.0, -diff / 620.0));
    const pDraw = Math.max(0.19, Math.min(0.29, 0.275 - Math.abs(diff) * 0.00021));
    const pHome = pHomeRaw * (1.0 - pDraw);
    const pAway = (1.0 - pHomeRaw) * (1.0 - pDraw);
    const margin = 1.058;
    return {
        home: Math.max(1.08, Math.min(35.0, +(1.0 / (pHome * margin)).toFixed(2))),
        draw: Math.max(2.60, Math.min(18.0, +(1.0 / (pDraw * margin)).toFixed(2))),
        away: Math.max(1.08, Math.min(35.0, +(1.0 / (pAway * margin)).toFixed(2))),
        provider: "SolPlay Sharp Consensus"
    };
}

module.exports = {
    normalizeTeamKey,
    MASTER_RATINGS,
    resolveRating,
    calculateOdds
};

if (require.main === module) {
    console.log("=== Testing Ratings & Odds Engine ===");
    const testCases = [
        ["Le Havre AC", "Paris Saint-Germain", "Ligue 1"],
        ["Villarreal", "Paris Saint-Germain", "UEFA Champions League"],
        ["Real Madrid", "Barcelona", "La Liga"],
        ["Arsenal", "Chelsea", "Premier League"],
        ["Bodo/Glimt", "Galatasaray", "UEFA Champions League"]
    ];

    for (const [h, a, l] of testCases) {
        const hRating = resolveRating(h, l);
        const aRating = resolveRating(a, l);
        const odds = calculateOdds(h, a, l);
        console.log(`\nMatch: ${h} (${hRating}) vs ${a} (${aRating}) [${l}]`);
        console.log(`Odds: 1: ${odds.home} | X: ${odds.draw} | 2: ${odds.away}`);
    }
}
