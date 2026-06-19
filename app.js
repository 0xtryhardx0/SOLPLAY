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
let matchScore = { home: 0, away: 0 };
let matchTime = 45;
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
    document.getElementById("admin-program-id").value = savedProgramId;
    currentProgramId = new solanaWeb3.PublicKey(savedProgramId);

    // Populate stream providers
    initStreams();
    
    // Load and render persistent wagers
    loadWagersFromStorage();
    renderActiveWagers();
});

// 1. Wallet Management (Local Sandbox Wallet)
function loadOrCreateWallet() {
    const storedSecret = localStorage.getItem("solplay_wallet_secret");
    if (storedSecret) {
        try {
            const secretArray = JSON.parse(storedSecret);
            walletKeypair = solanaWeb3.Keypair.fromSecretKey(new Uint8Array(secretArray));
        } catch (e) {
            console.error("Failed to parse stored wallet secret", e);
        }
    }

    if (!walletKeypair) {
        walletKeypair = solanaWeb3.Keypair.generate();
        const secretArray = Array.from(walletKeypair.secretKey);
        localStorage.setItem("solplay_wallet_secret", JSON.stringify(secretArray));
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
        { name: "Server 2 (HLS Direct)", url: "", description: "Direct HLS live feed simulator.", type: "mock_hls" },
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

function updateStreamProviders() {
    const regionSelect = document.getElementById("stream-region-select");
    const providerSelect = document.getElementById("stream-provider-select");
    if (!regionSelect || !providerSelect) return;
    const selectedRegion = regionSelect.value;
    
    // Clear previous options
    providerSelect.innerHTML = "";
    
    // Populate new options
    const providers = activeStreams[selectedRegion] || [];
    providers.forEach((prov, idx) => {
        const opt = document.createElement("option");
        opt.value = idx;
        opt.textContent = prov.name;
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
    
    if (provider.type === "youtube") {
        playerFrame.style.display = "block";
        mockPlayer.style.display = "none";
        playerFrame.src = provider.url;
    } else if (provider.type === "external") {
        // Show Live Graphical Tracker and Open Link Button
        playerFrame.style.display = "none";
        mockPlayer.style.display = "flex";
        
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
        `;
        
        // Insert right under score
        mockPlayer.insertBefore(routingBlock, mockPlayer.querySelector(".stream-controls"));
    } else {
        // Mock HLS or E-Sports Mock
        playerFrame.style.display = "none";
        mockPlayer.style.display = "flex";
        
        const descBlock = document.createElement("div");
        descBlock.id = "routing-info-block";
        descBlock.className = "stream-routing-info";
        descBlock.innerHTML = `
            <span class="provider-desc" style="font-size: 0.8rem; color: var(--text-secondary); max-width: 280px; display: block; margin-bottom: 0.5rem; line-height: 1.4;">
                ${provider.description}
            </span>
        `;
        mockPlayer.insertBefore(descBlock, mockPlayer.querySelector(".stream-controls"));
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
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    if (isSystem) {
        bubble.style.borderLeft = "3px solid var(--neon-teal)";
        bubble.style.background = "rgba(20, 184, 166, 0.05)";
    }

    const header = document.createElement("div");
    header.className = "chat-author";
    header.innerHTML = `<span>${isSystem ? "🤖 " + user : "👤 " + user}</span>`;
    
    // Add tip/copy actions
    if (!isSystem) {
        const actions = document.createElement("span");
        actions.innerHTML = `
            <span style="color: var(--neon-orange); cursor: pointer; margin-right: 0.5rem;" onclick="tipUserChat('${user}')">🪙 Tip</span>
            <span style="color: var(--neon-teal); cursor: pointer;" onclick="copyCodeFromChat('${text}')">📋 Copy</span>
        `;
        header.appendChild(actions);
    }
    
    const body = document.createElement("div");
    body.className = "chat-text";
    body.textContent = text;

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
    currentBettingTab = tab;
    document.getElementById("tab-live").classList.toggle("active", tab === 'live');
    document.getElementById("tab-custom").classList.toggle("active", tab === 'custom');
    document.getElementById("tab-lp").classList.toggle("active", tab === 'lp');

    document.getElementById("content-live").style.display = tab === 'live' ? 'block' : 'none';
    document.getElementById("content-custom").style.display = tab === 'custom' ? 'block' : 'none';
    document.getElementById("content-lp").style.display = tab === 'lp' ? 'block' : 'none';
}

function selectOdds(gameId, outcomeId, oddsValue, outcomeLabel) {
    const container = document.getElementById("betslip-items-container");
    container.innerHTML = ""; // Single selection for simplicity in prototype

    activeSelection = { gameId, outcomeId, oddsValue, outcomeLabel };

    const item = document.createElement("div");
    item.className = "betslip-selection";
    item.innerHTML = `
        <button class="btn-remove-selection" onclick="clearSelection()">Remove</button>
        <div class="selection-teams">Arsenal vs Chelsea</div>
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

    let label = "Arsenal Win";
    let odds = 2.25;
    if (outcomeId === 1) { label = "Chelsea Win"; odds = 3.50; }
    if (outcomeId === 2) { label = "Draw"; odds = 3.20; }

    selectOdds(gameId, outcomeId, odds, label);
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
            <div style="display:flex; justify-content:space-between; font-size:0.8rem;">
                <span>Stake: ${w.amount.toFixed(2)} SOL</span>
                <span style="font-weight:600; color:var(--neon-teal);">${w.odds.toFixed(2)}x</span>
            </div>
            ${claimBtn}
        `;
        container.appendChild(item);
    });
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
window.addEventListener('storage', (e) => {
    if (e.key === "solplay_match_score" && e.newValue) {
        try {
            const data = JSON.parse(e.newValue);
            matchScore.home = data.home;
            matchScore.away = data.away;
            const scoreStr = `${matchScore.home} - ${matchScore.away}`;
            
            const liveScore = document.getElementById("player-live-score");
            const cardScore = document.getElementById("match-card-score");
            if (liveScore) liveScore.textContent = `Arsenal ${scoreStr} Chelsea`;
            if (cardScore) cardScore.textContent = scoreStr;
            
            if (data.home === 0 && data.away === 0) {
                const liveTime = document.getElementById("player-live-time");
                const cardTime = document.getElementById("match-card-time");
                if (liveTime) liveTime.textContent = "45:00";
                if (cardTime) cardTime.textContent = "45'";
                showToast("Match state reset to 45th min 0-0", "info");
            } else {
                showToast(`⚽ GOAL! Match state updated to ${scoreStr}`, "info");
                appendChatMessage("System", `⚽ GOAL! Score is now Arsenal ${scoreStr} Chelsea. Odds adjusting...`, true);
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
            localWagers.forEach(w => {
                if (w.gameId === data.gameId) {
                    w.status = (w.outcomeId === data.outcome) ? "WON" : "LOST";
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
    let name = "$CANNONBLAST (Arsenal Win)";
    if (outcomeId === 1) name = "$BLUELION (Chelsea Win)";
    if (outcomeId === 2) name = "$COINSDRAW (Draw)";

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
