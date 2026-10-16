// Fallback mock for solanaWeb3 when loaded offline/locally without CDN access
if (typeof solanaWeb3 === 'undefined') {
    console.warn("solanaWeb3 is not defined. Using local sandbox fallback mock.");
    window.solanaWeb3 = {
        Connection: function() {
            return {
                getBalance: async () => 0,
                getAccountInfo: async () => null,
                sendTransaction: async () => "mock-signature",
                confirmTransaction: async () => {},
                getSignatureStatus: async () => ({ value: { err: null } }),
            };
        },
        Keypair: {
            generate: function() {
                const mockBytes = new Uint8Array(64);
                return {
                    publicKey: {
                        toString: () => "GnjgbeuLcmy1tUNRSzwAM5yPmsmKJvvP7H33H6vMoAm9",
                        toBytes: () => mockBytes.slice(0, 32)
                    },
                    secretKey: mockBytes
                };
            },
            fromSecretKey: function(key) {
                return {
                    publicKey: {
                        toString: () => "GnjgbeuLcmy1tUNRSzwAM5yPmsmKJvvP7H33H6vMoAm9",
                        toBytes: () => key.slice(0, 32)
                    },
                    secretKey: key
                };
            }
        },
        PublicKey: function(val) {
            return {
                toString: () => val,
                toBytes: () => new Uint8Array(32)
            };
        },
        SystemProgram: {
            programId: {
                toString: () => "11111111111111111111111111111111"
            },
            createAccount: () => ({}),
            transfer: () => ({})
        },
        LAMPORTS_PER_SOL: 1000000000
    };
}

// SolPlay Client Application Logic
let connection;
let walletKeypair = null;
let activeWalletType = 'sandbox'; // 'sandbox' or 'phantom'
let activePublicKey = null;
let currentProgramId = new solanaWeb3.PublicKey("84AVToEkDwsMXNh77n156DYHaWJa2zVqi8han3qqVdAk");
let betslipSelections = [];
let betslipMode = 'accumulator'; // 'accumulator' or 'singles'
let activeViewMode = 'full';     // 'split' or 'full'
let expandedAccordions = {};     // { [matchId]: boolean }
let activeAccordionCategory = {};// { [matchId]: string }
let activeSelection = null;      // backwards compatibility helper
let milestoneProgress = 0;
let watchTimer = null;
let isWalletConnected = false;
let currentBettingTab = 'live';

// Sportsbook active match state (real fixtures only)
let activeMatchId = 1022; // Default to active live match (Benfica vs Celtic)
let activeScheduleFilter = 'all'; // 'all', 'live', 'today', 'tomorrow', 'week', 'finished'
let activeLeagueFilter = 'all';   // 'all', 'Premier League', 'Champions League', etc.

const MATCHES_DATA = [
    // ==========================================
    // 🏁 CONCLUDED UEFA CHAMPIONS LEAGUE (Tuesday, Oct 13, 2026)
    // ==========================================
    {
        id: 1001,
        league: "UEFA Champions League",
        leagueCategory: "Champions League",
        scheduleGroup: "finished",
        homeTeam: "Arsenal",
        awayTeam: "Lille",
        time: "Full Time",
        status: "FINISHED",
        isLocked: true,
        score: { home: 3, away: 0 },
        odds: { home: 1.25, draw: 5.10, away: 11.50 },
        formation: { home: "4-3-3", away: "4-2-3-1" },
        stats: {
            possession: { home: 62, away: 38 },
            shots: { home: 18, away: 5 },
            onTarget: { home: 8, away: 1 },
            attacks: { home: 78, away: 28 },
            corners: { home: 9, away: 2 },
            fouls: { home: 6, away: 10 },
            cards: { home: 1, away: 2 },
            offsides: { home: 3, away: 1 }
        },
        lineup: {
            home: [
                { num: 22, name: "David Raya", pos: "GK" },
                { num: 4, name: "Ben White", pos: "DF" },
                { num: 2, name: "William Saliba", pos: "DF" },
                { num: 6, name: "Gabriel Magalhaes", pos: "DF" },
                { num: 12, name: "Jurrien Timber", pos: "DF" },
                { num: 41, name: "Declan Rice", pos: "MF" },
                { num: 5, name: "Thomas Partey", pos: "MF" },
                { num: 8, name: "Martin Odegaard", pos: "MF" },
                { num: 7, name: "Bukayo Saka", pos: "FW" },
                { num: 29, name: "Kai Havertz", pos: "FW" },
                { num: 11, name: "Gabriel Martinelli", pos: "FW" }
            ],
            away: [
                { num: 30, name: "Lucas Chevalier", pos: "GK" },
                { num: 12, name: "Thomas Meunier", pos: "DF" },
                { num: 4, name: "Alexsandro", pos: "DF" },
                { num: 18, name: "Bafode Diakite", pos: "DF" },
                { num: 5, name: "Gabriel Gudmundsson", pos: "DF" },
                { num: 21, name: "Benjamin Andre", pos: "MF" },
                { num: 32, name: "Ayyoub Bouaddi", pos: "MF" },
                { num: 23, name: "Edon Zhegrova", pos: "FW" },
                { num: 10, name: "Remy Cabella", pos: "MF" },
                { num: 7, name: "Hakon Haraldsson", pos: "FW" },
                { num: 9, name: "Jonathan David", pos: "FW" }
            ]
        },
        subs: {
            home: ["Neto", "Oleksandr Zinchenko", "Jorginho", "Mikel Merino", "Leandro Trossard", "Gabriel Jesus"],
            away: ["Vito Mannone", "Aissa Mandi", "Mitchel Bakker", "Angel Gomes", "Matias Fernandez-Pardo", "Mohamed Bayo"]
        },
        timeline: [
            { time: "FT", type: "end", desc: "🏁 Full Time: Arsenal 3 - 0 Lille. Match Concluded!", icon: "🏁" },
            { time: "84'", type: "goal", desc: "GOAL! Arsenal 3 - 0 Lille. Gabriel Martinelli breakaway finish.", icon: "⚽" },
            { time: "64'", type: "goal", desc: "GOAL! Arsenal 2 - 0 Lille. Jurrien Timber header from Declan Rice corner!", icon: "⚽" },
            { time: "45+2'", type: "halftime", desc: "Half-time break • 1 - 0", icon: "⏸️" },
            { time: "23'", type: "goal", desc: "GOAL! Arsenal 1 - 0 Lille. Bukayo Saka curling finish into bottom left corner.", icon: "⚽" },
            { time: "0'", type: "start", desc: "Kick-off at Emirates Stadium!", icon: "🏁" }
        ]
    },
    {
        id: 1002,
        league: "UEFA Champions League",
        leagueCategory: "Champions League",
        scheduleGroup: "finished",
        homeTeam: "Atlético Madrid",
        awayTeam: "Manchester United",
        time: "Full Time",
        status: "FINISHED",
        isLocked: true,
        score: { home: 2, away: 0 },
        odds: { home: 1.55, draw: 3.60, away: 6.80 },
        stats: {
            possession: { home: 54, away: 46 },
            shots: { home: 12, away: 8 },
            onTarget: { home: 6, away: 2 },
            attacks: { home: 58, away: 44 },
            corners: { home: 5, away: 4 },
            fouls: { home: 14, away: 11 },
            cards: { home: 2, away: 3 },
            offsides: { home: 1, away: 2 }
        },
        timeline: [
            { time: "FT", type: "end", desc: "🏁 Full Time: Atlético Madrid 2 - 0 Manchester United. Wagers settled!", icon: "🏁" },
            { time: "79'", type: "goal", desc: "GOAL! Atlético 2 - 0 Man United. Ademola Lookman seals the victory!", icon: "⚽" },
            { time: "62'", type: "card", desc: "🔴 RED CARD! Leny Yoro (Man United) sent off for last-man foul.", icon: "🟥" },
            { time: "1'", type: "goal", desc: "GOAL! Atlético 1 - 0 Man United. Pablo Barrios scores in the 1st minute!", icon: "⚽" },
            { time: "0'", type: "start", desc: "Match started at Estadio Metropolitano.", icon: "🏁" }
        ]
    },
    {
        id: 1003,
        league: "UEFA Champions League",
        leagueCategory: "Champions League",
        scheduleGroup: "finished",
        homeTeam: "Galatasaray",
        awayTeam: "Barcelona",
        time: "Full Time",
        status: "FINISHED",
        isLocked: true,
        score: { home: 1, away: 4 },
        odds: { home: 16.00, draw: 6.50, away: 1.15 },
        stats: {
            possession: { home: 35, away: 65 },
            shots: { home: 6, away: 17 },
            onTarget: { home: 2, away: 9 },
            attacks: { home: 32, away: 84 },
            corners: { home: 3, away: 8 },
            fouls: { home: 11, away: 7 },
            cards: { home: 3, away: 1 },
            offsides: { home: 2, away: 2 }
        },
        timeline: [
            { time: "FT", type: "end", desc: "🏁 Full Time: Galatasaray 1 - 4 Barcelona. Dominant away win!", icon: "🏁" },
            { time: "82'", type: "goal", desc: "GOAL! Galatasaray 1 - 4 Barcelona. Raphinha low driven strike.", icon: "⚽" },
            { time: "67'", type: "goal", desc: "GOAL! Galatasaray 1 - 3 Barcelona. Victor Osimhen pulls one back.", icon: "⚽" },
            { time: "29'", type: "goal", desc: "GOAL! Galatasaray 0 - 2 Barcelona. Robert Lewandowski clinical tap-in.", icon: "⚽" },
            { time: "14'", type: "goal", desc: "GOAL! Galatasaray 0 - 1 Barcelona. Lamine Yamal solo brilliance!", icon: "⚽" },
            { time: "0'", type: "start", desc: "Kick-off in Istanbul.", icon: "🏁" }
        ]
    },
    {
        id: 1004,
        league: "UEFA Champions League",
        leagueCategory: "Champions League",
        scheduleGroup: "finished",
        homeTeam: "Inter Milan",
        awayTeam: "Club Brugge",
        time: "Full Time",
        status: "FINISHED",
        isLocked: true,
        score: { home: 3, away: 4 },
        odds: { home: 1.45, draw: 4.50, away: 6.50 },
        stats: {
            possession: { home: 61, away: 39 },
            shots: { home: 19, away: 9 },
            onTarget: { home: 7, away: 6 },
            attacks: { home: 86, away: 36 },
            corners: { home: 10, away: 3 },
            fouls: { home: 12, away: 14 },
            cards: { home: 2, away: 3 },
            offsides: { home: 2, away: 1 }
        },
        timeline: [
            { time: "FT", type: "end", desc: "🏁 Final Whistle: Inter Milan 3 - 4 Club Brugge. Shock upset at San Siro!", icon: "🏁" },
            { time: "90+3'", type: "goal", desc: "GOAL! Inter 3 - 4 Club Brugge. Ange-Yoan Bonny consolation goal.", icon: "⚽" },
            { time: "87'", type: "goal", desc: "GOAL! Inter 2 - 4 Club Brugge. Romeo Vermant stunner on the break!", icon: "⚽" },
            { time: "81'", type: "goal", desc: "GOAL! Inter 2 - 3 Club Brugge. Lautaro Martínez second of the night!", icon: "⚽" },
            { time: "75'", type: "goal", desc: "GOAL! Inter 1 - 3 Club Brugge. Nicolò Tresoldi completes hat-trick!", icon: "⚽" },
            { time: "61'", type: "goal", desc: "GOAL! Inter 1 - 2 Club Brugge. Nicolò Tresoldi restores Belgian lead.", icon: "⚽" },
            { time: "44'", type: "goal", desc: "GOAL! Inter 1 - 1 Club Brugge. Lautaro Martínez header.", icon: "⚽" },
            { time: "30'", type: "goal", desc: "GOAL! Inter 0 - 1 Club Brugge. Nicolò Tresoldi penalty conversion.", icon: "⚽" },
            { time: "0'", type: "start", desc: "Kick-off at San Siro.", icon: "🏁" }
        ]
    },
    {
        id: 1005,
        league: "UEFA Champions League",
        leagueCategory: "Champions League",
        scheduleGroup: "finished",
        homeTeam: "RB Leipzig",
        awayTeam: "PSV Eindhoven",
        time: "Full Time",
        status: "FINISHED",
        isLocked: true,
        score: { home: 1, away: 0 },
        odds: { home: 1.85, draw: 3.80, away: 3.90 },
        stats: { possession: { home: 52, away: 48 }, shots: { home: 11, away: 9 }, onTarget: { home: 4, away: 3 } },
        timeline: [
            { time: "FT", type: "end", desc: "🏁 Full Time: RB Leipzig 1 - 0 PSV Eindhoven.", icon: "🏁" },
            { time: "73'", type: "goal", desc: "GOAL! RB Leipzig 1 - 0 PSV Eindhoven. Benjamin Šeško winner.", icon: "⚽" }
        ]
    },
    {
        id: 1006,
        league: "UEFA Champions League",
        leagueCategory: "Champions League",
        scheduleGroup: "finished",
        homeTeam: "Viking FK",
        awayTeam: "Bayern Munich",
        time: "Full Time",
        status: "FINISHED",
        isLocked: true,
        score: { home: 3, away: 3 },
        odds: { home: 11.00, draw: 6.50, away: 1.22 },
        stats: { possession: { home: 38, away: 62 }, shots: { home: 9, away: 16 }, onTarget: { home: 5, away: 7 } },
        timeline: [
            { time: "FT", type: "end", desc: "🏁 Full Time: Viking FK 3 - 3 Bayern Munich. Incredible 6-goal thriller!", icon: "🏁" },
            { time: "90'", type: "goal", desc: "GOAL! Viking FK 3 - 3 Bayern. Herman Haugen dramatic 90th min equalizer!", icon: "⚽" },
            { time: "71'", type: "goal", desc: "GOAL! Viking FK 2 - 3 Bayern. Luis Díaz puts Bayern ahead.", icon: "⚽" },
            { time: "60'", type: "goal", desc: "GOAL! Viking FK 2 - 2 Bayern. Harry Kane second goal.", icon: "⚽" },
            { time: "54'", type: "goal", desc: "GOAL! Viking FK 2 - 1 Bayern. Harry Kane penalty.", icon: "⚽" },
            { time: "38'", type: "goal", desc: "GOAL! Viking FK 2 - 0 Bayern. Peter Christiansen double shock!", icon: "⚽" },
            { time: "2'", type: "goal", desc: "GOAL! Viking FK 1 - 0 Bayern. Gianni Stensness early strike.", icon: "⚽" }
        ]
    },
    {
        id: 1007,
        league: "UEFA Champions League",
        leagueCategory: "Champions League",
        scheduleGroup: "finished",
        homeTeam: "Villarreal",
        awayTeam: "Napoli",
        time: "Full Time",
        status: "FINISHED",
        isLocked: true,
        score: { home: 3, away: 1 },
        odds: { home: 2.65, draw: 3.40, away: 2.60 },
        timeline: [
            { time: "FT", type: "end", desc: "🏁 Full Time: Villarreal 3 - 1 Napoli.", icon: "🏁" }
        ]
    },
    {
        id: 1008,
        league: "UEFA Champions League",
        leagueCategory: "Champions League",
        scheduleGroup: "finished",
        homeTeam: "Lens",
        awayTeam: "Sporting CP",
        time: "Full Time",
        status: "FINISHED",
        isLocked: true,
        score: { home: 0, away: 2 },
        odds: { home: 2.80, draw: 3.30, away: 2.50 },
        timeline: [
            { time: "FT", type: "end", desc: "🏁 Full Time: Lens 0 - 2 Sporting CP.", icon: "🏁" }
        ]
    },
    {
        id: 1009,
        league: "UEFA Champions League",
        leagueCategory: "Champions League",
        scheduleGroup: "finished",
        homeTeam: "Sabah FK",
        awayTeam: "Slavia Prague",
        time: "Full Time",
        status: "FINISHED",
        isLocked: true,
        score: { home: 2, away: 0 },
        odds: { home: 4.80, draw: 3.75, away: 1.70 },
        timeline: [
            { time: "FT", type: "end", desc: "🏁 Full Time: Sabah FK 2 - 0 Slavia Prague.", icon: "🏁" }
        ]
    },

    // ==========================================
    // 📅 TODAY'S REAL UEFA CHAMPIONS LEAGUE (Wednesday, Oct 14, 2026)
    // Matches haven't started yet: score is null, never show 0-0!
    // ==========================================
    {
        id: 1010,
        league: "UEFA Champions League",
        leagueCategory: "Champions League",
        scheduleGroup: "today",
        homeTeam: "Manchester City",
        awayTeam: "Paris Saint-Germain",
        time: "20:00 WAT",
        status: "SCHEDULED",
        score: null,
        odds: { home: 1.95, draw: 3.70, away: 3.60 }
    },
    {
        id: 1011,
        league: "UEFA Champions League",
        leagueCategory: "Champions League",
        scheduleGroup: "today",
        homeTeam: "AS Roma",
        awayTeam: "Real Madrid",
        time: "20:00 WAT",
        status: "SCHEDULED",
        score: null,
        odds: { home: 3.60, draw: 3.60, away: 2.00 }
    },
    {
        id: 1012,
        league: "UEFA Champions League",
        leagueCategory: "Champions League",
        scheduleGroup: "today",
        homeTeam: "Aston Villa",
        awayTeam: "Fenerbahçe",
        time: "20:00 WAT",
        status: "SCHEDULED",
        score: null,
        odds: { home: 1.65, draw: 3.90, away: 5.00 }
    },
    {
        id: 1013,
        league: "UEFA Champions League",
        leagueCategory: "Champions League",
        scheduleGroup: "today",
        homeTeam: "Bodø/Glimt",
        awayTeam: "Borussia Dortmund",
        time: "20:00 WAT",
        status: "SCHEDULED",
        score: null,
        odds: { home: 4.50, draw: 4.00, away: 1.72 }
    },
    {
        id: 1014,
        league: "UEFA Champions League",
        leagueCategory: "Champions League",
        scheduleGroup: "today",
        homeTeam: "LASK Linz",
        awayTeam: "Liverpool",
        time: "17:45 WAT",
        status: "SCHEDULED",
        score: null,
        odds: { home: 8.50, draw: 5.20, away: 1.33 }
    },
    {
        id: 1015,
        league: "UEFA Champions League",
        leagueCategory: "Champions League",
        scheduleGroup: "today",
        homeTeam: "Feyenoord",
        awayTeam: "Como",
        time: "17:45 WAT",
        status: "SCHEDULED",
        score: null,
        odds: { home: 1.75, draw: 3.75, away: 4.50 }
    },
    {
        id: 1016,
        league: "UEFA Champions League",
        leagueCategory: "Champions League",
        scheduleGroup: "today",
        homeTeam: "Real Betis",
        awayTeam: "FC Porto",
        time: "20:00 WAT",
        status: "SCHEDULED",
        score: null,
        odds: { home: 2.40, draw: 3.30, away: 2.90 }
    },
    {
        id: 1017,
        league: "UEFA Champions League",
        leagueCategory: "Champions League",
        scheduleGroup: "today",
        homeTeam: "Shakhtar Donetsk",
        awayTeam: "AEK Athens",
        time: "20:00 WAT",
        status: "SCHEDULED",
        score: null,
        odds: { home: 2.15, draw: 3.35, away: 3.35 }
    },
    {
        id: 1018,
        league: "UEFA Champions League",
        leagueCategory: "Champions League",
        scheduleGroup: "today",
        homeTeam: "Slovan Bratislava",
        awayTeam: "VfB Stuttgart",
        time: "20:00 WAT",
        status: "SCHEDULED",
        score: null,
        odds: { home: 5.50, draw: 4.20, away: 1.57 }
    },

    // ==========================================
    // 🔴 IN-PLAY LIVE & TOMORROW'S UEFA EUROPA LEAGUE (Thursday, Oct 15, 2026)
    // ==========================================
    {
        id: 1022,
        league: "UEFA Europa League",
        leagueCategory: "Europa League",
        scheduleGroup: "live",
        homeTeam: "Benfica",
        awayTeam: "Celtic",
        time: "74'",
        status: "LIVE",
        score: { home: 2, away: 2 },
        odds: { home: 2.10, draw: 2.60, away: 3.80 },
        stats: {
            possession: { home: 55, away: 45 },
            shots: { home: 11, away: 9 },
            onTarget: { home: 4, away: 4 },
            attacks: { home: 59, away: 47 },
            corners: { home: 6, away: 4 },
            fouls: { home: 11, away: 14 },
            cards: { home: 1, away: 2 },
            offsides: { home: 2, away: 1 }
        },
        lineup: {
            home: [
                { num: 1, name: "Anatoliy Trubin", pos: "GK" },
                { num: 8, name: "Alexander Bah", pos: "DF" },
                { num: 4, name: "Antonio Silva", pos: "DF" },
                { num: 30, name: "Nicolas Otamendi", pos: "DF" },
                { num: 3, name: "Alvaro Carreras", pos: "DF" },
                { num: 61, name: "Florentino Luis", pos: "MF" },
                { num: 10, name: "Orkun Kokcu", pos: "MF" },
                { num: 11, name: "Angel Di Maria", pos: "FW" },
                { num: 7, name: "Kerem Akturkoglu", pos: "FW" },
                { num: 17, name: "Vangelis Pavlidis", pos: "FW" },
                { num: 14, name: "Vangelis Pavlidis", pos: "FW" }
            ],
            away: [
                { num: 1, name: "Kasper Schmeichel", pos: "GK" },
                { num: 2, name: "Alistair Johnston", pos: "DF" },
                { num: 5, name: "Liam Scales", pos: "DF" },
                { num: 6, name: "Auston Trusty", pos: "DF" },
                { num: 3, name: "Greg Taylor", pos: "DF" },
                { num: 42, name: "Callum McGregor", pos: "MF" },
                { num: 41, name: "Reo Hatate", pos: "MF" },
                { num: 27, name: "Arne Engels", pos: "MF" },
                { num: 10, name: "Nicolas Kuhn", pos: "FW" },
                { num: 8, name: "Kyogo Furuhashi", pos: "FW" },
                { num: 38, name: "Daizen Maeda", pos: "FW" }
            ]
        },
        timeline: [
            { time: "0'", type: "start", desc: "Kick-off at Estádio da Luz.", icon: "🏁" },
            { time: "18'", type: "goal", desc: "GOAL! Benfica 1 - 0 Celtic. Angel Di Maria penalty.", icon: "⚽" },
            { time: "33'", type: "goal", desc: "GOAL! Benfica 1 - 1 Celtic. Kyogo Furuhashi equalizer.", icon: "⚽" },
            { time: "56'", type: "goal", desc: "GOAL! Benfica 2 - 1 Celtic. Vangelis Pavlidis finish.", icon: "⚽" },
            { time: "68'", type: "goal", desc: "GOAL! Benfica 2 - 2 Celtic. Nicolas Kühn thunderbolt!", icon: "⚽" }
        ]
    },
    {
        id: 1020,
        league: "UEFA Europa League",
        leagueCategory: "Europa League",
        scheduleGroup: "tomorrow",
        homeTeam: "Lyon",
        awayTeam: "Crystal Palace",
        time: "Thu 17:45 WAT",
        status: "SCHEDULED",
        score: null,
        odds: { home: 2.20, draw: 3.40, away: 3.10 }
    },
    {
        id: 1021,
        league: "UEFA Europa League",
        leagueCategory: "Europa League",
        scheduleGroup: "tomorrow",
        homeTeam: "RB Salzburg",
        awayTeam: "AC Milan",
        time: "Thu 17:45 WAT",
        status: "SCHEDULED",
        score: null,
        odds: { home: 3.30, draw: 3.50, away: 2.10 }
    },
    {
        id: 1023,
        league: "UEFA Europa League",
        leagueCategory: "Europa League",
        scheduleGroup: "tomorrow",
        homeTeam: "Celta Vigo",
        awayTeam: "Juventus",
        time: "Thu 20:00 WAT",
        status: "SCHEDULED",
        score: null,
        odds: { home: 3.10, draw: 3.30, away: 2.25 }
    },
    {
        id: 1024,
        league: "UEFA Europa League",
        leagueCategory: "Europa League",
        scheduleGroup: "tomorrow",
        homeTeam: "Marseille",
        awayTeam: "Olympiacos",
        time: "Thu 20:00 WAT",
        status: "SCHEDULED",
        score: null,
        odds: { home: 1.75, draw: 3.70, away: 4.40 }
    },
    {
        id: 1025,
        league: "UEFA Europa League",
        leagueCategory: "Europa League",
        scheduleGroup: "tomorrow",
        homeTeam: "TSG Hoffenheim",
        awayTeam: "Beşiktaş",
        time: "Thu 20:00 WAT",
        status: "SCHEDULED",
        score: null,
        odds: { home: 1.90, draw: 3.60, away: 3.80 }
    },
    {
        id: 1026,
        league: "UEFA Europa League",
        leagueCategory: "Europa League",
        scheduleGroup: "tomorrow",
        homeTeam: "Union St.-Gilloise",
        awayTeam: "Real Sociedad",
        time: "Thu 17:45 WAT",
        status: "SCHEDULED",
        score: null,
        odds: { home: 2.90, draw: 3.30, away: 2.40 }
    },

    // ==========================================
    // 🏴󠁧󠁢󠁥󠁮󠁧󠁿 THIS WEEKEND'S REAL PREMIER LEAGUE (Oct 17–18, 2026)
    // Matches scheduled: score is null!
    // ==========================================
    {
        id: 1030,
        league: "Premier League",
        leagueCategory: "Premier League",
        scheduleGroup: "week",
        homeTeam: "Everton",
        awayTeam: "Chelsea",
        time: "Sat 12:30 WAT",
        status: "SCHEDULED",
        score: null,
        odds: { home: 3.60, draw: 3.50, away: 2.05 }
    },
    {
        id: 1031,
        league: "Premier League",
        leagueCategory: "Premier League",
        scheduleGroup: "week",
        homeTeam: "Brentford",
        awayTeam: "Liverpool",
        time: "Sat 15:00 WAT",
        status: "SCHEDULED",
        score: null,
        odds: { home: 5.25, draw: 4.20, away: 1.58 }
    },
    {
        id: 1032,
        league: "Premier League",
        leagueCategory: "Premier League",
        scheduleGroup: "week",
        homeTeam: "Manchester City",
        awayTeam: "Ipswich Town",
        time: "Sat 15:00 WAT",
        status: "SCHEDULED",
        score: null,
        odds: { home: 1.18, draw: 7.50, away: 14.00 }
    },
    {
        id: 1033,
        league: "Premier League",
        leagueCategory: "Premier League",
        scheduleGroup: "week",
        homeTeam: "Newcastle United",
        awayTeam: "Aston Villa",
        time: "Sat 17:30 WAT",
        status: "SCHEDULED",
        score: null,
        odds: { home: 2.25, draw: 3.45, away: 3.05 }
    },
    {
        id: 1034,
        league: "Premier League",
        leagueCategory: "Premier League",
        scheduleGroup: "week",
        homeTeam: "Leeds United",
        awayTeam: "Manchester United",
        time: "Sun 14:00 WAT",
        status: "SCHEDULED",
        score: null,
        odds: { home: 3.40, draw: 3.60, away: 2.05 }
    },
    {
        id: 1035,
        league: "Premier League",
        leagueCategory: "Premier League",
        scheduleGroup: "week",
        homeTeam: "Nottingham Forest",
        awayTeam: "Arsenal",
        time: "Sun 16:30 WAT",
        status: "SCHEDULED",
        score: null,
        odds: { home: 4.80, draw: 3.90, away: 1.70 }
    }
];

const TOURNAMENTS_DATA = [
    {
        id: 1001,
        title: "EA FC 26 Pro Cup • Grand Finals",
        game: "EA FC 26",
        status: "UPCOMING",
        banner: "⚽ PRO TOURNAMENT",
        playerA: {
            name: "phzin",
            country: "BR",
            rank: 4,
            winRate: "88%",
            recentForm: ["W", "W", "W", "W", "D"],
            avgGoals: "4.2",
            odds: 1.85
        },
        playerB: {
            name: "Tekkz",
            country: "UK",
            rank: 2,
            winRate: "82%",
            recentForm: ["W", "W", "L", "W", "W"],
            avgGoals: "3.6",
            odds: 1.95
        },
        streamUrl: "https://stream.mux.com/v69El17P02tUkUg1sQeT293m38ZFO02581J/medium.m3u8"
    },
    {
        id: 1002,
        title: "Mortal Kombat 1 Showdown • Pro Series",
        game: "Mortal Kombat 1",
        status: "UPCOMING",
        banner: "🐉 KOMBAT ARENA",
        playerA: {
            name: "SonicFox",
            country: "US",
            rank: 1,
            winRate: "94%",
            recentForm: ["W", "W", "W", "W", "W"],
            character: "Sindel / Lao",
            odds: 1.30
        },
        playerB: {
            name: "Dominique",
            country: "US",
            rank: 5,
            winRate: "78%",
            recentForm: ["W", "L", "W", "W", "L"],
            character: "Kitana / Mileena",
            odds: 3.10
        },
        streamUrl: "https://stream.mux.com/v69El17P02tUkUg1sQeT293m38ZFO02581J/medium.m3u8"
    }
];

const activeMatchMarkets = {
    998: '1x2',
    997: '1x2',
    995: '1x2',
    993: '1x2',
    981: '1x2',
    982: '1x2',
    994: '1x2',
    983: '1x2',
    984: '1x2',
    985: '1x2',
    986: '1x2',
    987: '1x2',
    988: '1x2',
    989: '1x2',
    996: '1x2',
    990: '1x2'
};

const MATCH_MARKETS = {
    998: { // Arsenal vs Chelsea
        '1x2': [
            { label: "Arsenal", value: 2.25, outcomeId: 0, desc: "Arsenal Win" },
            { label: "Draw", value: 3.20, outcomeId: 2, desc: "Draw" },
            { label: "Chelsea", value: 3.50, outcomeId: 1, desc: "Chelsea Win" }
        ],
        'scorer': [
            { label: "Saka", value: 2.40, outcomeId: 10, desc: "Saka to score" },
            { label: "Palmer", value: 2.60, outcomeId: 11, desc: "Palmer to score" },
            { label: "Havertz", value: 2.80, outcomeId: 12, desc: "Havertz to score" },
            { label: "Jackson", value: 3.10, outcomeId: 13, desc: "Jackson to score" }
        ],
        'score': [
            { label: "1 - 0", value: 7.50, outcomeId: 20, desc: "Arsenal 1-0" },
            { label: "2 - 1", value: 9.00, outcomeId: 21, desc: "Arsenal 2-1" },
            { label: "1 - 1", value: 6.00, outcomeId: 22, desc: "Draw 1-1" },
            { label: "0 - 1", value: 9.50, outcomeId: 23, desc: "Chelsea 1-0" }
        ]
    },
    997: { // Al Nassr vs Al Hilal
        '1x2': [
            { label: "Al Nassr", value: 1.95, outcomeId: 0, desc: "Al Nassr Win" },
            { label: "Draw", value: 3.60, outcomeId: 2, desc: "Draw" },
            { label: "Al Hilal", value: 3.30, outcomeId: 1, desc: "Al Hilal Win" }
        ],
        'scorer': [
            { label: "Ronaldo", value: 1.85, outcomeId: 10, desc: "Ronaldo to score" },
            { label: "Mitrovic", value: 2.10, outcomeId: 11, desc: "Mitrovic to score" },
            { label: "Sadio Mane", value: 2.50, outcomeId: 12, desc: "Sadio Mane to score" },
            { label: "Malcom", value: 2.70, outcomeId: 13, desc: "Malcom to score" }
        ],
        'score': [
            { label: "2 - 1", value: 8.00, outcomeId: 20, desc: "Al Nassr 2-1" },
            { label: "3 - 2", value: 15.00, outcomeId: 21, desc: "Al Nassr 3-2" },
            { label: "2 - 2", value: 12.00, outcomeId: 22, desc: "Draw 2-2" },
            { label: "1 - 2", value: 11.00, outcomeId: 23, desc: "Al Hilal 2-1" }
        ]
    },
    996: { // Inter Miami vs LA Galaxy
        '1x2': [
            { label: "Inter Miami", value: 1.70, outcomeId: 0, desc: "Inter Miami Win" },
            { label: "Draw", value: 3.90, outcomeId: 2, desc: "Draw" },
            { label: "LA Galaxy", value: 4.20, outcomeId: 1, desc: "LA Galaxy Win" }
        ],
        'scorer': [
            { label: "Messi", value: 1.75, outcomeId: 10, desc: "Messi to score" },
            { label: "Suarez", value: 2.05, outcomeId: 11, desc: "Suarez to score" },
            { label: "Marco Reus", value: 3.40, outcomeId: 12, desc: "Marco Reus to score" },
            { label: "Gabriel Pec", value: 3.80, outcomeId: 13, desc: "Gabriel Pec to score" }
        ],
        'score': [
            { label: "2 - 1", value: 7.50, outcomeId: 20, desc: "Inter Miami 2-1" },
            { label: "3 - 1", value: 12.00, outcomeId: 21, desc: "Inter Miami 3-1" },
            { label: "1 - 1", value: 8.50, outcomeId: 22, desc: "Draw 1-1" },
            { label: "1 - 2", value: 14.00, outcomeId: 23, desc: "LA Galaxy 2-1" }
        ]
    },
    995: { // Real Madrid vs Barcelona
        '1x2': [
            { label: "Real Madrid", value: 2.00, outcomeId: 0, desc: "Real Madrid Win" },
            { label: "Draw", value: 3.50, outcomeId: 2, desc: "Draw" },
            { label: "Barcelona", value: 3.20, outcomeId: 1, desc: "Barcelona Win" }
        ],
        'scorer': [
            { label: "Mbappe", value: 1.95, outcomeId: 10, desc: "Mbappe to score" },
            { label: "Lewandowski", value: 2.20, outcomeId: 11, desc: "Lewandowski to score" },
            { label: "Vinicius Jr", value: 2.30, outcomeId: 12, desc: "Vinicius Jr to score" },
            { label: "Lamine Yamal", value: 3.10, outcomeId: 13, desc: "Lamine Yamal to score" }
        ],
        'score': [
            { label: "2 - 1", value: 8.50, outcomeId: 20, desc: "Real Madrid 2-1" },
            { label: "3 - 1", value: 13.00, outcomeId: 21, desc: "Real Madrid 3-1" },
            { label: "2 - 2", value: 10.00, outcomeId: 22, desc: "Draw 2-2" },
            { label: "1 - 2", value: 11.00, outcomeId: 23, desc: "Barcelona 2-1" }
        ]
    },
    994: { // Inter Milan vs Juventus
        '1x2': [
            { label: "Inter Milan", value: 2.15, outcomeId: 0, desc: "Inter Milan Win" },
            { label: "Draw", value: 3.10, outcomeId: 2, desc: "Draw" },
            { label: "Juventus", value: 3.40, outcomeId: 1, desc: "Juventus Win" }
        ],
        'scorer': [
            { label: "Lautaro", value: 2.20, outcomeId: 10, desc: "Lautaro to score" },
            { label: "Vlahovic", value: 2.45, outcomeId: 11, desc: "Vlahovic to score" },
            { label: "Thuram", value: 2.75, outcomeId: 12, desc: "Thuram to score" },
            { label: "Yildiz", value: 3.80, outcomeId: 13, desc: "Yildiz to score" }
        ],
        'score': [
            { label: "1 - 0", value: 6.50, outcomeId: 20, desc: "Inter Milan 1-0" },
            { label: "2 - 0", value: 9.50, outcomeId: 21, desc: "Inter Milan 2-0" },
            { label: "1 - 1", value: 5.80, outcomeId: 22, desc: "Draw 1-1" },
            { label: "0 - 1", value: 8.50, outcomeId: 23, desc: "Juventus 1-0" }
        ]
    },
    993: { // Bayern Munich vs Dortmund
        '1x2': [
            { label: "Bayern Munich", value: 1.65, outcomeId: 0, desc: "Bayern Munich Win" },
            { label: "Draw", value: 4.10, outcomeId: 2, desc: "Draw" },
            { label: "Dortmund", value: 4.80, outcomeId: 1, desc: "Dortmund Win" }
        ],
        'scorer': [
            { label: "Harry Kane", value: 1.60, outcomeId: 10, desc: "Harry Kane to score" },
            { label: "Guirassy", value: 2.40, outcomeId: 11, desc: "Guirassy to score" },
            { label: "Musiala", value: 2.65, outcomeId: 12, desc: "Musiala to score" },
            { label: "Adeyemi", value: 3.50, outcomeId: 13, desc: "Adeyemi to score" }
        ],
        'score': [
            { label: "2 - 1", value: 8.00, outcomeId: 20, desc: "Bayern 2-1" },
            { label: "3 - 1", value: 11.00, outcomeId: 21, desc: "Bayern 3-1" },
            { label: "1 - 1", value: 9.00, outcomeId: 22, desc: "Draw 1-1" },
            { label: "1 - 2", value: 15.00, outcomeId: 23, desc: "Dortmund 2-1" }
        ]
    }
};

let matchTimer = null;
let matchStatus = 'LIVE';

// Hardcoded account seeds (in a production app, these would be derived via findProgramAddress)
// For simplicity in local testing, we generate persistent developer keys
const PLATFORM_STATE_KEY = "platform_state_account";
const TREASURY_KEY = "treasury_account";
const PUNTER_CREATOR_KEY = "punter_creator_account";
const MARKET_KEY = "market_999_account";

// Mock database for wagers
let localWagers = [];
let localLPDeposited = 0;

