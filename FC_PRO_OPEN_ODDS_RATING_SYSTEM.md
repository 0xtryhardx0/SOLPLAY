# 🎮 EA SPORTS FC PRO OPEN 25/26: PLAYER PERFORMANCE RATINGS & ELO ODDS SYSTEM
**Document Reference**: `SOLPLAY-ESPORTS-FCPRO-2026-V1`  
**Ecosystem**: SolPlay Sportsbook & On-Chain Prediction Arcade  
**Applicable Event**: EA Sports FC Pro Open Qualifiers & Group Stages (London Global Finals)  

---

## 🧠 1. THE MATHEMATICAL ELO & POISSON ODDS FORMULA

Unlike traditional 90-minute physical football with low average goals (2.6 goals/match) and high draw frequencies (26%), **EA SPORTS FC Pro Esports** is high-paced, mechanical 1v1 virtual football:
* **Average Goals per Match**: **7.2 goals** (typical scorelines: 4-3, 5-4, 6-5, 5-2).
* **Match Format**: 2 $\times$ 6-minute halves in Competitive 95-rated mode.
* **Draw Rate (Standard Time)**: ~14.2% (Knockouts enforce Extra Time & Classical Penalties).

### A. The Player Power Elo Rating
Every competitor starts with a calibrated **FC-ELO ($R$)** derived from:
1. Historical Major LAN Win Rate (weight: 40%).
2. Average Goal Differential per Match ($\Delta G$) (weight: 25%).
3. Clutch / High-Pressure Win Rate in Swiss Deciders (weight: 20%).
4. Defensive Efficiency Index ($1 / xGA$) (weight: 15%).

### B. Two-Way Match Winner (Moneyline)
For Player A ($R_A$) against Player B ($R_B$):
$$E_A = \frac{1}{1 + 10^{(R_B - R_A)/400}}$$

With SolPlay’s standard 5% sharp bookmaker overround ($M = 1.05$):
$$\text{Odds}_A = \frac{1}{E_A \times 1.025}, \quad \text{Odds}_B = \frac{1}{(1 - E_A) \times 1.025}$$

### C. Total Goals (Over / Under 6.5 Goals)
Expected total goals $\lambda_{\text{total}} = xGF_A + xGF_B$. Using the Poisson distribution:
$$P(X = k) = \frac{\lambda^k e^{-\lambda}}{k!}$$
* When $\lambda_{\text{total}} \ge 7.0$: **Over 6.5 Goals** is priced at **1.70 – 1.85**.
* When defensive tactical specialists meet (e.g. nicolas99fc vs ManuBachoore, $\lambda_{\text{total}} \approx 5.4$): Line shifts to **O/U 5.5 Goals**.

---

## 🏆 2. TOP 16 COMPETITORS: DOSSIER & POWER RATINGS

