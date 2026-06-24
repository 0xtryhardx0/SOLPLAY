# SolPlay: Devnet Public Beta Launch Checklist

Follow these steps to launch a free-to-play public beta on Solana Devnet to build community hype and generate user traction metrics for investors.

---

## 🛠️ Step 1: Deploy Frontend to a Public Host
1. **Choose a Hosting Provider**: Use **Railway** (since the Git repository is already connected) or Vercel/Netlify for fast static hosting.
2. **Configure Environment**:
   - Ensure the server is pointing to the Solana Devnet Connection (`https://api.devnet.solana.com`).
   - Confirm the Program ID inside `app.js` is active and deployed: `84AVToEkDwsMXNh77n156DYHaWJa2zVqi8han3qqVdAk`.
3. **Verify URL**: Verify that the public link (e.g. `https://solplay-beta.up.railway.app`) loads correctly, connects wallets, and fetches live fixtures.

---

## 💬 Step 2: Establish the Tester Community
1. **Create a Telegram Group**: 
   - Name: `SolPlay Beta Testers`
   - Purpose: Direct player feedback, bug reporting, and social chat shares.
2. **Setup Chatbot Integration**:
   - (Optional) Use a Telegram bot to cross-post active shared slips from our live chat into the Telegram group, driving users back to the app.

---

## 🏆 Step 3: Configure the Devnet Leaderboard Competition
Running a competition is the best way to get Web3 users to test your platform:
1. **Set Up a Prize Pool**: Allocate a small real cash prize (e.g. **$100 to $150 USD** total, split $75 / $50 / $25 in real SOL or USDC) for the top 3 spots on the leaderboard.
2. **Define Rules**:
   - **Entry**: 100% Free. Connect Phantom Wallet (switch network to Devnet).
   - **Gameplay**: Request free SOL from the built-in Devnet faucet button, and place wagers on simulated live matches.
   - **Winning**: The players with the highest net profit (or highest win rate with at least 10 bets placed) at the end of 7 days win the real USDC prizes.

---

## 📣 Step 4: Social Media Marketing Rollout
Draft a Twitter/X thread announcing the launch:

* **Tweet 1 (Hook)**: 
  > "Live streaming + instant copy-betting + zero house risk. We just launched the @SolPlay beta on Solana Devnet! 🚀 
  > Test our HLS video streaming and copy-betting dashboard today for free. Link: [your-url]"
* **Tweet 2 (Social features)**: 
  > "Copy-betting made easy. Share your slip in the fan chat, and other users can clone it instantly (`📋 Clone Bet`). Contract payouts route commissions straight back to the creator. 💸"
* **Tweet 3 (House protection)**: 
  > "How we keep the liquidity pool safe: Real-time odds shifting, 8-second goal freezes, and a strict 75-minute safety lock. Zero latency arbitrage risk. 🔒"
* **Tweet 4 (Tournament Call-to-Action)**: 
  > "🏆 Devnet Launch Tournament: Join our Telegram, request free test SOL, and compete for a share of $150 USDC! Top 3 on the leaderboard win. Let's see who holds the best win rate! 👇 [telegram-link]"

---

## 📊 Step 5: Gather Metrics for Investors
During the beta, track the following metrics in your analytics dashboard (or local DB logs):
- **Unique Wallets Connected** (Proof of user acquisition).
- **Total Transactions/Bets Submitted** (Proof of contract interaction and throughput).
- **Average Retention Rate** (Do users return daily to check scores and chat?).
- **Total Social Shares** (Proof of community virality).

Present these metrics on your pitch deck when applying for Grants or accelerators!
