# 🎮 EA SPORTS FC PRO OPEN 25/26: COMPLETE 24-COMPETITOR MASTER ROSTER & ODDS SYSTEM
**Document Reference**: `SOLPLAY-ESPORTS-FCPRO-2026-V2-COMPLETE`  
**Ecosystem**: SolPlay Sportsbook & On-Chain Prediction Arcade (`https://solplay-delta.vercel.app`)  
**Tournament**: EA SPORTS FC Pro Open Global Finals (London, UK)  
**Total Field**: 24 Competitors • 4 Groups (6 Players per Group)  

---

## 🧠 1. THE MATHEMATICAL ELO & POISSON ODDS FORMULA

In virtual competitive football (2 $\times$ 6-minute halves in Competitive 95-rated mode):
* **Average Goals per Match**: **7.2 goals** (typical scorelines: 4-3, 5-4, 6-5, 5-2).
* **Match Format**: 2 $\times$ 6-minute halves in Competitive 95-rated mode.
* **Draw Rate (Standard Time)**: ~14.2% (Knockouts enforce Extra Time & Classical Penalties; Regular stage awards 3 pts Win, 1 pt Draw, 0 pts Loss).

### A. The Player Power Elo Rating ($R$)
Derived from:
1. Historical Major LAN Win Rate (weight: 40%).
2. Average Goal Differential per Match ($\Delta G$) (weight: 25%).
3. Clutch / High-Pressure Win Rate in Swiss Deciders (weight: 20%).
4. Defensive Efficiency Index ($1 / xGA$) (weight: 15%).

### B. Two-Way Match Winner (Moneyline)
For Player A ($R_A$) against Player B ($R_B$):
$$E_A = \frac{1}{1 + 10^{(R_B - R_A)/400}}$$

With SolPlay’s sharp bookmaker margin ($M = 1.05$):
$$\text{Odds}_A = \frac{1}{E_A \times 1.025}, \quad \text{Odds}_B = \frac{1}{(1 - E_A) \times 1.025}$$

### C. Total Goals (Over / Under 6.5 Goals)
Expected total goals $\lambda_{\text{total}} = xGF_A + xGF_B$. Using the Poisson distribution:
$$P(X = k) = \frac{\lambda^k e^{-\lambda}}{k!}$$
* When $\lambda_{\text{total}} \ge 7.0$: **Over 6.5 Goals** is priced at **1.70 – 1.85**.
* Defensive specialists (e.g. nicolas99fc vs ManuBachoore, $\lambda_{\text{total}} \approx 5.4$): Line shifts to **O/U 5.5 Goals**.

---

## 🏆 2. OUTRIGHT TOURNAMENT CHAMPION ODDS (FULL 24 PLAYERS)

| Rank | Competitor | Country | Esports Club | FC-ELO | Win % | Outright Odds |
| :---: | :--- | :---: | :--- | :---: | :---: | :---: |
| **1** | **Jafonso** (João Vasconcelos) | 🇵🇹 Portugal | Luna Galaxy / Al-Hilal | **2210** | 86.2% | **6.50** |
| **2** | **Anders Vejrgang** | 🇩🇰 Denmark | RBLZ Gaming | **2180** | 84.6% | **7.80** |
| **3** | **PHzin** (Paulo Henrique Chaves) | 🇧🇷 Brazil | Ajax Esports | **2160** | 82.0% | **8.70** |
| **4** | **Emre Yilmaz** | 🇳🇱 Netherlands | Team Gullit | **2140** | 79.2% | **9.80** |
| **5** | **ManuBachoore** (Manuel Bachoore) | 🇳🇱 Netherlands | Team Gullit | **2120** | 77.8% | **11.00** |
| **6** | **Umut** (Umut Gültekin) | 🇩🇪 Germany | RBLZ Gaming | **2110** | 77.0% | **11.50** |
| **7** | **nicolas99fc** (Nicolás Villalba) | 🇦🇷 Argentina | Sevilla FC | **2080** | 76.1% | **13.50** |
| **8** | **Tekkz** (Donovan Hunt) | 🇬🇧 England | Manchester City Esports | **2050** | 74.4% | **16.00** |
| **9** | **Levi de Weerd** | 🇳🇱 Netherlands | Team Gullit | **2040** | 75.0% | **17.00** |
| **10** | **Obrun2002** (Francesco Tagliafierro) | 🇮🇹 Italy | exeed Esports | **2020** | 72.3% | **19.00** |
| **11** | **Mark11** (Mark Zakhary) | 🇦🇺 Australia | Team FUTWIZ | **2020** | 72.0% | **19.00** |
| **12** | **AbuMakkah** (Ahmad Mujahid) | 🇸🇦 Saudi Arabia | Team Falcons / Al Qadsiah | **2010** | 73.0% | **20.00** |
| **13** | **GuiBarros** (Guilherme Barros) | 🇧🇷 Brazil | RBLZ Gaming | **1990** | 71.2% | **22.00** |
| **14** | **The1OS** (Abdulaziz Al-Otaibi) | 🇸🇦 Saudi Arabia | Twisted Minds | **1980** | 70.5% | **23.00** |
| **15** | **Fouma** (Lucas Larcher) | 🇫🇷 France | FC Lorient / Team BDS | **1980** | 70.0% | **23.00** |
| **16** | **KTzn_91** (Kaan Tüzün) | 🇹🇷 Turkey | Galatasaray Esports | **1970** | 69.0% | **24.00** |
| **17** | **xCharifx** (Charif Farkous) | 🇲🇦 Morocco | Free Agent / NASR | **1970** | 68.8% | **24.00** |
| **18** | **NiKSNEB** (Ben Dobson) | 🇬🇧 England | 1J Esports (Norwich City) | **1960** | 68.2% | **25.00** |
| **19** | **Yuval** (Yuval Blizovsky) | 🇮🇱 Israel | Famalicão Esports | **1960** | 68.0% | **25.00** |
| **20** | **LJR_Peixoto** (Julien Peixoto) | 🇫🇷 France | FC Lorient | **1950** | 67.4% | **26.00** |
| **21** | **Stingray** (Marley Ray) | 🇬🇧 England | Twisted Minds | **1940** | 66.0% | **28.00** |
| **22** | **AboFawzi** (Fawzi Al-Rashidi) | 🇸🇦 Saudi Arabia | Twisted Minds | **1940** | 65.8% | **28.00** |
| **23** | **Paulo Neto** | 🇧🇷 Brazil | Atlanta United FC | **1930** | 65.5% | **30.00** |
| **24** | **FacuCowen** (Facundo Cowen) | 🇦🇷 Argentina | Tuzzy E-Sports | **1920** | 64.8% | **32.00** |