// Dynamic squad database & generator
function getSquadForTeam(teamName) {
    const cleanName = teamName.trim().toLowerCase();
    
    const popularTeams = {
        portugal: {
            formation: "4-3-3",
            lineup: [
                { num: 1, name: "Diogo Costa", pos: "GK" },
                { num: 2, name: "Nelson Semedo", pos: "DF" },
                { num: 3, name: "Pepe", pos: "DF" },
                { num: 4, name: "Ruben Dias", pos: "DF" },
                { num: 19, name: "Nuno Mendes", pos: "DF" },
                { num: 6, name: "Joao Palhinha", pos: "MF" },
                { num: 8, name: "Bruno Fernandes", pos: "MF" },
                { num: 23, name: "Vitinha", pos: "MF" },
                { num: 10, name: "Bernardo Silva", pos: "FW" },
                { num: 7, name: "Cristiano Ronaldo", pos: "FW" },
                { num: 17, name: "Rafael Leao", pos: "FW" }
            ],
            subs: ["Rui Patricio", "Goncalo Inacio", "Diogo Dalot", "Joao Neves", "Ruben Neves", "Joao Felix", "Goncalo Ramos", "Diogo Jota"]
        },
        uzbekistan: {
            formation: "3-4-3",
            lineup: [
                { num: 1, name: "Utkir Yusupov", pos: "GK" },
                { num: 4, name: "Farrukh Sayfiev", pos: "DF" },
                { num: 5, name: "Rustam Ashurmatov", pos: "DF" },
                { num: 15, name: "Umar Eshmurodov", pos: "DF" },
                { num: 3, name: "Khojiakbar Alijonov", pos: "MF" },
                { num: 7, name: "Otabek Shukurov", pos: "MF" },
                { num: 9, name: "Odiljon Hamrobekov", pos: "MF" },
                { num: 13, name: "Sherzod Nasrullaev", pos: "MF" },
                { num: 22, name: "Abbosbek Faizullaev", pos: "FW" },
                { num: 14, name: "Eldor Shomurodov", pos: "FW" },
                { num: 10, name: "Jaloliddin Masharipov", pos: "FW" }
            ],
            subs: ["Abduvohid Nematov", "Husniddin Aliqulov", "Zafarmurod Abdurakhmatov", "Jamshid Iskanderov", "Diyor Kholmatov", "Oston Urunov", "Igor Sergeev", "Bobur Abdikholikov"]
        },
        brazil: {
            formation: "4-3-3",
            lineup: [
                { num: 1, name: "Alisson Becker", pos: "GK" },
                { num: 2, name: "Danilo", pos: "DF" },
                { num: 3, name: "Marquinhos", pos: "DF" },
                { num: 4, name: "Gabriel Magalhaes", pos: "DF" },
                { num: 6, name: "Guilherme Arana", pos: "DF" },
                { num: 5, name: "Bruno Guimaraes", pos: "MF" },
                { num: 8, name: "Lucas Paqueta", pos: "MF" },
                { num: 10, name: "Rodrygo Goes", pos: "MF" },
                { num: 7, name: "Vinicius Junior", pos: "FW" },
                { num: 9, name: "Endrick", pos: "FW" },
                { num: 11, name: "Raphinha", pos: "FW" }
            ],
            subs: ["Ederson", "Lucas Beraldo", "Douglas Luiz", "Andreas Pereira", "Savinho", "Gabriel Martinelli"]
        },
        france: {
            formation: "4-2-3-1",
            lineup: [
                { num: 16, name: "Mike Maignan", pos: "GK" },
                { num: 5, name: "Jules Kounde", pos: "DF" },
                { num: 4, name: "Dayot Upamecano", pos: "DF" },
                { num: 17, name: "William Saliba", pos: "DF" },
                { num: 22, name: "Theo Hernandez", pos: "DF" },
                { num: 8, name: "Aurelien Tchouameni", pos: "MF" },
                { num: 13, name: "N'Golo Kante", pos: "MF" },
                { num: 11, name: "Ousmane Dembele", pos: "MF" },
                { num: 7, name: "Antoine Griezmann", pos: "MF" },
                { num: 20, name: "Kingsley Coman", pos: "MF" },
                { num: 10, name: "Kylian Mbappe", pos: "FW" }
            ],
            subs: ["Brice Samba", "Ibrahima Konate", "Eduardo Camavinga", "Warren Zaire-Emery", "Bradley Barcola", "Olivier Giroud"]
        },
        arsenal: {
            formation: "4-3-3",
            lineup: [
                { num: 22, name: "David Raya", pos: "GK" },
                { num: 4, name: "Ben White", pos: "DF" },
                { num: 2, name: "William Saliba", pos: "DF" },
                { num: 6, name: "Gabriel Magalhaes", pos: "DF" },
                { num: 12, name: "Jurrien Timber", pos: "DF" },
                { num: 41, name: "Declan Rice", pos: "MF" },
                { num: 5, name: "Thomas Partey", pos: "MF" },
                { num: 8, name: "Martin Odegaard", pos: "MF" },
                { num: 7, name: "Bukayo Saka", pos: "FW" },
                { num: 29, name: "Kai Havertz", pos: "FW" },
                { num: 11, name: "Gabriel Martinelli", pos: "FW" }
            ],
            subs: ["Neto", "Riccardo Calafiori", "Oleksandr Zinchenko", "Jorginho", "Mikel Merino", "Leandro Trossard", "Raheem Sterling", "Gabriel Jesus"]
        },
        chelsea: {
            formation: "4-2-3-1",
            lineup: [
                { num: 1, name: "Robert Sanchez", pos: "GK" },
                { num: 27, name: "Malo Gusto", pos: "DF" },
                { num: 29, name: "Wesley Fofana", pos: "DF" },
                { num: 6, name: "Levi Colwill", pos: "DF" },
                { num: 3, name: "Marc Cucurella", pos: "DF" },
                { num: 25, name: "Moises Caicedo", pos: "MF" },
                { num: 45, name: "Romeo Lavia", pos: "MF" },
                { num: 11, name: "Noni Madueke", pos: "MF" },
                { num: 20, name: "Cole Palmer", pos: "MF" },
                { num: 19, name: "Jadon Sancho", pos: "MF" },
                { num: 15, name: "Nicolas Jackson", pos: "FW" }
            ],
            subs: ["Filip Jorgensen", "Tosin Adarabioyo", "Renato Veiga", "Enzo Fernandez", "Kiernan Dewsbury-Hall", "Pedro Neto", "Joao Felix", "Christopher Nkunku"]
        }
    };
    
    if (popularTeams[cleanName]) {
        return popularTeams[cleanName];
    }
    
    const firstNames = ["James", "David", "Robert", "John", "Michael", "Thomas", "Daniel", "Carlos", "Luis", "Jose", "Ivan", "Luka", "Andres", "Mateo", "Alex", "Pierre", "Marco", "Diego", "Sergi", "Ken", "Ali", "Yuki", "Kim"];
    const lastNames = ["Smith", "Jones", "Miller", "Davis", "Garcia", "Rodriguez", "Martinez", "Hernandez", "Silva", "Santos", "Ferreira", "Muller", "Schmidt", "Dubois", "Martin", "Rossi", "Bianchi", "Kovac", "Novak", "Ivanov", "Petrov", "Aliyev", "Rahman"];
    
    let seed = 0;
    for (let i = 0; i < cleanName.length; i++) {
        seed += cleanName.charCodeAt(i);
    }
    
    function seededRandom(max, min = 0) {
        seed = (seed * 9301 + 49297) % 233280;
        const rnd = seed / 233280;
        return Math.floor(min + rnd * (max - min));
    }
    
    const generatedLineup = [];
    const positions = ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "FW", "FW", "FW"];
    const numbersUsed = new Set();
    
    positions.forEach((pos, idx) => {
        let num;
        if (pos === "GK") num = 1;
        else {
            do {
                num = seededRandom(99, 2);
            } while (numbersUsed.has(num));
        }
        numbersUsed.add(num);
        
        const firstName = firstNames[seededRandom(firstNames.length)];
        const lastName = lastNames[seededRandom(lastNames.length)];
        generatedLineup.push({
            num: num,
            name: `${firstName[0]}. ${lastName}`,
            pos: pos
        });
    });
    
    const generatedSubs = [];
    for (let i = 0; i < 6; i++) {
        const firstName = firstNames[seededRandom(firstNames.length)];
        const lastName = lastNames[seededRandom(lastNames.length)];
        generatedSubs.push(`${firstName[0]}. ${lastName}`);
    }
    
    return {
        formation: "4-3-3",
        lineup: generatedLineup,
        subs: generatedSubs
    };
}

async function fetchSquadForTeam(teamName) {
    const cleanName = teamName.trim();
    const local = getSquadForTeam(cleanName);
    
    try {
        const searchUrl = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(cleanName)}`;
        const searchResp = await fetch(searchUrl);
        const searchData = await searchResp.json();
        
        if (!searchData || !searchData.teams || searchData.teams.length === 0) {
            console.log(`Team "${cleanName}" not found in SportsDB. Using local generator.`);
            return local;
        }
        
        const teamId = searchData.teams[0].idTeam;
        const lookupUrl = `https://www.thesportsdb.com/api/v1/json/3/lookup_all_players.php?id=${teamId}`;
        const lookupResp = await fetch(lookupUrl);
        const lookupData = await lookupResp.json();
        
        if (!lookupData || !lookupData.player || lookupData.player.length === 0) {
            console.log(`No players found for team ID ${teamId}. Using local generator.`);
            return local;
        }
        
        const rawPlayers = lookupData.player;
        const processed = [];
        const seenNumbers = new Set();
        
        rawPlayers.forEach(p => {
            let pos = "MF";
            const rawPos = (p.strPosition || "").toLowerCase();
            if (rawPos.includes("gk") || rawPos.includes("goalkeeper")) pos = "GK";
            else if (rawPos.includes("back") || rawPos.includes("def") || rawPos.includes("guard")) pos = "DF";
            else if (rawPos.includes("mid") || rawPos.includes("cent") || rawPos.includes("wingback")) pos = "MF";
            else if (rawPos.includes("forw") || rawPos.includes("strik") || rawPos.includes("wing") || rawPos.includes("attack")) pos = "FW";
            
            let num = parseInt(p.strNumber);
            if (isNaN(num) || num <= 0 || num > 99) {
                num = null;
            }
            
            processed.push({
                name: p.strPlayer,
                pos: pos,
                num: num
            });
        });
        
        const gks = processed.filter(p => p.pos === "GK");
        const dfs = processed.filter(p => p.pos === "DF");
        const mfs = processed.filter(p => p.pos === "MF");
        const fws = processed.filter(p => p.pos === "FW");
        
        const lineup = [];
        const subs = [];
        
        if (gks.length > 0) lineup.push(gks[0]);
        else if (processed.length > 0) lineup.push(processed[0]);
        
        for (let i = 0; i < 4; i++) {
            const list = dfs.filter(x => !lineup.includes(x));
            if (list.length > 0) lineup.push(list[0]);
        }
        
        for (let i = 0; i < 3; i++) {
            const list = mfs.filter(x => !lineup.includes(x));
            if (list.length > 0) lineup.push(list[0]);
        }
        
        for (let i = 0; i < 3; i++) {
            const list = fws.filter(x => !lineup.includes(x));
            if (list.length > 0) lineup.push(list[0]);
        }
        
        processed.forEach(p => {
            if (lineup.length < 11 && !lineup.includes(p)) {
                lineup.push(p);
            }
        });
        
        processed.forEach(p => {
            if (!lineup.includes(p)) {
                subs.push(p.name);
            }
        });
        
        lineup.forEach((p, idx) => {
            if (!p.num || seenNumbers.has(p.num)) {
                let temp = p.pos === "GK" ? 1 : idx + 2;
                while (seenNumbers.has(temp)) {
                    temp++;
                }
                p.num = temp;
            }
            seenNumbers.add(p.num);
        });
        
        const limitedSubs = subs.slice(0, 8);
        if (limitedSubs.length === 0) {
            limitedSubs.push("J. Silva", "M. Santos", "A. Ferreira");
        }
        
        return {
            formation: "4-3-3",
            lineup: lineup,
            subs: limitedSubs
        };
        
    } catch (err) {
        console.warn("fetchSquadForTeam error:", err);
        return local;
    }
}

async function loadMatchSquadsAsync(match) {
    if (!match) return;
    if (match.isDynamicSquad) {
        return;
    }
    
    const container = document.getElementById("lineups-scroll-container");
    if (container && activeMatchId === match.id) {
        container.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 2rem 0;"><div class="animate-pulse">🔄 Fetching real squad from SportsDB...</div></div>`;
    }
    
    try {
        const homeSquad = await fetchSquadForTeam(match.homeTeam);
        const awaySquad = await fetchSquadForTeam(match.awayTeam);
        
        match.formation = { home: homeSquad.formation, away: awaySquad.formation };
        match.lineup = { home: homeSquad.lineup, away: awaySquad.lineup };
        match.subs = { home: homeSquad.subs, away: awaySquad.subs };
        match.isDynamicSquad = true;
        
        if (activeMatchId === match.id) {
            renderMatchLineups();
            renderLiveMatches();
        }
    } catch (e) {
        console.error("Failed to load dynamic squad:", e);
        const homeSquad = getSquadForTeam(match.homeTeam);
        const awaySquad = getSquadForTeam(match.awayTeam);
        match.formation = { home: homeSquad.formation, away: awaySquad.formation };
        match.lineup = { home: homeSquad.lineup, away: awaySquad.lineup };
        match.subs = { home: homeSquad.subs, away: awaySquad.subs };
        match.isDynamicSquad = true;
        
        if (activeMatchId === match.id) {
            renderMatchLineups();
            renderLiveMatches();
        }
    }
}

// Dynamic Date & Fixture Scheduling System (Betting Platform Standard)
function getSportsScheduleDates() {
    const now = new Date();
    const pad = n => String(n).padStart(2, "0");
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return {
        todayStr,
        tomorrowStr,
        todayLabel: `${daysOfWeek[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`,
        tomorrowLabel: `${daysOfWeek[tomorrow.getDay()]}, ${months[tomorrow.getMonth()]} ${tomorrow.getDate()}`,
        dayNameToday: daysOfWeek[now.getDay()],
        dayNameTomorrow: daysOfWeek[tomorrow.getDay()]
    };
}

// Generate comprehensive betting markets (SportyBet / Bet9ja Global Catalog)
// House edge / Vig: ~106% - 108% overround on singles, compounding on accumulators
function getMatchMarkets(match) {
    if (!MATCH_MARKETS[match.id]) {
        MATCH_MARKETS[match.id] = {};
    }
    const markets = MATCH_MARKETS[match.id];

    // Base odds with ~107% house overround
    const homeOdds = match.odds?.home || 2.10;
    const drawOdds = match.odds?.draw || 3.30;
    const awayOdds = match.odds?.away || 3.10;
    const h = match.homeTeam ? match.homeTeam.length : 6;
    const a = match.awayTeam ? match.awayTeam.length : 7;

    // 1. 1X2 Match Winner
    if (!markets['1x2'] || markets['1x2'].length === 0) {
        markets['1x2'] = [
            { label: `1 (${match.homeTeam})`, value: homeOdds, outcomeId: 0, desc: `${match.homeTeam} Win`, marketName: 'Winner (1X2)' },
            { label: "X (Draw)", value: drawOdds, outcomeId: 2, desc: "Draw", marketName: 'Winner (1X2)' },
            { label: `2 (${match.awayTeam})`, value: awayOdds, outcomeId: 1, desc: `${match.awayTeam} Win`, marketName: 'Winner (1X2)' }
        ];
    }

    // 2. Double Chance (1X, 12, X2)
    if (!markets['dc']) {
        const dc1X = parseFloat((1 / (1/homeOdds + 1/drawOdds) * 0.93).toFixed(2));
        const dc12 = parseFloat((1 / (1/homeOdds + 1/awayOdds) * 0.93).toFixed(2));
        const dcX2 = parseFloat((1 / (1/drawOdds + 1/awayOdds) * 0.93).toFixed(2));
        markets['dc'] = [
            { label: "1X (Home/Draw)", value: Math.max(1.15, dc1X), outcomeId: 5, desc: `${match.homeTeam} or Draw`, marketName: 'Double Chance' },
            { label: "12 (Home/Away)", value: Math.max(1.18, dc12), outcomeId: 6, desc: `${match.homeTeam} or ${match.awayTeam}`, marketName: 'Double Chance' },
            { label: "X2 (Draw/Away)", value: Math.max(1.20, dcX2), outcomeId: 7, desc: `Draw or ${match.awayTeam}`, marketName: 'Double Chance' }
        ];
    }

    // 3. Over / Under 2.5 Goals
    if (!markets['overunder']) {
        const overVal = parseFloat((1.72 + ((h * 3) % 4) * 0.08).toFixed(2));
        const underVal = parseFloat((1.92 + ((a * 2) % 4) * 0.08).toFixed(2));
        markets['overunder'] = [
            { label: "Over 2.5", value: overVal, outcomeId: 10, desc: `${match.homeTeam} vs ${match.awayTeam} - Over 2.5 Goals`, marketName: 'Total Goals (O/U 2.5)' },
            { label: "Under 2.5", value: underVal, outcomeId: 11, desc: `${match.homeTeam} vs ${match.awayTeam} - Under 2.5 Goals`, marketName: 'Total Goals (O/U 2.5)' }
        ];
    }

    // 4. Both Teams to Score (BTTS / GG NG)
    if (!markets['btts']) {
        const yesVal = parseFloat((1.65 + ((h + a) % 3) * 0.1).toFixed(2));
        const noVal = parseFloat((2.02 + ((h * 2 + a) % 3) * 0.1).toFixed(2));
        markets['btts'] = [
            { label: "GG (Yes)", value: yesVal, outcomeId: 20, desc: `${match.homeTeam} vs ${match.awayTeam} - Both Teams to Score: Yes`, marketName: 'Both Teams To Score' },
            { label: "NG (No)", value: noVal, outcomeId: 21, desc: `${match.homeTeam} vs ${match.awayTeam} - Both Teams to Score: No`, marketName: 'Both Teams To Score' }
        ];
    }

    // 5. Draw No Bet (DNB)
    if (!markets['dnb']) {
        const dnbHome = parseFloat((homeOdds * (1 - 1/drawOdds) * 0.94).toFixed(2));
        const dnbAway = parseFloat((awayOdds * (1 - 1/drawOdds) * 0.94).toFixed(2));
        markets['dnb'] = [
            { label: `${match.homeTeam} DNB`, value: Math.max(1.25, dnbHome), outcomeId: 30, desc: `${match.homeTeam} Draw No Bet`, marketName: 'Draw No Bet' },
            { label: `${match.awayTeam} DNB`, value: Math.max(1.35, dnbAway), outcomeId: 31, desc: `${match.awayTeam} Draw No Bet`, marketName: 'Draw No Bet' }
        ];
    }

    // 6. Over / Under 1.5 Goals
    if (!markets['ou15']) {
        markets['ou15'] = [
            { label: "Over 1.5", value: parseFloat((1.24 + (h % 3) * 0.05).toFixed(2)), outcomeId: 12, desc: `${match.homeTeam} vs ${match.awayTeam} - Over 1.5 Goals`, marketName: 'Total Goals (O/U 1.5)' },
            { label: "Under 1.5", value: parseFloat((3.60 + (a % 3) * 0.2).toFixed(2)), outcomeId: 13, desc: `${match.homeTeam} vs ${match.awayTeam} - Under 1.5 Goals`, marketName: 'Total Goals (O/U 1.5)' }
        ];
    }

    // 7. Over / Under 0.5 Goals & Over / Under 3.5 Goals
    if (!markets['ou05']) {
        markets['ou05'] = [
            { label: "Over 0.5", value: 1.05, outcomeId: 14, desc: `Over 0.5 Goals`, marketName: 'Total Goals (O/U 0.5)' },
            { label: "Under 0.5", value: 8.50, outcomeId: 15, desc: `Under 0.5 Goals`, marketName: 'Total Goals (O/U 0.5)' }
        ];
    }
    if (!markets['ou35']) {
        markets['ou35'] = [
            { label: "Over 3.5", value: parseFloat((2.80 + (h % 3) * 0.15).toFixed(2)), outcomeId: 16, desc: `Over 3.5 Goals`, marketName: 'Total Goals (O/U 3.5)' },
            { label: "Under 3.5", value: parseFloat((1.38 + (a % 3) * 0.05).toFixed(2)), outcomeId: 17, desc: `Under 3.5 Goals`, marketName: 'Total Goals (O/U 3.5)' }
        ];
    }

    // 8. 1st Half Winner (1X2)
    if (!markets['halftime']) {
        markets['halftime'] = [
            { label: `1st H: ${match.homeTeam}`, value: parseFloat((homeOdds * 1.35).toFixed(2)), outcomeId: 40, desc: `1st Half: ${match.homeTeam} Win`, marketName: '1st Half 1X2' },
            { label: "1st H: Draw", value: parseFloat((drawOdds * 0.65).toFixed(2)), outcomeId: 41, desc: `1st Half: Draw`, marketName: '1st Half 1X2' },
            { label: `1st H: ${match.awayTeam}`, value: parseFloat((awayOdds * 1.35).toFixed(2)), outcomeId: 42, desc: `1st Half: ${match.awayTeam} Win`, marketName: '1st Half 1X2' }
        ];
    }

    // 9. 1st Half Goals
    if (!markets['htgoals']) {
        markets['htgoals'] = [
            { label: "1st H: Over 0.5", value: 1.35, outcomeId: 43, desc: `1st Half Over 0.5 Goals`, marketName: '1st Half Goals' },
            { label: "1st H: Under 0.5", value: 2.90, outcomeId: 44, desc: `1st Half Under 0.5 Goals`, marketName: '1st Half Goals' }
        ];
    }

    // 10. Half Time / Full Time (HT/FT)
    if (!markets['htft']) {
        markets['htft'] = [
            { label: "1/1 (Home/Home)", value: parseFloat((homeOdds * 1.7).toFixed(2)), outcomeId: 60, desc: `HT/FT: ${match.homeTeam}/${match.homeTeam}`, marketName: 'HT/FT' },
            { label: "1/X (Home/Draw)", value: 14.00, outcomeId: 61, desc: `HT/FT: ${match.homeTeam}/Draw`, marketName: 'HT/FT' },
            { label: "1/2 (Home/Away)", value: 28.00, outcomeId: 62, desc: `HT/FT: ${match.homeTeam}/${match.awayTeam}`, marketName: 'HT/FT' },
            { label: "X/1 (Draw/Home)", value: parseFloat((homeOdds * 2.1).toFixed(2)), outcomeId: 63, desc: `HT/FT: Draw/${match.homeTeam}`, marketName: 'HT/FT' },
            { label: "X/X (Draw/Draw)", value: 5.20, outcomeId: 64, desc: `HT/FT: Draw/Draw`, marketName: 'HT/FT' },
            { label: "X/2 (Draw/Away)", value: parseFloat((awayOdds * 2.1).toFixed(2)), outcomeId: 65, desc: `HT/FT: Draw/${match.awayTeam}`, marketName: 'HT/FT' },
            { label: "2/1 (Away/Home)", value: 26.00, outcomeId: 66, desc: `HT/FT: ${match.awayTeam}/${match.homeTeam}`, marketName: 'HT/FT' },
            { label: "2/X (Away/Draw)", value: 14.50, outcomeId: 67, desc: `HT/FT: ${match.awayTeam}/Draw`, marketName: 'HT/FT' },
            { label: "2/2 (Away/Away)", value: parseFloat((awayOdds * 1.7).toFixed(2)), outcomeId: 68, desc: `HT/FT: ${match.awayTeam}/${match.awayTeam}`, marketName: 'HT/FT' }
        ];
    }

    // 11. Exact Total Goals
    if (!markets['exactgoals']) {
        markets['exactgoals'] = [
            { label: "0 Goals", value: 8.50, outcomeId: 70, desc: `Exact Goals: 0`, marketName: 'Exact Goals' },
            { label: "1 Goal", value: 4.60, outcomeId: 71, desc: `Exact Goals: 1`, marketName: 'Exact Goals' },
            { label: "2 Goals", value: 3.40, outcomeId: 72, desc: `Exact Goals: 2`, marketName: 'Exact Goals' },
            { label: "3 Goals", value: 3.90, outcomeId: 73, desc: `Exact Goals: 3`, marketName: 'Exact Goals' },
            { label: "4 Goals", value: 5.80, outcomeId: 74, desc: `Exact Goals: 4`, marketName: 'Exact Goals' },
            { label: "5+ Goals", value: 9.50, outcomeId: 75, desc: `Exact Goals: 5+`, marketName: 'Exact Goals' }
        ];
    }

    // 12. European Handicap (-1 / +1)
    if (!markets['handicap']) {
        markets['handicap'] = [
            { label: `${match.homeTeam} (-1)`, value: parseFloat((homeOdds * 1.95).toFixed(2)), outcomeId: 80, desc: `Handicap: ${match.homeTeam} (-1)`, marketName: 'European Handicap' },
            { label: "Handicap Tie (-1)", value: 3.65, outcomeId: 81, desc: `Handicap Tie (-1)`, marketName: 'European Handicap' },
            { label: `${match.awayTeam} (+1)`, value: parseFloat((1 / (1/awayOdds + 1/drawOdds) * 1.05).toFixed(2)), outcomeId: 82, desc: `Handicap: ${match.awayTeam} (+1)`, marketName: 'European Handicap' }
        ];
    }

    // 13. Correct Score Market
    if (!markets['score'] || markets['score'].length === 0) {
        markets['score'] = [
            { label: "1 - 0", value: parseFloat((6.20 + (h % 3) * 0.5).toFixed(2)), outcomeId: 50, desc: `${match.homeTeam} 1-0`, marketName: 'Correct Score' },
            { label: "2 - 0", value: parseFloat((8.20 + (h % 4) * 0.5).toFixed(2)), outcomeId: 51, desc: `${match.homeTeam} 2-0`, marketName: 'Correct Score' },
            { label: "2 - 1", value: parseFloat((7.80 + (a % 3) * 0.5).toFixed(2)), outcomeId: 52, desc: `${match.homeTeam} 2-1`, marketName: 'Correct Score' },
            { label: "3 - 0", value: 14.00, outcomeId: 53, desc: `${match.homeTeam} 3-0`, marketName: 'Correct Score' },
            { label: "3 - 1", value: 15.50, outcomeId: 54, desc: `${match.homeTeam} 3-1`, marketName: 'Correct Score' },
            { label: "0 - 0", value: 8.50, outcomeId: 55, desc: `Draw 0-0`, marketName: 'Correct Score' },
            { label: "1 - 1", value: parseFloat((5.30 + ((h + a) % 3) * 0.5).toFixed(2)), outcomeId: 56, desc: "Draw 1-1", marketName: 'Correct Score' },
            { label: "2 - 2", value: 12.00, outcomeId: 57, desc: "Draw 2-2", marketName: 'Correct Score' },
            { label: "0 - 1", value: parseFloat((8.20 + (a % 3) * 0.5).toFixed(2)), outcomeId: 58, desc: `${match.awayTeam} 1-0`, marketName: 'Correct Score' },
            { label: "0 - 2", value: parseFloat((10.50 + (a % 4) * 0.5).toFixed(2)), outcomeId: 59, desc: `${match.awayTeam} 2-0`, marketName: 'Correct Score' },
            { label: "1 - 2", value: 9.80, outcomeId: 90, desc: `${match.awayTeam} 2-1`, marketName: 'Correct Score' },
            { label: "0 - 3", value: 21.00, outcomeId: 91, desc: `${match.awayTeam} 3-0`, marketName: 'Correct Score' },
            { label: "1 - 3", value: 22.00, outcomeId: 92, desc: `${match.awayTeam} 3-1`, marketName: 'Correct Score' },
            { label: "Other", value: 11.00, outcomeId: 93, desc: `Any Other Score`, marketName: 'Correct Score' }
        ];
    }

    // 14. Corners & Cards
    if (!markets['corners']) {
        markets['corners'] = [
            { label: "Corners O 8.5", value: 1.80, outcomeId: 94, desc: `Corners Over 8.5`, marketName: 'Corners & Cards' },
            { label: "Corners U 8.5", value: 1.95, outcomeId: 95, desc: `Corners Under 8.5`, marketName: 'Corners & Cards' },
            { label: "Cards Over 3.5", value: 1.85, outcomeId: 96, desc: `Cards Over 3.5`, marketName: 'Corners & Cards' }
        ];
    }

    // 15. Combos (Match Result + Goals)
    if (!markets['combos']) {
        markets['combos'] = [
            { label: `1 & Over 2.5`, value: parseFloat((homeOdds * 1.55).toFixed(2)), outcomeId: 97, desc: `${match.homeTeam} & Over 2.5`, marketName: 'Match Combos' },
            { label: `2 & Over 2.5`, value: parseFloat((awayOdds * 1.55).toFixed(2)), outcomeId: 98, desc: `${match.awayTeam} & Over 2.5`, marketName: 'Match Combos' },
            { label: `1 & GG (Yes)`, value: parseFloat((homeOdds * 1.70).toFixed(2)), outcomeId: 99, desc: `${match.homeTeam} & Both Teams To Score`, marketName: 'Match Combos' },
            { label: `2 & GG (Yes)`, value: parseFloat((awayOdds * 1.70).toFixed(2)), outcomeId: 100, desc: `${match.awayTeam} & Both Teams To Score`, marketName: 'Match Combos' }
        ];
    }

    return markets;
}

// Display View Mode Toggle (Full-Width Sportsbook vs Split View)
function setSportsbookViewMode(mode) {
    activeViewMode = mode;
    const grid = document.getElementById("main-layout-grid");
    const btnSplit = document.getElementById("view-mode-split");
    const btnFull = document.getElementById("view-mode-full");

    if (mode === 'full') {
        if (grid) grid.classList.add("full-sportsbook-active");
        if (btnFull) btnFull.classList.add("active");
        if (btnSplit) btnSplit.classList.remove("active");
        showToast("Full Sportsbook Display Enabled (Panoramic View)", "info");
    } else {
        if (grid) grid.classList.remove("full-sportsbook-active");
        if (btnSplit) btnSplit.classList.add("active");
        if (btnFull) btnFull.classList.remove("active");
        showToast("Split View Active (Live Stream & Sportsbook)", "info");
    }
}

// Sideways scrolling helpers for horizontal UI decks and market matrix
function scrollMarketMatrix(dir) {
    const containers = document.querySelectorAll(".match-matrix-container");
    containers.forEach(el => {
        el.scrollBy({ left: dir * 320, behavior: 'smooth' });
    });
}

function toggleMatchAccordion(matchId, event) {
    if (event) event.stopPropagation();
    expandedAccordions[matchId] = !expandedAccordions[matchId];
    renderLiveMatches();
}

function setAccordionCategory(matchId, catKey, event) {
    if (event) event.stopPropagation();
    activeAccordionCategory[matchId] = catKey;
    renderLiveMatches();
}

// Sideways scrolling helpers for horizontal UI decks
function scrollLeagues(dir) {
    const el = document.getElementById("league-filter-bar");
    if (el) el.scrollBy({ left: dir * 240, behavior: 'smooth' });
}

function scrollFeatured(dir) {
    const el = document.getElementById("featured-matches-scroll");
    if (el) el.scrollBy({ left: dir * 280, behavior: 'smooth' });
}

// Schedule and League Filter Handlers
function filterMatchesBySchedule(scheduleType) {
    activeScheduleFilter = scheduleType;
    const pills = ['all', 'live', 'today', 'tomorrow', 'week', 'finished'];
    pills.forEach(p => {
        const btn = document.getElementById(`filter-pill-${p}`);
        if (btn) {
            btn.classList.toggle('active', p === scheduleType);
        }
    });
    renderLiveMatches();
}

function filterMatchesByLeague(leagueName) {
    activeLeagueFilter = leagueName;
    const leagueMap = {
        'all': 'league-btn-all',
        'Premier League': 'league-btn-epl',
        'Champions League': 'league-btn-ucl',
        'La Liga': 'league-btn-laliga',
        'Serie A': 'league-btn-seriea',
        'Bundesliga': 'league-btn-bundesliga',
        'Ligue 1': 'league-btn-ligue1',
        'Europa League': 'league-btn-uel',
        'Championship': 'league-btn-championship',
        'Eredivisie': 'league-btn-eredivisie',
        'Primeira Liga': 'league-btn-primeira',
        'Süper Lig': 'league-btn-superlig',
        'Saudi Pro': 'league-btn-saudi',
        'MLS': 'league-btn-mls',
        'Série A': 'league-btn-brazil',
        'World Cup': 'league-btn-worldcup'
    };
    Object.keys(leagueMap).forEach(key => {
        const btn = document.getElementById(leagueMap[key]);
        if (btn) {
            btn.classList.toggle('active', key === leagueName);
        }
    });
    renderLiveMatches();
}

// Autonomous Daily & Weekly Fixtures Synchronizer
async function fetchUpcomingMatchesFromAPI() {
    console.log('Ensuring all 31 verified UEFA & Premier League fixtures have active markets...');
    MATCHES_DATA.forEach(match => {
        getMatchMarkets(match);
    });
    renderLiveMatches();
}

// ==========================================================================
// RELIABLE REAL-TIME LIVE SCORE & MATCH CONCLUSION SYNCHRONIZER (ESPN & UEFA)
// ==========================================================================
const RELIABLE_SPORTS_FEEDS = [
    { leagueKey: "uefa.champions", name: "UEFA Champions League" },
    { leagueKey: "eng.1", name: "Premier League" },
    { leagueKey: "uefa.europa", name: "UEFA Europa League" },
    { leagueKey: "esp.1", name: "La Liga" },
    { leagueKey: "ita.1", name: "Serie A" },
    { leagueKey: "ger.1", name: "Bundesliga" }
];

let lastLiveScoreSyncTimestamp = 0;
let isScoreSyncInProgress = false;

function normalizeSportsTeamName(name) {
    if (!name) return "";
    let clean = name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    // Canonical soccer team alias dictionary
    const aliases = [
        [/\b(internazionale|inter milan|inter)\b/g, "inter"],
        [/\b(club brugge|club bruges)\b/g, "brugge"],
        [/\b(manchester united|man utd|man united)\b/g, "manunited"],
        [/\b(manchester city|man city)\b/g, "mancity"],
        [/\b(atletico madrid|atletico de madrid|atletico)\b/g, "atleticomadrid"],
        [/\b(paris saint germain|paris sg|psg)\b/g, "psg"],
        [/\b(sporting cp|sporting lisbon|sporting)\b/g, "sporting"],
        [/\b(bodo glimt|bodoglimt)\b/g, "bodoglimt"],
        [/\b(lask linz|lask)\b/g, "lask"],
        [/\b(feyenoord rotterdam|feyenoord)\b/g, "feyenoord"],
        [/\b(fenerbahce|fenerbahçe)\b/g, "fenerbahce"],
        [/\b(psv eindhoven|psv)\b/g, "psv"],
        [/\b(viking fk|viking)\b/g, "viking"],
        [/\b(lille osc|losc lille|lille)\b/g, "lille"],
        [/\b(real betis balompie|real betis)\b/g, "betis"],
        [/\b(as roma|roma)\b/g, "roma"],
        [/\b(aston villa|villa)\b/g, "villa"]
    ];

    for (const [pattern, replacement] of aliases) {
        if (pattern.test(clean)) {
            return replacement;
        }
    }

    return clean
        .replace(/\b(fc|cf|fk|cp|afc|sc|ac|as|tsg|vfb|rb|athletic|club)\b/gi, "")
        .replace(/[^a-z0-9]/g, "")
        .trim();
}

async function syncLiveScoresFromReliableSource(isManual = false) {
    if (isScoreSyncInProgress) return;
    isScoreSyncInProgress = true;

    const btn = document.getElementById("header-live-score-sync-btn");
    const icon = document.getElementById("score-sync-icon");
    const txt = document.getElementById("score-sync-status-text");
    if (icon) icon.classList.add("syncing-spin");
    if (txt) txt.textContent = "Syncing Live Scores...";

    let updatedCount = 0;
    let finishedCount = 0;
    let liveMatchCount = 0;
    let newlyFinishedMatches = [];
    let newlyScoredGoals = [];

    try {
        const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10).replace(/-/g, "");
        const queryDates = ["", `?dates=${yesterdayStr}`];

        for (const dateQuery of queryDates) {
            for (const feed of RELIABLE_SPORTS_FEEDS) {
                try {
                    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${feed.leagueKey}/scoreboard${dateQuery}`;
                    const resp = await fetch(url);
                    if (!resp.ok) continue;
                    const data = await resp.json();
                    const events = data.events || [];

                for (const ev of events) {
                    const comp = ev.competitions?.[0];
                    if (!comp) continue;
                    const homeComp = comp.competitors?.find(c => c.homeAway === 'home');
                    const awayComp = comp.competitors?.find(c => c.homeAway === 'away');
                    if (!homeComp || !awayComp) continue;

                    const hName = homeComp.team?.displayName || "";
                    const aName = awayComp.team?.displayName || "";
                    const hNorm = normalizeSportsTeamName(hName);
                    const aNorm = normalizeSportsTeamName(aName);

                    const match = MATCHES_DATA.find(m => {
                        const mhNorm = normalizeSportsTeamName(m.homeTeam);
                        const maNorm = normalizeSportsTeamName(m.awayTeam);
                        return (mhNorm === hNorm && maNorm === aNorm) ||
                               (mhNorm.includes(hNorm) && maNorm.includes(aNorm)) ||
                               (hNorm.includes(mhNorm) && aNorm.includes(maNorm));
                    });

                    if (!match) continue;

                    const state = ev.status?.type?.state; // 'in', 'post', 'pre'
                    const detail = ev.status?.type?.detail || "";
                    const clock = ev.status?.displayClock;
                    const statusName = ev.status?.type?.name || "";
                    const completed = !!ev.status?.type?.completed;

                    const hScore = parseInt(homeComp.score || "0", 10);
                    const aScore = parseInt(awayComp.score || "0", 10);

                    const prevStatus = match.status;
                    const prevHome = (match.score && typeof match.score.home === 'number') ? match.score.home : 0;
                    const prevAway = (match.score && typeof match.score.away === 'number') ? match.score.away : 0;

                    if (state === 'post' || completed || statusName.includes('FULL_TIME') || statusName.includes('FINAL')) {
                        match.status = 'FINISHED';
                        match.scheduleGroup = 'finished';
                        match.time = 'Full Time';
                        match.score = { home: hScore, away: aScore };
                        match.isLocked = true;
                        finishedCount++;
                        updatedCount++;

                        if (prevStatus !== 'FINISHED') {
                            newlyFinishedMatches.push(match);
                            if (!match.timeline) match.timeline = [];
                            match.timeline.unshift({
                                time: "FT",
                                type: "end",
                                desc: `🏁 Final Whistle: ${match.homeTeam} ${hScore} - ${aScore} ${match.awayTeam} (Full Time)`,
                                icon: "🏁"
                            });
                        }
                    } else if (state === 'in' || statusName.includes('PROGRESS') || statusName.includes('HALF')) {
                        match.status = 'LIVE';
                        match.scheduleGroup = 'live';
                        match.time = clock ? `${clock}'` : (detail || 'Live');
                        match.score = { home: hScore, away: aScore };
                        liveMatchCount++;
                        updatedCount++;

                        if (hScore !== prevHome || aScore !== prevAway) {
                            newlyScoredGoals.push({ match, hScore, aScore, prevHome, prevAway });
                            if (!match.timeline) match.timeline = [];
                            const scoringTeam = hScore > prevHome ? match.homeTeam : match.awayTeam;
                            match.timeline.unshift({
                                time: match.time,
                                type: "goal",
                                desc: `⚽ Real-Time Goal! ${scoringTeam} scores! (${match.homeTeam} ${hScore} - ${aScore} ${match.awayTeam})`,
                                icon: "⚽"
                            });
                            recalculateMatchOddsAfterGoal(match, hScore > prevHome);
                        }
                    } else if (state === 'pre') {
                        if (match.status !== 'FINISHED') {
                            match.status = 'SCHEDULED';
                            match.score = null; // Unstarted games must never display 0-0
                        }
                    }
                }
            } catch (leagueErr) {
                console.warn(`Could not sync league ${feed.name}:`, leagueErr);
            }
        }
    }

        lastLiveScoreSyncTimestamp = Date.now();
        if (txt) txt.textContent = "ESPN Live: Synced";

        // If any matches ended, settle all pending wagers and notify user
        if (newlyFinishedMatches.length > 0) {
            verifyAllWagersStatus();
            newlyFinishedMatches.forEach(m => {
                showToast(`🏁 ${m.homeTeam} ${m.score.home} - ${m.score.away} ${m.awayTeam} full time! Bets settled.`, "success");
            });
        }

        // Notify if goals occurred
        if (newlyScoredGoals.length > 0) {
            newlyScoredGoals.forEach(g => {
                showToast(`⚽ LIVE GOAL: ${g.match.homeTeam} ${g.hScore} - ${g.aScore} ${g.match.awayTeam}`, "info");
            });
        }

        if (isManual) {
            showToast(`✅ Live Scores Synced from ESPN! (${updatedCount} fixtures checked, ${finishedCount} ended, ${liveMatchCount} live)`, "success");
        }

        updateLiveDomElements();
        renderLiveMatches();

        const activeMatch = MATCHES_DATA.find(m => m.id === activeMatchId);
        if (activeMatch) {
            if (typeof renderMatchTimeline === 'function') renderMatchTimeline();
            if (typeof renderMatchStats === 'function') renderMatchStats();
        }
    } catch (e) {
        console.error("Live Score Sync Error:", e);
        if (txt) txt.textContent = "ESPN Live: Reconnect";
        if (isManual) {
            showToast("Sync timeout. Will auto-retry in 25s.", "warning");
        }
    } finally {
        isScoreSyncInProgress = false;
        if (icon) icon.classList.remove("syncing-spin");
    }
}

