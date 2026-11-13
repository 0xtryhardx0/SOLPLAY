const fs = require('fs');
const path = require('path');

const MULTI_SPORT_FEEDS = [
    // Top European Leagues & Cups
        // International Football Fixtures
    { sport: 'soccer', leagueKey: 'uefa.nations', name: 'UEFA Nations League', category: 'Nations League' },
    { sport: 'soccer', leagueKey: 'fifa.friendly', name: 'International Friendly', category: 'International Friendly' },
    { sport: 'soccer', leagueKey: 'fifa.worldq.conmebol', name: 'World Cup Qualifying - CONMEBOL', category: 'World Cup Qualifiers' },
    { sport: 'soccer', leagueKey: 'fifa.worldq.caf', name: 'World Cup Qualifying - CAF', category: 'World Cup Qualifiers' },
    { sport: 'soccer', leagueKey: 'fifa.worldq.uefa', name: 'World Cup Qualifying - UEFA', category: 'World Cup Qualifiers' },
    { sport: 'soccer', leagueKey: 'uefa.champions', name: 'UEFA Champions League', category: 'Champions League' },
    { sport: 'soccer', leagueKey: 'uefa.europa', name: 'UEFA Europa League', category: 'Europa League' },
    { sport: 'soccer', leagueKey: 'uefa.europa.conf', name: 'UEFA Conference League', category: 'Conference League' },
    { sport: 'soccer', leagueKey: 'eng.1', name: 'Premier League', category: 'Premier League' },
    { sport: 'soccer', leagueKey: 'esp.1', name: 'La Liga', category: 'La Liga' },
    { sport: 'soccer', leagueKey: 'ita.1', name: 'Serie A', category: 'Serie A' },
    { sport: 'soccer', leagueKey: 'ger.1', name: 'Bundesliga', category: 'Bundesliga' },
    { sport: 'soccer', leagueKey: 'fra.1', name: 'Ligue 1', category: 'Ligue 1' },
    { sport: 'soccer', leagueKey: 'eng.2', name: 'Championship', category: 'Championship' },
    { sport: 'soccer', leagueKey: 'ned.1', name: 'Eredivisie', category: 'Eredivisie' },
    { sport: 'soccer', leagueKey: 'por.1', name: 'Primeira Liga', category: 'Primeira Liga' },
    { sport: 'soccer', leagueKey: 'ksa.1', name: 'Saudi Pro League', category: 'Saudi Pro League' },
    { sport: 'soccer', leagueKey: 'usa.1', name: 'MLS', category: 'Major League Soccer' },
    { sport: 'soccer', leagueKey: 'bra.1', name: 'Brasileirão', category: 'Brasileirão Serie A' },
    { sport: 'soccer', leagueKey: 'tur.1', name: 'Süper Lig', category: 'Turkish Süper Lig' },
    { sport: 'soccer', leagueKey: 'mex.1', name: 'Liga MX', category: 'Liga MX' },
    // Basketball
    { sport: 'basketball', leagueKey: 'nba', name: 'NBA', category: 'NBA' },
    // American Football
    { sport: 'football', leagueKey: 'nfl', name: 'NFL', category: 'NFL' }
];

function americanToDecimal(american) {
    if (!american) return null;
    const val = typeof american === 'string' ? parseInt(american.replace('+', ''), 10) : american;
    if (isNaN(val) || val === 0) return null;
    if (val > 0) {
        return parseFloat((1 + val / 100).toFixed(2));
    } else {
        return parseFloat((1 + 100 / Math.abs(val)).toFixed(2));
    }
}

function formatYMD(d) {
    return d.toISOString().slice(0, 10).replace(/-/g, '');
}

async function fetchFeedEvents(feed, dateRangeParam, todayYMD, tomorrowYMD) {
    const urls = feed.sport === 'soccer'
        ? [
            `https://site.api.espn.com/apis/site/v2/sports/${feed.sport}/${feed.leagueKey}/scoreboard?dates=${dateRangeParam}`,
            `https://site.api.espn.com/apis/site/v2/sports/${feed.sport}/${feed.leagueKey}/scoreboard`
        ]
        : [
            `https://site.api.espn.com/apis/site/v2/sports/${feed.sport}/${feed.leagueKey}/scoreboard`,
            `https://site.api.espn.com/apis/site/v2/sports/${feed.sport}/${feed.leagueKey}/scoreboard?dates=${todayYMD}`,
            `https://site.api.espn.com/apis/site/v2/sports/${feed.sport}/${feed.leagueKey}/scoreboard?dates=${tomorrowYMD}`
        ];
    const collected = [];
    for (const url of urls) {
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
            if (!res.ok) continue;
            const data = await res.json();
            if (Array.isArray(data.events)) {
                collected.push(...data.events);
            }
        } catch (_) {
            // ignore timeout/network error on individual URL
        }
    }
    return { feed, events: collected };
}

