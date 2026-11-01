const fs = require('fs');
const path = require('path');

const MULTI_SPORT_FEEDS = [
    // Top European Leagues & Cups
    { sport: 'soccer', leagueKey: 'eng.1', name: 'Premier League', category: 'Premier League' },
    { sport: 'soccer', leagueKey: 'eng.2', name: 'Championship', category: 'Championship' },
    { sport: 'soccer', leagueKey: 'eng.fa', name: 'FA Cup', category: 'FA Cup' },
    { sport: 'soccer', leagueKey: 'eng.league_cup', name: 'Carabao Cup', category: 'Carabao Cup' },
    { sport: 'soccer', leagueKey: 'uefa.champions', name: 'UEFA Champions League', category: 'Champions League' },
    { sport: 'soccer', leagueKey: 'uefa.europa', name: 'UEFA Europa League', category: 'Europa League' },
    { sport: 'soccer', leagueKey: 'uefa.europa.conf', name: 'UEFA Conference League', category: 'Conference League' },
    { sport: 'soccer', leagueKey: 'esp.1', name: 'La Liga', category: 'La Liga' },
    { sport: 'soccer', leagueKey: 'esp.2', name: 'La Liga 2', category: 'Segunda División' },
    { sport: 'soccer', leagueKey: 'ita.1', name: 'Serie A', category: 'Serie A' },
    { sport: 'soccer', leagueKey: 'ita.2', name: 'Serie B', category: 'Serie B' },
    { sport: 'soccer', leagueKey: 'ger.1', name: 'Bundesliga', category: 'Bundesliga' },
    { sport: 'soccer', leagueKey: 'ger.2', name: '2. Bundesliga', category: '2. Bundesliga' },
    { sport: 'soccer', leagueKey: 'fra.1', name: 'Ligue 1', category: 'Ligue 1' },
    { sport: 'soccer', leagueKey: 'fra.2', name: 'Ligue 2', category: 'Ligue 2' },
    { sport: 'soccer', leagueKey: 'ned.1', name: 'Eredivisie', category: 'Eredivisie' },
    { sport: 'soccer', leagueKey: 'por.1', name: 'Primeira Liga', category: 'Primeira Liga' },
    { sport: 'soccer', leagueKey: 'ksa.1', name: 'Saudi Pro League', category: 'Saudi Pro League' },
    { sport: 'soccer', leagueKey: 'usa.1', name: 'MLS', category: 'Major League Soccer' },
    { sport: 'soccer', leagueKey: 'bra.1', name: 'Brasileirão', category: 'Brasileirão Serie A' },
    { sport: 'soccer', leagueKey: 'tur.1', name: 'Süper Lig', category: 'Turkish Süper Lig' },
    { sport: 'soccer', leagueKey: 'mex.1', name: 'Liga MX', category: 'Liga MX' },
    { sport: 'soccer', leagueKey: 'afc.champions', name: 'AFC Champions League', category: 'AFC Champions' },
    // Basketball
    { sport: 'basketball', leagueKey: 'nba', name: 'NBA', category: 'NBA' },
    // American Football
    { sport: 'football', leagueKey: 'nfl', name: 'NFL', category: 'NFL' }
];

function americanToDecimal(american) {
    if (!american) return null;
    const val = typeof american === 'string' ? parseInt(american.replace('+', ''), 10) : american;
    if (isNaN(val)) return null;
    if (val > 0) {
        return parseFloat((1 + val / 100).toFixed(2));
    } else {
        return parseFloat((1 + 100 / Math.abs(val)).toFixed(2));
    }
}