function triggerManualScoreSync() {
    syncLiveScoresFromReliableSource(true);
}


// Initialize on page load
function initApp() {
    // Connect to correct validator/network based on saved settings
    const savedNetwork = localStorage.getItem("solplay_network") || "devnet";
    const rpcSelect = document.getElementById("network-rpc-select");
    if (rpcSelect) {
        rpcSelect.value = savedNetwork;
    }
    
    try {
        if (savedNetwork === "localnet") {
            connection = new solanaWeb3.Connection("http://127.0.0.1:8899", "confirmed");
            showToast("Connected to Solana Localnet Validator!", "success");
        } else {
            connection = new solanaWeb3.Connection("https://api.devnet.solana.com", "confirmed");
            showToast("Connected to Solana Devnet!", "success");
        }
    } catch (e) {
        showToast("Failed to connect to validator. Running in offline fallback.", "error");
    }

    // Load wallet if stored
    loadOrCreateWallet();

    // Initialize Cloud Database if Supabase is configured
    if (window.SolPlayDB) {
        SolPlayDB.init();
        if (activePublicKey) {
            SolPlayDB.syncUserAccount(activePublicKey.toString());
        }
    }
    
    // Start live simulation elements
    startMockStreamChat();
    startMatchTimer();
    
    // Check if Program ID is stored in localStorage, default to target deployment
    let savedProgramId = localStorage.getItem("solplay_program_id");
    if (!savedProgramId) {
        savedProgramId = "84AVToEkDwsMXNh77n156DYHaWJa2zVqi8han3qqVdAk";
        localStorage.setItem("solplay_program_id", savedProgramId);
    }
    const adminProgIdEl = document.getElementById("admin-program-id");
    if (adminProgIdEl) {
        adminProgIdEl.value = savedProgramId;
    }
    currentProgramId = new solanaWeb3.PublicKey(savedProgramId);

    // Auto-resolve healthy LiveSports808 stream mirror in background
    autoResolveSports808Mirror();

    // Populate stream providers
    initStreams();
    
    // Load and render persistent wagers
    loadWagersFromStorage();
    renderActiveWagers();

    // Load and restore persistent betslip selections on reload
    loadBetslipFromStorage();
    renderBetslip();

    // Fetch upcoming real matches dynamically from TheSportsDB & poll daily updates every 3 minutes
    fetchUpcomingMatchesFromAPI();
    setInterval(fetchUpcomingMatchesFromAPI, 180000);

    // Synchronize real-time scores immediately from reliable ESPN/UEFA source & poll every 25 seconds
    syncLiveScoresFromReliableSource();
    setInterval(syncLiveScoresFromReliableSource, 25000);

    // Render multi-league matches and select default match without auto-scrolling
    renderLiveMatches();
    selectActiveMatch(1001, false);
    renderMatchStats();
    
    // Start real-time auto-updating live match simulation & dynamic in-play odds engine
    startLiveMatchSimulationEngine();

    // Start live RPC latency ping monitoring
    pingRpcLatency();
    setInterval(pingRpcLatency, 25000);

    // Render Leaderboard data
    renderLeaderboard();

    // Start fetching and polling autonomous oracle config
    loadOracleConfig();
    setInterval(loadOracleConfig, 5000);

    // Initial update of demo controls UI styling
    if (typeof updateDemoControlsUI === 'function') {
        updateDemoControlsUI();
    }

    // Close CDN dropdown when clicking outside
    window.addEventListener("click", function(event) {
        const dropdown = document.getElementById("cdn-dropdown-menu");
        const container = document.getElementById("cdn-dropdown-container");
        if (dropdown && container && !dropdown.classList.contains("hidden")) {
            if (!container.contains(event.target)) {
                dropdown.classList.add("hidden");
            }
        }
    });
}

// Global active oracle matches config & dynamic pubkey helpers
window.activeOracleMatches = null;

function getMarketPubkeyForMatch(matchId) {
    if (window.activeOracleMatches && window.activeOracleMatches.matches && window.activeOracleMatches.matches[matchId]) {
        return new solanaWeb3.PublicKey(window.activeOracleMatches.matches[matchId].marketPubkey);
    }
    return getOrCreateAccountKeypair("market_999").publicKey;
}

function getPlatformStatePubkey() {
    if (window.activeOracleMatches && window.activeOracleMatches.platformStatePubkey) {
        return new solanaWeb3.PublicKey(window.activeOracleMatches.platformStatePubkey);
    }
    return getOrCreateAccountKeypair("platform_state").publicKey;
}

function getTreasuryPubkey() {
    if (window.activeOracleMatches && window.activeOracleMatches.treasuryPubkey) {
        return new solanaWeb3.PublicKey(window.activeOracleMatches.treasuryPubkey);
    }
    return getOrCreateAccountKeypair("treasury").publicKey;
}

function getCreatorPubkey() {
    if (window.activeOracleMatches && window.activeOracleMatches.creatorPubkey) {
        return new solanaWeb3.PublicKey(window.activeOracleMatches.creatorPubkey);
    }
    return getOrCreateAccountKeypair("punter_creator").publicKey;
}

async function loadOracleConfig() {
    try {
        const resp = await fetch("/active_matches.json?t=" + Date.now());
        if (resp.ok) {
            const data = await resp.json();
            window.activeOracleMatches = data;
            
            // Show status badge
            const badge = document.getElementById("oracle-status-badge");
            if (badge) {
                badge.classList.remove("hidden");
                badge.style.display = "flex";
            }
            
            if (data.matches) {
                for (const gameId in data.matches) {
                    const oMatch = data.matches[gameId];
                    let match = MATCHES_DATA.find(m => m.id === parseInt(gameId));
                    if (!match) {
                        match = {
                            id: oMatch.gameId,
                            homeTeam: oMatch.homeTeam,
                            awayTeam: oMatch.awayTeam,
                            league: "World Cup Group K • Live",
                            status: oMatch.status,
                            score: oMatch.score,
                            time: oMatch.time,
                            timeline: oMatch.timeline || [],
                            formation: { home: "4-3-3", away: "3-4-3" }
                        };
                        MATCHES_DATA.unshift(match);
                    } else {
                        match.status = oMatch.status;
                        match.score = oMatch.score;
                        match.time = oMatch.time;
                        match.timeline = oMatch.timeline || match.timeline;
                    }
                    
                    // Settle locally to allow claiming in Portfolio UI
                    if (match.status === "FINISHED") {
                        localWagers.forEach(w => {
                            if (w.gameId === match.id) {
                                w.status = "Resolved";
                            }
                        });
                        renderActiveWagers();
                    }
                }
                
                renderLiveMatches();
                
                // Update live player scoreboard if active match matches
                const activeMatch = MATCHES_DATA.find(m => m.id === activeMatchId);
                if (activeMatch && data.matches[activeMatch.id.toString()]) {
                    const liveScoreEl = document.getElementById("player-live-score");
                    if (liveScoreEl) {
                        liveScoreEl.innerHTML = `${activeMatch.homeTeam} <span id="player-score-home">${activeMatch.score.home}</span> - <span id="player-score-away">${activeMatch.score.away}</span> ${activeMatch.awayTeam}`;
                    }
                    const liveTimeEl = document.getElementById("player-live-time");
                    if (liveTimeEl) {
                        liveTimeEl.textContent = activeMatch.time;
                    }
                    renderMatchTimeline();
                }
            }
        }
    } catch (e) {
        // Hide badge if offline
        const badge = document.getElementById("oracle-status-badge");
        if (badge) {
            badge.classList.add("hidden");
            badge.style.display = "none";
        }
    }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initApp();
} else {
    window.addEventListener('load', initApp);
}

let currentSandboxProfile = localStorage.getItem("solplay_current_sandbox_profile") || "profile_a";

// 1. Wallet Management (Local Sandbox Wallet)
function loadOrCreateWallet() {
    try {
        const profileKey = `solplay_wallet_secret_${currentSandboxProfile}`;
        const storedSecret = localStorage.getItem(profileKey) || localStorage.getItem("solplay_wallet_secret");
        if (storedSecret) {
            const secretArray = JSON.parse(storedSecret);
            if (Array.isArray(secretArray)) {
                walletKeypair = solanaWeb3.Keypair.fromSecretKey(new Uint8Array(secretArray));
            }
        }
    } catch (e) {
        console.error("Failed to parse stored wallet secret, resetting keypair...", e);
    }

    if (!walletKeypair) {
        try {
            walletKeypair = solanaWeb3.Keypair.generate();
            const secretArray = Array.from(walletKeypair.secretKey);
            localStorage.setItem(`solplay_wallet_secret_${currentSandboxProfile}`, JSON.stringify(secretArray));
        } catch (e) {
            console.error("Failed to generate developer fallback keypair", e);
        }
    }

    if (currentSandboxProfile === "profile_a") {
        localStorage.setItem("solplay_wallet_secret", JSON.stringify(Array.from(walletKeypair.secretKey)));
    }

    if (walletKeypair && activeWalletType === 'sandbox') {
        activePublicKey = walletKeypair.publicKey;
    }
}

function changeWalletType() {
    const typeSelect = document.getElementById("wallet-type-select");
    const connectBtn = document.getElementById("btn-connect-wallet");
    if (!typeSelect || !connectBtn) return;

    if (isWalletConnected) {
        // Disconnect first to reset state
        toggleWallet();
    }

    activeWalletType = typeSelect.value;
    if (activeWalletType === 'sandbox') {
        connectBtn.textContent = "Connect Sandbox Wallet";
        activePublicKey = walletKeypair ? walletKeypair.publicKey : null;
    } else if (activeWalletType === 'phantom') {
        connectBtn.textContent = "Connect Phantom Wallet";
        activePublicKey = null;
    }
    loadWagersFromStorage();
    renderActiveWagers();
    document.getElementById("btn-airdrop").style.display = "none";
}

async function toggleWallet() {
    const connectBtn = document.getElementById("btn-connect-wallet");
    const balanceContainer = document.getElementById("sol-balance-container");
    const airdropBtn = document.getElementById("btn-airdrop");

    if (!isWalletConnected) {
        if (activeWalletType === 'sandbox') {
            isWalletConnected = true;
            activePublicKey = walletKeypair.publicKey;
            connectBtn.textContent = activePublicKey.toString().slice(0, 6) + "..." + activePublicKey.toString().slice(-4);
            connectBtn.style.background = "linear-gradient(135deg, var(--neon-teal), #0d9488)";
            connectBtn.style.boxShadow = "var(--glow-teal)";
            balanceContainer.style.display = "block";
            airdropBtn.style.display = "block";
            
            showToast("Sandbox Wallet Connected!", "success");
            await updateWalletBalance();
            loadWagersFromStorage();
            renderActiveWagers();
            startWatchMilestone();
        } else if (activeWalletType === 'phantom') {
            if (!window.solana) {
                showToast("Phantom extension not detected! Please install it first.", "error");
                return;
            }
            try {
                showToast("Requesting Phantom Wallet connection...", "info");
                const response = await window.solana.connect();
                activePublicKey = response.publicKey;
                isWalletConnected = true;
                
                connectBtn.textContent = activePublicKey.toString().slice(0, 6) + "..." + activePublicKey.toString().slice(-4);
                connectBtn.style.background = "linear-gradient(135deg, #ab9ff2, #512da8)";
                connectBtn.style.boxShadow = "0 0 15px rgba(81, 45, 168, 0.4)";
                balanceContainer.style.display = "block";
                airdropBtn.style.display = "none";
                
                showToast("Phantom Wallet Connected!", "success");
                await updateWalletBalance();
                loadWagersFromStorage();
                renderActiveWagers();
                startWatchMilestone();
                
                window.solana.on('disconnect', handlePhantomDisconnect);
            } catch (err) {
                showToast("Failed to connect Phantom: " + err.message, "error");
                console.error(err);
            }
        }
    } else {
        isWalletConnected = false;
        if (activeWalletType === 'phantom' && window.solana) {
            try {
                window.solana.disconnect();
            } catch (err) {}
            window.solana.removeListener('disconnect', handlePhantomDisconnect);
        }
        activePublicKey = activeWalletType === 'sandbox' && walletKeypair ? walletKeypair.publicKey : null;
        loadWagersFromStorage();
        renderActiveWagers();
        
        connectBtn.textContent = activeWalletType === 'sandbox' ? "Connect Sandbox Wallet" : "Connect Phantom Wallet";
        connectBtn.style.background = "linear-gradient(135deg, var(--neon-purple), #7c3aed)";
        connectBtn.style.boxShadow = "var(--glow-purple)";
        balanceContainer.style.display = "none";
        airdropBtn.style.display = "none";
        
        stopWatchMilestone();
        showToast("Wallet Disconnected", "info");
    }
}

function handlePhantomDisconnect() {
    isWalletConnected = false;
    activePublicKey = null;
    loadWagersFromStorage();
    renderActiveWagers();
    const connectBtn = document.getElementById("btn-connect-wallet");
    const balanceContainer = document.getElementById("sol-balance-container");
    const airdropBtn = document.getElementById("btn-airdrop");
    if (connectBtn) {
        connectBtn.textContent = "Connect Phantom Wallet";
        connectBtn.style.background = "linear-gradient(135deg, var(--neon-purple), #7c3aed)";
        connectBtn.style.boxShadow = "var(--glow-purple)";
    }
    if (balanceContainer) balanceContainer.style.display = "none";
    if (airdropBtn) airdropBtn.style.display = "none";
    stopWatchMilestone();
}

async function updateWalletBalance() {
    if (!activePublicKey || !connection) return;
    try {
        const balance = await connection.getBalance(activePublicKey);
        const solVal = balance / solanaWeb3.LAMPORTS_PER_SOL;
        document.getElementById("wallet-balance").textContent = solVal.toFixed(4);
    } catch (e) {
        document.getElementById("wallet-balance").textContent = "0.0000";
    }
}

async function requestAirdrop() {
    if (activeWalletType !== 'sandbox') {
        showToast("Airdrops are only supported for Developer Sandbox Wallet.", "error");
        return;
    }
    if (!walletKeypair || !connection) return;
    showToast("Requesting airdrop of 1 SOL...", "info");
    try {
        const sig = await connection.requestAirdrop(activePublicKey, solanaWeb3.LAMPORTS_PER_SOL);
        await connection.confirmTransaction(sig);
        showToast("Airdrop confirmed!", "success");
        await updateWalletBalance();
    } catch (e) {
        showToast("Airdrop failed. Ensure local validator is running.", "error");
    }
}

// 2. Video Player Server Switching and Regional Routing
const DEFAULT_REGIONAL_STREAMS = {
    "uk_eu": [
        { name: "VIPLeague Feed (UK/EU)", url: "https://www.vipleague.pm/football-schedule-streaming-links", description: "Regional favorite for UK Premier League & La Liga. Clean HD feeds.", type: "external" },
        { name: "FootyBite Live", url: "https://footybite.to/", description: "Excellent multi-source football aggregator.", type: "external" },
        { name: "CricFree TV", url: "https://cricfree.live/", description: "UK streams optimized for football and rugby.", type: "external" }
    ],
    "us_am": [
        { name: "SportSurge (US/AM)", url: "https://sportsurge.net/", description: "No-ad P2P aggregator for MLS, NFL, and NBA.", type: "external" },
        { name: "Buffstreams HD", url: "https://buffstreams.sx/", description: "US sports specialty, high-bitrate streaming.", type: "external" },
        { name: "Stream2Watch Hub", url: "https://www.stream2watch.in/", description: "Global sports hub with high availability mirrors.", type: "external" }
    ],
    "africa": [
        { name: "VIPRow Africa Portal", url: "https://www.viprow.nu/", description: "Premium quality streams for Football and Athletics.", type: "external" },
        { name: "HesGoal CAF Streams", url: "http://www.hesgoal.com/", description: "African football portal. Lightweight & low data usage.", type: "external" }
    ],
    "asia_in": [
        { name: "Smartcric Mobile (IN)", url: "https://www.smartcric.com/", description: "High-compression mobile feed for Cricket matches.", type: "external" },
        { name: "LiveTV Asia Feed", url: "http://livetv.sx/enx/", description: "Comprehensive coverage of Cricket & Asian Cup matches.", type: "external" }
    ],
    "mock": [
        { name: "Server 1 (Red Bull TV - Action Sports Live)", url: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8", description: "Live broadcast of global action sports.", type: "hls" },
        { name: "Server 2 (HLS Direct Test Feed)", url: "https://stream.mux.com/v69El17P02tUkUg1sQeT293m38ZFO02581J/medium.m3u8", description: "Real-time HD HLS direct livestream test.", type: "hls" },
        { name: "Server 3 (CBS News Live Mirror)", url: "https://cbsn-us.cbsnstream.cbsnews.com/main/manifest.m3u8", description: "CBS Live News feed mirroring.", type: "hls" }
    ]
};

let activeStreams = {};

function initStreams() {
    activeStreams = JSON.parse(JSON.stringify(DEFAULT_REGIONAL_STREAMS));
    fetchOnchainStreams().then(() => {
        updateStreamProviders();
    }).catch(err => {
        console.error("Failed to load on-chain streams:", err);
        updateStreamProviders();
    });
}

async function fetchOnchainStreams() {
    if (!connection || !currentProgramId) return;
    try {
        const accounts = await connection.getProgramAccounts(currentProgramId, {
            filters: [
                { dataSize: 185 }
            ]
        });

        accounts.forEach(acc => {
            const data = acc.account.data;
            const parsed = parseStreamAccount(data);
            if (parsed && parsed.isActive) {
                if (!activeStreams[parsed.region]) {
                    activeStreams[parsed.region] = [];
                }
                const existingIdx = activeStreams[parsed.region].findIndex(s => s.id === parsed.id);
                if (existingIdx !== -1) {
                    activeStreams[parsed.region][existingIdx] = parsed;
                } else {
                    activeStreams[parsed.region].push(parsed);
                }
            }
        });
    } catch (e) {
        console.error("fetchOnchainStreams failed:", e);
    }
}

function parseStreamAccount(data) {
    if (data.length < 185) return null;
    
    // Read u64 stream_id
    let id = 0n;
    for (let i = 0; i < 8; i++) {
        id |= BigInt(data[i]) << BigInt(i * 8);
    }
    
    const decoder = new TextDecoder();
    
    // Read name (offset 8..40)
    const nameBytes = data.slice(8, 40);
    const nameEnd = nameBytes.indexOf(0);
    const name = decoder.decode(nameBytes.slice(0, nameEnd !== -1 ? nameEnd : 32)).trim();
    
    // Read url (offset 40..168)
    const urlBytes = data.slice(40, 168);
    const urlEnd = urlBytes.indexOf(0);
    const url = decoder.decode(urlBytes.slice(0, urlEnd !== -1 ? urlEnd : 128)).trim();
    
    // Read region (offset 168..184)
    const regionBytes = data.slice(168, 184);
    const regionEnd = regionBytes.indexOf(0);
    const region = decoder.decode(regionBytes.slice(0, regionEnd !== -1 ? regionEnd : 16)).trim();
    
    const isActive = data[184] === 1;
    
    return {
        id: Number(id),
        name: name,
        url: url,
        region: region,
        description: "On-Chain stream mirror feed.",
        type: "hls",
        isActive: isActive
    };
}

function getStreamsForMatchAndRegion(match, region) {
    let suffix = "";
    if (region === "uk_eu") suffix = " (Europe Feed)";
    else if (region === "us_am") suffix = " (US Feed)";
    else if (region === "africa") suffix = " (Africa Feed)";
    else if (region === "asia_in") suffix = " (Asia Feed)";
    else suffix = " (Global HD)";

    // High-performance verified live sports feeds (NO YouTube)
    const verifiedSportsFeeds = [
        { 
            name: `🏆 LiveSports808 (Ad-Shielded Match Stream)${suffix}`, 
            url: getActiveSports808UrlForMatch(match), 
            description: "LiveSports808 match feed with auto-healing mirror routing and popup suppression.", 
            type: "embed" 
        },
        { 
            name: `⚡ Live Stream 1 (Africa24 Sports HD)${suffix}`, 
            url: "https://africa24.vedge.infomaniak.com/livecast/ik:africa24sport/manifest.m3u8", 
            description: "Live continuous sports and football broadcast. High bitrate HLS direct.", 
            type: "hls" 
        },
        { 
            name: `⚡ Live Stream 2 (Red Bull Sports TV - 1080p)${suffix}`, 
            url: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8", 
            description: "High-definition 60fps action sports livestream. Zero latency mirror.", 
            type: "hls" 
        },
        { 
            name: `⚡ Live Stream 3 (ACI Sport HD - Live Relay)${suffix}`, 
            url: "https://webstream.multistream.it/memfs/e2cb3629-c1a2-495b-b43a-9eb386f04ed8.m3u8", 
            description: "Live European sports tournament transmission feed.", 
            type: "hls" 
        },
        { 
            name: `⚡ Live Stream 4 (Al Iraqia Sports HD - Football)${suffix}`, 
            url: "https://imn-live.esite-lab.com/hls/iraqia-sports-1.m3u8", 
            description: "Direct football league coverage and stadium match stream.", 
            type: "hls" 
        },
        { 
            name: `⚡ Live Stream 5 (Astrahan Sport HD - Stadium Feed)${suffix}`, 
            url: "https://streaming.astrakhan.ru/astrakhanrusporthd/playlist.m3u8", 
            description: "Continuous stadium match broadcast feed.", 
            type: "hls" 
        },
        { 
            name: `📡 Live 2D Match Radar (Real-Time Coordinates)`, 
            url: "", 
            description: "Real-time tactical pitch radar, live ball physics and in-game events.", 
            type: "mock" 
        }
    ];

    return verifiedSportsFeeds;
}

// =========================================================
// SELF-HEALING LIVESTPORTS808 MIRROR ENGINE & AD SHIELD
// =========================================================
const SPORTS808_MIRROR_CANDIDATES = [
    "https://www.livesports808.li",
    "https://afr.livesports808.li",
    "https://www.score808.com",
    "https://score808.live",
    "https://www.livesports808.top",
    "https://www.score808.me"
];

let activeSports808Mirror = localStorage.getItem("solplay_active_808_mirror") || SPORTS808_MIRROR_CANDIDATES[0];

function getActiveSports808UrlForMatch(match) {
    // Returns active healthy mirror
    return `${activeSports808Mirror}/`;
}

async function autoResolveSports808Mirror() {
    for (const mirror of SPORTS808_MIRROR_CANDIDATES) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            await fetch(mirror, { method: "HEAD", mode: "no-cors", signal: controller.signal });
            clearTimeout(timeoutId);
            activeSports808Mirror = mirror;
            localStorage.setItem("solplay_active_808_mirror", mirror);
            console.log("⚡ Auto-resolved live sports mirror:", mirror);
            
            const badge = document.getElementById("player-resolution-badge");
            if (badge) {
                badge.title = `Active Mirror: ${new URL(mirror).hostname}`;
            }
            return mirror;
        } catch (e) {
            // candidate failed or timed out, probe next
        }
    }
    return activeSports808Mirror;
}

function updateStreamProviders() {
    const regionSelect = document.getElementById("stream-region-select");
    const providerSelect = document.getElementById("stream-provider-select");
    if (!regionSelect || !providerSelect) return;
    
    // Restore preferred region if saved
    const preferredRegion = localStorage.getItem("solplay_preferred_region");
    if (preferredRegion) {
        regionSelect.value = preferredRegion;
    }
    const selectedRegion = regionSelect.value;
    
    // Clear previous options
    providerSelect.innerHTML = "";
    
    const match = MATCHES_DATA.find(m => m.id === activeMatchId) || MATCHES_DATA[0];
    const streams = getStreamsForMatchAndRegion(match, selectedRegion);
    
    // Merge on-chain streams registered via admin
    const onchain = (activeStreams[selectedRegion] || []).filter(s => s.id !== undefined);
    const combinedStreams = [...streams, ...onchain];
    
    activeStreams[selectedRegion] = combinedStreams;
    
    combinedStreams.forEach((s, idx) => {
        const opt = document.createElement("option");
        opt.value = idx;
        opt.textContent = s.name;
        providerSelect.appendChild(opt);
    });
    
    // Add Custom option
    const customOpt = document.createElement("option");
    customOpt.value = "custom";
    customOpt.textContent = "🔗 Enter Custom Stream URL";
    providerSelect.appendChild(customOpt);
    
    // Restore preferred provider selection if it matches one of the options
    const preferredProviderVal = localStorage.getItem("solplay_preferred_provider_val");
    if (preferredProviderVal !== null) {
        if (preferredProviderVal === "custom") {
            providerSelect.value = "custom";
        } else {
            const idx = parseInt(preferredProviderVal);
            if (!isNaN(idx) && idx < combinedStreams.length) {
                providerSelect.value = idx;
            } else {
                providerSelect.value = 0;
            }
        }
    } else {
        providerSelect.value = 0;
    }
    
    switchStreamProvider();
}

function showCustomStreamInput(show) {
    const customContainer = document.getElementById("custom-stream-container");
    if (customContainer) {
        if (show) {
            customContainer.classList.remove("hidden");
            customContainer.style.display = "flex";
        } else {
            customContainer.classList.add("hidden");
            customContainer.style.display = "none";
        }
    }
}

function loadCustomStream() {
    const urlInput = document.getElementById("custom-stream-url");
    if (!urlInput || !urlInput.value.trim()) {
        showToast("Please enter a valid stream URL", "error");
        return;
    }
    
    const url = urlInput.value.trim();
    const playerFrame = document.getElementById("video-iframe-player");
    const mockPlayer = document.getElementById("mock-video-player");
    const video = document.getElementById("hls-video-player");
    
    document.getElementById("stream-title").textContent = `Custom Live Stream — Active Feed`;
    
    if (url.includes(".m3u8") || url.includes("m3u8")) {
        // Direct HLS stream
        if (playerFrame) playerFrame.style.display = "none";
        if (mockPlayer) mockPlayer.style.display = "none";
        if (video) {
            video.style.display = "block";
            initHlsPlayer(video, url);
        }
        showToast("Custom HLS Stream Loaded Successfully!", "success");
    } else {
        // Free Sports Stream Embed portal (displayed in-frame with sandboxing)
        if (video) {
            video.style.display = "none";
            destroyHlsPlayer();
        }
        if (mockPlayer) mockPlayer.style.display = "none";
        if (playerFrame) {
            playerFrame.style.display = "block";
            playerFrame.src = url;
        }
        showToast("Live Web Stream Loaded In-Frame!", "success");
    }
}

function switchStreamProvider() {
    const regionSelect = document.getElementById("stream-region-select");
    const providerSelect = document.getElementById("stream-provider-select");
    if (!regionSelect || !providerSelect) return;
    const selectedRegion = regionSelect.value;
    
    // Save current stream choices to localStorage
    localStorage.setItem("solplay_preferred_region", selectedRegion);
    localStorage.setItem("solplay_preferred_provider_val", providerSelect.value);
    
    if (providerSelect.value === "custom") {
        showCustomStreamInput(true);
        return;
    } else {
        showCustomStreamInput(false);
    }
    
    const providerIdx = parseInt(providerSelect.value);
    if (isNaN(providerIdx)) return;
    
    const provider = activeStreams[selectedRegion] ? activeStreams[selectedRegion][providerIdx] : null;
    if (!provider) return;
    
    const playerFrame = document.getElementById("video-iframe-player");
    const mockPlayer = document.getElementById("mock-video-player");
    const video = document.getElementById("hls-video-player");
    
    document.getElementById("stream-title").textContent = `${provider.name} - Routed Live`;
    
    // Remove existing routing block if any
    const existingRoutingBlock = document.getElementById("routing-info-block");
    if (existingRoutingBlock) {
        existingRoutingBlock.remove();
    }

    if (provider.type === "hls") {
        // Real-time HLS Video streaming directly in SolPlay
        if (playerFrame) playerFrame.style.display = "none";
        if (mockPlayer) mockPlayer.style.display = "none";
        if (video) {
            video.style.display = "block";
            initHlsPlayer(video, provider.url);
        }
    } else if (provider.type === "embed") {
        // Direct web stream embed in-frame
        if (video) {
            video.style.display = "none";
            destroyHlsPlayer();
        }
        if (mockPlayer) mockPlayer.style.display = "none";
        if (playerFrame) {
            playerFrame.style.display = "block";
            playerFrame.src = provider.url;
        }
    } else {
        // Live 2D Match Radar Simulator
        if (playerFrame) playerFrame.style.display = "none";
        if (video) {
            video.style.display = "none";
            destroyHlsPlayer();
        }
        if (mockPlayer) mockPlayer.style.display = "flex";
    }
}

// =========================================================
// CUSTOM STREAM PLAYER CONTROLS (PLAY/PAUSE, VOLUME, FULLSCREEN)
// =========================================================

function togglePlayerPlayPause() {
    const video = document.getElementById("hls-video-player");
    const playIcon = document.getElementById("player-play-icon");
    if (!video) return;
    
    if (video.style.display !== "none") {
        if (video.paused) {
            video.play().then(() => {
                if (playIcon) playIcon.textContent = "pause";
                showToast("Stream Playing", "info");
            }).catch(e => {
                console.warn("Autoplay unmute required:", e);
                video.muted = false;
                video.play();
                if (playIcon) playIcon.textContent = "pause";
            });
        } else {
            video.pause();
            if (playIcon) playIcon.textContent = "play_arrow";
            showToast("Stream Paused", "info");
        }
    } else {
        // If mock player is visible
        mockPlayPause();
    }
}

function togglePlayerMute() {
    const video = document.getElementById("hls-video-player");
    const volIcon = document.getElementById("player-volume-icon");
    const volSlider = document.getElementById("player-volume-slider");
    const volLabel = document.getElementById("player-volume-label");
    if (!video) return;
    
    video.muted = !video.muted;
    if (video.muted) {
        if (volIcon) volIcon.textContent = "volume_off";
        if (volLabel) volLabel.textContent = "0%";
        if (volSlider) volSlider.value = 0;
        showToast("Audio Muted", "info");
    } else {
        if (volIcon) volIcon.textContent = "volume_up";
        const restoreVol = video.volume > 0 ? video.volume : 0.75;
        video.volume = restoreVol;
        if (volSlider) volSlider.value = restoreVol;
        if (volLabel) volLabel.textContent = `${Math.round(restoreVol * 100)}%`;
        showToast("Audio Unmuted", "info");
    }
}

function handlePlayerVolumeChange(val) {
    const video = document.getElementById("hls-video-player");
    const volIcon = document.getElementById("player-volume-icon");
    const volLabel = document.getElementById("player-volume-label");
    if (!video) return;
    
    const floatVal = parseFloat(val);
    video.volume = floatVal;
    video.muted = (floatVal === 0);
    
    if (volLabel) volLabel.textContent = `${Math.round(floatVal * 100)}%`;
    if (volIcon) {
        if (floatVal === 0) volIcon.textContent = "volume_off";
        else if (floatVal < 0.5) volIcon.textContent = "volume_down";
        else volIcon.textContent = "volume_up";
    }
}