---

## 🗂️ 3. COMPLETE GROUP-BY-GROUP DOSSIERS & ODDS

### 🅰️ GROUP A: "The Champion's Gauntlet"

#### 1. Jafonso (João Vasconcelos) • 🇵🇹 Portugal • Luna Galaxy / Al-Hilal
* **FC-ELO**: **2210** (Reigning FC Pro World Champion)
* **Playstyle**: *Total Pressure & Mechanical Flawlessness*
* **Signature Tactics**: 4-3-2-1 Narrow, Step-over speed boost, low driven far post finish.
* **Stats**: Win Rate: **86.2%** | G/M: **5.10** | GA/M: **1.95** | Form: `W - W - W - W - W`
* **Group Winner Odds**: **1.65**

#### 2. Mark11 (Mark Zakhary) • 🇦🇺 Australia • Team FUTWIZ
* **FC-ELO**: **2020** (FIFAe World Cup Runner-Up)
* **Playstyle**: *Patient Possession & Box Overload*
* **Stats**: Win Rate: **72.0%** | G/M: **3.95** | GA/M: **2.30** | Form: `W - W - L - W - W`
* **Group Winner Odds**: **3.80**

#### 3. xCharifx (Charif Farkous) • 🇲🇦 Morocco • Free Agent
* **FC-ELO**: **1970** (African Qualifier Champion)
* **Playstyle**: *Explosive Dribbling & Rapid Counters*
* **Stats**: Win Rate: **68.8%** | G/M: **3.80** | GA/M: **2.40** | Form: `W - L - W - W - L`
* **Group Winner Odds**: **6.50**

#### 4. NiKSNEB (Ben Dobson) • 🇬🇧 England • 1J Esports
* **FC-ELO**: **1960** (ePremier League Contender)
* **Playstyle**: *Wing Play & Driven Cutbacks*
* **Stats**: Win Rate: **68.2%** | G/M: **3.80** | GA/M: **2.45** | Form: `W - W - L - W - L`
* **Group Winner Odds**: **8.00**

#### 5. Stingray (Marley Ray) • 🇬🇧 England • Twisted Minds
* **FC-ELO**: **1940** (Global Qualifier Survivor)
* **Playstyle**: *High Motor Transition*
* **Stats**: Win Rate: **66.0%** | G/M: **3.70** | GA/M: **2.50** | Form: `W - L - W - W - L`
* **Group Winner Odds**: **11.00**

#### 6. FacuCowen (Facundo Cowen) • 🇦🇷 Argentina • Tuzzy E-Sports
* **FC-ELO**: **1920** (South American Phenom)
* **Playstyle**: *Low Block & Precision Set-Pieces*
* **Stats**: Win Rate: **64.8%** | G/M: **3.40** | GA/M: **2.60** | Form: `W - L - L - W - W`
* **Group Winner Odds**: **14.00**

