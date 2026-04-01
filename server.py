"""
ApexChain — Flask Backend
Serves ML analysis via POST /api/analyze
"""
import warnings
warnings.filterwarnings("ignore")

import os
import json
import numpy as np
import pandas as pd
import yfinance as yf

from flask import Flask, request, jsonify
from flask_cors import CORS

from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import GridSearchCV, TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from xgboost import XGBRegressor

app = Flask(__name__)
CORS(app)


# ─────────────────────────────────────────────────────────
#  FEATURE ENGINEERING
# ─────────────────────────────────────────────────────────
def rsi(series, period=14):
    delta = series.diff()
    gain  = delta.clip(lower=0).rolling(period).mean()
    loss  = (-delta.clip(upper=0)).rolling(period).mean()
    rs    = gain / (loss + 1e-10)
    return 100 - (100 / (1 + rs))


def build_features(ticker, start, end):
    """Download data and engineer all 27 features."""
    tickers = [ticker, "ETH-USD", "^VIX", "SPY"]
    raw = yf.download(tickers, start=start, end=end,
                      interval="1d", auto_adjust=True, progress=False)

    if raw.empty:
        raise ValueError(
            f"No data returned for '{ticker}'. "
            "Verify the ticker is valid on Yahoo Finance (e.g. BTC-USD, ETH-USD, SOL-USD, AAPL, SPY) "
            "and that it has data in the selected date range."
        )

    close  = raw["Close"].copy() if "Close" in raw else raw.copy()
    volume = raw["Volume"].copy() if "Volume" in raw else None

    # Robust column rename using a dict (works even when only 1 ticker returned)
    rename_map = {ticker: ticker, "ETH-USD": "ETH", "^VIX": "VIX", "SPY": "SPY"}
    close = close.rename(columns=rename_map)

    # Ensure auxiliary columns exist even if download partially failed
    for col_name in ["ETH", "VIX", "SPY"]:
        if col_name not in close.columns:
            close[col_name] = np.nan

    # Also handle single-ticker case where columns may be flat (not MultiIndex)
    if ticker not in close.columns and len(close.columns) == 4:
        # Columns are in order [ticker, ETH, VIX, SPY] — rename by position
        close.columns = [ticker, "ETH", "VIX", "SPY"]

    if ticker not in close.columns:
        raise ValueError(
            f"No price data found for '{ticker}'. "
            "Please verify the ticker is valid on Yahoo Finance."
        )

    # Drop rows where the primary ticker has no data;
    # forward-fill auxiliaries so a missing VIX day doesn't kill the row
    close = close.dropna(subset=[ticker])
    close[["ETH", "VIX", "SPY"]] = close[["ETH", "VIX", "SPY"]].ffill().bfill()

    df = pd.DataFrame(index=close.index)
    df["Close"]   = close[ticker]
    df["VIX"]     = close["VIX"]

    # Vol col for ETH/SPY may be missing if ticker IS ETH — handle gracefully
    eth_col = close["ETH"] if "ETH" in close.columns else pd.Series(np.nan, index=close.index)
    spy_col = close["SPY"] if "SPY" in close.columns else pd.Series(np.nan, index=close.index)

    # Log returns
    df["LogRet"]     = np.log(close[ticker] / close[ticker].shift(1))
    df["ETH_LogRet"] = np.log(eth_col / eth_col.shift(1))
    df["SPY_LogRet"] = np.log(spy_col / spy_col.shift(1))

    # Log return lags
    for lag in [1, 2, 3]:
        df[f"LogRet_lag{lag}"] = df["LogRet"].shift(lag)

    # 7-day Realised Volatility (target)
    df["RV7"] = df["LogRet"].rolling(7).std() * np.sqrt(252)

    # RV autoregressive lags
    for lag in [1, 2, 3, 5, 7]:
        df[f"RV7_lag{lag}"] = df["RV7"].shift(lag)

    # RSI-14
    df["RSI_14"] = rsi(close[ticker])

    # Bollinger Bands (20-day)
    bb_mid         = close[ticker].rolling(20).mean()
    bb_std         = close[ticker].rolling(20).std()
    df["BB_Upper"] = bb_mid + 2 * bb_std
    df["BB_Lower"] = bb_mid - 2 * bb_std
    df["BB_Width"] = (df["BB_Upper"] - df["BB_Lower"]) / (bb_mid + 1e-10)
    df["BB_PctB"]  = (close[ticker] - df["BB_Lower"]) / (df["BB_Upper"] - df["BB_Lower"] + 1e-10)

    # MACD
    ema12             = close[ticker].ewm(span=12, adjust=False).mean()
    ema26             = close[ticker].ewm(span=26, adjust=False).mean()
    df["MACD_Line"]   = ema12 - ema26
    df["MACD_Signal"] = df["MACD_Line"].ewm(span=9, adjust=False).mean()
    df["MACD_Hist"]   = df["MACD_Line"] - df["MACD_Signal"]

    # SMA_20, EMA_12, Price_vs_SMA20
    df["SMA_20"]        = bb_mid
    df["EMA_12"]        = ema12
    df["Price_vs_SMA20"] = (close[ticker] - bb_mid) / (bb_mid + 1e-10)

    # VIX lags
    df["VIX_lag1"] = df["VIX"].shift(1)
    df["VIX_lag3"] = df["VIX"].shift(3)

    # SPY momentum
    df["SPY_Mom5"] = df["SPY_LogRet"].rolling(5).sum()

    # ETH-BTC 5-day rolling correlation
    df["ETH_Corr5"] = df["LogRet"].rolling(5).corr(df["ETH_LogRet"])

    # Fear & Greed proxy
    np.random.seed(42)
    noise = np.random.normal(0, 3, len(df))
    vix_min, vix_max = df["VIX"].min(), df["VIX"].max()
    df["FearGreed"] = (
        100 - (df["VIX"] - vix_min) / (vix_max - vix_min + 1e-10) * 100 + noise
    ).clip(0, 100)

    # Volume (if available)
    if volume is not None and ticker in volume.columns:
        df["Volume"] = volume[ticker].reindex(df.index).fillna(0)
    else:
        df["Volume"] = 0.0

    df = df.dropna()
    return df, close[ticker].reindex(df.index)