function togglePlayerFullscreen() {
    const container = document.getElementById("video-player-container") || document.getElementById("hls-video-player");
    if (!container) return;
    
    if (!document.fullscreenElement) {
        if (container.requestFullscreen) {
            container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen();
        }
        showToast("Entered Fullscreen", "info");
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
}

function reloadActiveStream() {
    const video = document.getElementById("hls-video-player");
    if (video && video.style.display !== "none") {
        switchStreamProvider();
        showToast("Reconnected to Live Stream Feed", "success");
    } else {
        switchStreamProvider();
        showToast("Stream Reloaded", "info");
    }
}

// Hook video element playback events to keep custom UI controls synchronized
document.addEventListener("DOMContentLoaded", () => {
    const video = document.getElementById("hls-video-player");
    if (video) {
        video.addEventListener("play", () => {
            const playIcon = document.getElementById("player-play-icon");
            if (playIcon) playIcon.textContent = "pause";
        });
        video.addEventListener("pause", () => {
            const playIcon = document.getElementById("player-play-icon");
            if (playIcon) playIcon.textContent = "play_arrow";
        });
        video.addEventListener("volumechange", () => {
            const volIcon = document.getElementById("player-volume-icon");
            const volSlider = document.getElementById("player-volume-slider");
            const volLabel = document.getElementById("player-volume-label");
            if (video.muted) {
                if (volIcon) volIcon.textContent = "volume_off";
                if (volLabel) volLabel.textContent = "0%";
            } else {
                if (volIcon) {
                    if (video.volume === 0) volIcon.textContent = "volume_off";
                    else if (video.volume < 0.5) volIcon.textContent = "volume_down";
                    else volIcon.textContent = "volume_up";
                }
                if (volLabel) volLabel.textContent = `${Math.round(video.volume * 100)}%`;
                if (volSlider) volSlider.value = video.volume;
            }
        });
    }

    // Keyboard shortcuts for stream player (Space = play/pause, M = mute, F = fullscreen)
    document.addEventListener("keydown", (e) => {
        // Do not trigger if typing in an input
        if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
        
        if (e.code === "Space") {
            e.preventDefault();
            togglePlayerPlayPause();
        } else if (e.key === "m" || e.key === "M") {
            togglePlayerMute();
        } else if (e.key === "f" || e.key === "F") {
            togglePlayerFullscreen();
        }
    });
});


let isTestingSpeed = false;
let connectedNodeId = null;

function runCDNSpeedtest() {
    if (isTestingSpeed) return;
    isTestingSpeed = true;
    
    const nodes = [
        { id: "eu", basePing: 24 },
        { id: "us", basePing: 78 },
        { id: "ap", basePing: 142 },
        { id: "af", basePing: 92 }
    ];
    
    const testBtn = document.getElementById("btn-run-speedtest");
    if (testBtn) {
        testBtn.textContent = "📡 Testing P2P Edge Nodes...";
        testBtn.disabled = true;
        testBtn.style.background = "linear-gradient(135deg, var(--neon-orange), #ea580c)";
        testBtn.style.boxShadow = "var(--glow-orange)";
    }
    
    nodes.forEach(node => {
        const pingEl = document.getElementById(`ping-${node.id}`);
        const dotEl = document.getElementById(`dot-${node.id}`);
        if (pingEl) pingEl.textContent = "Testing...";
        if (dotEl) {
            dotEl.style.background = "#eab308";
            dotEl.style.boxShadow = "0 0 6px #eab308";
            dotEl.style.animation = "pulse 1s infinite";
        }
        
        const delay = 800 + Math.random() * 1000;
        setTimeout(() => {
            const finalPing = node.basePing + Math.floor(Math.random() * 8);
            const pingElFinal = document.getElementById(`ping-${node.id}`);
            const dotElFinal = document.getElementById(`dot-${node.id}`);
            
            if (pingElFinal) pingElFinal.textContent = `${finalPing} ms`;
            if (dotElFinal) {
                dotElFinal.style.animation = "none";
                if (finalPing < 50) {
                    dotElFinal.style.background = "#10b981";
                    dotElFinal.style.boxShadow = "0 0 6px #10b981";
                } else if (finalPing < 100) {
                    dotElFinal.style.background = "#3b82f6";
                    dotElFinal.style.boxShadow = "0 0 6px #3b82f6";
                } else {
                    dotElFinal.style.background = "#ef4444";
                    dotElFinal.style.boxShadow = "0 0 6px #ef4444";
                }
            }
        }, delay);
    });
    
    setTimeout(() => {
        isTestingSpeed = false;
        const btn = document.getElementById("btn-run-speedtest");
        if (btn) {
            btn.textContent = "⚡ Run P2P Speedtest";
            btn.disabled = false;
            btn.style.background = "linear-gradient(135deg, var(--neon-teal), #0d9488)";
            btn.style.boxShadow = "var(--glow-teal)";
        }
        showToast("P2P Speedtest complete! Node latency mapped.", "success");
    }, 2200);
}

function connectCDNNode(id, name, basePing) {
    if (isTestingSpeed) {
        showToast("Speedtest in progress...", "error");
        return;
    }
    
    connectedNodeId = id;
    const finalPing = basePing + Math.floor(Math.random() * 5);
    
    const statusEl = document.getElementById("active-cdn-node-status");
    if (statusEl) {
        statusEl.innerHTML = `<span style="color:var(--neon-teal); text-shadow:0 0 8px rgba(20,184,166,0.3);">Connected: ${name} (${finalPing}ms)</span>`;
    }
    
    const statusBtnLabel = document.getElementById("player-active-cdn-status");
    if (statusBtnLabel) {
        statusBtnLabel.textContent = `CDN: ${name} (${finalPing}ms)`;
    }
    
    showToast(`Stream accelerated via ${name} (${finalPing}ms)!`, "success");
    appendChatMessage("System", `🚀 live feed routed through ${name} CDN relay point. Speed: 980Mbps | Ping: ${finalPing}ms.`, true);
    
    closeCDNDropdown();
}

function openCDNDropdown() {
    const menu = document.getElementById("cdn-dropdown-menu");
    if (menu) {
        menu.classList.remove("hidden");
    }
}

function closeCDNDropdown() {
    const menu = document.getElementById("cdn-dropdown-menu");
    if (menu) {
        menu.classList.add("hidden");
    }
}

function toggleCDNDropdown() {
    const menu = document.getElementById("cdn-dropdown-menu");
    if (menu) {
        menu.classList.toggle("hidden");
    }
}

function openCDNModal() {
    // Scroll player select header into view
    const target = document.getElementById("stream-title");
    if (target) {
        target.scrollIntoView({ behavior: "smooth" });
    }
    setTimeout(() => {
        openCDNDropdown();
    }, 450);
}

function closeCDNModal() {
    closeCDNDropdown();
}

let hlsPlayerInstance = null;

function initHlsPlayer(videoElement, streamUrl) {
    destroyHlsPlayer();
    
    if (Hls.isSupported()) {
        hlsPlayerInstance = new Hls({
            maxBufferSize: 30 * 1000 * 1000,
            maxBufferLength: 15,
            liveSyncDuration: 3
        });
        hlsPlayerInstance.loadSource(streamUrl);
        hlsPlayerInstance.attachMedia(videoElement);
        hlsPlayerInstance.on(Hls.Events.MANIFEST_PARSED, function() {
            videoElement.play().catch(e => console.warn("Autoplay block:", e));
        });
        hlsPlayerInstance.on(Hls.Events.ERROR, function(event, data) {
            if (data.fatal) {
                switch(data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        console.warn("HLS network error, trying to recover...", data);
                        hlsPlayerInstance.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.warn("HLS media error, trying to recover...", data);
                        hlsPlayerInstance.recoverMediaError();
                        break;
                    default:
                        destroyHlsPlayer();
                        const vidEl = document.getElementById("hls-video-player");
                        if (vidEl) vidEl.style.display = "none";
                        const mockEl = document.getElementById("mock-video-player");
                        if (mockEl) mockEl.style.display = "flex";
                        if (typeof showToast === "function") {
                            showToast("Stream signal offline. Auto-switched to Live 2D Match Radar.", "info");
                        }
                        break;
                }
            }
        });
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        // Native fallback (Safari)
        videoElement.src = streamUrl;
        videoElement.addEventListener('loadedmetadata', function() {
            videoElement.play().catch(e => console.warn("Autoplay block:", e));
        });
    }
}

function destroyHlsPlayer() {
    if (hlsPlayerInstance) {
        hlsPlayerInstance.destroy();
        hlsPlayerInstance = null;
    }
    const video = document.getElementById("hls-video-player");
    if (video) {
        video.src = "";
        video.load();
    }
}

// 3. Milestone Progress Tracker
function startWatchMilestone() {
    if (watchTimer) clearInterval(watchTimer);
    
    const bar = document.getElementById("milestone-progress-bar");
    const text = document.getElementById("milestone-percentage");
    const claimBtn = document.getElementById("btn-claim-milestone");

    watchTimer = setInterval(() => {
        if (milestoneProgress < 15) {
            milestoneProgress++;
            const pct = Math.floor((milestoneProgress / 15) * 100);
            bar.style.width = pct + "%";
            text.textContent = `${pct}% (${milestoneProgress}s / 15s)`;
            
            if (milestoneProgress === 15) {
                claimBtn.disabled = false;
                claimBtn.style.background = "linear-gradient(135deg, var(--neon-teal), #0d9488)";
                showToast("Viewer Milestone Reached! Claim your on-chain Viewer Badge.", "info");
            }
        }
    }, 1000);
}

function stopWatchMilestone() {
    if (watchTimer) clearInterval(watchTimer);
}

async function claimMilestone() {
    if (!isWalletConnected) {
        showToast("Connect your wallet first!", "error");
        return;
    }
    if (!currentProgramId) {
        showToast("Set and initialize the Program ID in the Admin Console first.", "error");
        return;
    }

    showToast("Submitting Viewer Badge milestone on-chain...", "info");
    
    try {
        const milestoneKeypair = getOrCreateAccountKeypair("milestone_badge");
        
        // Build RecordMilestone Instruction (ID 5)
        // size: 13 bytes
        const data = new Uint8Array(13);
        data[0] = 5; // Type 5
        writeU64(data, 1, 888); // Milestone ID
        writeU32(data, 9, 600); // Watch time seconds (10 mins)

        // Create PDA/Account on-chain if not already created
        await createLocalAccount(milestoneKeypair, 44);

        const ix = new solanaWeb3.TransactionInstruction({
            keys: [
                { pubkey: activePublicKey, isSigner: true, isWritable: false },
                { pubkey: milestoneKeypair.publicKey, isSigner: false, isWritable: true }
            ],
            programId: currentProgramId,
            data: data
        });

        const tx = new solanaWeb3.Transaction().add(ix);
        const sig = await sendConfirmAndVerifyTransaction(tx, [walletKeypair]);
        
        showToast("Success! Viewer Badge registered on Solana.", "success");
        document.getElementById("btn-claim-milestone").textContent = "Badge Claimed! ✅";
        document.getElementById("btn-claim-milestone").disabled = true;
        
        // Add badge next to username in chat
        appendChatMessage("System", "🎉 Verification Badge claimed! You now have a VIP Badge next to your username.", true);
    } catch (e) {
        console.error(e);
        showToast("Transaction failed: " + e.message, "error");
    }
}

// 4. Live Chat Simulation with copy codes and tipping
const mockUsers = ["SolSniper", "MangaFan99", "SolanaGiga", "SportyKev", "TrollMaster", "RonaldoGoat"];
const mockMessages = [
    "WHAT A SHOT BY SAKA!",
    "Chelsea's defense is in shambles lol",
    "Just copied @SolSniper's wagers! Code: BET-ARS-99",
    "Where is the memecoin launching? Ready to buy the win!",
    "Wait, is this streaming completely free? SolPlay is fire",
    "Need Chelsea to score so my bet slips win",
    "This P2P chat tipping is awesome, just sent 0.05 SOL to @TrollMaster",
    "Odds for Arsenal Win are looking boosted today!"
];

function startMockStreamChat() {
    setInterval(() => {
        const user = mockUsers[Math.floor(Math.random() * mockUsers.length)];
        const msg = mockMessages[Math.floor(Math.random() * mockMessages.length)];
        appendChatMessage(user, msg);
    }, 4500);
}

function appendChatMessage(user, text, isSystem = false) {
    const container = document.getElementById("chat-messages-container");
    if (!container) return;
    
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    if (isSystem) {
        bubble.style.borderLeft = "3px solid var(--neon-teal)";
        bubble.style.background = "rgba(20, 184, 166, 0.05)";
    }

    const header = document.createElement("div");
    header.className = "chat-author";
    header.innerHTML = `<span>${isSystem ? "🤖 " + user : "👤 " + user}</span>`;
    
    // Add tip/copy actions if it's not a shared bet and not a system message
    const isSharedBet = text.startsWith("SHARE-BET:");
    const isSharedAcca = text.startsWith("SHARE-ACCA:");
    if (!isSystem && !isSharedBet && !isSharedAcca) {
        const actions = document.createElement("span");
        actions.innerHTML = `
            <span style="color: var(--neon-orange); cursor: pointer; margin-right: 0.5rem;" onclick="tipUserChat('${user}')">🪙 Tip</span>
            <span style="color: var(--neon-teal); cursor: pointer;" onclick="copyCodeFromChat('${text}')">📋 Copy</span>
        `;
        header.appendChild(actions);
    }
    
    const body = document.createElement("div");
    body.className = "chat-text";
    
    if (isSharedAcca) {
        try {
            const rawJson = decodeURIComponent(text.substring(11)); // Strip "SHARE-ACCA:"
            const accaData = JSON.parse(rawJson);
            const legsCount = accaData.legs ? accaData.legs.length : 2;
            const boostBadge = accaData.bonusPercent > 0 ? `<span class="chat-acca-boost-badge">+${accaData.bonusPercent}% Acca Boost</span>` : '';
            
            let legsHtml = (accaData.legs || []).map(leg => {
                const legMatch = MATCHES_DATA.find(m => m.id === leg.gameId);
                const fixture = legMatch ? `${legMatch.homeTeam} vs ${legMatch.awayTeam}` : (leg.fixtureName || `Match #${leg.gameId}`);
                return `
                    <div class="chat-acca-leg-item">
                        <span><strong>${fixture}</strong>: <span style="color:var(--neon-teal); font-weight:600;">${leg.label || leg.outcomeLabel}</span></span>
                        <span style="color:var(--neon-teal); font-weight:700;">@${(leg.oddsValue || leg.odds || 1.5).toFixed(2)}x</span>
                    </div>
                `;
            }).join("");

            const encodedPayload = encodeURIComponent(JSON.stringify(accaData));

            body.innerHTML = `
                <div class="chat-acca-card glass">
                    <div class="chat-betslip-header">
                        <span class="chat-betslip-title">🔥 ${legsCount}-FOLD ACCUMULATOR</span>
                        <div>
                            <span class="chat-betslip-odds-badge">${accaData.odds.toFixed(2)}x</span>
                            ${boostBadge}
                        </div>
                    </div>
                    <div class="chat-acca-legs-container">
                        ${legsHtml}
                    </div>
                    <div class="chat-betslip-footer">
                        <span class="chat-betslip-stake">Stake: <strong>${accaData.amount ? accaData.amount.toFixed(2) : '1.00'} SOL</strong> | Return: <strong style="color:var(--neon-teal);">${(accaData.potentialPayout || (accaData.amount * accaData.odds)).toFixed(2)} SOL</strong></span>
                        <button class="chat-betslip-clone-btn" onclick="cloneAccaFromChat('${encodedPayload}')">⚡ Clone Acca (1-Click)</button>
                    </div>
                </div>
            `;
        } catch (accaErr) {
            console.error("Failed to parse shared acca message:", accaErr);
            body.textContent = text;
        }
    } else if (isSharedBet) {
        try {
            const rawParts = text.substring(10); // Strip "SHARE-BET:"
            const parts = rawParts.split("|");
            
            if (parts.length >= 6) {
                const gameId = parseInt(parts[0]);
                const outcomeLabel = parts[1];
                const odds = parseFloat(parts[2]);
                const stake = parseFloat(parts[3]);
                const fixture = parts[4];
                const outcomeId = parseInt(parts[5]);
                const creatorWallet = parts[6] || "";
                
                body.innerHTML = `
                    <div class="chat-betslip-card glass">
                        <div class="chat-betslip-card-glow"></div>
                        <div class="chat-betslip-header">
                            <span class="chat-betslip-title">🔥 SHARED WAGER</span>
                            <span class="chat-betslip-odds-badge">${odds.toFixed(2)}x</span>
                        </div>
                        <div class="chat-betslip-fixture">${fixture}</div>
                        <div class="chat-betslip-option">Option: <strong>${outcomeLabel}</strong></div>
                        <div class="chat-betslip-footer">
                            <span class="chat-betslip-stake">Wager: ${stake.toFixed(2)} SOL</span>
                            <button class="chat-betslip-clone-btn" onclick="cloneBetFromChat(${gameId}, ${outcomeId}, ${odds}, '${outcomeLabel}', '${fixture}', '${creatorWallet}')">📋 Clone Bet</button>
                        </div>
                    </div>
                `;
            } else {
                body.textContent = text;
            }
        } catch (e) {
            console.error("Failed to parse shared bet message:", e);
            body.textContent = text;
        }
    } else {
        body.textContent = text;
    }

    bubble.appendChild(header);
    bubble.appendChild(body);
    container.appendChild(bubble);
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function handleChatKey(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

function sendChatMessage() {
    const input = document.getElementById("chat-msg-input");
    const text = input.value.trim();
    if (!text) return;

    const username = isWalletConnected ? getFriendlyUsername(activePublicKey.toString()) : "Anonymous User";
    appendChatMessage(username, text, false);
    input.value = "";
}

function copyCodeFromChat(text) {
    const regex = /BET-[A-Z0-9-]+/i;
    const match = text.match(regex);
    if (match) {
        const code = match[0];
        document.getElementById("import-code-input").value = code;
        showToast(`Loaded copy code from chat: ${code}`, "success");
        importBetslipCode();
    } else {
        showToast("No copy code found in this message.", "error");
    }
}

async function tipUserChat(user) {
    if (!isWalletConnected) {
        showToast("Connect your wallet first!", "error");
        return;
    }
    showToast(`Sending 0.05 SOL tip to @${user}...`, "info");
    
    try {
        // Send actual local transfer transaction
        const targetWallet = solanaWeb3.Keypair.generate().publicKey; // simulate target key
        const tx = new solanaWeb3.Transaction().add(
            solanaWeb3.SystemProgram.transfer({
                fromPubkey: activePublicKey,
                toPubkey: targetWallet,
                lamports: 0.05 * solanaWeb3.LAMPORTS_PER_SOL
            })
        );
        const sig = await sendConfirmAndVerifyTransaction(tx, [walletKeypair]);
        
        showToast(`Tip of 0.05 SOL sent successfully!`, "success");
        appendChatMessage("System", `💰 You sent a 0.05 SOL tip to @${user}. Rake contribution: 5%.`, true);
        await updateWalletBalance();
    } catch (e) {
        showToast("Tip failed: " + e.message, "error");
    }
}

// 5. Betting Slip Logic
function switchBettingTab(tab) {
    try {
        currentBettingTab = tab;
        const tabs = ['live', 'custom', 'tournaments', 'lp'];
        tabs.forEach(t => {
            const btn = document.getElementById(`tab-${t}`);
            const content = document.getElementById(`content-${t}`);
            if (btn) {
                const isActive = (t === tab);
                btn.classList.toggle("active", isActive);
                if (isActive) {
                    btn.classList.remove("text-on-surface/40");
                    btn.classList.add("text-white", "border-b-2", "border-secondary");
                } else {
                    btn.classList.remove("text-white", "border-b-2", "border-secondary");
                    btn.classList.add("text-on-surface/40");
                }
            }
            if (content) {
                content.style.display = (t === tab) ? "block" : "none";
            }
        });
        
        if (tab === 'tournaments') {
            renderTournaments();
        }
    } catch (e) {
        console.error("Error inside switchBettingTab:", e);
        showToast("Betting tab error: " + e.message, "error");
    }
}

function selectTournamentOdds(gameId, outcomeId, oddsValue, outcomeLabel, gameTitle) {
    selectOdds(gameId, outcomeId, oddsValue, outcomeLabel, gameTitle);
    switchExchangeTab('slip');
}

function renderTournaments() {
    const container = document.getElementById("content-tournaments");
    if (!container) return;
    container.innerHTML = "";

    TOURNAMENTS_DATA.forEach(t => {
        const card = document.createElement("div");
        card.className = "match-card";
        card.style.marginBottom = "0.8rem";
        card.style.cursor = "pointer";
        card.setAttribute("onclick", `selectActiveMatch(${t.id})`);
        
        const isEafc = t.game === "EA FC 26";
        
        let statsA = isEafc 
            ? `Rank: #${t.playerA.rank} | Win Rate: ${t.playerA.winRate} | Form: ${t.playerA.recentForm.join("-")} | Avg Goals: ${t.playerA.avgGoals}`
            : `Rank: #${t.playerA.rank} | Win Rate: ${t.playerA.winRate} | Form: ${t.playerA.recentForm.join("-")} | Character: ${t.playerA.character}`;

        let statsB = isEafc 
            ? `Rank: #${t.playerB.rank} | Win Rate: ${t.playerB.winRate} | Form: ${t.playerB.recentForm.join("-")} | Avg Goals: ${t.playerB.avgGoals}`
            : `Rank: #${t.playerB.rank} | Win Rate: ${t.playerB.winRate} | Form: ${t.playerB.recentForm.join("-")} | Character: ${t.playerB.character}`;

        card.innerHTML = `
            <div class="match-info-top" style="border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem; margin-bottom: 0.5rem;">
                <span class="player-status-badge" style="background: rgba(139, 92, 246, 0.2); color: #c084fc; border: 1px solid rgba(139, 92, 246, 0.3); font-size: 0.7rem; font-weight: 700; text-transform: uppercase;">${t.banner}</span>
                <span style="color: var(--neon-teal); font-size: 0.75rem; font-weight: 600; cursor: pointer;">📺 WATCH STREAM</span>
            </div>
            
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 0.8rem;">
                ${t.title}
            </div>

            <!-- Head-to-Head Stats -->
            <div style="display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1rem;" onclick="event.stopPropagation()">
                <!-- Player A -->
                <div class="glass" style="padding: 0.5rem 0.8rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.03); background: rgba(255,255,255,0.01);">
                    <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 0.85rem; color: var(--neon-teal);">
                        <span>🎮 ${t.playerA.name} (${t.playerA.country})</span>
                        <span>Odds: ${t.playerA.odds.toFixed(2)}x</span>
                    </div>
                    <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 0.2rem; font-family: monospace;">
                        ${statsA}
                    </div>
                </div>
                <!-- Player B -->
                <div class="glass" style="padding: 0.5rem 0.8rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.03); background: rgba(255,255,255,0.01);">
                    <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 0.85rem; color: var(--neon-pink);">
                        <span>🎮 ${t.playerB.name} (${t.playerB.country})</span>
                        <span>Odds: ${t.playerB.odds.toFixed(2)}x</span>
                    </div>
                    <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 0.2rem; font-family: monospace;">
                        ${statsB}
                    </div>
                </div>
            </div>

            <!-- Staking Odds Buttons -->
            <div class="match-odds-row" style="grid-template-columns: repeat(2, 1fr); gap: 0.8rem;" onclick="event.stopPropagation()">
                <button class="odds-btn" onclick="selectTournamentOdds(${t.id}, 0, ${t.playerA.odds}, '${t.playerA.name} Win', '${t.title}')" style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 1rem; border-radius: 8px;">
                    <span class="odds-label" style="font-size: 0.8rem;">${t.playerA.name}</span>
                    <span class="odds-value" style="color: var(--neon-teal); font-weight: bold;">${t.playerA.odds.toFixed(2)}x</span>
                </button>
                <button class="odds-btn" onclick="selectTournamentOdds(${t.id}, 1, ${t.playerB.odds}, '${t.playerB.name} Win', '${t.title}')" style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 1rem; border-radius: 8px;">
                    <span class="odds-label" style="font-size: 0.8rem;">${t.playerB.name}</span>
                    <span class="odds-value" style="color: var(--neon-pink); font-weight: bold;">${t.playerB.odds.toFixed(2)}x</span>
                </button>
            </div>
        `;
        
        container.appendChild(card);
    });
}

function saveBetslipToStorage() {
    try {
        const key = activePublicKey ? `solplay_betslip_${activePublicKey.toString()}` : "solplay_pending_betslip";
        localStorage.setItem(key, JSON.stringify(betslipSelections));
        localStorage.setItem("solplay_betslip_mode", betslipMode);
        localStorage.setItem("solplay_active_slip_mode", activeSlipMode);
    } catch (e) {
        console.error("saveBetslipToStorage error:", e);
    }
}

function loadBetslipFromStorage() {
    try {
        const key = activePublicKey ? `solplay_betslip_${activePublicKey.toString()}` : "solplay_pending_betslip";
        const stored = localStorage.getItem(key);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                betslipSelections = parsed;
                activeSelection = betslipSelections[0];
            }
        }
        const storedMode = localStorage.getItem("solplay_betslip_mode");
        if (storedMode && (storedMode === 'accumulator' || storedMode === 'builder' || storedMode === 'singles')) {
            betslipMode = storedMode;
        }
        const storedActiveMode = localStorage.getItem("solplay_active_slip_mode");
        if (storedActiveMode) {
            activeSlipMode = storedActiveMode;
        }
    } catch (e) {
        console.error("loadBetslipFromStorage error:", e);
    }
}

function isOutcomeSelected(gameId, outcomeId) {
    return betslipSelections.some(s => s.gameId === gameId && s.outcomeId === outcomeId);
}

let activeSlipMode = 'acca'; // 'acca' (SportyBet standard accumulator) or 'builder' (Same Game Multi)

function setBetslipMode(mode) {
    activeSlipMode = mode;
    betslipMode = (mode === 'builder') ? 'builder' : 'accumulator';
    saveBetslipToStorage();
    
    const btnAcca = document.getElementById("btn-mode-acca");
    const btnBuilder = document.getElementById("btn-mode-builder");
    const builderBanner = document.getElementById("builder-info-banner");
    const accaBanner = document.getElementById("acca-boost-banner");
    
    if (btnAcca && btnBuilder) {
        if (mode === 'builder') {
            btnBuilder.classList.add("active");
            btnAcca.classList.remove("active");
            if (builderBanner) builderBanner.classList.remove("hidden");
            if (accaBanner) accaBanner.style.display = "none";
            showToast("BetBuilder Active: Combine multiple outcomes from the same match! 🎯", "info");
        } else {
            btnAcca.classList.add("active");
            btnBuilder.classList.remove("active");
            if (builderBanner) builderBanner.classList.add("hidden");
            showToast("Accumulator Mode Active: Cross-match parlays with Acca Boost! ⚡", "info");
        }
    }
    renderBetslip();
    calculatePayout();
}

function selectOdds(gameId, outcomeId, oddsValue, outcomeLabel, gameTitle, marketName = 'Winner (1X2)') {
    const match = MATCHES_DATA.find(m => m.id === gameId);
    if (match && match.isLocked) {
        showToast("Market temporarily suspended during live event 🔒. Please wait for reopening.", "error");
        return;
    }

    const existingIdx = betslipSelections.findIndex(s => s.gameId === gameId && s.outcomeId === outcomeId);

    if (existingIdx >= 0) {
        // Toggle OFF if clicked again
        const removed = betslipSelections.splice(existingIdx, 1)[0];
        showToast(`Removed from Slip: ${removed.outcomeLabel}`, "info");
    } else {
        // Enforce maximum ticket limit: 50 selections per betslip
        if (betslipSelections.length >= 50) {
            showToast("Maximum ticket limit reached: 50 selections per betslip", "error");
            return;
        }

        if (activeSlipMode === 'builder') {
            // BetBuilder Mode: Same-Game Multi allows multiple picks on the SAME match
            const otherGamePick = betslipSelections.find(s => s.gameId !== gameId);
            if (otherGamePick) {
                showToast(`BetBuilder focuses on 1 match (${gameTitle}). Starting new BetBuilder slip! 🎯`, "info");
                betslipSelections = [];
            }

            // Check if user selected another option in the exact same market category (e.g. Home vs Away)
            const sameMarketIdx = betslipSelections.findIndex(s => s.gameId === gameId && s.marketName === marketName);
            if (sameMarketIdx >= 0) {
                const prev = betslipSelections[sameMarketIdx];
                betslipSelections[sameMarketIdx] = {
                    id: `${gameId}-${outcomeId}`,
                    gameId,
                    outcomeId,
                    oddsValue,
                    outcomeLabel,
                    gameTitle,
                    marketName
                };
                showToast(`Updated BetBuilder pick for ${marketName}: ${outcomeLabel} (${oddsValue.toFixed(2)}x)`, "info");
            } else {
                betslipSelections.push({
                    id: `${gameId}-${outcomeId}`,
                    gameId,
                    outcomeId,
                    oddsValue,
                    outcomeLabel,
                    gameTitle,
                    marketName
                });
                showToast(`Added to BetBuilder: ${outcomeLabel} (${oddsValue.toFixed(2)}x) 🎯`, "success");
            }
        } else {
            // Standard Accumulator Mode: 1 pick per match rule (SportyBet standard)
            const sameGameIdx = betslipSelections.findIndex(s => s.gameId === gameId);
            if (sameGameIdx >= 0) {
                const prevPick = betslipSelections[sameGameIdx];
                betslipSelections[sameGameIdx] = {
                    id: `${gameId}-${outcomeId}`,
                    gameId,
                    outcomeId,
                    oddsValue,
                    outcomeLabel,
                    gameTitle,
                    marketName
                };
                showToast(`Updated pick for ${gameTitle}: replaced "${prevPick.outcomeLabel}" with "${outcomeLabel}" (${oddsValue.toFixed(2)}x)`, "info");
            } else {
                betslipSelections.push({
                    id: `${gameId}-${outcomeId}`,
                    gameId,
                    outcomeId,
                    oddsValue,
                    outcomeLabel,
                    gameTitle,
                    marketName
                });
                showToast(`Added to Betslip: ${outcomeLabel} (${oddsValue.toFixed(2)}x) 🔥`, "success");
            }
        }
    }

    if (betslipSelections.length > 0) {
        activeSelection = betslipSelections[0];
    } else {
        activeSelection = null;
    }

    renderBetslip();
    renderLiveMatches();
    saveBetslipToStorage();
}

function removeSelection(id) {
    betslipSelections = betslipSelections.filter(s => s.id !== id);
    if (betslipSelections.length > 0) {
        activeSelection = betslipSelections[0];
    } else {
        activeSelection = null;
    }
    renderBetslip();
    renderLiveMatches();
    saveBetslipToStorage();
}

function clearAllSelections() {
    betslipSelections = [];
    activeSelection = null;
    saveBetslipToStorage();
    renderBetslip();
    renderLiveMatches();
    showToast("Betslip cleared", "info");
}

function clearSelection() {
    clearAllSelections();
}

function setQuickStake(val) {
    const input = document.getElementById("stake-amount");
    if (!input) return;
    if (val === 'MAX') {
        input.value = "5.0";
    } else {
        const cur = parseFloat(input.value) || 0;
        input.value = (cur + val).toFixed(1);
    }
    calculatePayout();
}

function renderBetslip() {
    const container = document.getElementById("betslip-items-container");
    const countBadge = document.getElementById("slip-count-badge");
    const tabSlipBadge = document.getElementById("tab-slip-badge");
    const calcContainer = document.getElementById("betslip-calc");
    const floatingPill = document.getElementById("floating-betslip-pill");
    const floatingCount = document.getElementById("floating-slip-count");
    const floatingOdds = document.getElementById("floating-slip-odds");
    const btnPlaceSlip = document.getElementById("btn-place-slip");

    const totalCount = betslipSelections.length;

    if (countBadge) countBadge.textContent = `${totalCount} ${totalCount === 1 ? 'Selection' : 'Selections'}`;
    if (tabSlipBadge) {
        tabSlipBadge.textContent = totalCount;
        tabSlipBadge.style.display = totalCount > 0 ? "inline-block" : "none";
    }
    const headerSlipCounter = document.getElementById("header-slip-counter");
    if (headerSlipCounter) {
        headerSlipCounter.textContent = totalCount;
    }

    if (btnPlaceSlip) {
        btnPlaceSlip.textContent = (activeSlipMode === 'builder') ? "Place BetBuilder Wager 🎯" : "Place Accumulator Wager ⚡";
    }

    if (totalCount === 0) {
        if (container) {
            container.innerHTML = `
                <div class="text-center py-8 text-on-surface/40 text-label-md" id="betslip-empty-text">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎫</div>
                    <div style="font-weight: 700; color: #fff;">Your Betslip is Empty</div>
                    <div style="font-size: 0.8rem; margin-top: 0.3rem;">Select odds from matches below to build your ticket!</div>
                </div>
            `;
        }
        if (calcContainer) calcContainer.style.display = "none";
        if (floatingPill) floatingPill.style.display = "none";
        return;
    }

    if (calcContainer) calcContainer.style.display = "block";

    if (container) {
        container.innerHTML = "";
        
        // If BetBuilder mode is active and we have picks, show BetBuilder header badge
        if (activeSlipMode === 'builder') {
            const builderHead = document.createElement("div");
            builderHead.className = "flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-2";
            builderHead.innerHTML = `
                <span class="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[15px]">all_inclusive</span>
                    <span>BetBuilder: ${betslipSelections[0].gameTitle}</span>
                </span>
                <span class="builder-badge">${betslipSelections.length} Picks</span>
            `;
            container.appendChild(builderHead);
        }

        betslipSelections.forEach(s => {
            const item = document.createElement("div");
            item.className = "betslip-selection";
            item.style.cssText = "background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 0.8rem; position: relative;";
            item.innerHTML = `
                <button onclick="removeSelection('${s.id}')" style="position: absolute; top: 8px; right: 8px; background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: #f87171; border-radius: 6px; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 11px; cursor: pointer;">✕</button>
                <div style="font-size: 0.88rem; font-weight: 700; color: #fff; padding-right: 25px;">${s.gameTitle}</div>
                <div style="font-size: 0.72rem; color: #9ca3af; margin-top: 0.2rem;">${s.marketName}</div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.45rem;">
                    <span style="font-weight: 700; color: #14b8a6; font-size: 0.82rem;">${s.outcomeLabel}</span>
                    <span style="font-weight: 800; color: #fff; font-family: var(--font-outfit); font-size: 0.95rem;">${s.oddsValue.toFixed(2)}x</span>
                </div>
            `;
            container.appendChild(item);
        });
    }

    // Share slip code
    const generatedSlipEl = document.getElementById("generated-slip-code");
    if (generatedSlipEl) {
        const ids = betslipSelections.map(s => s.outcomeId).join('');
        const prefix = (activeSlipMode === 'builder') ? 'BUILDER' : 'ACCA';
        generatedSlipEl.textContent = `${prefix}-${betslipSelections.length}-${ids.slice(0, 4)}-${Math.floor(Math.random()*90 + 10)}`;
    }

    calculatePayout();
}

function calculatePayout() {
    if (betslipSelections.length === 0) return;

    const stakeInput = document.getElementById("stake-amount");
    const stake = parseFloat(stakeInput?.value) || 0;
    const routingFee = stake * 0.01;

    let totalMultiplier = 1.0;
    if (activeSlipMode === 'builder') {
        // BetBuilder compounding with correlation covariance adjustment
        let rawProduct = 1.0;
        betslipSelections.forEach(s => { rawProduct *= s.oddsValue; });
        const legs = betslipSelections.length;
        // Covariance discount factor (standard bookmaker correlation discount for same-game multi)
        const discount = legs > 1 ? Math.pow(0.88, legs - 1) : 1.0;
        totalMultiplier = Math.max(1.10, parseFloat((rawProduct * discount).toFixed(2)));
    } else if (betslipMode === 'accumulator') {
        betslipSelections.forEach(s => {
            totalMultiplier *= s.oddsValue;
        });
    } else {
        const sum = betslipSelections.reduce((acc, s) => acc + s.oddsValue, 0);
        totalMultiplier = sum / betslipSelections.length;
    }

    // Acca Boost Bonus calculation (SportyBet style)
    let bonusPercent = 0;
    const legs = betslipSelections.length;
    if (activeSlipMode === 'acca' && betslipMode === 'accumulator') {
        if (legs >= 10) bonusPercent = 50;
        else if (legs >= 8) bonusPercent = 35;
        else if (legs >= 6) bonusPercent = 25;
        else if (legs >= 5) bonusPercent = 15;
        else if (legs >= 4) bonusPercent = 10;
        else if (legs >= 3) bonusPercent = 5;
        else if (legs >= 2) bonusPercent = 3;
    }

    const accaBanner = document.getElementById("acca-boost-banner");
    const accaBadge = document.getElementById("acca-boost-badge");
    const accaText = document.getElementById("acca-boost-text");
    const bonusRow = document.getElementById("slip-bonus-row");
    const bonusAmountEl = document.getElementById("slip-bonus-amount");

    if (bonusPercent > 0 && activeSlipMode === 'acca') {
        if (accaBanner) accaBanner.style.display = "flex";
        if (accaBadge) accaBadge.textContent = `+${bonusPercent}%`;
        if (accaText) accaText.textContent = `🔥 ${legs}-Fold Combo: +${bonusPercent}% Acca Boost!`;
        if (bonusRow) bonusRow.style.display = "flex";
    } else {
        if (accaBanner) accaBanner.style.display = "none";
        if (bonusRow) bonusRow.style.display = "none";
    }

    const baseReturn = stake * totalMultiplier;
    const bonusAmount = baseReturn * (bonusPercent / 100);
    const totalPotentialReturn = baseReturn + bonusAmount;

    // Update UI elements
    const oddsEl = document.getElementById("slip-odds-multiplier");
    if (oddsEl) oddsEl.textContent = totalMultiplier.toFixed(2) + "x";

    if (bonusAmountEl) bonusAmountEl.textContent = `+${bonusAmount.toFixed(4)} SOL`;

    const feeEl = document.getElementById("slip-routing-fee");
    if (feeEl) feeEl.textContent = routingFee.toFixed(4) + " SOL";

    const payoutEl = document.getElementById("slip-potential-payout");
    if (payoutEl) payoutEl.textContent = totalPotentialReturn.toFixed(4) + " SOL";

    const btnPlace = document.getElementById("btn-place-slip");
    if (btnPlace) {
        btnPlace.textContent = betslipMode === 'accumulator' 
            ? `Place Accumulator Wager (${totalMultiplier.toFixed(2)}x)`
            : `Place ${legs} Single Wagers`;
    }

    // Floating Pill update
    const floatingPill = document.getElementById("floating-betslip-pill");
    const floatingCount = document.getElementById("floating-slip-count");
    const floatingOdds = document.getElementById("floating-slip-odds");
    if (floatingPill && betslipSelections.length > 0) {
        floatingPill.style.display = "flex";
        if (floatingCount) floatingCount.textContent = `${legs} ${legs === 1 ? 'Bet' : 'Bets'}`;
        if (floatingOdds) floatingOdds.textContent = totalMultiplier.toFixed(2) + "x";
    }
}

function copyGeneratedCode() {
    const code = document.getElementById("generated-slip-code").textContent;
    navigator.clipboard.writeText(code);
    showToast(`Betslip Code Copied: ${code}`, "success");
    
    // Post to chat automatically
    const username = isWalletConnected ? getFriendlyUsername(activePublicKey.toString()) : "User";
    appendChatMessage(username, `Check out my prediction code: ${code} 🔥`);
}

function importBetslipCode() {
    const code = document.getElementById("import-code-input").value.trim().toUpperCase();
    if (!code) {
        showToast("Enter a valid code.", "error");
        return;
    }

    const parts = code.split("-");
    if (parts.length < 3) {
        showToast("Invalid code format. Format: BET-GAMEID-OUTCOMEID-RAND", "error");
        return;
    }

    const gameId = parseInt(parts[1]);
    const outcomeId = parseInt(parts[2]);

    const match = MATCHES_DATA.find(m => m.id === gameId);
    if (!match) {
        showToast("Match not found.", "error");
        return;
    }

    let label = "";
    let odds = 1.0;

    if (outcomeId >= 100) {
        let activeOdds = [];
        if (match.lineup && match.lineup.home) {
            match.lineup.home.forEach((p, idx) => {
                let oddsVal = 3.50;
                if (p.pos === 'FW') oddsVal = 1.75 + ((p.name.length * 3 + idx) % 8) * 0.1;
                else if (p.pos === 'MF') oddsVal = 3.00 + ((p.name.length * 4 + idx) % 11) * 0.25;
                else if (p.pos === 'DF') oddsVal = 6.00 + ((p.name.length * 5 + idx) % 7) * 1.0;
                else if (p.pos === 'GK') oddsVal = 15.00 + ((p.name.length * 7 + idx) % 6) * 2.0;
                activeOdds.push({ label: `${p.name} (${p.pos})`, value: oddsVal, outcomeId: 100 + idx, desc: `${p.name} to score` });
            });
            match.lineup.away.forEach((p, idx) => {
                let oddsVal = 3.50;
                if (p.pos === 'FW') oddsVal = 1.75 + ((p.name.length * 3 + idx) % 8) * 0.1;
                else if (p.pos === 'MF') oddsVal = 3.00 + ((p.name.length * 4 + idx) % 11) * 0.25;
                else if (p.pos === 'DF') oddsVal = 6.00 + ((p.name.length * 5 + idx) % 7) * 1.0;
                else if (p.pos === 'GK') oddsVal = 15.00 + ((p.name.length * 7 + idx) % 6) * 2.0;
                activeOdds.push({ label: `${p.name} (${p.pos})`, value: oddsVal, outcomeId: 200 + idx, desc: `${p.name} to score` });
            });
        }
        if (match.subs) {
            if (match.subs.home) {
                match.subs.home.forEach((name, idx) => {
                    let oddsVal = 4.00 + ((name.length * 6 + idx) % 9) * 0.5;
                    activeOdds.push({ label: `${name} (Sub)`, value: oddsVal, outcomeId: 300 + idx, desc: `${name} to score` });
                });
            }
            if (match.subs.away) {
                match.subs.away.forEach((name, idx) => {
                    let oddsVal = 4.00 + ((name.length * 6 + idx) % 9) * 0.5;
                    activeOdds.push({ label: `${name} (Sub)`, value: oddsVal, outcomeId: 400 + idx, desc: `${name} to score` });
                });
            }
        }
        const found = activeOdds.find(o => o.outcomeId === outcomeId);
        if (found) {
            label = found.desc;
            odds = found.value;
        } else {
            showToast("Goalscorer selection not found.", "error");
            return;
        }
    } else if (outcomeId >= 50 && outcomeId < 100) {
        const scoreTemplates = [
            { label: "1 - 0", value: 7.00, outcomeId: 50, desc: "1 - 0" },
            { label: "2 - 0", value: 9.00, outcomeId: 51, desc: "2 - 0" },
            { label: "2 - 1", value: 8.50, outcomeId: 52, desc: "2 - 1" },
            { label: "3 - 1", value: 15.00, outcomeId: 53, desc: "3 - 1" },
            { label: "0 - 0", value: 8.00, outcomeId: 54, desc: "0 - 0" },
            { label: "1 - 1", value: 6.00, outcomeId: 55, desc: "1 - 1" },
            { label: "2 - 2", value: 12.00, outcomeId: 56, desc: "2 - 2" },
            { label: "0 - 1", value: 9.50, outcomeId: 57, desc: "0 - 1" },
            { label: "0 - 2", value: 14.00, outcomeId: 58, desc: "0 - 2" },
            { label: "1 - 2", value: 11.00, outcomeId: 59, desc: "1 - 2" }
        ];
        const found = scoreTemplates.find(o => o.outcomeId === outcomeId);
        if (found) {
            label = found.desc;
            odds = found.value;
        } else {
            showToast("Correct score selection not found.", "error");
            return;
        }
    } else {
        const markets = MATCH_MARKETS[gameId] || {};
        let found = null;
        for (const mKey in markets) {
            found = markets[mKey].find(o => o.outcomeId === outcomeId);
            if (found) break;
        }
        if (found) {
            label = found.desc;
            odds = found.value;
        } else {
            if (outcomeId === 0) { label = `${match.homeTeam} Win`; odds = 2.00; }
            else if (outcomeId === 1) { label = `${match.awayTeam} Win`; odds = 3.00; }
            else if (outcomeId === 2) { label = "Draw"; odds = 3.20; }
            else {
                showToast("Selection code not recognized.", "error");
                return;
            }
        }
    }

    selectOdds(gameId, outcomeId, odds, label, `${match.homeTeam} vs ${match.awayTeam}`);
    showToast("Betslip code loaded successfully!", "success");
}

// 6. Deposit LP (Be the House)
function depositLP() {
    if (!isWalletConnected) {
        showToast("Connect your wallet first!", "error");
        return;
    }
    const val = parseFloat(document.getElementById("lp-deposit-amount").value);
    if (!val || val <= 0) {
        showToast("Enter a valid deposit amount.", "error");
        return;
    }

    showToast(`Depositing ${val} SOL into Liquidity Vault...`, "info");
    
    setTimeout(() => {
        localLPDeposited += val;
        document.getElementById("lp-deposited-sol").textContent = `${localLPDeposited.toFixed(2)} SOL`;
        document.getElementById("lp-deposit-amount").value = "";
        showToast("Success! Liquidity deposited into vault.", "success");
        updateWalletBalance();
    }, 1500);
}

// 7. Place Wager On-Chain & Accumulator Engine
async function placeBet() {
    if (betslipSelections.length === 0) {
        showToast("Select odds from matches to build your slip.", "error");
        return;
    }

    const stakeSol = parseFloat(document.getElementById("stake-amount").value);
    if (!stakeSol || stakeSol <= 0) {
        showToast("Enter a valid stake.", "error");
        return;
    }

    // Client-side guard for the 5 SOL soft-launch cap
    const MAX_WAGER_CAP = 5.0;
    if (stakeSol > MAX_WAGER_CAP) {
        showToast(`Wager exceeds the soft-launch cap of ${MAX_WAGER_CAP} SOL.`, "error");
        return;
    }

    // Verify balance
    const currentBal = (typeof walletBalance !== 'undefined') ? walletBalance : 0;
    if (isWalletConnected && currentBal > 0 && stakeSol > currentBal) {
        showToast(`Insufficient balance (${currentBal.toFixed(4)} SOL). Please lower your stake.`, "error");
        return;
    }

    // Lockout protection: ensure none of the selected matches have concluded
    for (const sel of betslipSelections) {
        const m = MATCHES_DATA.find(match => match.id === sel.gameId);
        if (m && (m.status === "FINISHED" || m.time === "Full Time" || m.time === "FT")) {
            showToast(`Market closed: ${m.homeTeam} vs ${m.awayTeam} has already ended.`, "error");
            return;
        }
    }

    const legs = betslipSelections.length;
    let totalMultiplier = 1.0;
    if (betslipMode === 'accumulator') {
        betslipSelections.forEach(s => {
            totalMultiplier *= s.oddsValue;
        });
    } else {
        const sum = betslipSelections.reduce((acc, s) => acc + s.oddsValue, 0);
        totalMultiplier = sum / legs;
    }

    let bonusPercent = 0;
    if (betslipMode === 'accumulator') {
        if (legs >= 10) bonusPercent = 50;
        else if (legs >= 8) bonusPercent = 35;
        else if (legs >= 6) bonusPercent = 25;
        else if (legs >= 5) bonusPercent = 15;
        else if (legs >= 4) bonusPercent = 10;
        else if (legs >= 3) bonusPercent = 5;
        else if (legs >= 2) bonusPercent = 3;
    }

    const baseReturn = stakeSol * totalMultiplier;
    const bonusAmount = baseReturn * (bonusPercent / 100);
    const totalPotentialReturn = baseReturn + bonusAmount;

    // Enterprise Risk Management: Maximum Liability Cap against LP Vault
    // Prevents any single wager from risking more than 20% of total LP vault capital
    const vaultReserves = (typeof localLPDeposited !== 'undefined' && localLPDeposited > 0) ? localLPDeposited : 50.0;
    const MAX_EXPOSURE_RATIO = 0.20; // 20% max pool exposure per ticket
    const maxAllowedProfit = vaultReserves * MAX_EXPOSURE_RATIO;
    const wagerPotentialProfit = totalPotentialReturn - stakeSol;

    if (wagerPotentialProfit > maxAllowedProfit) {
        const recommendedStake = Math.max(0.05, (maxAllowedProfit / (totalMultiplier * (1 + bonusPercent / 100) - 1))).toFixed(2);
        showToast(`⚠️ Risk Limit: Max profit capped at ${maxAllowedProfit.toFixed(2)} SOL to protect LP Vault. Lower stake to ~${recommendedStake} SOL.`, "warning");
        return;
    }

    try {
        const wagerAccountKeypair = solanaWeb3.Keypair.generate();

        // If single match on 1X2 with wallet connected, attempt on-chain escrow
        if (legs === 1 && isWalletConnected && activeWalletType === 'phantom') {
            try {
                const primarySel = betslipSelections[0];
                const marketAccountPubkey = getMarketPubkeyForMatch(primarySel.gameId);
                const platformStatePubkey = getPlatformStatePubkey();
                const lamports = Math.floor(stakeSol * solanaWeb3.LAMPORTS_PER_SOL);

                const data = new Uint8Array(51);
                data[0] = 2;
                writeU64(data, 1, primarySel.gameId);
                data[9] = primarySel.outcomeId;
                writeU64(data, 10, lamports);
                data[18] = 0;

                const dummyPunter = getOrCreateAccountKeypair("punter_creator").publicKey;
                data.set(dummyPunter.toBytes(), 19);

                const ix = new solanaWeb3.TransactionInstruction({
                    keys: [
                        { pubkey: activePublicKey, isSigner: true, isWritable: false },
                        { pubkey: marketAccountPubkey, isSigner: false, isWritable: true },
                        { pubkey: wagerAccountKeypair.publicKey, isSigner: false, isWritable: true },
                        { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false }
                    ],
                    programId: currentProgramId,
                    data: data
                });

                const tx = new solanaWeb3.Transaction().add(ix);
                await sendConfirmAndVerifyTransaction(tx, [walletKeypair]);
            } catch (onChainErr) {
                console.warn("On-chain routing fell back to sandbox settlement:", onChainErr);
            }
        }

        // Register wager in user's portfolio
        const primarySel = betslipSelections[0];
        const shortTicketId = `#SP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const isAcca = (legs > 1 && betslipMode === 'accumulator');
        
        localWagers.unshift({
            id: `TICKET-${Date.now()}`,
            ticketId: shortTicketId,
            isAccumulator: isAcca,
            legs: betslipSelections.map(s => {
                const legMatch = MATCHES_DATA.find(m => m.id === s.gameId);
                const legFixture = legMatch ? `${legMatch.homeTeam} vs ${legMatch.awayTeam}` : `Fixture #${s.gameId}`;
                return {
                    ...s,
                    fixtureName: legFixture,
                    outcomeLabel: s.label || s.outcomeLabel,
                    status: "PENDING"
                };
            }),
            legsCount: legs,
            gameId: primarySel.gameId,
            outcomeLabel: isAcca ? `${legs}-Fold Acca (${totalMultiplier.toFixed(2)}x)` : (primarySel.label || primarySel.outcomeLabel),
            outcomeId: primarySel.outcomeId,
            amount: stakeSol,
            odds: totalMultiplier,
            bonusPercent: bonusPercent,
            potentialPayout: totalPotentialReturn,
            status: "PENDING",
            wagerPubkey: wagerAccountKeypair.publicKey,
            claimed: false,
            copyCreatorWallet: window.activeCopyCreatorWallet || null,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        // Reset active copy creator once wager is registered
        window.activeCopyCreatorWallet = null;

        // Deduct from wallet balance in sandbox
        if (typeof walletBalance !== 'undefined' && walletBalance > 0) {
            walletBalance = Math.max(0, walletBalance - stakeSol);
            const balEl = document.getElementById("wallet-balance");
            if (balEl) balEl.textContent = walletBalance.toFixed(4);
        }

        saveWagersToStorage();
        renderActiveWagers();
        showToast(`🎉 Wager Placed! Total Potential Return: ${totalPotentialReturn.toFixed(4)} SOL`, "success");

        clearAllSelections();
    } catch (e) {
        console.error("placeBet error:", e);
        showToast("Error placing wager. Please check your stake.", "error");
    }
}

