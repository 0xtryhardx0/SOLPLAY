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

// Define State Structs
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
    pub is_routed: u8, // 0 = Pool, 1 = Routed
    pub copy_creator: Pubkey, // default/zero if none
    pub claimed: u8, // 0 = No, 1 = Yes
}

pub struct MilestoneAccount {
    pub milestone_id: u64,
    pub bettor: Pubkey,
    pub watch_time_seconds: u32,
}

// Entrypoint Registration
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
        _ => {
            msg!("Error: Unknown instruction type");
            Err(ProgramError::InvalidInstructionData)
        }
    }
}

// 0. Initialize Platform State
fn initialize_platform(
    _program_id: &Pubkey,
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

    let rake = if data.len() >= 2 {
        u16::from_le_bytes([data[0], data[1]])
    } else {
        150 // default to 1.5%
    };

    let mut state_data = platform_state_account.try_borrow_mut_data()?;
    msg!("InitializePlatform: state_data.len() = {}", state_data.len());
    if state_data.len() < 66 {
        return Err(ProgramError::AccountDataTooSmall);
    }

    // Manual serialize:
    // admin (32 bytes), treasury (32 bytes), rake (2 bytes) = 66 bytes
    state_data[0..32].copy_from_slice(admin.key.as_ref());
    state_data[32..64].copy_from_slice(treasury.key.as_ref());
    state_data[64..66].copy_from_slice(&rake.to_le_bytes());

    msg!("Platform initialized successfully. Treasury: {}", treasury.key);
    Ok(())
}

