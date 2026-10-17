// ==============================================================================
// SOLPLAY CLOUD DATABASE CONNECTOR & SYNCHRONIZATION ENGINE
// ==============================================================================
// Connects SolPlay to a centralized PostgreSQL/Supabase database.
// Automatically syncs each user's unique identity, wagers, betslip, and balance.
// Falls back gracefully to high-speed local cache if cloud is temporarily offline.
// ==============================================================================

const SolPlayDB = {
    supabaseClient: null,
    isInitialized: false,

    // Lamport precision helpers (1 SOL = 1,000,000,000 lamports)
    solToLamports: function(sol) {
        if (!sol && sol !== 0) return 0;
        return Math.round(Number(sol) * 1000000000);
    },

    lamportsToSol: function(lamports) {
        if (!lamports && lamports !== 0) return 0;
        return Number(lamports) / 1000000000;
    },

    oddsToBps: function(odds) {
        if (!odds) return 10000;
        return Math.round(Number(odds) * 10000);
    },

    // Initialize Supabase client
    init: function() {
        const defaultProjectUrl = "https://ervysscnenetauyszrzp.supabase.co";
        const defaultAnonKey = "sb_publishable_cILGnExGcPn0BY__q268PQ_xXbKr7l3";
        const supabaseUrl = localStorage.getItem("solplay_supabase_url") || window.SOLPLAY_SUPABASE_URL || defaultProjectUrl;
        const supabaseKey = localStorage.getItem("solplay_supabase_anon_key") || window.SOLPLAY_SUPABASE_ANON_KEY || defaultAnonKey;

        if (supabaseUrl && supabaseKey && typeof supabase !== 'undefined') {
            try {
                this.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
                this.isInitialized = true;
                console.log("⚡ SolPlay Cloud Database Connected via Supabase (PostgreSQL)!");
            } catch (err) {
                console.warn("Could not connect to Supabase, running with local storage cache fallback:", err);
                this.isInitialized = false;
            }
        } else {
            // Offline / local cache mode
            this.isInitialized = false;
        }
    },

    // 1. Ensure user exists in cloud database
    syncUserAccount: async function(walletAddress, username = null, balanceSol = 10.0) {
        if (!walletAddress) return null;
        
        if (!this.isInitialized || !this.supabaseClient) {
            // Local fallback
            return { wallet_address: walletAddress, balance_sol: balanceSol, balance_lamports: this.solToLamports(balanceSol) };
        }

        try {
            const { data: existingUser, error: fetchErr } = await this.supabaseClient
                .from("users")
                .select("*")
                .eq("wallet_address", walletAddress)
                .maybeSingle();

            if (existingUser) {
                // Update last login
                await this.supabaseClient
                    .from("users")
                    .update({ last_login: new Date().toISOString() })
                    .eq("wallet_address", walletAddress);
                return existingUser;
            } else {
                // Create new user record with unique wallet and integer lamports
                const defaultUsername = username || `punter_${walletAddress.slice(0, 5).toLowerCase()}`;
                const balanceLamports = this.solToLamports(balanceSol);
                const { data: newUser, error: insertErr } = await this.supabaseClient
                    .from("users")
                    .insert([{
                        wallet_address: walletAddress,
                        username: defaultUsername,
                        display_name: defaultUsername,
                        balance_lamports: balanceLamports,
                        last_login: new Date().toISOString()
                    }])
                    .select()
                    .single();

                if (insertErr) {
                    console.warn("Error creating cloud user record:", insertErr);
                }
                return newUser;
            }
        } catch (e) {
            console.error("syncUserAccount error:", e);
            return null;
        }
    },

    // 2. Load wagers for specific user wallet
    loadUserWagers: async function(walletAddress) {
        if (!walletAddress) return [];

        if (!this.isInitialized || !this.supabaseClient) {
            // LocalStorage fallback
            const key = `solplay_wagers_${walletAddress}`;
            const stored = localStorage.getItem(key);
            if (stored) {
                try {
                    return JSON.parse(stored);
                } catch (e) {
                    return [];
                }
            }
            return [];
        }

        try {
            const { data, error } = await this.supabaseClient
                .from("wagers")
                .select("*")
                .eq("user_wallet", walletAddress)
                .order("created_at", { ascending: false });

            if (error) {
                console.warn("Error fetching wagers from cloud DB, falling back to local:", error);
                return null;
            }

            // Map DB columns back to frontend wager format
            return data.map(dbWager => {
                const amount = dbWager.amount_lamports ? this.lamportsToSol(dbWager.amount_lamports) : parseFloat(dbWager.amount_sol || 0);
                const odds = dbWager.total_odds_bps ? (dbWager.total_odds_bps / 10000) : parseFloat(dbWager.total_odds || 1);
                const potentialPayout = dbWager.potential_payout_lamports ? this.lamportsToSol(dbWager.potential_payout_lamports) : parseFloat(dbWager.potential_payout || 0);

                return {
                    id: dbWager.id,
                    ticketId: dbWager.id,
                    txSignature: dbWager.tx_signature || null,
                    isAccumulator: dbWager.is_accumulator,
                    legsCount: dbWager.legs_count,
                    legs: dbWager.legs || [],
                    gameId: dbWager.game_id,
                    outcomeLabel: dbWager.outcome_label,
                    amount: amount,
                    amountLamports: dbWager.amount_lamports || this.solToLamports(amount),
                    odds: odds,
                    bonusPercent: dbWager.bonus_percent || 0,
                    potentialPayout: potentialPayout,
                    potentialPayoutLamports: dbWager.potential_payout_lamports || this.solToLamports(potentialPayout),
                    status: dbWager.status,
                    claimed: dbWager.claimed,
                    autoCashoutTarget: dbWager.auto_cashout_target_lamports ? this.lamportsToSol(dbWager.auto_cashout_target_lamports) : (dbWager.auto_cashout_target ? parseFloat(dbWager.auto_cashout_target) : null),
                    copyCreatorWallet: dbWager.copy_creator || ((dbWager.legs && dbWager.legs[0]) ? dbWager.legs[0].copyCreatorWallet : null),
                    timestamp: new Date(dbWager.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
            });
        } catch (e) {
            console.error("loadUserWagers error:", e);
            return null;
        }
    },

    // 3. Save new wager to cloud DB (with Idempotency + Lamport Precision)
    saveWager: async function(wager, walletAddress) {
        if (!wager || !walletAddress) return;

        if (this.isInitialized && this.supabaseClient) {
            try {
                // Ensure user exists first
                await this.syncUserAccount(walletAddress);

                const amountLamports = wager.amountLamports || this.solToLamports(wager.amount);
                const oddsBps = this.oddsToBps(wager.odds);
                const payoutLamports = wager.potentialPayoutLamports || this.solToLamports(wager.potentialPayout || (wager.amount * wager.odds));
                const autoCashoutLamports = wager.autoCashoutTarget ? this.solToLamports(wager.autoCashoutTarget) : null;

                const dbRecord = {
                    id: wager.ticketId || wager.id,
                    tx_signature: wager.txSignature || wager.signature || null,
                    user_wallet: walletAddress,
                    is_accumulator: Boolean(wager.isAccumulator),
                    legs_count: wager.legsCount || (wager.legs ? wager.legs.length : 1),
                    legs: (wager.legs || []).map(l => ({ ...l, copyCreatorWallet: wager.copyCreatorWallet || null })),
                    game_id: wager.gameId || null,
                    outcome_label: wager.outcomeLabel || 'Wager',
                    amount_lamports: amountLamports,
                    total_odds_bps: oddsBps,
                    bonus_percent: wager.bonusPercent || 0,
                    potential_payout_lamports: payoutLamports,
                    status: wager.status || 'PENDING',
                    auto_cashout_target_lamports: autoCashoutLamports,
                    copy_creator: wager.copyCreatorWallet || null,
                    claimed: Boolean(wager.claimed),
                    created_at: new Date().toISOString()
                };

                const { error } = await this.supabaseClient
                    .from("wagers")
                    .upsert([dbRecord], { onConflict: "id" });

                if (error) {
                    console.warn("Error saving wager to cloud DB:", error);
                } else {
                    console.log(`☁️ Wager ${dbRecord.id} synced with lamport precision to Cloud DB!`);
                }
            } catch (e) {
                console.error("saveWager error:", e);
            }
        }
    },

    // 4. Update settled wager status in cloud DB
    updateWagerStatus: async function(ticketId, newStatus) {
        if (!ticketId || !newStatus) return;

        if (this.isInitialized && this.supabaseClient) {
            try {
                const { error } = await this.supabaseClient
                    .from("wagers")
                    .update({ 
                        status: newStatus,
                        settled_at: new Date().toISOString()
                    })
                    .eq("id", ticketId);

                if (error) {
                    console.warn("Error updating wager status in cloud DB:", error);
                }
            } catch (e) {
                console.error("updateWagerStatus error:", e);
            }
        }
    },

    // 4b. Disburse payout and 2% creator royalties via atomic DB procedure
    payoutWager: async function(ticketId, winAmount, userWallet, creatorWallet = null) {
        if (!ticketId || !this.isInitialized || !this.supabaseClient) return;
        try {
            const winLamports = this.solToLamports(winAmount);

            // 1. Try atomic stored procedure first (prevents race conditions)
            const { data: rpcResult, error: rpcErr } = await this.supabaseClient
                .rpc("atomic_settle_wager", {
                    p_ticket_id: ticketId,
                    p_status: "WON",
                    p_win_payout_lamports: winLamports,
                    p_user_wallet: userWallet,
                    p_creator_wallet: creatorWallet
                });

            if (!rpcErr && rpcResult && rpcResult.success) {
                console.log(`⚡ Atomic settlement executed for ticket ${ticketId}!`, rpcResult);
                return;
            }

            // Fallback for setups before migration is run
            console.warn("Atomic RPC unavailable, using fallback settlement:", rpcErr);
            await this.supabaseClient
                .from("wagers")
                .update({ 
                    status: "WON", 
                    claimed: true, 
                    settled_at: new Date().toISOString() 
                })
                .eq("id", ticketId);

            if (userWallet && winLamports > 0) {
                const { data: user } = await this.supabaseClient
                    .from("users")
                    .select("balance_lamports, balance_sol")
                    .eq("wallet_address", userWallet)
                    .maybeSingle();

                if (user) {
                    const currentBal = user.balance_lamports ? Number(user.balance_lamports) : this.solToLamports(user.balance_sol || 0);
                    const newBal = currentBal + winLamports;
                    await this.supabaseClient
                        .from("users")
                        .update({ balance_lamports: newBal })
                        .eq("wallet_address", userWallet);
                    console.log(`💰 Winnings (${winAmount} SOL) credited to player ${userWallet}`);
                }
            }

            // 2% Creator Tipster Royalty
            if (creatorWallet && creatorWallet !== userWallet) {
                const royaltyLamports = Math.round(winLamports * 0.02);
                const { data: creator } = await this.supabaseClient
                    .from("users")
                    .select("balance_lamports, balance_sol")
                    .eq("wallet_address", creatorWallet)
                    .maybeSingle();
                if (creator) {
                    const currentCreatorBal = creator.balance_lamports ? Number(creator.balance_lamports) : this.solToLamports(creator.balance_sol || 0);
                    const newCreatorBal = currentCreatorBal + royaltyLamports;
                    await this.supabaseClient
                        .from("users")
                        .update({ balance_lamports: newCreatorBal })
                        .eq("wallet_address", creatorWallet);
                    console.log(`🎉 2% Tipster Royalty (${this.lamportsToSol(royaltyLamports)} SOL) credited to @${creatorWallet}`);
                }
            }
        } catch (e) {
            console.error("payoutWager error:", e);
        }
    },

    // 4c. Cash-out wager early in cloud DB (supports full and partial cash-out)
    cashoutWager: async function(ticketId, cashoutAmount, userWallet, isPartial = false, remainingStake = 0, remainingPayout = 0) {
        if (!ticketId || !this.isInitialized || !this.supabaseClient) return;
        try {
            const cashoutLamports = this.solToLamports(cashoutAmount);

            if (isPartial) {
                const remainingStakeLamports = this.solToLamports(remainingStake);
                const remainingPayoutLamports = this.solToLamports(remainingPayout);
                await this.supabaseClient
                    .from("wagers")
                    .update({ 
                        amount_lamports: remainingStakeLamports,
                        potential_payout_lamports: remainingPayoutLamports
                    })
                    .eq("id", ticketId);
            } else {
                await this.supabaseClient
                    .from("wagers")
                    .update({ 
                        status: "CASHED_OUT", 
                        claimed: true, 
                        potential_payout_lamports: cashoutLamports,
                        settled_at: new Date().toISOString() 
                    })
                    .eq("id", ticketId);
            }

            // Credit player balance
            if (userWallet && cashoutLamports > 0) {
                // Try atomic credit first
                const { error: creditErr } = await this.supabaseClient
                    .rpc("atomic_credit_balance", {
                        p_wallet: userWallet,
                        p_amount_lamports: cashoutLamports
                    });

                if (creditErr) {
                    // Fallback
                    const { data: user } = await this.supabaseClient
                        .from("users")
                        .select("balance_lamports, balance_sol")
                        .eq("wallet_address", userWallet)
                        .maybeSingle();

                    if (user) {
                        const currentBal = user.balance_lamports ? Number(user.balance_lamports) : this.solToLamports(user.balance_sol || 0);
                        const newBal = currentBal + cashoutLamports;
                        await this.supabaseClient
                            .from("users")
                            .update({ balance_lamports: newBal })
                            .eq("wallet_address", userWallet);
                    }
                }
                console.log(`💸 Cash-out (${cashoutAmount} SOL) credited to player ${userWallet}`);
            }
        } catch (e) {
            console.error("cashoutWager error:", e);
        }
    },

    // 5. Cloud betslip persistence
    saveBetslip: async function(walletAddress, selections, mode) {
        if (!walletAddress || !this.isInitialized || !this.supabaseClient) return;

        try {
            await this.supabaseClient
                .from("betslips")
                .upsert([{
                    user_wallet: walletAddress,
                    selections: selections || [],
                    betslip_mode: mode || 'accumulator',
                    updated_at: new Date().toISOString()
                }], { onConflict: "user_wallet" });
        } catch (e) {
            // Ignore background betslip sync error
        }
    },

    loadBetslip: async function(walletAddress) {
        if (!walletAddress || !this.isInitialized || !this.supabaseClient) return null;

        try {
            const { data, error } = await this.supabaseClient
                .from("betslips")
                .select("*")
                .eq("user_wallet", walletAddress)
                .maybeSingle();

            if (data && data.selections) {
                return {
                    selections: data.selections,
                    mode: data.betslip_mode || 'accumulator'
                };
            }
            return null;
        } catch (e) {
            return null;
        }
    }
};

// Export to window for global browser access (both casing conventions)
window.SolPlayDB = SolPlayDB;
window.solplayDB = SolPlayDB;

