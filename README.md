# ⚡ SolPlay Protocol: Decentralized Social Sportsbook on Solana

> **Sub-second sports wagering, embedded HLS video streams, 1-click chat bet cloning, and dynamic on-chain liquidity pools powered by native Solana SBF Rust.**

[![Solana](https://img.shields.io/badge/Network-Solana%20Mainnet%20%26%20Devnet-14F195?style=for-the-badge&logo=solana)](https://solana.com)
[![Rust](https://img.shields.io/badge/Language-Rust%20(Native%20SBF)-DEA584?style=for-the-badge&logo=rust)](https://www.rust-lang.org/)
[![License](https://img.shields.io/badge/License-MIT-9945FF?style=for-the-badge)](LICENSE)
[![Grant Application](https://img.shields.io/badge/Solana%20Foundation-Grant%20$15K-FF8A00?style=for-the-badge)](docs/solana_grant_proposal.md)

---

## 🌟 The Vision

Traditional sportsbooks lock winning player accounts, delay withdrawals, and operate behind opaque closed doors. Existing Web3 betting platforms are sluggish, text-only, and lack engagement.

**SolPlay Protocol** merges the excitement of live sports streaming with the speed and transparency of Solana:
1. **Sub-Second Non-Custodial Wagering**: Wagers are locked into on-chain Program Derived Addresses (PDAs) with 400ms finality. Winnings are claimed directly from smart contracts with zero middleman approvals.
2. **1-Click Social Bet Cloning**: Punters share active tickets directly in live community chat feeds. Other users can copy any betslip in 1-click. Originators automatically receive a **2.0% creator royalty** on winning copies directly on-chain.
3. **Be The House (LP Liquidity Vault)**: Community members deposit SOL into the Liquidity Pool to back fixed-odds markets and earn parimutuel platform yield.
4. **Automated Oracle Daemon & House Protection**: Real-time sports API feeds trigger automated market freezes during penalty kicks/VAR checks and strict 75-minute in-play cutoffs to prevent courtsiding (latency front-running).

---

## 🛠️ On-Chain Architecture & State Machine

```
solana_sandbox/
├── src/
│   └── lib.rs              # Native Solana SBF Rust Program (938 LOC, 11 Instructions)
├── index.html              # Modern Cyber-Sportsbook Frontend (HLS Streams + Chat)
├── app.js                  # Solana Web3.js client & Phantom/Solflare wallet adapter
├── admin.html / admin.js   # Protocol administrative dashboard & market creator
├── oracle_service.py       # Autonomous Python oracle daemon syncing API-Football
├── test_protocol.py        # Automated end-to-end local test suite
├── test_protocol_devnet.py # Live Solana Devnet settlement test suite
└── docs/
    ├── solana_grant_proposal.md   # Solana Foundation $15,000 USD Grant Proposal
    └── grant_submission_draft.md  # Accelerator & grant copy-paste responses
```

---

## 📜 On-Chain Instruction Specifications

The native Rust smart contract ([`src/lib.rs`](src/lib.rs)) defines 11 core instructions:

| Tag | Instruction | Description |
| :---: | :--- | :--- |
| `0` | **`InitializePlatformState`** | Deploys protocol configuration, administrative authority, treasury PDA, and rake bps. |
| `1` | **`CreateMarket`** | Initializes a match betting market for Home, Away, and Draw outcomes. |
| `2` | **`PlaceWager`** | Transfers SOL into the market escrow and generates a unique wager PDA with copy-creator tracking. |
| `3` | **`ResolveMarket`** | Oracle / admin instruction locking the final game outcome. |
| `4` | **`ClaimPayout`** | Parimutuel or fixed-odds distribution: deducts platform rake, transfers **2% copy royalty** to tipster, and credits net winnings to bettor. |
| `5` | **`RefundMarket`** | Post-match refund mechanism in case of match cancellation or postponement. |
| `6` | **`LogMilestone`** | Records viewer watch-time milestones on-chain. |
| `7` | **`RegisterStream`** | Adds verified HLS streaming mirror metadata to on-chain registry. |
| `8` | **`ToggleStreamStatus`** | Activates or deactivates live stream broadcast status. |
| `9` | **`DepositLp`** | Deposits SOL into the protocol liquidity vault and mints pro-rata LP tokens. |
| `10` | **`WithdrawLp`** | Burns LP tokens and returns SOL against unreserved (unlocked) pool liquidity. |

---

## 📊 Economics & Fee Structure

```
                  ┌───────────────────────┐
                  │ Total Wager Pool / LP │
                  └───────────┬───────────┘
                              │
                    On-Chain Resolution
                              │
       ┌──────────────────────┼──────────────────────┐
       ▼                      ▼                      ▼
  Platform Rake         Copy Tipster            Winning Bettor
    (1.5% - 3.5%)        (2.0% Royalty)           (Net Payout)
       │                      │                      │
       ▼                      ▼                      ▼
Treasury Account       Tipster Wallet          Bettor Wallet
```

---

## 🚀 Quick Start & Local Testing

### Prerequisites
* Rust 1.75+ and Solana CLI toolchain
* Python 3.9+ with `solana`, `solders`, and `borsh-construct`

### 1. Compile Smart Contract
```bash
cargo build-sbf
```
Compiled bytecode outputs to: `target/deploy/solana_counter.so`.

### 2. Run Local Validator
```bash
solana-test-validator
```

### 3. Run Protocol Verification Suite
```bash
python3 test_protocol.py
```
Validates complete lifecycle:
1. `InitializePlatformState`
2. `DepositLp` (Liquidity Pool setup)
3. `CreateMarket` (Real Madrid vs Bayern Munich)
4. `PlaceWager` (Alice wagers 1.0 SOL, Bob copies Alice with 2.0 SOL)
5. `ResolveMarket` (Home Win)
6. `ClaimPayout` (Verifies Alice receives 2% copy royalty from Bob's winning clone)

---

## ☀️ Solana Foundation Grant

* **Track**: Consumer Applications / High-Volume Protocols
* **Requested**: **$15,000 USD** (3 milestone tranches)
* **Full Proposal**: [docs/solana_grant_proposal.md](docs/solana_grant_proposal.md)

---

## 📄 License
MIT License © 2026 Erioluwa Ayodeji & SolPlay Contributors.
