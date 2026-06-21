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

// SolPlay Admin Dashboard Logic
let connection;
let walletKeypair = null;
let currentProgramId = null;
let isWalletConnected = false;
let matchScore = { home: 0, away: 0 };

// Whitelisted founder wallet addresses
const WHITELIST = [
    "DirmZaAX8CuoHyvwick6wjnvfDWxnyZyTSf1yoSME2hT",
    "GnjgbeuLcmy1tUNRSzwAM5yPmsmKJvvP7H33H6vMoAm9"
];

const ADMIN_MATCHES = {
    999: { home: "Brazil", away: "France" },
    998: { home: "Arsenal", away: "Chelsea" },
    997: { home: "Al Nassr", away: "Al Hilal" },
    996: { home: "Inter Miami", away: "LA Galaxy" },
    995: { home: "Real Madrid", away: "Barcelona" },
    994: { home: "Inter Milan", away: "Juventus" },
    993: { home: "Bayern Munich", away: "Dortmund" },
    1001: { home: "phzin", away: "Tekkz" },
    1002: { home: "SonicFox", away: "Dominique" }
};

// Initialize on page load
window.addEventListener('load', () => {
    // Connect to local validator
    try {
        connection = new solanaWeb3.Connection("http://127.0.0.1:8899", "confirmed");
    } catch (e) {
        showToast("Failed to connect to local validator.", "error");
    }

    // Load program ID
    let savedProgramId = localStorage.getItem("solplay_program_id");
    if (!savedProgramId) {
        savedProgramId = "GdonKLys4qtYAXyvAqGXNxnj3rQ8hCTjtDrSescct7va";
    }
    document.getElementById("admin-program-id").value = savedProgramId;
    currentProgramId = new solanaWeb3.PublicKey(savedProgramId);

    // Load developer wallet if stored
    loadAdminWallet();

    // Prefill team names based on game ID changes
    const gameIdInput = document.getElementById("admin-game-id");
    if (gameIdInput) {
        // Pre-fill initial value
        const initialId = parseInt(gameIdInput.value);
        if (ADMIN_MATCHES[initialId]) {
            document.getElementById("admin-team-home").value = ADMIN_MATCHES[initialId].home;
            document.getElementById("admin-team-away").value = ADMIN_MATCHES[initialId].away;
        }
        
        gameIdInput.addEventListener("input", (e) => {
            const id = parseInt(e.target.value);
            if (ADMIN_MATCHES[id]) {
                document.getElementById("admin-team-home").value = ADMIN_MATCHES[id].home;
                document.getElementById("admin-team-away").value = ADMIN_MATCHES[id].away;
            }
        });
    }
});