---

### 🅱️ GROUP B: "The Group of Death"

#### 7. Anders Vejrgang • 🇩🇰 Denmark • RBLZ Gaming
* **FC-ELO**: **2180** (World #1 Seed, 535-0 Weekend League Legend)
* **Playstyle**: *Relentless Aggression & Manual Cancels*
* **Signature Tactics**: Driven German Cross, Reverse Elastico, Instant Gegenpress.
* **Stats**: Win Rate: **84.6%** | G/M: **4.92** | GA/M: **2.10** | Form: `W - W - W - W - W`
* **Group Winner Odds**: **1.85**

#### 8. ManuBachoore (Manuel Bachoore) • 🇳🇱 Netherlands • Team Gullit
* **FC-ELO**: **2120** (2023 FIFAe World Champion)
* **Playstyle**: *Defensive Wall & Lethal Counter*
* **Signature Tactics**: 5-2-1-2 into 4-2-2-2, elite right-stick switching.
* **Stats**: Win Rate: **77.8%** | G/M: **3.85** | GA/M: **1.75** (Best Defense Globally) | Form: `W - W - W - L - W`
* **Group Winner Odds**: **3.20**

#### 9. nicolas99fc (Nicolás Villalba) • 🇦🇷 Argentina • Sevilla FC
* **FC-ELO**: **2080** (*The Iceman*)
* **Playstyle**: *Tempo Controller & Composure King*
* **Signature Tactics**: 4-4-2 flat, 65%+ possession retention, 92% PK conversion.
* **Stats**: Win Rate: **76.1%** | G/M: **3.20** | GA/M: **1.60** | Form: `W - L - W - W - W`
* **Group Winner Odds**: **4.50**

#### 10. The1OS (Abdulaziz Al-Otaibi) • 🇸🇦 Saudi Arabia • Twisted Minds
* **FC-ELO**: **1980** (Middle East LAN Winner)
* **Playstyle**: *Direct Vertical Attack*
* **Stats**: Win Rate: **70.5%** | G/M: **4.10** | GA/M: **2.40** | Form: `W - W - W - W - L`
* **Group Winner Odds**: **9.00**

#### 11. LJR_Peixoto (Julien Peixoto) • 🇫🇷 France • FC Lorient
* **FC-ELO**: **1950** (eLigue 1 Finalist)
* **Playstyle**: *Methodical Possession*
* **Stats**: Win Rate: **67.4%** | G/M: **3.50** | GA/M: **2.15** | Form: `L - W - W - W - L`
* **Group Winner Odds**: **13.00**

#### 12. AboFawzi (Fawzi Al-Rashidi) • 🇸🇦 Saudi Arabia • Twisted Minds
* **FC-ELO**: **1940** (Global Qualifier Standout)
* **Playstyle**: *Rapid Dribbling & Near Post Finishing*
* **Stats**: Win Rate: **65.8%** | G/M: **3.65** | GA/M: **2.50** | Form: `W - W - L - L - W`
* **Group Winner Odds**: **15.00**

---

### 🅲 GROUP C: "The Tactical Heavyweights"

#### 13. Emre Yilmaz • 🇳🇱 Netherlands • Team Gullit
* **FC-ELO**: **2140** (eChampions League Champion)
* **Playstyle**: *Tiki-Taka Possession & Controlled Precision*
* **Signature Tactics**: 4-2-3-1 narrow, ground pass combinations, timed finishing.
* **Stats**: Win Rate: **79.2%** | G/M: **4.40** | GA/M: **2.25** | Form: `W - W - L - W - W`
* **Group Winner Odds**: **2.20**

#### 14. Umut (Umut Gültekin) • 🇩🇪 Germany • RBLZ Gaming
* **FC-ELO**: **2110** (2022 FIFAe World Champion)
* **Playstyle**: *Calculated German Defensive Structure*
* **Signature Tactics**: 4-2-2-2, manual CDM containment, zero-risk passing.
* **Stats**: Win Rate: **77.0%** | G/M: **3.80** | GA/M: **1.80** | Form: `W - W - W - W - L`
* **Group Winner Odds**: **2.80**

#### 15. Tekkz (Donovan Hunt) • 🇬🇧 England • Manchester City Esports
* **FC-ELO**: **2050** (5x Major LAN Champion)
* **Playstyle**: *Freestyle Prodigy & Skill Moves Maestro*
* **Signature Tactics**: 4-3-2-1, Trivela finesses, heel-to-heel flick bursts.
* **Stats**: Win Rate: **74.4%** | G/M: **4.65** | GA/M: **2.75** | Form: `W - W - L - W - L`
* **Group Winner Odds**: **4.20**

#### 16. Obrun2002 (Francesco Tagliafierro) • 🇮🇹 Italy • exeed Esports
* **FC-ELO**: **2020** (eSerie A Champion)
* **Playstyle**: *Italian Tactical Discipline & Rapid Counter*
* **Stats**: Win Rate: **72.3%** | G/M: **3.90** | GA/M: **2.30** | Form: `W - W - W - W - L`
* **Group Winner Odds**: **5.50**

#### 17. GuiBarros (Guilherme Barros) • 🇧🇷 Brazil • RBLZ Gaming
* **FC-ELO**: **1990** (South American Powerhouse)
* **Playstyle**: *Brazilian Joga Bonito & High Press*
* **Stats**: Win Rate: **71.2%** | G/M: **4.30** | GA/M: **2.55** | Form: `W - W - W - L - W`
* **Group Winner Odds**: **7.50**

#### 18. Yuval (Yuval Blizovsky) • 🇮🇱 Israel • Famalicão Esports
* **FC-ELO**: **1960** (Global Qualifier Qualifier)
* **Playstyle**: *Fast-Paced Wing Combinations*
* **Stats**: Win Rate: **68.0%** | G/M: **3.75** | GA/M: **2.40** | Form: `W - L - W - L - W`
* **Group Winner Odds**: **12.00**

---

### 🅳 GROUP D: "The Global Clash"

#### 19. PHzin (Paulo Henrique Chaves) • 🇧🇷 Brazil • Ajax Esports
* **FC-ELO**: **2160** (FIFAe Nations Cup & eLibertadores Champion)
* **Playstyle**: *Dynamic Samba Football & Unstoppable Skill Combos*
* **Signature Tactics**: 4-3-2-1, Elastico cancel chains, long-range finesse shots.
* **Stats**: Win Rate: **82.0%** | G/M: **4.80** | GA/M: **2.10** | Form: `W - W - W - W - W`
* **Group Winner Odds**: **1.95**

#### 20. Levi de Weerd • 🇳🇱 Netherlands • Team Gullit
* **FC-ELO**: **2040** (eChampions League Finalist)
* **Playstyle**: *Calculated Direct Attacker*
* **Stats**: Win Rate: **75.0%** | G/M: **4.25** | GA/M: **2.15** | Form: `W - L - W - W - W`
* **Group Winner Odds**: **3.40**

#### 21. AbuMakkah (Ahmad Mujahid) • 🇸🇦 Saudi Arabia • Team Falcons / Al Qadsiah
* **FC-ELO**: **2010** (Middle East #1 Seed)
* **Playstyle**: *Explosive Transitions & Aerial Threat*
* **Stats**: Win Rate: **73.0%** | G/M: **4.50** | GA/M: **2.60** | Form: `W - W - L - W - W`
* **Group Winner Odds**: **4.80**

#### 22. Fouma (Lucas Larcher) • 🇫🇷 France • FC Lorient / Team BDS
* **FC-ELO**: **1980** (3x eLigue 1 Champion)
* **Playstyle**: *French Precision & Compact Midfield*
* **Stats**: Win Rate: **70.0%** | G/M: **3.85** | GA/M: **2.20** | Form: `W - W - L - W - W`
* **Group Winner Odds**: **6.50**

#### 23. KTzn_91 (Kaan Tüzün) • 🇹🇷 Turkey • Galatasaray Esports
* **FC-ELO**: **1970** (Turkish eSüper Lig Winner)
* **Playstyle**: *Physical Defense & Box Containment*
* **Stats**: Win Rate: **69.0%** | G/M: **3.65** | GA/M: **2.20** | Form: `W - L - W - W - L`
* **Group Winner Odds**: **8.50**

#### 24. Paulo Neto • 🇧🇷 Brazil • Atlanta United FC
* **FC-ELO**: **1930** (eMLS Champion)
* **Playstyle**: *Direct Vertical Dribbler*
* **Stats**: Win Rate: **65.5%** | G/M: **3.60** | GA/M: **2.55** | Form: `L - W - W - L - W`
* **Group Winner Odds**: **12.00**

---

## ⚡ 4. SOLPLAY INTEGRATION ARCHITECTURE
All 24 competitors are integrated with:
1. **Live & Scheduled Match Fixtures**: Ingested directly into `MATCHES_DATA` under the `esports` sport filter.
2. **6 Real-Time Odds Markets**: Moneyline, Goal Spread (-1.5/+1.5), O/U 6.5 Goals, Both Score 3+, 1st Half Winner, and Correct Scores.
3. **Hardware & Tactics Card**: Live interactive competitor profiles rendered via `buildSportTacticalDiagram`.
4. **Instant On-Chain Wagers**: Non-custodial Solana devnet and mainnet settlement with Phantom and Solflare.
