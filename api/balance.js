const https = require('https');

const ALLOWED_ORIGINS = new Set([
  'https://solplay-delta.vercel.app',
  'https://solwork.vercel.app',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:3000'
]);

const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (origin && (ALLOWED_ORIGINS.has(origin) || origin.endsWith('.vercel.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function fetchRpcBalance(address) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getBalance',
      params: [address]
    });

    const options = {
      hostname: 'api.devnet.solana.com',
      port: 443,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 6000
    };

    const request = https.request(options, (response) => {
      let body = '';
      response.on('data', chunk => body += chunk);
      response.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed && parsed.result && typeof parsed.result.value === 'number') {
            resolve(parsed.result.value);
          } else if (parsed && parsed.error) {
            reject(new Error(parsed.error.message || 'RPC returned error'));
          } else {
            reject(new Error('Unexpected RPC response shape'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('RPC request timed out'));
    });
    request.write(postData);
    request.end();
  });
}

module.exports = async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const address = req.query.address || (req.body && req.body.address);
  if (!address || typeof address !== 'string' || !BASE58_REGEX.test(address.trim())) {
    return res.status(400).json({ error: 'Valid Solana Devnet Base58 address required' });
  }

  const cleanAddr = address.trim();

  try {
    const lamports = await fetchRpcBalance(cleanAddr);
    const sol = lamports / 1000000000;
    return res.status(200).json({
      success: true,
      address: cleanAddr,
      network: 'devnet',
      lamports,
      sol,
      formatted: sol.toFixed(4)
    });
  } catch (err) {
    console.error('Balance fetch error:', err.message);
    return res.status(502).json({
      success: false,
      error: 'Failed to retrieve balance from Solana Devnet RPC',
      details: err.message
    });
  }
};

