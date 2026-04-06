````carousel
# 🔷 ApexChain AI
### AI-Powered Crypto Volatility Forecasting

**Fintech Analyst Program — Project Presentation**

> Predicting 7-day Realised Volatility using Machine Learning
> with live BUY / SELL / HOLD signals

**Live site →** https://gsokolow15.github.io/ApexChain/

---
<!-- slide -->
# 📌 The Problem

**Why is crypto volatility hard to predict?**

- Crypto markets move 24/7, are highly non-linear, and react to macro shocks
- Traditional models (GARCH, ARCH) assume fixed statistical structure — crypto breaks those assumptions
- A single news event or VIX spike can shift volatility dramatically overnight

**Our goal:**
> Build a data-driven ML system that forecasts 7-day realised volatility and generates actionable signals — automatically.

---
<!-- slide -->
# 🏗️ System Architecture

```
┌─────────────────────┐       POST /api/analyze        ┌──────────────────────┐
│   Frontend (Browser)│  ──────────────────────────►   │  Flask Backend       │
│                     │                                 │  server.py (:5050)   │
│  index.html         │  ◄──────────────────────────   │                      │
│  style.css          │       JSON response             │  • Feature engineer  │
│  app.js (Chart.js)  │                                 │  • Train RF + XGBoost│
└─────────────────────┘                                 │  • K-Means clustering│
                                                        │  • Generate signal   │
        GitHub Pages (static hosting)                   └──────────────────────┘
        gsokolow15.github.io/ApexChain/                      yfinance API ↑
```

**Stack:** Python · Flask · scikit-learn · XGBoost · yfinance · Chart.js · Vanilla JS

---
<!-- slide -->
# 🧪 Feature Engineering — 27 Features

Data is pulled live from **Yahoo Finance** for any ticker (BTC-USD, ETH-USD, SPY, AAPL…)

| Category | Features |
|---|---|
| **Price / Returns** | Log returns, 3 lag returns, ETH & SPY log returns |
| **Volatility** | RV7 (target), RV7 lags at 1, 2, 3, 5, 7 days |
| **Momentum** | RSI-14, MACD line, MACD signal, MACD histogram |
| **Bollinger Bands** | Upper, Lower, Width, %B |
| **Trend** | SMA-20, EMA-12, Price vs SMA-20 |
| **Macro** | VIX, VIX lag-1, VIX lag-3, SPY 5-day momentum |
| **Cross-asset** | ETH-BTC 5-day rolling correlation |
| **Sentiment proxy** | Fear & Greed (VIX-derived) |
| **Volume** | Raw volume |

**Target variable:** `RV7 = rolling 7-day σ(log returns) × √252`

---
<!-- slide -->
# 🤖 Supervised ML — Random Forest vs XGBoost

**80/20 chronological train/test split** — no data leakage (time-series aware)

```python
# TimeSeriesSplit cross-validation (5 folds)
tscv = TimeSeriesSplit(n_splits=5)

# Grid search over both models simultaneously
rf_grid  = GridSearchCV(RandomForestRegressor(), {...}, cv=tscv)
xgb_grid = GridSearchCV(XGBRegressor(),          {...}, cv=tscv)
```

**Champion selection:** whichever model has lower MAE on the test set wins automatically

| Metric | Random Forest | XGBoost |
|---|---|---|
| Tuned via | `n_estimators`, `max_depth`, `min_samples_leaf` | `n_estimators`, `max_depth`, `learning_rate`, `subsample` |
| Output | Predicted RV7 for test window | Predicted RV7 for test window |

Results shown live in the **Actual vs Predicted** chart on the dashboard.

---
<!-- slide -->
# 🗺️ Unsupervised ML — Market Regime Detection

**K-Means clustering (k=3)** groups every trading day into a market regime — with zero human-defined rules.

```python
km = KMeans(n_clusters=3, random_state=42)
labels = km.fit_predict(X_scaled)

# Map clusters by average RV: low=Bull, mid=Sideways, high=Bear
regime_map = {low_rv: "Bull", mid_rv: "Sideways", high_rv: "Bear"}
```

**PCA (2D)** visualises the clusters on an interactive scatter plot.

| Regime | Meaning | Signal impact |
|---|---|---|
| 🟢 Bull | Low volatility, rising trend | +1 to score |
| 🟡 Sideways | Mixed signals | 0 |
| 🔴 Bear | High volatility, falling trend | -1 to score |

---
<!-- slide -->
# 📡 Signal Generation — 5-Factor Scoring Model

Every analysis produces a **BUY / SELL / HOLD** signal from a composite score:

| Factor | Bullish condition | Score |
|---|---|---|
| Forecasted RV trend | Decreasing (< -0.03) | **+2** |
| RSI-14 | Oversold (< 35) | **+2** |
| MACD Histogram | Positive | **+1** |
| VIX | Low fear (< 20) | **+1** |
| Market Regime | Bull (K-Means) | **+1** |

```
Score ≥ +3  →  BUY 🟢
Score ≤ −2  →  SELL 🔴
Otherwise   →  HOLD 🟡

Confidence = min(100, 50 + |score| × 10)
```

---
<!-- slide -->
# 🎨 Frontend — How the Site Was Built

**Pure HTML + CSS + JavaScript** — no frameworks, no build tools

```
index.html   →  Structure: nav, hero, dashboard, learn, models sections
style.css    →  Dark theme, glassmorphism cards, animations, responsive layout
app.js       →  API calls, Chart.js charts, FAQ accordion, beginner/expert toggle
```

**Key frontend features:**
- 🌌 Animated particle canvas background
- 📊 4 live charts: Price history · Actual vs Predicted · Feature importance · PCA regime scatter
- 🔄 Beginner / Expert mode toggle (explains every metric in plain English)
- ⚡ Risk tolerance slider that adjusts the signal interpretation

**Charts powered by:** [Chart.js](https://www.chartjs.org/)

---
<!-- slide -->
# 🚀 Deployment — GitHub + GitHub Pages

**Version control with Git:**
```bash
git init
git add -A
git commit -m "Initial commit: ApexChain"
git push origin main
```

**Hosting (free, public):**

| Layer | Where | URL |
|---|---|---|
| Frontend | GitHub Pages | `gsokolow15.github.io/ApexChain/` |
| Backend | Runs locally | `localhost:5050` |
| Code | GitHub repo | `github.com/gsokolow15/ApexChain` |

> The frontend is live for anyone worldwide.  
> The ML backend runs on your machine when doing live analysis.

---
<!-- slide -->
# ✅ Summary & Key Takeaways

**What we built:**
- End-to-end ML pipeline: data ingestion → feature engineering → supervised + unsupervised models → live signal
- A polished, publicly accessible web interface — no paid hosting required
- Beginner-friendly explanations of every financial concept, alongside expert-level detail

**What we learned:**
- How to engineer financial features from raw price data
- Time-series cross-validation to avoid look-ahead bias
- How K-Means can detect market regimes without labels
- How to wire a Python ML backend to a live frontend via REST API
- Version control and public hosting with Git + GitHub Pages

**Live demo →** https://gsokolow15.github.io/ApexChain/  
**Code →** https://github.com/gsokolow15/ApexChain
````
