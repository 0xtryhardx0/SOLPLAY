import sys
import os
import json
import time
import struct

try:
    from solders.keypair import Keypair
    from solders.pubkey import Pubkey
    from solders.system_program import CreateAccountParams, create_account
    from solders.instruction import Instruction, AccountMeta
    from solana.rpc.api import Client
    from solders.transaction import Transaction
    from solana.rpc.types import TxOpts
except ImportError:
    print("[!] Python Solana dependencies missing. Please install: pip3 install solana solders")
    sys.exit(1)

RPC_URL = "http://127.0.0.1:8899"

def get_or_create_keypair(name):
    path = f"{name}.json"
    if os.path.exists(path):
        with open(path, "r") as f:
            secret = json.load(f)
            return Keypair.from_bytes(bytes(secret))
    else:
        keypair = Keypair()
        with open(path, "w") as f:
            json.dump(list(bytes(keypair)), f)
        print(f"Generated keypair for {name} saved at: {path}")
        return keypair

def create_program_account(client, payer, account_keypair, space, program_id):
    # Check if exists
    info = client.get_account_info(account_keypair.pubkey())
    if info.value is not None:
        return
    
    rent_resp = client.get_minimum_balance_for_rent_exemption(space)
    rent_lamports = rent_resp.value
    
    create_ix = create_account(
        CreateAccountParams(
            from_pubkey=payer.pubkey(),
            to_pubkey=account_keypair.pubkey(),
            lamports=rent_lamports,
            space=space,
            owner=program_id
        )
    )
    blockhash = client.get_latest_blockhash().value.blockhash
    tx = Transaction.new_signed_with_payer([create_ix], payer.pubkey(), [payer, account_keypair], blockhash)
    resp = client.send_transaction(tx, opts=TxOpts(skip_preflight=False))
    client.confirm_transaction(resp.value)
    print(f"Created account: {account_keypair.pubkey()} (Size: {space} bytes)")
    time.sleep(1)

def airdrop_sol(client, pubkey, amount_sol=10):
    print(f"Airdropping {amount_sol} SOL to {pubkey}...")
    resp = client.request_airdrop(pubkey, int(amount_sol * 1_000_000_000))
    client.confirm_transaction(resp.value)
    balance = client.get_balance(pubkey).value / 1_000_000_000
    print(f"Balance: {balance} SOL")

