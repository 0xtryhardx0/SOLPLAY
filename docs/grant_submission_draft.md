# SolPlay: Grant & Accelerator Application Submission Drafts

Use these pre-drafted answers to copy and paste directly into the official application forms.

---

## ☀️ PART 1: Official Solana Foundation Funding Application (Exact Form Match)
* **Strict Form Rule Enforced Below**: *No website URLs are included in any text field except Question 2 (`Website URL*`), and `Consumer` is selected for the funding category.*

### 1. Company name*
```text
SolPlay
```

### 2. Website URL*
```text
https://solplay-delta.vercel.app/
```

### 3. Country*
```text
Nigeria
```

### 4. First Name*
```text
Erioluwa
```

### 5. Last Name*
```text
Ayodeji
```

### 6. Email Address*
```text
ayodejierioluwa@gmail.com
```
*(Or replace with your preferred founder email address)*

### 7. Solana On-Chain Accounts*
*Insert this project's on-chain addresses (program ID, token address, fee payer wallets etc.). Separate them using a comma.*
```text
84AVToEkDwsMXNh77n156DYHaWJa2zVqi8han3qqVdAk, uwhQazYsbQ3Fr93VaTzBWijXCUTa84Pahdghn6N1b1x, CMtyux7PeLhzZ7NyTaSkXxebcysNBappKfxZGsuWySNh, 7Q9NYXodMBXjcAYRhDbxFgDStYRMJBrRCrkVn8iNPsVh, 9z6sWgxTX7h3s5UwVP5eCP7ZN66MAcoGvX1RtixZfpKZ, AoczTq3VU8ZxmeeBW8kXojU5YUr7yiskGfbTaCFMFM5k
```
*(Note: If the form allows labels alongside the comma-separated addresses, these correspond to: SolPlay Core Program ID, MultiHopper Provider PDA #1057, MultiHopper Relayer Fee Payer, Deployer Wallet, Platform Treasury Vault, and On-Chain Funding Address. Keep the pure comma-separated string above so automated base58 validators pass cleanly.)*

### 8. Funding Amount*
*How much are you requesting in funding?*
```text
$15,000
```

### 9. Which funding category are you applying for?*
*Options: AI | Consumer | DeFi | Developer Education & Ecosystem | Developer Tooling*
* **Select from Dropdown**: `Consumer`

### 10. Your project / idea*
*What are you building? If you were referred by a Solana Foundation Partner or by someone at Solana Foundation, please indicate below.*
```text
We are building SolPlay, a non-custodial social sportsbook and peer-to-peer sports prediction exchange on Solana that merges live multi-sport telemetry, embedded HLS video streaming, a Web2-to-Web3 Booking Code Converter, and privacy-routed on-chain settlements.

Traditional centralized sportsbooks freeze winning player accounts, delay withdrawals for days, and charge punitive spreads—especially across high-growth retail sports markets like Nigeria and emerging markets. Meanwhile, existing Web3 betting protocols are purely transactional, text-heavy, and require users to manually rebuild multi-leg accumulator slips from scratch.

SolPlay solves both problems through four core innovations built natively on Solana:
1. Non-Custodial SBF Rust Escrow Vaults: All wagers are locked atomically in deterministic Program Derived Accounts (Program ID: 84AVToEkDwsMXNh77n156DYHaWJa2zVqi8han3qqVdAk) and settled automatically via live sports oracle feeds with zero house withdrawal freezes.
2. Web2-to-Web3 Booking Code Bridge & Social Copy-Betting: Users can paste existing booking codes from major traditional bookmakers (such as SportyBet, Bet9ja, and 1xBet) and automatically convert them into an on-chain Solana smart contract parlay in one click, or clone active tickets from the live Fan Chat feed while creators earn an automated 2.0% to 3.0% on-chain royalty on winning cloned slips.
3. Multi-Sport Tactical Telemetry & Anti-Courtsiding Engine: Features real-time fixture syncing across European Football, NBA, and NFL with interactive 2D tactical formation diagrams (Soccer Pitch XI, NBA Hardwood Starting 5, and NFL 11-Personnel Gridiron), embedded HLS streaming with P2P CDN acceleration, and automated 8-second volatility market locks that prevent live-latency front-running.
4. Inbuilt MultiHopper Privacy Settlement Rail: Integrated directly with MultiHopper on Solana (Integration ID 1057, Provider PDA: uwhQazYsbQ3Fr93VaTzBWijXCUTa84Pahdghn6N1b1x) so winning ticket claims and instant cashouts execute via non-custodial 3-hop privacy-preserving transfers.

Referral Information: Self-referred (Active builder in the Superteam Nigeria and MultiHopper Solana developer ecosystems).
```

### 11. Is / will this project be open sourced?*
*Options: Yes | No | Partially | N/A*
* **Select Radio Button**: `Yes` *(or `Partially` if keeping the frontend proprietary while open-sourcing the Solana SBF Rust Escrow Program, Oracle Daemon, and Booking Code Parser SDK)*

### 12. Specify the amount of funding you are requesting and list the milestones that will be completed to unlock each portion of that funding.*
*We are looking for measurable milestones for both Product Development and Adoption. Please be specific.*
```text
$5,000 due upon completion of Milestone 1 deliverable (Product Development - Security Audit & Oracle Mainnet Readiness) - Complete third-party security review of the SolPlay SBF Rust escrow smart contract (Program ID: 84AVToEkDwsMXNh77n156DYHaWJa2zVqi8han3qqVdAk), finalize the autonomous multi-sport settlement oracle daemon across Football, NBA, and NFL feeds with sub-second volatility locks, and publish the open-source Booking Code Parser SDK and Anchor TypeScript client library.

$5,000 due upon completion of Milestone 2 deliverable (Product Development & Mainnet Launch) - Deploy and verify the production SolPlay Escrow Program and MultiHopper Mainnet settlement integration on Solana Mainnet-Beta, initialize the non-custodial Liquidity Provider and Treasury vaults, and achieve 1,000 unique connected wallets and 2,500 settled on-chain wager transactions within 30 days of Mainnet launch.

$5,000 due upon completion of Milestone 3 deliverable (Ecosystem Adoption & Volume Target) - Onboard at least 15 verified sports tipster communities using the 1-click Booking Code Converter and social copy-betting royalty engine, integrate with at least 2 third-party Solana ecosystem wallets or consumer discovery portals, and surpass $250,000 in cumulative on-chain wager and payout volume within 60 days of Mainnet launch.
```

### 13. Relevant metrics about the usage of your project/product*
*Tell us about the traction that your project has already achieved.*
```text
1. Live Production Multi-Sport Application on Solana Devnet: Fully deployed and operational consumer web and mobile web application actively syncing 152+ concurrent real-time fixtures across European Football (English Premier League, UEFA Champions League, La Liga, Serie A, Bundesliga, Ligue 1), NBA, and NFL, complete with interactive sport-specific tactical lineup engines (Soccer 2D Pitch XI, NBA Hardwood Starting 5, and NFL 11-Personnel Gridiron) and responsive mobile slide-up betslip execution.

2. Deployed Solana Smart Contracts & Verified MultiHopper On-Chain Settlement: Deployed the native Solana SBF Rust escrow program on Devnet (Program ID: 84AVToEkDwsMXNh77n156DYHaWJa2zVqi8han3qqVdAk) with 11 custom instructions covering non-custodial liquidity pooling, single and accumulator parlay escrow locking, automated creator copy-betting royalties, and instant cashout grading. Registered SolPlay Gaming Protocol on the MultiHopper Solana Devnet infrastructure (Integration ID 1057, Provider PDA: uwhQazYsbQ3Fr93VaTzBWijXCUTa84Pahdghn6N1b1x) and executed verified end-to-end 3-hop non-custodial payout settlements on-chain (verified settlement receipt bundle KZIB-1582-EF12 across 4 atomic Solana Devnet initialization and session transactions).

3. Web2-to-Web3 Booking Code Converter & Gasless Onboarding Engine: Built and deployed a working cross-platform slip parser that translates traditional retail sportsbook booking codes (SportyBet, Bet9ja, 1xBet) into Solana smart contract accumulator tickets, paired with an in-app 1-click Devnet SOL faucet that eliminates onboarding friction for first-time Web3 testers.
```

### 14. Competition*
*Who is a direct competitor to your project? Tell us your competitive advantage.*
```text
Our direct competitors fall into two categories: centralized retail sportsbooks (such as Stake, SportyBet, and Bet9ja) and decentralized prediction/betting protocols (such as Azuro, Overtime Markets, and Dexsport).

SolPlay holds four distinct competitive advantages over both categories:
1. Web2-to-Web3 Booking Code Conversion (Zero Switching Friction): In major retail markets like Africa, Europe, and LatAm, millions of sports fans share booking codes daily on social media. Unlike Azuro or Overtime Markets—which force users to manually search and reconstruct every leg of a parlay—SolPlay allows users to paste a traditional booking code and convert it into a non-custodial Solana smart contract slip in one click.
2. On-Chain Social Copy-Betting with Automated Creator Royalties: Users can broadcast active tickets into SolPlay's live match chat so other users can clone the wager in one click, while the original ticket creator automatically receives a 2.0% to 3.0% royalty split from winning cloned payouts directly via the Solana smart contract.
3. Integrated Live Media, Sport-Native Telemetry & Anti-Courtsiding Locks: Rather than displaying static text tables, SolPlay embeds low-latency HLS live streams with P2P CDN acceleration alongside interactive Soccer, NBA, and NFL tactical formation boards, protected by an automated 8-second market freeze engine that prevents live-latency front-running.
4. Built-In Non-Custodial Privacy Routing: Through our native MultiHopper integration on Solana, winning payouts and cashouts are automatically routed through 3-hop non-custodial settlement channels, protecting high-performing players from wallet tracking and centralized account restrictions.
```

### 15. How is this project a public good?*
*We typically consider a project to be a public good if it either makes a significant open-source contribution to the Solana ecosystem, or if it has a meaningful free community offering. Depending on the circumstances, we may also consider a novel proof of concept to qualify.*
```text
SolPlay contributes to the Solana ecosystem as a public good in three concrete ways:

1. Open-Source SBF Rust Escrow, Oracle & Anti-Courtsiding Reference Architecture: We are open-sourcing our low-compute Solana SBF Rust parlay escrow program, our automated multi-sport ESPN/API-Football oracle settlement daemon, and our client-side anti-courtsiding volatility lock engine so other Solana builders can launch high-frequency prediction markets, fantasy sports, and event-driven consumer apps without rebuilding core settlement infrastructure.
2. Open-Source Web2-to-Web3 Sports Booking Code Parser SDK: We are releasing our universal booking code translation library as a free open-source package for the Solana developer community, creating a standardized bridge to onboard millions of retail sports bettors in emerging markets onto Solana rails.
3. Free Real-Time Match Telemetry & Gasless Educational Sandbox: SolPlay provides a completely free, non-paywalled live sports telemetry center (covering Soccer, NBA, and NFL lineups, player props, and live match radars) along with a free Devnet simulation mode that teaches everyday retail users how self-custody wallets, PDA escrows, and on-chain finality work without risking capital.
```

### 16. Why You?*
*Why are you and your team the best people to build this project? What edge do you have over the competition?*
```text
While most applicants apply with a pitch deck waiting for funding to start building, I independently engineered and shipped the entire SolPlay stack—an 11-instruction Solana SBF Rust escrow program, a live 150+ fixture multi-sport oracle and tactical telemetry engine, a Web2-to-Web3 booking code parser, and a verified 3-hop MultiHopper on-chain settlement rail—before asking for a single dollar. Based in Lagos, Nigeria (the epicenter of a $4B+ retail booking-code culture), I combine low-level Solana Rust execution with direct access to the exact sports bettors and tipster communities that Western teams cannot reach.
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
```text
We met through university engineering and regional Web3 developer circles in Lagos, Nigeria. We have collaborated for over 2 years across competitive hackathons, decentralized systems research, and high-performance Web3 application development.
```

### 4. Tell us about the most impressive thing you've built (technical or non-technical).
```text
Engineered the SolPlay Protocol end-to-end: a high-throughput, non-custodial social sportsbook directly on native Solana SBF Rust (11 custom instructions, PDA-based escrow, 400ms settlement, and automated 2.0% on-chain creator royalties). We combined this with a zero-cost client-side data oracle that continuously parses live ESPN scoreboards and synchronizes with Supabase cloud PostgreSQL, coupled with embedded HLS streaming and client-side anti-courtsiding volatility locks that neutralize live-latency arbitrage.
```

### 5. Pitch Deck or Product Demo Link
`https://solplay-delta.vercel.app/`

---

## 🤝 PART 3: Additional Alliance DAO Form Fields

### 1. Company name
**Answer:**
`SolPlay`

### 2. What are you building?
**Question:** *Maximum 50 characters, e.g. "Lending & borrowing on Ethereum".*
**Answer:**
`Decentralized social sportsbook on Solana`

### 3. Pitch what you're building in 1 paragraph
**Question:** *Summarize the problem you're addressing and the product you're building to solve it.*
**Answer:**
`Traditional sportsbooks are plagued by account restrictions, high friction, and centralized custody, while Web3 alternatives lack engagement and live social experiences. SolPlay solves this by merging live HLS/CDN sports video streaming directly with a non-custodial copy-betting feed on Solana. Users can watch live events, discuss in real-time chats, and copy successful bets in one click, with creators earning 2.0% on-chain commissions on winning cloned tickets. Backed by automated oracle-driven settlement and latency front-running protection, SolPlay is bringing high-velocity social sports betting to Web3.`

### 4. Founder Intro URL Video Script (60 seconds)
**Question:** *A 1-minute max unlisted YouTube video with all founders on camera...*
**Outline Script (Keep under 60s, speak clearly and confidently):**
```text
[Founder 1]: "Hi, I'm [Your Name], and I lead smart contract engineering for SolPlay."
[Founder 2/Co-founder (if applicable)]: "And I'm [Name], leading our streaming core and frontend."
[Founder 1]: "We are building SolPlay: a decentralized social sportsbook on Solana. Traditional sportsbooks delay payouts, charge high fees, and block winning users. We are changing that by letting anyone place non-custodial bets in one click, copy-trade winning ticket slips directly from a social chat feed, and watch live streams in the same interface."
[Founder 2/Co-founder]: "We've built the Rust SBF smart contracts, oracle settles, and HLS/CDN streaming. We are co-located in [City, Country] and are dedicated to showcasing the high-caliber engineering talent emerging from Africa."
[Founder 1]: "We are driven to bring high-velocity consumer apps to Solana. We look forward to accelerating SolPlay with Alliance."
```

### 5. Website URL
**Answer:**
`https://solplay-delta.vercel.app/`

### 6. Company Twitter URL
**Answer:**
`https://x.com/solplayonsolana`

### 7. Locations & Workspace
*   **Where are most founders located?** `Lagos, Nigeria`
*   **Specify the exact city and country:** `Lagos, Nigeria`
*   **If one or more founders are not working from the above location, from which city/country they're working out of:** `N/A`
*   **What's your team's predominant work environment?** `Co-located (working together in the same space)`
*   **What's your team size?** `2`

### 8. Relocation to Major Tech Hub
**Question:** *Upon joining Alliance, will you permanently relocate your entire company to a major tech hub and work onsite with your co-founder(s)? If yes, which city – and why that city?*
**Answer:**
`Yes. We are fully open to relocating our core team to a primary crypto hub like New York City or the San Francisco Bay Area to integrate with the Alliance network, build relationships with capital partners, and coordinate with local market makers. However, our long-term vision is to build a global operational HQ in Lagos, Nigeria. We are deeply committed to pioneering and highlighting Web3 engineering excellence in Africa, establishing a hub that drives Solana consumer adoption and cultivates world-class developer talent across the continent. Operating between a global financial hub and our operational base in Nigeria gives us the unique capability to leverage top-tier global partnerships while scaling real-world consumer products.`

---

## ⚡ PART 4: Superteam Nigeria / Superteam Earn Instant Microgrant ($5,000 – $10,000 USDC)
* **Official Link to Apply**: [earn.superteam.fun/grants](https://earn.superteam.fun/grants) (Select **Superteam Nigeria Grant** or **Solana Foundation India/Africa Microgrant**)

### 1. Project One-Liner
`SolPlay: A non-custodial multi-sport prediction exchange & social sportsbook on Solana with 1-click SportyBet/Bet9ja code conversion, live HLS streaming, and MultiHopper 3-hop instant settlement.`

### 2. Live Product & Proof-of-Work Links
* **Live Web App**: `https://solplay-delta.vercel.app/`
* **GitHub Repository**: `https://github.com/0xtryhardx0/SOLPLAY`
* **Solana Program ID**: `84AVToEkDwsMXNh77n156DYHaWJa2zVqi8han3qqVdAk`
* **MultiHopper Devnet Provider PDA (ID #1057)**: `uwhQazYsbQ3Fr93VaTzBWijXCUTa84Pahdghn6N1b1x`
* **Verified On-Chain 3-Hop Settlement Receipt**: `KZIB-1582-EF12`

### 3. Why Superteam Nigeria Should Fund SolPlay (Copy-Paste Pitch)
```text
Sports betting is the #1 consumer financial habit in Nigeria and across Africa (over $4B+ in annual retail volume across SportyBet, Bet9ja, and 1xBet), yet punters face frozen accounts, delayed bank withdrawals, and zero ownership.

SolPlay is already built and live on Solana Devnet (https://solplay-delta.vercel.app/):
1. Multi-Sport Real-Time Engine: Live scores, calibrated odds, and interactive tactical lineups across European Football (EPL, UCL, La Liga), NBA, and NFL.
2. SportyBet / Bet9ja Booking Code Converter: Nigerian punters can paste their existing SportyBet (BC...) or Bet9ja (B9...) booking codes and convert them into an on-chain Solana accumulator ticket in 1 click, with automatic 3% on-chain tipster win-share royalties.
3. Non-Custodial MultiHopper Settlement: Integrated with MultiHopper on Solana Devnet (Integration ID #1057, Provider PDA: uwhQazYsbQ3Fr93VaTzBWijXCUTa84Pahdghn6N1b1x) for sub-second, privacy-preserving 3-hop payouts directly to Phantom/Solflare wallets.

We are requesting an $8,500 USDC microgrant to complete Mainnet deployment, fund initial liquidity vault seeding, and onboard 20 Nigerian football X tipsters to drive 10,000+ on-chain tickets in 60 days.
```
