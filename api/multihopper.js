const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ALLOWED_ORIGINS = new Set([
  'https://solplay-delta.vercel.app',
  'https://solwork.vercel.app',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:3000'
]);

const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const PKCS8_ED25519_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');

function loadRuntimeConfig() {
  const apiKey = process.env.MH_API_KEY;
  if (!apiKey) {
    throw new Error('MH_API_KEY environment variable is not configured');
  }

  const sourceOwner = process.env.MH_SOURCE_OWNER;
  if (!sourceOwner) {
    throw new Error('MH_SOURCE_OWNER environment variable is not configured');
  }

  return {
    apiBase: process.env.MH_API_BASE || 'https://devnet.multihopper.com/api/v1',
    apiKey,
    sourceOwner,
    supportBundlePrefix: process.env.MH_SUPPORT_BUNDLE_PREFIX || 'KZIB',
    integrationId: parseInt(process.env.MH_INTEGRATION_ID, 10) || 1057,
    providerPda: process.env.MH_PROVIDER_PDA || 'uwhQazYsbQ3Fr93VaTzBWijXCUTa84Pahdghn6N1b1x',
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
  };
}

function loadRelayerKeypair() {
  let rawArr = null;
  if (process.env.MH_RELAYER_KEYPAIR_JSON) {
    try {
      rawArr = JSON.parse(process.env.MH_RELAYER_KEYPAIR_JSON);
    } catch (_) {}
  }
  
  // Local fallback for development if dev_wallet.json exists
  if (!rawArr) {
    const devWalletPath = path.join(__dirname, '..', 'dev_wallet.json');
    const cwdWalletPath = path.join(process.cwd(), 'dev_wallet.json');
    if (fs.existsSync(devWalletPath)) {
      try {
        rawArr = JSON.parse(fs.readFileSync(devWalletPath, 'utf8'));
      } catch (_) {}
    } else if (fs.existsSync(cwdWalletPath)) {
      try {
        rawArr = JSON.parse(fs.readFileSync(cwdWalletPath, 'utf8'));
      } catch (_) {}
    }
  }

  if (!rawArr || !Array.isArray(rawArr) || rawArr.length < 64) {
    throw new Error('MH_RELAYER_KEYPAIR_JSON environment variable is not configured or invalid');
  }

  const keyBytes = Buffer.from(rawArr);
  const seed = keyBytes.subarray(0, 32);
  const pubkey = keyBytes.subarray(32, 64);
  const privKey = crypto.createPrivateKey({
    key: Buffer.concat([PKCS8_ED25519_PREFIX, seed]),
    format: 'der',
    type: 'pkcs8'
  });

  return { privKey, pubkey };
}

function signSolanaTxBase64(b64, relayer) {
  if (!b64 || typeof b64 !== 'string') return null;
  const buf = Buffer.from(b64, 'base64');
  const numSigs = buf[0];
  const msgOffset = 1 + numSigs * 64;
  const msgBytes = buf.subarray(msgOffset);
  const isVersioned = (msgBytes[0] & 0x80) !== 0;
  const acctCountOffset = isVersioned ? 4 : 3;
  const acctCount = msgBytes[acctCountOffset];
  const acctsStart = acctCountOffset + 1;

  let signerIdx = 0;
  for (let i = 0; i < acctCount; i++) {
    const pk = msgBytes.subarray(acctsStart + i * 32, acctsStart + (i + 1) * 32);
    if (pk.equals(relayer.pubkey)) {
      signerIdx = i;
      break;
    }
  }

  const sig = crypto.sign(null, msgBytes, relayer.privKey);
  const out = Buffer.from(buf);
  sig.copy(out, 1 + signerIdx * 64);
  return out.toString('base64');
}

function signPreparedTxsBundle(preparedTxs, relayer) {
  if (!preparedTxs) return {};
  const signed = {};
  if (preparedTxs.keeperFundingTx) {
    signed.keeperFundingTx = signSolanaTxBase64(preparedTxs.keeperFundingTx, relayer);
  }
  if (Array.isArray(preparedTxs.routeInitTxs) && preparedTxs.routeInitTxs.length > 0) {
    signed.routeInitTxs = preparedTxs.routeInitTxs.map(entry => {
      const raw = typeof entry === 'string' ? entry : entry.base64;
      return signSolanaTxBase64(raw, relayer);
    });
  }
  if (preparedTxs.orchestratorInitTx) {
    signed.orchestratorInitTx = signSolanaTxBase64(preparedTxs.orchestratorInitTx, relayer);
  }
  if (Array.isArray(preparedTxs.sessionInitTxs) && preparedTxs.sessionInitTxs.length > 0) {
    signed.sessionInitTxs = preparedTxs.sessionInitTxs.map(raw => signSolanaTxBase64(raw, relayer));
  }
  return signed;
}

