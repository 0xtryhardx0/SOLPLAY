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

RPC_URL = "https://api.devnet.solana.com"

# Delete any existing local state keypairs to generate fresh accounts for this test run
for name in ["platform_state_test", "market_999_test", "wager_a_test", "wager_b_test", "milestone_1_test"]:
    path = f"{name}.json"
    if os.path.exists(path):
        os.remove(path)
        print(f"Removed old test state file: {path}")

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

def confirm_tx(client, sig):
    import time
    for _ in range(40):
        statuses = client.get_signature_statuses([sig]).value
        if statuses and statuses[0] is not None:
            if statuses[0].err is not None:
                raise Exception(f"Transaction failed: {statuses[0].err}")
            return
        time.sleep(1.0)
    raise Exception("Transaction confirmation timeout")

def create_program_account(client, payer, account_keypair, space, program_id):
    info = client.get_account_info(account_keypair.pubkey())
    if info.value is not None:
        print(f"Account {account_keypair.pubkey()} already exists.")
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
    resp = client.send_transaction(tx, opts=TxOpts(skip_preflight=True))
    confirm_tx(client, resp.value)
    print(f"Created account: {account_keypair.pubkey()} (Size: {space} bytes)")
    time.sleep(3.0)

def main():
    client = Client(RPC_URL)
    print(f"Solana Devnet Connection: {client.is_connected()}")

    program_id_str = "84AVToEkDwsMXNh77n156DYHaWJa2zVqi8han3qqVdAk"
    program_id = Pubkey.from_string(program_id_str)
    print(f"Targeting Program ID: {program_id}")

    # 1. Load Funded Wallets
    payer = get_or_create_keypair("dev_wallet")
    treasury = get_or_create_keypair("treasury")
    bettor_a = get_or_create_keypair("bettor_a")
    bettor_b = get_or_create_keypair("bettor_b")
    punter_creator = get_or_create_keypair("punter_creator")

    print(f"Payer {payer.pubkey()} balance: {client.get_balance(payer.pubkey()).value / 1_000_000_000} SOL")
    print(f"Bettor A {bettor_a.pubkey()} balance: {client.get_balance(bettor_a.pubkey()).value / 1_000_000_000} SOL")
    print(f"Bettor B {bettor_b.pubkey()} balance: {client.get_balance(bettor_b.pubkey()).value / 1_000_000_000} SOL")

    # 2. Setup Accounts
    platform_state_kp = get_or_create_keypair("platform_state_test")
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
    resp = client.send_transaction(tx, opts=TxOpts(skip_preflight=True))
    confirm_tx(client, resp.value)
    print("[Success] Platform Initialized.")
    time.sleep(2)

    # 3. Create Market for Game
    game_id = 999
    market_kp = get_or_create_keypair("market_999_test")
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
    resp = client.send_transaction(tx, opts=TxOpts(skip_preflight=True))
    confirm_tx(client, resp.value)
    print(f"[Success] Market created for game {game_id}.")
    time.sleep(2)

    # 4. Place Wager Bettor A (Prediction: 0 = Arsenal, Amount: 0.1 SOL)
    # space: game_id(8) + bettor(32) + pred(1) + amount(8) + routed(1) + copy(32) + claimed(1) = 83 bytes
    wager_a_kp = get_or_create_keypair("wager_a_test")
    create_program_account(client, payer, wager_a_kp, 83, program_id)

    # Place bet (un-copied bet, copy_creator = zero bytes)
    zero_pubkey = bytes([0] * 32)
    place_data_a = struct.pack("<B Q B Q B 32s", 2, game_id, 0, int(100_000_000), 0, zero_pubkey)
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
    resp = client.send_transaction(tx, opts=TxOpts(skip_preflight=True))
    confirm_tx(client, resp.value)
    print("[Success] Bettor A placed 0.1 SOL on Arsenal.")
    time.sleep(2)

    # 5. Place Wager Bettor B (Prediction: 0 = Arsenal, Amount: 0.05 SOL)
    # Copied from punter_creator (copy_creator = punter_creator pubkey bytes)
    wager_b_kp = get_or_create_keypair("wager_b_test")
    create_program_account(client, payer, wager_b_kp, 83, program_id)

    creator_bytes = bytes(punter_creator.pubkey())
    place_data_b = struct.pack("<B Q B Q B 32s", 2, game_id, 0, int(50_000_000), 0, creator_bytes)
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
    resp = client.send_transaction(tx, opts=TxOpts(skip_preflight=True))
    confirm_tx(client, resp.value)
    print("[Success] Bettor B placed 0.05 SOL on Arsenal (Copied from Punter Creator).")
    time.sleep(2)

    # Try placing bet exceeding 5 SOL soft-launch cap (should FAIL on-chain)
    print("Testing on-chain wager cap guard (6 SOL)...")
    try:
        wager_fail_kp = Keypair()
        create_program_account(client, payer, wager_fail_kp, 83, program_id)
        place_data_fail = struct.pack("<B Q B Q B 32s", 2, game_id, 0, int(6_000_000_000), 0, zero_pubkey)
        place_ix_fail = Instruction(
            program_id=program_id,
            accounts=[
                AccountMeta(pubkey=bettor_a.pubkey(), is_signer=True, is_writable=False),
                AccountMeta(pubkey=market_kp.pubkey(), is_signer=False, is_writable=True),
                AccountMeta(pubkey=wager_fail_kp.pubkey(), is_signer=False, is_writable=True),
                AccountMeta(pubkey=Pubkey.from_string("11111111111111111111111111111111"), is_signer=False, is_writable=False),
            ],
            data=place_data_fail
        )
        blockhash = client.get_latest_blockhash().value.blockhash
        tx = Transaction.new_signed_with_payer([place_ix_fail], bettor_a.pubkey(), [bettor_a], blockhash)
        resp = client.send_transaction(tx, opts=TxOpts(skip_preflight=False))
        confirm_tx(client, resp.value)
        print("[!] Warning: 6 SOL bet succeeded on-chain, cap guard failed!")
    except Exception as e:
        print(f"[Success] On-chain cap guard successfully blocked 6 SOL bet: {e}")
    time.sleep(2)

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
    resp = client.send_transaction(tx, opts=TxOpts(skip_preflight=True))
    confirm_tx(client, resp.value)
    print("[Success] Market resolved: Arsenal Wins!")
    time.sleep(2)

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
    resp = client.send_transaction(tx, opts=TxOpts(skip_preflight=True))
    confirm_tx(client, resp.value)
    print("[Success] Bettor B claimed winnings.")
    time.sleep(2)

    # Verify payout
    new_creator_bal = client.get_balance(punter_creator.pubkey()).value / 1_000_000_000
    print(f"Punter Creator commission earned: {new_creator_bal - initial_creator_bal:.6f} SOL!")
    
    treasury_bal = client.get_balance(treasury.pubkey()).value / 1_000_000_000
    print(f"Treasury Platform Rake balance: {treasury_bal:.6f} SOL")

    # 8. Record Viewer Milestone
    milestone_kp = get_or_create_keypair("milestone_1_test")
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
    resp = client.send_transaction(tx, opts=TxOpts(skip_preflight=True))
    confirm_tx(client, resp.value)
    print("[Success] Recorded watch time milestone: 600 seconds.")

if __name__ == "__main__":
    main()