# ─────────────────────────────────────────────────────────
#  ML PIPELINE
# ─────────────────────────────────────────────────────────
FEATURE_COLS = [
    "LogRet", "ETH_LogRet", "SPY_LogRet",
    "LogRet_lag1", "LogRet_lag2", "LogRet_lag3",
    "VIX", "VIX_lag1", "VIX_lag3",
    "RSI_14", "BB_Width", "BB_PctB",
    "MACD_Line", "MACD_Signal", "MACD_Hist",
    "SMA_20", "EMA_12", "Price_vs_SMA20",
    "FearGreed", "ETH_Corr5", "SPY_Mom5",
    "RV7_lag1", "RV7_lag2", "RV7_lag3", "RV7_lag5", "RV7_lag7",
    "Volume",
]

def run_ml(df):
    X = df[FEATURE_COLS].values
    y = df["RV7"].values

    split = int(len(X) * 0.80)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]
    dates_test = df.index[split:]

    scaler     = StandardScaler()
    X_train_s  = scaler.fit_transform(X_train)
    X_test_s   = scaler.transform(X_test)

    tscv = TimeSeriesSplit(n_splits=5)

    # Random Forest
    rf_grid = GridSearchCV(
        RandomForestRegressor(random_state=42, n_jobs=-1),
        {"n_estimators": [200, 400], "max_depth": [5, 8], "min_samples_leaf": [3, 5]},
        cv=tscv, scoring="neg_mean_squared_error", n_jobs=-1
    )
    rf_grid.fit(X_train_s, y_train)
    rf_best = rf_grid.best_estimator_
    rf_pred = rf_best.predict(X_test_s)
    rf_mae  = mean_absolute_error(y_test, rf_pred)
    rf_rmse = np.sqrt(mean_squared_error(y_test, rf_pred))

    # XGBoost
    xgb_grid = GridSearchCV(
        XGBRegressor(random_state=42, n_jobs=-1, objective="reg:squarederror", verbosity=0),
        {"n_estimators": [200, 300], "max_depth": [3, 5],
         "learning_rate": [0.05, 0.1], "subsample": [0.8, 1.0]},
        cv=tscv, scoring="neg_mean_squared_error", n_jobs=-1
    )
    xgb_grid.fit(X_train_s, y_train)
    xgb_best = xgb_grid.best_estimator_
    xgb_pred = xgb_best.predict(X_test_s)
    xgb_mae  = mean_absolute_error(y_test, xgb_pred)
    xgb_rmse = np.sqrt(mean_squared_error(y_test, xgb_pred))

    # Champion
    if xgb_mae <= rf_mae:
        champion_name  = "XGBoost"
        champion       = xgb_best
        champion_pred  = xgb_pred
        champion_params = xgb_grid.best_params_
    else:
        champion_name  = "Random Forest"
        champion       = rf_best
        champion_pred  = rf_pred
        champion_params = rf_grid.best_params_

    # Feature importance
    importances = dict(zip(FEATURE_COLS, champion.feature_importances_.tolist()))
    top10 = sorted(importances.items(), key=lambda x: x[1], reverse=True)[:10]

    return {
        "rf":  {"mae": rf_mae,  "rmse": rf_rmse,  "params": rf_grid.best_params_,  "pred": rf_pred.tolist()},
        "xgb": {"mae": xgb_mae, "rmse": xgb_rmse, "params": xgb_grid.best_params_, "pred": xgb_pred.tolist()},
        "champion":        champion_name,
        "champion_params": champion_params,
        "champion_pred":   champion_pred.tolist(),
        "y_test":          y_test.tolist(),
        "dates_test":      [d.strftime("%Y-%m-%d") for d in dates_test],
        "feature_importance": top10,
        "scaler": scaler,
        "split":  split,
    }


