const fs = require('fs');
const path = require('path');

const { resolveRating, calculateOdds } = require('./verify_and_patch_ratings');

function getRating(team) {
    return resolveRating(team);
}

// Read files safely
const upcoming = fs.existsSync('upcoming_round.json') 
    ? JSON.parse(fs.readFileSync('upcoming_round.json', 'utf8'))
    : (fs.existsSync('verified_official_matches.json') ? JSON.parse(fs.readFileSync('verified_official_matches.json', 'utf8')) : []);
const previous = fs.existsSync('active_matches.json')
    ? JSON.parse(fs.readFileSync('active_matches.json', 'utf8')).filter(m => m.status === 'FINISHED')
    : [];

const master = [];
const seen = new Set();

// Helper to format WAT time
function formatWatTime(dateISO, group, status) {
    if (status === 'FINISHED') return 'Full Time';
    if (!dateISO) return 'Scheduled';
    const d = new Date(dateISO);
    const watH = (d.getUTCHours() + 1) % 24;
    const watM = d.getUTCMinutes().toString().padStart(2, '0');
    const tStr = `${watH < 10 ? '0' + watH : watH}:${watM} WAT`;
    if (group === 'today') return `Today ${tStr}`;
    if (group === 'tomorrow') return `Tomorrow ${tStr}`;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${days[d.getUTCDay()]} ${tStr}`;
}

const now = new Date();
const todayStr = now.toISOString().slice(0, 10);
const tomStr = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);

// Add all upcoming matches first
for (const m of upcoming) {
    const key = `${m.homeTeam}__${m.awayTeam}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const mDateStr = new Date(m.dateISO).toISOString().slice(0, 10);
    let group = 'week';
    if (mDateStr === todayStr) group = 'today';
    else if (mDateStr === tomStr) group = 'tomorrow';

    master.push({
        id: m.id,
        espnId: m.espnId,
        league: m.league,
        leagueCategory: m.leagueCategory,
        scheduleGroup: group,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeLogo: m.homeLogo,
        awayLogo: m.awayLogo,
        dateISO: m.dateISO,
        time: formatWatTime(m.dateISO, group, 'SCHEDULED'),
        status: 'SCHEDULED',
        score: null,
        odds: calculateOdds(m.homeTeam, m.awayTeam),
        timeline: [
            { time: "Pre-Match", type: "start", desc: `Kickoff scheduled for ${formatWatTime(m.dateISO, group, 'SCHEDULED')}`, icon: "🚩" }
        ],
        isLocked: false
    });
}

// Add verified finished matches
for (const m of previous) {
    const key = `${m.homeTeam}__${m.awayTeam}`;
    if (seen.has(key)) continue;
    seen.add(key);

    master.push({
        id: m.id,
        espnId: m.espnId,
        league: m.league,
        leagueCategory: m.leagueCategory,
        scheduleGroup: 'finished',
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeLogo: m.homeLogo,
        awayLogo: m.awayLogo,
        dateISO: m.dateISO,
        time: 'Full Time',
        status: 'FINISHED',
        score: m.score || { home: 1, away: 0 },
        odds: calculateOdds(m.homeTeam, m.awayTeam),
        timeline: [
            { time: "FT", type: "end", desc: `🏁 Final Whistle: ${m.homeTeam} ${m.score?.home || 0} - ${m.score?.away || 0} ${m.awayTeam} (Full Time)`, icon: "🏁" }
        ],
        isLocked: true
    });
}

console.log('Total Master Verified Matches:', master.length);
const groupSummary = {};
master.forEach(m => {
    groupSummary[m.scheduleGroup] = (groupSummary[m.scheduleGroup] || 0) + 1;
});
console.log('Schedule Group Summary:', groupSummary);

fs.writeFileSync('verified_official_matches.json', JSON.stringify(master, null, 2));

// Also generate JS export
const jsExport = `let MATCHES_DATA = ${JSON.stringify(master, null, 4)};\n`;
fs.writeFileSync('verified_matches_snippet.js', jsExport);
console.log('Saved verified_official_matches.json and verified_matches_snippet.js');
