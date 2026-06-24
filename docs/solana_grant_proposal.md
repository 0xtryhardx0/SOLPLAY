# Solana Foundation Grant Proposal: SolPlay Social Sportsbook

## 1. Executive Summary
SolPlay is a next-generation decentralized social sportsbook built on the Solana blockchain. By combining real-time HLS video streaming, client-side score trackers, dynamic betting markets, and copy-betting social features, SolPlay bridges the gap between traditional Web2 engagement and Web3 trustlessness. 

We are requesting a **$15,000 equity-free development grant** to audit our smart contract, integrate production-grade sports data feeds, and deploy SolPlay to Solana Mainnet.

---

## 2. Problem Statement
The current sports betting landscape suffers from three critical issues:
1. **Centralization & Custody Risk**: Traditional sportsbooks (Web2) hold player funds, delay withdrawals, and arbitrarily limit winning accounts.
2. **Lack of Transparency & Copy-Betting Friction**: While "tipsters" and communities share betting slips, there is no verified proof of stakes. Users must manually copy bets across different platforms, leading to errors.
3. **High Latency & Front-Running**: Live/in-play betting is highly exposed to latency exploits, forcing platforms to impose long bet approval delays and freeze markets, degrading player experience.

---

## 3. The SolPlay Solution
SolPlay solves these issues by leveraging Solana's sub-second transactions and low gas fees:
* **Non-Custodial Escrow**: Wagers are routed directly to on-chain program escrows. Winnings are claimed instantly by the bettor via cryptographic proof (Instruction 4).
* **Social Copy-Betting Loop**: Users share active tickets directly in the Live Fan Chat. Other users can clone the bet in 1-click (`📋 Clone Bet`). The smart contract automatically distributes a 2.0% creator commission from winnings to reward content creators.
* **In-Play House Safeguards**: Protects the liquidity pool via live odds shifting, automatic 8-second goal suspensions, and an absolute 75-minute safety cutoff for late-game markets.
* **Integrated Streaming**: Direct HLS stream mirroring allows players to watch the action and track live stats on a single dashboard.

---

## 4. Technical Architecture
* **Smart Contract**: Written in Rust, compiled via SBF, and deployed to Solana (`84AVToEkDwsMXNh77n156DYHaWJa2zVqi8han3qqVdAk`).
* **Frontend**: Vanilla HTML5, styled with CSS (Liquid Glass design system), and driven by lightweight JavaScript.
* **Streaming Engine**: Hls.js client parsing live HLS streams (`.m3u8`) with custom buffer recovery.
* **Sports Feed API**: Direct client-side fetch calls to TheSportsDB API to populate dynamic league fixtures, odds, and player lineups.

---

## 5. Funding Request & Milestones
We request **$15,000 USD** (paid in SOL or USDC) to complete the product roadmap over 10 weeks:

### Milestone 1: Production Feeds & Security Audit (Weeks 1-4)
* **Deliverables**:
  - Secure a third-party smart contract audit from a reputable Web3 security firm.
  - Connect the autonomous oracle daemon (`oracle_service.py`) to a production sports data feed API (e.g. API-Football).
* **Budget**: $7,500

### Milestone 2: Mainnet Deployment & Custom Domain (Weeks 5-6)
* **Deliverables**:
  - Deploy SolPlay contracts to Solana Mainnet.
  - Bind custom SSL domains (e.g. `solplay.one`) and configure high-availability node clusters.
* **Budget**: $2,500

### Milestone 3: Public Beta Tournament & Marketing (Weeks 7-10)
* **Deliverables**:
  - Launch a public beta tournament on Solana Devnet to stress-test transaction load.
  - Fund a marketing campaign to onboard initial active sports communities and copy-betting creators.
* **Budget**: $5,000
