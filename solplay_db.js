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
            return { wallet_address: walletAddress, balance_sol: balanceSol };
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
                // Create new user record with unique wallet
                const defaultUsername = username || `punter_${walletAddress.slice(0, 5).toLowerCase()}`;
                const { data: newUser, error: insertErr } = await this.supabaseClient
                    .from("users")
                    .insert([{
                        wallet_address: walletAddress,
                        username: defaultUsername,
                        display_name: defaultUsername,
                        balance_sol: balanceSol,
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
            return data.map(dbWager => ({
                id: dbWager.id,
                ticketId: dbWager.id,
                isAccumulator: dbWager.is_accumulator,
                legsCount: dbWager.legs_count,
                legs: dbWager.legs || [],
                gameId: dbWager.game_id,
                outcomeLabel: dbWager.outcome_label,
                amount: parseFloat(dbWager.amount_sol),
                odds: parseFloat(dbWager.total_odds),
                bonusPercent: dbWager.bonus_percent || 0,
                potentialPayout: parseFloat(dbWager.potential_payout),
                status: dbWager.status,
                claimed: dbWager.claimed,
                copyCreatorWallet: (dbWager.legs && dbWager.legs[0]) ? dbWager.legs[0].copyCreatorWallet : null,
                timestamp: new Date(dbWager.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }));
        } catch (e) {
            console.error("loadUserWagers error:", e);
            return null;
        }
    },

    // 3. Save new wager to cloud DB
    saveWager: async function(wager, walletAddress) {
        if (!wager || !walletAddress) return;

        if (this.isInitialized && this.supabaseClient) {
            try {
                // Ensure user exists first
                await this.syncUserAccount(walletAddress);

                const dbRecord = {
                    id: wager.ticketId || wager.id,
                    user_wallet: walletAddress,
                    is_accumulator: Boolean(wager.isAccumulator),
                    legs_count: wager.legsCount || (wager.legs ? wager.legs.length : 1),
                    legs: (wager.legs || []).map(l => ({ ...l, copyCreatorWallet: wager.copyCreatorWallet || null })),
                    game_id: wager.gameId || null,
                    outcome_label: wager.outcomeLabel || 'Wager',
                    amount_sol: wager.amount,
                    total_odds: wager.odds,
                    bonus_percent: wager.bonusPercent || 0,
                    potential_payout: wager.potentialPayout || (wager.amount * wager.odds),
                    status: wager.status || 'PENDING',
                    claimed: Boolean(wager.claimed),
                    created_at: new Date().toISOString()
                };

                const { error } = await this.supabaseClient
                    .from("wagers")
                    .upsert([dbRecord], { onConflict: "id" });

                if (error) {
                    console.warn("Error saving wager to cloud DB:", error);
                } else {
                    console.log(`☁️ Wager ${dbRecord.id} synced to Cloud Database!`);
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

    // 4b. Disburse payout and 2% creator royalties in cloud DB
    payoutWager: async function(ticketId, winAmount, userWallet, creatorWallet = null) {
        if (!ticketId || !this.isInitialized || !this.supabaseClient) return;
        try {
            // 1. Mark wager WON and claimed in DB
            await this.supabaseClient
                .from("wagers")
                .update({ 
                    status: "WON", 
                    claimed: true, 
                    settled_at: new Date().toISOString() 
                })
                .eq("id", ticketId);

            // 2. Credit player balance in Supabase users table
            if (userWallet && winAmount > 0) {
                const { data: user } = await this.supabaseClient
                    .from("users")
                    .select("balance_sol")
                    .eq("wallet_address", userWallet)
                    .maybeSingle();

                if (user) {
                    const newBal = parseFloat(user.balance_sol || 0) + parseFloat(winAmount);
                    await this.supabaseClient
                        .from("users")
                        .update({ balance_sol: newBal })
                        .eq("wallet_address", userWallet);
                    console.log(`💰 Winnings (${winAmount} SOL) credited to player ${userWallet}`);
                }
            }

            // 3. 2% Creator Tipster Royalty
            if (creatorWallet && creatorWallet !== userWallet) {
                const royalty = parseFloat(winAmount) * 0.02;
                const { data: creator } = await this.supabaseClient
                    .from("users")
                    .select("balance_sol")
                    .eq("wallet_address", creatorWallet)
                    .maybeSingle();
                if (creator) {
                    const newCreatorBal = parseFloat(creator.balance_sol || 0) + royalty;
                    await this.supabaseClient
                        .from("users")
                        .update({ balance_sol: newCreatorBal })
                        .eq("wallet_address", creatorWallet);
                    console.log(`🎉 2% Tipster Royalty (${royalty.toFixed(4)} SOL) credited to @${creatorWallet}`);
                }
            }
        } catch (e) {
            console.error("payoutWager error:", e);
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

// Export to window for global browser access
window.SolPlayDB = SolPlayDB;
