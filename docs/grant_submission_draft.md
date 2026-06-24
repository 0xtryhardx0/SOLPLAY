# SolPlay: Grant & Accelerator Application Submission Drafts

Use these pre-drafted answers to copy and paste directly into the official application forms.

---

## ☀️ PART 1: Solana Foundation Grant Application
* **Official Link to Apply**: [solana.org/grants](https://solana.org/grants)

### 1. Project Name
`SolPlay`

### 2. Elevator Pitch (One-sentence description)
`A decentralized social sportsbook on Solana combining real-time HLS video streaming, cloneable chat betslips, and dynamic in-play house protection.`

### 3. Detailed Description (What are you building and why?)
```text
We are building SolPlay, a non-custodial social sports betting platform on Solana. 

Traditional Web2 sportsbooks lock winning player accounts, delay payouts, and lack transparency. Meanwhile, existing Web3 betting platforms are strictly text-based and lack engagement. SolPlay solves this by merging the excitement of live sports (embedded HLS streaming mirrors) with the transparency and speed of Solana smart contracts.

Key features include:
1. Non-Custodial Claims: All wagers are locked in on-chain escrows and claimed instantly via smart contracts, bypassing central gatekeepers.
2. 1-Click Bet Cloning: Users share active tickets directly in the Fan Chat. Other players can copy the bet in 1-click. Creators automatically earn a 2.0% commission from winning clones directly on-chain.
3. Automated House Protections: Our simulator prevents latency front-running (courtsiding) through live odds recalculation on goals, 8s market freezes during major events, and a strict 75-minute cutoff for all in-play markets.

By making sports betting social, transparent, and secure, SolPlay introduces a high-volume consumer application to Solana, onboarding traditional sports bettors to the blockchain.
```

### 4. GitHub Repository Link
`[Paste your GitHub URL here]`

### 5. Video Demo Link
`[Record a quick 2-minute Loom video of your screen running SolPlay and paste the link here]`

### 6. Team Bios (Tell us about yourself and past experience)
`[Paste your bio here, highlighting developer skills, passion for crypto, and past projects built]`

### 7. Milestones & Budget Breakdown
```text
Total Request: $15,000 USD (in SOL/USDC)

Milestone 1: $7,500
- Perform a third-party smart contract security audit on target code.
- Integrate the autonomous oracle daemon with API-Football for live, real-world match settling.

Milestone 2: $2,500
- Initialize Platform States and deploy smart contracts to Solana Mainnet.
- Host the application on custom domains and configure high-performance node endpoints.

Milestone 3: $5,000
- Launch a public marketing campaign targeting crypto-sports communities.
- Onboard top social copy-betting creators to drive platform volume.
```

---

## 🤝 PART 2: Alliance DAO Accelerator Application
* **Official Link to Apply**: [alliance.xyz/apply](https://alliance.xyz/apply)

### 1. What is your startup trying to achieve?
```text
SolPlay is building the Web3 social layer for sports betting. We want to replace centralized, restrictive sportsbooks with a decentralized liquidity model where users can "Be the House" by depositing LP, share their tickets in a live social feed, and earn commissions when others copy their bets.
```

### 2. Why is this project unique or hard to replicate?
```text
We have built a working Web3 consumer frontend that natively handles HLS live video streaming and P2P CDN routing alongside direct Solana program execution. Our program is uniquely optimized for low compute unit (CU) limits and integrates a fully automated, client-synced sports feed and house-protection engine that prevents live-latency exploits.
```

### 3. How did the founders meet? How long have you worked together?
`[Describe your history here, e.g. met at a hackathon, university, online forums, and how long you've collaborated]`

### 4. Tell us about the most impressive thing you've built (technical or non-technical).
`[Share a story about a complex app, parser, tool, or hardware you built in the past that showcases your determination and grit]`

### 5. Pitch Deck or Product Demo Link
`[Paste your Loom video demo link here]`

---

## 📝 PART 3: Detailed Answers for Solana Foundation Grant Form Fields

### 1. Solana On-Chain Accounts
**Question:** *Insert this project's on-chain addresses (program ID, token address, fee payer wallets etc.). Separate them using a comma.*
**Answer:**
`Program ID: 84AVToEkDwsMXNh77n156DYHaWJa2zVqi8han3qqVdAk, Developer Fee Payer: CMtyux7PeLhzZ7NyTaSkXxebcysNBappKfxZGsuWySNh, Platform Treasury Wallet: 5syXsU47xYXcixG8wyV31NC1kKgDC53PZfVhsuXnDjDe`

### 2. Funding Amount
**Question:** *How much are you requesting in funding?*
**Answer:**
`$15,000 USD (to be paid in SOL/USDC)`

### 3. Funding Category
**Question:** *Which funding category are you applying for?*
**Answer:**
`Web3 Consumer Apps / Gaming & Social DeFi`

### 4. Your project / idea
**Question:** *What are you building?*
**Answer:**
`SolPlay is a decentralized social sportsbook on Solana. It merges live sports video streams (with localized HLS/CDN acceleration) with a non-custodial copy-betting feed, transparent on-chain wagers, and custom oracle-driven game settling.`

### 5. Referral Partner
**Question:** *If you were referred by a Solana Foundation Partner or by someone at Solana Foundation, please indicate below.*
**Answer:**
`None / Self-referred`

### 6. Is / will this project be open sourced?
**Question:** *Is / will this project be open sourced?*
**Answer:**
`Yes`

### 7. Milestones & Budget Breakdown
**Question:** *Specify the amount of funding you are requesting and list the milestones that will be completed to unlock each portion of that funding.*
**Answer:**
*   **$7,500 due upon completion of Milestone 1:** Integration of the autonomous oracle daemon with API-Football for live, real-world match settling, and smart contract third-party audit completion.
*   **$2,500 due upon completion of Milestone 2:** Platform deployment to Solana Mainnet, verified program accounts, and launch of custom hosted domains.
*   **$5,000 due upon completion of Milestone 3:** Public launch of the platform, marketing campaign targeting copy-betting communities, and onboarding of 10+ social sports creators with at least $100,000 in cumulative platform betting volume within 60 days of launch.

### 8. Relevant traction metrics
**Question:** *Tell us about the traction that your project has already achieved.*
**Answer:**
`We have built the core Rust SBF smart contracts, launched a local test validator cluster, and developed a consumer-facing glassmorphic UI integrating live HLS video streams with real Phantom wallet signature validation. In local developer testing, we successfully validated edge-node latency, automatic odds calculation cutoffs, and simulated betting transaction state pools.`

### 9. Competition
**Question:** *Who is a direct competitor to your project? Tell us your competitive advantage.*
**Answer:**
`Traditional sportsbooks (centralized and prone to banning winning accounts/delayed payouts) and existing Web3 betting platforms (strictly transactional and non-social). SolPlay's competitive advantages are: (1) On-chain copy-betting where users can replicate active tickets in 1-click and creators earn a 2.0% commission directly on-chain, (2) native video stream integration, and (3) robust front-running protections (odds cuts and match freezing) preventing latency courtsiding.`

### 10. How is this project a public good?
**Question:** *How is this project a public good?*
**Answer:**
`SolPlay makes a significant open-source contribution to the Solana ecosystem by providing a reference implementation of a high-performance consumer dApp that integrates live media streaming and Web3 wallets. The client-side P2P CDN accelerator code, the Rust betting escrow program, and the automated sports odds oracle daemon will be open-sourced to help other developer teams build consumer-facing applications on Solana.`

### 11. Why You?
**Question:** *Why are you and your team the best people to build this project? What edge do you have over the competition?*
**Answer:**
`We possess deep systems-level expertise in Rust and SBF smart contract engineering, combined with advanced frontend UI design capabilities (real-time HLS streams, dynamic canvas rendering engines). Having built complex parsers and high-frequency telemetry monitors, we know how to bypass public RPC limits, optimize transactions, and craft secure, interactive Web3 consumer products.`
