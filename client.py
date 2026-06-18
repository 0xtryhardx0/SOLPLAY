import sys
import os
import json

# Try to import Solana dependencies
try:
    from solders.keypair import Keypair
    from solders.pubkey import Pubkey
    from solders.system_program import CreateAccountParams, create_account
    from solders.instruction import Instruction, AccountMeta
    from solana.rpc.api import Client
    from solders.transaction import Transaction
    from solana.rpc.types import TxOpts
    import borsh_construct as borsh
except ImportError as e:
    print(f"Import Error: {e}")
    print("\n" + "="*80)
    print(" [!] Python Solana dependencies are missing.")
    print(" Please install them using the following command:")
    print("     pip3 install solana solders borsh-construct")
    print("="*80 + "\n")
    sys.exit(1)

# 1. Define the counter schema matching the Rust program's struct
# struct CounterAccount { count: u64 }
counter_schema = borsh.CStruct(
    "count" / borsh.U64
)

# 2. Keypair helper paths
DEV_WALLET_PATH = "dev_wallet.json"
COUNTER_ACCOUNT_PATH = "counter_account.json"

def get_or_create_keypair(path):
    if os.path.exists(path):
        with open(path, "r") as f:
            secret = json.load(f)
            return Keypair.from_bytes(bytes(secret))
    else:
        keypair = Keypair()
        with open(path, "w") as f:
            json.dump(list(keypair.to_bytes_array()), f)
        print(f"Generated new keypair saved at: {path}")
        return keypair

def main():
    print("--- Connecting to Local Solana Test Validator ---")
    # Solana local validator RPC endpoint
    rpc_url = "http://127.0.0.1:8899"
    client = Client(rpc_url)

    # Verify connection
    try:
        health = client.get_health()
        print(f"Solana RPC Health: {health.value}")
    except Exception as e:
        print(f"\n[!] Error connecting to validator at {rpc_url}.")
        print("    Please ensure your local validator is running:")
        print("    Run: solana-test-validator\n")
        sys.exit(1)

    # 3. Load wallets and program ID
    payer = get_or_create_keypair(DEV_WALLET_PATH)
    counter = get_or_create_keypair(COUNTER_ACCOUNT_PATH)
    
    print(f"Payer (Developer Wallet): {payer.pubkey()}")
    print(f"Counter Account Pubkey:   {counter.pubkey()}")

    # Enter your deployed program ID here
    # Defaulting to a placeholder for local demonstration
    program_id_str = input("\nEnter your deployed Program ID (e.g. from 'solana program deploy'): ").strip()
    if not program_id_str:
        print("[!] Program ID is required to run instructions. Exiting.")
        sys.exit(1)
        
    try:
        program_id = Pubkey.from_string(program_id_str)
    except Exception:
        print("[!] Invalid Program ID format.")
        sys.exit(1)

    # Check Payer Balance
    balance_resp = client.get_balance(payer.pubkey())
    balance = balance_resp.value / 1_000_000_000 # convert to SOL
    print(f"Payer Balance: {balance:.4f} SOL")

    if balance < 0.1:
        print(f"\n[!] Balance is low. Airdropping 1 SOL to {payer.pubkey()}...")
        try:
            client.request_airdrop(payer.pubkey(), 1_000_000_000)
            # Wait for confirmation
            import time
            time.sleep(2)
            balance = client.get_balance(payer.pubkey()).value / 1_000_000_000
            print(f"New Balance: {balance:.4f} SOL")
        except Exception as err:
            print(f"Airdrop failed: {err}. Please run: solana airdrop 1 {payer.pubkey()}")

    # 4. Check if the counter account already exists on-chain
    info_resp = client.get_account_info(counter.pubkey())
    account_exists = info_resp.value is not None

    tx = Transaction()

    if not account_exists:
        print("\nCreating new counter account on-chain...")
        # Space required is 8 bytes for count (u64)
        space = 8
        # Query minimum balance for rent exemption
        rent_resp = client.get_minimum_balance_for_rent_exemption(space)
        rent_lamports = rent_resp.value
        print(f"Rent exemption lamports required: {rent_lamports}")

        # Create account instruction
        create_ix = create_account(
            CreateAccountParams(
                from_pubkey=payer.pubkey(),
                to_pubkey=counter.pubkey(),
                lamports=rent_lamports,
                space=space,
                owner=program_id
            )
        )
        tx.add(create_ix)
    else:
        print("\nCounter account already exists on-chain.")

    # 5. Build instruction to call our on-chain program to increment the counter
    increment_ix = Instruction(
        program_id=program_id,
        accounts=[
            AccountMeta(pubkey=counter.pubkey(), is_signer=False, is_writable=True)
        ],
        data=bytes([0]) # Data payload (optional for this program)
    )
    tx.add(increment_ix)

    # 6. Sign and Send transaction
    print("Sending transaction...")
    signers = [payer] if account_exists else [payer, counter]
    try:
        tx_resp = client.send_transaction(tx, *signers, opts=TxOpts(skip_preflight=False))
        print(f"Transaction Signature: {tx_resp.value}")
        
        # Wait for confirmation
        print("Waiting for transaction confirmation...")
        import time
        time.sleep(3)
    except Exception as tx_err:
        print(f"[!] Transaction failed: {tx_err}")
        sys.exit(1)

    # 7. Fetch and deserialize account data
    print("\nFetching updated account data...")
    updated_info = client.get_account_info(counter.pubkey())
    if updated_info.value:
        data_bytes = updated_info.value.data
        try:
            # Parse Borsh structure
            parsed = counter_schema.parse(data_bytes)
            print(f"{'='*40}")
            print(f" SUCCESS! Counter value: {parsed.count}")
            print(f"{'='*40}")
        except Exception as parse_err:
            print(f"Error parsing account data: {parse_err}")
    else:
        print("Account could not be retrieved.")

if __name__ == "__main__":
    main()
