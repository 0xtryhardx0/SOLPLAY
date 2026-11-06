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
  const cfgPath = path.join(process.cwd(), 'mh_runtime_config.json');
  let fileCfg = {};
  if (fs.existsSync(cfgPath)) {
    fileCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  }

  let apiKey = process.env.MH_API_KEY;
  if (!apiKey && fileCfg.apiKey) {
    apiKey = fileCfg.apiKey;
  }
  if (!apiKey) {
    console.warn('Generating ephemeral secret. Instance-isolated!');
    apiKey = crypto.randomBytes(32).toString('hex');
  }

  return {
    apiBase: process.env.MH_API_BASE || fileCfg.apiBase || 'https://devnet.multihopper.com/api/v1',
    apiKey,
    sourceOwner: process.env.MH_SOURCE_OWNER || fileCfg.sourceOwner || 'CMtyux7PeLhzZ7NyTaSkXxebcysNBappKfxZGsuWySNh',
    defaultRecipient: fileCfg.defaultRecipient || '5syXsU47xYXcixG8wyV31NC1kKgDC53PZfVhsuXnDjDe',
    supportBundlePrefix: fileCfg.supportBundlePrefix || 'KZIB',
    integrationId: fileCfg.integrationId || 1057,
    providerPda: fileCfg.providerPda || 'uwhQazYsbQ3Fr93VaTzBWijXCUTa84Pahdghn6N1b1x'
  };
}

function loadRelayerKeypair() {
  const cfgPath = path.join(process.cwd(), 'mh_runtime_config.json');
  const walletPath = path.join(process.cwd(), 'dev_wallet.json');
  let rawArr = null;
  if (process.env.MH_RELAYER_KEYPAIR_JSON) {
    rawArr = JSON.parse(process.env.MH_RELAYER_KEYPAIR_JSON);
  } else if (fs.existsSync(cfgPath)) {
    const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    if (Array.isArray(parsed.relayerBytes)) {
      rawArr = parsed.relayerBytes;
    }
  }
  if (!rawArr && fs.existsSync(walletPath)) {
    rawArr = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
  }
  if (!rawArr) {
    throw new Error('Relayer keypair configuration unavailable');
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

function applySecurityHeaders(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://solplay-delta.vercel.app');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Idempotency-Key');
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

    if (action === 'init_payout') {
      const relayer = loadRelayerKeypair();
      let recipientWallet = String(body.recipientWallet || '').trim();
      // If recipient isn't a valid base58 Solana pubkey or equals sourceOwner, route to verified player vault
      if (!BASE58_REGEX.test(recipientWallet) || recipientWallet === cfg.sourceOwner) {
        recipientWallet = cfg.defaultRecipient;
      }

      const requestedSol = parseFloat(body.amountSol) || 0.05;
      // Keep Devnet test payouts between 0.02 and 0.05 SOL so treasury can run many live settlements
      const clampedSol = Math.max(0.02, Math.min(0.05, requestedSol));
      const lamports = Math.round(clampedSol * 1e9);
      const hops = Math.max(3, Math.min(10, parseInt(body.hops, 10) || 3));
      const arrivalSeconds = Math.max(60, Math.min(3600, parseInt(body.arrivalSeconds, 10) || 60));
      const cleanTicket = String(body.ticketId || 'SP').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20);
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
          amountTokens: String(clampedSol),
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
          transfer: transferObj,
          supportBundleId: transferObj.supportBundleId
        });
      }

      const signedTxs = signPreparedTxsBundle(prepData.preparedTxs, relayer);

      return res.status(200).json({
        success: true,
        transfer: transferObj,
        transferId,
        supportBundleId: transferObj.supportBundleId,
        externalId: transferObj.externalId,
        route: transferObj.route,
        signedTxs,
        recentBlockhash: prepData.preparedTxs ? prepData.preparedTxs.recentBlockhash : null,
        lastValidBlockHeight: prepData.preparedTxs ? prepData.preparedTxs.lastValidBlockHeight : null
      });
    }

    if (action === 'confirm_broadcast') {
      const transferId = parseInt(body.transferId, 10);
      if (!transferId || isNaN(transferId) || transferId <= 0) {
        return res.status(400).json({ error: 'Valid transferId required' });
      }
      const signaturesPayload = body.signatures || {};
      const confResp = await fetch(`${cfg.apiBase}/transfers/${transferId}/confirm-broadcast`, {
        method: 'POST',
        headers: {
          ...mhHeaders,
          'Idempotency-Key': crypto.randomUUID()
        },
        body: JSON.stringify(signaturesPayload)
      });
      const confData = await confResp.json();
      return res.status(confResp.status).json(confData);
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
    return res.status(500).json({ error: 'Internal MultiHopper BFF processing error' });
  }
};
