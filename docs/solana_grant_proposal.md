# Solana Foundation Grant Proposal: SolPlay Social Sportsbook Protocol

## 1. Executive Summary
**SolPlay Protocol** is a next-generation decentralized social sportsbook built natively on Solana. By combining sub-second on-chain settlement, real-time HLS video streaming, dynamic multi-leg accumulators, PostgreSQL/Supabase cloud persistence, autonomous ESPN sports oracles, and 1-click social bet cloning, SolPlay bridges the gap between traditional Web2 engagement and Web3 trustlessness.

We are requesting a **$15,000 equity-free development grant** to complete our smart contract security audit, expand production sports data feeds across international leagues, and deploy SolPlay to Solana Mainnet.

---

## 2. Problem Statement
The current sports betting landscape suffers from three critical issues:
1. **Centralization & Custody Risk**: Traditional sportsbooks (Bet365, 1xBet, SportyBet) hold player funds, delay withdrawals, and arbitrarily limit or freeze winning player accounts.
2. **Lack of Transparency & Copy-Betting Friction**: While tipsters share bet slips across Telegram and Twitter, there is zero cryptographic proof of stake. Followers must manually copy bets across different platforms, leading to errors and lost revenue.
3. **High Latency & Front-Running**: Live in-play betting is vulnerable to courtsiding (latency front-running), forcing platforms to impose long bet approval delays and frozen markets, degrading user experience.

---

## 3. The SolPlay Solution & Current Implementation Status
SolPlay solves these issues by leveraging Solana's 400ms finality, sub-cent transaction costs, and modern real-time cloud data pipelines:
* **Non-Custodial Escrow & PDA Vaults**: Wagers are routed directly to on-chain program escrows. Winnings are claimed instantly by the bettor via cryptographic proof (Instruction 4: `ClaimPayout`).
* **1-Click Social Bet Cloning & 2.0% Creator Royalties**: Punters share active tickets directly in the Live Fan Chat (`SHARE-ACCA:`). Other users can clone any multi-leg accumulator with a single click (`⚡ Clone Acca (1-Click)`). The native smart contract and database engine automatically route a 2.0% creator commission from winnings to the original tipster.
* **Persistent Multi-Leg Accumulators**: Selections and tickets persist across page reloads and tab switches via PostgreSQL/Supabase real-time cloud synchronization.
* **Autonomous Oracle Daemon & Live ESPN Feeds**: Python daemon (`oracle_service.py`) polls live ESPN scoreboards and settles wagers on-chain and in cloud databases with automated VAR/goal freezes and a strict 75-minute in-play cutoff.
* **Integrated Cyber Streaming Center**: Embedded HLS live video mirrors allow players to watch matches and wager simultaneously on a unified responsive dashboard.

---

## 4. Technical Architecture
```
solana_sandbox/
├── src/
│   └── lib.rs              # Native Solana SBF Rust Program (938 LOC, 11 Instructions)
├── index.html              # Cyber-Sportsbook Frontend (HLS Streams + Chat + Betslip)
├── app.js                  # Solana Web3.js client & Phantom/Solflare wallet adapter
├── solplay_db.js           # Supabase PostgreSQL real-time sync connector
├── oracle_service.py       # Autonomous Python oracle daemon syncing ESPN sports API
├── admin.html / admin.js   # Protocol administrative dashboard & market creator
├── database_schema.sql     # PostgreSQL relational schema for users, wagers & betslips
└── test_protocol.py        # Automated end-to-end local & Devnet test suite
```

* **Program ID (Solana Devnet)**: `84AVToEkDwsMXNh77n156DYHaWJa2zVqi8han3qqVdAk`
* **Cloud Database Engine**: PostgreSQL on Supabase (`ervysscnenetauyszrzp`)
* **Live Deployment**: Continuous deployment from GitHub (`main` branch) to Vercel

---

## 5. Funding Request & Milestones
We request **$15,000 USD** (paid in SOL or USDC) to complete the product roadmap over 10 weeks:

### Milestone 1: Production Feeds & Smart Contract Audit (Weeks 1-4)
* **Deliverables**:
  - Secure a third-party smart contract audit from a reputable Web3 security firm (e.g. OtterSec or Neodyme).
  - Connect the autonomous oracle daemon (`oracle_service.py`) to an enterprise multi-source sports data API feed (API-Football / Sportradar).
* **Budget**: $7,500

### Milestone 2: Mainnet Deployment & Custom Infrastructure (Weeks 5-6)
* **Deliverables**:
  - Deploy SolPlay contracts to Solana Mainnet.
  - Bind custom SSL domains (e.g. `solplay.io`) and configure high-availability Solana RPC node clusters.
* **Budget**: $2,500

### Milestone 3: Public Beta Tournament & Community Onboarding (Weeks 7-10)
* **Deliverables**:
  - Launch a public beta tournament on Solana Devnet to stress-test concurrent betting volume.
  - Fund a creator incentive campaign onboarding active sports tipsters and community leaders for 1-click copy betting.
* **Budget**: $5,000