async function pullMultiSportFeed() {
    console.log("Querying official ESPN global multi-sport feeds (Soccer, NBA, NFL)...");
    const allMatches = [];
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);

    const startWindow = new Date(now.getTime() - 2 * 86400000);
    const endWindow = new Date(now.getTime() + 6 * 86400000);
    const dateRangeParam = `${formatYMD(startWindow)}-${formatYMD(endWindow)}`;
    const todayYMD = formatYMD(now);
    const tomorrowYMD = formatYMD(new Date(now.getTime() + 86400000));

    const results = await Promise.allSettled(
        MULTI_SPORT_FEEDS.map(feed => fetchFeedEvents(feed, dateRangeParam, todayYMD, tomorrowYMD))
    );

    for (const r of results) {
        if (r.status !== 'fulfilled' || !r.value) continue;
        const { feed, events } = r.value;

        for (const ev of events) {
            const comp = ev.competitions?.[0];
            if (!comp) continue;
            const homeComp = comp.competitors?.find(c => c.homeAway === 'home');
            const awayComp = comp.competitors?.find(c => c.homeAway === 'away');
            if (!homeComp || !awayComp) continue;

            const hName = homeComp.team?.displayName || '';
            const aName = awayComp.team?.displayName || '';
            if (!hName || !aName) continue;

            const evIdNum = parseInt(ev.id, 10) || (20000 + allMatches.length);
            if (allMatches.some(m => m.espnId === String(ev.id) || (m.homeTeam === hName && m.awayTeam === aName && m.dateISO === ev.date))) {
                continue;
            }

            const state = ev.status?.type?.state; // 'pre', 'in', 'post'
            const completed = !!ev.status?.type?.completed;
            const mDate = new Date(ev.date || now.toISOString());
            const mDateStr = mDate.toISOString().slice(0, 10);
            const diffHours = (now.getTime() - mDate.getTime()) / (3600 * 1000);

            // Prevent any stale past match (> 3.5h ago) from ever appearing as LIVE
            const isFinished = (state === 'post' || completed || diffHours > 3.5);
            const isLive = (!isFinished && state === 'in' && diffHours <= 3.5);
            const clock = ev.status?.displayClock;
            const detail = ev.status?.type?.detail || '';

            const hScore = parseInt(homeComp.score || '0', 10);
            const aScore = parseInt(awayComp.score || '0', 10);

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
                formattedTime = clock ? (String(clock).includes("'") ? String(clock) : `${clock}'`) : (detail || 'Live');
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
                    const dDec = americanToDecimal(pick.drawOdds?.moneyLine || pick.drawOdds);
                    if (dDec) drawOdds = dDec;
                }
            }

            if (!pick && homeComp.records?.[0]?.summary && awayComp.records?.[0]?.summary) {
                const hRec = homeComp.records[0].summary.split('-').map(Number);
                const aRec = awayComp.records[0].summary.split('-').map(Number);
                const hPct = hRec[0] / Math.max(1, (hRec[0] + hRec[1]));
                const aPct = aRec[0] / Math.max(1, (aRec[0] + aRec[1]));
                const diff = hPct - aPct;
                homeOdds = parseFloat(Math.max(1.18, (2.0 - diff * 0.8)).toFixed(2));
                awayOdds = parseFloat(Math.max(1.18, (2.0 + diff * 0.8)).toFixed(2));
                if (feed.sport === 'soccer') drawOdds = 3.30;
            }

            allMatches.push({
                id: evIdNum,
                espnId: String(ev.id),
                sport: feed.sport,
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
    }

    // Sort: LIVE first, then TODAY, then TOMORROW, then WEEK, then FINISHED
    const order = { live: 0, today: 1, tomorrow: 2, week: 3, finished: 4 };
    allMatches.sort((a, b) => {
        const oa = order[a.scheduleGroup] ?? 3;
        const ob = order[b.scheduleGroup] ?? 3;
        if (oa !== ob) return oa - ob;
        return new Date(a.dateISO || 0).getTime() - new Date(b.dateISO || 0).getTime();
    });

    console.log(`Successfully compiled ${allMatches.length} verified real matches across Soccer, NBA, and NFL!`);
    const breakdown = {};
    allMatches.forEach(m => {
        const key = `${m.sportCategory} - ${m.scheduleGroup}`;
        breakdown[key] = (breakdown[key] || 0) + 1;
    });
    console.log('Breakdown by Sport & Schedule:', breakdown);

    if (allMatches.length > 0) {
        const outPath = path.join(__dirname, 'active_matches.json');
        fs.writeFileSync(outPath, JSON.stringify(allMatches, null, 2));
        console.log(`Saved compiled matches to ${outPath}`);
    } else {
        console.warn('Warning: 0 matches fetched (network offline?), preserving existing active_matches.json');
    }
    return allMatches;
}

if (require.main === module) {
    pullMultiSportFeed();
}

module.exports = { pullMultiSportFeed };
