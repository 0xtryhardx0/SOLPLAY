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
let currentProgramId = new solanaWeb3.PublicKey("GdonKLys4qtYAXyvAqGXNxnj3rQ8hCTjtDrSescct7va");
let activeSelection = null;
let milestoneProgress = 0;
let watchTimer = null;
let isWalletConnected = false;
let currentBettingTab = 'live';

// Simulated match state
let activeMatchId = 999; // Default to World Cup

const MATCHES_DATA = [
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

// Initialize on page load
window.addEventListener('load', () => {
    // Connect to local validator
    try {
        connection = new solanaWeb3.Connection("http://127.0.0.1:8899", "confirmed");
        showToast("Connected to Solana Localnet Validator!", "success");
    } catch (e) {
        showToast("Failed to connect to Localnet validator. Running in offline fallback.", "error");
    }

    // Load wallet if stored
    loadOrCreateWallet();
    
    // Start live simulation elements
    startMockStreamChat();
    startMatchTimer();
    
    // Check if Program ID is stored in localStorage, default to target deployment
    let savedProgramId = localStorage.getItem("solplay_program_id");
    if (!savedProgramId) {
        savedProgramId = "GdonKLys4qtYAXyvAqGXNxnj3rQ8hCTjtDrSescct7va";
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

    // Render multi-league matches and select default
    renderLiveMatches();
    selectActiveMatch(999);
});

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
}

async function toggleWallet() {
    const connectBtn = document.getElementById("btn-connect-wallet");
    const balanceContainer = document.getElementById("sol-balance-container");
    const airdropBtn = document.getElementById("btn-airdrop");

    if (!isWalletConnected) {
        isWalletConnected = true;
        connectBtn.textContent = walletKeypair.publicKey.toString().slice(0, 6) + "..." + walletKeypair.publicKey.toString().slice(-4);
        connectBtn.style.background = "linear-gradient(135deg, var(--neon-teal), #0d9488)";
        connectBtn.style.boxShadow = "var(--glow-teal)";
        balanceContainer.style.display = "block";
        airdropBtn.style.display = "block";
        
        showToast("Sandbox Wallet Connected!", "success");
        await updateWalletBalance();
        startWatchMilestone();
    } else {
        isWalletConnected = false;
        connectBtn.textContent = "Connect Developer Sandbox Wallet";
        connectBtn.style.background = "linear-gradient(135deg, var(--neon-purple), #7c3aed)";
        connectBtn.style.boxShadow = "var(--glow-purple)";
        balanceContainer.style.display = "none";
        airdropBtn.style.display = "none";
        
        stopWatchMilestone();
    }
}

async function updateWalletBalance() {
    if (!walletKeypair || !connection) return;
    try {
        const balance = await connection.getBalance(walletKeypair.publicKey);
        const solVal = balance / solanaWeb3.LAMPORTS_PER_SOL;
        document.getElementById("wallet-balance").textContent = solVal.toFixed(4);
    } catch (e) {
        document.getElementById("wallet-balance").textContent = "0.0000";
    }
}

async function requestAirdrop() {
    if (!walletKeypair || !connection) return;
    showToast("Requesting airdrop of 1 SOL...", "info");
    try {
        const sig = await connection.requestAirdrop(walletKeypair.publicKey, solanaWeb3.LAMPORTS_PER_SOL);
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
        { name: "Server 1 (YouTube Live)", url: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1", description: "Direct YouTube embed stream test.", type: "youtube" },
        { name: "Server 2 (HLS Direct Feed)", url: "https://stream.mux.com/v69El17P02tUkUg1sQeT293m38ZFO02581J/medium.m3u8", description: "Real-time HD HLS direct livestream test.", type: "hls" },
        { name: "Server 3 (E-Sports Mock)", url: "", description: "Interactive simulated e-sports screen.", type: "mock_esports" }
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
    if (region === 'mock') {
        return [
            { name: "Server 1 (YouTube Live)", url: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1", description: "Direct YouTube embed stream test.", type: "youtube" },
            { name: "Server 2 (HLS Direct)", url: "", description: "Direct HLS live feed simulator.", type: "mock_hls" },
            { name: "Server 3 (E-Sports Mock)", url: "", description: "Interactive simulated e-sports screen.", type: "mock_esports" }
        ];
    }
    
    let suffix = "";
    if (region === "uk_eu") suffix = " (Europe Feed)";
    else if (region === "us_am") suffix = " (US Feed)";
    else if (region === "africa") suffix = " (Africa Feed)";
    else if (region === "asia_in") suffix = " (Asia Feed)";

    if (match.id === 999) { // World Cup
        return [
            { name: `🏆 World Cup Stream 1 (VIPLeague - Free)${suffix}`, url: "https://www.vipleague.pm/", description: "Direct World Cup live stream feed. Free stream access.", type: "external" },
            { name: `🏆 World Cup Stream 2 (FootyBite - Free)${suffix}`, url: "https://footybite.to/", description: "Aggregated live stream portal. Standard quality.", type: "external" },
            { name: `🏆 World Cup Stream 3 (SportSurge - Free)${suffix}`, url: "https://sportsurge.net/", description: "P2P streaming portal. Recommended for desktop.", type: "external" },
            { name: `🏆 World Cup Stream 4 (HesGoal - Free)${suffix}`, url: "http://www.hesgoal.com/", description: "Lightweight, low-latency mobile feed.", type: "external" }
        ];
    } else if (match.id === 997) { // Saudi Pro League
        return [
            { name: `🇸🇦 Al Nassr vs Al Hilal (VIPRow - Free)${suffix}`, url: "https://www.viprow.nu/", description: "Saudi Pro League direct feed. Free access.", type: "external" },
            { name: `🇸🇦 Al Nassr vs Al Hilal (CricFree - Free)${suffix}`, url: "https://cricfree.live/", description: "Ad-supported mirror for Arab football league.", type: "external" }
        ];
    } else if (match.id === 996) { // MLS
        return [
            { name: `🇺🇸 Inter Miami vs LA Galaxy (VIPLeague - Free)${suffix}`, url: "https://www.vipleague.pm/", description: "MLS US stream. 100% free.", type: "external" },
            { name: `🇺🇸 Inter Miami vs LA Galaxy (SportSurge - Free)${suffix}`, url: "https://sportsurge.net/", description: "Ad-free P2P aggregator for MLS matches.", type: "external" }
        ];
    } else { // Other matches
        return [
            { name: `⚽ ${match.homeTeam} vs ${match.awayTeam} (VIPLeague - Free)${suffix}`, url: "https://www.vipleague.pm/", description: `Direct stream for ${match.homeTeam} vs ${match.awayTeam}. Free stream access.`, type: "external" },
            { name: `⚽ ${match.homeTeam} vs ${match.awayTeam} (FootyBite - Free)${suffix}`, url: "https://footybite.to/", description: "Aggregated live stream portal. Standard quality.", type: "external" },
            { name: `⚽ ${match.homeTeam} vs ${match.awayTeam} (SportSurge - Free)${suffix}`, url: "https://sportsurge.net/", description: "P2P streaming portal. Recommended for desktop.", type: "external" },
            { name: `⚽ ${match.homeTeam} vs ${match.awayTeam} (HesGoal - Free)${suffix}`, url: "http://www.hesgoal.com/", description: "Lightweight, low-latency mobile feed.", type: "external" }
        ];
    }
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
    
    switchStreamProvider();
}

function switchStreamProvider() {
    const regionSelect = document.getElementById("stream-region-select");
    const providerSelect = document.getElementById("stream-provider-select");
    if (!regionSelect || !providerSelect) return;
    const selectedRegion = regionSelect.value;
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
                { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: false },
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

    const username = isWalletConnected ? getFriendlyUsername(walletKeypair.publicKey.toString()) : "Anonymous User";
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
                fromPubkey: walletKeypair.publicKey,
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
        const tabLive = document.getElementById("tab-live");
        const tabCustom = document.getElementById("tab-custom");
        const tabLp = document.getElementById("tab-lp");

        if (tabLive) tabLive.classList.toggle("active", tab === 'live');
        if (tabCustom) tabCustom.classList.toggle("active", tab === 'custom');
        if (tabLp) tabLp.classList.toggle("active", tab === 'lp');

        const contentLive = document.getElementById("content-live");
        const contentCustom = document.getElementById("content-custom");
        const contentLp = document.getElementById("content-lp");

        if (contentLive) contentLive.style.display = tab === 'live' ? 'block' : 'none';
        if (contentCustom) contentCustom.style.display = tab === 'custom' ? 'block' : 'none';
        if (contentLp) contentLp.style.display = tab === 'lp' ? 'block' : 'none';
    } catch (e) {
        console.error("Error inside switchBettingTab:", e);
        showToast("Betting tab error: " + e.message, "error");
    }
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
    const username = isWalletConnected ? getFriendlyUsername(walletKeypair.publicKey.toString()) : "User";
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

    const lamports = Math.floor(stakeSol * solanaWeb3.LAMPORTS_PER_SOL);

    try {
        const marketAccountPubkey = getOrCreateAccountKeypair("market_999").publicKey;
        const platformStatePubkey = getOrCreateAccountKeypair("platform_state").publicKey;

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
                { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: false },
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

        item.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-secondary);">
                <span>Game #${w.gameId}</span>
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
            ${claimBtn}
        `;
        container.appendChild(item);
    });
}

function shareWagerToChat(idx) {
    const w = localWagers[idx];
    if (!w) return;
    
    const match = MATCHES_DATA.find(m => m.id === w.gameId);
    const fixture = match ? `${match.homeTeam} vs ${match.awayTeam}` : `Match #${w.gameId}`;
    
    // SHARE-BET:gameId|outcomeLabel|odds|stake|fixture|outcomeId
    const msg = `SHARE-BET:${w.gameId}|${w.outcomeLabel}|${w.odds}|${w.amount}|${fixture}|${w.outcomeId}`;
    
    const username = isWalletConnected ? getFriendlyUsername(walletKeypair.publicKey.toString()) : "User";
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
        const marketAccountPubkey = getOrCreateAccountKeypair("market_999").publicKey;
        const platformStatePubkey = getOrCreateAccountKeypair("platform_state").publicKey;
        const treasuryPubkey = getOrCreateAccountKeypair("treasury").publicKey;
        const creatorPubkey = getOrCreateAccountKeypair("punter_creator").publicKey;

        // Build ClaimWinnings Instruction (ID 4)
        // size: 9 bytes
        const data = new Uint8Array(9);
        data[0] = 4; // Type 4
        writeU64(data, 1, w.gameId);

        const ix = new solanaWeb3.TransactionInstruction({
            keys: [
                { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: false },
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
            activeOdds = markets['1x2'] || [
                { label: match.homeTeam, value: 2.00, outcomeId: 0, desc: `${match.homeTeam} Win` },
                { label: "Draw", value: 3.20, outcomeId: 2, desc: "Draw" },
                { label: match.awayTeam, value: 3.00, outcomeId: 1, desc: `${match.awayTeam} Win` }
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
    const match = MATCHES_DATA.find(m => m.id === matchId);
    if (!match) return;
    
    // Update live player scoreboard
    const liveScoreEl = document.getElementById("player-live-score");
    if (liveScoreEl) {
        liveScoreEl.innerHTML = `${match.homeTeam} <span id="player-score-home">${match.score.home}</span> - <span id="player-score-away">${match.score.away}</span> ${match.awayTeam}`;
    }
    
    const liveTimeEl = document.getElementById("player-live-time");
    if (liveTimeEl) {
        liveTimeEl.textContent = match.time + (match.status === 'LIVE' && match.time !== 'Upcoming' ? ':00' : '');
    }
    
    document.getElementById("stream-title").textContent = `${match.homeTeam} vs ${match.awayTeam} - Routed Feed`;
    
    updateStreamProvidersForMatch(match);
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
function startMatchTimer() {
    matchTimer = setInterval(() => {
        if (matchStatus === 'LIVE') {
            matchTime++;
            if (matchTime >= 90) {
                matchTime = 90;
                matchStatus = 'FT';
                clearInterval(matchTimer);
            }
            document.getElementById("player-live-time").textContent = `${matchTime}:00`;
            document.getElementById("match-card-time").textContent = `${matchTime}'`;
        }
    }, 5000); // Ticks fast for local testing
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
            fromPubkey: walletKeypair.publicKey,
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
    localStorage.setItem("solplay_wagers", JSON.stringify(localWagers));
}

function loadWagersFromStorage() {
    const stored = localStorage.getItem("solplay_wagers");
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            localWagers = parsed.map(w => ({
                ...w,
                wagerPubkey: new solanaWeb3.PublicKey(w.wagerPubkey)
            }));
        } catch (e) { console.error(e); }
    }
}

function switchExchangeTab(tabId) {
    try {
        const tabs = ["sports", "slip", "wagers", "memes"];
        tabs.forEach(t => {
            const btn = document.getElementById(`btn-tab-${t}`);
            const panel = document.getElementById(`panel-${t}`);
            if (btn) btn.classList.toggle("active", t === tabId);
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
            if (el) el.classList.remove("active");
        });

        const activePanel = document.getElementById(`panel-match-${tabId}`);
        const activeBtn = document.getElementById(`btn-match-${tabId}`);

        if (activePanel) activePanel.style.display = "flex";
        if (activeBtn) activeBtn.classList.add("active");

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
        const sig = await connection.sendTransaction(tx, signers, { skipPreflight: true });
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