def main():
    client = Client(RPC_URL)
    if not client.is_connected():
        print("[!] Local validator not running. Start with: solana-test-validator")
        sys.exit(1)
    print("Solana Validator Connection: Connected")

    if len(sys.argv) > 1:
        program_id_str = sys.argv[1].strip()
    else:
        program_id_str = input("Enter Deployed Program ID: ").strip()
    if not program_id_str:
        print("[!] Program ID required.")
        sys.exit(1)
    program_id = Pubkey.from_string(program_id_str)

    # 1. Setup Wallets
    payer = get_or_create_keypair("dev_wallet")
    treasury = get_or_create_keypair("treasury")
    bettor_a = get_or_create_keypair("bettor_a")
    bettor_b = get_or_create_keypair("bettor_b")
    punter_creator = get_or_create_keypair("punter_creator")

    # Airdrops
    airdrop_sol(client, payer.pubkey(), 5)
    airdrop_sol(client, bettor_a.pubkey(), 2)
    airdrop_sol(client, bettor_b.pubkey(), 2)

    # 2. Setup Accounts
    platform_state_kp = get_or_create_keypair("platform_state")
    create_program_account(client, payer, platform_state_kp, 32 + 32 + 2, program_id)

    # Initialize Platform
    # Instruction 0 + Rake 150 (1.5%)
    init_data = struct.pack("<B H", 0, 150)
    init_ix = Instruction(
        program_id=program_id,
        accounts=[
            AccountMeta(pubkey=payer.pubkey(), is_signer=True, is_writable=False),
            AccountMeta(pubkey=platform_state_kp.pubkey(), is_signer=False, is_writable=True),
            AccountMeta(pubkey=treasury.pubkey(), is_signer=False, is_writable=False),
        ],
        data=init_data
    )
    blockhash = client.get_latest_blockhash().value.blockhash
    tx = Transaction.new_signed_with_payer([init_ix], payer.pubkey(), [payer], blockhash)
    resp = client.send_transaction(tx, opts=TxOpts(skip_preflight=False))
    client.confirm_transaction(resp.value)
    print("[Success] Platform Initialized.")
    time.sleep(1)

    # 3. Create Market for Game
    game_id = 999
    market_kp = get_or_create_keypair("market_999")
    # space: game_id(8) + home(16) + away(16) + status(1) + pools(8*3) + outcome(1) = 66 bytes
    create_program_account(client, payer, market_kp, 66, program_id)

    team_home = b"Arsenal".ljust(16, b"\x00")
    team_away = b"Chelsea".ljust(16, b"\x00")
    create_data = struct.pack("<B Q 16s 16s", 1, game_id, team_home, team_away)
    create_ix = Instruction(
        program_id=program_id,
        accounts=[
            AccountMeta(pubkey=payer.pubkey(), is_signer=True, is_writable=False),
            AccountMeta(pubkey=market_kp.pubkey(), is_signer=False, is_writable=True),
            AccountMeta(pubkey=platform_state_kp.pubkey(), is_signer=False, is_writable=False),
        ],
        data=create_data
    )
    blockhash = client.get_latest_blockhash().value.blockhash
    tx = Transaction.new_signed_with_payer([create_ix], payer.pubkey(), [payer], blockhash)
    resp = client.send_transaction(tx, opts=TxOpts(skip_preflight=False))
    client.confirm_transaction(resp.value)
    print(f"[Success] Market created for game {game_id}.")
    time.sleep(1)

    # 4. Place Wager Bettor A (Prediction: 0 = Arsenal, Amount: 1 SOL)
    # space: game_id(8) + bettor(32) + pred(1) + amount(8) + routed(1) + copy(32) + claimed(1) = 83 bytes
    wager_a_kp = get_or_create_keypair("wager_a")
    create_program_account(client, payer, wager_a_kp, 83, program_id)

    # Place bet (un-copied bet, copy_creator = zero bytes)
    zero_pubkey = bytes([0] * 32)
    place_data_a = struct.pack("<B Q B Q B 32s", 2, game_id, 0, int(1_000_000_000), 0, zero_pubkey)
    place_ix_a = Instruction(
        program_id=program_id,
        accounts=[
            AccountMeta(pubkey=bettor_a.pubkey(), is_signer=True, is_writable=False),
            AccountMeta(pubkey=market_kp.pubkey(), is_signer=False, is_writable=True),
            AccountMeta(pubkey=wager_a_kp.pubkey(), is_signer=False, is_writable=True),
            AccountMeta(pubkey=Pubkey.from_string("11111111111111111111111111111111"), is_signer=False, is_writable=False), # system program
        ],
        data=place_data_a
    )
    blockhash = client.get_latest_blockhash().value.blockhash
    tx = Transaction.new_signed_with_payer([place_ix_a], bettor_a.pubkey(), [bettor_a], blockhash)
    resp = client.send_transaction(tx, opts=TxOpts(skip_preflight=False))
    client.confirm_transaction(resp.value)
    print("[Success] Bettor A placed 1 SOL on Arsenal.")
    time.sleep(1)

    # 5. Place Wager Bettor B (Prediction: 0 = Arsenal, Amount: 0.5 SOL)
    # Copied from punter_creator (copy_creator = punter_creator pubkey bytes)
    wager_b_kp = get_or_create_keypair("wager_b")
    create_program_account(client, payer, wager_b_kp, 83, program_id)

    creator_bytes = bytes(punter_creator.pubkey())
    place_data_b = struct.pack("<B Q B Q B 32s", 2, game_id, 0, int(500_000_000), 0, creator_bytes)
    place_ix_b = Instruction(
        program_id=program_id,
        accounts=[
            AccountMeta(pubkey=bettor_b.pubkey(), is_signer=True, is_writable=False),
            AccountMeta(pubkey=market_kp.pubkey(), is_signer=False, is_writable=True),
            AccountMeta(pubkey=wager_b_kp.pubkey(), is_signer=False, is_writable=True),
            AccountMeta(pubkey=Pubkey.from_string("11111111111111111111111111111111"), is_signer=False, is_writable=False),
        ],
        data=place_data_b
    )
    blockhash = client.get_latest_blockhash().value.blockhash
    tx = Transaction.new_signed_with_payer([place_ix_b], bettor_b.pubkey(), [bettor_b], blockhash)
    resp = client.send_transaction(tx, opts=TxOpts(skip_preflight=False))
    client.confirm_transaction(resp.value)
    print("[Success] Bettor B placed 0.5 SOL on Arsenal (Copied from Punter Creator).")
    time.sleep(1)

    # 6. Resolve Market (Outcome: 0 = Arsenal wins)
    resolve_data = struct.pack("<B Q B", 3, game_id, 0)
    resolve_ix = Instruction(
        program_id=program_id,
        accounts=[
            AccountMeta(pubkey=payer.pubkey(), is_signer=True, is_writable=False),
            AccountMeta(pubkey=market_kp.pubkey(), is_signer=False, is_writable=True),
            AccountMeta(pubkey=platform_state_kp.pubkey(), is_signer=False, is_writable=False),
        ],
        data=resolve_data
    )
    blockhash = client.get_latest_blockhash().value.blockhash
    tx = Transaction.new_signed_with_payer([resolve_ix], payer.pubkey(), [payer], blockhash)
    resp = client.send_transaction(tx, opts=TxOpts(skip_preflight=False))
    client.confirm_transaction(resp.value)
    print("[Success] Market resolved: Arsenal Wins!")
    time.sleep(1)

    # 7. Claim Winnings for Bettor B (Verifying rake & 2% copy commission)
    initial_creator_bal = client.get_balance(punter_creator.pubkey()).value / 1_000_000_000
    
    claim_data_b = struct.pack("<B Q", 4, game_id)
    claim_ix_b = Instruction(
        program_id=program_id,
        accounts=[
            AccountMeta(pubkey=bettor_b.pubkey(), is_signer=True, is_writable=False),
            AccountMeta(pubkey=market_kp.pubkey(), is_signer=False, is_writable=True),
            AccountMeta(pubkey=wager_b_kp.pubkey(), is_signer=False, is_writable=True),
            AccountMeta(pubkey=platform_state_kp.pubkey(), is_signer=False, is_writable=False),
            AccountMeta(pubkey=treasury.pubkey(), is_signer=False, is_writable=True),
            AccountMeta(pubkey=punter_creator.pubkey(), is_signer=False, is_writable=True),
        ],
        data=claim_data_b
    )
    blockhash = client.get_latest_blockhash().value.blockhash
    tx = Transaction.new_signed_with_payer([claim_ix_b], bettor_b.pubkey(), [bettor_b], blockhash)
    resp = client.send_transaction(tx, opts=TxOpts(skip_preflight=False))
    client.confirm_transaction(resp.value)
    print("[Success] Bettor B claimed winnings.")
    time.sleep(1)

    # Verify payout
    new_creator_bal = client.get_balance(punter_creator.pubkey()).value / 1_000_000_000
    print(f"Punter Creator commission earned: {new_creator_bal - initial_creator_bal:.6f} SOL!")
    
    treasury_bal = client.get_balance(treasury.pubkey()).value / 1_000_000_000
    print(f"Treasury Platform Rake balance: {treasury_bal:.6f} SOL")

    # 8. Record Viewer Milestone
    milestone_kp = get_or_create_keypair("milestone_1")
    # space: id(8) + bettor(32) + seconds(4) = 44 bytes
    create_program_account(client, payer, milestone_kp, 44, program_id)

    milestone_data = struct.pack("<B Q I", 5, 888, 600) # milestone 888, watched 600s
    milestone_ix = Instruction(
        program_id=program_id,
        accounts=[
            AccountMeta(pubkey=bettor_a.pubkey(), is_signer=True, is_writable=False),
            AccountMeta(pubkey=milestone_kp.pubkey(), is_signer=False, is_writable=True),
        ],
        data=milestone_data
    )
    blockhash = client.get_latest_blockhash().value.blockhash
    tx = Transaction.new_signed_with_payer([milestone_ix], bettor_a.pubkey(), [bettor_a], blockhash)
    resp = client.send_transaction(tx, opts=TxOpts(skip_preflight=False))
    client.confirm_transaction(resp.value)
    print("[Success] Recorded watch time milestone: 600 seconds.")

if __name__ == "__main__":
    main()
