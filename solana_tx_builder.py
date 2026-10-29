import base64
import struct
from typing import Optional

# Base58 alphabet for Solana public key decoding
B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

def b58_decode(s: str) -> bytes:
    """Decodes a base58 Solana public key into 32 raw bytes."""
    num = 0
    for char in s:
        idx = B58_ALPHABET.find(char)
        if idx == -1:
            raise ValueError(f"Invalid Base58 character: {char}")
        num = num * 58 + idx
    
    # Convert integer to bytes
    res = []
    while num > 0:
        res.append(num & 0xFF)
        num >>= 8
    res = bytes(reversed(res))

    # Pad leading zero bytes
    pad_len = 0
    for char in s:
        if char == B58_ALPHABET[0]:
            pad_len += 1
        else:
            break
    raw_bytes = (b'\x00' * pad_len) + res
    if len(raw_bytes) > 32:
        raw_bytes = raw_bytes[-32:]
    elif len(raw_bytes) < 32:
        raw_bytes = raw_bytes.rjust(32, b'\x00')
    return raw_bytes

def encode_compact_u16(val: int) -> bytes:
    """Encodes an integer into Solana compact-u16 format."""
    res = bytearray()
    rem = val
    while True:
        elem = rem & 0x7F
        rem >>= 7
        if rem == 0:
            res.append(elem)
            break
        else:
            elem |= 0x80
            res.append(elem)
    return bytes(res)

class SolanaTransactionBuilder:
    """
    Constructs authentic, serialized Solana wire transactions conforming
    to the official Solana Action / Blink standard.
    Returns base64-encoded payload ready for wallet signing (Phantom, Backpack, Solflare).
    """
    SYSTEM_PROGRAM_PUBKEY = b'\x00' * 32  # 11111111111111111111111111111111

    @classmethod
    def build_sol_transfer_tx(
        cls,
        sender_pubkey_str: str,
        recipient_pubkey_str: str,
        lamports: int,
        recent_blockhash_bytes: Optional[bytes] = None
    ) -> str:
        """
        Creates an unsigned Versioned / Legacy transaction containing a
        SystemProgram::Transfer instruction.
        """
        sender_bytes = b58_decode(sender_pubkey_str)
        recipient_bytes = b58_decode(recipient_pubkey_str)
        blockhash = recent_blockhash_bytes or (b'\x05' * 32) # Default deterministic blockhash

        # 1. Accounts list: [Sender (signer, writable), Recipient (writable), System Program]
        accounts = [sender_bytes, recipient_bytes, cls.SYSTEM_PROGRAM_PUBKEY]

        # 2. Header
        num_required_signatures = 1
        num_readonly_signed_accounts = 0
        num_readonly_unsigned_accounts = 1
        header = struct.pack("BBB", num_required_signatures, num_readonly_signed_accounts, num_readonly_unsigned_accounts)

        # 3. Account addresses buffer
        accounts_buf = encode_compact_u16(len(accounts)) + b"".join(accounts)

        # 4. Instruction Data for SystemProgram::Transfer
        # Transfer instruction enum index = 2 (u32 LE), followed by lamports (u64 LE)
        ix_data = struct.pack("<IQ", 2, lamports)

        # 5. Compiled Instruction:
        # program_id_index = 2 (System Program)
        # account_indices = [0, 1] (sender, recipient)
        ix_buf = (
            struct.pack("B", 2) +
            encode_compact_u16(2) + bytes([0, 1]) +
            encode_compact_u16(len(ix_data)) + ix_data
        )

        # 6. Instructions buffer
        instructions_buf = encode_compact_u16(1) + ix_buf

        # 7. Complete Message
        message = header + accounts_buf + blockhash + instructions_buf

        # 8. Unsigned transaction: 1 empty 64-byte signature slot for the user's wallet to fill
        signatures_buf = encode_compact_u16(1) + (b'\x00' * 64)
        tx_bytes = signatures_buf + message

        return base64.b64encode(tx_bytes).decode("utf-8")
