# Solana Development: Local Sandbox Developer Guide

This sandbox contains a fully compiled on-chain Solana program written in Rust and an accompanying Python client to interact with it. Because you have Rust and the Solana CLI pre-installed, you can build and test smart contracts entirely for **free** on a local testnet validator.

---

## Step 1: Install the Complete Solana SDK Toolchain
Although you have `solana-cli` installed via Homebrew, Homebrew's distribution does not contain the compiler extensions (`cargo-build-sbf`) required to compile SBF bytecode.

To install the complete, official Solana SDK suite:
1. Open your terminal and run:
   ```bash
   sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
   ```
2. Once installed, restart your terminal or load the environment:
   ```bash
   export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
   ```
3. Verify the installation shows `cargo-build-sbf`:
   ```bash
   cargo build-sbf --version
   ```

---

## Step 2: Set Up Your Local Solana Cluster Configuration
By default, the Solana CLI may be configured to talk to Mainnet or Devnet. We want to point it to your local machine:

1. Configure CLI for localhost:
   ```bash
   solana config set --url localhost
   ```
2. Generate a default local developer keypair (if you don't already have one):
   ```bash
   solana-keygen new --no-bip39-passphrase --force
   ```
3. Check your local wallet address and config:
   ```bash
   solana address
   solana config get
   ```

---

## Step 3: Run the Local Test Validator
Solana allows you to run a full copy of the blockchain directly on your MacBook. This gives you unlimited free SOL airdrops and instant transaction speeds.

1. In a separate terminal tab/window, start the validator:
   ```bash
   solana-test-validator
   ```
   *Keep this process running in the background while you test.*

2. In your primary terminal tab, check that the validator is active:
   ```bash
   solana ping
   ```

---

## Step 4: Compile the Smart Contract (Rust Program)
1. Navigate to the sandbox directory:
   ```bash
   cd /Users/macbook/.gemini/antigravity-ide/scratch/solana_sandbox
   ```
2. Compile the smart contract to Solana SBF binary:
   ```bash
   cargo build-sbf
   ```
   *This generates a compiled binary at `target/deploy/solana_counter.so`.*

---

## Step 5: Deploy Your Smart Contract
1. Deploy the program to your local test validator:
   ```bash
   solana program deploy target/deploy/solana_counter.so
   ```
2. The terminal will output your **Program ID** (a base58 public key). Copy this Program ID!

---

## Step 6: Install Client Dependencies and Run the Script
1. Navigate to the sandbox directory and set up a clean Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
2. Install the necessary Python Solana SDK and Borsh parsing libraries:
   ```bash
   pip install solana solders borsh-construct
   ```
3. Run the interactive client:
   ```bash
   python client.py
   ```
4. When prompted, paste your **Program ID** (copied in Step 5).
5. Watch the script:
   * Create a new counter account on-chain.
   * Send a signed transaction executing your program.
   * Fetch and deserialize the counter state showing `Counter value: 1`!
   * Run the script again to increment it to `2`, `3`, etc.