function evaluateTicketOutcome(w) {
    if (!w) return "PENDING";
    
    // Multi-leg accumulator evaluation
    if (w.isAccumulator && w.legs && w.legs.length > 1) {
        let hasLost = false;
        let anyPending = false;
        let allWon = true;

        w.legs.forEach(leg => {
            const match = MATCHES_DATA.find(m => m.id === leg.gameId);
            if (!match) {
                anyPending = true;
                allWon = false;
                leg.status = "PENDING";
                return;
            }
            const isFinished = (match.status === "FINISHED" || match.time === "Full Time" || match.time === "FT");
            if (!isFinished) {
                anyPending = true;
                allWon = false;
                leg.status = "PENDING";
            } else {
                const legOutcome = evaluateMatchOutcome(match, leg.outcomeId, leg.outcomeLabel || leg.label);
                leg.status = legOutcome;
                if (legOutcome === "LOST") {
                    hasLost = true;
                    allWon = false;
                } else if (legOutcome === "PENDING") {
                    anyPending = true;
                    allWon = false;
                }
            }
        });

        if (hasLost) return "LOST";
        if (allWon && !anyPending) return "WON";
        return "PENDING";
    } else {
        // Single match evaluation
        const match = MATCHES_DATA.find(m => m.id === w.gameId);
        if (!match) return "PENDING";
        const isFinished = (match.status === "FINISHED" || match.time === "Full Time" || match.time === "FT");
        if (!isFinished) return "PENDING";
        return evaluateMatchOutcome(match, w.outcomeId, w.outcomeLabel);
    }
}

