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
let activeSelection = null;
let milestoneProgress = 0;
let watchTimer = null;
let isWalletConnected = false;
let currentBettingTab = 'live';

// Simulated match state
let activeMatchId = 2026; // Default to Portugal vs Uzbekistan World Cup Match

const MATCHES_DATA = [
    {
        id: 2026,
        league: "World Cup Group K • Live",
        homeTeam: "Portugal",
        awayTeam: "Uzbekistan",
        time: "10'",
        status: "LIVE",
        score: { home: 0, away: 0 },
        formation: { home: "4-3-3", away: "3-4-3" },
        timeline: [
            { time: "0'", type: "start", desc: "Match started", icon: "🏁" }
        ]
    },
    {
        id: 999,
        league: "World Cup Tonight • Live",
        homeTeam: "Brazil",
        awayTeam: "France",
        time: "62'",
        status: "LIVE",
        score: { home: 1, away: 1 },
        formation: { home: "4-3-3", away: "4-2-3-1" },
        lineup: {
            home: [
                { num: 1, name: "Alisson", pos: "GK" },
                { num: 2, name: "Danilo", pos: "DF" },
                { num: 3, name: "Marquinhos", pos: "DF" },
                { num: 4, name: "Gabriel M.", pos: "DF" },
                { num: 6, name: "Guilherme Arana", pos: "DF" },
                { num: 5, name: "Bruno Guimaraes", pos: "MF" },
                { num: 8, name: "Lucas Paqueta", pos: "MF" },
                { num: 10, name: "Rodrygo", pos: "MF" },
                { num: 7, name: "Vinicius Jr", pos: "FW" },
                { num: 9, name: "Endrick", pos: "FW" },
                { num: 11, name: "Raphinha", pos: "FW" }
            ],
            away: [
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
            ]
        },
        subs: {
            home: ["Ederson", "Lucas Beraldo", "Douglas Luiz", "Andreas Pereira", "Savinho", "Gabriel Martinelli"],
            away: ["Brice Samba", "Ibrahima Konate", "Eduardo Camavinga", "Warren Zaire-Emery", "Bradley Barcola", "Olivier Giroud"]
        },
        timeline: [
            { time: "0'", type: "start", desc: "Match started", icon: "🏁" },
            { time: "22'", type: "goal", desc: "Goal! Brazil 1 - 0 France. Scored by Vinicius Jr (Assist: Lucas Paqueta).", icon: "⚽" },
            { time: "38'", type: "card", desc: "Yellow Card: Aurelien Tchouameni (France)", icon: "🟨" },
            { time: "45'", type: "half", desc: "Half Time (Brazil 1 - 0 France)", icon: "🏁" },
            { time: "52'", type: "goal", desc: "Goal! Brazil 1 - 1 France. Scored by Kylian Mbappe (Assist: Antoine Griezmann).", icon: "⚽" }
        ]
    },
    {
        id: 998,
        league: "Premier League • Live",
        homeTeam: "Arsenal",
        awayTeam: "Chelsea",
        time: "45'",
        status: "LIVE",
        score: { home: 0, away: 0 },
        formation: { home: "4-3-3", away: "4-2-3-1" },
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
                { num: 1, name: "Robert Sanchez", pos: "GK" },
                { num: 27, name: "Malo Gusto", pos: "DF" },
                { num: 29, name: "Wesley Fofana", pos: "DF" },
                { num: 6, name: "Levi Colwill", pos: "DF" },
                { num: 3, name: "Marc Cucurella", pos: "DF" },
                { num: 25, name: "Moises Caicedo", pos: "MF" },
                { num: 8, name: "Enzo Fernandez", pos: "MF" },
                { num: 11, name: "Noni Madueke", pos: "MF" },
                { num: 20, name: "Cole Palmer", pos: "MF" },
                { num: 19, name: "Jadon Sancho", pos: "MF" },
                { num: 15, name: "Nicolas Jackson", pos: "FW" }
            ]
        },
        subs: {
            home: ["Neto", "Oleksandr Zinchenko", "Jorginho", "Mikel Merino", "Leandro Trossard", "Gabriel Jesus"],
            away: ["Filip Jorgensen", "Tosin Adarabioyo", "Renato Veiga", "Romeo Lavia", "Joao Felix", "Christopher Nkunku"]
        },
        timeline: [
            { time: "0'", type: "start", desc: "Match started", icon: "🏁" },
            { time: "18'", type: "card", desc: "Yellow Card: Marc Cucurella (Chelsea)", icon: "🟨" },
            { time: "45'", type: "half", desc: "Half Time (Arsenal 0 - 0 Chelsea)", icon: "🏁" }
        ]
    },
    {
        id: 997,
        league: "Saudi Pro League • Live",
        homeTeam: "Al Nassr",
        awayTeam: "Al Hilal",
        time: "12'",
        status: "LIVE",
        score: { home: 0, away: 0 },
        formation: { home: "4-2-3-1", away: "4-3-3" },
        lineup: {
            home: [
                { num: 24, name: "Bento", pos: "GK" },
                { num: 2, name: "Sultan Al-Ghannam", pos: "DF" },
                { num: 3, name: "Mohamed Simakan", pos: "DF" },
                { num: 27, name: "Aymeric Laporte", pos: "DF" },
                { num: 83, name: "Salem Al-Najdi", pos: "DF" },
                { num: 17, name: "Abdullah Al-Khaibari", pos: "MF" },
                { num: 77, name: "Marcelo Brozovic", pos: "MF" },
                { num: 94, name: "Anderson Talisca", pos: "MF" },
                { num: 25, name: "Otavio", pos: "MF" },
                { num: 10, name: "Sadio Mane", pos: "FW" },
                { num: 7, name: "Cristiano Ronaldo", pos: "FW" }
            ],
            away: [
                { num: 37, name: "Yassine Bounou", pos: "GK" },
                { num: 66, name: "Saud Abdulhamid", pos: "DF" },
                { num: 3, name: "Kalidou Koulibary", pos: "DF" },
                { num: 87, name: "Hassan Tambakti", pos: "DF" },
                { num: 12, name: "Yasir Al-Shahrani", pos: "DF" },
                { num: 8, name: "Ruben Neves", pos: "MF" },
                { num: 22, name: "Sergej Milinkovic-Savic", pos: "MF" },
                { num: 29, name: "Salem Al-Dawsari", pos: "MF" },
                { num: 77, name: "Malcom", pos: "FW" },
                { num: 9, name: "Aleksandar Mitrovic", pos: "FW" },
                { num: 10, name: "Neymar Jr", pos: "FW" }
            ]
        },
        subs: {
            home: ["Raghed Al-Najjar", "Ali Lajami", "Alex Telles", "Seko Fofana", "Abdulrahman Ghareeb", "Mohammed Maran"],
            away: ["Mohammed Al-Owais", "Ali Al-Bulaihi", "Renan Lodi", "Mohamed Kanno", "Marcos Leonardo", "Abdullah Al-Hamdan"]
        },
        timeline: [
            { time: "0'", type: "start", desc: "Match started", icon: "🏁" }
        ]
    },
    {
        id: 996,
        league: "MLS • Upcoming",
        homeTeam: "Inter Miami",
        awayTeam: "LA Galaxy",
        time: "Upcoming",
        status: "UPCOMING",
        score: { home: 0, away: 0 },
        formation: { home: "4-3-3", away: "4-3-3" },
        lineup: {
            home: [
                { num: 1, name: "Drake Callender", pos: "GK" },
                { num: 57, name: "Marcelo Weigandt", pos: "DF" },
                { num: 6, name: "Tomas Aviles", pos: "DF" },
                { num: 21, name: "Nicolas Freire", pos: "DF" },
                { num: 18, name: "Jordi Alba", pos: "DF" },
                { num: 5, name: "Sergio Busquets", pos: "MF" },
                { num: 24, name: "Julian Gressel", pos: "MF" },
                { num: 20, name: "Diego Gomez", pos: "MF" },
                { num: 16, name: "Robert Taylor", pos: "FW" },
                { num: 9, name: "Luis Suarez", pos: "FW" },
                { num: 10, name: "Lionel Messi", pos: "FW" }
            ],
            away: [
                { num: 77, name: "John McCarthy", pos: "GK" },
                { num: 2, name: "Miki Yamane", pos: "DF" },
                { num: 4, name: "Maya Yoshida", pos: "DF" },
                { num: 24, name: "Jalen Neal", pos: "DF" },
                { num: 14, name: "John Nelson", pos: "DF" },
                { num: 20, name: "Edwin Cerrillo", pos: "MF" },
                { num: 8, name: "Mark Delgado", pos: "MF" },
                { num: 10, name: "Riqui Puig", pos: "MF" },
                { num: 28, name: "Joseph Paintsil", pos: "FW" },
                { num: 9, name: "Dejan Joveljic", pos: "FW" },
                { num: 7, name: "Gabriel Pec", pos: "FW" }
            ]
        },
        subs: {
            home: ["C. Dos Santos", "Ryan Sailor", "Noah Allen", "Benjamin Cremaschi", "Federico Redondo", "Leonardo Campana"],
            away: ["Novak Micovic", "Eriq Zavaleta", "Gaston Brugman", "Marco Reus", "Diego Fagundez", "Miguel Berry"]
        },
        timeline: []
    },
    {
        id: 995,
        league: "La Liga • Upcoming",
        homeTeam: "Real Madrid",
        awayTeam: "Barcelona",
        time: "Upcoming",
        status: "UPCOMING",
        score: { home: 0, away: 0 },
        formation: { home: "4-3-1-2", away: "4-3-3" },
        lineup: {
            home: [
                { num: 1, name: "Thibaut Courtois", pos: "GK" },
                { num: 2, name: "Dani Carvajal", pos: "DF" },
                { num: 3, name: "Eder Militao", pos: "DF" },
                { num: 22, name: "Antonio Rudiger", pos: "DF" },
                { num: 23, name: "Ferland Mendy", pos: "DF" },
                { num: 14, name: "Aurelien Tchouameni", pos: "MF" },
                { num: 15, name: "Federico Valverde", pos: "MF" },
                { num: 8, name: "Federico Camavinga", pos: "MF" },
                { num: 5, name: "Jude Bellingham", pos: "MF" },
                { num: 9, name: "Kylian Mbappe", pos: "FW" },
                { num: 7, name: "Vinicius Jr", pos: "FW" }
            ],
            away: [
                { num: 1, name: "Marc-Andre ter Stegen", pos: "GK" },
                { num: 23, name: "Jules Kounde", pos: "DF" },
                { num: 2, name: "Pau Cubarsi", pos: "DF" },
                { num: 5, name: "Inigo Martinez", pos: "DF" },
                { num: 3, name: "Alejandro Balde", pos: "DF" },
                { num: 17, name: "Marc Casado", pos: "MF" },
                { num: 8, name: "Pedri", pos: "MF" },
                { num: 20, name: "Dani Olmo", pos: "MF" },
                { num: 19, name: "Lamine Yamal", pos: "FW" },
                { num: 9, name: "Robert Lewandowski", pos: "FW" },
                { num: 11, name: "Raphinha", pos: "FW" }
            ]
        },
        subs: {
            home: ["Andriy Lunin", "Lucas Vazquez", "Fran Garcia", "Luka Modric", "Arda Guler", "Rodrygo Goes"],
            away: ["Inaki Pena", "Hector Fort", "Eric Garcia", "Frenkie de Jong", "Gavi", "Ferran Torres"]
        },
        timeline: []
    },
    {
        id: 994,
        league: "Serie A • Upcoming",
        homeTeam: "Inter Milan",
        awayTeam: "Juventus",
        time: "Upcoming",
        status: "UPCOMING",
        score: { home: 0, away: 0 },
        formation: { home: "3-5-2", away: "4-1-4-1" },
        lineup: {
            home: [
                { num: 1, name: "Yann Sommer", pos: "GK" },
                { num: 28, name: "Benjamin Pavard", pos: "DF" },
                { num: 15, name: "Francesco Acerbi", pos: "DF" },
                { num: 95, name: "Alessandro Bastoni", pos: "DF" },
                { num: 2, name: "Denzel Dumfries", pos: "MF" },
                { num: 23, name: "Nicolo Barella", pos: "MF" },
                { num: 20, name: "Hakan Calhanoglu", pos: "MF" },
                { num: 22, name: "Henrikh Mkhitaryan", pos: "MF" },
                { num: 32, name: "Federico Dimarco", pos: "MF" },
                { num: 9, name: "Marcus Thuram", pos: "FW" },
                { num: 10, name: "Lautaro Martinez", pos: "FW" }
            ],
            away: [
                { num: 29, name: "Michele Di Gregorio", pos: "GK" },
                { num: 37, name: "Saud Abdulhamid", pos: "DF" },
                { num: 4, name: "Federico Gatti", pos: "DF" },
                { num: 15, name: "Pierre Kalulu", pos: "DF" },
                { num: 27, name: "Andrea Cambiaso", pos: "DF" },
                { num: 19, name: "Khephren Thuram", pos: "MF" },
                { num: 7, name: "Francisco Conceicao", pos: "MF" },
                { num: 8, name: "Teun Koopmeiners", pos: "MF" },
                { num: 16, name: "Weston McKennie", pos: "MF" },
                { num: 10, name: "Kenan Yildiz", pos: "MF" },
                { num: 9, name: "Dusan Vlahovic", pos: "FW" }
            ]
        },
        subs: {
            home: ["Raffaele Di Gennaro", "Stefan de Vrij", "Yann Bisseck", "Davide Frattesi", "Piotr Zielinski", "Mehdi Taremi"],
            away: ["Mattia Perin", "Danilo Luiz", "Juan Cabal", "Manuel Locatelli", "Nicolo Fagioli", "Timothy Weah"]
        },
        timeline: []
    },
    {
        id: 993,
        league: "Bundesliga • Upcoming",
        homeTeam: "Bayern Munich",
        awayTeam: "Dortmund",
        time: "Upcoming",
        status: "UPCOMING",
        score: { home: 0, away: 0 },
        formation: { home: "4-2-3-1", away: "4-2-3-1" },
        lineup: {
            home: [
                { num: 1, name: "Manuel Neuer", pos: "GK" },
                { num: 2, name: "Dayot Upamecano", pos: "DF" },
                { num: 3, name: "Kim Min-jae", pos: "DF" },
                { num: 22, name: "Raphael Guerreiro", pos: "DF" },
                { num: 19, name: "Alphonso Davies", pos: "DF" },
                { num: 6, name: "Joshua Kimmich", pos: "MF" },
                { num: 45, name: "Aleksandar Pavlovic", pos: "MF" },
                { num: 10, name: "Leroy Sane", pos: "MF" },
                { num: 42, name: "Jamal Musiala", pos: "MF" },
                { num: 7, name: "Serge Gnabry", pos: "MF" },
                { num: 9, name: "Harry Kane", pos: "FW" }
            ],
            away: [
                { num: 1, name: "Gregor Kobel", pos: "GK" },
                { num: 26, name: "Julian Ryerson", pos: "DF" },
                { num: 3, name: "Waldemar Anton", pos: "DF" },
                { num: 4, name: "Nico Schlotterbeck", pos: "DF" },
                { num: 5, name: "Ramy Bensebaini", pos: "DF" },
                { num: 13, name: "Pascal Gross", pos: "MF" },
                { num: 23, name: "Emre Can", pos: "MF" },
                { num: 20, name: "Marcel Sabitzer", pos: "MF" },
                { num: 10, name: "Julian Brandt", pos: "MF" },
                { num: 27, name: "Karim Adeyemi", pos: "MF" },
                { num: 9, name: "Serhou Guirassy", pos: "FW" }
            ]
        },
        subs: {
            home: ["Sven Ulreich", "Eric Dier", "Konrad Laimer", "Thomas Muller", "Kingsley Coman", "Mathys Tel"],
            away: ["Alexander Meyer", "Niklas Sule", "Felix Nmecha", "Gio Reyna", "Jamie Gittens", "Donyell Malen"]
        },
        timeline: []
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
    999: '1x2',
    998: '1x2',
    997: '1x2',
    996: '1x2',
    995: '1x2',
    994: '1x2',
    993: '1x2'
};

