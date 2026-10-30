const fs = require('fs');
const path = require('path');

const RELIABLE_SPORTS_FEEDS = [
    { leagueKey: 'eng.1', name: 'Premier League', category: 'Premier League' },
    { leagueKey: 'esp.1', name: 'La Liga', category: 'La Liga' },
    { leagueKey: 'ita.1', name: 'Serie A', category: 'Serie A' },
    { leagueKey: 'ger.1', name: 'Bundesliga', category: 'Bundesliga' },
    { leagueKey: 'fra.1', name: 'Ligue 1', category: 'Ligue 1' },
    { leagueKey: 'uefa.champions', name: 'UEFA Champions League', category: 'Champions League' },
    { leagueKey: 'uefa.europa', name: 'UEFA Europa League', category: 'Europa League' }
];

async function pullRealFeed() {
    console.log("Querying official ESPN global soccer feeds...");
    const allMatches = [];
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);

    // Queries: Current scoreboard + yesterday + last weekend's round
    const datesToQuery = [
        '', // current & upcoming
        '?dates=20261024',
        '?dates=20261025'
    ];

    for (const feed of RELIABLE_SPORTS_FEEDS) {
        for (const dq of datesToQuery) {
            try {
                const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${feed.leagueKey}/scoreboard${dq}`;
                const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
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

                    allMatches.push({
                        id: parseInt(ev.id, 10) || (20000 + allMatches.length),
                        espnId: ev.id,
                        league: feed.name,
                        leagueCategory: feed.category,
                        scheduleGroup: scheduleGroup,
                        homeTeam: hName,
                        awayTeam: aName,
                        homeLogo: homeComp.team?.logo || `https://a.espncdn.com/i/teamlogos/soccer/500/${homeComp.team?.id || 0}.png`,
                        awayLogo: awayComp.team?.logo || `https://a.espncdn.com/i/teamlogos/soccer/500/${awayComp.team?.id || 0}.png`,
                        dateISO: ev.date,
                        time: formattedTime,
                        status: isFinished ? 'FINISHED' : (isLive ? 'LIVE' : 'SCHEDULED'),
                        score: (isLive || isFinished) ? { home: hScore, away: aScore } : null,
                        isLocked: isFinished
                    });
                }
            } catch (err) {
                console.error('Fetch error:', feed.name, err.message);
            }
        }
    }

    console.log(`Successfully compiled ${allMatches.length} verified real matches from official sports feeds!`);
    const breakdown = {};
    allMatches.forEach(m => {
        breakdown[m.scheduleGroup] = (breakdown[m.scheduleGroup] || 0) + 1;
    });
    console.log('Breakdown by schedule group:', breakdown);

    const outPath = path.join(__dirname, 'active_matches.json');
    fs.writeFileSync(outPath, JSON.stringify(allMatches, null, 2));
    console.log(`Saved compiled matches to ${outPath}`);
}

pullRealFeed();