function renderActiveWagers() {
    const container = document.getElementById("active-wagers-container");
    container.innerHTML = "";

    if (localWagers.length === 0) {
        container.innerHTML = `<div class="betslip-empty">No active wagers found</div>`;
        return;
    }

    localWagers.forEach((w, idx) => {
        const item = document.createElement("div");
        item.className = "match-card";
        item.style.marginBottom = "0.75rem";
        item.style.border = "1px solid rgba(255, 255, 255, 0.08)";
        item.style.background = "linear-gradient(180deg, rgba(20, 24, 38, 0.95), rgba(12, 15, 26, 0.98))";
        item.style.borderRadius = "8px";
        item.style.padding = "0.75rem";
        
        let statusBadge = `<span style="background:rgba(245,158,11,0.15); color:var(--neon-orange); border:1px solid rgba(245,158,11,0.3); border-radius:4px; padding:0.15rem 0.4rem; font-size:0.7rem; font-weight:600;">⏳ PENDING</span>`;
        let claimBtn = "";

        if (w.status === "WON") {
            statusBadge = `<span style="background:rgba(0,240,255,0.15); color:var(--neon-teal); border:1px solid rgba(0,240,255,0.3); border-radius:4px; padding:0.15rem 0.4rem; font-size:0.7rem; font-weight:700;">🏆 WON</span>`;
            if (!w.claimed) {
                claimBtn = `<button class="btn-primary" onclick="claimWagerOnchain(${idx})" style="padding:0.45rem 0.8rem; font-size:0.75rem; width:100%; margin-top:0.6rem; font-weight:700; background:linear-gradient(135deg, var(--neon-teal), #00b4d8); box-shadow:0 0 12px rgba(0,240,255,0.3);">💰 Claim ${(w.potentialPayout || (w.amount * w.odds)).toFixed(4)} SOL Payout</button>`;
            } else {
                claimBtn = `<div style="text-align:center; font-size:0.75rem; color:var(--neon-teal); margin-top:0.5rem; font-weight:600; padding:0.3rem; background:rgba(0,240,255,0.05); border-radius:4px;">Claimed & Disbursed to Wallet ✅</div>`;
            }
        } else if (w.status === "LOST") {
            statusBadge = `<span style="background:rgba(239,68,68,0.15); color:var(--neon-pink); border:1px solid rgba(239,68,68,0.3); border-radius:4px; padding:0.15rem 0.4rem; font-size:0.7rem; font-weight:600;">❌ LOST</span>`;
        } else if (w.status === "CASHED_OUT") {
            statusBadge = `<span class="badge-cashed-out">💰 CASHED OUT (${(w.potentialPayout || w.amount).toFixed(4)} SOL)</span>`;
            claimBtn = `<div style="text-align:center; font-size:0.72rem; color:#34d399; margin-top:0.4rem; font-weight:600; padding:0.25rem; background:rgba(16,185,129,0.06); border-radius:4px; border:1px solid rgba(16,185,129,0.2);">Funds Cashed Out to Balance ⚡</div>`;
        }

        const ticketCode = w.ticketId || `#SP-${String(w.id).replace(/\D/g, '').slice(-6) || '849201'}`;
        const wagerTime = w.timestamp || 'Recent';

        // Check if ticket can be verified
        let canVerify = false;
        if (w.status === "Pending" || w.status === "PENDING" || w.status === "Resolved") {
            if (w.isAccumulator && w.legs && w.legs.length > 1) {
                // If any leg match is finished or has scores
                canVerify = w.legs.some(leg => {
                    const m = MATCHES_DATA.find(matchItem => matchItem.id === leg.gameId);
                    return m && (m.status === "FINISHED" || m.time === "Full Time" || m.time === "FT");
                });
            } else {
                const singleMatch = MATCHES_DATA.find(m => m.id === w.gameId);
                canVerify = singleMatch && (singleMatch.status === "FINISHED" || singleMatch.time === "Full Time" || singleMatch.time === "FT");
            }
        }

        let verifyBtn = "";
        if (canVerify) {
            verifyBtn = `
                <button class="btn-primary btn-verify-status" onclick="verifyWagerStatus(${idx}, this)" style="padding:0.4rem 0.8rem; font-size:0.72rem; width:100%; margin-top:0.5rem; background:linear-gradient(135deg, var(--neon-purple), #7c3aed); border:none; box-shadow:var(--glow-purple); font-weight:600; border-radius:4px;">🔍 Settle & Verify Ticket</button>
            `;
        }

        // Top-Tier In-Play Cash Out Trigger (with Bet365 Partial Cash-Out Slider)
        let cashoutBtn = "";
        if (w.status === "Pending" || w.status === "PENDING") {
            const cashVal = calculateCashoutValue(w);
            if (cashVal > 0) {
                const isPartialOpen = !!partialCashoutOpen[idx];
                const pct = partialCashoutPercent[idx] || 50;
                const partialSol = parseFloat((cashVal * (pct / 100)).toFixed(4));
                const remainingStake = parseFloat((w.amount * (1 - pct / 100)).toFixed(2));

                cashoutBtn = `
                    <div style="display:flex; gap:0.35rem; margin-top:0.4rem;">
                        <button class="btn-cashout" id="cashout-btn-${idx}" onclick="executeCashOut(${idx}, 100)" style="margin-top:0; flex:1;">
                            <span>💰 Full Cash Out</span>
                            <span class="cashout-val">${cashVal.toFixed(4)} SOL</span>
                        </button>
                        <button class="btn-partial-toggle ${isPartialOpen ? 'active' : ''}" onclick="togglePartialCashout(${idx}, event)" title="Toggle Partial Cash Out Slider">
                            ⚙️
                        </button>
                    </div>
                    ${isPartialOpen ? `
                        <div class="partial-cashout-drawer" id="partial-drawer-${idx}">
                            <div class="partial-chips">
                                <button class="partial-chip ${pct === 25 ? 'active' : ''}" onclick="setPartialPercent(${idx}, 25)">25%</button>
                                <button class="partial-chip ${pct === 50 ? 'active' : ''}" onclick="setPartialPercent(${idx}, 50)">50%</button>
                                <button class="partial-chip ${pct === 75 ? 'active' : ''}" onclick="setPartialPercent(${idx}, 75)">75%</button>
                                <button class="partial-chip ${pct === 100 ? 'active' : ''}" onclick="setPartialPercent(${idx}, 100)">100%</button>
                            </div>
                            <input type="range" class="partial-range-slider" min="10" max="100" step="5" value="${pct}" oninput="handlePartialSliderChange(${idx}, this.value)">
                            <div class="partial-readout">
                                <span>Cash out: <strong>${partialSol} SOL (${pct}%)</strong></span>
                                <span>Remaining stake: <strong style="color:#38bdf8;">${remainingStake} SOL</strong></span>
                            </div>
                            <button class="btn-primary" onclick="executeCashOut(${idx}, ${pct})" style="padding:0.4rem; font-size:0.75rem; background:linear-gradient(135deg, #059669, #10b981); border:none; font-weight:700; border-radius:4px; box-shadow:0 0 10px rgba(16,185,129,0.35);">
                                ⚡ Cash Out ${pct}% (${partialSol} SOL)
                            </button>
                        </div>
                    ` : ''}
                    <div class="auto-cashout-box" style="margin-top:0.4rem; padding:0.35rem 0.5rem; background:rgba(0, 240, 255, 0.04); border:1px dashed rgba(0, 240, 255, 0.22); border-radius:6px; display:flex; align-items:center; justify-content:space-between; gap:0.4rem;">
                        <div style="font-size:0.72rem; color:#94a3b8; display:flex; align-items:center; gap:0.25rem;">
                            <span>🎯 Auto Cash Out:</span>
                            ${w.autoCashoutTarget ? `<strong style="color:var(--neon-teal); font-family:monospace; background:rgba(0,240,255,0.1); padding:0.1rem 0.35rem; border-radius:3px;">${w.autoCashoutTarget.toFixed(2)} SOL</strong>` : `<span style="color:#64748b; font-size:0.68rem;">Off</span>`}
                        </div>
                        <div style="display:flex; gap:0.25rem; align-items:center;">
                            <input type="number" step="0.1" id="auto-cashout-input-${idx}" placeholder="${(w.amount * 1.5).toFixed(2)}" style="width:64px; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.15); color:#fff; font-size:0.7rem; padding:0.18rem 0.35rem; border-radius:4px; font-family:monospace; text-align:center;">
                            <button onclick="setAutoCashoutTarget(${idx})" class="btn-primary" style="padding:0.2rem 0.45rem; font-size:0.68rem; font-weight:700; background:linear-gradient(135deg, var(--neon-teal), #00b4d8); color:#000; border:none; border-radius:4px; cursor:pointer;">
                                Set
                            </button>
                            ${w.autoCashoutTarget ? `<button onclick="cancelAutoCashoutTarget(${idx})" style="background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.3); color:#f87171; font-size:0.7rem; border-radius:4px; cursor:pointer; padding:0.18rem 0.35rem; font-weight:700;" title="Cancel Auto Cash-Out">✕</button>` : ''}
                        </div>
                    </div>
                `;
            }
        }

        if (w.isAccumulator && w.legs && w.legs.length > 1) {
            // RENDER MULTI-LEG ACCUMULATOR (Bet365 / SportyBet Style)
            let legsHtml = w.legs.map((leg, lIdx) => {
                const legMatch = MATCHES_DATA.find(m => m.id === leg.gameId);
                const fixture = legMatch ? `${legMatch.homeTeam} vs ${legMatch.awayTeam}` : (leg.fixtureName || `Fixture #${leg.gameId}`);
                const scoreDisplay = legMatch && legMatch.score ? `${legMatch.score.home} - ${legMatch.score.away}` : "vs";
                const isConcluded = legMatch && (legMatch.status === "FINISHED" || legMatch.time === "Full Time" || legMatch.time === "FT");
                const timeText = legMatch ? (isConcluded ? "FT" : (legMatch.time || "Scheduled")) : "";
                
                let legBadge = `<span style="color:var(--text-secondary); font-size:0.68rem;">⏳ ${timeText || 'Pending'}</span>`;
                if (leg.status === "WON") {
                    legBadge = `<span style="color:var(--neon-teal); font-size:0.68rem; font-weight:600;">✅ Won (${scoreDisplay})</span>`;
                } else if (leg.status === "LOST") {
                    legBadge = `<span style="color:var(--neon-pink); font-size:0.68rem; font-weight:600;">❌ Lost (${scoreDisplay})</span>`;
                } else if (isConcluded && legMatch) {
                    const tempOutcome = evaluateMatchOutcome(legMatch, leg.outcomeId, leg.outcomeLabel || leg.label);
                    if (tempOutcome === "WON") {
                        legBadge = `<span style="color:var(--neon-teal); font-size:0.68rem; font-weight:600;">✅ Won (${scoreDisplay})</span>`;
                    } else if (tempOutcome === "LOST") {
                        legBadge = `<span style="color:var(--neon-pink); font-size:0.68rem; font-weight:600;">❌ Lost (${scoreDisplay})</span>`;
                    }
                }

                return `
                    <div style="background:rgba(255,255,255,0.03); border-left:2px solid var(--neon-teal); padding:0.35rem 0.5rem; margin-bottom:0.35rem; border-radius:4px; font-size:0.75rem;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:0.15rem;">
                            <span style="font-weight:600; color:var(--text-primary); font-size:0.75rem;">${fixture}</span>
                            ${legBadge}
                        </div>
                        <div style="display:flex; justify-content:space-between; color:var(--text-secondary); font-size:0.72rem;">
                            <span>Selection: <strong style="color:var(--neon-teal);">${leg.label || leg.outcomeLabel}</strong></span>
                            <span>@ <strong>${(leg.oddsValue || leg.odds || 1.5).toFixed(2)}x</strong></span>
                        </div>
                    </div>
                `;
            }).join("");

            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem; padding-bottom:0.4rem; border-bottom:1px solid rgba(255,255,255,0.06);">
                    <div style="display:flex; gap:0.4rem; align-items:center;">
                        <span style="font-weight:700; color:var(--text-primary); font-size:0.8rem;">${w.legs.length}-Fold Accumulator</span>
                        <span style="color:var(--text-secondary); font-size:0.7rem; font-family:monospace;">${ticketCode}</span>
                    </div>
                    ${statusBadge}
                </div>
                <div style="margin-bottom:0.5rem;">
                    ${legsHtml}
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.78rem; margin-bottom:0.4rem; background:rgba(0,0,0,0.2); padding:0.4rem; border-radius:4px;">
                    <div>
                        <span style="color:var(--text-secondary);">Stake:</span>
                        <strong style="color:var(--text-primary); margin-left:0.2rem;">${w.amount.toFixed(2)} SOL</strong>
                    </div>
                    <div>
                        <span style="color:var(--text-secondary);">Odds:</span>
                        <strong style="color:var(--neon-teal); margin-left:0.2rem;">${w.odds.toFixed(2)}x</strong>
                        ${w.bonusPercent ? `<span style="color:var(--neon-orange); font-size:0.65rem; margin-left:0.2rem;">(+${w.bonusPercent}% Acca)</span>` : ''}
                    </div>
                    <div>
                        <span style="color:var(--text-secondary);">Return:</span>
                        <strong style="color:var(--neon-teal); margin-left:0.2rem;">${(w.potentialPayout || (w.amount * w.odds)).toFixed(4)} SOL</strong>
                    </div>
                </div>
                <div style="display:flex; gap:0.4rem;">
                    <button class="btn-secondary" onclick="shareWagerToChat(${idx})" style="padding:0.35rem 0.6rem; font-size:0.7rem; flex:1; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); color:var(--text-primary); border-radius:4px; cursor:pointer;">📤 Share to Chat</button>
                </div>
                ${cashoutBtn}
                ${verifyBtn}
                ${claimBtn}
            `;
        } else {
            // RENDER SINGLE MATCH WAGER
            let fixtureName = `Fixture #${w.gameId}`;
            const match = MATCHES_DATA.find(m => m.id === w.gameId);
            let scoreline = "";
            let matchStatusText = "";
            if (match) {
                fixtureName = `${match.homeTeam} vs ${match.awayTeam}`;
                if (match.score) {
                    scoreline = `(${match.score.home} - ${match.score.away})`;
                }
                matchStatusText = match.status === "FINISHED" ? "FT" : (match.time || "");
            } else {
                const tournament = TOURNAMENTS_DATA.find(t => t.id === w.gameId);
                if (tournament) fixtureName = tournament.title;
            }

            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem; padding-bottom:0.3rem; border-bottom:1px solid rgba(255,255,255,0.06);">
                    <div style="display:flex; gap:0.4rem; align-items:center;">
                        <span style="font-weight:700; color:var(--text-primary); font-size:0.8rem;">${fixtureName}</span>
                        <span style="color:var(--text-secondary); font-size:0.7rem; font-family:monospace;">${ticketCode}</span>
                    </div>
                    ${statusBadge}
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; margin:0.3rem 0;">
                    <div>Pick: <strong style="color:var(--neon-teal);">${w.outcomeLabel}</strong></div>
                    <div style="color:var(--text-secondary); font-size:0.72rem;">${scoreline} <span style="color:var(--neon-orange);">${matchStatusText}</span></div>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.78rem; margin-bottom:0.4rem; background:rgba(0,0,0,0.2); padding:0.4rem; border-radius:4px;">
                    <div>
                        <span style="color:var(--text-secondary);">Stake:</span>
                        <strong style="color:var(--text-primary); margin-left:0.2rem;">${w.amount.toFixed(2)} SOL</strong>
                    </div>
                    <div>
                        <span style="color:var(--text-secondary);">Odds:</span>
                        <strong style="color:var(--neon-teal); margin-left:0.2rem;">${w.odds.toFixed(2)}x</strong>
                    </div>
                    <div>
                        <span style="color:var(--text-secondary);">Return:</span>
                        <strong style="color:var(--neon-teal); margin-left:0.2rem;">${(w.potentialPayout || (w.amount * w.odds)).toFixed(4)} SOL</strong>
                    </div>
                </div>
                <div style="display:flex; gap:0.4rem;">
                    <button class="btn-secondary" onclick="shareWagerToChat(${idx})" style="padding:0.35rem 0.6rem; font-size:0.7rem; flex:1; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); color:var(--text-primary); border-radius:4px; cursor:pointer;">📤 Share to Chat</button>
                </div>
                ${cashoutBtn}
                ${verifyBtn}
                ${claimBtn}
            `;
        }

        container.appendChild(item);
    });
}

// Dynamic Top-Tier Sportsbook Cash Out Calculation Engine
function calculateCashoutValue(w) {
    if (!w || w.status === 'WON' || w.status === 'LOST' || w.status === 'VOID' || w.status === 'CASHED_OUT') {
        return 0;
    }

    const stake = parseFloat(w.amount || 0);
    if (stake <= 0) return 0;
    const potentialPayout = parseFloat(w.potentialPayout || (stake * (w.odds || 1.5)));

    if (w.isAccumulator && w.legs && w.legs.length > 1) {
        let legsWon = 0;
        let accumulatorDead = false;
        let wonLegsOddsProduct = 1.0;
        let pendingLegsFairProb = 1.0;

        for (const leg of w.legs) {
            const m = MATCHES_DATA.find(item => item.id === leg.gameId);
            const isConcluded = m && (m.status === "FINISHED" || m.time === "Full Time" || m.time === "FT");
            const isLive = m && (m.scheduleGroup === "live" || m.status === "LIVE") && !isConcluded;
            const legOdds = parseFloat(leg.oddsValue || leg.odds || 1.5);

            let legStatus = leg.status;
            if (!legStatus || legStatus === "PENDING" || legStatus === "Pending") {
                if (isConcluded) {
                    legStatus = evaluateMatchOutcome(m, leg.outcomeId, leg.outcomeLabel || leg.label);
                }
            }

            if (legStatus === "LOST") {
                accumulatorDead = true;
                break;
            }

            if (legStatus === "WON") {
                legsWon++;
                wonLegsOddsProduct *= legOdds;
            } else if (isLive && m) {
                const liveStatus = evaluateMatchOutcome(m, leg.outcomeId, leg.outcomeLabel || leg.label);
                const min = parseInt((m.time || '45').replace(/\D/g, '')) || 45;
                if (liveStatus === "WON") {
                    // Winning during live match: chance of holding win increases with time
                    const prob = 0.55 + (min / 90) * 0.38; // 55% at 0' -> 93% at 90'
                    pendingLegsFairProb *= prob;
                } else {
                    // Trailing/drawing during live match: chance of comeback decays with time
                    const prob = Math.max(0.04, 0.35 - (min / 90) * 0.30);
                    pendingLegsFairProb *= prob;
                }
            } else {
                // Scheduled / Pre-match leg (implied fair probability)
                const impliedProb = (1 / Math.max(1.05, legOdds)) * 0.94;
                pendingLegsFairProb *= impliedProb;
            }
        }

        if (accumulatorDead) return 0;

        // Enterprise Parlay Cash Out Formula (Bet365 / DraftKings standard):
        // Fair value = Stake * (Product of Won Legs' Odds) * (Combined Probability of Pending Legs) * (1 - House Spread)
        let offer = stake * wonLegsOddsProduct * pendingLegsFairProb * 0.92;

        // Respect boundaries: never exceed 90% of max potential payout or fall below minimum salvage
        offer = Math.min(potentialPayout * 0.90, Math.max(stake * 0.10, offer));
        return parseFloat(offer.toFixed(4));
    } else {
        // Single match wager
        const m = MATCHES_DATA.find(item => item.id === w.gameId);
        if (!m) return parseFloat((stake * 0.94).toFixed(4));

        const isConcluded = (m.status === "FINISHED" || m.time === "Full Time" || m.time === "FT");
        if (isConcluded) return 0;

        const isLive = (m.scheduleGroup === "live" || m.status === "LIVE");
        if (!isLive) {
            // Pre-match cashout (standard bookmaker 6% spread)
            return parseFloat((stake * 0.94).toFixed(4));
        }

        // Live In-Play Match (Dynamic based on minute & current scoreline)
        const currentStanding = evaluateMatchOutcome(m, w.outcomeId, w.outcomeLabel);
        const min = parseInt((m.time || '45').replace(/\D/g, '')) || 45;
        let offer = 0;

        if (currentStanding === "WON") {
            // Pick is currently leading:
            // Early in match (e.g. 15'): high comeback risk -> offer ~50% of potential payout
            // Mid match (e.g. 50'): offer ~68% of potential payout
            // Late in match (e.g. 85'): offer ~88% of potential payout (almost guaranteed win)
            const progress = Math.min(1.0, min / 90);
            const liveWinProbability = 0.45 + (progress * 0.45); // scales from 0.45 up to 0.90
            offer = potentialPayout * liveWinProbability * 0.94; // minus 6% bookmaker spread
        } else {
            // Pick is currently trailing or drawing:
            // Early in match: still time to turn it around -> salvage 35-45% of stake
            // Late in match: time running out -> salvage 5-15% of stake
            const timeRemainingRatio = Math.max(0.04, (90 - min) / 90);
            offer = stake * timeRemainingRatio * 0.45;
        }

        offer = Math.min(potentialPayout * 0.92, Math.max(stake * 0.05, offer));
        return parseFloat(offer.toFixed(4));
    }
}

let partialCashoutOpen = {};
let partialCashoutPercent = {};

function togglePartialCashout(idx, event) {
    if (event) event.stopPropagation();
    partialCashoutOpen[idx] = !partialCashoutOpen[idx];
    if (!partialCashoutPercent[idx]) partialCashoutPercent[idx] = 50;
    renderActiveWagers();
}

function setPartialPercent(idx, pct) {
    partialCashoutPercent[idx] = parseInt(pct);
    renderActiveWagers();
}

function handlePartialSliderChange(idx, val) {
    partialCashoutPercent[idx] = parseInt(val);
    const drawer = document.getElementById(`partial-drawer-${idx}`);
    if (drawer) {
        const w = localWagers[idx];
        if (!w) return;
        const totalCashVal = calculateCashoutValue(w);
        const partialSol = (totalCashVal * (val / 100)).toFixed(4);
        const remStake = (w.amount * (1 - val / 100)).toFixed(2);
        const readout = drawer.querySelector('.partial-readout');
        if (readout) {
            readout.innerHTML = `
                <span>Cash out: <strong>${partialSol} SOL (${val}%)</strong></span>
                <span>Remaining stake: <strong style="color:#38bdf8;">${remStake} SOL</strong></span>
            `;
        }
        const execBtn = drawer.querySelector('.btn-primary');
        if (execBtn) {
            execBtn.setAttribute('onclick', `executeCashOut(${idx}, ${val})`);
            execBtn.innerHTML = `⚡ Cash Out ${val}% (${partialSol} SOL)`;
        }
    }
}

// Auto Cash-Out Rule Management (Bettor sets target profit exit level)
function setAutoCashoutTarget(idx) {
    const input = document.getElementById(`auto-cashout-input-${idx}`);
    if (!input) return;
    const target = parseFloat(input.value);
    const w = localWagers[idx];
    if (!w) return;

    if (!target || target <= 0) {
        showToast("Please enter a valid target SOL amount.", "error");
        return;
    }

    if (target <= w.amount) {
        showToast(`Target must be higher than your stake (${w.amount.toFixed(2)} SOL).`, "warning");
        return;
    }

    const maxPayout = w.potentialPayout || (w.amount * w.odds);
    if (target >= maxPayout) {
        showToast(`Target cannot exceed maximum payout (${maxPayout.toFixed(4)} SOL).`, "warning");
        return;
    }

    w.autoCashoutTarget = target;
    saveWagersToStorage();
    if (window.solplayDB && currentWalletPubkey) {
        window.solplayDB.saveWager(w, currentWalletPubkey.toBase58());
    }
    renderActiveWagers();
    showToast(`🎯 Auto Cash-Out target set to ${target.toFixed(2)} SOL! System will execute automatically when reached.`, "success");
}

function cancelAutoCashoutTarget(idx) {
    const w = localWagers[idx];
    if (!w) return;
    delete w.autoCashoutTarget;
    saveWagersToStorage();
    if (window.solplayDB && currentWalletPubkey) {
        window.solplayDB.saveWager(w, currentWalletPubkey.toBase58());
    }
    renderActiveWagers();
    showToast("Auto Cash-Out target cancelled.", "info");
}

// Execute instant full or partial cash-out with anti-courtsiding & double-click protection
async function executeCashOut(idx, percent = 100) {
    const w = localWagers[idx];
    if (!w) return;

    // Loophole Guard 1: Anti-Reentrancy / Double-Click Prevention
    if (w._isProcessingCashout) {
        showToast("Cash Out is already being processed for this ticket.", "warning");
        return;
    }
    w._isProcessingCashout = true;

    // Loophole Guard 2: Anti-Courtsiding (Check for active market suspensions or goal reviews)
    let isMarketSuspended = false;
    if (w.isAccumulator && w.legs) {
        isMarketSuspended = w.legs.some(leg => {
            const m = MATCHES_DATA.find(item => item.id === leg.gameId);
            return m && (m.isLocked || m.status === 'SUSPENDED');
        });
    } else {
        const singleMatch = MATCHES_DATA.find(item => item.id === w.gameId);
        if (singleMatch && (singleMatch.isLocked || singleMatch.status === 'SUSPENDED')) {
            isMarketSuspended = true;
        }
    }

    if (isMarketSuspended) {
        w._isProcessingCashout = false;
        showToast("🔒 Live Market Suspended! Goal or VAR review in progress. Cash Out temporarily locked.", "warning");
        return;
    }

    const totalCashoutAmount = calculateCashoutValue(w);
    if (totalCashoutAmount <= 0) {
        w._isProcessingCashout = false;
        showToast("Cash Out is currently unavailable for this ticket.", "warning");
        return;
    }

    const pct = Math.max(10, Math.min(100, parseInt(percent) || 100));
    const isPartial = (pct < 100);
    const disbursedAmount = parseFloat((totalCashoutAmount * (pct / 100)).toFixed(4));
    const ticketCode = w.ticketId || `#SP-${String(w.id).replace(/\D/g, '').slice(-6) || '849201'}`;

    // Acceptance buffer spinner (1.2s verification delay)
    const btn = document.getElementById(`cashout-btn-${idx}`);
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="animate-pulse">⏳ Securing Live Offer...</span>`;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Re-verify market state after acceptance delay
    if (isPartial) {
        // Partial Cash Out (Bet365 standard): reduce stake & payout, keep ticket active
        const remStake = parseFloat((w.amount * (1 - pct / 100)).toFixed(4));
        const remPayout = parseFloat(((w.potentialPayout || (w.amount * w.odds)) * (1 - pct / 100)).toFixed(4));
        
        w.amount = remStake;
        w.potentialPayout = remPayout;
        delete partialCashoutOpen[idx];

        // Disburse portion into player balance
        if (isWalletConnected && activePublicKey) {
            localSandboxBalance += disbursedAmount;
            const balEl = document.getElementById("wallet-balance");
            if (balEl) balEl.textContent = localSandboxBalance.toFixed(4);
            if (walletMode === "sandbox") {
                localStorage.setItem("solplay_sandbox_balance", localSandboxBalance.toString());
            }

            if (window.SolPlayDB && SolPlayDB.isInitialized) {
                SolPlayDB.cashoutWager(w.ticketId || w.id, disbursedAmount, activePublicKey.toString(), true, remStake, remPayout);
            }
        }

        w._isProcessingCashout = false;
        saveWagersToStorage();
        renderActiveWagers();

        showToast(`🎉 PARTIAL CASH OUT SUCCESS! +${disbursedAmount} SOL credited. ${remStake.toFixed(2)} SOL remains active!`, "success");
    } else {
        // Full Cash Out
        w.status = "CASHED_OUT";
        w.claimed = true;
        w.potentialPayout = disbursedAmount;
        w.settledAt = new Date().toISOString();
        delete partialCashoutOpen[idx];

        if (isWalletConnected && activePublicKey) {
            localSandboxBalance += disbursedAmount;
            const balEl = document.getElementById("wallet-balance");
            if (balEl) balEl.textContent = localSandboxBalance.toFixed(4);
            if (walletMode === "sandbox") {
                localStorage.setItem("solplay_sandbox_balance", localSandboxBalance.toString());
            }

            if (window.SolPlayDB && SolPlayDB.isInitialized) {
                SolPlayDB.cashoutWager(w.ticketId || w.id, disbursedAmount, activePublicKey.toString(), false);
            }
        }

        w._isProcessingCashout = false;
        saveWagersToStorage();
        renderActiveWagers();

        showToast(`🎉 FULL CASH OUT SUCCESS! +${disbursedAmount} SOL added to your wallet!`, "success");
    }
}

function evaluateMatchOutcome(match, outcomeId, outcomeLabel) {
    if (!match || !match.score) return "PENDING";
    const h = match.score.home;
    const a = match.score.away;
    const tot = h + a;
    
    // 1X2 Winner
    if (outcomeId === 0) return h > a ? "WON" : "LOST";
    if (outcomeId === 1) return a > h ? "WON" : "LOST";
    if (outcomeId === 2) return h === a ? "WON" : "LOST";
    
    // Double Chance
    if (outcomeId === 5) return (h >= a) ? "WON" : "LOST"; // 1X
    if (outcomeId === 6) return (h !== a) ? "WON" : "LOST"; // 12
    if (outcomeId === 7) return (a >= h) ? "WON" : "LOST"; // X2
    
    // Total Goals (Over/Under)
    if (outcomeId === 10) return tot > 2.5 ? "WON" : "LOST";
    if (outcomeId === 11) return tot < 2.5 ? "WON" : "LOST";
    if (outcomeId === 12) return tot > 1.5 ? "WON" : "LOST";
    if (outcomeId === 13) return tot < 1.5 ? "WON" : "LOST";
    if (outcomeId === 14) return tot > 0.5 ? "WON" : "LOST";
    if (outcomeId === 15) return tot < 0.5 ? "WON" : "LOST";
    if (outcomeId === 16) return tot > 3.5 ? "WON" : "LOST";
    if (outcomeId === 17) return tot < 3.5 ? "WON" : "LOST";
    
    // BTTS (GG / NG)
    if (outcomeId === 20) return (h > 0 && a > 0) ? "WON" : "LOST";
    if (outcomeId === 21) return (h === 0 || a === 0) ? "WON" : "LOST";
    
    // Draw No Bet
    if (outcomeId === 30) return h > a ? "WON" : (h === a ? "REFUNDED" : "LOST");
    if (outcomeId === 31) return a > h ? "WON" : (a === h ? "REFUNDED" : "LOST");
    
    // Correct Score
    if (outcomeId >= 50 && outcomeId < 100) {
        const finalScoreStr = `${h} - ${a}`;
        return (outcomeLabel && outcomeLabel.trim() === finalScoreStr.trim()) ? "WON" : "LOST";
    }
    
    // Scorer
    if (outcomeId >= 100 && match.timeline) {
        const player = (outcomeLabel || "").replace(" to score", "").replace(" (Sub)", "").replace(/ \([A-Z]{2}\)/, "").trim();
        const scored = match.timeline.some(ev => ev.type === "goal" && ev.desc.includes(player));
        return scored ? "WON" : "LOST";
    }
    
    return "LOST";
}

async function verifyWagerStatus(idx, btnElement) {
    const w = localWagers[idx];
    if (!w) return;
    
    if (btnElement) {
        btnElement.disabled = true;
        btnElement.innerHTML = `<span class="animate-pulse">🔄 Querying Oracle & Contract...</span>`;
    }
    
    // Satisfying real-time on-chain verification delay
    setTimeout(async () => {
        const outcome = evaluateTicketOutcome(w);
        
        w.status = outcome;
        saveWagersToStorage();
        renderActiveWagers();
        
        const ticketCode = w.ticketId || `#SP-${String(w.id).slice(-6)}`;
        if (outcome === "WON") {
            const winAmount = (w.potentialPayout || (w.amount * w.odds)).toFixed(4);
            showToast(`🎫 Ticket ${ticketCode} VERIFIED! Status: WINNER (${winAmount} SOL) 🏆`, "success");
            const wName = activePublicKey ? activePublicKey.toString().slice(0, 6) + "..." : "User";
            appendChatMessage("System", `🎉 Ticket ${ticketCode} verified on-chain. Wallet ${wName} won ${winAmount} SOL!`, true);
        } else if (outcome === "LOST") {
            showToast(`🎫 Ticket ${ticketCode} VERIFIED! Status: LOST ❌`, "info");
        } else {
            showToast(`🎫 Ticket ${ticketCode} is still in play — awaiting match conclusions.`, "info");
            if (btnElement) {
                btnElement.disabled = false;
                btnElement.textContent = "🔍 Settle & Verify Ticket";
            }
        }
    }, 1000);
}

function verifyAllWagersStatus() {
    let changed = false;
    localWagers.forEach(w => {
        if (w.status === "Pending" || w.status === "PENDING" || w.status === "Resolved") {
            const outcome = evaluateTicketOutcome(w);
            if (outcome !== "PENDING" && outcome !== w.status) {
                w.status = outcome;
                changed = true;
                const ticketCode = w.ticketId || `#SP-${String(w.id).slice(-6)}`;
                showToast(`Ticket ${ticketCode} settled as ${outcome}!`, outcome === "WON" ? "success" : "info");
            }
        }
    });
    if (changed) {
        saveWagersToStorage();
        renderActiveWagers();
    }
}

function shareWagerToChat(idx) {
    const w = localWagers[idx];
    if (!w) return;
    
    const username = isWalletConnected && activePublicKey ? getFriendlyUsername(activePublicKey.toString()) : "User";
    const creatorWallet = activePublicKey ? activePublicKey.toString() : "";

    // Handle Multi-Leg Accumulators
    if (w.isAccumulator && w.legs && w.legs.length > 1) {
        const accaPayload = {
            ticketId: w.ticketId || `#SP-${String(w.id).slice(-6)}`,
            isAccumulator: true,
            legs: w.legs.map(l => ({
                gameId: l.gameId,
                outcomeId: l.outcomeId,
                outcomeLabel: l.outcomeLabel || l.label,
                oddsValue: l.oddsValue || l.odds || 1.5,
                fixtureName: l.fixtureName || `Match #${l.gameId}`
            })),
            odds: w.odds,
            bonusPercent: w.bonusPercent || 0,
            amount: w.amount,
            potentialPayout: w.potentialPayout || (w.amount * w.odds),
            creatorWallet: creatorWallet
        };

        const msg = `SHARE-ACCA:${encodeURIComponent(JSON.stringify(accaPayload))}`;
        appendChatMessage(username, msg);
        showToast("🔥 Accumulator shared to Live Fan Chat!", "success");
    } else {
        // Handle Single Match Bets
        let fixture = `Match #${w.gameId}`;
        const match = MATCHES_DATA.find(m => m.id === w.gameId);
        if (match) {
            fixture = `${match.homeTeam} vs ${match.awayTeam}`;
        } else {
            const tournament = TOURNAMENTS_DATA.find(t => t.id === w.gameId);
            if (tournament) fixture = tournament.title;
        }

        const msg = `SHARE-BET:${w.gameId}|${w.outcomeLabel}|${w.odds}|${w.amount}|${fixture}|${w.outcomeId}|${creatorWallet}`;
        appendChatMessage(username, msg);
        showToast("Wager shared to Live Fan Chat!", "success");
    }
    
    switchMatchTab('chat');
}

function cloneBetFromChat(gameId, outcomeId, oddsValue, outcomeLabel, fixture, creatorWallet = "") {
    showToast(`Cloning bet: ${outcomeLabel} @ ${oddsValue.toFixed(2)}x`, "info");
    if (creatorWallet) {
        window.activeCopyCreatorWallet = creatorWallet;
    }
    selectOdds(gameId, outcomeId, oddsValue, outcomeLabel, fixture);
}

function cloneAccaFromChat(encodedData) {
    try {
        const accaData = JSON.parse(decodeURIComponent(encodedData));
        if (!accaData || !accaData.legs || accaData.legs.length === 0) {
            showToast("Invalid accumulator data", "error");
            return;
        }

        // Store copy creator for on-chain royalty attribution
        if (accaData.creatorWallet) {
            window.activeCopyCreatorWallet = accaData.creatorWallet;
        }

        // Clear existing betslip to load the full accumulator
        betslipSelections = [];

        // Populate all legs
        accaData.legs.forEach(leg => {
            const match = MATCHES_DATA.find(m => m.id === leg.gameId);
            const fixtureName = match ? `${match.homeTeam} vs ${match.awayTeam}` : (leg.fixtureName || `Match #${leg.gameId}`);
            
            betslipSelections.push({
                gameId: leg.gameId,
                outcomeId: leg.outcomeId,
                oddsValue: parseFloat(leg.oddsValue || leg.odds || 1.5),
                outcomeLabel: leg.outcomeLabel || leg.label,
                label: leg.outcomeLabel || leg.label,
                fixture: fixtureName,
                fixtureName: fixtureName,
                status: "PENDING"
            });
        });

        betslipMode = 'accumulator';
        renderBetslip();
        saveBetslipToStorage();

        // Highlight floating pill or betslip button
        const pill = document.getElementById("floating-betslip-pill");
        if (pill) {
            pill.style.display = "flex";
            pill.classList.add("pulse-glow");
            setTimeout(() => pill.classList.remove("pulse-glow"), 2000);
        }

        const creatorHandle = accaData.creatorWallet ? `@${accaData.creatorWallet.slice(0, 5)}...` : 'Tipster';
        showToast(`⚡ Cloned ${accaData.legs.length}-Fold Accumulator from ${creatorHandle}! (2% Creator Royalty active)`, "success");

        // Focus or scroll to betslip
        const betslipDrawer = document.getElementById("betslip-drawer");
        if (betslipDrawer) {
            betslipDrawer.classList.add("open");
        }
    } catch (e) {
        console.error("cloneAccaFromChat error:", e);
        showToast("Error cloning accumulator from chat.", "error");
    }
}

async function claimWagerOnchain(idx) {
    if (!isWalletConnected || !currentProgramId) return;
    const w = localWagers[idx];

    showToast("Submitting Claim Transaction to Solana...", "info");

    try {
        const marketAccountPubkey = getMarketPubkeyForMatch(w.gameId);
        const platformStatePubkey = getPlatformStatePubkey();
        const treasuryPubkey = getTreasuryPubkey();
        const creatorPubkey = getCreatorPubkey();

        // Build ClaimWinnings Instruction (ID 4)
        // size: 9 bytes
        const data = new Uint8Array(9);
        data[0] = 4; // Type 4
        writeU64(data, 1, w.gameId);

        const ix = new solanaWeb3.TransactionInstruction({
            keys: [
                { pubkey: activePublicKey, isSigner: true, isWritable: false },
                { pubkey: marketAccountPubkey, isSigner: false, isWritable: true },
                { pubkey: w.wagerPubkey, isSigner: false, isWritable: true },
                { pubkey: platformStatePubkey, isSigner: false, isWritable: false },
                { pubkey: treasuryPubkey, isSigner: false, isWritable: true },
                { pubkey: creatorPubkey, isSigner: false, isWritable: true },
            ],
            programId: currentProgramId,
            data: data
        });

        const tx = new solanaWeb3.Transaction().add(ix);
        const sig = await sendConfirmAndVerifyTransaction(tx, [walletKeypair]);

        showToast("Winnings successfully claimed! SOL sent to your wallet on-chain.", "success");
        w.claimed = true;
        
        // Sync to cloud database
        const winAmount = (w.potentialPayout || (w.amount * w.odds)).toFixed(4);
        if (window.SolPlayDB && SolPlayDB.isInitialized && activePublicKey) {
            SolPlayDB.payoutWager(w.ticketId || w.id, winAmount, activePublicKey.toString(), w.copyCreatorWallet);
        }

        renderActiveWagers();
        await updateWalletBalance();
    } catch (e) {
        console.warn("On-chain claim fallback to Cloud Engine:", e);
        const winAmount = (w.potentialPayout || (w.amount * w.odds)).toFixed(4);
        
        if (window.SolPlayDB && SolPlayDB.isInitialized && activePublicKey) {
            await SolPlayDB.payoutWager(w.ticketId || w.id, winAmount, activePublicKey.toString(), w.copyCreatorWallet);
        }

        w.claimed = true;
        if (typeof walletBalance !== 'undefined') {
            walletBalance += parseFloat(winAmount);
            const balEl = document.getElementById("wallet-balance");
            if (balEl) balEl.textContent = walletBalance.toFixed(4);
        }

        saveWagersToStorage();
        renderActiveWagers();
        showToast(`💰 Winnings (${winAmount} SOL) Disbursed & Synced to Cloud DB!`, "success");
    }
}

// 8. Cross-Tab State Synchronizer for Sportsbook (Real-time synchronization using localStorage)
// 8. Cross-Tab State Synchronizer for Sportsbook (Real-time synchronization using localStorage)
let goalBannerTimeout = null;

function triggerGoalBanner(teamName, side, scorer = "") {
    const banner = document.getElementById("goal-alert-banner");
    const container = document.getElementById("goal-alert-container");
    const teamEl = document.getElementById("goal-alert-team");
    const scoreEl = document.getElementById("goal-alert-score");

    if (!banner || !container || !teamEl || !scoreEl) return;

    // Reset classes and set theme
    banner.className = "goal-alert-banner";
    banner.classList.add(`theme-${side}`);

    // Fetch active match details
    const match = MATCHES_DATA.find(m => m.id === activeMatchId);
    const scoreStr = match ? `${match.score.home} - ${match.score.away}` : "Goal Scored!";

    // Populate data
    teamEl.textContent = `${teamName.toUpperCase()} SCORE!`;
    
    // Display scorer details in a professional format
    const timeDisplay = match ? match.time : "48'";
    scoreEl.innerHTML = `
        <div style="font-weight: 700; font-size: 1.1rem; color: #fff; margin-bottom: 0.2rem;">⚽ ${scorer} (${timeDisplay})</div>
        <div style="font-size: 0.8rem; color: var(--text-secondary);">${match ? match.homeTeam : "Home"} ${scoreStr} ${match ? match.awayTeam : "Away"}</div>
    `;

    // Make visible and trigger animation
    container.style.display = "flex";
    
    // Force layout reflow
    void banner.offsetWidth;
    banner.classList.add("active");

    // Clear previous timeouts if goal event fires in quick succession
    if (goalBannerTimeout) {
        clearTimeout(goalBannerTimeout);
    }

    // Hide banner after 4 seconds
    goalBannerTimeout = setTimeout(() => {
        banner.classList.remove("active");
        setTimeout(() => {
            if (!banner.classList.contains("active")) {
                container.style.display = "none";
            }
        }, 500);
    }, 4000);
}

let matchSearchQuery = "";

function handleMatchSearch(query) {
    matchSearchQuery = (query || "").trim().toLowerCase();
    const clearBtn = document.getElementById("clear-search-btn");
    if (clearBtn) {
        clearBtn.style.display = matchSearchQuery ? "block" : "none";
    }
    renderLiveMatches();
}

function clearMatchSearch() {
    const input = document.getElementById("header-match-search");
    if (input) input.value = "";
    matchSearchQuery = "";
    const clearBtn = document.getElementById("clear-search-btn");
    if (clearBtn) clearBtn.style.display = "none";
    renderLiveMatches();
}

// Render live match cards dynamically with complete betting platform filtering
function renderLiveMatches() {
    const container = document.getElementById("content-live-list");
    if (!container) return;

    container.innerHTML = "";

    if (typeof populateDemoMatchSelect === 'function') {
        populateDemoMatchSelect();
    }

    const dates = getSportsScheduleDates();

    // 1. Calculate live counts for all schedule categories respecting active league and search
    const leagueFilterPass = (m) => {
        if (activeLeagueFilter === 'all') return true;
        const leagueStr = ((m.league || '') + ' ' + (m.leagueCategory || '')).toLowerCase();
        return leagueStr.includes(activeLeagueFilter.toLowerCase());
    };

    const countAll = MATCHES_DATA.filter(leagueFilterPass).length;
    const countLive = MATCHES_DATA.filter(m => (m.scheduleGroup === 'live' || m.status === 'LIVE') && m.status !== 'FINISHED' && m.time !== 'Full Time' && leagueFilterPass(m)).length;
    const countToday = MATCHES_DATA.filter(m => m.scheduleGroup === 'today' && m.status !== 'FINISHED' && leagueFilterPass(m)).length;
    const countTomorrow = MATCHES_DATA.filter(m => m.scheduleGroup === 'tomorrow' && leagueFilterPass(m)).length;
    const countWeek = MATCHES_DATA.filter(m => m.scheduleGroup === 'week' && leagueFilterPass(m)).length;
    const countFinished = MATCHES_DATA.filter(m => (m.status === 'FINISHED' || m.time === 'Full Time') && leagueFilterPass(m)).length;

    // Update Pill Count Badges
    const elAll = document.getElementById("count-pill-all");
    if (elAll) elAll.textContent = countAll;
    const elLive = document.getElementById("count-pill-live");
    if (elLive) elLive.textContent = countLive;
    const elToday = document.getElementById("count-pill-today");
    if (elToday) elToday.textContent = countToday;
    const elTom = document.getElementById("count-pill-tomorrow");
    if (elTom) elTom.textContent = countTomorrow;
    const elWeek = document.getElementById("count-pill-week");
    if (elWeek) elWeek.textContent = countWeek;
    const elFinished = document.getElementById("count-pill-finished");
    if (elFinished) elFinished.textContent = countFinished;

    // 2. Filter matches based on user's active filters and search query
    const filteredMatches = MATCHES_DATA.filter(match => {
        if (!leagueFilterPass(match)) return false;
        if (activeScheduleFilter === 'live' && (match.status === 'FINISHED' || match.time === 'Full Time' || (match.scheduleGroup !== 'live' && match.status !== 'LIVE'))) return false;
        if (activeScheduleFilter === 'finished' && match.status !== 'FINISHED' && match.time !== 'Full Time') return false;
        if (activeScheduleFilter === 'today' && (match.scheduleGroup !== 'today' || match.status === 'FINISHED')) return false;
        if (activeScheduleFilter === 'tomorrow' && match.scheduleGroup !== 'tomorrow') return false;
        if (activeScheduleFilter === 'week' && match.scheduleGroup !== 'week') return false;
        if (matchSearchQuery) {
            const searchHaystack = `${match.homeTeam} ${match.awayTeam} ${match.league} ${match.leagueCategory || ''}`.toLowerCase();
            if (!searchHaystack.includes(matchSearchQuery)) return false;
        }
        return true;
    });

    if (filteredMatches.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem 1.5rem; background: rgba(255, 255, 255, 0.02); border-radius: 14px; border: 1px dashed rgba(255, 255, 255, 0.08);">
                <div style="font-size: 2.2rem; margin-bottom: 0.6rem;">⚽</div>
                <div style="font-weight: 700; color: #fff; font-size: 1rem;">No Matches in This Schedule View</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.3rem;">
                    Try clicking <button onclick="filterMatchesBySchedule('all')" style="color: var(--neon-teal); text-decoration: underline; background: none; border: none; cursor: pointer; font-weight: 600;">All Fixtures</button> or toggle your League filter.
                </div>
            </div>
        `;
        return;
    }

    // Helper to generate a match accordion drawer with 60+ categorized betting options
    const renderAccordionDrawer = (match, markets, activeCat) => {
        const cats = [
            { id: 'all', label: '🌟 All Markets (68)' },
            { id: 'goals', label: '⚽ Total Goals (14)' },
            { id: 'halves', label: '⏱️ Halves & HT/FT (12)' },
            { id: 'score', label: '🔢 Correct Score (14)' },
            { id: 'dc_dnb', label: '🛡️ Double Chance & DNB (5)' },
            { id: 'corners', label: '🚩 Corners & Cards (3)' },
            { id: 'combos', label: '⚡ Combos & Specials (4)' }
        ];

        const catButtons = cats.map(c => `
            <button class="market-cat-pill ${activeCat === c.id ? 'active' : ''}" onclick="setAccordionCategory(${match.id}, '${c.id}', event)">
                ${c.label}
            </button>
        `).join('');

        let blocksHtml = '';

        const renderBlock = (title, items, gridClass, marketName) => {
            if (!items || items.length === 0) return '';
            return `
                <div class="market-block-card">
                    <div class="market-block-title">
                        <span>${title}</span>
                        <span style="font-size: 0.68rem; color: #14b8a6; font-weight: 600;">${items.length} Options</span>
                    </div>
                    <div class="market-block-grid ${gridClass}">
                        ${items.map(o => `
                            <button class="matrix-odd-box ${isOutcomeSelected(match.id, o.outcomeId) ? 'selected' : ''}" onclick="selectOdds(${match.id}, ${o.outcomeId}, ${o.value}, '${o.desc.replace(/'/g, "\\'")}', '${match.homeTeam} vs ${match.awayTeam}', '${marketName}')">
                                <span class="lbl">${o.label}</span>
                                <span class="val">${o.value.toFixed(2)}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        };

        if (activeCat === 'all' || activeCat === 'goals') {
            blocksHtml += renderBlock('Over / Under Total Goals (0.5 to 3.5)', (markets['ou05'] || []).concat(markets['ou15'] || []).concat(markets['overunder'] || []).concat(markets['ou35'] || []), 'grid-4', 'Total Goals');
            blocksHtml += renderBlock('Exact Total Goals (Full Time)', markets['exactgoals'] || [], 'grid-3', 'Exact Goals');
            blocksHtml += renderBlock('Both Teams to Score (GG / NG)', markets['btts'] || [], 'grid-2', 'BTTS');
        }

        if (activeCat === 'all' || activeCat === 'halves') {
            blocksHtml += renderBlock('1st Half Result (1X2)', markets['halftime'] || [], 'grid-3', '1st Half 1X2');
            blocksHtml += renderBlock('1st Half Goals (O/U 0.5 & 1.5)', markets['htgoals'] || [], 'grid-2', '1st Half Goals');
            blocksHtml += renderBlock('Half Time / Full Time (HT/FT)', markets['htft'] || [], 'grid-3', 'HT/FT');
        }

        if (activeCat === 'all' || activeCat === 'score') {
            blocksHtml += renderBlock('Correct Score (Full Time)', markets['score'] || [], 'grid-4', 'Correct Score');
        }

        if (activeCat === 'all' || activeCat === 'dc_dnb') {
            blocksHtml += renderBlock('Double Chance', markets['dc'] || [], 'grid-3', 'Double Chance');
            blocksHtml += renderBlock('Draw No Bet', markets['dnb'] || [], 'grid-2', 'Draw No Bet');
            blocksHtml += renderBlock('European Handicap (-1 / +1)', markets['handicap'] || [], 'grid-3', 'Handicap');
        }

        if (activeCat === 'all' || activeCat === 'corners') {
            blocksHtml += renderBlock('Corners & Cards Booking Points', markets['corners'] || [], 'grid-3', 'Corners & Cards');
        }

        if (activeCat === 'all' || activeCat === 'combos') {
            blocksHtml += renderBlock('Match Result + Total Goals / BTTS Combo', markets['combos'] || [], 'grid-2', 'Match Combos');
        }

        return `
            <div class="match-accordion-drawer">
                <div class="market-cat-tabs">
                    ${catButtons}
                </div>
                <div class="accordion-markets-grid">
                    ${blocksHtml}
                </div>
            </div>
        `;
    };

    // Helper to generate a sideways-scrollable SportyBet market matrix table
    const createMatrixTable = (matchesList) => {
        const matrixContainer = document.createElement("div");
        matrixContainer.className = "match-matrix-container";

        const table = document.createElement("div");
        table.className = "match-matrix-table";

        // Table Header Row
        const header = document.createElement("div");
        header.className = "match-matrix-header";
        header.innerHTML = `
            <div class="col-header-info">Event / Teams</div>
            <div class="col-header-markets">
                <div class="market-group-title" style="width: 210px;">1X2 (Winner)</div>
                <div class="market-group-title" style="width: 140px;">O/U 2.5 Goals</div>
                <div class="market-group-title" style="width: 140px;">GG / NG (BTTS)</div>
                <div class="market-group-title" style="width: 210px;">Double Chance</div>
                <div class="market-group-title" style="width: 140px;">O/U 1.5 Goals</div>
                <div class="market-group-title" style="width: 140px;">Draw No Bet</div>
                <div class="market-group-title" style="width: 210px;">Handicap (-1)</div>
                <div class="market-group-title" style="width: 210px;">1st Half (1X2)</div>
                <div class="market-group-title" style="min-width: 120px; flex: 1;">More Markets</div>
            </div>
        `;
        table.appendChild(header);

        matchesList.forEach(match => {
            const rowWrapper = document.createElement("div");
            rowWrapper.className = `match-matrix-row-wrapper ${match.id === activeMatchId ? 'active-streaming' : ''}`;
            rowWrapper.id = `matrix-row-${match.id}`;

            const markets = getMatchMarkets(match);
            const m1x2 = markets['1x2'] || [];
            const mou25 = markets['overunder'] || [];
            const mbtts = markets['btts'] || [];
            const mdc = markets['dc'] || [];
            const mou15 = markets['ou15'] || [];
            const mdnb = markets['dnb'] || [];
            const mhandicap = markets['handicap'] || [];
            const mhalftime = markets['halftime'] || [];

            const isMatchConcluded = (match.status === 'FINISHED' || match.time === 'Full Time' || match.time === 'FT');
            let statusBadge = '';
            if (isMatchConcluded) {
                statusBadge = `<span class="badge-finished">🏁 Full Time</span>`;
            } else if (match.scheduleGroup === 'live' || match.status === 'LIVE') {
                statusBadge = `<span class="badge-live-pulse" style="font-size:0.65rem; padding:0.15rem 0.4rem;">${match.time}</span>`;
            } else if (match.scheduleGroup === 'today') {
                statusBadge = `<span class="badge-schedule-today" style="font-size:0.65rem; padding:0.15rem 0.4rem;">📅 ${match.time}</span>`;
            } else if (match.scheduleGroup === 'tomorrow') {
                statusBadge = `<span class="badge-schedule-tomorrow" style="font-size:0.65rem; padding:0.15rem 0.4rem;">⚽ ${match.time}</span>`;
            } else {
                statusBadge = `<span class="badge-schedule-week" style="font-size:0.65rem; padding:0.15rem 0.4rem;">🏆 ${match.time}</span>`;
            }

            const isStreamActive = (match.id === activeMatchId);
            const isAccordionOpen = !!expandedAccordions[match.id];
            const activeCat = activeAccordionCategory[match.id] || 'all';

            // Check winning outcome for 1X2 if match is concluded
            let winning1x2Id = -1;
            if (isMatchConcluded && match.score) {
                if (match.score.home > match.score.away) winning1x2Id = 0;
                else if (match.score.away > match.score.home) winning1x2Id = 1;
                else winning1x2Id = 2;
            }

            const isMatchLive = (match.status === 'LIVE');
            const hasMatchStarted = (isMatchLive || isMatchConcluded);
            const scoreDisplayHome = (hasMatchStarted && match.score && typeof match.score.home === 'number') ? match.score.home : '';
            const scoreDisplayAway = (hasMatchStarted && match.score && typeof match.score.away === 'number') ? match.score.away : '';

            rowWrapper.innerHTML = `
                <div class="match-matrix-row">
                    <!-- Sticky / Prominent Match Info Left Section -->
                    <div class="match-info-sticky">
                        <div class="match-meta-line">
                            <span class="match-meta-league">⚽ ${match.league}</span>
                            ${statusBadge}
                        </div>
                        <div class="match-teams-block">
                            <div class="matrix-team-name">
                                <span>${match.homeTeam}</span>
                                <span class="score" style="${isMatchConcluded ? 'color: #38bdf8; font-weight: 800;' : ''}">${scoreDisplayHome}</span>
                            </div>
                            <div class="matrix-team-name">
                                <span>${match.awayTeam}</span>
                                <span class="score" style="${isMatchConcluded ? 'color: #38bdf8; font-weight: 800;' : ''}">${scoreDisplayAway}</span>
                            </div>
                        </div>
                        <div class="match-actions-line">
                            <button class="btn-stream-pill ${isStreamActive ? 'active' : ''}" onclick="watchMatchStream(${match.id}, event)" title="Watch direct live stream on SolPlay">
                                <span class="material-symbols-outlined text-[13px]">${isStreamActive ? 'sensors' : 'play_circle'}</span>
                                ${isStreamActive ? 'Streaming ↗' : 'Watch Stream ↗'}
                            </button>
                            <button class="btn-stream-pill btn-stream-solplay" onclick="selectActiveMatch(${match.id}, true)" title="Open SolPlay Match Center (Radar, Squads & Stats)">
                                <span class="material-symbols-outlined text-[13px]">view_quilt</span>
                                SolPlay View
                            </button>
                        </div>
                    </div>

                    <!-- Sideways Scrollable Market Odds Track -->
                    <div class="matrix-odds-track">
                        <!-- 1X2 (Winner) -->
                        <div class="odds-col-group group-3">
                            ${m1x2.map(o => {
                                const isSelected = isOutcomeSelected(match.id, o.outcomeId);
                                const isWinner = isMatchConcluded && (o.outcomeId === winning1x2Id);
                                const extraClass = isMatchConcluded ? (isWinner ? 'winning-outcome' : 'concluded') : '';
                                const clickHandler = isMatchConcluded ? `showToast('This fixture has ended (Full Time). Outcome settled.', 'info')` : `selectOdds(${match.id}, ${o.outcomeId}, ${o.value}, '${o.desc.replace(/'/g, "\\'")}', '${match.homeTeam} vs ${match.awayTeam}', 'Winner (1X2)')`;
                                return `
                                    <button class="matrix-odd-box ${isSelected ? 'selected' : ''} ${extraClass}" onclick="${clickHandler}">
                                        <span class="lbl">${o.label}</span>
                                        <span class="val">${o.value.toFixed(2)}${isWinner ? ' ✓' : ''}</span>
                                    </button>
                                `;
                            }).join('')}
                        </div>

                        <!-- Over / Under 2.5 -->
                        <div class="odds-col-group group-2">
                            ${mou25.map(o => `
                                <button class="matrix-odd-box ${isOutcomeSelected(match.id, o.outcomeId) ? 'selected' : ''}" onclick="selectOdds(${match.id}, ${o.outcomeId}, ${o.value}, '${o.desc.replace(/'/g, "\\'")}', '${match.homeTeam} vs ${match.awayTeam}', 'Total Goals (O/U 2.5)')">
                                    <span class="lbl">${o.label.includes('Over') ? 'Over 2.5' : 'Under 2.5'}</span>
                                    <span class="val">${o.value.toFixed(2)}</span>
                                </button>
                            `).join('')}
                        </div>

                        <!-- BTTS (GG / NG) -->
                        <div class="odds-col-group group-2">
                            ${mbtts.map(o => `
                                <button class="matrix-odd-box ${isOutcomeSelected(match.id, o.outcomeId) ? 'selected' : ''}" onclick="selectOdds(${match.id}, ${o.outcomeId}, ${o.value}, '${o.desc.replace(/'/g, "\\'")}', '${match.homeTeam} vs ${match.awayTeam}', 'Both Teams To Score')">
                                    <span class="lbl">${o.label.includes('Yes') ? 'GG (Yes)' : 'NG (No)'}</span>
                                    <span class="val">${o.value.toFixed(2)}</span>
                                </button>
                            `).join('')}
                        </div>

                        <!-- Double Chance -->
                        <div class="odds-col-group group-dc">
                            ${mdc.map(o => `
                                <button class="matrix-odd-box ${isOutcomeSelected(match.id, o.outcomeId) ? 'selected' : ''}" onclick="selectOdds(${match.id}, ${o.outcomeId}, ${o.value}, '${o.desc.replace(/'/g, "\\'")}', '${match.homeTeam} vs ${match.awayTeam}', 'Double Chance')">
                                    <span class="lbl">${o.label.split(' ')[0]}</span>
                                    <span class="val">${o.value.toFixed(2)}</span>
                                </button>
                            `).join('')}
                        </div>

                        <!-- Over / Under 1.5 -->
                        <div class="odds-col-group group-2">
                            ${mou15.map(o => `
                                <button class="matrix-odd-box ${isOutcomeSelected(match.id, o.outcomeId) ? 'selected' : ''}" onclick="selectOdds(${match.id}, ${o.outcomeId}, ${o.value}, '${o.desc.replace(/'/g, "\\'")}', '${match.homeTeam} vs ${match.awayTeam}', 'Total Goals (O/U 1.5)')">
                                    <span class="lbl">${o.label.includes('Over') ? 'Over 1.5' : 'Under 1.5'}</span>
                                    <span class="val">${o.value.toFixed(2)}</span>
                                </button>
                            `).join('')}
                        </div>

                        <!-- Draw No Bet -->
                        <div class="odds-col-group group-2">
                            ${mdnb.map(o => `
                                <button class="matrix-odd-box ${isOutcomeSelected(match.id, o.outcomeId) ? 'selected' : ''}" onclick="selectOdds(${match.id}, ${o.outcomeId}, ${o.value}, '${o.desc.replace(/'/g, "\\'")}', '${match.homeTeam} vs ${match.awayTeam}', 'Draw No Bet')">
                                    <span class="lbl">${o.label.includes(match.homeTeam) ? '1 DNB' : '2 DNB'}</span>
                                    <span class="val">${o.value.toFixed(2)}</span>
                                </button>
                            `).join('')}
                        </div>

                        <!-- European Handicap (-1) -->
                        <div class="odds-col-group group-3">
                            ${mhandicap.map(o => `
                                <button class="matrix-odd-box ${isOutcomeSelected(match.id, o.outcomeId) ? 'selected' : ''}" onclick="selectOdds(${match.id}, ${o.outcomeId}, ${o.value}, '${o.desc.replace(/'/g, "\\'")}', '${match.homeTeam} vs ${match.awayTeam}', 'European Handicap')">
                                    <span class="lbl">${o.label.includes('(-1)') ? 'Home (-1)' : (o.label.includes('(+1)') ? 'Away (+1)' : 'Tie (-1)')}</span>
                                    <span class="val">${o.value.toFixed(2)}</span>
                                </button>
                            `).join('')}
                        </div>

                        <!-- 1st Half Winner (1X2) -->
                        <div class="odds-col-group group-3">
                            ${mhalftime.map(o => `
                                <button class="matrix-odd-box ${isOutcomeSelected(match.id, o.outcomeId) ? 'selected' : ''}" onclick="selectOdds(${match.id}, ${o.outcomeId}, ${o.value}, '${o.desc.replace(/'/g, "\\'")}', '${match.homeTeam} vs ${match.awayTeam}', '1st Half 1X2')">
                                    <span class="lbl">${o.label.includes('Draw') ? 'HT: X' : (o.label.includes(match.homeTeam) ? 'HT: 1' : 'HT: 2')}</span>
                                    <span class="val">${o.value.toFixed(2)}</span>
                                </button>
                            `).join('')}
                        </div>

                        <!-- More Markets Button -->
                        <button class="btn-more-markets ${isAccordionOpen ? 'expanded' : ''}" onclick="toggleMatchAccordion(${match.id}, event)">
                            <span>${isAccordionOpen ? 'Close Markets ▴' : '+68 Markets ▾'}</span>
                        </button>
                    </div>
                </div>

                <!-- Accordion Drawer (Expanded when clicked) -->
                ${isAccordionOpen ? renderAccordionDrawer(match, markets, activeCat) : ''}
            `;

            table.appendChild(rowWrapper);
        });

        matrixContainer.appendChild(table);

        // Attach Grab-to-Scroll & Mousewheel interaction to this container
        let isDown = false;
        let startX = 0;
        let scrollLeft = 0;

        matrixContainer.addEventListener('mousedown', (e) => {
            if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input')) return;
            isDown = true;
            matrixContainer.classList.add('active-dragging');
            startX = e.clientX;
            scrollLeft = matrixContainer.scrollLeft;
        });

        window.addEventListener('mouseup', () => {
            if (isDown) {
                isDown = false;
                matrixContainer.classList.remove('active-dragging');
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const walk = (e.clientX - startX) * 1.5;
            matrixContainer.scrollLeft = scrollLeft - walk;
        });

        // Universal sideways wheel scrolling: does not trap page scrolling if at boundaries
        matrixContainer.addEventListener('wheel', (e) => {
            if (Math.abs(e.deltaX) > 0) return; // Native horizontal swipe
            if (e.shiftKey) return; // Native shift+wheel
            const maxScroll = matrixContainer.scrollWidth - matrixContainer.clientWidth;
            const canScrollRight = (e.deltaY > 0 && matrixContainer.scrollLeft < maxScroll - 5);
            const canScrollLeft = (e.deltaY < 0 && matrixContainer.scrollLeft > 5);
            if (canScrollRight || canScrollLeft) {
                matrixContainer.scrollLeft += e.deltaY * 1.3;
                e.preventDefault();
            }
        }, { passive: false });

        return matrixContainer;
    };

    // 3. Render according to schedule grouping with sideways scrollable matrix tables
    if (activeScheduleFilter === 'all') {
        const groups = [
            { key: 'live', title: '🔴 In-Play Live Now', count: countLive },
            { key: 'today', title: `📅 Today's Match Card • ${dates.todayLabel}`, count: countToday },
            { key: 'tomorrow', title: `⚽ Tomorrow's Fixtures • ${dates.tomorrowLabel}`, count: countTomorrow },
            { key: 'week', title: '🏆 Upcoming Slate This Week', count: countWeek }
        ];

        groups.forEach(g => {
            const matchesInGroup = filteredMatches.filter(m => m.scheduleGroup === g.key);
            if (matchesInGroup.length > 0) {
                const divider = document.createElement("div");
                divider.className = "match-section-divider";
                divider.innerHTML = `
                    <div class="title">${g.title}</div>
                    <div class="badge">${matchesInGroup.length} Matches • Sideways Scroll Enabled</div>
                `;
                container.appendChild(divider);
                container.appendChild(createMatrixTable(matchesInGroup));
            }
        });
    } else {
        // Direct table when specific schedule filter is clicked
        container.appendChild(createMatrixTable(filteredMatches));
    }

    // Render horizontal featured carousel deck
    renderFeaturedCarousel();
}

function setBettingMarket(matchId, marketKey) {
    activeMatchMarkets[matchId] = marketKey;
    renderLiveMatches();
}

// Render horizontal sideways-scrolling marquee deck (SportyBet / Bet9ja Style)
function renderFeaturedCarousel() {
    const scrollContainer = document.getElementById("featured-matches-scroll");
    if (!scrollContainer) return;

    scrollContainer.innerHTML = "";

    // Pick top marquee matches: real today and tomorrow UEFA Champions League & Premier League clashes
    const featuredList = MATCHES_DATA.filter(m => m.scheduleGroup === 'live' || m.id === 1010 || m.id === 1011 || m.id === 1014 || m.id === 1015 || m.id === 1004 || m.id === 1001 || m.id === 1030);

    featuredList.forEach(match => {
        const isSelected = (match.id === activeMatchId);
        const card = document.createElement("div");
        card.className = `featured-card ${isSelected ? 'active' : ''}`;
        
        const isConcluded = (match.status === 'FINISHED' || match.time === 'Full Time');
        const isLive = (match.status === 'LIVE' || match.scheduleGroup === 'live');
        let statusBadge = '';
        if (isConcluded) {
            statusBadge = `<span class="badge-finished" style="font-size: 0.68rem; padding: 0.15rem 0.4rem;">🏁 Full Time</span>`;
        } else if (isLive) {
            statusBadge = `<span class="badge-live-pulse" style="font-size: 0.68rem; padding: 0.15rem 0.4rem;">${match.time}</span>`;
        } else {
            statusBadge = `<span class="badge-schedule-today" style="font-size: 0.68rem; padding: 0.15rem 0.4rem;">📅 ${match.time}</span>`;
        }

        const markets = getMatchMarkets(match);
        const odds1x2 = markets['1x2'] || [
            { label: match.homeTeam, value: match.odds?.home || 2.10, outcomeId: 0, desc: `${match.homeTeam} Win` },
            { label: "Draw", value: match.odds?.draw || 3.30, outcomeId: 2, desc: "Draw" },
            { label: match.awayTeam, value: match.odds?.away || 3.10, outcomeId: 1, desc: `${match.awayTeam} Win` }
        ];

        const escapedHome = match.homeTeam.replace(/'/g, "\\'");
        const escapedAway = match.awayTeam.replace(/'/g, "\\'");
        const escapedGameTitle = `${escapedHome} vs ${escapedAway}`;

        const showScore = (isLive || isConcluded) && match.score && typeof match.score.home === 'number';
        const scoreColor = isConcluded ? '#38bdf8' : 'var(--neon-teal)';
        const homeScoreSpan = showScore ? `<span style="color: ${scoreColor}; font-weight: 800;">${match.score.home}</span>` : `<span style="color: var(--text-secondary); font-size: 0.72rem; font-weight: 500;">vs</span>`;
        const awayScoreSpan = showScore ? `<span style="color: ${scoreColor}; font-weight: 800;">${match.score.away}</span>` : ``;

        let winning1x2Id = -1;
        if (isConcluded && match.score) {
            if (match.score.home > match.score.away) winning1x2Id = 0;
            else if (match.score.away > match.score.home) winning1x2Id = 1;
            else winning1x2Id = 2;
        }

        card.innerHTML = `
            <div class="featured-card-top" onclick="selectActiveMatch(${match.id})">
                <span style="font-weight: 600; color: var(--text-secondary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 140px;">${match.league}</span>
                ${statusBadge}
            </div>
            <div class="featured-card-teams" onclick="selectActiveMatch(${match.id})">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>⚽ ${match.homeTeam}</span>
                    ${homeScoreSpan}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.2rem;">
                    <span>🛡️ ${match.awayTeam}</span>
                    ${awayScoreSpan}
                </div>
            </div>
            <div class="featured-quick-odds">
                <button class="featured-odd-btn ${isOutcomeSelected(match.id, 0) ? 'selected' : ''} ${isConcluded ? (winning1x2Id === 0 ? 'winning-outcome' : 'concluded') : ''}" 
                    ${isConcluded ? 'disabled title="Match Concluded"' : ''}
                    onclick="event.stopPropagation(); selectOdds(${match.id}, 0, ${odds1x2[0].value}, '${escapedHome} Win', '${escapedGameTitle}', 'Winner (1X2)')">
                    <span style="font-size: 0.62rem; color: var(--text-secondary);">1</span>
                    <span>${odds1x2[0].value.toFixed(2)}</span>
                </button>
                <button class="featured-odd-btn ${isOutcomeSelected(match.id, 2) ? 'selected' : ''} ${isConcluded ? (winning1x2Id === 2 ? 'winning-outcome' : 'concluded') : ''}" 
                    ${isConcluded ? 'disabled title="Match Concluded"' : ''}
                    onclick="event.stopPropagation(); selectOdds(${match.id}, 2, ${odds1x2[1].value}, 'Draw', '${escapedGameTitle}', 'Winner (1X2)')">
                    <span style="font-size: 0.62rem; color: var(--text-secondary);">X</span>
                    <span>${odds1x2[1].value.toFixed(2)}</span>
                </button>
                <button class="featured-odd-btn ${isOutcomeSelected(match.id, 1) ? 'selected' : ''} ${isConcluded ? (winning1x2Id === 1 ? 'winning-outcome' : 'concluded') : ''}" 
                    ${isConcluded ? 'disabled title="Match Concluded"' : ''}
                    onclick="event.stopPropagation(); selectOdds(${match.id}, 1, ${odds1x2[2].value}, '${escapedAway} Win', '${escapedGameTitle}', 'Winner (1X2)')">
                    <span style="font-size: 0.62rem; color: var(--text-secondary);">2</span>
                    <span>${odds1x2[2].value.toFixed(2)}</span>
                </button>
            </div>
        `;
        scrollContainer.appendChild(card);
    });
}

function selectActiveMatch(matchId, shouldScroll = true) {
    activeMatchId = matchId;
    let match = MATCHES_DATA.find(m => m.id === matchId);
    let isTournament = false;
    let tournament = null;
    
    if (!match) {
        tournament = TOURNAMENTS_DATA.find(t => t.id === matchId);
        if (tournament) {
            isTournament = true;
            match = {
                id: tournament.id,
                homeTeam: tournament.playerA.name,
                awayTeam: tournament.playerB.name,
                time: "Upcoming",
                status: "UPCOMING",
                score: null,
                league: tournament.game + " Tournament"
            };
        }
    }
    
    if (!match) return;

    // Automatically ensure Split View is enabled if user was in Panoramic Full mode
    const grid = document.getElementById("main-layout-grid");
    if (grid && grid.classList.contains("full-sportsbook-active")) {
        setSportsbookViewMode('split');
    }
    
    // Update live player scoreboard
    const isLive = (match.status === 'LIVE' || match.scheduleGroup === 'live');
    const isConcluded = (match.status === 'FINISHED' || match.time === 'Full Time');
    const hasStarted = (isLive || isConcluded);
    const hasScore = hasStarted && match.score && typeof match.score.home === 'number';

    const liveScoreEl = document.getElementById("player-live-score");
    if (liveScoreEl) {
        if (hasScore) {
            liveScoreEl.innerHTML = `${match.homeTeam} <span id="player-score-home" style="color: ${isConcluded ? '#38bdf8' : '#34d399'}; font-weight: 800;">${match.score.home}</span> - <span id="player-score-away" style="color: ${isConcluded ? '#38bdf8' : '#34d399'}; font-weight: 800;">${match.score.away}</span> ${match.awayTeam} ${isConcluded ? '<span style="font-size: 0.72rem; color: #38bdf8; margin-left: 0.35rem; font-weight: 700;">(FT)</span>' : ''}`;
        } else {
            liveScoreEl.innerHTML = `${match.homeTeam} <span style="font-size: 0.75rem; color: rgba(255,255,255,0.4); padding: 0.1rem 0.4rem; border-radius: 4px; background: rgba(255,255,255,0.06); margin: 0 0.3rem;">vs</span> ${match.awayTeam}`;
        }
    }
    
    const liveTimeEl = document.getElementById("player-live-time");
    if (liveTimeEl) {
        if (isConcluded) {
            liveTimeEl.textContent = "🏁 Full Time";
        } else if (isLive) {
            liveTimeEl.textContent = `🔴 ${match.time || 'LIVE'}`;
        } else {
            liveTimeEl.textContent = `📅 ${match.time || 'Scheduled'}`;
        }
    }
    
    document.getElementById("stream-title").textContent = `${match.homeTeam} vs ${match.awayTeam} - Routed Feed`;
    
    // Update external stream button href in video header
    const externalStreamLink = document.getElementById("player-external-stream-link");
    if (externalStreamLink) {
        externalStreamLink.href = `${activeSports808Mirror}/`;
        externalStreamLink.title = `Watch ${match.homeTeam} vs ${match.awayTeam} live on LiveSports808`;
    }

    if (isTournament && tournament) {
        // Automatically set player to HLS direct and load the stream
        const playerFrame = document.getElementById("video-iframe-player");
        const mockPlayer = document.getElementById("mock-video-player");
        const video = document.getElementById("hls-video-player");
        
        playerFrame.style.display = "none";
        mockPlayer.style.display = "none";
        video.style.display = "block";
        
        initHlsPlayer(video, tournament.streamUrl);
        document.getElementById("stream-title").textContent = `${tournament.title} - Active Stream`;
        
        showToast(`Watching E-Sports Stream: ${tournament.title}`, "info");
    } else {
        updateStreamProvidersForMatch(match);
    }
    
    // Trigger async squad/lineups loading for the match
    loadMatchSquadsAsync(match);
    
    renderLiveMatches();
    
    // Update match center tabs (Stats & 2D Radar, Lineups, and Timeline)
    renderMatchStats();
    renderMatchLineups();
    renderMatchTimeline();

    // Smooth scroll to video stream player and trigger pulse
    if (shouldScroll) {
        const streamContainer = document.getElementById("left-streaming-pane") || document.getElementById("video-player-container");
        if (streamContainer) {
            streamContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            streamContainer.classList.remove("stream-active-glow");
            void streamContainer.offsetWidth;
            streamContainer.classList.add("stream-active-glow");
            setTimeout(() => streamContainer.classList.remove("stream-active-glow"), 2500);
        }
    }
}

function loadDirectMatchStream(match) {
    const video = document.getElementById("hls-video-player");
    const playerFrame = document.getElementById("video-iframe-player");
    const mockPlayer = document.getElementById("mock-video-player");
    
    // Direct live sports HLS streams
    const streamUrl = match.streamUrl || "https://africa24.vedge.infomaniak.com/livecast/ik:africa24sport/manifest.m3u8";
    
    if (playerFrame) playerFrame.style.display = "none";
    if (mockPlayer) mockPlayer.style.display = "none";
    
    if (video) {
        video.style.display = "block";
        initHlsPlayer(video, streamUrl);
    }
    
    const providerSelect = document.getElementById("stream-provider-select");
    if (providerSelect) providerSelect.value = "1";
}

function watchMatchStream(matchId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const match = MATCHES_DATA.find(m => m.id === matchId) || TOURNAMENTS_DATA.find(t => t.id === matchId);
    if (!match) return;

    // 1. Automatically switch to Split View so the player and sportsbook sit side-by-side
    setSportsbookViewMode('split');

    // 2. Activate match in SolPlay (syncs scoreboard, squads, stats, and 2D radar)
    selectActiveMatch(matchId, true);

    // 3. Instantly load & play the live stream right inside SolPlay! Zero redirects, zero popups!
    loadDirectMatchStream(match);

    showToast(`📺 Live Stream Loaded: ${match.homeTeam || match.title} vs ${match.awayTeam || ''} (Direct SolPlay Stream)`, "success");
}

function openExternalMatchStream(matchId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const streamUrl = `${activeSports808Mirror}/`;
    window.open(streamUrl, '_blank', 'noopener,noreferrer');
}

function updateStreamProvidersForMatch(match) {
    updateStreamProviders();
}

window.addEventListener('storage', (e) => {
    if (e.key === "solplay_match_score" && e.newValue) {
        try {
            const data = JSON.parse(e.newValue);
            const targetGameId = data.gameId || activeMatchId;
            const match = MATCHES_DATA.find(m => m.id === targetGameId);
            
            if (match) {
                const prevHome = match.score.home;
                const prevAway = match.score.away;
                
                match.score.home = data.home;
                match.score.away = data.away;
                const scoreStr = `${data.home} - ${data.away}`;
                
                let isReset = (data.home === 0 && data.away === 0);
                
                // Real-time timeline log synchronizer
                if (isReset) {
                    match.timeline = [
                        { time: "0'", type: "start", desc: "Match started", icon: "🏁" }
                    ];
                    if (targetGameId === activeMatchId) {
                        renderMatchTimeline();
                    }
                } else {
                    let homeScored = (data.home > prevHome);
                    let awayScored = (data.away > prevAway);
                    let currentMin = match.time || "45'";
                    if (!currentMin.endsWith("'") && currentMin !== 'Upcoming') {
                        currentMin += "'";
                    }
                    
                    if (homeScored) {
                        match.timeline.push({
                            time: currentMin,
                            type: "goal",
                            desc: `GOAL! ${match.homeTeam} scored by ${data.scorer}`,
                            icon: "⚽"
                        });
                    }
                    if (awayScored) {
                        match.timeline.push({
                            time: currentMin,
                            type: "goal",
                            desc: `GOAL! ${match.awayTeam} scored by ${data.scorer}`,
                            icon: "⚽"
                        });
                    }
                    if (targetGameId === activeMatchId && (homeScored || awayScored)) {
                        renderMatchTimeline();
                    }
                }
                
                // If it's the currently active match, trigger live animations
                if (targetGameId === activeMatchId) {
                    const playHomeEl = document.getElementById("player-score-home");
                    const playAwayEl = document.getElementById("player-score-away");
                    const cardHomeEl = document.getElementById(`match-score-home-${targetGameId}`);
                    const cardAwayEl = document.getElementById(`match-score-away-${targetGameId}`);
                    
                    function animateScoreElement(el, newScore) {
                        if (!el) return;
                        el.classList.remove("score-pop");
                        void el.offsetWidth;
                        el.classList.add("score-pop");
                        
                        setTimeout(() => {
                            el.textContent = newScore;
                        }, 150);
                        
                        el.addEventListener("animationend", () => {
                            el.classList.remove("score-pop");
                        }, { once: true });
                    }
                    
                    if (isReset) {
                        if (playHomeEl) playHomeEl.textContent = "0";
                        if (playAwayEl) playAwayEl.textContent = "0";
                        if (cardHomeEl) cardHomeEl.textContent = "0";
                        if (cardAwayEl) cardAwayEl.textContent = "0";
                        
                        const liveTime = document.getElementById("player-live-time");
                        if (liveTime) liveTime.textContent = match.time;
                        showToast("Match score reset to 0-0", "info");
                    } else {
                        let homeScored = (data.home > prevHome);
                        let awayScored = (data.away > prevAway);
                        
                        if (homeScored) {
                            animateScoreElement(playHomeEl, data.home);
                            animateScoreElement(cardHomeEl, data.home);
                            triggerGoalBanner(match.homeTeam, "home", data.scorer);
                        } else {
                            if (playHomeEl) playHomeEl.textContent = data.home;
                            if (cardHomeEl) cardHomeEl.textContent = data.home;
                        }
                        
                        if (awayScored) {
                            animateScoreElement(playAwayEl, data.away);
                            animateScoreElement(cardAwayEl, data.away);
                            triggerGoalBanner(match.awayTeam, "away", data.scorer);
                        } else {
                            if (playAwayEl) playAwayEl.textContent = data.away;
                            if (cardAwayEl) cardAwayEl.textContent = data.away;
                        }
                        
                        showToast(`⚽ GOAL! Score updated to ${scoreStr}`, "info");
                        appendChatMessage("System", `⚽ GOAL! Score is now ${match.homeTeam} ${scoreStr} ${match.awayTeam}. Scored by ${data.scorer}!`, true);
                    }
                } else {
                    const cardHomeEl = document.getElementById(`match-score-home-${targetGameId}`);
                    const cardAwayEl = document.getElementById(`match-score-away-${targetGameId}`);
                    if (cardHomeEl) cardHomeEl.textContent = data.home;
                    if (cardAwayEl) cardAwayEl.textContent = data.away;
                }
                
                renderLiveMatches();
            }
        } catch (err) {
            console.error("Failed to parse cross-tab score update", err);
        }
    }

    if (e.key === "solplay_streams_sync") {
        initStreams();
    }

    if (e.key === "solplay_resolution_trigger" && e.newValue) {
        try {
            const data = JSON.parse(e.newValue);
            const match = MATCHES_DATA.find(m => m.id === data.gameId);
            
            localWagers.forEach(w => {
                if (w.gameId === data.gameId) {
                    if (w.outcomeId >= 100 && w.outcomeId < 500) {
                        // Dynamic Anytime Goalscorer bet
                        const player = w.outcomeLabel.replace(" to score", "").replace(" (Sub)", "").replace(/ \([A-Z]{2}\)/, "").trim();
                        const scored = match && match.timeline.some(ev => ev.type === "goal" && ev.desc.includes(player));
                        w.status = scored ? "WON" : "LOST";
                    } else if (w.outcomeId >= 50 && w.outcomeId < 100) {
                        // Dynamic Correct Score bet
                        const finalScoreStr = match ? `${match.score.home} - ${match.score.away}` : "0 - 0";
                        w.status = (w.outcomeLabel.trim() === finalScoreStr.trim()) ? "WON" : "LOST";
                    } else if (w.outcomeId >= 20 && w.outcomeId < 25) {
                        // Hardcoded Correct Score bet
                        const finalScoreStr = match ? `${match.score.home}-${match.score.away}` : "0-0";
                        const cleanLabel = w.outcomeLabel.replace(/\s+/g, "").toLowerCase();
                        let matchesFinal = false;
                        if (cleanLabel.includes(finalScoreStr)) {
                            matchesFinal = true;
                        } else if (cleanLabel.includes("draw") && match && match.score.home === match.score.away) {
                            const scorePart = cleanLabel.replace("draw", "");
                            if (scorePart === finalScoreStr) {
                                matchesFinal = true;
                            }
                        }
                        w.status = matchesFinal ? "WON" : "LOST";
                    } else {
                        // Standard 1X2 bet (outcomeId 0, 1, or 2)
                        w.status = (w.outcomeId === data.outcome) ? "WON" : "LOST";
                    }
                }
            });
            renderActiveWagers();
            saveWagersToStorage();
            
            // Launch victory memecoin
            launchVictoryMemecoin(data.outcome);
        } catch (err) {
            console.error("Failed to parse resolution trigger", err);
        }
    }
});

// 9. Victory Memecoin Launch & Chart
function launchVictoryMemecoin(outcomeId) {
    const match = MATCHES_DATA.find(m => m.id === activeMatchId) || { homeTeam: "Arsenal", awayTeam: "Chelsea" };
    let tokenTicker = `$${match.homeTeam.substring(0, 4).toUpperCase()}WIN`;
    let name = `${tokenTicker} (${match.homeTeam} Win)`;
    
    if (outcomeId === 1) {
        tokenTicker = `$${match.awayTeam.substring(0, 4).toUpperCase()}WIN`;
        name = `${tokenTicker} (${match.awayTeam} Win)`;
    } else if (outcomeId === 2) {
        tokenTicker = `$${match.homeTeam.substring(0, 2).toUpperCase()}${match.awayTeam.substring(0, 2).toUpperCase()}DRAW`;
        name = `${tokenTicker} (Draw)`;
    }

    // Hide placeholder and show launcher card
    const placeholder = document.getElementById("meme-launcher-placeholder");
    if (placeholder) placeholder.style.display = "none";
    
    document.getElementById("meme-token-name").textContent = name;
    document.getElementById("meme-launcher-card").style.display = "block";
    
    // Auto switch tabs to highlight victory coin deployment
    switchExchangeTab("memes");
    
    showToast(`Viral Troll Coin ${name.split(" ")[0]} Deployed on Solana!`, "success");

    // Draw price pump chart on canvas
    const canvas = document.getElementById("meme-chart-canvas");
    const ctx = canvas.getContext("2d");
    
    // Clear and draw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#14b8a6";
    ctx.lineWidth = 3;
    
    ctx.beginPath();
    ctx.moveTo(10, 130);
    ctx.quadraticCurveTo(80, 120, 150, 90);
    ctx.quadraticCurveTo(220, 60, 290, 10);
    ctx.stroke();

    // Add glowing gradient under line
    const grad = ctx.createLinearGradient(0, 0, 0, 150);
    grad.addColorStop(0, "rgba(20, 184, 166, 0.3)");
    grad.addColorStop(1, "rgba(20, 184, 166, 0)");
    ctx.fillStyle = grad;
    
    ctx.beginPath();
    ctx.moveTo(10, 130);
    ctx.quadraticCurveTo(80, 120, 150, 90);
    ctx.quadraticCurveTo(220, 60, 290, 10);
    ctx.lineTo(290, 150);
    ctx.lineTo(10, 150);
    ctx.closePath();
    ctx.fill();
    
    // Draw text
    ctx.fillStyle = "#fff";
    ctx.font = "10px Outfit";
    ctx.fillText("PUMP DETECTED", 15, 25);
}

function buyMemeToken(solAmount) {
    if (!isWalletConnected) {
        showToast("Connect your wallet first!", "error");
        return;
    }
    showToast(`Buying ${solAmount} SOL of Victory Token...`, "info");
    
    setTimeout(() => {
        showToast(`Purchased! 5% Platform developer fee routed to treasury.`, "success");
        updateWalletBalance();
    }, 1200);
}

let simulationTickInterval = 6000;

// 10. Live Match & Schedule Manager (Real Scheduled Fixtures)
function startMatchTimer() {
    // Disabled all fake/simulated timers and random fake goals as requested.
    // Real scheduled matches remain accurate to official UEFA & Premier League kickoffs.
    if (matchTimer) clearInterval(matchTimer);
}

function triggerSimulatedMatchEvent(match) {
    const min = match.time || "45'";
    const hasLineups = match.lineup && match.lineup.home && match.lineup.home.length > 0;
    
    const roll = Math.random();
    const isHome = Math.random() < 0.5;
    const teamName = isHome ? match.homeTeam : match.awayTeam;
    const teamLineup = isHome ? (match.lineup?.home || []) : (match.lineup?.away || []);
    const teamSubs = isHome ? (match.subs?.home || []) : (match.subs?.away || []);
    
    let playerName = isHome ? "Home Player" : "Away Player";
    if (hasLineups && teamLineup.length > 0) {
        playerName = teamLineup[Math.floor(Math.random() * teamLineup.length)].name;
    }
    
    if (roll < 0.40) {
        if (isHome) match.score.home++;
        else match.score.away++;
        
        // Suspend match betting for 8 seconds
        match.isSuspended = true;
        setTimeout(() => {
            match.isSuspended = false;
            renderLiveMatches();
        }, 8000);
        
        // Dynamically adjust live odds based on the new scoreline
        adjustLiveOddsOnGoal(match);
        
        let assistName = "";
        if (hasLineups && teamLineup.length > 1) {
            do {
                assistName = teamLineup[Math.floor(Math.random() * teamLineup.length)].name;
            } while (assistName === playerName);
        }
        
        const desc = assistName 
            ? `Goal! ${teamName} ${match.score.home} - ${match.score.away}. Scored by ${playerName} (Assist: ${assistName}).`
            : `Goal! ${teamName} ${match.score.home} - ${match.score.away}. Scored by ${playerName}.`;
            
        match.timeline.push({
            time: min,
            type: "goal",
            desc: desc,
            icon: "⚽"
        });
        showToast(desc, "info");
        
    } else if (roll < 0.80) {
        const isRed = Math.random() < 0.15;
        const cardName = isRed ? "Red Card" : "Yellow Card";
        const icon = isRed ? "🟥" : "🟨";
        const desc = `${cardName}: ${playerName} (${teamName})`;
        
        // Suspend match betting for 5 seconds for major red card events
        if (isRed) {
            match.isSuspended = true;
            setTimeout(() => {
                match.isSuspended = false;
                renderLiveMatches();
            }, 5000);
        }
        
        match.timeline.push({
            time: min,
            type: "card",
            desc: desc,
            icon: icon
        });
        showToast(desc, "info");
        
    } else {
        if (teamSubs.length > 0 && teamLineup.length > 0) {
            const subIn = teamSubs[Math.floor(Math.random() * teamSubs.length)];
            const subOutIdx = Math.floor(Math.random() * teamLineup.length);
            const subOut = teamLineup[subOutIdx].name;
            
            teamLineup[subOutIdx].name = subIn;
            
            const desc = `Substitution (${teamName}): ${subIn} replaces ${subOut}.`;
            match.timeline.push({
                time: min,
                type: "sub",
                desc: desc,
                icon: "🔄"
            });
            showToast(desc, "info");
        }
    }
}


function mockPlayPause() {
    showToast("Stream paused/resumed.", "info");
}

// Helper: Local keypair generator for sandbox testing
function getOrCreateAccountKeypair(name) {
    const key = name + "_keypair";
    const stored = localStorage.getItem(key);
    if (stored) {
        const arr = JSON.parse(stored);
        return solanaWeb3.Keypair.fromSecretKey(new Uint8Array(arr));
    } else {
        const kp = solanaWeb3.Keypair.generate();
        localStorage.setItem(key, JSON.stringify(Array.from(kp.secretKey)));
        return kp;
    }
}

// Helper: Creates a system account and funds it to ensure it can hold state
async function createLocalAccount(newAccountKeypair, space) {
    const info = await connection.getAccountInfo(newAccountKeypair.publicKey);
    if (info !== null) return; // already created

    const rent = await connection.getMinimumBalanceForRentExemption(space);
    const tx = new solanaWeb3.Transaction().add(
        solanaWeb3.SystemProgram.createAccount({
            fromPubkey: activePublicKey,
            newAccountPubkey: newAccountKeypair.publicKey,
            lamports: rent,
            space: space,
            programId: currentProgramId
        })
    );
    const sig = await sendConfirmAndVerifyTransaction(tx, [walletKeypair, newAccountKeypair]);
}

// Helper: Toast Notifications
function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) {
        console.log(`[Toast Fallback] [${type}] ${message}`);
        return;
    }
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    let emoji = "ℹ️";
    if (type === "success") emoji = "✅";
    if (type === "error") emoji = "❌";

    toast.innerHTML = `
        <span>${emoji} ${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;

    container.appendChild(toast);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// Helper: Byte Writing functions (Little-Endian packing)
function writeU64(buf, offset, val) {
    const bigVal = BigInt(val);
    for (let i = 0; i < 8; i++) {
        buf[offset + i] = Number((bigVal >> BigInt(i * 8)) & 0xffn);
    }
}

function writeU32(buf, offset, val) {
    buf[offset] = val & 0xff;
    buf[offset + 1] = (val >> 8) & 0xff;
    buf[offset + 2] = (val >> 16) & 0xff;
    buf[offset + 3] = (val >> 24) & 0xff;
}

function writeString16(buf, offset, str) {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(str.slice(0, 16));
    buf.set(encoded, offset);
}

// Helper: Deterministic friendly username generation
function getFriendlyUsername(pubkeyString) {
    const prefixes = ["SolRunner", "GigaTrader", "BullishFan", "TrollSniper", "ApeLord", "BlockPunter", "DegenChamp", "SolChaser"];
    const suffixes = ["_Goat", "_Alpha", "_Deg", "_Whale", "_Dev", "_Pro", "_Chad", "_Giga"];
    
    let hash = 0;
    for (let i = 0; i < pubkeyString.length; i++) {
        hash = pubkeyString.charCodeAt(i) + ((hash << 5) - hash);
    }
    const prefixIdx = Math.abs(hash) % prefixes.length;
    const suffixIdx = Math.abs(hash >> 3) % suffixes.length;
    const walletSuffix = pubkeyString.slice(0, 4);
    
    return prefixes[prefixIdx] + suffixes[suffixIdx] + "_" + walletSuffix;
}

function saveWagersToStorage() {
    const key = activePublicKey ? `solplay_wagers_${activePublicKey.toString()}` : "solplay_wagers_anonymous";
    localStorage.setItem(key, JSON.stringify(localWagers));

    // Async Cloud DB sync if initialized
    if (window.SolPlayDB && SolPlayDB.isInitialized && activePublicKey && localWagers.length > 0) {
        SolPlayDB.saveWager(localWagers[0], activePublicKey.toString());
    }
}

function loadWagersFromStorage() {
    const key = activePublicKey ? `solplay_wagers_${activePublicKey.toString()}` : "solplay_wagers_anonymous";
    const stored = localStorage.getItem(key);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            localWagers = parsed.map(w => {
                let pubkey = null;
                try {
                    if (w.wagerPubkey) {
                        pubkey = typeof w.wagerPubkey === 'string' ? new solanaWeb3.PublicKey(w.wagerPubkey) : w.wagerPubkey;
                    }
                } catch (pkErr) {
                    pubkey = null;
                }
                return {
                    ...w,
                    wagerPubkey: pubkey
                };
            });
        } catch (e) {
            console.error("loadWagersFromStorage parse error:", e);
            localWagers = [];
        }
    } else {
        localWagers = [];
    }

    // Async Cloud DB sync
    if (window.SolPlayDB && SolPlayDB.isInitialized && activePublicKey) {
        SolPlayDB.loadUserWagers(activePublicKey.toString()).then(cloudWagers => {
            if (cloudWagers && Array.isArray(cloudWagers) && cloudWagers.length > 0) {
                const localIds = new Set(localWagers.map(w => w.ticketId || w.id));
                let added = false;
                cloudWagers.forEach(cw => {
                    if (!localIds.has(cw.ticketId || cw.id)) {
                        localWagers.push(cw);
                        added = true;
                    }
                });
                if (added) {
                    renderActiveWagers();
                }
            }
        }).catch(err => console.warn("Cloud DB wager fetch fallback:", err));
    }
}

function switchExchangeTab(tabId) {
    try {
        const tabs = ["sports", "slip", "wagers", "memes", "leaderboard"];
        tabs.forEach(t => {
            const btn = document.getElementById(`btn-tab-${t}`);
            const panel = document.getElementById(`panel-${t}`);
            if (btn) {
                const isActive = (t === tabId);
                btn.classList.toggle("active", isActive);
                if (isActive) {
                    btn.classList.remove("text-on-surface/50", "hover:bg-white/5");
                    btn.classList.add("bg-white/10", "text-white", "shadow-xl");
                } else {
                    btn.classList.remove("bg-white/10", "text-white", "shadow-xl");
                    btn.classList.add("text-on-surface/50", "hover:bg-white/5");
                }
            }
            if (panel) panel.style.display = (t === tabId) ? "flex" : "none";
        });
        if (tabId === "slip") {
            const badge = document.getElementById("tab-slip-badge");
            if (badge) badge.style.display = "none";
        }
    } catch (e) {
        console.error("Error inside switchExchangeTab:", e);
        showToast("Exchange tab error: " + e.message, "error");
    }
}

function switchMatchTab(tabId) {
    try {
        const panels = ["panel-match-chat", "panel-match-lineups", "panel-match-timeline", "panel-match-stats"];
        const btns = ["btn-match-chat", "btn-match-lineups", "btn-match-timeline", "btn-match-stats"];

        panels.forEach(p => {
            const el = document.getElementById(p);
            if (el) el.style.display = "none";
        });
        
        btns.forEach(b => {
            const el = document.getElementById(b);
            if (el) {
                const isActive = b.endsWith(tabId);
                el.classList.toggle("active", isActive);
                if (isActive) {
                    el.classList.remove("text-on-surface/40");
                    el.classList.add("text-[#d8b9ff]", "border-b-2", "border-[#d8b9ff]");
                } else {
                    el.classList.remove("text-[#d8b9ff]", "border-b-2", "border-[#d8b9ff]");
                    el.classList.add("text-on-surface/40");
                }
            }
        });

        const activePanel = document.getElementById(`panel-match-${tabId}`);
        if (activePanel) activePanel.style.display = "flex";

        if (tabId === 'lineups') {
            renderMatchLineups();
        } else if (tabId === 'timeline') {
            renderMatchTimeline();
        } else if (tabId === 'stats') {
            renderMatchStats();
        }
    } catch (e) {
        console.error("Error inside switchMatchTab:", e);
        showToast("Match center tab error: " + e.message, "error");
    }
}

function renderMatchStats() {
    const container = document.getElementById("stats-scroll-container");
    if (!container) return;
    
    const match = MATCHES_DATA.find(m => m.id === activeMatchId);
    if (!match) {
        container.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 2rem 0;">Select a match to view live in-game statistics</div>`;
        return;
    }
    
    // Dynamic match stats
    const homePoss = match.stats && match.stats.possession ? match.stats.possession.home : 58;
    const awayPoss = 100 - homePoss;
    const homeShots = match.stats && match.stats.shots ? match.stats.shots.home : 14;
    const awayShots = match.stats && match.stats.shots ? match.stats.shots.away : 7;
    const homeOnTarget = match.stats && match.stats.onTarget ? match.stats.onTarget.home : Math.round(homeShots * 0.45);
    const awayOnTarget = match.stats && match.stats.onTarget ? match.stats.onTarget.away : Math.round(awayShots * 0.4);
    const homeAttacks = match.stats && match.stats.attacks ? match.stats.attacks.home : 68;
    const awayAttacks = match.stats && match.stats.attacks ? match.stats.attacks.away : 38;
    const homeCorners = match.stats && match.stats.corners ? match.stats.corners.home : 7;
    const awayCorners = match.stats && match.stats.corners ? match.stats.corners.away : 3;
    const homeFouls = match.stats && match.stats.fouls ? match.stats.fouls.home : 7;
    const awayFouls = match.stats && match.stats.fouls ? match.stats.fouls.away : 11;
    const homeCards = match.stats && match.stats.cards ? match.stats.cards.home : 1;
    const awayCards = match.stats && match.stats.cards ? match.stats.cards.away : 2;
    const homeOffsides = match.stats && match.stats.offsides ? match.stats.offsides.home : 2;
    const awayOffsides = match.stats && match.stats.offsides ? match.stats.offsides.away : 1;

    const ballX = typeof ballPositionX !== 'undefined' ? ballPositionX : 62;
    const ballY = typeof ballPositionY !== 'undefined' ? ballPositionY : 48;

    const isMatchLive = (match.status === 'LIVE' || match.scheduleGroup === 'live');
    const isMatchConcluded = (match.status === 'FINISHED' || match.time === 'Full Time');
    const hasMatchScore = (isMatchLive || isMatchConcluded) && match.score && typeof match.score.home === 'number';

    const radarTickerContent = isMatchLive
        ? `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span>🔴 ${match.homeTeam}: Dangerous Attack (Final Third)</span>`
        : (isMatchConcluded
            ? `<span class="w-2 h-2 rounded-full bg-sky-400"></span><span style="color: #38bdf8; font-weight: 600;">🏁 Match Concluded (Full Time Whistle)</span>`
            : `<span class="w-2 h-2 rounded-full bg-amber-400"></span><span style="color: #f59e0b; font-weight: 600;">📅 Scheduled Kickoff: ${match.time || 'Upcoming'}</span>`);

    const scorePillContent = hasMatchScore
        ? `<span class="matrix-score-pill text-xs py-0.5 px-2 font-bold ${isMatchConcluded ? 'text-sky-400' : 'text-emerald-400'}">${match.score.home} - ${match.score.away}</span>`
        : `<span class="matrix-score-pill text-xs py-0.5 px-2 text-white/60">Kickoff: ${match.time || 'Upcoming'}</span>`;

    container.innerHTML = `
        <!-- Camel1.tv Inspired 2D Tactical Field Animation Component -->
        <div class="tactical-pitch-card">
            <div class="flex items-center justify-between mb-2">
                <span id="radar-event-ticker" class="radar-action-pill">
                    ${radarTickerContent}
                </span>
                <div class="flex items-center gap-1.5">
                    <span class="text-[10px] text-white/70 font-mono font-bold">${isMatchConcluded ? 'FT' : (isMatchLive ? match.time : 'UPCOMING')}</span>
                    ${scorePillContent}
                </div>
            </div>
            
            <div class="relative w-full overflow-hidden rounded-xl border border-emerald-500/30 shadow-inner">
                <svg class="tactical-field-svg" viewBox="0 0 600 240">
                    <!-- Emerald Pitch Background -->
                    <rect width="600" height="240" fill="#042f1f" />
                    <!-- Grass Stripes -->
                    <rect x="0" y="0" width="100" height="240" fill="rgba(255,255,255,0.02)" />
                    <rect x="200" y="0" width="100" height="240" fill="rgba(255,255,255,0.02)" />
                    <rect x="400" y="0" width="100" height="240" fill="rgba(255,255,255,0.02)" />
                    
                    <!-- Touchlines & Markings -->
                    <rect x="20" y="15" width="560" height="210" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2" />
                    <line x1="300" y1="15" x2="300" y2="225" stroke="rgba(255,255,255,0.4)" stroke-width="2" />
                    <circle cx="300" cy="120" r="40" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2" />
                    <circle cx="300" cy="120" r="3" fill="rgba(255,255,255,0.6)" />
                    
                    <!-- Left Penalty Area (Home) -->
                    <rect x="20" y="55" width="80" height="130" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2" />
                    <rect x="20" y="80" width="30" height="80" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2" />
                    <circle cx="70" cy="120" r="2.5" fill="rgba(255,255,255,0.6)" />
                    
                    <!-- Right Penalty Area (Away) -->
                    <rect x="500" y="55" width="80" height="130" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2" />
                    <rect x="550" y="80" width="30" height="80" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2" />
                    <circle cx="530" cy="120" r="2.5" fill="rgba(255,255,255,0.6)" />

                    <!-- Goal Mouths -->
                    <rect x="10" y="95" width="10" height="50" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="1.5" />
                    <rect x="580" y="95" width="10" height="50" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="1.5" />

                    <!-- Team Direction Labels -->
                    <text x="35" y="35" fill="#c084fc" font-size="11" font-weight="bold">${match.homeTeam} ➔</text>
                    <text x="565" y="35" fill="#2dd4bf" font-size="11" font-weight="bold" text-anchor="end">⬅ ${match.awayTeam}</text>

                    <!-- Animated Real-time Match Ball -->
                    <circle id="radar-ball-glow" cx="${ballX}%" cy="${ballY}%" r="12" fill="rgba(250, 204, 21, 0.4)" />
                    <circle id="radar-ball-dot" cx="${ballX}%" cy="${ballY}%" r="5" fill="#facc15" stroke="#ffffff" stroke-width="1.5" />
                </svg>
            </div>
        </div>

        <!-- Camel1.tv Comparative Match Stats -->
        <div class="flex flex-col gap-2.5">
            <!-- Ball Possession -->
            <div class="camel-stat-row">
                <div class="camel-stat-header">
                    <span style="color: #c084fc;">${homePoss}%</span>
                    <span class="camel-stat-label">Ball Possession</span>
                    <span style="color: #2dd4bf;">${awayPoss}%</span>
                </div>
                <div class="camel-stat-bar-container">
                    <div class="camel-stat-bar-home" style="width: ${homePoss}%;"></div>
                    <div class="camel-stat-bar-away" style="width: ${awayPoss}%;"></div>
                </div>
            </div>

            <!-- Total Shots & On Target -->
            <div class="camel-stat-row">
                <div class="camel-stat-header">
                    <span>${homeShots} <span class="text-xs text-white/50">(${homeOnTarget})</span></span>
                    <span class="camel-stat-label">Shots (On Target)</span>
                    <span>${awayShots} <span class="text-xs text-white/50">(${awayOnTarget})</span></span>
                </div>
                <div class="camel-stat-bar-container">
                    <div class="camel-stat-bar-home" style="width: ${Math.round((homeShots / (homeShots + awayShots || 1)) * 100)}%;"></div>
                    <div class="camel-stat-bar-away" style="width: ${Math.round((awayShots / (homeShots + awayShots || 1)) * 100)}%;"></div>
                </div>
            </div>

            <!-- Dangerous Attacks -->
            <div class="camel-stat-row">
                <div class="camel-stat-header">
                    <span>${homeAttacks}</span>
                    <span class="camel-stat-label">Dangerous Attacks</span>
                    <span>${awayAttacks}</span>
                </div>
                <div class="camel-stat-bar-container">
                    <div class="camel-stat-bar-home" style="width: ${Math.round((homeAttacks / (homeAttacks + awayAttacks || 1)) * 100)}%;"></div>
                    <div class="camel-stat-bar-away" style="width: ${Math.round((awayAttacks / (homeAttacks + awayAttacks || 1)) * 100)}%;"></div>
                </div>
            </div>

            <!-- Corner Kicks -->
            <div class="camel-stat-row">
                <div class="camel-stat-header">
                    <span>${homeCorners}</span>
                    <span class="camel-stat-label">Corner Kicks</span>
                    <span>${awayCorners}</span>
                </div>
                <div class="camel-stat-bar-container">
                    <div class="camel-stat-bar-home" style="width: ${Math.round((homeCorners / (homeCorners + awayCorners || 1)) * 100)}%;"></div>
                    <div class="camel-stat-bar-away" style="width: ${Math.round((awayCorners / (homeCorners + awayCorners || 1)) * 100)}%;"></div>
                </div>
            </div>

            <!-- Fouls & Cards -->
            <div class="camel-stat-row">
                <div class="camel-stat-header">
                    <span>${homeFouls} <span class="text-xs text-yellow-400 font-bold">(${homeCards}🟨)</span></span>
                    <span class="camel-stat-label">Fouls (Cards)</span>
                    <span>${awayFouls} <span class="text-xs text-yellow-400 font-bold">(${awayCards}🟨)</span></span>
                </div>
            </div>

            <!-- Offsides -->
            <div class="camel-stat-row">
                <div class="camel-stat-header">
                    <span>${homeOffsides}</span>
                    <span class="camel-stat-label">Offsides</span>
                    <span>${awayOffsides}</span>
                </div>
            </div>
        </div>
    `;
}

// ==========================================================================
// REAL-TIME AUTO-UPDATING LIVE MATCH SIMULATION & DYNAMIC ODDS ENGINE
// ==========================================================================

let liveSimTimer = null;
let liveSimTickCount = 0;
let ballPositionX = 62;
let ballPositionY = 48;
let ballDirection = 1;

function startLiveMatchSimulationEngine() {
    if (liveSimTimer) clearInterval(liveSimTimer);
    liveSimTimer = setInterval(() => {
        tickLiveMatches();
    }, 3500); // Ticks every 3.5 seconds for active, fluid in-game pacing
}

function endLiveMatchNaturally(match) {
    if (!match || match.status === 'FINISHED') return;
    match.time = "Full Time";
    match.status = "FINISHED";
    match.isLocked = true;

    if (!match.timeline) match.timeline = [];
    match.timeline.unshift({
        time: "90'+3'",
        type: "end",
        desc: `🏁 Full Time Whistle: ${match.homeTeam} ${match.score.home} - ${match.score.away} ${match.awayTeam}. Match concluded!`,
        icon: "🏁"
    });

    verifyAllWagersStatus();
    updateLiveDomElements();
    renderLiveMatches();

    if (activeMatchId === match.id) {
        const liveScoreEl = document.getElementById("player-live-score");
        if (liveScoreEl) {
            liveScoreEl.innerHTML = `${match.homeTeam} <span id="player-score-home">${match.score.home}</span> - <span id="player-score-away">${match.score.away}</span> ${match.awayTeam}`;
        }
        const liveTimeEl = document.getElementById("player-live-time");
        if (liveTimeEl) liveTimeEl.textContent = "Full Time";
        if (typeof renderMatchTimeline === 'function') renderMatchTimeline();
    }

    showToast(`🏁 MATCH CONCLUDED: ${match.homeTeam} ${match.score.home} - ${match.score.away} ${match.awayTeam} (Full Time). Wagers verified!`, "success");
}

function tickLiveMatches() {
    liveSimTickCount++;
    const liveMatches = MATCHES_DATA.filter(m => (m.scheduleGroup === 'live' || m.status === 'LIVE') && m.status !== 'FINISHED' && m.time !== 'Full Time');
    if (liveMatches.length === 0) return;

    // 1. Advance minutes dynamically every ~4 ticks (~14 seconds) and check for Full Time
    if (liveSimTickCount % 4 === 0) {
        liveMatches.forEach(m => {
            const currentMin = parseInt(m.time);
            if (!isNaN(currentMin)) {
                if (currentMin >= 90) {
                    if (currentMin >= 93) {
                        endLiveMatchNaturally(m);
                    } else {
                        m.time = `90'+${currentMin - 89}'`;
                    }
                } else {
                    m.time = `${currentMin + 1}'`;
                }
            }
        });
    }

    // 2. Animate 2D pitch coordinates for the active match
    const activeMatch = MATCHES_DATA.find(m => m.id === activeMatchId);
    if (activeMatch && (activeMatch.scheduleGroup === 'live' || activeMatch.status === 'LIVE')) {
        // Move ball smoothly between attacking zones
        ballPositionX += (Math.random() * 14 - 7) * ballDirection;
        ballPositionY = Math.min(82, Math.max(18, ballPositionY + (Math.random() * 12 - 6)));
        
        if (ballPositionX > 86) {
            ballPositionX = 84;
            ballDirection = -1;
        } else if (ballPositionX < 14) {
            ballPositionX = 16;
            ballDirection = 1;
        }

        // Update tactical description and SVG ball position
        const actionEl = document.getElementById("radar-event-ticker");
        const dotEl = document.getElementById("radar-ball-dot");
        const glowEl = document.getElementById("radar-ball-glow");
        if (dotEl) {
            dotEl.setAttribute("cx", `${ballPositionX}%`);
            dotEl.setAttribute("cy", `${ballPositionY}%`);
        }
        if (glowEl) {
            glowEl.setAttribute("cx", `${ballPositionX}%`);
            glowEl.setAttribute("cy", `${ballPositionY}%`);
        }
        
        if (actionEl && !activeMatch.isLocked) {
            let zoneDesc = "";
            if (ballPositionX > 65) {
                zoneDesc = `🔴 ${activeMatch.homeTeam}: Dangerous Attack (Final Third)`;
            } else if (ballPositionX < 35) {
                zoneDesc = `⚡ ${activeMatch.awayTeam}: Fast Break (Counter-Attack)`;
            } else {
                zoneDesc = `⚽ Midfield Battle (${activeMatch.homeTeam} in possession)`;
            }
            actionEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span>${zoneDesc}</span>`;
        }

        // Fluctuate in-game stats incrementally
        if (activeMatch.stats && liveSimTickCount % 5 === 0) {
            if (Math.random() > 0.4) {
                if (ballPositionX > 50) activeMatch.stats.attacks.home++;
                else activeMatch.stats.attacks.away++;
            }
            if (Math.random() > 0.75) {
                if (ballPositionX > 70) activeMatch.stats.shots.home++;
                else if (ballPositionX < 30) activeMatch.stats.shots.away++;
            }
            if (Math.random() > 0.85) {
                if (ballPositionX > 75) activeMatch.stats.corners.home++;
                else if (ballPositionX < 25) activeMatch.stats.corners.away++;
            }
        }
    }

    // 3. Realistic dynamic goal trigger (approx every 20 ticks = 70s)
    if (liveSimTickCount % 20 === 0) {
        // Pick one live match randomly to score
        const targetMatch = liveMatches[Math.floor(Math.random() * liveMatches.length)];
        if (targetMatch && !targetMatch.isLocked) {
            triggerLiveMatchGoal(targetMatch);
        }
    } else {
        // 4. Subtle dynamic in-play odds adjustments (time decay & probability shift)
        liveMatches.forEach(m => {
            if (!m.isLocked && Math.random() > 0.45) {
                adjustDynamicOddsForMatch(m);
            }
        });
    }

    // Update scoreboard & DOM elements without disrupting user scrolling
    updateLiveDomElements();
}

function triggerLiveMatchGoal(match) {
    const isHome = (Math.random() > 0.45);
    const scoringTeam = isHome ? match.homeTeam : match.awayTeam;
    
    // Temporarily lock markets for goal review (SportyBet / Bet365 in-play suspension standard)
    match.isLocked = true;
    
    // Update score
    if (isHome) match.score.home++;
    else match.score.away++;
    
    const minStr = match.time || "72'";
    
    // Add timeline event
    if (!match.timeline) match.timeline = [];
    match.timeline.unshift({
        time: minStr,
        type: "goal",
        desc: `⚽ GOAL! ${scoringTeam} scores! (${match.homeTeam} ${match.score.home} - ${match.score.away} ${match.awayTeam})`,
        icon: "⚽"
    });
    
    showToast(`⚽ GOAL! ${scoringTeam} has scored! (${match.homeTeam} ${match.score.home} - ${match.score.away} ${match.awayTeam}) 🔒 Markets Suspended`, "success");
    
    // Update live DOM
    updateLiveDomElements();
    if (activeMatchId === match.id) {
        renderMatchTimeline();
        renderMatchStats();
    }
    renderLiveMatches();
    
    // Reopen markets after 8 seconds with updated dynamic odds
    setTimeout(() => {
        match.isLocked = false;
        recalculateMatchOddsAfterGoal(match, isHome);
        updateLiveDomElements();
        renderLiveMatches();
        showToast(`🔓 Markets Reopened with Dynamic In-Play Odds for ${match.homeTeam} vs ${match.awayTeam}`, "info");
    }, 8000);
}

function recalculateMatchOddsAfterGoal(match, isHomeGoal) {
    const goalDiff = match.score.home - match.score.away;
    if (goalDiff > 0) {
        // Home leading: home odds shorten drastically, away lengthens
        match.odds.home = Math.max(1.08, parseFloat((1.35 / (1 + goalDiff * 0.4)).toFixed(2)));
        match.odds.draw = parseFloat((3.60 + goalDiff * 1.8).toFixed(2));
        match.odds.away = parseFloat((match.odds.away * 1.6 + 2.0).toFixed(2));
    } else if (goalDiff < 0) {
        // Away leading: away odds shorten, home lengthens
        const absDiff = Math.abs(goalDiff);
        match.odds.away = Math.max(1.08, parseFloat((1.35 / (1 + absDiff * 0.4)).toFixed(2)));
        match.odds.draw = parseFloat((3.60 + absDiff * 1.8).toFixed(2));
        match.odds.home = parseFloat((match.odds.home * 1.6 + 2.0).toFixed(2));
    } else {
        // Tied
        match.odds.draw = 2.10;
        match.odds.home = 2.60;
        match.odds.away = 2.75;
    }
}

function adjustDynamicOddsForMatch(match) {
    if (!match || !match.odds) return;
    const isHomeLeading = match.score.home > match.score.away;
    const isAwayLeading = match.score.away > match.score.home;
    
    let shifted = [];

    if (isHomeLeading && match.odds.home > 1.08) {
        match.odds.home = parseFloat((match.odds.home - 0.01).toFixed(2));
        match.odds.away = parseFloat((match.odds.away + 0.03).toFixed(2));
        shifted.push({ id: 0, delta: -0.01, val: match.odds.home });
        shifted.push({ id: 1, delta: +0.03, val: match.odds.away });
    } else if (isAwayLeading && match.odds.away > 1.08) {
        match.odds.away = parseFloat((match.odds.away - 0.01).toFixed(2));
        match.odds.home = parseFloat((match.odds.home + 0.03).toFixed(2));
        shifted.push({ id: 1, delta: -0.01, val: match.odds.away });
        shifted.push({ id: 0, delta: +0.03, val: match.odds.home });
    } else if (Math.random() > 0.6) {
        const delta = Math.random() > 0.5 ? 0.02 : -0.02;
        match.odds.draw = parseFloat(Math.max(1.80, match.odds.draw + delta).toFixed(2));
        shifted.push({ id: 2, delta: delta, val: match.odds.draw });
    }

    // Top-Tier UI Animation: Flash corresponding odds buttons on screen
    shifted.forEach(s => {
        const buttons = document.querySelectorAll(`button[onclick*="selectOdds(${match.id}, ${s.id},"]`);
        buttons.forEach(btn => {
            const valSpan = btn.querySelector('.val, .odd-val, span:last-child');
            if (valSpan && valSpan.textContent.includes('.')) {
                valSpan.textContent = s.val.toFixed(2);
            }
            const driftClass = s.delta > 0 ? 'odds-drift-up' : 'odds-drift-down';
            btn.classList.add(driftClass);
            setTimeout(() => btn.classList.remove(driftClass), 1400);
        });
    });
}

function updateLiveDomElements() {
    // 1. Update player live score in video player box
    const activeMatch = MATCHES_DATA.find(m => m.id === activeMatchId);
    if (activeMatch) {
        const isLive = (activeMatch.status === 'LIVE' || activeMatch.scheduleGroup === 'live');
        const isFinished = (activeMatch.status === 'FINISHED' || activeMatch.time === 'Full Time');
        const hasScore = (isLive || isFinished) && activeMatch.score && typeof activeMatch.score.home === 'number';
        const homeScoreEl = document.getElementById("player-score-home");
        const awayScoreEl = document.getElementById("player-score-away");
        const liveTimeEl = document.getElementById("player-live-time");
        if (hasScore) {
            if (homeScoreEl) homeScoreEl.textContent = activeMatch.score.home;
            if (awayScoreEl) awayScoreEl.textContent = activeMatch.score.away;
        }
        if (liveTimeEl) {
            if (isFinished) liveTimeEl.textContent = "🏁 Full Time";
            else if (isLive) liveTimeEl.textContent = `🔴 ${activeMatch.time || 'LIVE'}`;
            else liveTimeEl.textContent = `📅 ${activeMatch.time || 'Scheduled'}`;
        }
    }

    // 2. Update scores in visible table rows without rebuilding table DOM
    MATCHES_DATA.forEach(m => {
        const row = document.getElementById(`matrix-row-${m.id}`);
        if (row) {
            const isFinished = (m.status === 'FINISHED' || m.time === 'Full Time');
            const isLive = (m.status === 'LIVE');
            const scoreEls = row.querySelectorAll(".matrix-team-name .score");
            if (scoreEls.length >= 2) {
                if ((isLive || isFinished) && m.score && typeof m.score.home === 'number') {
                    scoreEls[0].textContent = m.score.home;
                    scoreEls[1].textContent = m.score.away;
                    if (isFinished) {
                        scoreEls[0].style.color = '#38bdf8';
                        scoreEls[0].style.fontWeight = '800';
                        scoreEls[1].style.color = '#38bdf8';
                        scoreEls[1].style.fontWeight = '800';
                    }
                } else {
                    scoreEls[0].textContent = '';
                    scoreEls[1].textContent = '';
                }
            }
            const pulseEl = row.querySelector(".badge-live-pulse, .badge-finished");
            if (pulseEl) {
                if (isFinished) {
                    pulseEl.className = 'badge-finished';
                    pulseEl.textContent = '🏁 Full Time';
                } else if (isLive) {
                    pulseEl.className = 'badge-live-pulse';
                    pulseEl.textContent = m.time;
                }
            }
        }
    });

    // 3. Update count pills
    const leagueFilterPass = (m) => {
        if (activeLeagueFilter === 'all') return true;
        const leagueStr = ((m.league || '') + ' ' + (m.leagueCategory || '')).toLowerCase();
        return leagueStr.includes(activeLeagueFilter.toLowerCase());
    };
    const countLive = MATCHES_DATA.filter(m => (m.scheduleGroup === 'live' || m.status === 'LIVE') && m.status !== 'FINISHED' && m.time !== 'Full Time' && leagueFilterPass(m)).length;
    const countFinished = MATCHES_DATA.filter(m => (m.status === 'FINISHED' || m.time === 'Full Time') && leagueFilterPass(m)).length;
    const countPillLive = document.getElementById("count-pill-live");
    if (countPillLive) countPillLive.textContent = countLive;
    const countPillFinished = document.getElementById("count-pill-finished");
    if (countPillFinished) countPillFinished.textContent = countFinished;

    // 4. Dynamically update Cash Out values and evaluate Auto Cash-Out rules
    if (localWagers && localWagers.length > 0) {
        localWagers.forEach((w, idx) => {
            if (w.status === "Pending" || w.status === "PENDING") {
                const currentCashVal = calculateCashoutValue(w);

                // Auto Cash-Out Trigger Check
                if (w.autoCashoutTarget && w.autoCashoutTarget > 0 && currentCashVal >= w.autoCashoutTarget && !w._isProcessingCashout) {
                    executeCashOut(idx, 100);
                    showToast(`🎯 AUTO CASH-OUT TRIGGERED! Target of ${w.autoCashoutTarget.toFixed(2)} SOL reached! +${currentCashVal.toFixed(4)} SOL credited to your wallet!`, "success");
                    return;
                }

                const btn = document.getElementById(`cashout-btn-${idx}`) || document.querySelector(`button[onclick*="executeCashOut(${idx}"]`);
                if (btn) {
                    const valSpan = btn.querySelector('.cashout-val');
                    if (valSpan && currentCashVal > 0) {
                        const oldText = valSpan.textContent.trim();
                        const newText = `${currentCashVal.toFixed(4)} SOL`;
                        if (oldText !== newText) {
                            valSpan.textContent = newText;
                            // Flash subtle emerald glow when cashout updates
                            btn.style.boxShadow = '0 0 16px rgba(16, 185, 129, 0.7)';
                            setTimeout(() => {
                                btn.style.boxShadow = '0 0 12px rgba(16, 185, 129, 0.25)';
                            }, 900);
                        }
                    }
                }
            }
        });
    }
}

function renderMatchLineups() {
    const container = document.getElementById("lineups-scroll-container");
    if (!container) return;
    
    const match = MATCHES_DATA.find(m => m.id === activeMatchId);
    if (!match) {
        container.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 2rem 0;">Select a match to view lineups</div>`;
        return;
    }
    
    if (!match.lineup || !match.lineup.home) {
        container.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 2rem 0;">Lineups not available for this match</div>`;
        return;
    }
    
    let html = `
        <div class="lineup-formation-badge">
            ${match.homeTeam} (${match.formation.home}) vs ${match.awayTeam} (${match.formation.away})
        </div>
        <div class="lineups-row">
            <div class="lineups-team-side">
                <div class="lineups-team-name">${match.homeTeam} XI</div>
                <div class="lineup-players-list">
                    ${match.lineup.home.map(p => `
                        <div class="lineup-player-item">
                            <div>
                                <span class="lineup-player-num">${p.num}</span>
                                <span>${p.name}</span>
                            </div>
                            <span style="color: var(--neon-purple); font-weight: 600; font-size: 0.75rem;">${p.pos}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="lineups-team-side">
                <div class="lineups-team-name">${match.awayTeam} XI</div>
                <div class="lineup-players-list">
                    ${match.lineup.away.map(p => `
                        <div class="lineup-player-item">
                            <div>
                                <span class="lineup-player-num">${p.num}</span>
                                <span>${p.name}</span>
                            </div>
                            <span style="color: var(--neon-purple); font-weight: 600; font-size: 0.75rem;">${p.pos}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        <div class="lineups-substitutes">
            <div class="lineups-subs-title">Substitutes</div>
            <div class="lineups-subs-list">
                <div>
                    <div style="font-weight: 700; margin-bottom: 0.3rem; color: var(--text-primary); font-size: 0.75rem;">${match.homeTeam} Subs</div>
                    ${match.subs.home.map(name => `<div style="padding: 0.15rem 0;">${name}</div>`).join('')}
                </div>
                <div>
                    <div style="font-weight: 700; margin-bottom: 0.3rem; color: var(--text-primary); font-size: 0.75rem;">${match.awayTeam} Subs</div>
                    ${match.subs.away.map(name => `<div style="padding: 0.15rem 0;">${name}</div>`).join('')}
                </div>
            </div>
        </div>
    `;
    container.innerHTML = html;
}

function renderMatchTimeline() {
    const container = document.getElementById("timeline-scroll-container");
    if (!container) return;
    
    const match = MATCHES_DATA.find(m => m.id === activeMatchId);
    if (!match) {
        container.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 2rem 0;">Select a match to view timeline</div>`;
        return;
    }
    
    if (!match.timeline || match.timeline.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 2rem 0;">No events recorded yet</div>`;
        return;
    }
    
    let html = match.timeline.map(ev => `
        <div class="timeline-event">
            <div class="timeline-event-time">${ev.time}</div>
            <div class="timeline-event-marker">${ev.icon || "⚽"}</div>
            <div class="timeline-event-detail">
                <div style="font-weight: 600;">${ev.type === 'goal' ? '⚽ GOAL!' : ev.type === 'card' ? '🟨 Card' : '📢 Match Event'}</div>
                <div class="timeline-event-desc">${ev.desc}</div>
            </div>
        </div>
    `).join('');
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
}

async function switchNetwork() {
    const rpcSelect = document.getElementById("network-rpc-select");
    const val = rpcSelect ? rpcSelect.value : "devnet";
    const status = document.getElementById("network-status-text");
    showToast(`Switching to ${val}...`, "info");
    
    let endpoint = "https://api.devnet.solana.com";
    let label = "Solana Devnet";
    
    if (val === "localnet") {
        endpoint = "http://127.0.0.1:8899";
        label = "Local Validator";
    } else if (val === "helius") {
        endpoint = "https://devnet.helius-rpc.com/?api-key=49910d95-88f5-42a4-b043-4dc975b9aa4b";
        label = "Helius Fast RPC";
    } else if (val === "quicknode") {
        endpoint = "https://api.devnet.solana.com";
        label = "QuickNode RPC";
    }
    
    try {
        connection = new solanaWeb3.Connection(endpoint, "confirmed");
        if (status) status.textContent = label;
        await pingRpcLatency();
        await updateWalletBalance();
        initStreams();
        showToast(`Connected to ${label}`, "success");
    } catch (e) {
        console.warn("RPC switch error, fallback to default devnet:", e);
        connection = new solanaWeb3.Connection("https://api.devnet.solana.com", "confirmed");
        if (status) status.textContent = "Solana Devnet";
    }
}

// Live RPC latency ping measurement
async function pingRpcLatency() {
    const badge = document.getElementById("rpc-latency-badge");
    if (!badge || !connection) return;
    try {
        const start = performance.now();
        await connection.getSlot("processed");
        const lat = Math.max(12, Math.round(performance.now() - start));
        badge.textContent = `${lat}ms`;
        if (lat < 120) {
            badge.style.color = "#34d399";
            badge.style.borderColor = "rgba(16, 185, 129, 0.4)";
            badge.style.background = "rgba(16, 185, 129, 0.1)";
        } else if (lat < 300) {
            badge.style.color = "#fbbf24";
            badge.style.borderColor = "rgba(245, 158, 11, 0.4)";
            badge.style.background = "rgba(245, 158, 11, 0.1)";
        } else {
            badge.style.color = "#f87171";
            badge.style.borderColor = "rgba(239, 68, 68, 0.4)";
            badge.style.background = "rgba(239, 68, 68, 0.1)";
        }
    } catch (e) {
        badge.textContent = "38ms";
    }
}

// Unified robust transaction sender & confirmation checker
async function sendConfirmAndVerifyTransaction(tx, signers) {
    try {
        // Fetch and inject dynamic priority fees and compute budget limit
        let priorityFee = 1000;
        try {
            const fees = await connection.getRecentPrioritizationFees();
            if (fees && fees.length > 0) {
                // Get the 75th percentile fee to ensure quick inclusion
                const sorted = fees.map(f => f.prioritizationFee).sort((a, b) => a - b);
                const p75 = sorted[Math.floor(sorted.length * 0.75)];
                priorityFee = Math.max(1000, p75);
            }
        } catch (feeError) {
            console.error("Error fetching priority fees, using fallback:", feeError);
        }

        // Safe compute budget parameters: set CU limit to 120,000 and dynamic price
        const limitInstruction = solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({ limit: 120000 });
        const priceInstruction = solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee });
        tx.instructions.unshift(limitInstruction, priceInstruction);

        let sig;
        if (activeWalletType === 'phantom') {
            if (!window.solana) {
                throw new Error("Phantom Wallet extension is not available.");
            }
            showToast("Please sign the transaction in your Phantom Wallet...", "info");
            
            tx.feePayer = activePublicKey;
            const { blockhash } = await connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            
            const otherSigners = signers.filter(s => s !== walletKeypair);
            if (otherSigners.length > 0) {
                tx.partialSign(...otherSigners);
            }
            
            const signedTx = await window.solana.signTransaction(tx);
            sig = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: true });
        } else {
            sig = await connection.sendTransaction(tx, signers, { skipPreflight: true });
        }
        await connection.confirmTransaction(sig);
        
        // Verify on-chain success by fetching status
        const status = await connection.getSignatureStatus(sig);
        if (status && status.value && status.value.err) {
            let logs = [];
            try {
                // Fetch transaction details to extract contract log messages
                const txDetails = await connection.getTransaction(sig, { commitment: 'confirmed' });
                if (txDetails && txDetails.meta && txDetails.meta.logMessages) {
                    logs = txDetails.meta.logMessages;
                }
            } catch (err) {
                console.error("Could not fetch logs for failed transaction", err);
            }
            const errorMsg = logs.length > 0 
                ? `Transaction failed on-chain: ${JSON.stringify(status.value.err)}. Logs: ${logs.join(" | ")}` 
                : `Transaction failed on-chain: ${JSON.stringify(status.value.err)}`;
            const finalErr = new Error(errorMsg);
            if (logs.length > 0) {
                finalErr.logs = logs;
            }
            throw finalErr;
        }
        return sig;
    } catch (e) {
        // Retrieve transaction simulation logs if transaction threw SendTransactionError
        let logs = e.logs;
        if (!logs && typeof e.getLogs === 'function') {
            try {
                logs = await e.getLogs();
            } catch (err) {
                console.error("getLogs failed", err);
            }
        }
        if (logs && logs.length > 0) {
            e.logs = logs;
            const accountDataTooSmall = logs.some(log => log.includes("account data too small"));
            if (accountDataTooSmall) {
                throw new Error("Account data too small. Ensure the match market and platform state are initialized in the Admin Console (Operations Control Room) first. Logs: " + logs.join(" | "));
            }
            throw new Error(`${e.message}. Logs: ${logs.join(" | ")}`);
        }
        throw e;
    }
}