def run_unsupervised(df):
    X = df[FEATURE_COLS].values
    scaler = StandardScaler()
    X_s    = scaler.fit_transform(X)

    # K-Means
    km  = KMeans(n_clusters=3, random_state=42, n_init=10)
    labels = km.fit_predict(X_s)

    # Map clusters: low avg RV = Bull, high = Bear, mid = Sideways
    cluster_rv = {c: df["RV7"].values[labels == c].mean() for c in range(3)}
    sorted_rv  = sorted(cluster_rv, key=cluster_rv.get)
    regime_map = {sorted_rv[0]: "Bull", sorted_rv[1]: "Sideways", sorted_rv[2]: "Bear"}
    regimes    = [regime_map[l] for l in labels]

    # PCA 2D
    pca      = PCA(n_components=2, random_state=42)
    X_pca    = pca.fit_transform(X_s)

    dates_str = [d.strftime("%Y-%m-%d") for d in df.index]

    pca_data = [
        {"date": dates_str[i], "x": float(X_pca[i, 0]), "y": float(X_pca[i, 1]),
         "regime": regimes[i]}
        for i in range(len(regimes))
    ]

    current_regime = regimes[-1]
    return {"regimes": regimes, "pca": pca_data, "current_regime": current_regime}


# ─────────────────────────────────────────────────────────
#  SIGNAL GENERATION
# ─────────────────────────────────────────────────────────
def generate_signal(df, ml_results, unsupervised_results):
    last   = df.iloc[-1]
    preds  = ml_results["champion_pred"]
    y_test = ml_results["y_test"]

    # Forecasted RV: extrapolate trend from last few predicted values
    rv_trend = (preds[-1] - preds[max(0, len(preds) - 5)]) / max(1, len(preds) - 1)

    current_rsi  = float(last["RSI_14"])
    macd_hist    = float(last["MACD_Hist"])
    vix          = float(last["VIX"])
    regime       = unsupervised_results["current_regime"]
    current_rv   = float(last["RV7"])
    forecasted_rv = float(preds[-1])

    score    = 0
    reasons  = []

    if rv_trend < -0.03:
        score += 2
        reasons.append({"icon": "✅", "text": "Volatility is forecasted to decrease — calming conditions",
                         "expert": "Forecasted RV trend < -0.03 → +2",
                         "key": "rv_down"})
    elif rv_trend > 0.03:
        score -= 2
        reasons.append({"icon": "⚠️", "text": "Volatility is forecasted to increase — stormy conditions ahead",
                         "expert": "Forecasted RV trend > +0.03 → -2",
                         "key": "rv_up"})

    if current_rsi < 35:
        score += 2
        reasons.append({"icon": "✅", "text": "RSI indicates the asset may be unfairly cheap — potential bounce",
                         "expert": "RSI < 35 (oversold) → +2",
                         "key": "rsi_low"})
    elif current_rsi > 65:
        score -= 2
        reasons.append({"icon": "⚠️", "text": "RSI indicates the asset may be overpriced — caution advised",
                         "expert": "RSI > 65 (overbought) → -2",
                         "key": "rsi_high"})

    if macd_hist > 0:
        score += 1
        reasons.append({"icon": "✅", "text": "MACD momentum is positive — price is trending upward",
                         "expert": "MACD Histogram > 0 → +1",
                         "key": "macd_pos"})
    else:
        score -= 1
        reasons.append({"icon": "⚠️", "text": "MACD momentum is negative — some downward pressure",
                         "expert": "MACD Histogram < 0 → -1",
                         "key": "macd_neg"})

    if vix < 20:
        score += 1
        reasons.append({"icon": "✅", "text": "VIX fear gauge is low — calm macro environment",
                         "expert": "VIX < 20 → +1",
                         "key": "vix_low"})
    elif vix > 30:
        score -= 1
        reasons.append({"icon": "⚠️", "text": "VIX fear gauge is elevated — macro uncertainty",
                         "expert": "VIX > 30 → -1",
                         "key": "vix_high"})

    if regime == "Bull":
        score += 1
        reasons.append({"icon": "🟢", "text": "AI detects a Bull market regime — rising trend environment",
                         "expert": "K-Means regime == Bull → +1",
                         "key": "bull"})
    elif regime == "Bear":
        score -= 1
        reasons.append({"icon": "🔴", "text": "AI detects a Bear market regime — falling trend environment",
                         "expert": "K-Means regime == Bear → -1",
                         "key": "bear"})
    else:
        reasons.append({"icon": "🟡", "text": "AI detects a Sideways market regime — mixed signals",
                         "expert": "K-Means regime == Sideways → 0",
                         "key": "sideways"})

    if score >= 3:
        signal = "BUY"
    elif score <= -2:
        signal = "SELL"
    else:
        signal = "HOLD"

    confidence = min(100, 50 + abs(score) * 10)
    max_score  = 7

    return {
        "signal":       signal,
        "score":        score,
        "max_score":    max_score,
        "confidence":   confidence,
        "reasons":      reasons,
        "current_rv":   round(current_rv * 100, 2),
        "forecasted_rv": round(forecasted_rv * 100, 2),
        "rv_trend":     round(rv_trend * 100, 4),
        "rsi":          round(current_rsi, 2),
        "macd_hist":    round(macd_hist, 4),
        "vix":          round(vix, 2),
        "regime":       regime,
    }


