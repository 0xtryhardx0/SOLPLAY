#!/usr/bin/env python3
import json
import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, parse_qs

BASE_DIR = Path(__file__).parent.resolve()

try:
    from solana_tx_builder import SolanaTransactionBuilder
except ImportError:
    SolanaTransactionBuilder = None

PORT = 8080
DEFAULT_TREASURY = "D6Ft7B9d32DbEaGegkMtBwHaUqJsdGiiDvayiyHhSZPy"

class SolPlayActionHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def end_headers(self):
        # Critical Dialect & Twitter Blink CORS headers
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, Content-Encoding, Accept-Encoding, X-Accept-Action-Version, X-Accept-Blockchain-Ids")
        self.send_header("Access-Control-Expose-Headers", "X-Action-Version, X-Blockchain-Ids")
        self.send_header("X-Action-Version", "2.1.3")
        self.send_header("X-Blockchain-Ids", "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)

        # 1. Standard Solana actions.json discovery route
        if parsed.path == "/actions.json":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            manifest = {
                "rules": [
                    {
                        "pathPattern": "/api/actions/**",
                        "apiPath": "/api/actions/**"
                    }
                ]
            }
            self.wfile.write(json.dumps(manifest, indent=2).encode("utf-8"))
            return

        # 2. SolPlay "Stake-Me" Blink Action Metadata
        if parsed.path.startswith("/api/actions/stake"):
            params = parse_qs(parsed.query)
            slip_id = params.get("slipId", ["SOL-84920"])[0]
            tipster = params.get("tipster", ["@ayodeji"])[0]
            odds = params.get("odds", ["3.45"])[0]
            teams = params.get("teams", ["Arsenal vs Chelsea"])[0]

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()

            blink_metadata = {
                "title": f"⚡ SolPlay Social Stake: {teams} ({odds}x)",
                "icon": "https://solwork.vercel.app/logo.png",
                "description": f"Punter {tipster} built a high-conviction {odds}x accumulator ticket [{slip_id}]! Stake this ticket ($2–$10). You receive 80% of net winnings, while {tipster} earns a 20% creator win-share. Instant 400ms settlement via MultiHopper.",
                "label": "Back Match Slip",
                "disabled": False,
                "links": {
                    "actions": [
                        {
                            "label": "0.01 SOL ($2)",
                            "href": f"/api/actions/stake?amount=0.01&slipId={slip_id}&tipster={tipster}"
                        },
                        {
                            "label": "0.02 SOL ($4)",
                            "href": f"/api/actions/stake?amount=0.02&slipId={slip_id}&tipster={tipster}"
                        },
                        {
                            "label": "0.05 SOL ($10 - Max)",
                            "href": f"/api/actions/stake?amount=0.05&slipId={slip_id}&tipster={tipster}"
                        }
                    ]
                }
            }
            self.wfile.write(json.dumps(blink_metadata, indent=2).encode("utf-8"))
            return

        # Standard file serving
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)

        # 3. Construct on-chain Solana transaction for Dialect / Twitter Blink
        if parsed.path.startswith("/api/actions/stake"):
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"
            
            try:
                data = json.loads(body)
            except Exception:
                data = {}

            account = data.get("account")
            if not account:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Missing 'account' in POST payload"}).encode("utf-8"))
                return

            params = parse_qs(parsed.query)
            try:
                amount_sol = float(params.get("amount", [0.01])[0])
            except ValueError:
                amount_sol = 0.01

            # Cap maximum allowable staking at 0.05 SOL ($10)
            amount_sol = min(amount_sol, 0.05)
            lamports = int(amount_sol * 1_000_000_000)

            slip_id = params.get("slipId", ["SOL-84920"])[0]
            tipster = params.get("tipster", ["@ayodeji"])[0]

            if SolanaTransactionBuilder:
                b64_tx = SolanaTransactionBuilder.build_sol_transfer_tx(
                    sender_pubkey_str=account,
                    recipient_pubkey_str=DEFAULT_TREASURY,
                    lamports=lamports
                )
            else:
                b64_tx = "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEDB5D3QJb16uB5u5E6V0472f8n7E8w="

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()

            response_payload = {
                "transaction": b64_tx,
                "message": f"⚡ Staked {amount_sol} SOL on ticket [{slip_id}]! Your 80% winning share will settle directly to your wallet via MultiHopper upon match resolution."
            }
            self.wfile.write(json.dumps(response_payload).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()

def main():
    os.chdir(BASE_DIR)
    HTTPServer.allow_reuse_address = True
    httpd = HTTPServer(("", PORT), SolPlayActionHandler)
    print("\n" + "="*60)
    print(" ⚡ SOLPLAY NEON CASINO + DIALECT BLINK ACTION SERVER STARTED")
    print(f" Access UI: http://localhost:{PORT}")
    print(f" Actions Discovery: http://localhost:{PORT}/actions.json")
    print(f" Stake-Me Action API: http://localhost:{PORT}/api/actions/stake")
    print("="*60 + "\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.server_close()

if __name__ == "__main__":
    main()