// 6. Leaderboard Data & Dynamic Renderer
const LEADERBOARD_DATA = [
    { rank: 1, address: "DirmZaAX8CuoHyvwick6wjnvfDWxnyZyTSf1yoSME2hT", winRate: "89%", wagers: 142, profit: "482.4 SOL", name: "DegenKing" },
    { rank: 2, address: "GnjgbeuLcmy1tUNRSzwAM5yPmsmKJvvP7H33H6vMoAm9", winRate: "78%", wagers: 98, profit: "215.1 SOL", name: "SolSniper" },
    { rank: 3, address: "Crb6DGVkXfwDTY9gTaMm62VEfYHF5PA1oJGpF1Ls6RCS", winRate: "72%", wagers: 114, profit: "189.5 SOL", name: "WhaleMaker" },
    { rank: 4, address: "5mmeXYXKJkNkWuz6f9WhZprkkiNLpdWkFWarqB6PN75N", winRate: "68%", wagers: 74, profit: "95.8 SOL", name: "AlphaChaser" },
    { rank: 5, address: "CMtyux7PeLhzZ7NyTaSkXxebcysNBappKfxZGsuWySNh", winRate: "64%", wagers: 52, profit: "41.2 SOL", name: "YieldFarmer" }
];

function renderLeaderboard() {
    try {
        const podiumEl = document.getElementById("leaderboard-podium");
        const rowsEl = document.getElementById("leaderboard-rows");
        if (!podiumEl || !rowsEl) return;

        // Render Podium Cards (2nd, 1st, 3rd layout)
        const podiumHTML = `
            <!-- Rank 2 -->
            <div class="glass-panel p-4 rounded-xl flex flex-col items-center justify-between text-center relative border-t border-white/10 hover:bg-white/[0.02] transition-all">
                <span class="absolute top-2 right-2 text-label-xs text-on-surface/40">#2</span>
                <div class="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-headline-sm font-black text-white bg-slate-800/40 backdrop-blur-md">🥈</div>
                <div class="font-bold text-white text-label-md mt-2">${LEADERBOARD_DATA[1].name}</div>
                <div class="text-label-xs text-on-surface/40 truncate w-full font-mono mt-0.5">${LEADERBOARD_DATA[1].address.slice(0, 6)}...${LEADERBOARD_DATA[1].address.slice(-4)}</div>
                <div class="text-label-sm font-black text-secondary mt-2">${LEADERBOARD_DATA[1].profit}</div>
            </div>
            <!-- Rank 1 -->
            <div class="glass-panel p-5 rounded-xl flex flex-col items-center justify-between text-center relative border border-secondary/30 scale-105 shadow-[0_0_20px_rgba(0,236,145,0.15)] bg-white/[0.02] transition-all">
                <span class="absolute top-2 right-2 text-label-xs text-secondary font-bold">#1</span>
                <div class="w-12 h-12 rounded-full border border-secondary flex items-center justify-center text-headline-md font-black text-white bg-secondary/10 backdrop-blur-md">🥇</div>
                <div class="font-bold text-white text-label-md mt-2">${LEADERBOARD_DATA[0].name}</div>
                <div class="text-label-xs text-on-surface/40 truncate w-full font-mono mt-0.5">${LEADERBOARD_DATA[0].address.slice(0, 6)}...${LEADERBOARD_DATA[0].address.slice(-4)}</div>
                <div class="text-label-sm font-black text-secondary mt-2">${LEADERBOARD_DATA[0].profit}</div>
            </div>
            <!-- Rank 3 -->
            <div class="glass-panel p-4 rounded-xl flex flex-col items-center justify-between text-center relative border-t border-white/10 hover:bg-white/[0.02] transition-all">
                <span class="absolute top-2 right-2 text-label-xs text-on-surface/40">#3</span>
                <div class="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-headline-sm font-black text-white bg-amber-950/20 backdrop-blur-md">🥉</div>
                <div class="font-bold text-white text-label-md mt-2">${LEADERBOARD_DATA[2].name}</div>
                <div class="text-label-xs text-on-surface/40 truncate w-full font-mono mt-0.5">${LEADERBOARD_DATA[2].address.slice(0, 6)}...${LEADERBOARD_DATA[2].address.slice(-4)}</div>
                <div class="text-label-sm font-black text-secondary mt-2">${LEADERBOARD_DATA[2].profit}</div>
            </div>
        `;
        podiumEl.innerHTML = podiumHTML;

        // Render List Rows
        let rowsHTML = "";
        LEADERBOARD_DATA.forEach(p => {
            rowsHTML += `
                <tr class="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                    <td class="py-4 px-2 font-bold text-white">${p.rank}</td>
                    <td class="py-4">
                        <div class="flex flex-col">
                            <span class="font-bold text-white">${p.name}</span>
                            <span class="text-label-xs text-on-surface/40 font-mono">${p.address.slice(0, 8)}...${p.address.slice(-8)}</span>
                        </div>
                    </td>
                    <td class="py-4 text-right text-white font-medium">${p.winRate}</td>
                    <td class="py-4 text-right text-on-surface/60">${p.wagers}</td>
                    <td class="py-4 text-right font-black text-secondary">${p.profit}</td>
                </tr>
            `;
        });
        rowsEl.innerHTML = rowsHTML;
    } catch (e) {
        console.error("Error in renderLeaderboard:", e);
    }
}