# ─────────────────────────────────────────────────────────
#  PRICE HISTORY FOR CHART
# ─────────────────────────────────────────────────────────
def build_price_chart(close_series, regimes_list, dates):
    result = []
    for i, d in enumerate(dates):
        if i < len(regimes_list):
            result.append({
                "date":  d.strftime("%Y-%m-%d"),
                "price": round(float(close_series.iloc[i]), 4),
                "regime": regimes_list[i]
            })
    return result


# ─────────────────────────────────────────────────────────
#  API ENDPOINT
# ─────────────────────────────────────────────────────────
@app.route("/api/analyze", methods=["POST"])
def analyze():
    try:
        body   = request.get_json()
        ticker = body.get("ticker", "BTC-USD").strip().upper()
        start  = body.get("start", "2020-01-01")
        end    = body.get("end",   "2026-03-25")

        # 1. Feature engineering
        df, close_series = build_features(ticker, start, end)

        if len(df) < 55:
            return jsonify({"error": (
                f"Not enough data for '{ticker}' ({len(df)} usable rows). "
                "Try a wider date range — recommended: 2020-01-01 to 2026-03-25. "
                "Note: newer tickers like SOL-USD and DOGE-USD only have data from mid-2020 onward."
            )}), 400

        # 2. Supervised ML
        ml  = run_ml(df)

        # 3. Unsupervised ML
        uns = run_unsupervised(df)

        # 4. Signal
        sig = generate_signal(df, ml, uns)

        # 5. Price chart data
        price_chart = build_price_chart(close_series, uns["regimes"], df.index)

        # 6. Actual vs predicted chart (last 60 test or all test)
        n = min(60, len(ml["dates_test"]))
        av_chart = {
            "dates":     ml["dates_test"][-n:],
            "actual":    [round(v*100, 2) for v in ml["y_test"][-n:]],
            "predicted": [round(v*100, 2) for v in ml["champion_pred"][-n:]],
        }

        # 7. Feature importance chart
        fi_chart = {
            "labels": [f[0] for f in ml["feature_importance"]],
            "values": [round(f[1]*100, 3) for f in ml["feature_importance"]],
        }

        response = {
            "ticker":   ticker,
            "signal":   sig,
            "models": {
                "rf": {
                    "mae":    round(ml["rf"]["mae"]*100, 4),
                    "rmse":   round(ml["rf"]["rmse"]*100, 4),
                    "params": ml["rf"]["params"],
                    "winner": ml["champion"] == "Random Forest",
                },
                "xgb": {
                    "mae":    round(ml["xgb"]["mae"]*100, 4),
                    "rmse":   round(ml["xgb"]["rmse"]*100, 4),
                    "params": ml["xgb"]["params"],
                    "winner": ml["champion"] == "XGBoost",
                },
                "champion": ml["champion"],
            },
            "unsupervised": {
                "current_regime": uns["current_regime"],
                "pca": uns["pca"][-300:],   # last 300 points for chart
            },
            "charts": {
                "actual_vs_predicted": av_chart,
                "feature_importance":  fi_chart,
                "price_history":       price_chart[-365:],  # last year
            },
        }
        return jsonify(response)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    print("=" * 50)
    print("  ApexChain — Server starting on :5050")
    print("=" * 50)
    app.run(port=5050, debug=False)
