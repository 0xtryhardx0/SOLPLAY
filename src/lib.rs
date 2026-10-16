use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    pubkey::Pubkey,
    msg,
    program_error::ProgramError,
    program::invoke,
    system_instruction,
};

// ==============================================================================
// STATE STRUCTS
// ==============================================================================

pub struct PlatformState {
    pub admin: Pubkey,
    pub treasury: Pubkey,
    pub rake_basis_points: u16, // e.g. 150 = 1.5%
}

pub struct MarketAccount {
    pub game_id: u64,
    pub team_home: [u8; 16],
    pub team_away: [u8; 16],
    pub status: u8, // 0 = Active, 1 = Resolved, 2 = Refunded
    pub pool_home: u64,
    pub pool_away: u64,
    pub pool_draw: u64,
    pub outcome: u8, // 0 = Home, 1 = Away, 2 = Draw
}

pub struct WagerAccount {
    pub game_id: u64,
    pub bettor: Pubkey,
    pub prediction: u8, // 0 = Home, 1 = Away, 2 = Draw
    pub amount: u64,
    pub is_routed: u8, // 0 = Pool, 1 = Routed, 2 = Fixed-Odds against LP
    pub copy_creator: Pubkey, // default/zero if none
    pub claimed: u8, // 0 = No, 1 = Yes
    pub odds_basis_points: u64, // e.g. 21000 = 2.1x
}

pub struct LiquidityPoolAccount {
    pub total_pool_lamports: u64,
    pub total_lp_tokens: u64,
    pub reserved_liabilities: u64,
}

pub struct LpUserAccount {
    pub lp_tokens: u64,
}

pub struct MilestoneAccount {
    pub milestone_id: u64,
    pub bettor: Pubkey,
    pub watch_time_seconds: u32,
}

pub struct StreamAccount {
    pub stream_id: u64,
    pub name: [u8; 32],
    pub url: [u8; 128],
    pub region: [u8; 16],
    pub is_active: u8,
}

// ==============================================================================
// SECURITY AUDIT HELPERS & SAFE PARSERS
// ==============================================================================

#[inline(always)]
fn assert_owner(account: &AccountInfo, expected_owner: &Pubkey) -> ProgramResult {
    if account.owner != expected_owner {
        msg!("Security Error: Account {} owner mismatch. Expected: {}", account.key, expected_owner);
        return Err(ProgramError::IllegalOwner);
    }
    Ok(())
}

#[inline(always)]
fn parse_u64(slice: &[u8]) -> Result<u64, ProgramError> {
    slice.try_into()
        .map(u64::from_le_bytes)
        .map_err(|_| ProgramError::InvalidInstructionData)
}

#[inline(always)]
fn parse_u32(slice: &[u8]) -> Result<u32, ProgramError> {
    slice.try_into()
        .map(u32::from_le_bytes)
        .map_err(|_| ProgramError::InvalidInstructionData)
}

#[inline(always)]
fn parse_u16(slice: &[u8]) -> Result<u16, ProgramError> {
    slice.try_into()
        .map(u16::from_le_bytes)
        .map_err(|_| ProgramError::InvalidInstructionData)
}

// ==============================================================================
// ENTRYPOINT REGISTRATION
// ==============================================================================

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    if instruction_data.is_empty() {
        return Err(ProgramError::InvalidInstructionData);
    }

    let instruction_type = instruction_data[0];
    match instruction_type {
        0 => initialize_platform(program_id, accounts, &instruction_data[1..]),
        1 => create_market(program_id, accounts, &instruction_data[1..]),
        2 => place_wager(program_id, accounts, &instruction_data[1..]),
        3 => resolve_market(program_id, accounts, &instruction_data[1..]),
        4 => claim_winnings(program_id, accounts, &instruction_data[1..]),
        5 => record_milestone(program_id, accounts, &instruction_data[1..]),
        6 => register_stream(program_id, accounts, &instruction_data[1..]),
        7 => update_stream_url(program_id, accounts, &instruction_data[1..]),
        8 => toggle_stream_status(program_id, accounts, &instruction_data[1..]),
        9 => deposit_lp(program_id, accounts, &instruction_data[1..]),
        10 => withdraw_lp(program_id, accounts, &instruction_data[1..]),
        _ => {
            msg!("Error: Unknown instruction type");
            Err(ProgramError::InvalidInstructionData)
        }
    }
}

// ==============================================================================
// 0. INITIALIZE PLATFORM STATE
// ==============================================================================