function loadAdminWallet() {
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

async function connectAdminWallet() {
    const connectBtn = document.getElementById("btn-connect-admin");
    const badge = document.getElementById("wallet-status-badge");

    const address = walletKeypair.publicKey.toString();

    // Whitelist check
    if (!WHITELIST.includes(address)) {
        showToast("Access Denied: Wallet is not on the admin whitelist.", "error");
        console.warn(`Attempted admin access by non-whitelisted address: ${address}`);
        return;
    }

    isWalletConnected = true;
    connectBtn.textContent = address.slice(0, 6) + "..." + address.slice(-4);
    connectBtn.style.background = "linear-gradient(135deg, var(--neon-teal), #0d9488)";
    badge.textContent = "Authorized Admin";
    badge.style.background = "rgba(20, 184, 166, 0.15)";
    badge.style.color = "var(--neon-teal)";
    badge.style.borderColor = "rgba(20, 184, 166, 0.3)";

    document.getElementById("access-denied-screen").style.display = "none";
    document.getElementById("admin-panel-grid").style.display = "grid";

    showToast("Operations Console Authorized!", "success");
    await updateWalletBalance();
}

function bypassWhitelistForDev() {
    const address = walletKeypair.publicKey.toString();
    if (!WHITELIST.includes(address)) {
        WHITELIST.push(address);
    }
    showToast("Dev Mode: Whitelist Bypassed", "info");
    connectAdminWallet();
}

async function updateWalletBalance() {
    if (!walletKeypair || !connection) return;
    try {
        const balance = await connection.getBalance(walletKeypair.publicKey);
        const solVal = balance / solanaWeb3.LAMPORTS_PER_SOL;
        document.getElementById("admin-wallet-balance").textContent = solVal.toFixed(4);
    } catch (e) {
        document.getElementById("admin-wallet-balance").textContent = "0.0000";
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

function loadProgramId() {
    const val = document.getElementById("admin-program-id").value.trim();
    if (!val) {
        showToast("Enter a program ID.", "error");
        return;
    }
    try {
        currentProgramId = new solanaWeb3.PublicKey(val);
        localStorage.setItem("solplay_program_id", val);
        showToast("Program ID Loaded successfully!", "success");
    } catch (e) {
        showToast("Invalid Program ID format.", "error");
    }
}

// Score Syncing via LocalStorage
function simulateAdminGoal(teamId) {
    let scorer = document.getElementById("admin-goalscorer").value.trim();
    const homeTeam = document.getElementById("admin-team-home").value.trim() || "Arsenal";
    const awayTeam = document.getElementById("admin-team-away").value.trim() || "Chelsea";
    
    // Star players list for random fallbacks
    const homeStars = {
        "Arsenal": ["Saka", "Ødegaard", "Martinelli", "Havertz", "Rice"],
        "Brazil": ["Vinicius Jr", "Neymar Jr", "Rodrygo", "Raphinha", "Lucas Paqueta"],
        "Inter Miami": ["Messi", "Suarez", "Busquets", "Jordi Alba", "Campana"],
        "Al Nassr": ["Ronaldo", "Sadio Mane", "Talisca", "Otavio", "Brozovic"],
        "Real Madrid": ["Mbappe", "Bellingham", "Vinicius Jr", "Valverde", "Rodrygo"],
        "Inter Milan": ["Lautaro", "Thuram", "Calhanoglu", "Barella", "Mkhitaryan"],
        "Bayern Munich": ["Harry Kane", "Musiala", "Sane", "Gnabry", "Thomas Muller"]
    };
    
    const awayStars = {
        "Chelsea": ["Palmer", "Jackson", "Madueke", "Nkunku", "Enzo Fernandez"],
        "France": ["Mbappe", "Griezmann", "Dembele", "Giroud", "Coman"],
        "LA Galaxy": ["Gabriel Pec", "Marco Reus", "Joveljic", "Fagundez", "Riqui Puig"],
        "Al Hilal": ["Mitrovic", "Neymar", "Malcom", "Milinkovic-Savic", "Ruben Neves"],
        "Barcelona": ["Lewandowski", "Lamine Yamal", "Raphinha", "Pedri", "Gavi"],
        "Juventus": ["Vlahovic", "Chiesa", "Yildiz", "Locatelli", "Rabiot"],
        "Dortmund": ["Guirassy", "Brandt", "Sabitzer", "Adeyemi", "Malen"]
    };

    if (!scorer) {
        if (teamId === 0) {
            const stars = homeStars[homeTeam] || ["Star Player"];
            scorer = stars[Math.floor(Math.random() * stars.length)];
        } else {
            const stars = awayStars[awayTeam] || ["Star Player"];
            scorer = stars[Math.floor(Math.random() * stars.length)];
        }
    }

    if (teamId === 0) matchScore.home++;
    else matchScore.away++;

    saveScoreToStorage(scorer, teamId === 0 ? "home" : "away");
    document.getElementById("admin-goalscorer").value = "";
}

function resetScore() {
    matchScore = { home: 0, away: 0 };
    saveScoreToStorage("", "");
    showToast("Match state reset to 45th min 0-0", "info");
}

function saveScoreToStorage(scorer = "", scoredSide = "") {
    const gameId = parseInt(document.getElementById("admin-game-id").value) || 999;
    localStorage.setItem("solplay_match_score", JSON.stringify({
        gameId: gameId,
        home: matchScore.home,
        away: matchScore.away,
        scorer: scorer,
        scoredSide: scoredSide,
        timestamp: Date.now()
    }));
    const scoreStr = `${matchScore.home} - ${matchScore.away}`;
    showToast(`⚽ GOAL! Score updated to ${scoreStr}`, "info");
}

// Solana Transaction execution (skipPreflight: true)
async function initializePlatformOnchain() {
    if (!isWalletConnected || !currentProgramId) return;
    showToast("Initializing Platform Config PDA...", "info");
    try {
        const platformStateKp = getOrCreateAccountKeypair("platform_state");
        const treasuryKp = getOrCreateAccountKeypair("treasury");

        await createLocalAccount(platformStateKp, 66);

        const data = new Uint8Array(3);
        data[0] = 0;
        data[1] = 150 & 0xff;
        data[2] = (150 >> 8) & 0xff;

        const ix = new solanaWeb3.TransactionInstruction({
            keys: [
                { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: false },
                { pubkey: platformStateKp.publicKey, isSigner: false, isWritable: true },
                { pubkey: treasuryKp.publicKey, isSigner: false, isWritable: false },
            ],
            programId: currentProgramId,
            data: data
        });

        const tx = new solanaWeb3.Transaction().add(ix);
        await sendConfirmAndVerifyTransaction(tx, [walletKeypair]);

        showToast("Success! Platform state initialized.", "success");
        await updateWalletBalance();
    } catch (e) {
        showToast("Init failed: " + e.message, "error");
    }
}

async function createMarketOnchain() {
    if (!isWalletConnected || !currentProgramId) return;

    const gameId = parseInt(document.getElementById("admin-game-id").value);
    const home = document.getElementById("admin-team-home").value.trim();
    const away = document.getElementById("admin-team-away").value.trim();

    showToast(`Creating Market for Game #${gameId}...`, "info");

    try {
        const marketKp = getOrCreateAccountKeypair("market_999");
        const platformStateKp = getOrCreateAccountKeypair("platform_state");

        await createLocalAccount(marketKp, 66);

        const data = new Uint8Array(41);
        data[0] = 1;
        writeU64(data, 1, gameId);
        writeStringN(data, 9, home, 16);
        writeStringN(data, 25, away, 16);

        const ix = new solanaWeb3.TransactionInstruction({
            keys: [
                { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: false },
                { pubkey: marketKp.publicKey, isSigner: false, isWritable: true },
                { pubkey: platformStateKp.publicKey, isSigner: false, isWritable: false }
            ],
            programId: currentProgramId,
            data: data
        });

        const tx = new solanaWeb3.Transaction().add(ix);
        await sendConfirmAndVerifyTransaction(tx, [walletKeypair]);

        showToast("Success! Market registered on-chain.", "success");
        await updateWalletBalance();
    } catch (e) {
        showToast("Market creation failed: " + e.message, "error");
    }
}

async function resolveMarketOnchain() {
    if (!isWalletConnected || !currentProgramId) return;

    const gameId = parseInt(document.getElementById("admin-game-id").value);
    const outcome = parseInt(document.getElementById("admin-outcome-select").value);

    showToast(`Resolving Game #${gameId}...`, "info");

    try {
        const marketKp = getOrCreateAccountKeypair("market_999");
        const platformStateKp = getOrCreateAccountKeypair("platform_state");

        const data = new Uint8Array(9);
        data[0] = 3;
        writeU64(data, 1, gameId);
        data[8] = outcome;

        const ix = new solanaWeb3.TransactionInstruction({
            keys: [
                { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: false },
                { pubkey: marketKp.publicKey, isSigner: false, isWritable: true },
                { pubkey: platformStateKp.publicKey, isSigner: false, isWritable: false }
            ],
            programId: currentProgramId,
            data: data
        });

        const tx = new solanaWeb3.Transaction().add(ix);
        await sendConfirmAndVerifyTransaction(tx, [walletKeypair]);

        showToast("Success! Game Resolved.", "success");
        
        // Notify user portal of resolution via localStorage status update
        localStorage.setItem("solplay_resolution_trigger", JSON.stringify({
            gameId: gameId,
            outcome: outcome,
            timestamp: Date.now()
        }));

        await updateWalletBalance();
    } catch (e) {
        showToast("Resolution failed: " + e.message, "error");
    }
}

async function registerStreamOnchain() {
    if (!isWalletConnected || !currentProgramId) return;

    const id = parseInt(document.getElementById("admin-stream-id").value);
    const region = document.getElementById("admin-stream-region").value;
    const name = document.getElementById("admin-stream-name").value.trim();
    const url = document.getElementById("admin-stream-url").value.trim();

    if (!id || !name || !url) {
        showToast("Please enter a valid Stream ID, Name, and URL.", "error");
        return;
    }

    showToast(`Registering Stream ID #${id} on-chain...`, "info");

    try {
        const streamKp = getOrCreateAccountKeypair("stream_" + id);
        const platformStateKp = getOrCreateAccountKeypair("platform_state");

        await createLocalAccount(streamKp, 185);

        const data = new Uint8Array(186);
        data[0] = 6;
        writeU64(data, 1, id);
        writeStringN(data, 9, name, 32);
        writeStringN(data, 41, url, 128);
        writeStringN(data, 169, region, 16);
        data[185] = 1;

        const ix = new solanaWeb3.TransactionInstruction({
            keys: [
                { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: false },
                { pubkey: streamKp.publicKey, isSigner: false, isWritable: true },
                { pubkey: platformStateKp.publicKey, isSigner: false, isWritable: false }
            ],
            programId: currentProgramId,
            data: data
        });

        const tx = new solanaWeb3.Transaction().add(ix);
        await sendConfirmAndVerifyTransaction(tx, [walletKeypair]);

        showToast("Success! Stream registered on-chain.", "success");
        triggerStreamsSync();
    } catch (e) {
        showToast("Stream registration failed: " + e.message, "error");
    }
}

async function updateStreamUrlOnchain() {
    if (!isWalletConnected || !currentProgramId) return;

    const id = parseInt(document.getElementById("admin-stream-id").value);
    const url = document.getElementById("admin-stream-url").value.trim();

    if (!id || !url) {
        showToast("Please enter a valid Stream ID and URL.", "error");
        return;
    }

    showToast(`Updating Mirror URL for Stream #${id}...`, "info");

    try {
        const streamKp = getOrCreateAccountKeypair("stream_" + id);
        const platformStateKp = getOrCreateAccountKeypair("platform_state");

        const data = new Uint8Array(137);
        data[0] = 7;
        writeU64(data, 1, id);
        writeStringN(data, 9, url, 128);

        const ix = new solanaWeb3.TransactionInstruction({
            keys: [
                { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: false },
                { pubkey: streamKp.publicKey, isSigner: false, isWritable: true },
                { pubkey: platformStateKp.publicKey, isSigner: false, isWritable: false }
            ],
            programId: currentProgramId,
            data: data
        });

        const tx = new solanaWeb3.Transaction().add(ix);
        await sendConfirmAndVerifyTransaction(tx, [walletKeypair]);

        showToast("Success! Stream URL updated.", "success");
        triggerStreamsSync();
    } catch (e) {
        showToast("Update failed: " + e.message, "error");
    }
}

async function toggleStreamOnchain(status) {
    if (!isWalletConnected || !currentProgramId) return;

    const id = parseInt(document.getElementById("admin-stream-id").value);
    showToast(`${status === 1 ? 'Activating' : 'Deactivating'} Stream #${id}...`, "info");

    try {
        const streamKp = getOrCreateAccountKeypair("stream_" + id);
        const platformStateKp = getOrCreateAccountKeypair("platform_state");

        const data = new Uint8Array(10);
        data[0] = 8;
        writeU64(data, 1, id);
        data[9] = status;

        const ix = new solanaWeb3.TransactionInstruction({
            keys: [
                { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: false },
                { pubkey: streamKp.publicKey, isSigner: false, isWritable: true },
                { pubkey: platformStateKp.publicKey, isSigner: false, isWritable: false }
            ],
            programId: currentProgramId,
            data: data
        });

        const tx = new solanaWeb3.Transaction().add(ix);
        await sendConfirmAndVerifyTransaction(tx, [walletKeypair]);

        showToast(`Success! Stream ${status === 1 ? 'Activated' : 'Deactivated'}.`, "success");
        triggerStreamsSync();
    } catch (e) {
        showToast("Toggle failed: " + e.message, "error");
    }
}

function triggerStreamsSync() {
    localStorage.setItem("solplay_streams_sync", Date.now());
}

// Helpers
async function createLocalAccount(newAccountKeypair, space) {
    const info = await connection.getAccountInfo(newAccountKeypair.publicKey);
    if (info !== null) return;
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
    await sendConfirmAndVerifyTransaction(tx, [walletKeypair, newAccountKeypair]);
}

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

async function sendConfirmAndVerifyTransaction(tx, signers) {
    try {
        const sig = await connection.sendTransaction(tx, signers, { skipPreflight: true });
        await connection.confirmTransaction(sig);
        const status = await connection.getSignatureStatus(sig);
        if (status && status.value && status.value.err) {
            let logs = [];
            try {
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
                throw new Error("Account data too small. Ensure the accounts are initialized first.");
            }
            throw new Error(`${e.message}. Logs: ${logs.join(" | ")}`);
        }
        throw e;
    }
}

function writeU64(buf, offset, val) {
    const bigVal = BigInt(val);
    for (let i = 0; i < 8; i++) {
        buf[offset + i] = Number((bigVal >> BigInt(i * 8)) & 0xffn);
    }
}

function writeStringN(buf, offset, str, maxLen) {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(str.slice(0, maxLen));
    buf.set(encoded, offset);
}

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
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}