async function broadcastAndConfirmSolanaTx(signedBase64, rpcUrl) {
  if (!signedBase64) return null;
  
  const sendResp = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: crypto.randomUUID(),
      method: 'sendTransaction',
      params: [signedBase64, { encoding: 'base64', preflightCommitment: 'confirmed' }]
    })
  });
  
  const sendData = await sendResp.json();
  if (sendData.error) {
    throw new Error(`Solana RPC sendTransaction error: ${sendData.error.message || JSON.stringify(sendData.error)}`);
  }
  const signature = sendData.result;

  // Poll confirmation on Solana RPC
  const start = Date.now();
  while (Date.now() - start < 35000) {
    await new Promise(r => setTimeout(r, 1200));
    try {
      const statusResp = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: crypto.randomUUID(),
          method: 'getSignatureStatuses',
          params: [[signature], { searchTransactionHistory: true }]
        })
      });
      const statusData = await statusResp.json();
      const st = statusData.result && statusData.result.value && statusData.result.value[0];
      if (st) {
        if (st.err) {
          throw new Error(`Transaction ${signature} failed on-chain: ${JSON.stringify(st.err)}`);
        }
        if (st.confirmationStatus === 'confirmed' || st.confirmationStatus === 'finalized') {
          return signature;
        }
      }
    } catch (e) {
      if (e.message && e.message.includes('failed on-chain')) throw e;
    }
  }

  return signature;
}

function applySecurityHeaders(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://solplay-delta.vercel.app');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Idempotency-Key, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store');
}