const MATCH_MARKETS = {
    999: { // Brazil vs France
        '1x2': [
            { label: "Brazil", value: 2.10, outcomeId: 0, desc: "Brazil Win" },
            { label: "Draw", value: 3.40, outcomeId: 2, desc: "Draw" },
            { label: "France", value: 3.10, outcomeId: 1, desc: "France Win" }
        ],
        'scorer': [
            { label: "Vinicius Jr", value: 2.30, outcomeId: 10, desc: "Vinicius Jr to score" },
            { label: "Mbappe", value: 2.15, outcomeId: 11, desc: "Mbappe to score" },
            { label: "Neymar Jr", value: 2.50, outcomeId: 12, desc: "Neymar Jr to score" },
            { label: "Griezmann", value: 2.80, outcomeId: 13, desc: "Griezmann to score" }
        ],
        'score': [
            { label: "1 - 0", value: 7.00, outcomeId: 20, desc: "Brazil 1-0" },
            { label: "2 - 1", value: 8.50, outcomeId: 21, desc: "Brazil 2-1" },
            { label: "1 - 1", value: 6.00, outcomeId: 22, desc: "Draw 1-1" },
            { label: "0 - 1", value: 9.00, outcomeId: 23, desc: "France 1-0" }
        ]
    },
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

async function fetchUpcomingMatchesFromAPI() {
    console.log("Fetching upcoming matches from SportsDB API...");
    const leagues = [
        { id: 4328, name: "Premier League" },
        { id: 4480, name: "Champions League" }
    ];
    
    let loadedCount = 0;
    
    for (const lg of leagues) {
        try {
            const url = `https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=${lg.id}`;
            const resp = await fetch(url);
            if (!resp.ok) continue;
            const data = await resp.json();
            
            if (data && data.events && data.events.length > 0) {
                data.events.forEach(evt => {
                    const matchId = parseInt(evt.idEvent);
                    if (isNaN(matchId)) return;
                    
                    // Check if match already exists
                    const exists = MATCHES_DATA.some(m => m.id === matchId);
                    if (exists) return;
                    
                    const homeTeam = evt.strHomeTeam;
                    const awayTeam = evt.strAwayTeam;
                    const h = homeTeam.length;
                    const a = awayTeam.length;
                    
                    // Compute deterministic realistic odds based on team name lengths
                    const homeOdds = parseFloat((1.45 + ((h * 7) % 6) * 0.3).toFixed(2));
                    const drawOdds = parseFloat((3.00 + (((h + a) * 11) % 5) * 0.25).toFixed(2));
                    const awayOdds = parseFloat((1.85 + ((a * 9) % 7) * 0.4).toFixed(2));
                    
                    const newMatch = {
                        id: matchId,
                        league: `${evt.strLeague || lg.name} • Upcoming`,
                        homeTeam: homeTeam,
                        awayTeam: awayTeam,
                        time: evt.dateEvent || "Upcoming",
                        status: "UPCOMING",
                        score: { home: 0, away: 0 },
                        formation: { home: "4-3-3", away: "4-3-3" },
                        odds: { home: homeOdds, draw: drawOdds, away: awayOdds },
                        timeline: [
                            { time: "0'", type: "start", desc: "Match scheduled", icon: "📅" }
                        ]
                    };
                    
                    // Setup markets
                    MATCH_MARKETS[matchId] = {
                        '1x2': [
                            { label: homeTeam, value: homeOdds, outcomeId: 0, desc: `${homeTeam} Win` },
                            { label: "Draw", value: drawOdds, outcomeId: 2, desc: "Draw" },
                            { label: awayTeam, value: awayOdds, outcomeId: 1, desc: `${awayTeam} Win` }
                        ],
                        'scorer': [], // Will load dynamically when match center renders
                        'score': [
                            { label: "1 - 0", value: parseFloat((6.50 + (h % 4) * 0.5).toFixed(2)), outcomeId: 50, desc: `${homeTeam} 1-0` },
                            { label: "2 - 1", value: parseFloat((8.00 + (a % 5) * 0.5).toFixed(2)), outcomeId: 52, desc: `${homeTeam} 2-1` },
                            { label: "1 - 1", value: parseFloat((5.50 + ((h + a) % 3) * 0.5).toFixed(2)), outcomeId: 55, desc: "Draw 1-1" },
                            { label: "0 - 1", value: parseFloat((8.50 + (a % 4) * 0.5).toFixed(2)), outcomeId: 57, desc: `${awayTeam} 1-0` }
                        ]
                    };
                    activeMatchMarkets[matchId] = '1x2';
                    
                    MATCHES_DATA.push(newMatch);
                    loadedCount++;
                });
            }
        } catch (e) {
            console.warn(`Failed to fetch upcoming matches for league ${lg.name}:`, e);
        }
    }
    
    if (loadedCount > 0) {
        console.log(`Successfully fetched and populated ${loadedCount} upcoming matches from SportsDB API.`);
        renderLiveMatches();
    }
}

// Initialize on page load
function initApp() {
    // Connect to correct validator/network based on saved settings
    const savedNetwork = localStorage.getItem("solplay_network") || "localnet";
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

    // Populate stream providers
    initStreams();
    
    // Load and render persistent wagers
    loadWagersFromStorage();
    renderActiveWagers();

    // Fetch upcoming real matches dynamically from TheSportsDB
    fetchUpcomingMatchesFromAPI();

    // Render multi-league matches and select default
    renderLiveMatches();
    selectActiveMatch(2026);
    
    // Render Leaderboard data
    renderLeaderboard();

    // Start fetching and polling autonomous oracle config
    loadOracleConfig();
    setInterval(loadOracleConfig, 5000);
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

// 1. Wallet Management (Local Sandbox Wallet)
function loadOrCreateWallet() {
    try {
        const storedSecret = localStorage.getItem("solplay_wallet_secret");
        if (storedSecret) {
            const secretArray = JSON.parse(storedSecret);
            if (Array.isArray(secretArray)) {
                walletKeypair = solanaWeb3.Keypair.fromSecretKey(new Uint8Array(secretArray));
            }
        }
    } catch (e) {
        console.error("Failed to parse stored wallet secret, resetting keypair...", e);
        localStorage.removeItem("solplay_wallet_secret");
    }

    if (!walletKeypair) {
        try {
            walletKeypair = solanaWeb3.Keypair.generate();
            const secretArray = Array.from(walletKeypair.secretKey);
            localStorage.setItem("solplay_wallet_secret", JSON.stringify(secretArray));
        } catch (e) {
            console.error("Failed to generate developer fallback keypair", e);
        }
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
        type: url.includes("youtube.com") ? "youtube" : "external",
        isActive: isActive
    };
}

function getStreamsForMatchAndRegion(match, region) {
    let suffix = "";
    if (region === "uk_eu") suffix = " (Europe Feed)";
    else if (region === "us_am") suffix = " (US Feed)";
    else if (region === "africa") suffix = " (Africa Feed)";
    else if (region === "asia_in") suffix = " (Asia Feed)";
    else suffix = " (Global)";

    const hlsMirrors = [
        { name: `⚡ Live Mirror 1 (Red Bull TV - Action Sports)${suffix}`, url: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8", description: "Free Action Sports live streaming mirror.", type: "hls" },
        { name: `⚡ Live Mirror 2 (CBS News Live Mirror)${suffix}`, url: "https://cbsn-us.cbsnstream.cbsnews.com/main/manifest.m3u8", description: "Free CBS News live streaming mirror.", type: "hls" },
        { name: `⚡ Live Mirror 3 (HLS Direct Test Feed)${suffix}`, url: "https://stream.mux.com/v69El17P02tUkUg1sQeT293m38ZFO02581J/medium.m3u8", description: "Mux HD livestream test mirror.", type: "hls" }
    ];

    if (region === 'mock') {
        return hlsMirrors;
    }
    
    let externalStreams = [];
    if (match.id === 2026 || match.id === 999) { // World Cup / Portugal vs Uzbekistan
        externalStreams = [
            { name: `🏆 World Cup Stream 1 (VIPLeague - Free)${suffix}`, url: "https://www.vipleague.pm/", description: "Direct World Cup live stream feed. Free stream access.", type: "external" },
            { name: `🏆 World Cup Stream 2 (FootyBite - Free)${suffix}`, url: "https://footybite.to/", description: "Aggregated live stream portal. Standard quality.", type: "external" },
            { name: `🏆 World Cup Stream 3 (SportSurge - Free)${suffix}`, url: "https://sportsurge.net/", description: "P2P streaming portal. Recommended for desktop.", type: "external" },
            { name: `🏆 World Cup Stream 4 (HesGoal - Free)${suffix}`, url: "http://www.hesgoal.com/", description: "Lightweight, low-latency mobile feed.", type: "external" }
        ];
    } else if (match.id === 997) { // Saudi Pro League
        externalStreams = [
            { name: `🇸🇦 Al Nassr vs Al Hilal (VIPRow - Free)${suffix}`, url: "https://www.viprow.nu/", description: "Saudi Pro League direct feed. Free access.", type: "external" },
            { name: `🇸🇦 Al Nassr vs Al Hilal (CricFree - Free)${suffix}`, url: "https://cricfree.live/", description: "Ad-supported mirror for Arab football league.", type: "external" }
        ];
    } else if (match.id === 996) { // MLS
        externalStreams = [
            { name: `🇺🇸 Inter Miami vs LA Galaxy (VIPLeague - Free)${suffix}`, url: "https://www.vipleague.pm/", description: "MLS US stream. 100% free.", type: "external" },
            { name: `🇺🇸 Inter Miami vs LA Galaxy (SportSurge - Free)${suffix}`, url: "https://sportsurge.net/", description: "Ad-free P2P aggregator for MLS matches.", type: "external" }
        ];
    } else { // Other matches
        externalStreams = [
            { name: `⚽ ${match.homeTeam} vs ${match.awayTeam} (VIPLeague - Free)${suffix}`, url: "https://www.vipleague.pm/", description: `Direct stream for ${match.homeTeam} vs ${match.awayTeam}. Free stream access.`, type: "external" },
            { name: `⚽ ${match.homeTeam} vs ${match.awayTeam} (FootyBite - Free)${suffix}`, url: "https://footybite.to/", description: "Aggregated live stream portal. Standard quality.", type: "external" },
            { name: `⚽ ${match.homeTeam} vs ${match.awayTeam} (SportSurge - Free)${suffix}`, url: "https://sportsurge.net/", description: "P2P streaming portal. Recommended for desktop.", type: "external" },
            { name: `⚽ ${match.homeTeam} vs ${match.awayTeam} (HesGoal - Free)${suffix}`, url: "http://www.hesgoal.com/", description: "Lightweight, low-latency mobile feed.", type: "external" }
        ];
    }

    return [...hlsMirrors, ...externalStreams];
}

function updateStreamProviders() {
    const regionSelect = document.getElementById("stream-region-select");
    const providerSelect = document.getElementById("stream-provider-select");
    if (!regionSelect || !providerSelect) return;
    const selectedRegion = regionSelect.value;
    
    // Clear previous options
    providerSelect.innerHTML = "";
    
    const match = MATCHES_DATA.find(m => m.id === activeMatchId);
    if (!match) return;
    
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
    customOpt.textContent = "🔗 Custom Stream URL";
    providerSelect.appendChild(customOpt);
    
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
    
    document.getElementById("stream-title").textContent = `Custom Stream Link - Live Feed`;
    
    if (url.includes(".m3u8") || url.includes("m3u8")) {
        playerFrame.style.display = "none";
        mockPlayer.style.display = "none";
        video.style.display = "block";
        initHlsPlayer(video, url);
        showToast("Custom HLS Stream Loaded Successfully!", "success");
    } else {
        let embedUrl = url;
        if (url.includes("youtube.com/watch?v=")) {
            const vidId = url.split("v=")[1].split("&")[0];
            embedUrl = `https://www.youtube.com/embed/${vidId}?autoplay=1&mute=1`;
        } else if (url.includes("youtu.be/")) {
            const vidId = url.split("youtu.be/")[1].split("?")[0];
            embedUrl = `https://www.youtube.com/embed/${vidId}?autoplay=1&mute=1`;
        }
        
        video.style.display = "none";
        mockPlayer.style.display = "none";
        playerFrame.style.display = "block";
        playerFrame.src = embedUrl;
        destroyHlsPlayer();
        showToast("Custom Embed Stream Loaded Successfully!", "success");
    }
}

function switchStreamProvider() {
    const regionSelect = document.getElementById("stream-region-select");
    const providerSelect = document.getElementById("stream-provider-select");
    if (!regionSelect || !providerSelect) return;
    const selectedRegion = regionSelect.value;
    
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
    
    document.getElementById("stream-title").textContent = `${provider.name} - Routed Live`;
    
    // Remove existing routing block if any
    const existingRoutingBlock = document.getElementById("routing-info-block");
    if (existingRoutingBlock) {
        existingRoutingBlock.remove();
    }
    
    // P2P CDN Accelerator HTML Widget
    const cdnHtml = `
        <div class="cdn-accelerator-panel glass" style="margin-top:1rem; padding:0.8rem; border-radius:8px; border:1px solid var(--border-color); background:rgba(0,0,0,0.25); display:flex; flex-direction:column; gap:0.5rem; text-align:left;">
            <div class="cdn-header" style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:0.3rem; margin-bottom:0.3rem;">
                <span class="cdn-title" style="font-weight:700; color:var(--neon-teal); font-family:var(--font-outfit);">⚡ P2P CDN ACCELERATOR</span>
                <span class="cdn-node-status" id="active-cdn-node-status" style="font-weight:600; color:var(--text-secondary);">Direct Feed</span>
            </div>
            <div class="cdn-nodes-grid" style="display:flex; flex-direction:column; gap:0.4rem;">
                <div class="cdn-node-row" id="cdn-node-eu" style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:0.3rem 0.5rem; border-radius:4px; font-size:0.7rem; border:1px solid rgba(255,255,255,0.02);">
                    <div style="display:flex; align-items:center; gap:0.4rem;">
                        <span class="cdn-status-dot green" id="dot-eu" style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#10b981; box-shadow:0 0 6px #10b981;"></span>
                        <span style="color:var(--text-primary);">🇪🇺 Frankfurt Edge (Direct)</span>
                    </div>
                    <div id="ping-eu" style="font-family:monospace; color:var(--text-secondary);">-- ms</div>
                    <button class="btn-mini" onclick="connectCDNNode('eu', 'Frankfurt Edge', 24)" style="padding:0.15rem 0.4rem; font-size:0.65rem;">Connect</button>
                </div>
                <div class="cdn-node-row" id="cdn-node-us" style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:0.3rem 0.5rem; border-radius:4px; font-size:0.7rem; border:1px solid rgba(255,255,255,0.02);">
                    <div style="display:flex; align-items:center; gap:0.4rem;">
                        <span class="cdn-status-dot green" id="dot-us" style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#10b981; box-shadow:0 0 6px #10b981;"></span>
                        <span style="color:var(--text-primary);">🇺🇸 New York Relay (Mesh)</span>
                    </div>
                    <div id="ping-us" style="font-family:monospace; color:var(--text-secondary);">-- ms</div>
                    <button class="btn-mini" onclick="connectCDNNode('us', 'New York Relay', 78)" style="padding:0.15rem 0.4rem; font-size:0.65rem;">Connect</button>
                </div>
                <div class="cdn-node-row" id="cdn-node-ap" style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:0.3rem 0.5rem; border-radius:4px; font-size:0.7rem; border:1px solid rgba(255,255,255,0.02);">
                    <div style="display:flex; align-items:center; gap:0.4rem;">
                        <span class="cdn-status-dot green" id="dot-ap" style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#10b981; box-shadow:0 0 6px #10b981;"></span>
                        <span style="color:var(--text-primary);">🇯🇵 Tokyo Gateway (Fastest)</span>
                    </div>
                    <div id="ping-ap" style="font-family:monospace; color:var(--text-secondary);">-- ms</div>
                    <button class="btn-mini" onclick="connectCDNNode('ap', 'Tokyo Gateway', 142)" style="padding:0.15rem 0.4rem; font-size:0.65rem;">Connect</button>
                </div>
                <div class="cdn-node-row" id="cdn-node-af" style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:0.3rem 0.5rem; border-radius:4px; font-size:0.7rem; border:1px solid rgba(255,255,255,0.02);">
                    <div style="display:flex; align-items:center; gap:0.4rem;">
                        <span class="cdn-status-dot green" id="dot-af" style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#10b981; box-shadow:0 0 6px #10b981;"></span>
                        <span style="color:var(--text-primary);">🇳🇬 Lagos Edge (Sub-Cache)</span>
                    </div>
                    <div id="ping-af" style="font-family:monospace; color:var(--text-secondary);">-- ms</div>
                    <button class="btn-mini" onclick="connectCDNNode('af', 'Lagos Edge', 92)" style="padding:0.15rem 0.4rem; font-size:0.65rem;">Connect</button>
                </div>
            </div>
            <div class="cdn-actions" style="margin-top:0.3rem;">
                <button class="btn-primary" id="btn-run-speedtest" onclick="runCDNSpeedtest()" style="width:100%; padding:0.45rem; font-size:0.75rem; background:linear-gradient(135deg, var(--neon-teal), #0d9488); border:none; box-shadow:var(--glow-teal);">⚡ Run P2P Speedtest</button>
            </div>
        </div>
    `;

    if (provider.type === "youtube") {
        playerFrame.style.display = "block";
        mockPlayer.style.display = "none";
        document.getElementById("hls-video-player").style.display = "none";
        playerFrame.src = provider.url;
        destroyHlsPlayer();
    } else if (provider.type === "hls") {
        // Real-time HLS Video streaming
        playerFrame.style.display = "none";
        mockPlayer.style.display = "none";
        const video = document.getElementById("hls-video-player");
        video.style.display = "block";
        
        initHlsPlayer(video, provider.url);
    } else if (provider.type === "external") {
        // Show Live Graphical Tracker and Open Link Button
        playerFrame.style.display = "none";
        mockPlayer.style.display = "flex";
        document.getElementById("hls-video-player").style.display = "none";
        destroyHlsPlayer();
        
        // Add open link button info block to mock player
        const routingBlock = document.createElement("div");
        routingBlock.id = "routing-info-block";
        routingBlock.className = "stream-routing-info";
        routingBlock.innerHTML = `
            <span class="provider-desc" style="font-size: 0.8rem; color: var(--text-secondary); max-width: 280px; display: block; margin-bottom: 0.5rem; line-height: 1.4;">
                ${provider.description}
            </span>
            <a href="${provider.url}" class="btn-primary" target="_blank" style="text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; background: linear-gradient(135deg, var(--neon-pink), #db2777); box-shadow: var(--glow-pink); padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 600;">
                🚀 Route Feed & Launch Portal
            </a>
            ${cdnHtml}
        `;
        
        // Insert right under score
        mockPlayer.insertBefore(routingBlock, mockPlayer.querySelector(".stream-controls"));
    } else {
        // Mock HLS or E-Sports Mock
        playerFrame.style.display = "none";
        mockPlayer.style.display = "flex";
        document.getElementById("hls-video-player").style.display = "none";
        destroyHlsPlayer();
        
        const descBlock = document.createElement("div");
        descBlock.id = "routing-info-block";
        descBlock.className = "stream-routing-info";
        descBlock.innerHTML = `
            <span class="provider-desc" style="font-size: 0.8rem; color: var(--text-secondary); max-width: 280px; display: block; margin-bottom: 0.5rem; line-height: 1.4;">
                ${provider.description}
            </span>
            ${cdnHtml}
        `;
        mockPlayer.insertBefore(descBlock, mockPlayer.querySelector(".stream-controls"));
    }
}

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
    
    showToast(`Stream accelerated via ${name} (${finalPing}ms)!`, "success");
    appendChatMessage("System", `🚀 live feed routed through ${name} CDN relay point. Speed: 980Mbps | Ping: ${finalPing}ms.`, true);
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
    if (!isSystem && !isSharedBet) {
        const actions = document.createElement("span");
        actions.innerHTML = `
            <span style="color: var(--neon-orange); cursor: pointer; margin-right: 0.5rem;" onclick="tipUserChat('${user}')">🪙 Tip</span>
            <span style="color: var(--neon-teal); cursor: pointer;" onclick="copyCodeFromChat('${text}')">📋 Copy</span>
        `;
        header.appendChild(actions);
    }
    
    const body = document.createElement("div");
    body.className = "chat-text";
    
    if (isSharedBet) {
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
                            <button class="chat-betslip-clone-btn" onclick="cloneBetFromChat(${gameId}, ${outcomeId}, ${odds}, '${outcomeLabel}', '${fixture}')">📋 Clone Bet</button>
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

function selectOdds(gameId, outcomeId, oddsValue, outcomeLabel, gameTitle) {
    const container = document.getElementById("betslip-items-container");
    container.innerHTML = ""; // Single selection for simplicity in prototype

    activeSelection = { gameId, outcomeId, oddsValue, outcomeLabel, gameTitle };

    const item = document.createElement("div");
    item.className = "betslip-selection";
    item.innerHTML = `
        <button class="btn-remove-selection" onclick="clearSelection()">Remove</button>
        <div class="selection-teams">${gameTitle}</div>
        <div class="selection-outcome">Wager Option: <span style="font-weight:600; color:var(--text-primary);">${outcomeLabel}</span></div>
        <div style="display:flex; justify-content:space-between; margin-top:0.4rem; font-size:0.8rem;">
            <span>Odds Value:</span>
            <span class="selection-odds-text">${oddsValue.toFixed(2)}x</span>
        </div>
    `;
    container.appendChild(item);

    document.getElementById("slip-count-badge").textContent = "1 Selection";
    document.getElementById("betslip-calc").style.display = "block";
    document.getElementById("slip-odds-multiplier").textContent = oddsValue.toFixed(2) + "x";
    
    // Set random sportybet share code
    document.getElementById("generated-slip-code").textContent = `BET-${gameId}-${outcomeId}-${Math.floor(Math.random()*90 + 10)}`;

    // Show indicator badge on the Betslip tab and auto-navigate to it
    const badge = document.getElementById("tab-slip-badge");
    if (badge) {
        badge.textContent = "1";
        badge.style.display = "inline-block";
    }
    switchExchangeTab("slip");

    calculatePayout();
    renderLiveMatches();
}

function clearSelection() {
    activeSelection = null;
    document.getElementById("betslip-items-container").innerHTML = `
        <div class="betslip-empty" id="betslip-empty-text">Select odds from matches to build your slip</div>
    `;
    document.getElementById("slip-count-badge").textContent = "0 Selection";
    document.getElementById("betslip-calc").style.display = "none";
    
    const badge = document.getElementById("tab-slip-badge");
    if (badge) {
        badge.style.display = "none";
    }
    renderLiveMatches();
}

function calculatePayout() {
    if (!activeSelection) return;
    const stake = parseFloat(document.getElementById("stake-amount").value) || 0;
    const returnVal = stake * activeSelection.oddsValue;
    const routingFee = stake * 0.01; // 1%

    document.getElementById("slip-routing-fee").textContent = routingFee.toFixed(4) + " SOL";
    document.getElementById("slip-potential-payout").textContent = returnVal.toFixed(4) + " SOL";
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

// 7. Place Wager On-Chain
async function placeBet() {
    if (!isWalletConnected) {
        showToast("Connect your wallet first!", "error");
        return;
    }
    if (!currentProgramId) {
        showToast("Initialize Program ID in the Admin Console first.", "error");
        return;
    }
    if (!activeSelection) return;

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

    const lamports = Math.floor(stakeSol * solanaWeb3.LAMPORTS_PER_SOL);

    try {
        const marketAccountPubkey = getMarketPubkeyForMatch(activeMatchId);
        const platformStatePubkey = getPlatformStatePubkey();

        // Pre-check: Verify platform state is initialized
        const platformStateInfo = await connection.getAccountInfo(platformStatePubkey);
        if (!platformStateInfo || platformStateInfo.data.length < 66) {
            showToast("Platform state is not initialized! Please 'Init Platform' under 'Program Deploys' in the Operations Control Room (Admin Console) first.", "error");
            return;
        }

        // Pre-check: Verify market account is initialized
        const marketInfo = await connection.getAccountInfo(marketAccountPubkey);
        if (!marketInfo || marketInfo.data.length < 66) {
            showToast("Market account is not initialized! Please 'Create Market' in the Operations Control Room (Admin Console) first.", "error");
            return;
        }

        showToast("Routing wager on-chain to Solana contract...", "info");

        // Generate unique keypair for each wager to avoid account conflicts and size errors
        const wagerAccountKeypair = solanaWeb3.Keypair.generate();

        // Create Wager Account on-chain
        await createLocalAccount(wagerAccountKeypair, 83);

        // Build PlaceWager Instruction (ID 2)
        // Length: 51 bytes
        const data = new Uint8Array(51);
        data[0] = 2; // Type 2
        writeU64(data, 1, activeSelection.gameId);
        data[9] = activeSelection.outcomeId; // 0=Home, 1=Away, 2=Draw
        writeU64(data, 10, lamports);
        data[18] = 0; // Local pool wager

        // Copy creator public key (mock punter address for commissions)
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
        const sig = await sendConfirmAndVerifyTransaction(tx, [walletKeypair]);

        showToast("Success! Wager registered on-chain.", "success");

        // Store in active list
        localWagers.push({
            gameId: activeSelection.gameId,
            outcomeLabel: activeSelection.outcomeLabel,
            outcomeId: activeSelection.outcomeId,
            amount: stakeSol,
            odds: activeSelection.oddsValue,
            status: "PENDING",
            wagerPubkey: wagerAccountKeypair.publicKey,
            claimed: false
        });

        saveWagersToStorage();
        renderActiveWagers();
        clearSelection();
        await updateWalletBalance();
    } catch (e) {
        console.error(e);
        showToast("Transaction failed: " + e.message, "error");
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
        item.style.marginBottom = "0.5rem";
        
        let statusBadge = `<span style="color:var(--neon-orange); font-size:0.75rem;">Pending</span>`;
        let claimBtn = "";

        if (w.status === "WON") {
            statusBadge = `<span style="color:var(--neon-teal); font-size:0.75rem; font-weight:600;">Won!</span>`;
            if (!w.claimed) {
                claimBtn = `<button class="btn-primary" onclick="claimWagerOnchain(${idx})" style="padding:0.4rem 0.8rem; font-size:0.75rem; width:100%; margin-top:0.5rem;">Claim Winnings & Commission</button>`;
            } else {
                claimBtn = `<div style="text-align:center; font-size:0.75rem; color:var(--text-secondary); margin-top:0.5rem;">Claimed & Payout Disbursed ✅</div>`;
            }
        } else if (w.status === "LOST") {
            statusBadge = `<span style="color:var(--neon-pink); font-size:0.75rem;">Lost</span>`;
        }

        let fixtureName = `Game #${w.gameId}`;
        const match = MATCHES_DATA.find(m => m.id === w.gameId);
        if (match) {
            fixtureName = `${match.homeTeam} vs ${match.awayTeam}`;
        } else {
            const tournament = TOURNAMENTS_DATA.find(t => t.id === w.gameId);
            if (tournament) {
                fixtureName = tournament.title;
            }
        }

        // Show Verify Ticket button if match is finished and ticket is pending
        let verifyBtn = "";
        const matchConcluded = match && (match.status === "FINISHED" || match.time === "Full Time");
        if ((w.status === "Pending" || w.status === "PENDING" || w.status === "Resolved") && matchConcluded) {
            verifyBtn = `
                <button class="btn-primary btn-verify-status" onclick="verifyWagerStatus(${idx}, this)" style="padding:0.4rem 0.8rem; font-size:0.75rem; width:100%; margin-top:0.5rem; background:linear-gradient(135deg, var(--neon-purple), #7c3aed); border:none; box-shadow:var(--glow-purple);">🔍 Verify Ticket Status</button>
            `;
        }

        item.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-secondary);">
                <span>${fixtureName}</span>
                ${statusBadge}
            </div>
            <div style="font-weight:600; margin:0.3rem 0; font-size:0.85rem;">Option: ${w.outcomeLabel}</div>
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom: 0.4rem;">
                <span>Stake: ${w.amount.toFixed(2)} SOL</span>
                <span style="font-weight:600; color:var(--neon-teal);">${w.odds.toFixed(2)}x</span>
            </div>
            <div style="display:flex; gap:0.4rem;">
                <button class="btn-secondary" onclick="shareWagerToChat(${idx})" style="padding:0.3rem 0.6rem; font-size:0.7rem; flex:1; background:rgba(255,255,255,0.03); border:1px solid var(--border-color); color:var(--text-primary); border-radius:4px; cursor:pointer;">📤 Share Wager</button>
            </div>
            ${verifyBtn}
            ${claimBtn}
        `;
        container.appendChild(item);
    });
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
        const match = MATCHES_DATA.find(m => m.id === w.gameId);
        if (!match) {
            showToast("Wager fixture not found.", "error");
            if (btnElement) {
                btnElement.disabled = false;
                btnElement.textContent = "🔍 Verify Ticket Status";
            }
            return;
        }
        
        let outcome = "LOST";
        if (w.outcomeId === 0) { // Home Win
            outcome = match.score.home > match.score.away ? "WON" : "LOST";
        } else if (w.outcomeId === 1) { // Away Win
            outcome = match.score.away > match.score.home ? "WON" : "LOST";
        } else if (w.outcomeId === 2) { // Draw
            outcome = match.score.home === match.score.away ? "WON" : "LOST";
        } else if (w.outcomeId >= 50 && w.outcomeId < 100) {
            const finalScoreStr = `${match.score.home} - ${match.score.away}`;
            outcome = (w.outcomeLabel.trim() === finalScoreStr.trim()) ? "WON" : "LOST";
        } else if (w.outcomeId >= 100) {
            const player = w.outcomeLabel.replace(" to score", "").replace(" (Sub)", "").replace(/ \([A-Z]{2}\)/, "").trim();
            const scored = match.timeline.some(ev => ev.type === "goal" && ev.desc.includes(player));
            outcome = scored ? "WON" : "LOST";
        }
        
        w.status = outcome;
        saveWagersToStorage();
        renderActiveWagers();
        
        if (outcome === "WON") {
            showToast(`🎫 Ticket VERIFIED On-Chain! Status: WINNER 🏆`, "success");
            const wName = activePublicKey ? activePublicKey.toString().slice(0, 6) + "..." : "User";
            appendChatMessage("System", `🎉 Ticket verified. Wallet ${wName} won ${(w.amount * w.odds).toFixed(2)} SOL on ${match.homeTeam} vs ${match.awayTeam}!`, true);
        } else {
            showToast(`🎫 Ticket VERIFIED On-Chain! Status: LOST ❌`, "info");
        }
    }, 1000);
}

function verifyAllWagersStatus() {
    let changed = false;
    localWagers.forEach(w => {
        if (w.status === "Pending" || w.status === "PENDING" || w.status === "Resolved") {
            const match = MATCHES_DATA.find(m => m.id === w.gameId);
            if (match && (match.status === "FINISHED" || match.time === "Full Time")) {
                let outcome = "LOST";
                if (w.outcomeId === 0) { // Home Win
                    outcome = match.score.home > match.score.away ? "WON" : "LOST";
                } else if (w.outcomeId === 1) { // Away Win
                    outcome = match.score.away > match.score.home ? "WON" : "LOST";
                } else if (w.outcomeId === 2) { // Draw
                    outcome = match.score.home === match.score.away ? "WON" : "LOST";
                } else if (w.outcomeId >= 50 && w.outcomeId < 100) {
                    const finalScoreStr = `${match.score.home} - ${match.score.away}`;
                    outcome = (w.outcomeLabel.trim() === finalScoreStr.trim()) ? "WON" : "LOST";
                } else if (w.outcomeId >= 100) {
                    const player = w.outcomeLabel.replace(" to score", "").replace(" (Sub)", "").replace(/ \([A-Z]{2}\)/, "").trim();
                    const scored = match.timeline.some(ev => ev.type === "goal" && ev.desc.includes(player));
                    outcome = scored ? "WON" : "LOST";
                }
                w.status = outcome;
                changed = true;
                showToast(`Wager on ${match.homeTeam} vs ${match.awayTeam} settled as ${outcome}!`, "info");
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
    
    let fixture = `Match #${w.gameId}`;
    const match = MATCHES_DATA.find(m => m.id === w.gameId);
    if (match) {
        fixture = `${match.homeTeam} vs ${match.awayTeam}`;
    } else {
        const tournament = TOURNAMENTS_DATA.find(t => t.id === w.gameId);
        if (tournament) {
            fixture = tournament.title;
        }
    }
    
    // SHARE-BET:gameId|outcomeLabel|odds|stake|fixture|outcomeId
    const msg = `SHARE-BET:${w.gameId}|${w.outcomeLabel}|${w.odds}|${w.amount}|${fixture}|${w.outcomeId}`;
    
    const username = isWalletConnected ? getFriendlyUsername(activePublicKey.toString()) : "User";
    appendChatMessage(username, msg);
    showToast("Wager shared to Live Fan Chat!", "success");
    
    switchMatchTab('chat');
}

function cloneBetFromChat(gameId, outcomeId, oddsValue, outcomeLabel, fixture) {
    showToast(`Cloning bet: ${outcomeLabel} @ ${oddsValue.toFixed(2)}x`, "info");
    selectOdds(gameId, outcomeId, oddsValue, outcomeLabel, fixture);
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

        showToast("Winnings successfully claimed! SOL sent to your wallet.", "success");
        w.claimed = true;
        renderActiveWagers();
        await updateWalletBalance();
    } catch (e) {
        console.error(e);
        showToast("Claim failed: " + e.message, "error");
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

// Render live match cards dynamically
function renderLiveMatches() {
    const container = document.getElementById("content-live-list");
    if (!container) return;

    container.innerHTML = "";

    MATCHES_DATA.forEach(match => {
        const isActive = (match.id === activeMatchId);
        const card = document.createElement("div");
        card.className = `match-card ${isActive ? 'active-match' : ''}`;
        
        // Match meta details
        const isLive = match.status === "LIVE";
        const statusBadge = isLive 
            ? `<span style="color: var(--neon-pink); font-weight: 600;">LIVE</span>` 
            : `<span style="color: var(--text-secondary); font-weight: 600;">UPCOMING</span>`;

        // Render card header
        let html = `
            <div class="match-info-top">
                <span>${match.league}</span>
                ${statusBadge}
            </div>
            <div class="match-teams-score">
                <div>
                    <div class="team-row">⚽ ${match.homeTeam}</div>
                    <div class="team-row" style="margin-top: 0.3rem;">🛡️ ${match.awayTeam}</div>
                </div>
                <div style="text-align: right;">
                    <div class="score-row" id="match-card-score-${match.id}">
                        <span id="match-score-home-${match.id}">${match.score.home}</span> - <span id="match-score-away-${match.id}">${match.score.away}</span>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">${match.time}</div>
                </div>
            </div>
        `;

        // Add Market selector tabs
        const currentMarket = activeMatchMarkets[match.id] || '1x2';
        html += `
            <div class="market-tabs">
                <button class="market-tab-btn ${currentMarket === '1x2' ? 'active' : ''}" onclick="setBettingMarket(${match.id}, '1x2')">Winner (1X2)</button>
                <button class="market-tab-btn ${currentMarket === 'scorer' ? 'active' : ''}" onclick="setBettingMarket(${match.id}, 'scorer')">Goalscorer</button>
                <button class="market-tab-btn ${currentMarket === 'score' ? 'active' : ''}" onclick="setBettingMarket(${match.id}, 'score')">Correct Score</button>
            </div>
        `;

        // Render odds selector grid based on active tab
        const markets = MATCH_MARKETS[match.id] || {};
        
        let activeOdds = [];
        if (currentMarket === '1x2') {
            const homeVal = match.odds ? match.odds.home : 2.00;
            const drawVal = match.odds ? match.odds.draw : 3.20;
            const awayVal = match.odds ? match.odds.away : 3.00;
            activeOdds = markets['1x2'] || [
                { label: match.homeTeam, value: homeVal, outcomeId: 0, desc: `${match.homeTeam} Win` },
                { label: "Draw", value: drawVal, outcomeId: 2, desc: "Draw" },
                { label: match.awayTeam, value: awayVal, outcomeId: 1, desc: `${match.awayTeam} Win` }
            ];
        } else if (currentMarket === 'scorer') {
            if (match.lineup && match.lineup.home) {
                // Home starters
                match.lineup.home.forEach((p, idx) => {
                    let oddsVal = 3.50;
                    if (p.pos === 'FW') oddsVal = 1.75 + ((p.name.length * 3 + idx) % 8) * 0.1;
                    else if (p.pos === 'MF') oddsVal = 3.00 + ((p.name.length * 4 + idx) % 11) * 0.25;
                    else if (p.pos === 'DF') oddsVal = 6.00 + ((p.name.length * 5 + idx) % 7) * 1.0;
                    else if (p.pos === 'GK') oddsVal = 15.00 + ((p.name.length * 7 + idx) % 6) * 2.0;
                    activeOdds.push({ label: `${p.name} (${p.pos})`, value: oddsVal, outcomeId: 100 + idx, desc: `${p.name} to score` });
                });
                // Away starters
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
        } else if (currentMarket === 'score') {
            activeOdds = markets['score'] || [];
            if (activeOdds.length === 0) {
                activeOdds = [
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
            }
        }
        
        let oddsGridClass = currentMarket === '1x2' ? 'market-grid-3' : 'market-grid';
        
        if (currentMarket === 'scorer') {
            html += `<div class="goalscorer-odds-container"><div class="${oddsGridClass}">`;
        } else {
            html += `<div class="${oddsGridClass}">`;
        }
        
        activeOdds.forEach(odd => {
            const isSelected = (activeSelection && activeSelection.gameId === match.id && activeSelection.outcomeId === odd.outcomeId && activeSelection.outcomeLabel === odd.desc);
            const escapedDesc = odd.desc.replace(/'/g, "\\'");
            const escapedGameTitle = `${match.homeTeam} vs ${match.awayTeam}`.replace(/'/g, "\\'");
            html += `
                <button class="odds-btn ${isSelected ? 'selected' : ''}" onclick="selectOdds(${match.id}, ${odd.outcomeId}, ${odd.value}, '${escapedDesc}', '${escapedGameTitle}')">
                    <span class="odds-label">${odd.label}</span>
                    <span class="odds-value">${odd.value.toFixed(2)}</span>
                </button>
            `;
        });
        
        if (currentMarket === 'scorer') {
            html += `</div></div>`;
        } else {
            html += `</div>`;
        }

        // Active match select button
        if (!isActive) {
            html += `
                <button class="match-card-select-btn" onclick="selectActiveMatch(${match.id})">
                    📺 Stream Match & View Odds
                </button>
            `;
        } else {
            html += `
                <button class="match-card-select-btn active">
                    ⚡ Currently Streaming Live
                </button>
            `;
        }

        card.innerHTML = html;
        container.appendChild(card);
    });
}

function setBettingMarket(matchId, marketKey) {
    activeMatchMarkets[matchId] = marketKey;
    renderLiveMatches();
}

function selectActiveMatch(matchId) {
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
                score: { home: 0, away: 0 },
                league: tournament.game + " Tournament"
            };
        }
    }
    
    if (!match) return;
    
    // Update live player scoreboard
    const liveScoreEl = document.getElementById("player-live-score");
    if (liveScoreEl) {
        liveScoreEl.innerHTML = `${match.homeTeam} <span id="player-score-home">${match.score.home}</span> - <span id="player-score-away">${match.score.away}</span> ${match.awayTeam}`;
    }
    
    const liveTimeEl = document.getElementById("player-live-time");
    if (liveTimeEl) {
        liveTimeEl.textContent = match.time;
    }
    
    document.getElementById("stream-title").textContent = `${match.homeTeam} vs ${match.awayTeam} - Routed Feed`;
    
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
    
    // Update match center tabs (Lineups and Timeline)
    renderMatchLineups();
    renderMatchTimeline();
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

// 10. Live Match Simulation
// 10. Live Match Simulation
function startMatchTimer() {
    // Ticks fast for local testing
    matchTimer = setInterval(() => {
        MATCHES_DATA.forEach(match => {
            if (match.status !== 'LIVE') return;
            
            let timeVal = parseInt(match.time);
            if (isNaN(timeVal)) return;
            
            timeVal++;
            if (timeVal >= 90) {
                match.time = "Full Time";
                match.status = "FINISHED";
                
                // Settle and verify status locally in real-time
                verifyAllWagersStatus();
                
                showToast(`Match ended: ${match.homeTeam} ${match.score.home} - ${match.score.away} ${match.awayTeam}`, "success");
            } else {
                match.time = `${timeVal}'`;
            }
            
            // Randomly trigger live events (e.g. 8% chance per tick)
            if (match.status === 'LIVE' && Math.random() < 0.08) {
                triggerSimulatedMatchEvent(match);
            }
        });
        
        renderLiveMatches();
        
        const activeMatch = MATCHES_DATA.find(m => m.id === activeMatchId);
        if (activeMatch) {
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
    }, 6000); 
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
}

function loadWagersFromStorage() {
    const key = activePublicKey ? `solplay_wagers_${activePublicKey.toString()}` : "solplay_wagers_anonymous";
    const stored = localStorage.getItem(key);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            localWagers = parsed.map(w => ({
                ...w,
                wagerPubkey: new solanaWeb3.PublicKey(w.wagerPubkey)
            }));
        } catch (e) {
            console.error(e);
            localWagers = [];
        }
    } else {
        localWagers = [];
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
        const panels = ["panel-match-chat", "panel-match-lineups", "panel-match-timeline"];
        const btns = ["btn-match-chat", "btn-match-lineups", "btn-match-timeline"];

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
        }
    } catch (e) {
        console.error("Error inside switchMatchTab:", e);
        showToast("Match center tab error: " + e.message, "error");
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
    const val = document.getElementById("network-rpc-select").value;
    const status = document.getElementById("network-status-text");
    showToast(`Switching to ${val}...`, "info");
    if (val === "localnet") {
        connection = new solanaWeb3.Connection("http://127.0.0.1:8899", "confirmed");
        status.textContent = "Solana Localnet";
    } else {
        connection = new solanaWeb3.Connection("https://api.devnet.solana.com", "confirmed");
        status.textContent = "Solana Devnet";
    }
    await updateWalletBalance();
    initStreams();
    showToast("Network switched successfully!", "success");
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