async function pullMultiSportFeed() {
    console.log("Querying official ESPN global multi-sport feeds (Soccer, NBA, NFL)...");
    const allMatches = [];
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);

    for (const feed of MULTI_SPORT_FEEDS) {
        try {
            const url = `https://site.api.espn.com/apis/site/v2/sports/${feed.sport}/${feed.leagueKey}/scoreboard`;
            const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
            if (!res.ok) continue;
            const data = await res.json();
            const events = data.events || [];

            for (const ev of events) {
                const comp = ev.competitions?.[0];
                if (!comp) continue;
                const homeComp = comp.competitors?.find(c => c.homeAway === 'home');
                const awayComp = comp.competitors?.find(c => c.homeAway === 'away');
                if (!homeComp || !awayComp) continue;

                const hName = homeComp.team?.displayName || '';
                const aName = awayComp.team?.displayName || '';
                if (!hName || !aName) continue;

                // Deduplicate
                if (allMatches.some(m => m.id === ev.id || (m.homeTeam === hName && m.awayTeam === aName && m.dateISO === ev.date))) {
                    continue;
                }

                const state = ev.status?.type?.state; // 'pre', 'in', 'post'
                const completed = !!ev.status?.type?.completed;
                const isFinished = (state === 'post' || completed);
                const isLive = (state === 'in');
                const clock = ev.status?.displayClock;
                const detail = ev.status?.type?.detail || '';

                const hScore = parseInt(homeComp.score || '0', 10);
                const aScore = parseInt(awayComp.score || '0', 10);

                const mDate = new Date(ev.date || now.toISOString());
                const mDateStr = mDate.toISOString().slice(0, 10);

                let scheduleGroup = 'week';
                if (isFinished) {
                    scheduleGroup = 'finished';
                } else if (isLive) {
                    scheduleGroup = 'live';
                } else if (mDateStr === todayStr) {
                    scheduleGroup = 'today';
                } else if (mDateStr === tomorrowStr) {
                    scheduleGroup = 'tomorrow';
                }

                let formattedTime = detail;
                if (isFinished) {
                    formattedTime = 'Full Time';
                } else if (isLive) {
                    formattedTime = clock ? `${clock}'` : 'Live';
                } else {
                    const watHours = (mDate.getUTCHours() + 1) % 24;
                    const watMins = mDate.getUTCMinutes().toString().padStart(2, '0');
                    const timeStr = `${watHours < 10 ? '0' + watHours : watHours}:${watMins} WAT`;
                    if (scheduleGroup === 'today') formattedTime = `Today ${timeStr}`;
                    else if (scheduleGroup === 'tomorrow') formattedTime = `Tomorrow ${timeStr}`;
                    else {
                        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                        formattedTime = `${days[mDate.getUTCDay()]} ${timeStr}`;
                    }
                }

                // Extract live market odds from feed (pickcenter / comp.odds)
                let homeOdds = 1.95;
                let awayOdds = 1.95;
                let drawOdds = 3.40;
                let oddsProvider = 'SolPlay Sharp Engine';
                let spread = null;
                let overUnder = null;

                const pick = comp.odds?.[0] || ev.pickcenter?.[0];
                if (pick) {
                    if (pick.provider?.name) oddsProvider = pick.provider.name;
                    if (pick.spread) spread = pick.spread;
                    if (pick.overUnder) overUnder = pick.overUnder;

                    if (pick.homeTeamOdds?.moneyLine) {
                        const hDec = americanToDecimal(pick.homeTeamOdds.moneyLine);
                        if (hDec) homeOdds = hDec;
                    } else if (pick.moneyline?.home?.close?.odds) {
                        const hDec = americanToDecimal(pick.moneyline.home.close.odds);
                        if (hDec) homeOdds = hDec;
                    }

                    if (pick.awayTeamOdds?.moneyLine) {
                        const aDec = americanToDecimal(pick.awayTeamOdds.moneyLine);
                        if (aDec) awayOdds = aDec;
                    } else if (pick.moneyline?.away?.close?.odds) {
                        const aDec = americanToDecimal(pick.moneyline.away.close.odds);
                        if (aDec) awayOdds = aDec;
                    }

                    if (feed.sport === 'soccer' && pick.drawOdds) {
                        const dDec = americanToDecimal(pick.drawOdds);
                        if (dDec) drawOdds = dDec;
                    }
                }

                // If odds weren't in feed, calculate dynamically based on record/standings
                if (!pick && homeComp.records?.[0]?.summary && awayComp.records?.[0]?.summary) {
                    const hRec = homeComp.records[0].summary.split('-').map(Number);
                    const aRec = awayComp.records[0].summary.split('-').map(Number);
                    const hPct = hRec[0] / Math.max(1, (hRec[0] + hRec[1]));
                    const aPct = aRec[0] / Math.max(1, (aRec[0] + aRec[1]));
                    const diff = hPct - aPct;
                    homeOdds = parseFloat((2.0 - diff * 0.8).toFixed(2));
                    awayOdds = parseFloat((2.0 + diff * 0.8).toFixed(2));
                    if (feed.sport === 'soccer') drawOdds = 3.30;
                }

                allMatches.push({
                    id: parseInt(ev.id, 10) || (20000 + allMatches.length),
                    espnId: String(ev.id),
                    sport: feed.sport, // 'soccer', 'basketball', 'football'
                    sportCategory: feed.sport === 'basketball' ? 'Basketball' : (feed.sport === 'football' ? 'American Football' : 'Soccer'),
                    league: feed.name,
                    leagueKey: feed.leagueKey,
                    leagueCategory: feed.category,
                    scheduleGroup: scheduleGroup,
                    homeTeam: hName,
                    awayTeam: aName,
                    homeTeamId: homeComp.team?.id || '',
                    awayTeamId: awayComp.team?.id || '',
                    homeLogo: homeComp.team?.logo || `https://a.espncdn.com/i/teamlogos/${feed.sport}/500/${homeComp.team?.id || 0}.png`,
                    awayLogo: awayComp.team?.logo || `https://a.espncdn.com/i/teamlogos/${feed.sport}/500/${awayComp.team?.id || 0}.png`,
                    dateISO: ev.date,
                    time: formattedTime,
                    status: isFinished ? 'FINISHED' : (isLive ? 'LIVE' : 'SCHEDULED'),
                    score: (isLive || isFinished) ? { home: hScore, away: aScore } : null,
                    odds: {
                        home: homeOdds,
                        draw: feed.sport === 'soccer' ? drawOdds : null,
                        away: awayOdds,
                        spread: spread,
                        overUnder: overUnder,
                        provider: oddsProvider
                    },
                    isLocked: isFinished
                });
            }
        } catch (err) {
            console.error('Fetch error:', feed.name, err.message);
        }
    }

    console.log(`Successfully compiled ${allMatches.length} verified real matches across Soccer, NBA, and NFL!`);
    const breakdown = {};
    allMatches.forEach(m => {
        const key = `${m.sportCategory} - ${m.scheduleGroup}`;
        breakdown[key] = (breakdown[key] || 0) + 1;
    });
    console.log('Breakdown by Sport & Schedule:', breakdown);

    const outPath = path.join(__dirname, 'active_matches.json');
    fs.writeFileSync(outPath, JSON.stringify(allMatches, null, 2));
    console.log(`Saved compiled matches to ${outPath}`);
}

pullMultiSportFeed();