fn initialize_platform(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    msg!("Instruction: Initialize Platform");
    let accounts_iter = &mut accounts.iter();
    let admin = next_account_info(accounts_iter)?;
    let platform_state_account = next_account_info(accounts_iter)?;
    let treasury = next_account_info(accounts_iter)?;

    if !admin.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Security Check: Owner verification
    assert_owner(platform_state_account, program_id)?;

    let rake = if data.len() >= 2 {
        parse_u16(&data[0..2])?
    } else {
        150 // default to 1.5%
    };

    let mut state_data = platform_state_account.try_borrow_mut_data()?;
    if state_data.len() < 66 {
        return Err(ProgramError::AccountDataTooSmall);
    }

    // Security Check: Unprotected Reinitialization Prevention (Admin Hijacking Prevention)
    if state_data[0..32] != [0u8; 32] {
        msg!("Security Error: Platform is already initialized");
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    // Manual serialize:
    // admin (32 bytes), treasury (32 bytes), rake (2 bytes) = 66 bytes
    state_data[0..32].copy_from_slice(admin.key.as_ref());
    state_data[32..64].copy_from_slice(treasury.key.as_ref());
    state_data[64..66].copy_from_slice(&rake.to_le_bytes());

    msg!("Platform initialized successfully. Treasury: {}", treasury.key);
    Ok(())
}

// ==============================================================================
// 1. CREATE MARKET
// ==============================================================================

fn create_market(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    msg!("Instruction: Create Market");
    let accounts_iter = &mut accounts.iter();
    let admin = next_account_info(accounts_iter)?;
    let market_account = next_account_info(accounts_iter)?;
    let platform_state_account = next_account_info(accounts_iter)?;

    if !admin.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Security Check: Owner verification
    assert_owner(platform_state_account, program_id)?;
    assert_owner(market_account, program_id)?;

    // Manual deserialize PlatformState:
    let state_data = platform_state_account.try_borrow_data()?;
    if state_data.len() < 66 {
        return Err(ProgramError::AccountDataTooSmall);
    }
    let mut admin_bytes = [0u8; 32];
    admin_bytes.copy_from_slice(&state_data[0..32]);
    let state_admin = Pubkey::new_from_array(admin_bytes);

    if state_admin != *admin.key {
        msg!("Error: Admin mismatch!");
        return Err(ProgramError::InvalidAccountData);
    }

    if data.len() < 40 {
        return Err(ProgramError::InvalidInstructionData);
    }

    let game_id = parse_u64(&data[0..8])?;
    if game_id == 0 {
        return Err(ProgramError::InvalidArgument);
    }
    let mut team_home = [0u8; 16];
    let mut team_away = [0u8; 16];
    team_home.copy_from_slice(&data[8..24]);
    team_away.copy_from_slice(&data[24..40]);

    let mut market_data = market_account.try_borrow_mut_data()?;
    if market_data.len() < 66 {
        return Err(ProgramError::AccountDataTooSmall);
    }

    // Security Check: Market Overwrite Protection
    let existing_game_id = parse_u64(&market_data[0..8])?;
    if existing_game_id != 0 {
        msg!("Security Error: Market account already initialized for game {}", existing_game_id);
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    // Manual serialize MarketAccount:
    market_data[0..8].copy_from_slice(&game_id.to_le_bytes());
    market_data[8..24].copy_from_slice(&team_home);
    market_data[24..40].copy_from_slice(&team_away);
    market_data[40] = 0; // status active
    market_data[41..49].copy_from_slice(&0u64.to_le_bytes()); // pool home
    market_data[49..57].copy_from_slice(&0u64.to_le_bytes()); // pool away
    market_data[57..65].copy_from_slice(&0u64.to_le_bytes()); // pool draw
    market_data[65] = 0; // outcome default

    msg!("Market created successfully for game ID: {}", game_id);
    Ok(())
}

// ==============================================================================
// 2. PLACE WAGER
// ==============================================================================

fn place_wager(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    msg!("Instruction: Place Wager");
    let accounts_iter = &mut accounts.iter();
    let bettor = next_account_info(accounts_iter)?;
    let market_account = next_account_info(accounts_iter)?;
    let wager_account = next_account_info(accounts_iter)?;
    let system_program = next_account_info(accounts_iter)?;

    if !bettor.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Security Check: Owner verification
    assert_owner(market_account, program_id)?;
    assert_owner(wager_account, program_id)?;

    if data.len() < 50 {
        return Err(ProgramError::InvalidInstructionData);
    }

    let game_id = parse_u64(&data[0..8])?;
    let prediction = data[8]; // 0=Home, 1=Away, 2=Draw
    if prediction > 2 {
        msg!("Security Error: Invalid prediction outcome {}", prediction);
        return Err(ProgramError::InvalidInstructionData);
    }

    let amount = parse_u64(&data[9..17])?;
    if amount == 0 {
        msg!("Security Error: Zero wager amount prohibited");
        return Err(ProgramError::InvalidArgument);
    }
    
    // Enforce 5 SOL soft-launch wager cap (5,000,000,000 lamports)
    if amount > 5_000_000_000 {
        msg!("Error: Wager amount exceeds the soft-launch cap of 5 SOL");
        return Err(ProgramError::InvalidArgument);
    }
    
    let is_routed = data[17]; // 0=Pool, 1=Routed, 2=Fixed-Odds against LP
    let mut copy_creator_bytes = [0u8; 32];
    copy_creator_bytes.copy_from_slice(&data[18..50]);

    let mut odds_basis_points = 0u64;
    if is_routed == 2 {
        if data.len() < 58 {
            return Err(ProgramError::InvalidInstructionData);
        }
        odds_basis_points = parse_u64(&data[50..58])?;

        // Security Check: Sanity bounds on odds (1.01x min to 50.0x max)
        if odds_basis_points < 10100 || odds_basis_points > 500_000 {
            msg!("Security Error: Odds basis points {} out of valid protocol range [10100, 500000]", odds_basis_points);
            return Err(ProgramError::InvalidArgument);
        }
    }

    // Scoped read check on Market
    {
        let market_data = market_account.try_borrow_data()?;
        if market_data.len() < 66 {
            return Err(ProgramError::AccountDataTooSmall);
        }
        let m_game_id = parse_u64(&market_data[0..8])?;
        let m_status = market_data[40];

        if m_game_id != game_id || m_status != 0 {
            return Err(ProgramError::InvalidAccountData);
        }
    }

    // If Fixed-Odds against LP, reserve liability from the Liquidity Pool
    if is_routed == 2 {
        let lp_pool_account = next_account_info(accounts_iter)?;
        assert_owner(lp_pool_account, program_id)?;

        let mut pool_data = lp_pool_account.try_borrow_mut_data()?;
        if pool_data.len() < 24 {
            return Err(ProgramError::AccountDataTooSmall);
        }
        let total_pool_lamports = parse_u64(&pool_data[0..8])?;
        let _total_lp_tokens = parse_u64(&pool_data[8..16])?;
        let mut reserved_liabilities = parse_u64(&pool_data[16..24])?;

        let liability = (amount as u128)
            .saturating_mul((odds_basis_points - 10000) as u128)
            .saturating_div(10000) as u64;

        if total_pool_lamports < reserved_liabilities.saturating_add(liability) {
            msg!("Error: Insufficient liquidity pool reserves to back this wager");
            return Err(ProgramError::InsufficientFunds);
        }

        reserved_liabilities = reserved_liabilities.saturating_add(liability);
        pool_data[16..24].copy_from_slice(&reserved_liabilities.to_le_bytes());
        msg!("Reserved liability of {} lamports from LP pool {}", liability, lp_pool_account.key);
    }

    // Escrow funds into the Market Account
    let transfer_ix = system_instruction::transfer(
        bettor.key,
        market_account.key,
        amount,
    );
    invoke(
        &transfer_ix,
        &[bettor.clone(), market_account.clone(), system_program.clone()],
    )?;

    // Scoped write update for Pool Wagering
    if is_routed == 0 {
        let mut market_data = market_account.try_borrow_mut_data()?;
        let mut pool_home = parse_u64(&market_data[41..49])?;
        let mut pool_away = parse_u64(&market_data[49..57])?;
        let mut pool_draw = parse_u64(&market_data[57..65])?;

        match prediction {
            0 => pool_home = pool_home.saturating_add(amount),
            1 => pool_away = pool_away.saturating_add(amount),
            2 => pool_draw = pool_draw.saturating_add(amount),
            _ => return Err(ProgramError::InvalidInstructionData),
        }

        market_data[41..49].copy_from_slice(&pool_home.to_le_bytes());
        market_data[49..57].copy_from_slice(&pool_away.to_le_bytes());
        market_data[57..65].copy_from_slice(&pool_draw.to_le_bytes());
    }

    // Wager Account Overwrite Protection
    let mut wager_data = wager_account.try_borrow_mut_data()?;
    if wager_data.len() < 91 {
        return Err(ProgramError::AccountDataTooSmall);
    }
    if wager_data[8..40] != [0u8; 32] {
        msg!("Security Error: Wager account already in use");
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    wager_data[0..8].copy_from_slice(&game_id.to_le_bytes());
    wager_data[8..40].copy_from_slice(bettor.key.as_ref());
    wager_data[40] = prediction;
    wager_data[41..49].copy_from_slice(&amount.to_le_bytes());
    wager_data[49] = is_routed;
    wager_data[50..82].copy_from_slice(&copy_creator_bytes);
    wager_data[82] = 0; // claimed active
    wager_data[83..91].copy_from_slice(&odds_basis_points.to_le_bytes());

    msg!("Wager placed successfully. Amount: {} lamports", amount);
    Ok(())
}

// ==============================================================================
// 3. RESOLVE MARKET
// ==============================================================================

fn resolve_market(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    msg!("Instruction: Resolve Market");
    let accounts_iter = &mut accounts.iter();
    let admin = next_account_info(accounts_iter)?;
    let market_account = next_account_info(accounts_iter)?;
    let platform_state_account = next_account_info(accounts_iter)?;

    if !admin.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Security Check: Owner verification
    assert_owner(platform_state_account, program_id)?;
    assert_owner(market_account, program_id)?;

    // Manual deserialize PlatformState
    let state_data = platform_state_account.try_borrow_data()?;
    if state_data.len() < 66 {
        return Err(ProgramError::AccountDataTooSmall);
    }
    let mut admin_bytes = [0u8; 32];
    admin_bytes.copy_from_slice(&state_data[0..32]);
    let state_admin = Pubkey::new_from_array(admin_bytes);

    if state_admin != *admin.key {
        return Err(ProgramError::InvalidAccountData);
    }

    if data.len() < 9 {
        return Err(ProgramError::InvalidInstructionData);
    }

    let game_id = parse_u64(&data[0..8])?;
    let outcome = data[8]; // 0=Home, 1=Away, 2=Draw
    if outcome > 2 {
        msg!("Security Error: Invalid match outcome {}", outcome);
        return Err(ProgramError::InvalidInstructionData);
    }

    // Manual deserialize/update MarketAccount
    let mut market_data = market_account.try_borrow_mut_data()?;
    if market_data.len() < 66 {
        return Err(ProgramError::AccountDataTooSmall);
    }
    let m_game_id = parse_u64(&market_data[0..8])?;
    let m_status = market_data[40];

    if m_game_id != game_id || m_status != 0 {
        return Err(ProgramError::InvalidAccountData);
    }

    market_data[40] = 1; // Resolved
    market_data[65] = outcome; // Outcome

    msg!("Market resolved. Outcome: {}", outcome);
    Ok(())
}

// ==============================================================================
// 4. CLAIM WINNINGS
// ==============================================================================

fn claim_winnings(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    msg!("Instruction: Claim Winnings");
    let accounts_iter = &mut accounts.iter();
    let bettor = next_account_info(accounts_iter)?;
    let market_account = next_account_info(accounts_iter)?;
    let wager_account = next_account_info(accounts_iter)?;
    let platform_state_account = next_account_info(accounts_iter)?;
    let treasury_account = next_account_info(accounts_iter)?;
    let copy_creator_account = next_account_info(accounts_iter)?;

    // Security Check: Owner verification
    assert_owner(market_account, program_id)?;
    assert_owner(wager_account, program_id)?;
    assert_owner(platform_state_account, program_id)?;

    // Manual deserialize WagerAccount:
    let mut wager_data = wager_account.try_borrow_mut_data()?;
    if wager_data.len() < 83 {
        return Err(ProgramError::AccountDataTooSmall);
    }
    let w_game_id = parse_u64(&wager_data[0..8])?;
    let mut w_bettor_bytes = [0u8; 32];
    w_bettor_bytes.copy_from_slice(&wager_data[8..40]);
    let w_bettor = Pubkey::new_from_array(w_bettor_bytes);
    let w_prediction = wager_data[40];
    let w_amount = parse_u64(&wager_data[41..49])?;
    let w_is_routed = wager_data[49];
    let mut w_copy_creator_bytes = [0u8; 32];
    w_copy_creator_bytes.copy_from_slice(&wager_data[50..82]);
    let w_copy_creator = Pubkey::new_from_array(w_copy_creator_bytes);
    let w_claimed = wager_data[82];

    let mut odds_basis_points = 0u64;
    if wager_data.len() >= 91 {
        odds_basis_points = parse_u64(&wager_data[83..91])?;
    }

    if w_bettor != *bettor.key || w_claimed != 0 {
        return Err(ProgramError::InvalidAccountData);
    }

    // Manual deserialize MarketAccount:
    let market_data = market_account.try_borrow_data()?;
    if market_data.len() < 66 {
        return Err(ProgramError::AccountDataTooSmall);
    }
    let m_game_id = parse_u64(&market_data[0..8])?;
    let m_status = market_data[40];
    let m_pool_home = parse_u64(&market_data[41..49])?;
    let m_pool_away = parse_u64(&market_data[49..57])?;
    let m_pool_draw = parse_u64(&market_data[57..65])?;
    let m_outcome = market_data[65];

    if m_game_id != w_game_id || m_status != 1 {
        return Err(ProgramError::InvalidAccountData);
    }

    // Manual deserialize PlatformState:
    let state_data = platform_state_account.try_borrow_data()?;
    if state_data.len() < 66 {
        return Err(ProgramError::AccountDataTooSmall);
    }
    let mut state_treasury_bytes = [0u8; 32];
    state_treasury_bytes.copy_from_slice(&state_data[32..64]);
    let state_treasury = Pubkey::new_from_array(state_treasury_bytes);
    let state_rake_basis_points = parse_u16(&state_data[64..66])?;

    if state_treasury != *treasury_account.key {
        return Err(ProgramError::InvalidAccountData);
    }

    if data.len() < 8 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let game_id = parse_u64(&data[0..8])?;
    if game_id != m_game_id {
        return Err(ProgramError::InvalidAccountData);
    }

    // Checks-Effects-Interactions: Mark claimed BEFORE transferring any lamports!
    wager_data[82] = 1;

    let did_win = w_prediction == m_outcome;

    if w_is_routed == 2 {
        let lp_pool_account = next_account_info(accounts_iter)?;
        assert_owner(lp_pool_account, program_id)?;

        if odds_basis_points < 10000 {
            return Err(ProgramError::InvalidArgument);
        }
        let liability = (w_amount as u128)
            .saturating_mul((odds_basis_points - 10000) as u128)
            .saturating_div(10000) as u64;

        if did_win {
            // Transfer liability from LP pool to Market Account escrow
            if lp_pool_account.lamports() < liability {
                return Err(ProgramError::InsufficientFunds);
            }
            **lp_pool_account.lamports.borrow_mut() = lp_pool_account.lamports().saturating_sub(liability);
            **market_account.lamports.borrow_mut() = market_account.lamports().saturating_add(liability);

            // Calculate fees on winnings (rake and copy creator)
            let platform_rake = liability.saturating_mul(state_rake_basis_points as u64).saturating_div(10000);
            let mut copy_commission = 0u64;
            let has_copy = w_copy_creator != Pubkey::default() && *copy_creator_account.key == w_copy_creator;
            if has_copy {
                copy_commission = liability.saturating_mul(200).saturating_div(10000);
            }

            let net_payout = w_amount.saturating_add(liability).saturating_sub(platform_rake).saturating_sub(copy_commission);

            if platform_rake > 0 {
                **market_account.lamports.borrow_mut() = market_account.lamports().saturating_sub(platform_rake);
                **treasury_account.lamports.borrow_mut() = treasury_account.lamports().saturating_add(platform_rake);
            }
            if copy_commission > 0 && has_copy {
                **market_account.lamports.borrow_mut() = market_account.lamports().saturating_sub(copy_commission);
                **copy_creator_account.lamports.borrow_mut() = copy_creator_account.lamports().saturating_add(copy_commission);
            }

            **market_account.lamports.borrow_mut() = market_account.lamports().saturating_sub(net_payout);
            **bettor.lamports.borrow_mut() = bettor.lamports().saturating_add(net_payout);
            msg!("Paid net fixed-odds winnings: {} lamports to winner: {}", net_payout, bettor.key);

            // Update LP Pool State
            let mut pool_data = lp_pool_account.try_borrow_mut_data()?;
            if pool_data.len() < 24 {
                return Err(ProgramError::AccountDataTooSmall);
            }
            let mut total_pool_lamports = parse_u64(&pool_data[0..8])?;
            let mut reserved_liabilities = parse_u64(&pool_data[16..24])?;

            total_pool_lamports = total_pool_lamports.saturating_sub(liability);
            reserved_liabilities = reserved_liabilities.saturating_sub(liability);

            pool_data[0..8].copy_from_slice(&total_pool_lamports.to_le_bytes());
            pool_data[16..24].copy_from_slice(&reserved_liabilities.to_le_bytes());
        } else {
            // Bettor lost. Move wager amount from Market Account to LP Pool Account
            if market_account.lamports() < w_amount {
                return Err(ProgramError::InsufficientFunds);
            }
            **market_account.lamports.borrow_mut() = market_account.lamports().saturating_sub(w_amount);
            **lp_pool_account.lamports.borrow_mut() = lp_pool_account.lamports().saturating_add(w_amount);

            // Update LP Pool State
            let mut pool_data = lp_pool_account.try_borrow_mut_data()?;
            if pool_data.len() < 24 {
                return Err(ProgramError::AccountDataTooSmall);
            }
            let mut total_pool_lamports = parse_u64(&pool_data[0..8])?;
            let mut reserved_liabilities = parse_u64(&pool_data[16..24])?;

            total_pool_lamports = total_pool_lamports.saturating_add(w_amount);
            reserved_liabilities = reserved_liabilities.saturating_sub(liability);

            pool_data[0..8].copy_from_slice(&total_pool_lamports.to_le_bytes());
            pool_data[16..24].copy_from_slice(&reserved_liabilities.to_le_bytes());
            msg!("Bettor lost. Transferred {} lamports to LP pool", w_amount);
        }
    } else {
        // Pari-Mutuel Settlement logic
        let winning_pool_size = match m_outcome {
            0 => m_pool_home,
            1 => m_pool_away,
            2 => m_pool_draw,
            _ => 0,
        };

        if winning_pool_size == 0 {
            msg!("Platform Sweep Triggered: No wagers on outcome.");
            let total_escrow = market_account.lamports();
            let sweep_amount = total_escrow.saturating_div(2);
            
            **market_account.lamports.borrow_mut() = market_account.lamports().saturating_sub(sweep_amount);
            **treasury_account.lamports.borrow_mut() = treasury_account.lamports().saturating_add(sweep_amount);
            
            msg!("Swept {} lamports to treasury.", sweep_amount);
            return Ok(());
        }

        if did_win {
            let total_pool = m_pool_home.saturating_add(m_pool_away).saturating_add(m_pool_draw);
            let gross_payout = (w_amount as u128)
                .saturating_mul(total_pool as u128)
                .saturating_div(winning_pool_size as u128) as u64;

            let platform_rake = gross_payout.saturating_mul(state_rake_basis_points as u64).saturating_div(10000);
            
            let mut copy_commission = 0u64;
            let has_copy = w_copy_creator != Pubkey::default() && *copy_creator_account.key == w_copy_creator;
            if has_copy {
                copy_commission = gross_payout.saturating_mul(200).saturating_div(10000);
            }

            let net_payout = gross_payout
                .saturating_sub(platform_rake)
                .saturating_sub(copy_commission);

            if platform_rake > 0 {
                **market_account.lamports.borrow_mut() = market_account.lamports().saturating_sub(platform_rake);
                **treasury_account.lamports.borrow_mut() = treasury_account.lamports().saturating_add(platform_rake);
            }
            if copy_commission > 0 && has_copy {
                **market_account.lamports.borrow_mut() = market_account.lamports().saturating_sub(copy_commission);
                **copy_creator_account.lamports.borrow_mut() = copy_creator_account.lamports().saturating_add(copy_commission);
                msg!("Paid 2% commission to copy creator: {}", copy_creator_account.key);
            }

            **market_account.lamports.borrow_mut() = market_account.lamports().saturating_sub(net_payout);
            **bettor.lamports.borrow_mut() = bettor.lamports().saturating_add(net_payout);
            msg!("Paid {} lamports to winner: {}", net_payout, bettor.key);
        } else {
            msg!("Wager is not a winner.");
        }
    }

    Ok(())
}

// ==============================================================================
// 5. RECORD VIEWER MILESTONE
// ==============================================================================

fn record_milestone(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    msg!("Instruction: Record Viewer Milestone");
    let accounts_iter = &mut accounts.iter();
    let bettor = next_account_info(accounts_iter)?;
    let milestone_account = next_account_info(accounts_iter)?;

    if !bettor.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    assert_owner(milestone_account, program_id)?;

    if data.len() < 12 {
        return Err(ProgramError::InvalidInstructionData);
    }

    let milestone_id = parse_u64(&data[0..8])?;
    let watch_time_seconds = parse_u32(&data[8..12])?;

    let mut milestone_data = milestone_account.try_borrow_mut_data()?;
    if milestone_data.len() < 44 {
        return Err(ProgramError::AccountDataTooSmall);
    }

    milestone_data[0..8].copy_from_slice(&milestone_id.to_le_bytes());
    milestone_data[8..40].copy_from_slice(bettor.key.as_ref());
    milestone_data[40..44].copy_from_slice(&watch_time_seconds.to_le_bytes());

    msg!("Viewer milestone registered. ID: {}, Seconds: {}", milestone_id, watch_time_seconds);
    Ok(())
}

// ==============================================================================
// 6. REGISTER STREAM
// ==============================================================================

fn register_stream(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    msg!("Instruction: Register Stream");
    let accounts_iter = &mut accounts.iter();
    let admin = next_account_info(accounts_iter)?;
    let stream_account = next_account_info(accounts_iter)?;
    let platform_state_account = next_account_info(accounts_iter)?;

    if !admin.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    assert_owner(platform_state_account, program_id)?;
    assert_owner(stream_account, program_id)?;

    let state_data = platform_state_account.try_borrow_data()?;
    if state_data.len() < 66 {
        return Err(ProgramError::AccountDataTooSmall);
    }
    let mut admin_bytes = [0u8; 32];
    admin_bytes.copy_from_slice(&state_data[0..32]);
    let state_admin = Pubkey::new_from_array(admin_bytes);

    if state_admin != *admin.key {
        return Err(ProgramError::InvalidAccountData);
    }

    if data.len() < 185 {
        return Err(ProgramError::InvalidInstructionData);
    }

    let stream_id = parse_u64(&data[0..8])?;

    let mut stream_data = stream_account.try_borrow_mut_data()?;
    if stream_data.len() < 185 {
        return Err(ProgramError::AccountDataTooSmall);
    }

    stream_data[0..185].copy_from_slice(&data[0..185]);
    msg!("Stream registered successfully. ID: {}", stream_id);
    Ok(())
}

// ==============================================================================
// 7. UPDATE STREAM URL
// ==============================================================================

fn update_stream_url(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    msg!("Instruction: Update Stream URL");
    let accounts_iter = &mut accounts.iter();
    let admin = next_account_info(accounts_iter)?;
    let stream_account = next_account_info(accounts_iter)?;
    let platform_state_account = next_account_info(accounts_iter)?;

    if !admin.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    assert_owner(platform_state_account, program_id)?;
    assert_owner(stream_account, program_id)?;

    let state_data = platform_state_account.try_borrow_data()?;
    if state_data.len() < 66 {
        return Err(ProgramError::AccountDataTooSmall);
    }
    let mut admin_bytes = [0u8; 32];
    admin_bytes.copy_from_slice(&state_data[0..32]);
    let state_admin = Pubkey::new_from_array(admin_bytes);

    if state_admin != *admin.key {
        return Err(ProgramError::InvalidAccountData);
    }

    if data.len() < 136 { // 8 (id) + 128 (url)
        return Err(ProgramError::InvalidInstructionData);
    }

    let stream_id = parse_u64(&data[0..8])?;
    let mut stream_data = stream_account.try_borrow_mut_data()?;
    if stream_data.len() < 185 {
        return Err(ProgramError::AccountDataTooSmall);
    }

    let current_id = parse_u64(&stream_data[0..8])?;
    if current_id != stream_id {
        return Err(ProgramError::InvalidAccountData);
    }

    // Copy new URL into stream state (offset 40 to 168)
    stream_data[40..168].copy_from_slice(&data[8..136]);
    msg!("Stream URL updated successfully for ID: {}", stream_id);
    Ok(())
}

// ==============================================================================
// 8. TOGGLE STREAM STATUS
// ==============================================================================

fn toggle_stream_status(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    msg!("Instruction: Toggle Stream Status");
    let accounts_iter = &mut accounts.iter();
    let admin = next_account_info(accounts_iter)?;
    let stream_account = next_account_info(accounts_iter)?;
    let platform_state_account = next_account_info(accounts_iter)?;

    if !admin.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    assert_owner(platform_state_account, program_id)?;
    assert_owner(stream_account, program_id)?;

    let state_data = platform_state_account.try_borrow_data()?;
    if state_data.len() < 66 {
        return Err(ProgramError::AccountDataTooSmall);
    }
    let mut admin_bytes = [0u8; 32];
    admin_bytes.copy_from_slice(&state_data[0..32]);
    let state_admin = Pubkey::new_from_array(admin_bytes);

    if state_admin != *admin.key {
        return Err(ProgramError::InvalidAccountData);
    }

    if data.len() < 9 { // 8 (id) + 1 (status)
        return Err(ProgramError::InvalidInstructionData);
    }

    let stream_id = parse_u64(&data[0..8])?;
    let new_status = data[8];

    let mut stream_data = stream_account.try_borrow_mut_data()?;
    if stream_data.len() < 185 {
        return Err(ProgramError::AccountDataTooSmall);
    }

    let current_id = parse_u64(&stream_data[0..8])?;
    if current_id != stream_id {
        return Err(ProgramError::InvalidAccountData);
    }

    stream_data[184] = new_status;
    msg!("Stream ID {} status toggled to: {}", stream_id, new_status);
    Ok(())
}

// ==============================================================================
// 9. DEPOSIT LP (BE THE HOUSE)
// ==============================================================================

fn deposit_lp(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    msg!("Instruction: Deposit LP");
    let accounts_iter = &mut accounts.iter();
    let depositor = next_account_info(accounts_iter)?;
    let lp_pool_account = next_account_info(accounts_iter)?;
    let lp_user_account = next_account_info(accounts_iter)?;
    let system_program = next_account_info(accounts_iter)?;

    if !depositor.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    assert_owner(lp_pool_account, program_id)?;
    assert_owner(lp_user_account, program_id)?;

    if data.len() < 8 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let amount = parse_u64(&data[0..8])?;
    if amount == 0 {
        return Err(ProgramError::InvalidArgument);
    }

    // Transfer lamports from depositor to lp_pool_account
    let transfer_ix = system_instruction::transfer(
        depositor.key,
        lp_pool_account.key,
        amount,
    );
    invoke(
        &transfer_ix,
        &[depositor.clone(), lp_pool_account.clone(), system_program.clone()],
    )?;

    // Update LP Pool State
    let mut pool_data = lp_pool_account.try_borrow_mut_data()?;
    if pool_data.len() < 24 {
        return Err(ProgramError::AccountDataTooSmall);
    }
    let mut total_pool_lamports = parse_u64(&pool_data[0..8])?;
    let mut total_lp_tokens = parse_u64(&pool_data[8..16])?;
    let reserved_liabilities = parse_u64(&pool_data[16..24])?;

    let lp_tokens_to_mint = if total_lp_tokens == 0 {
        amount
    } else {
        (amount as u128)
            .saturating_mul(total_lp_tokens as u128)
            .saturating_div(total_pool_lamports as u128) as u64
    };

    total_pool_lamports = total_pool_lamports.saturating_add(amount);
    total_lp_tokens = total_lp_tokens.saturating_add(lp_tokens_to_mint);

    pool_data[0..8].copy_from_slice(&total_pool_lamports.to_le_bytes());
    pool_data[8..16].copy_from_slice(&total_lp_tokens.to_le_bytes());
    pool_data[16..24].copy_from_slice(&reserved_liabilities.to_le_bytes());

    // Update User LP State
    let mut user_data = lp_user_account.try_borrow_mut_data()?;
    if user_data.len() < 8 {
        return Err(ProgramError::AccountDataTooSmall);
    }
    let mut user_lp_tokens = parse_u64(&user_data[0..8])?;
    user_lp_tokens = user_lp_tokens.saturating_add(lp_tokens_to_mint);
    user_data[0..8].copy_from_slice(&user_lp_tokens.to_le_bytes());

    msg!("Deposited {} lamports. Minted {} LP tokens.", amount, lp_tokens_to_mint);
    Ok(())
}

// ==============================================================================
// 10. WITHDRAW LP
// ==============================================================================

fn withdraw_lp(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    msg!("Instruction: Withdraw LP");
    let accounts_iter = &mut accounts.iter();
    let depositor = next_account_info(accounts_iter)?;
    let lp_pool_account = next_account_info(accounts_iter)?;
    let lp_user_account = next_account_info(accounts_iter)?;

    if !depositor.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    assert_owner(lp_pool_account, program_id)?;
    assert_owner(lp_user_account, program_id)?;

    if data.len() < 8 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let lp_tokens_to_burn = parse_u64(&data[0..8])?;
    if lp_tokens_to_burn == 0 {
        return Err(ProgramError::InvalidArgument);
    }

    // Check user has enough LP tokens
    let mut user_data = lp_user_account.try_borrow_mut_data()?;
    if user_data.len() < 8 {
        return Err(ProgramError::AccountDataTooSmall);
    }
    let mut user_lp_tokens = parse_u64(&user_data[0..8])?;
    if user_lp_tokens < lp_tokens_to_burn {
        return Err(ProgramError::InvalidArgument);
    }

    // Read LP Pool State
    let mut pool_data = lp_pool_account.try_borrow_mut_data()?;
    if pool_data.len() < 24 {
        return Err(ProgramError::AccountDataTooSmall);
    }
    let mut total_pool_lamports = parse_u64(&pool_data[0..8])?;
    let mut total_lp_tokens = parse_u64(&pool_data[8..16])?;
    let reserved_liabilities = parse_u64(&pool_data[16..24])?;

    if total_lp_tokens == 0 {
        return Err(ProgramError::InvalidArgument);
    }

    // Calculate SOL amount to return
    let sol_to_return = (lp_tokens_to_burn as u128)
        .saturating_mul(total_pool_lamports as u128)
        .saturating_div(total_lp_tokens as u128) as u64;

    // Check pool has enough available liquidity (subtracting locked liabilities)
    let available_liquidity = total_pool_lamports.saturating_sub(reserved_liabilities);
    if sol_to_return > available_liquidity {
        msg!("Error: Withdrawal amount exceeds available unreserved pool liquidity.");
        return Err(ProgramError::InsufficientFunds);
    }

    // Transfer SOL from pool to depositor
    if sol_to_return > lp_pool_account.lamports() {
        return Err(ProgramError::InsufficientFunds);
    }

    **lp_pool_account.lamports.borrow_mut() = lp_pool_account.lamports().saturating_sub(sol_to_return);
    **depositor.lamports.borrow_mut() = depositor.lamports().saturating_add(sol_to_return);

    // Update States
    total_pool_lamports = total_pool_lamports.saturating_sub(sol_to_return);
    total_lp_tokens = total_lp_tokens.saturating_sub(lp_tokens_to_burn);
    user_lp_tokens = user_lp_tokens.saturating_sub(lp_tokens_to_burn);

    pool_data[0..8].copy_from_slice(&total_pool_lamports.to_le_bytes());
    pool_data[8..16].copy_from_slice(&total_lp_tokens.to_le_bytes());
    pool_data[16..24].copy_from_slice(&reserved_liabilities.to_le_bytes());
    user_data[0..8].copy_from_slice(&user_lp_tokens.to_le_bytes());

    msg!("Withdrew {} lamports. Burned {} LP tokens.", sol_to_return, lp_tokens_to_burn);
    Ok(())
}