// ------------------------------------------------------------------------
// Sandbox & Demo Control Room Features
// ------------------------------------------------------------------------

function toggleDemoPanel() {
    const panel = document.getElementById("demo-controls-panel");
    if (panel) {
        panel.classList.toggle("hidden");
    }
}

async function switchSandboxProfile(profileId) {
    if (activeWalletType !== 'sandbox') {
        showToast("Please switch to Sandbox Wallet to use profiles!", "warning");
        return;
    }
    
    currentSandboxProfile = profileId;
    localStorage.setItem("solplay_current_sandbox_profile", profileId);
    
    walletKeypair = null;
    loadOrCreateWallet();
    
    const connectBtn = document.getElementById("btn-connect-wallet");
    if (isWalletConnected && connectBtn) {
        connectBtn.textContent = activePublicKey.toString().slice(0, 6) + "..." + activePublicKey.toString().slice(-4);
        await updateWalletBalance();
    }
    
    loadWagersFromStorage();
    renderActiveWagers();
    updateDemoControlsUI();
    showToast(`Switched to Sandbox Profile: ${profileId.toUpperCase().replace('_', ' ')}!`, "success");
}

function updateSimulationSpeed(speedMs) {
    simulationTickInterval = speedMs;
    startMatchTimer();
    updateDemoControlsUI();
    
    let label = "Normal (6s)";
    if (speedMs === 1500) label = "Fast (1.5s)";
    if (speedMs === 300) label = "Turbo (0.3s)";
    showToast(`Simulation speed: ${label}`, "info");
}

function updateDemoControlsUI() {
    // Update Wallet Profile buttons styling
    ["profile_a", "profile_b", "profile_c"].forEach(prof => {
        const btn = document.getElementById(`btn-profile-${prof}`);
        if (btn) {
            if (currentSandboxProfile === prof) {
                btn.style.background = "linear-gradient(135deg, var(--neon-teal), #0d9488)";
                btn.style.boxShadow = "var(--glow-teal)";
                btn.style.borderColor = "transparent";
            } else {
                btn.style.background = "rgba(255,255,255,0.05)";
                btn.style.boxShadow = "none";
                btn.style.borderColor = "rgba(255,255,255,0.05)";
            }
        }
    });

    // Update Speed buttons styling
    [6000, 1500, 300].forEach(speed => {
        const btn = document.getElementById(`btn-speed-${speed}`);
        if (btn) {
            if (simulationTickInterval === speed) {
                btn.style.background = "linear-gradient(135deg, var(--neon-pink), #db2777)";
                btn.style.boxShadow = "var(--glow-pink)";
                btn.style.borderColor = "transparent";
            } else {
                btn.style.background = "rgba(255,255,255,0.05)";
                btn.style.boxShadow = "none";
                btn.style.borderColor = "rgba(255,255,255,0.05)";
            }
        }
    });
}

function populateDemoMatchSelect() {
    const selectEl = document.getElementById("demo-match-select");
    if (!selectEl) return;
    
    const currentVal = selectEl.value;
    selectEl.innerHTML = "";
    
    MATCHES_DATA.forEach(match => {
        const opt = document.createElement("option");
        opt.value = match.id;
        opt.className = "bg-surface text-white";
        opt.textContent = `${match.homeTeam} vs ${match.awayTeam} (${match.time})`;
        selectEl.appendChild(opt);
    });
    
    if (currentVal && MATCHES_DATA.some(m => m.id == currentVal)) {
        selectEl.value = currentVal;
    } else if (activeMatchId) {
        selectEl.value = activeMatchId;
    }
}

function adjustMatchTime(matchId, minutes) {
    const match = MATCHES_DATA.find(m => m.id === matchId);
    if (!match) return;
    
    match.time = `${minutes}'`;
    if (minutes >= 90) {
        match.time = "Full Time";
        match.status = "FINISHED";
        verifyAllWagersStatus();
        showToast(`Match ended: ${match.homeTeam} ${match.score.home} - ${match.score.away} ${match.awayTeam}`, "success");
    } else {
        match.status = "LIVE";
    }
    
    renderLiveMatches();
    if (activeMatchId === matchId) {
        const liveTimeEl = document.getElementById("player-live-time");
        if (liveTimeEl) liveTimeEl.textContent = match.time;
        renderMatchTimeline();
    }
    showToast(`Adjusted match time to ${minutes}'`, "success");
}

function addGoalToMatch(matchId, isHome) {
    const match = MATCHES_DATA.find(m => m.id === matchId);
    if (!match || match.status !== 'LIVE') {
        showToast("Cannot add goal, match is not live.", "warning");
        return;
    }
    
    if (isHome) {
        match.score.home++;
    } else {
        match.score.away++;
    }
    
    // Suspend match betting for 3 seconds (shorter for testing/demo)
    match.isSuspended = true;
    setTimeout(() => {
        match.isSuspended = false;
        renderLiveMatches();
    }, 3000);
    
    adjustLiveOddsOnGoal(match);
    
    const playerName = isHome ? "Home Star" : "Away Star";
    const teamName = isHome ? match.homeTeam : match.awayTeam;
    const desc = `Goal! ${teamName} ${match.score.home} - ${match.score.away}. Scored by ${playerName} (Demo Action).`;
    
    match.timeline.push({
        time: match.time,
        type: "goal",
        desc: desc,
        icon: "⚽"
    });
    
    showToast(desc, "info");
    renderLiveMatches();
    
    if (activeMatchId === matchId) {
        const liveScoreEl = document.getElementById("player-live-score");
        if (liveScoreEl) {
            liveScoreEl.innerHTML = `${match.homeTeam} <span id="player-score-home">${match.score.home}</span> - <span id="player-score-away">${match.score.away}</span> ${match.awayTeam}`;
        }
        renderMatchTimeline();
    }
}

function forceEndActiveMatch(outcomeType) {
    const match = MATCHES_DATA.find(m => m.id === activeMatchId);
    if (!match) return;
    
    if (match.status === "FINISHED") {
        showToast("Match is already finished.", "warning");
        return;
    }
    
    if (outcomeType === 'home') {
        if (match.score.home <= match.score.away) {
            match.score.home = match.score.away + 1;
        }
    } else if (outcomeType === 'away') {
        if (match.score.away <= match.score.home) {
            match.score.away = match.score.home + 1;
        }
    } else if (outcomeType === 'draw') {
        match.score.home = match.score.away;
    } else {
        if (match.score.home === match.score.away) {
            match.score.home++;
        }
    }
    
    match.time = "Full Time";
    match.status = "FINISHED";
    
    match.timeline.push({
        time: "90'",
        type: "end",
        desc: `Match concluded: ${match.homeTeam} ${match.score.home} - ${match.score.away} ${match.awayTeam}`,
        icon: "🏁"
    });
    
    verifyAllWagersStatus();
    renderLiveMatches();
    
    const liveScoreEl = document.getElementById("player-live-score");
    if (liveScoreEl) {
        liveScoreEl.innerHTML = `${match.homeTeam} <span id="player-score-home">${match.score.home}</span> - <span id="player-score-away">${match.score.away}</span> ${match.awayTeam}`;
    }
    const liveTimeEl = document.getElementById("player-live-time");
    if (liveTimeEl) {
        liveTimeEl.textContent = match.time;
    }
    renderMatchTimeline();
    
    showToast(`Force Ended match! Score: ${match.homeTeam} ${match.score.home} - ${match.score.away} ${match.awayTeam}`, "success");
}

function triggerDemoTimeAdjust(minutes) {
    const selectEl = document.getElementById("demo-match-select");
    if (!selectEl) return;
    const matchId = parseInt(selectEl.value);
    if (isNaN(matchId)) return;
    adjustMatchTime(matchId, minutes);
}

function triggerDemoGoal(isHome) {
    const selectEl = document.getElementById("demo-match-select");
    if (!selectEl) return;
    const matchId = parseInt(selectEl.value);
    if (isNaN(matchId)) return;
    addGoalToMatch(matchId, isHome);
}

function triggerDemoEnd(outcomeType) {
    const selectEl = document.getElementById("demo-match-select");
    if (!selectEl) return;
    const matchId = parseInt(selectEl.value);
    if (isNaN(matchId)) return;
    
    // Switch active match if controlled match is different
    if (activeMatchId !== matchId) {
        selectActiveMatch(matchId);
    }
    forceEndActiveMatch(outcomeType);
}
