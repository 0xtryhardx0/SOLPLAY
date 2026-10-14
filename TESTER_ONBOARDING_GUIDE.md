# ⚡ SolPlay Tester Onboarding & Quick-Start Guide

Welcome to the **SolPlay Private Alpha / Beta Testing Program**. SolPlay is a sub-second, decentralized social sportsbook built on Solana with live match streaming, dynamic multi-leg accumulators, and 1-click chat bet cloning.

---

## 🌐 1. Accessing SolPlay
* **Live Web Application**: Deployments auto-sync to Vercel on every GitHub push to [0xtryhardx0/SOLPLAY](https://github.com/0xtryhardx0/SOLPLAY.git).
* **Supported Devices**: Fully responsive on Desktop (Chrome, Brave, Safari, Edge) and Mobile (iOS Safari, Android Chrome, Phantom Mobile Browser).

---

## 👛 2. Choosing Your Testing Wallet Mode

SolPlay supports two testing modes:

### Mode A: Instant Sandbox Wallet (No Setup Needed — Recommended for Quick Testing)
1. When you open SolPlay, a unique cryptographic keypair is generated directly in your browser.
2. Click **"Connect Sandbox Wallet"** in the top right header.
3. You will immediately be credited with **10.0000 Test SOL**.
4. Your account is cryptographically unique to your browser and automatically synchronized with the central PostgreSQL/Supabase database.

### Mode B: Phantom / Solflare Wallet (Solana Devnet)
1. Select **"Phantom Wallet"** from the top header dropdown.
2. Click **"Connect Phantom Wallet"** and approve the connection in your browser extension or mobile app.
3. Switch your Phantom network to **Solana Devnet** in Settings -> Developer Settings -> Change Network.
4. Click **"Airdrop 1 SOL"** to receive real Devnet SOL for on-chain contract testing.

---

## ⚽ 3. How to Place Bets & Build Accumulators

### Placing a Single Bet:
1. Browse through the 31+ verified UEFA Champions League and English Premier League fixtures.
2. Click any odds button (e.g., Home Win **1.85x**, Draw **3.40x**, or Away Win **4.20x**).
3. The Betslip will open on the right (or tap the floating bottom pill on mobile).
4. Enter your stake in SOL (e.g. `1.0` SOL) and click **"⚡ Place Wager"**.

### Building a Multi-Leg Accumulator (Parlay):
1. Select picks across 2 or more different matches.
2. SolPlay automatically combines your selections into an accumulator:
   - Combined multiplier multiplies your odds.
   - Earn an **Acca Boost** (up to +25% bonus return for 6+ legs).
3. Click **"⚡ Place Wager"**. Your ticket ID (e.g. `#SP-928104`) is generated and synced to the cloud database.

---

## 🔄 4. Persistence Test (Zero Data Loss)
* Select 4 matches in your betslip.
* **Reload the page (Cmd+R or F5)** or close the browser tab and re-open it.
* Notice that **all your selections and odds highlights remain 100% intact**. They are preserved in real-time across sessions.

---

## 💬 5. 1-Click Social Bet Cloning in Live Chat
1. Navigate to **"My Bets"** in the betslip panel.
2. Find any active wager and click **"📤 Share to Chat"**.
3. SolPlay broadcasts a rich interactive ticket card into the **Live Match Fan Chat**.
4. Any other player or friend in the chat can click **"⚡ Clone Acca (1-Click)"** to immediately load your exact selections into their slip.
5. When a cloned ticket wins, the smart contract and database engine automatically credit the original tipster with a **2.0% creator royalty**!

---

## 🏆 6. Match Conclusion & Settlement
1. Concluded matches (e.g. *Inter Milan vs Club Brugge 3-4 FT*) are marked as **FT (Finished)**.
2. Click **"🔍 Settle & Verify Ticket"** on your ticket.
3. The verification engine checks the official scoreline, evaluates each leg, and updates the ticket:
   - **🏆 WON**: Instantly unlocks the **"💰 Claim Payout"** button, updating your balance in the cloud.
   - **❌ LOST**: Officially settled with scoreline breakdown.

---

## 🐞 7. Feedback & Bug Reporting
Please report any visual glitches, latency anomalies, or feature requests directly to the core development team or open an issue on [GitHub](https://github.com/0xtryhardx0/SOLPLAY/issues).