// 1. Create Market
fn create_market(
    _program_id: &Pubkey,
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

    // Manual deserialize PlatformState:
    let state_data = platform_state_account.try_borrow_data()?;
    if state_data.len() < 66 {
        return Err(ProgramError::AccountDataTooSmall);
    }
    let mut admin_bytes = [0u8; 32];
    admin_bytes.copy_from_slice(&state_data[0..32]);
    let state_admin = Pubkey::new_from_array(admin_bytes);

    msg!("CreateMarket Admin: {}", admin.key);
    msg!("PlatformState Admin in account: {}", state_admin);

    if state_admin != *admin.key {
        msg!("Error: Admin mismatch!");
        return Err(ProgramError::InvalidAccountData);
    }

    if data.len() < 40 {
        return Err(ProgramError::InvalidInstructionData);
    }

    let game_id = u64::from_le_bytes(data[0..8].try_into().unwrap());
    let mut team_home = [0u8; 16];
    let mut team_away = [0u8; 16];
    team_home.copy_from_slice(&data[8..24]);
    team_away.copy_from_slice(&data[24..40]);

    let mut market_data = market_account.try_borrow_mut_data()?;
    if market_data.len() < 66 {
        return Err(ProgramError::AccountDataTooSmall);
    }

    // Manual serialize MarketAccount:
    // game_id(8) + home(16) + away(16) + status(1) + pool_home(8) + pool_away(8) + pool_draw(8) + outcome(1) = 66 bytes
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

// 2. Place Wager
fn place_wager(
    _program_id: &Pubkey,
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

    if data.len() < 50 {
        return Err(ProgramError::InvalidInstructionData);
    }

    let game_id = u64::from_le_bytes(data[0..8].try_into().unwrap());
    let prediction = data[8]; // 0=Home, 1=Away, 2=Draw
    let amount = u64::from_le_bytes(data[9..17].try_into().unwrap());
    let is_routed = data[17]; // 0=Pool, 1=Routed
    let mut copy_creator_bytes = [0u8; 32];
    copy_creator_bytes.copy_from_slice(&data[18..50]);

    // Scoped read check
    {
        let market_data = market_account.try_borrow_data()?;
        if market_data.len() < 66 {
            return Err(ProgramError::AccountDataTooSmall);
        }
        let m_game_id = u64::from_le_bytes(market_data[0..8].try_into().unwrap());
        let m_status = market_data[40];

        if m_game_id != game_id || m_status != 0 {
            return Err(ProgramError::InvalidAccountData);
        }
    }

    // Escrow funds into the Market Account (borrow released)
    let transfer_ix = system_instruction::transfer(
        bettor.key,
        market_account.key,
        amount,
    );
    invoke(
        &transfer_ix,
        &[bettor.clone(), market_account.clone(), system_program.clone()],
    )?;

    // Scoped write update
    if is_routed == 0 {
        let mut market_data = market_account.try_borrow_mut_data()?;
        let mut pool_home = u64::from_le_bytes(market_data[41..49].try_into().unwrap());
        let mut pool_away = u64::from_le_bytes(market_data[49..57].try_into().unwrap());
        let mut pool_draw = u64::from_le_bytes(market_data[57..65].try_into().unwrap());

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

    // Manual serialize WagerAccount:
    // game_id(8) + bettor(32) + prediction(1) + amount(8) + is_routed(1) + copy_creator(32) + claimed(1) = 83 bytes
    let mut wager_data = wager_account.try_borrow_mut_data()?;
    if wager_data.len() < 83 {
        return Err(ProgramError::AccountDataTooSmall);
    }
    wager_data[0..8].copy_from_slice(&game_id.to_le_bytes());
    wager_data[8..40].copy_from_slice(bettor.key.as_ref());
    wager_data[40] = prediction;
    wager_data[41..49].copy_from_slice(&amount.to_le_bytes());
    wager_data[49] = is_routed;
    wager_data[50..82].copy_from_slice(&copy_creator_bytes);
    wager_data[82] = 0; // claimed active

    msg!("Wager placed successfully. Amount: {} lamports", amount);
    Ok(())
}

// 3. Resolve Market
fn resolve_market(
    _program_id: &Pubkey,
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

    let game_id = u64::from_le_bytes(data[0..8].try_into().unwrap());
    let outcome = data[8]; // 0=Home, 1=Away, 2=Draw

    // Manual deserialize/update MarketAccount
    let mut market_data = market_account.try_borrow_mut_data()?;
    if market_data.len() < 66 {
        return Err(ProgramError::AccountDataTooSmall);
    }
    let m_game_id = u64::from_le_bytes(market_data[0..8].try_into().unwrap());
    let m_status = market_data[40];

    if m_game_id != game_id || m_status != 0 {
        return Err(ProgramError::InvalidAccountData);
    }

    market_data[40] = 1; // Resolved
    market_data[65] = outcome; // Outcome

    msg!("Market resolved. Outcome: {}", outcome);
    Ok(())
}

// 4. Claim Winnings
fn claim_winnings(
    _program_id: &Pubkey,
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
    let copy_creator_account = next_account_info(accounts_iter)?; // optional or dummy

    // Manual deserialize WagerAccount:
    let mut wager_data = wager_account.try_borrow_mut_data()?;
    if wager_data.len() < 83 {
        return Err(ProgramError::AccountDataTooSmall);
    }
    let w_game_id = u64::from_le_bytes(wager_data[0..8].try_into().unwrap());
    let mut w_bettor_bytes = [0u8; 32];
    w_bettor_bytes.copy_from_slice(&wager_data[8..40]);
    let w_bettor = Pubkey::new_from_array(w_bettor_bytes);
    let w_prediction = wager_data[40];
    let w_amount = u64::from_le_bytes(wager_data[41..49].try_into().unwrap());
    let _w_is_routed = wager_data[49];
    let mut w_copy_creator_bytes = [0u8; 32];
    w_copy_creator_bytes.copy_from_slice(&wager_data[50..82]);
    let w_copy_creator = Pubkey::new_from_array(w_copy_creator_bytes);
    let w_claimed = wager_data[82];

    if w_bettor != *bettor.key || w_claimed != 0 {
        return Err(ProgramError::InvalidAccountData);
    }

    // Manual deserialize MarketAccount:
    let mut market_data = market_account.try_borrow_mut_data()?;
    if market_data.len() < 66 {
        return Err(ProgramError::AccountDataTooSmall);
    }
    let m_game_id = u64::from_le_bytes(market_data[0..8].try_into().unwrap());
    let m_status = market_data[40];
    let m_pool_home = u64::from_le_bytes(market_data[41..49].try_into().unwrap());
    let m_pool_away = u64::from_le_bytes(market_data[49..57].try_into().unwrap());
    let m_pool_draw = u64::from_le_bytes(market_data[57..65].try_into().unwrap());
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
    let state_rake_basis_points = u16::from_le_bytes(state_data[64..66].try_into().unwrap());

    if state_treasury != *treasury_account.key {
        return Err(ProgramError::InvalidAccountData);
    }

    if data.len() < 8 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let game_id = u64::from_le_bytes(data[0..8].try_into().unwrap());
    if game_id != m_game_id {
        return Err(ProgramError::InvalidAccountData);
    }

    // Determine if the bettor won
    let did_win = w_prediction == m_outcome;
    
    // Check if the outcome pool has bets.
    let winning_pool_size = match m_outcome {
        0 => m_pool_home,
        1 => m_pool_away,
        2 => m_pool_draw,
        _ => 0,
    };

    if winning_pool_size == 0 {
        // Platform Sweep scenario: No wagers on winning outcome
        // Triggered by the first claim call or resolve call.
        msg!("Platform Sweep Triggered: No wagers on outcome.");
        let total_escrow = market_account.lamports();
        let sweep_amount = total_escrow.saturating_div(2);
        
        // Transfer 50% to platform treasury
        **market_account.lamports.borrow_mut() = market_account.lamports().saturating_sub(sweep_amount);
        **treasury_account.lamports.borrow_mut() = treasury_account.lamports().saturating_add(sweep_amount);
        
        // Mark wager as claimed
        wager_data[82] = 1;
        msg!("Swept {} lamports to treasury.", sweep_amount);
        return Ok(());
    }

    if did_win {
        // Payout = (Bettor Wager / Winning Pool Size) * Total Pool
        let total_pool = m_pool_home.saturating_add(m_pool_away).saturating_add(m_pool_draw);
        let gross_payout = (w_amount as u128)
            .saturating_mul(total_pool as u128)
            .saturating_div(winning_pool_size as u128) as u64;

        // Fees
        // Platform rake (1.5%)
        let platform_rake = gross_payout.saturating_mul(state_rake_basis_points as u64).saturating_div(10000);
        
        // Copy creator commission (2%) if applicable
        let mut copy_commission = 0u64;
        let has_copy = w_copy_creator != Pubkey::default() && *copy_creator_account.key == w_copy_creator;
        if has_copy {
            copy_commission = gross_payout.saturating_mul(200).saturating_div(10000); // 2%
        }

        let net_payout = gross_payout
            .saturating_sub(platform_rake)
            .saturating_sub(copy_commission);

        // Perform transfers by adjust lamports
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

    // Mark as claimed
    wager_data[82] = 1;
    Ok(())
}

// 5. Record Viewer Milestone
fn record_milestone(
    _program_id: &Pubkey,
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

    if data.len() < 12 {
        return Err(ProgramError::InvalidInstructionData);
    }

    let milestone_id = u64::from_le_bytes(data[0..8].try_into().unwrap());
    let watch_time_seconds = u32::from_le_bytes(data[8..12].try_into().unwrap());

    let mut milestone_data = milestone_account.try_borrow_mut_data()?;
    if milestone_data.len() < 44 {
        return Err(ProgramError::AccountDataTooSmall);
    }

    // Manual serialize MilestoneAccount:
    // id(8) + bettor(32) + seconds(4) = 44 bytes
    milestone_data[0..8].copy_from_slice(&milestone_id.to_le_bytes());
    milestone_data[8..40].copy_from_slice(bettor.key.as_ref());
    milestone_data[40..44].copy_from_slice(&watch_time_seconds.to_le_bytes());

    msg!("Viewer milestone registered. ID: {}, Seconds: {}", milestone_id, watch_time_seconds);
    Ok(())
}
