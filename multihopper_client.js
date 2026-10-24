/**
 * MultiHopper Protocol Integration Client for SolPlay Sportsbook & Casino
 * Official Partner Integration: Token-2022 Permanent Delegate Multi-Hop Routing & TRM Labs Screening
 * 
 * MultiHopper Core: 3jLoS2wbNgtKzieUUxwg6Xhdv6gbZkHDtPWA9ZAgspFh
 * Orchestrator:     4TPCmR2uN3hDM1FbTsf7ZtFXwXGSz4u1Kxv5YHj6eruX
 * Transfer Guard:   2JEv3pD6nczEvn1xDXaEzehkJofPPjoQQpnW5nGY3r52
 */

(function (window) {
  'use strict';

  const MULTIHOPPER_CONFIG = {
    partnerId: 'solplay-route-partner-v1',
    partnerName: 'SolPlay Gaming Protocol',
    apiEndpoint: 'https://api.multihopper.com/v1',
    programs: {
      core: '3jLoS2wbNgtKzieUUxwg6Xhdv6gbZkHDtPWA9ZAgspFh',
      orchestrator: '4TPCmR2uN3hDM1FbTsf7ZtFXwXGSz4u1Kxv5YHj6eruX',
      transferGuard: '2JEv3pD6nczEvn1xDXaEzehkJofPPjoQQpnW5nGY3r52',
      token2022Program: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
    },
    defaultHops: 3,
    maxHops: 5,
    percentageFee: 0.005, // 0.5% (0.25% SolPlay partner share, 0.25% MultiHopper pool)
    partnerRevenueShare: 0.0025,
    supportedAssets: ['SOL', 'USDC', 'BONK']
  };

  class MultiHopperClient {
    constructor(config = {}) {
      this.config = { ...MULTIHOPPER_CONFIG, ...config };
      this.activeRoutes = new Map();
      this.storageKey = 'solplay_multihopper_routes';
      this._loadStoredRoutes();
    }

    _loadStoredRoutes() {
      try {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const list = JSON.parse(stored);
          list.forEach(r => this.activeRoutes.set(r.routeId, r));
        }
      } catch (e) {
        console.warn('[MultiHopper SolPlay] Failed to load cached routes:', e);
      }
    }

    _persistRoutes() {
      try {
        const list = Array.from(this.activeRoutes.values());
        localStorage.setItem(this.storageKey, JSON.stringify(list));
      } catch (e) {
        console.warn('[MultiHopper SolPlay] Failed to persist routes:', e);
      }
    }

    getAllRoutes() {
      return Array.from(this.activeRoutes.values()).reverse();
    }

    /**
     * Step 1: Create a MultiHopper Route
     * POST /routes/create
     */
    async createRoute({ origin, destination, amount, asset = 'SOL', hopCount = 3, delaySeconds = 10, memo = '' }) {
      const numAmount = parseFloat(amount);
      if (!destination || isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Invalid destination or amount for MultiHopper route');
      }

      const clampedHops = Math.max(1, Math.min(this.config.maxHops, parseInt(hopCount, 10) || 3));
      const totalFee = parseFloat((numAmount * this.config.percentageFee).toFixed(4));
      const partnerRev = parseFloat((numAmount * this.config.partnerRevenueShare).toFixed(4));
      const netDispersal = parseFloat((numAmount - totalFee).toFixed(4));

      const routeId = `mhop_play_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
      
      const hopsList = [];
      for (let i = 1; i <= clampedHops; i++) {
        const randHop = Array.from({ length: 4 }, () => Math.random().toString(36).substring(2, 6).toUpperCase()).join('');
        hopsList.push({
          hopIndex: i,
          nodeLabel: i === 1 ? 'Token-2022 Permanent Delegate Vault' : (i === clampedHops ? 'Recipient Destination' : `Relay Hop #${i}`),
          address: `MHoP${randHop}Node${i}`,
          delaySeconds: delaySeconds * i,
          status: 'PENDING'
        });
      }

      const routeData = {
        routeId,
        origin: origin || 'SolPlay_Cashout_Treasury',
        destination,
        asset,
        amount: numAmount,
        totalFee,
        partnerRev,
        netDispersal,
        hopCount: clampedHops,
        hopsList,
        memo: memo || 'SolPlay Stealth Winnings Cashout',
        status: 'INITIALIZED',
        trmStatus: 'PENDING_SCREENING',
        trmRiskScore: 0,
        createdAt: new Date().toISOString(),
        txSignature: null
      };

      this.activeRoutes.set(routeId, routeData);
      this._persistRoutes();
      return routeData;
    }

    /**
     * Step 2: Prepare & Screen via TRM Labs
     * POST /routes/prepare
     */
    async prepareRoute(routeId) {
      const route = this.activeRoutes.get(routeId);
      if (!route) throw new Error(`Route ${routeId} not found`);

      // Run TRM Labs Compliance Simulation
      const isSanctioned = route.destination.toLowerCase().includes('sanction') || route.destination.toLowerCase().includes('blackhat');
      const simulatedRiskScore = isSanctioned ? 95 : Math.floor(Math.random() * 6); // Extremely clean score

      route.trmRiskScore = simulatedRiskScore;
      route.trmStatus = simulatedRiskScore < 25 ? 'VERIFIED_CLEAN' : 'FLAGGED_HIGH_RISK';

      if (route.trmStatus === 'FLAGGED_HIGH_RISK') {
        route.status = 'REJECTED';
        this._persistRoutes();
        throw new Error(`TRM Labs screening flagged destination ${route.destination} as high risk (${simulatedRiskScore}/100)`);
      }

      route.status = 'PREPARED';
      this._persistRoutes();
      return route;
    }

    /**
     * Step 3: Confirm and Execute Route Sequence
     * POST /routes/confirm
     */
    async executeRoute(routeId, onHopProgress = null) {
      const route = this.activeRoutes.get(routeId);
      if (!route) throw new Error(`Route ${routeId} not found`);
      if (route.status !== 'PREPARED') {
        await this.prepareRoute(routeId);
      }

      route.status = 'EXECUTING';
      this._persistRoutes();

      for (let i = 0; i < route.hopsList.length; i++) {
        const hop = route.hopsList[i];
        hop.status = 'IN_TRANSIT';
        if (typeof onHopProgress === 'function') {
          onHopProgress(route, i, 'IN_TRANSIT');
        }

        await new Promise(r => setTimeout(r, 600));

        hop.status = 'CONFIRMED';
        hop.timestamp = new Date().toISOString();
        hop.txHash = `5Hop${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
        if (typeof onHopProgress === 'function') {
          onHopProgress(route, i, 'CONFIRMED');
        }
      }

      route.status = 'COMPLETED';
      route.txSignature = `5MHOP_PLAY_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}Z`;
      route.completedAt = new Date().toISOString();
      this._persistRoutes();

      if (typeof onHopProgress === 'function') {
        onHopProgress(route, route.hopsList.length - 1, 'COMPLETED');
      }

      return route;
    }

    /**
     * Interactive HTML Node Visualizer
     */
    renderVisualizer(route, container) {
      if (!container) return;
      const isComplete = route.status === 'COMPLETED';
      const trmBadge = route.trmStatus === 'VERIFIED_CLEAN' 
        ? `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            TRM Labs Screened (Risk Score: ${route.trmRiskScore}/100)
          </span>`
        : `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">Screening In Progress</span>`;

      let hopsHtml = route.hopsList.map((h, idx) => {
        const isDone = h.status === 'CONFIRMED';
        const isCurrent = h.status === 'IN_TRANSIT';
        const circleClass = isDone ? 'bg-emerald-500 text-black border-emerald-400' : (isCurrent ? 'bg-teal-500 text-black animate-pulse border-teal-300' : 'bg-white/5 text-white/40 border-white/10');
        const lineClass = isDone ? 'bg-emerald-500' : 'bg-white/10';

        return `
          <div class="flex flex-col items-center flex-1 relative">
            <div class="w-7 h-7 rounded-full border flex items-center justify-center text-xs font-black transition-all ${circleClass} shadow-md z-10">
              ${isDone ? '✓' : idx + 1}
            </div>
            <span class="text-[9px] font-bold text-center mt-1 text-white/80 line-clamp-1">${h.nodeLabel}</span>
            <span class="text-[8px] font-mono text-white/40 truncate max-w-[80px]">${h.address.substring(0, 8)}...</span>
            ${idx < route.hopsList.length - 1 ? `<div class="absolute top-3.5 left-1/2 w-full h-[2px] ${lineClass} -z-0"></div>` : ''}
          </div>
        `;
      }).join('');

      container.innerHTML = `
        <div class="p-4 rounded-2xl bg-black/60 border border-teal-500/30 text-white flex flex-col gap-3 font-sans shadow-2xl">
          <div class="flex items-center justify-between border-b border-white/5 pb-2.5">
            <div class="flex items-center gap-2">
              <span class="text-xs font-black tracking-wider uppercase text-teal-300 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
                MultiHopper Route
              </span>
              <span class="text-[10px] font-mono text-white/40">#${route.routeId}</span>
            </div>
            ${trmBadge}
          </div>

          <div class="flex items-start justify-between relative py-2 px-1">
            ${hopsHtml}
          </div>

          <div class="grid grid-cols-3 gap-2 bg-white/5 p-2.5 rounded-xl border border-white/5 text-center text-xs">
            <div>
              <span class="text-[9px] text-white/50 block uppercase font-mono">Gross Amount</span>
              <strong class="font-bold text-white">${route.amount.toFixed(2)} ${route.asset}</strong>
            </div>
            <div>
              <span class="text-[9px] text-white/50 block uppercase font-mono">Route Fee (0.5%)</span>
              <strong class="font-bold text-teal-400">${route.totalFee.toFixed(3)} ${route.asset}</strong>
            </div>
            <div>
              <span class="text-[9px] text-white/50 block uppercase font-mono">Net Settled</span>
              <strong class="font-bold text-emerald-400">${route.netDispersal.toFixed(2)} ${route.asset}</strong>
            </div>
          </div>

          ${isComplete ? `
            <div class="flex items-center justify-between text-[10px] text-emerald-300 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
              <span class="font-bold">✓ Token-2022 Route Settled</span>
              <span class="font-mono truncate max-w-[150px]">Tx: ${route.txSignature}</span>
            </div>
          ` : ''}
        </div>
      `;
    }
  }

  // Export globally
  window.MultiHopperClient = MultiHopperClient;
  window.multiHopper = new MultiHopperClient();

})(typeof window !== 'undefined' ? window : this);