module.exports = async function handler(req, res) {
  applySecurityHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cfg = loadRuntimeConfig();
    const mhHeaders = {
      'x-api-key': cfg.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (req.method === 'GET') {
      const transferId = parseInt(req.query.transferId, 10);
      if (!transferId || isNaN(transferId) || transferId <= 0) {
        return res.status(400).json({ error: 'Valid transferId required' });
      }
      const resp = await fetch(`${cfg.apiBase}/transfers/${transferId}`, {
        method: 'GET',
        headers: mhHeaders
      });
      const data = await resp.json();
      return res.status(resp.status).json(data);
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const action = String(body.action || '');

    // Fully Server-Orchestrated Payout Execution
    if (action === 'init_payout' || action === 'execute_payout') {
      const recipientWallet = String(body.recipientWallet || '').trim();

      // Recipient Validation
      if (!BASE58_REGEX.test(recipientWallet)) {
        return res.status(400).json({ error: 'Invalid recipientWallet: valid Solana base58 address required' });
      }
      if (recipientWallet === cfg.sourceOwner) {
        return res.status(400).json({ error: 'Recipient wallet cannot match treasury sourceOwner' });
      }

      // Amount Validation (Exact winning bettor payout, no artificial clamping)
      const requestedSol = parseFloat(body.amountSol);
      if (!requestedSol || isNaN(requestedSol) || requestedSol <= 0) {
        return res.status(400).json({ error: 'Valid positive amountSol is required' });
      }

      const relayer = loadRelayerKeypair();

      const lamports = Math.round(requestedSol * 1e9);
      const hops = Math.max(3, Math.min(10, parseInt(body.hops, 10) || 3));
      const arrivalSeconds = Math.max(60, Math.min(3600, parseInt(body.arrivalSeconds, 10) || 60));
      const cleanTicket = String(body.ticketId || 'SP').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24);
      const externalId = `solplay-${cleanTicket}-${Date.now()}`;

      // 1. Create Transfer on MultiHopper API
      const createResp = await fetch(`${cfg.apiBase}/transfers`, {
        method: 'POST',
        headers: {
          ...mhHeaders,
          'Idempotency-Key': crypto.randomUUID()
        },
        body: JSON.stringify({
          tokenMint: 'So11111111111111111111111111111111111111112',
          amountRaw: String(lamports),
          amountTokens: String(requestedSol),
          tokenDecimals: 9,
          tokenSymbol: 'SOL',
          sourceOwner: cfg.sourceOwner,
          recipientWallet,
          hops,
          arrivalSeconds,
          externalId
        })
      });

      const createData = await createResp.json();
      if (!createResp.ok) {
        return res.status(createResp.status).json({
          error: createData.message || 'MultiHopper transfer creation failed',
          details: createData
        });
      }

      const transferObj = createData.transfer || createData;
      const transferId = transferObj.id;

      // 2. Prepare Transactions on MultiHopper API
      const prepResp = await fetch(`${cfg.apiBase}/transfers/${transferId}/prepare`, {
        method: 'POST',
        headers: {
          ...mhHeaders,
          'Idempotency-Key': crypto.randomUUID()
        },
        body: JSON.stringify({})
      });

      const prepData = await prepResp.json();
      if (!prepResp.ok) {
        return res.status(prepResp.status).json({
          error: prepData.message || 'MultiHopper prepare failed',
          transferId,
          supportBundleId: transferObj.supportBundleId,
          details: prepData
        });
      }

      // 3. Sign All Transactions on Server
      const signedBundle = signPreparedTxsBundle(prepData.preparedTxs, relayer);

      // 4. Server-Side Sequential Broadcasting & Confirmation on Solana Devnet
      const signaturesPayload = {};
      const executedSteps = [];

      // A. Keeper Funding
      if (signedBundle.keeperFundingTx) {
        const kfSig = await broadcastAndConfirmSolanaTx(signedBundle.keeperFundingTx, cfg.rpcUrl);
        signaturesPayload.keeperFundingSignature = kfSig;
        executedSteps.push({ step: 'keeperFunding', signature: kfSig });
      }

      // B. Route Initialization Transactions
      if (Array.isArray(signedBundle.routeInitTxs) && signedBundle.routeInitTxs.length > 0) {
        const routeSigs = [];
        for (const rawTx of signedBundle.routeInitTxs) {
          const rSig = await broadcastAndConfirmSolanaTx(rawTx, cfg.rpcUrl);
          routeSigs.push(rSig);
        }
        signaturesPayload.routeInitSignatures = routeSigs;
        executedSteps.push({ step: 'routeInit', signatures: routeSigs });
      }

      // C. Orchestrator Initialization
      if (signedBundle.orchestratorInitTx) {
        const orchSig = await broadcastAndConfirmSolanaTx(signedBundle.orchestratorInitTx, cfg.rpcUrl);
        signaturesPayload.orchestratorInitSignature = orchSig;
        executedSteps.push({ step: 'orchestratorInit', signature: orchSig });
      }

      // D. Session Initialization Transactions
      if (Array.isArray(signedBundle.sessionInitTxs) && signedBundle.sessionInitTxs.length > 0) {
        const sessionSigs = [];
        for (const rawTx of signedBundle.sessionInitTxs) {
          const sSig = await broadcastAndConfirmSolanaTx(rawTx, cfg.rpcUrl);
          sessionSigs.push(sSig);
        }
        signaturesPayload.sessionInitSignatures = sessionSigs;
        executedSteps.push({ step: 'sessionInit', signatures: sessionSigs });
      }

      // 5. Confirm Broadcast on MultiHopper API to Activate Keepers
      const confResp = await fetch(`${cfg.apiBase}/transfers/${transferId}/confirm-broadcast`, {
        method: 'POST',
        headers: {
          ...mhHeaders,
          'Idempotency-Key': crypto.randomUUID()
        },
        body: JSON.stringify(signaturesPayload)
      });

      const confData = await confResp.json();
      if (!confResp.ok) {
        return res.status(confResp.status).json({
          error: confData.message || 'MultiHopper confirm-broadcast failed',
          transferId,
          supportBundleId: transferObj.supportBundleId,
          signatures: signaturesPayload,
          details: confData
        });
      }

      return res.status(200).json({
        success: true,
        transferId,
        supportBundleId: transferObj.supportBundleId,
        externalId: transferObj.externalId,
        recipientWallet,
        amountSol: requestedSol,
        route: transferObj.route,
        signatures: signaturesPayload,
        executedSteps,
        confirmResult: confData
      });
    }

    if (action === 'status') {
      const transferId = parseInt(body.transferId, 10);
      if (!transferId || isNaN(transferId) || transferId <= 0) {
        return res.status(400).json({ error: 'Valid transferId required' });
      }
      const stResp = await fetch(`${cfg.apiBase}/transfers/${transferId}`, {
        method: 'GET',
        headers: mhHeaders
      });
      const stData = await stResp.json();
      return res.status(stResp.status).json(stData);
    }

    return res.status(400).json({ error: 'Unsupported action' });
  } catch (err) {
    console.error('MultiHopper backend error:', err);
    return res.status(500).json({ error: err.message || 'Internal MultiHopper processing error' });
  }
};