### 1. Anders Vejrgang (Denmark / RBLZ Gaming)
* **Power Rating (FC-ELO)**: **2180** (World #1 Seed)
* **Playstyle Archetype**: *Hyper-Aggressive Skiller & Relentless Press*
* **Signature Tactics**: 4-3-2-1, Driven German Crosses, Reverse Elastico cancels, 85%+ pass completion in the final third.
* **Key Stats**: 
  * Tournament Win Rate: **84.6%**
  * Goals Scored / Match: **4.92**
  * Goals Conceded / Match: **2.10**
  * Recent Form: `W - W - W - W - W`
* **Baseline Fair Odds vs Average Field**: **1.35 – 1.45**

---

### 2. Emre Yilmaz (Netherlands / Team Gullit)
* **Power Rating (FC-ELO)**: **2140** (Former eChampions League Winner)
* **Playstyle Archetype**: *Tiki-Taka Possession & Controlled Precision*
* **Signature Tactics**: 4-2-3-1 narrow, Driven ground pass through-balls, timed low driven finishes.
* **Key Stats**:
  * Tournament Win Rate: **79.2%**
  * Goals Scored / Match: **4.40**
  * Goals Conceded / Match: **2.25**
  * Recent Form: `W - W - L - W - W`
* **Baseline Fair Odds vs Average Field**: **1.45 – 1.60**

---

### 3. Manuel "ManuBachoore" Bachoore (Netherlands / Team Gullit)
* **Power Rating (FC-ELO)**: **2120** (Reigning eWorld Cup Champion)
* **Playstyle Archetype**: *Defensive Masterclass & Counter Execution*
* **Signature Tactics**: 5-2-1-2 flex into 4-2-2-2, elite manual right-stick switching, lowest $xGA$ in competitive FIFA.
* **Key Stats**:
  * Tournament Win Rate: **77.8%**
  * Goals Scored / Match: **3.85**
  * Goals Conceded / Match: **1.75** (Best Defense globally)
  * Recent Form: `W - W - W - L - W`
* **Baseline Fair Odds vs Average Field**: **1.50 – 1.65**

---

### 4. Nicolás "nicolas99fc" Villalba (Argentina / Sevilla FC)
* **Power Rating (FC-ELO)**: **2080** (*The Iceman*)
* **Playstyle Archetype**: *Tempo Controller & Composure King*
* **Signature Tactics**: 4-4-2 flat, 65%+ possession retention, lethal penalty shootout conversion (92%).
* **Key Stats**:
  * Tournament Win Rate: **76.1%**
  * Goals Scored / Match: **3.20**
  * Goals Conceded / Match: **1.60**
  * Recent Form: `W - L - W - W - W`
* **Baseline Fair Odds vs Average Field**: **1.60 – 1.75**

---

### 5. Donovan "Tekkz" Hunt (United Kingdom / Manchester City Esports)
* **Power Rating (FC-ELO)**: **2050** (5x Major LAN Champion)
* **Playstyle Archetype**: *Freestyle Prodigy & Skill Moves Maestro*
* **Signature Tactics**: 4-3-2-1, Trivela finesses, heel-to-heel flick burst, unpredictable attacking angles.
* **Key Stats**:
  * Tournament Win Rate: **74.4%**
  * Goals Scored / Match: **4.65**
  * Goals Conceded / Match: **2.75**
  * Recent Form: `W - W - L - W - L`
* **Baseline Fair Odds vs Average Field**: **1.70 – 1.85**

---

### 6. Levi de Weerd (Netherlands / Team Gullit)
* **Power Rating (FC-ELO)**: **2040** (eChampions League Finalist)
* **Playstyle Archetype**: *Calculated Direct Attacker*
* **Signature Tactics**: High-tempo passing triangles, near-post power shots.
* **Key Stats**: Win Rate **75.0%** | Goals/Match: **4.25** | Conceded: **2.15** | Form: `W - L - W - W - W`

---

### 7. Francesco "Obrun2002" Tagliafierro (Italy / exeed)
* **Power Rating (FC-ELO)**: **2020** (eSerie A Champion & Global Qualifier Top 8)
* **Playstyle Archetype**: *Italian Tactical Discipline & Rapid Counter*
* **Key Stats**: Win Rate **72.3%** | Goals/Match: **3.90** | Conceded: **2.30** | Form: `W - W - W - W - L`

---

### 8. Ahmad "AbuMakkah" Mujahid (Saudi Arabia / Team Falcons)
* **Power Rating (FC-ELO)**: **2010** (Middle East #1 Seed)
* **Playstyle Archetype**: *Explosive Transition & Aerial Crosses*
* **Key Stats**: Win Rate **73.0%** | Goals/Match: **4.50** | Conceded: **2.60** | Form: `W - W - L - W - W`

---

### 9. Guilherme "GuiBarros" Barros (Brazil / RBLZ Gaming)
* **Power Rating (FC-ELO)**: **1990** (South American Phenom)
* **Playstyle Archetype**: *Brazilian Joga Bonito & High Press*
* **Key Stats**: Win Rate **71.2%** | Goals/Match: **4.30** | Conceded: **2.55** | Form: `W - W - W - L - W`

---

### 10. Abdulaziz "1OS" Al-Otaibi (Saudi Arabia / Twisted Minds)
* **Power Rating (FC-ELO)**: **1980** (Global Qualifier Qualified)
* **Playstyle Archetype**: *Sharp Finisher & High Transition*
* **Key Stats**: Win Rate **70.5%** | Goals/Match: **4.10** | Conceded: **2.40** | Form: `W - W - W - W - L`

---

### 11. Kaan "KTzn_91" Tüzün (Turkey / Galatasaray Esports)
* **Power Rating (FC-ELO)**: **1970** (Global Qualifier Qualified)
* **Playstyle Archetype**: *Physical Midfield Wall & Compact Box*
* **Key Stats**: Win Rate **69.0%** | Goals/Match: **3.65** | Conceded: **2.20** | Form: `W - L - W - W - L`

---

### 12. Ben "NiKSNEB" Dobson (United Kingdom / 1J Esports)
* **Power Rating (FC-ELO)**: **1960** (Global Qualifier Qualified)
* **Playstyle Archetype**: *Wing Overloads & Driven Low Cutbacks*
* **Key Stats**: Win Rate **68.2%** | Goals/Match: **3.80** | Conceded: **2.45** | Form: `W - W - L - W - L`

---

### 13. Julien "LJR_Peixoto" Peixoto (France / FC Lorient)
* **Power Rating (FC-ELO)**: **1950** (eLigue 1 Champion)
* **Playstyle Archetype**: *Methodical Possession & Manual Defensive Jockeying*
* **Key Stats**: Win Rate **67.4%** | Goals/Match: **3.50** | Conceded: **2.15** | Form: `L - W - W - W - L`

---

### 14. Marley "Stingray" Ray (United Kingdom / Twisted Minds)
* **Power Rating (FC-ELO)**: **1940** (Global Qualifier Qualified)
* **Playstyle Archetype**: *High Motor & Constant Overloads*
* **Key Stats**: Win Rate **66.0%** | Goals/Match: **3.70** | Conceded: **2.50** | Form: `W - L - W - W - L`

---

### 15. Paulo Neto (Brazil / Atlanta United FC)
* **Power Rating (FC-ELO)**: **1930** (eMLS Champion)
* **Playstyle Archetype**: *Direct Vertical Dribbler*
* **Key Stats**: Win Rate **65.5%** | Goals/Match: **3.60** | Conceded: **2.55** | Form: `L - W - W - L - W`

---

### 16. Facundo "Cowen" Cowen (Argentina / Tuzzy E-Sports)
* **Power Rating (FC-ELO)**: **1920** (South American Qualifier Survivor)
* **Playstyle Archetype**: *Gritty Containment & Set-Piece Specialist*
* **Key Stats**: Win Rate **64.8%** | Goals/Match: **3.40** | Conceded: **2.60** | Form: `W - L - L - W - W`

---

## 📊 3. THE 6 PRIMARY ESPORTS BETTING MARKETS GENERATED

1. **2-Way Match Winner (Moneyline)**: Straight win (including extra time/penalties if applicable).
2. **Goal Handicap / Spread (-1.5 / +1.5)**: Favorite must win by 2 or more goals.
3. **Total Match Goals (O/U 6.5 Goals)**: Standard high-octane line.
4. **Both Players to Score 3+ Goals (BTTS 3+)**: Typical esports threshold replacing traditional real-life BTTS.
5. **1st Half Winner**: Moneyline at the 45-minute mark (after first 6 minutes of game play).
6. **Correct Score Odds**: Top high-probability scorelines (4-3, 5-4, 5-3, 6-4).
