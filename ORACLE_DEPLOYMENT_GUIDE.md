# 🤖 SolPlay Autonomous Sports Oracle Micro-Service

The SolPlay Oracle is an enterprise-grade autonomous micro-service that bridges real-world sports data (ESPN, UEFA, Premier League, La Liga) with Solana smart contracts and the Supabase cloud database.

It runs as a persistent daemon with dual responsibilities:
1. **Background Settlement Daemon**: Continuously evaluates pending accumulator and single tickets, verifies match outcomes across leagues, disburses winning payouts atomically to player balances, and distributes 2% tipster royalties.
2. **HTTP Health & Telemetry Micro-Server**: Exposes standard health endpoints, Prometheus metrics, and live match config JSON for cloud container orchestrators and edge frontends.

---

## 📡 API & Health Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` or `/healthz` | JSON health probe: service name, version, uptime, cycles run, settlement counts, and status (`HEALTHY`). |
| `GET` | `/active_matches.json` | Real-time dynamic match configurations and verified scores for web clients. |
| `GET` | `/metrics` | Prometheus-compatible operational metrics (`solplay_oracle_uptime_seconds`, `solplay_oracle_wagers_settled_total`, etc.). |
| `GET` | `/wagers/pending` | Real-time list of all wagers awaiting match resolution in Supabase. |
| `POST` | `/settle` | On-demand webhook to immediately trigger an autonomous settlement pass. |

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | Port for the HTTP health server (configured automatically by cloud providers). |
| `SETTLEMENT_INTERVAL` | `20` | Frequency in seconds between autonomous settlement passes. |
| `RPC_URL` | `https://api.devnet.solana.com` | Solana JSON RPC endpoint for on-chain resolution. |
| `SUPABASE_URL` | `https://ervysscnenetauyszrzp.supabase.co` | Supabase project URL for cloud ledger queries. |
| `SUPABASE_KEY` | *(Configured default)* | Supabase API key for authenticated RPC transactions. |

---

## 🚀 1-Click Cloud Deployment Options

### Option 1: Railway (Recommended)
1. Go to [railway.app](https://railway.app) and click **New Project** → **Deploy from GitHub repo**.
2. Select repository `0xtryhardx0/SOLPLAY`.
3. Railway automatically detects `railway.json` and builds via `Dockerfile.oracle`.
4. Your oracle service will be live with an HTTPS domain and active `/health` check.

### Option 2: Render
1. Go to [render.com](https://render.com) and click **New** → **Blueprint**.
2. Connect repository `0xtryhardx0/SOLPLAY`.
3. Render automatically picks up `render.yaml` and launches `solplay-oracle`.

### Option 3: Fly.io
From this repository directory:
```bash
fly launch --config fly.toml
fly deploy
```

### Option 4: Standalone Docker (VPS / DigitalOcean / AWS EC2)
```bash
docker build -f Dockerfile.oracle -t solplay-oracle:latest .
docker run -d --name solplay-oracle -p 8080:8080 --restart unless-stopped solplay-oracle:latest
```

---

## 🧪 Local Testing & Verification

Run the oracle daemon locally:
```bash
python3 oracle_service.py --daemon --port 8080 --interval 20
```

Verify health and metrics:
```bash
curl -s http://127.0.0.1:8080/health
curl -s http://127.0.0.1:8080/metrics
```

Trigger an on-demand settlement pass:
```bash
curl -X POST http://127.0.0.1:8080/settle
```
