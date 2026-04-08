/* ═══════════════════════════════════════════════════════
   ApexChain — app.js
   Beginner/Expert toggle · API calls · Chart.js charts
   FAQ accordion · Loading states · Animated counters
═══════════════════════════════════════════════════════ */

const API_BASE = "http://localhost:5050";

/* ── Set end-date to today on load ──────────────────── */
(function setDefaultEndDate() {
  const today = new Date().toISOString().split("T")[0];
  const endEl = document.getElementById("end-date");
  if (endEl && !endEl.value) endEl.value = today;
})();
let avChart = null, fiChart = null, pcaChart = null, priceChart = null;

/* ── Particle Canvas Background ─────────────────────── */
(function initParticles() {
  const canvas = document.getElementById("particle-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let particles = [];
  const COLORS = ["#00C2FF", "#00FF9C", "#1E2D45"];

  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  window.addEventListener("resize", resize, { passive: true });
  resize();

  for (let i = 0; i < 80; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: Math.random() * 0.5 + 0.1,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Grid lines
    ctx.strokeStyle = "rgba(30,45,69,0.4)";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 80) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 80) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    // Particles
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ── Beginner / Expert Toggle ───────────────────────── */
const modeToggle = document.getElementById("mode-toggle");
const labelB = document.getElementById("label-b");
const labelE = document.getElementById("label-e");

function applyMode() {
  const isExpert = modeToggle.checked;
  document.body.classList.toggle("mode-expert", isExpert);
  document.body.classList.toggle("mode-beginner", !isExpert);
  labelB.classList.toggle("active-label", !isExpert);
  labelE.classList.toggle("active-label", isExpert);
}
modeToggle.addEventListener("change", applyMode);
applyMode();

/* ── Nav Scroll Effect ──────────────────────────────── */
const nav = document.getElementById("nav");
window.addEventListener("scroll", () => {
  nav.style.boxShadow = window.scrollY > 60
    ? "0 0 30px rgba(0,194,255,0.08)"
    : "none";
}, { passive: true });

/* ── Quick ticker buttons ───────────────────────────── */
function setTicker(t) {
  document.getElementById("ticker-input").value = t;
  document.getElementById("ticker-input").focus();
}

/* ── Docs Toggle ────────────────────────────────────── */
function toggleDocs() {
  const body = document.getElementById("docs-body");
  const btn = document.getElementById("docs-toggle-btn");
  const open = !body.classList.contains("hidden");
  body.classList.toggle("hidden", open);
  btn.textContent = open ? "▼ Expand Full Documentation" : "▲ Collapse Documentation";
}

/* ── FAQ Accordion ──────────────────────────────────── */
const FAQ_DATA = [
  {
    q: "❓ What is volatility and why does it matter?",
    a: "Volatility measures how wildly a price moves. Think of it like weather — high volatility = stormy market, low = calm and sunny. <strong>Expert:</strong> Annualised standard deviation of log returns. It is the core input to derivatives pricing (Black-Scholes) and risk management (VaR).",
  },
  {
    q: "❓ What does the BUY / SELL / HOLD signal actually mean?",
    a: "<em>BUY</em> = multiple AI signals align positively — conditions look good to consider entering. <em>SELL</em> = multiple negative signals — consider exiting or protecting. <em>HOLD</em> = mixed signals, wait and watch. <span class='faq-disclaimer'>This is NOT financial advice.</span>",
  },
  {
    q: "❓ What is RSI and why should I care?",
    a: "RSI is a score from 0–100 measuring market excitement. Below 35 = asset may be unfairly cheap (oversold). Above 65 = may be overpriced (overbought). Like a thermometer for investor emotions. <strong>Expert:</strong> Relative Strength Index — momentum oscillator measuring avg gain/loss over 14 periods.",
  },
  {
    q: "❓ What is MACD?",
    a: "MACD shows whether price momentum is speeding up or slowing down. Positive histogram = things are trending up. Negative = trending down. <strong>Expert:</strong> Moving Average Convergence Divergence — EMA(12) − EMA(26) with a 9-period signal line. Histogram = MACD line minus signal.",
  },
  {
    q: "❓ What is the VIX and why does it affect crypto?",
    a: "The VIX is the stock market's fear gauge. Below 20 = calm. Above 30 = investors are scared. Above 40 = panic mode. When Wall Street panics, crypto often follows — making VIX a powerful signal for our model. <strong>Expert:</strong> CBOE Volatility Index — 30-day implied vol of S&P 500 options.",
  },
  {
    q: "❓ What is a Market Regime?",
    a: "The overall mood of the market right now. Bull = prices rising, Bear = prices falling, Sideways = prices going nowhere. <strong>Expert:</strong> K-Means cluster label (n=3) mapped by average realised volatility — low RV = Bull, mid = Sideways, high = Bear. Detected with zero human-defined rules.",
  },
  {
    q: "❓ How does AI predict market behavior?",
    a: "The AI learns from hundreds of past market days — identifying which combinations of signals (fear levels, momentum, volatility patterns) typically preceded big moves. It then looks for those same patterns today. <strong>Expert:</strong> Ensemble regression (RF + XGBoost) on 27 engineered features, minimising RMSE on a chronological holdout.",
  },
  {
    q: "❓ What is Realised Volatility vs regular volatility?",
    a: "Realised Volatility is calculated from actual past price movements — a measurement, not a guess. Regular (implied) volatility is what the market expects in the future, baked into options prices. <strong>Expert:</strong> RV7 = rolling 7-day σ of log returns × √252 (annualised). Our target variable.",
  },
  {
    q: "❓ What are Random Forest and XGBoost?",
    a: "<em>Random Forest:</em> Like an analyst who memorised every market crash and rally in history — it combines thousands of pattern-matching rules to forecast. <em>XGBoost:</em> A smarter model that learns from its own mistakes step by step, like a student reviewing every wrong answer. <strong>Expert:</strong> Ensemble decision trees — bagging (RF) vs gradient boosting with residual correction (XGB).",
  },
  {
    q: "❓ Should I blindly follow the signal?",
    a: "<span class='faq-disclaimer'>No. ApexChain is a research and educational tool, not a financial advisor. The signal is derived from historical patterns that may not repeat. Always do your own research and consult a licensed professional before making any investment decisions. Past model performance does not guarantee future results.</span>",
  },
];

function buildFAQ() {
  const list = document.getElementById("faq-list");
  if (!list) return;
  FAQ_DATA.forEach((item, i) => {
    const div = document.createElement("div");
    div.className = "faq-item";
    div.innerHTML = `
      <div class="faq-q" onclick="toggleFAQ(${i})">
        <span>${item.q}</span>
        <span class="faq-arrow">▼</span>
      </div>
      <div class="faq-a">${item.a}</div>
    `;
    list.appendChild(div);
  });
}
function toggleFAQ(i) {
  const items = document.querySelectorAll(".faq-item");
  const item = items[i];
  const open = item.classList.contains("open");
  items.forEach(el => el.classList.remove("open"));
  if (!open) item.classList.add("open");
}
buildFAQ();

/* ── Loading State Manager ──────────────────────────── */
const LOAD_STEPS = ["ls-1", "ls-2", "ls-3", "ls-4", "ls-5", "ls-6"];
const LOAD_MSGS = [
  "Fetching market data…",
  "Engineering 27 features…",
  "Training Random Forest (GridSearchCV)…",
  "Training XGBoost (GridSearchCV)…",
  "Detecting market regime (K-Means + PCA)…",
  "Generating BUY/SELL/HOLD signal…",
];
let loadInterval = null;
let currentStep = 0;

function startLoading() {
  currentStep = 0;
  LOAD_STEPS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.className = "ls-item";
  });
  document.getElementById("loading-msg").textContent = LOAD_MSGS[0];
  document.getElementById("loading-state").classList.remove("hidden");
  document.getElementById("error-box").classList.add("hidden");
  document.getElementById("run-btn").disabled = true;
  if (loadInterval) clearInterval(loadInterval);
  loadInterval = setInterval(() => {
    if (currentStep < LOAD_STEPS.length) {
      const prev = document.getElementById(LOAD_STEPS[currentStep - 1]);
      if (prev) prev.className = "ls-item done";
      const cur = document.getElementById(LOAD_STEPS[currentStep]);
      if (cur) cur.className = "ls-item active";
      document.getElementById("loading-msg").textContent = LOAD_MSGS[Math.min(currentStep, LOAD_MSGS.length - 1)];
      currentStep++;
    }
  }, 650);
}

function stopLoading() {
  clearInterval(loadInterval);
  LOAD_STEPS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.className = "ls-item done";
  });
  setTimeout(() => {
    document.getElementById("loading-state").classList.add("hidden");
    document.getElementById("run-btn").disabled = false;
    document.getElementById("run-btn-text").textContent = "🚀 Run Analysis";
  }, 400);
}

/* ── Animated Counter ───────────────────────────────── */
function animateVal(el, target, suffix = "", decimals = 2) {
  const duration = 900;
  const start = performance.now();
  const from = parseFloat(el.textContent) || 0;
  function step(now) {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = (from + (target - from) * ease).toFixed(decimals) + suffix;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ── Update Hero Badge ──────────────────────────────── */
function updateHeroBadge(signal, reason) {
  const badge = document.getElementById("hero-badge");
  badge.className = "signal-badge-large pulsing " + signal.toLowerCase();
  document.getElementById("hero-signal-text").textContent = signal;
  document.getElementById("hero-reason").textContent = reason || "";
}

/* ── Render Signal Dashboard ─────────────────────────── */
function _renderDashboardCore(data) {
  const { signal, models } = data;

  // Section heading
  document.getElementById("dashboard-title").textContent =
    `Analysis Results — ${data.ticker}`;

  // Signal badge
  const mainBadge = document.getElementById("main-signal-badge");
  mainBadge.className = "signal-badge-xl pulsing " + signal.signal.toLowerCase();
  document.getElementById("main-signal-text").textContent = signal.signal;

  // Score & confidence
  const scoreLabel = signal.score >= 0 ? `+${signal.score}` : `${signal.score}`;
  document.getElementById("signal-score-val").textContent = `${scoreLabel} / ${signal.max_score}`;
  document.getElementById("confidence-pct").textContent = `${signal.confidence}%`;
  const fill = document.getElementById("confidence-fill");
  setTimeout(() => { fill.style.width = signal.confidence + "%"; }, 100);

  // Main reason (first positive reason or first reason)
  const firstReason = signal.reasons.find(r => r.icon === "✅") || signal.reasons[0];
  document.getElementById("signal-reason-main").textContent = firstReason ? firstReason.text : "—";

  // Hero badge
  updateHeroBadge(signal.signal, firstReason ? firstReason.text : "");

  // Metric cards
  animateVal(document.getElementById("mc-forecasted-rv"), signal.forecasted_rv, "%");
  animateVal(document.getElementById("mc-current-rv"), signal.current_rv, "%");
  animateVal(document.getElementById("mc-rsi"), signal.rsi, "", 1);
  animateVal(document.getElementById("mc-vix"), signal.vix, "", 1);
  document.getElementById("mc-regime").textContent = regiStr(signal.regime);

  // Delta arrow
  const delta = signal.forecasted_rv - signal.current_rv;
  const deltaEl = document.getElementById("mc-rv-delta");
  deltaEl.textContent = (delta >= 0 ? "▲ +" : "▼ ") + delta.toFixed(2) + "% vs current";
  deltaEl.className = "mc-delta " + (delta >= 0 ? "up" : "down");

  // RSI tag
  const rsiTag = document.getElementById("mc-rsi-tag");
  if (signal.rsi < 35) { rsiTag.textContent = "Oversold"; rsiTag.className = "mc-tag green"; }
  else if (signal.rsi > 65) { rsiTag.textContent = "Overbought"; rsiTag.className = "mc-tag red"; }
  else { rsiTag.textContent = "Neutral"; rsiTag.className = "mc-tag yellow"; }

  // VIX tag
  const vixTag = document.getElementById("mc-vix-tag");
  if (signal.vix < 20) { vixTag.textContent = "Low Fear"; vixTag.className = "mc-tag green"; }
  else if (signal.vix > 30) { vixTag.textContent = "High Fear"; vixTag.className = "mc-tag red"; }
  else { vixTag.textContent = "Moderate"; vixTag.className = "mc-tag yellow"; }

  // Reasoning list
  const list = document.getElementById("reasoning-list");
  list.innerHTML = "";
  signal.reasons.forEach(r => {
    const div = document.createElement("div");
    div.className = "reason-item";
    div.innerHTML = `
      <span class="reason-icon">${r.icon}</span>
      <div class="reason-texts">
        <div class="reason-plain">${r.text}</div>
        <div class="reason-expert expert-text">${r.expert}</div>
      </div>`;
    list.appendChild(div);
  });

  // Models table
  renderModelsTable(models);

  // Show dashboard
  document.getElementById("dashboard").classList.remove("hidden");
  document.getElementById("dashboard").scrollIntoView({ behavior: "smooth", block: "start" });
}

function regiStr(r) {
  if (r === "Bull") return "🟢 Bull";
  if (r === "Bear") return "🔴 Bear";
  return "🟡 Sideways";
}

/* ── Models Table ───────────────────────────────────── */
function renderModelsTable(models) {
  const tbody = document.getElementById("models-tbody");
  if (!tbody) return;

  const rfWin = models.rf.winner;
  const xgbWin = models.xgb.winner;

  tbody.innerHTML = `
    <tr class="${rfWin ? 'winner-row' : ''}">
      <td style="font-weight:700">🌲 Random Forest</td>
      <td class="mono-cell">${models.rf.mae.toFixed(4)}%</td>
      <td class="mono-cell">${models.rf.rmse.toFixed(4)}%</td>
      <td class="mono-cell" style="font-size:0.75rem;color:var(--muted)">${JSON.stringify(models.rf.params).replace(/"/g, '').replace(/,/g, ', ')}</td>
      <td>${rfWin ? '<span class="badge-winner">🏆 Champion</span>' : '<span class="badge-runner">🥈 Runner-up</span>'}</td>
    </tr>
    <tr class="${xgbWin ? 'winner-row' : ''}">
      <td style="font-weight:700">⚡ XGBoost</td>
      <td class="mono-cell">${models.xgb.mae.toFixed(4)}%</td>
      <td class="mono-cell">${models.xgb.rmse.toFixed(4)}%</td>
      <td class="mono-cell" style="font-size:0.75rem;color:var(--muted)">${JSON.stringify(models.xgb.params).replace(/"/g, '').replace(/,/g, ', ')}</td>
      <td>${xgbWin ? '<span class="badge-winner">🏆 Champion</span>' : '<span class="badge-runner">🥈 Runner-up</span>'}</td>
    </tr>`;

  document.getElementById("models-placeholder").classList.add("hidden");
  document.getElementById("models-table-wrap").classList.remove("hidden");
}

/* ── Chart.js rendering ─────────────────────────────── */
const CHART_DEFAULTS = {
  color: "#E2E8F0",
  borderColor: "#1E2D45",
  plugins: {
    legend: { labels: { color: "#94A3B8", font: { family: "Space Grotesk", size: 11 } } },
    tooltip: { backgroundColor: "#111827", titleColor: "#E2E8F0", bodyColor: "#94A3B8", borderColor: "#1E2D45", borderWidth: 1 }
  }
};

function destroyChart(ref) { if (ref) { ref.destroy(); } }

function buildAVChart(chartData) {
  destroyChart(avChart);
  const ctx = document.getElementById("av-chart").getContext("2d");
  const n = chartData.dates.length;
  const band_up = chartData.actual.map(v => +(v * 1.10).toFixed(2));
  const band_down = chartData.actual.map(v => +(v * 0.90).toFixed(2));
  avChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: chartData.dates,
      datasets: [
        { label: "Actual RV (%)", data: chartData.actual, borderColor: "#00C2FF", backgroundColor: "rgba(0,194,255,0.06)", borderWidth: 2, fill: false, tension: 0.35, pointRadius: 0 },
        { label: "Predicted RV (%)", data: chartData.predicted, borderColor: "#00FF9C", backgroundColor: "transparent", borderWidth: 2, borderDash: [5, 3], fill: false, tension: 0.35, pointRadius: 0 },
        { label: "+10% Band", data: band_up, borderColor: "transparent", backgroundColor: "rgba(0,194,255,0.06)", borderWidth: 0, fill: "+1", pointRadius: 0 },
        { label: "-10% Band", data: band_down, borderColor: "transparent", backgroundColor: "rgba(0,194,255,0.06)", borderWidth: 0, fill: false, pointRadius: 0 },
      ]
    },
    options: {
      ...CHART_DEFAULTS,
      responsive: true, maintainAspectRatio: true,
      scales: {
        x: { ticks: { color: "#64748B", maxTicksLimit: 8, font: { size: 10 } }, grid: { color: "rgba(30,45,69,0.6)" } },
        y: { ticks: { color: "#64748B", callback: v => v + "%" }, grid: { color: "rgba(30,45,69,0.6)" } }
      },
    }
  });
}

function buildFIChart(chartData) {
  destroyChart(fiChart);
  const ctx = document.getElementById("fi-chart").getContext("2d");
  fiChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: [...chartData.labels].reverse(),
      datasets: [{
        label: "Importance (%)",
        data: [...chartData.values].reverse(),
        backgroundColor: ctx => {
          const g = ctx.chart.ctx.createLinearGradient(0, 0, ctx.chart.width, 0);
          g.addColorStop(0, "rgba(0,194,255,0.15)");
          g.addColorStop(1, "rgba(0,194,255,0.7)");
          return g;
        },
        borderColor: "#00C2FF", borderWidth: 1, borderRadius: 4,
      }]
    },
    options: {
      ...CHART_DEFAULTS,
      indexAxis: "y",
      responsive: true, maintainAspectRatio: true,
      scales: {
        x: { ticks: { color: "#64748B", callback: v => v.toFixed(1) + "%" }, grid: { color: "rgba(30,45,69,0.6)" } },
        y: { ticks: { color: "#94A3B8", font: { size: 10 } }, grid: { display: false } }
      }
    }
  });
}

function buildPCAChart(pcaData) {
  destroyChart(pcaChart);
  const ctx = document.getElementById("pca-chart").getContext("2d");
  const color = { Bull: "#00FF9C", Sideways: "#FFD700", Bear: "#FF4444" };
  const regimes = ["Bull", "Sideways", "Bear"];
  const ds = regimes.map(r => ({
    label: r,
    data: pcaData.filter(d => d.regime === r).slice(-200).map(d => ({ x: d.x, y: d.y, date: d.date })),
    backgroundColor: color[r] + "55",
    borderColor: color[r],
    pointRadius: 3, pointHoverRadius: 5,
  }));
  // Mark last point (current day) with a star
  const last = pcaData[pcaData.length - 1];
  ds.push({
    label: "⭐ Today",
    data: [{ x: last.x, y: last.y }],
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
    pointRadius: 9, pointStyle: "star",
  });
  pcaChart = new Chart(ctx, {
    type: "scatter",
    data: { datasets: ds },
    options: {
      ...CHART_DEFAULTS,
      responsive: true, maintainAspectRatio: true,
      scales: {
        x: { ticks: { color: "#64748B" }, grid: { color: "rgba(30,45,69,0.6)" } },
        y: { ticks: { color: "#64748B" }, grid: { color: "rgba(30,45,69,0.6)" } }
      },
      plugins: {
        ...CHART_DEFAULTS.plugins,
        tooltip: {
          ...CHART_DEFAULTS.plugins.tooltip,
          callbacks: { label: ctx => `${ctx.dataset.label} — ${ctx.raw.date || "Today"} (${ctx.raw.x?.toFixed(2)}, ${ctx.raw.y?.toFixed(2)})` }
        }
      }
    }
  });
}

function buildPriceChart(priceData) {
  destroyChart(priceChart);
  const ctx = document.getElementById("price-chart").getContext("2d");
  const color = { Bull: "rgba(0,255,156,0.7)", Sideways: "rgba(255,215,0,0.7)", Bear: "rgba(255,68,68,0.7)" };
  const regimes = ["Bull", "Sideways", "Bear"];
  const labels = priceData.map(d => d.date);
  const prices = priceData.map(d => d.price);

  // Create segmented datasets per regime for coloring
  const ds = regimes.map(r => ({
    label: r,
    data: priceData.map(d => d.regime === r ? d.price : null),
    borderColor: color[r],
    backgroundColor: "transparent",
    borderWidth: 2, fill: false, tension: 0.3, pointRadius: 0,
    spanGaps: false,
  }));

  priceChart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets: ds },
    options: {
      ...CHART_DEFAULTS,
      responsive: true, maintainAspectRatio: true,
      scales: {
        x: { ticks: { color: "#64748B", maxTicksLimit: 8, font: { size: 10 } }, grid: { color: "rgba(30,45,69,0.6)" } },
        y: { ticks: { color: "#64748B" }, grid: { color: "rgba(30,45,69,0.6)" } }
      }
    }
  });
}

/* ── Main Analysis Function ──────────────────────────── */
async function runAnalysis() {
  const ticker = document.getElementById("ticker-input").value.trim().toUpperCase();
  const startDate = document.getElementById("start-date").value;
  const endDate = document.getElementById("end-date").value;

  if (!ticker) {
    showError("Please enter a ticker symbol.");
    return;
  }

  startLoading();
  document.getElementById("dashboard").classList.add("hidden");

  try {
    const resp = await fetch(`${API_BASE}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, start: startDate, end: endDate }),
    });

    const data = await resp.json();
    stopLoading();

    if (!resp.ok || data.error) {
      showError(data.error || "Analysis failed. Please check ticker and date range.");
      return;
    }

    // Render everything
    renderDashboard(data);

    // Build charts
    setTimeout(() => {
      buildAVChart(data.charts.actual_vs_predicted);
      buildFIChart(data.charts.feature_importance);
      buildPCAChart(data.unsupervised.pca);
      buildPriceChart(data.charts.price_history);
    }, 100);

  } catch (err) {
    stopLoading();
    showError("Cannot reach the analysis server. Make sure the local backend is running: open a terminal and run 'python server.py' from the website folder, then try again.");
  }
}

function showError(msg) {
  document.getElementById("loading-state").classList.add("hidden");
  document.getElementById("run-btn").disabled = false;
  const box = document.getElementById("error-box");
  document.getElementById("error-msg").textContent = msg;
  box.classList.remove("hidden");
}

/* ── Enter key shortcut ─────────────────────────────── */
document.getElementById("ticker-input").addEventListener("keydown", e => {
  if (e.key === "Enter") runAnalysis();
});

/* ── Smooth scroll for nav active state ─────────────── */
const navLinks = document.querySelectorAll(".nav-links a");
const sections = document.querySelectorAll("section[id]");
window.addEventListener("scroll", () => {
  let current = "";
  sections.forEach(sec => {
    if (window.scrollY >= sec.offsetTop - 80) current = sec.id;
  });
  navLinks.forEach(a => {
    a.style.color = a.getAttribute("href") === `#${current}` ? "var(--blue)" : "";
  });
}, { passive: true });


/* ═══════════════════════════════════════════════════════
   RISK ASSESSMENT MODULE
   — Slider sync, profile rendering, RSI meter, re-scoring
═══════════════════════════════════════════════════════ */

/* Store the last API response so the slider can re-score without re-fetching */
let _lastAnalysisData = null;

/* ── Risk profile helpers ────────────────────────────── */
function getRiskProfile(level) {
  if (level <= 3) return "conservative";
  if (level <= 6) return "moderate";
  return "aggressive";
}

function getRsiThresholds(level) {
  if (level === 1) return { buy: 25, sell: 60 };
  if (level <= 3) return { buy: 30, sell: 65 };
  if (level <= 6) return { buy: 35, sell: 65 };
  if (level <= 8) return { buy: 45, sell: 72 };
  return { buy: 55, sell: 78 };
}

function getRiskWarning(level) {
  if (level === 1) return "⚠️ Very tight entry conditions. Rare BUY signals only.";
  if (level >= 9) return "⚠️ Aggressive entry. Higher potential reward but elevated drawdown risk.";
  return null;
}

const PROFILE_COPY = {
  conservative: {
    label: "🛡️ Conservative",
    expert: "Low risk tolerance. Signal threshold tightened. BUY only triggered on score ≥ 5. SELL triggered on score ≤ -2. RSI BUY threshold tightened to &lt; 30. Elevated VIX penalty applied at &gt; 20.",
    beginner: "You prefer to keep your money safe. The AI will only recommend BUY when it is very confident — think of this as only going outside when the weather forecast is nearly perfect.",
  },
  moderate: {
    label: "⚖️ Moderate",
    expert: "Balanced risk/reward. Default signal thresholds apply. BUY on score ≥ 3, SELL on score ≤ -2. Standard RSI bounds (&lt; 35 / &gt; 65).",
    beginner: "You are comfortable with some ups and downs in exchange for growth. The AI uses its standard settings — a balanced approach for most investors.",
  },
  aggressive: {
    label: "🔥 Aggressive",
    expert: "High risk tolerance. Signal thresholds loosened. BUY triggered on score ≥ 2. SELL only on score ≤ -3. RSI BUY threshold widened to &lt; 45. VIX penalty only applied above 35.",
    beginner: "You are comfortable with big swings in exchange for potentially bigger rewards. The AI will recommend BUY more often — like a surfer who paddles out even when the waves are rough.",
  },
};

/* ── Apply profile to both slider UIs ───────────────── */
function applyRiskProfile(level) {
  level = parseInt(level);
  const profile = getRiskProfile(level);
  const copy = PROFILE_COPY[profile];
  const colors = { conservative: "#00FF9C", moderate: "#FFD700", aggressive: "#FF4444" };
  const col = colors[profile];

  /* Active labels */
  const labelText = `${copy.label} Investor (Level ${level})`;
  ["risk-active-label", "risk-active-label-dash"].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = labelText; el.style.color = col; }
  });

  /* Slider track colour */
  document.querySelectorAll(".risk-range").forEach(sl => {
    sl.style.accentColor = col;
    sl.style.setProperty("--thumb", col);
    sl.className = `risk-range ${profile}`;
  });

  /* Profile badge & description in dashboard card */
  const badge = document.getElementById("risk-profile-badge");
  if (badge) {
    badge.className = `risk-profile-badge ${profile}`;
    badge.textContent = `${copy.label.split(" ")[0]} ${profile.toUpperCase()}`;
  }
  const descE = document.getElementById("rp-desc-expert");
  const descB = document.getElementById("rp-desc-beginner");
  if (descE) descE.innerHTML = copy.expert;
  if (descB) descB.innerHTML = copy.beginner;

  /* Risk card border glow colour */
  const card = document.getElementById("risk-card");
  if (card) card.style.borderColor = col + "55";

  /* Re-score if we have data */
  if (_lastAnalysisData) {
    updateRiskAdjustedSignal(level);
    updateRSIMeter(_lastAnalysisData.signal.rsi, level);
  }
}

/* ── Compute risk-adjusted signal client-side ────────── */
function computeRiskAdjustedSignal(sigData, riskLevel) {
  const { rv_trend, rsi, macd_hist, vix, regime, forecasted_rv } = sigData;
  // rv_trend and forecasted_rv come from the server as % values
  const rvTrend = rv_trend / 100;           // back to decimal
  const fRV = forecasted_rv / 100;      // 0.xx annualised
  const profile = getRiskProfile(riskLevel);
  const rsiThr = getRsiThresholds(riskLevel);

  let score = 0;

  /* 1. RV trend ±2 */
  if (rvTrend < -0.03) score += 2;
  else if (rvTrend > 0.03) score -= 2;

  /* 2. RSI — risk-adjusted thresholds */
  if (rsi < rsiThr.buy) score += 2;
  else if (rsi > rsiThr.sell) score -= 2;

  /* 3. MACD ±1 */
  if (macd_hist > 0) score += 1;
  else score -= 1;

  /* 4. VIX — penalty threshold shifts by profile */
  const vixPenThreshold = profile === "conservative" ? 20 : (profile === "aggressive" ? 35 : 30);
  if (vix < 20) score += 1;
  else if (vix > vixPenThreshold) score -= 1;

  /* 5. Regime ±1 */
  if (regime === "Bull") score += 1;
  else if (regime === "Bear") score -= 1;

  /* Conservative extra: high-vol penalty */
  if (profile === "conservative" && fRV > 0.35) score -= 1;

  /* Aggressive extra: MACD momentum bonus */
  if (profile === "aggressive" && macd_hist > 0) score += 1;

  /* Determine signal with profile-specific thresholds */
  const buyThreshold = profile === "conservative" ? 5 : (profile === "aggressive" ? 2 : 3);
  const sellThreshold = profile === "aggressive" ? -3 : -2;

  let signal;
  if (score >= buyThreshold) signal = "BUY";
  else if (score <= sellThreshold) signal = "SELL";
  else signal = "HOLD";

  const confidence = Math.min(100, 50 + Math.abs(score) * 10);
  return { signal, score, confidence, buyThreshold, sellThreshold, profile };
}

/* ── Update risk-adjusted signal UI ─────────────────── */
function updateRiskAdjustedSignal(level) {
  if (!_lastAnalysisData) return;
  const sigData = _lastAnalysisData.signal;
  const result = computeRiskAdjustedSignal(sigData, level);
  const profile = getRiskProfile(level);

  const badge = document.getElementById("ra-signal-badge");
  const text = document.getElementById("ra-signal-text");
  const line1 = document.getElementById("ra-signal-line1");
  const line2 = document.getElementById("ra-signal-line2");

  if (!badge) return;
  badge.className = `ra-signal-badge ${result.signal.toLowerCase()}`;
  text.textContent = result.signal;

  const filterName = profile.charAt(0).toUpperCase() + profile.slice(1);
  const thresholdDir = profile === "conservative" ? "raised" : (profile === "aggressive" ? "lowered" : "unchanged");
  const confMsg = profile === "conservative"
    ? "Conservative filter active — only high-conviction signals shown"
    : (profile === "aggressive"
      ? "Aggressive filter active — wider entry window, higher volatility tolerance"
      : "Standard Moderate filter active");

  line1.textContent = confMsg;
  line2.textContent = `Base score: ${result.score >= 0 ? "+" : ""}${result.score} — ${filterName} filter ${thresholdDir} BUY threshold to ≥ ${result.buyThreshold}`;

  /* Level-specific warning */
  const warn = getRiskWarning(parseInt(level));
  if (warn && line1) {
    line1.textContent = warn + " " + confMsg;
  }
}

/* ── RSI Meter rendering ─────────────────────────────── */
function updateRSIMeter(rsiValue, level) {
  const thr = getRsiThresholds(level);
  const buy = thr.buy;    // e.g. 35
  const sell = thr.sell;   // e.g. 65

  /* Zone widths as % of 0–100 RSI range */
  const buyFlex = buy;          // 0 → buy
  const neutralFlex = sell - buy;   // buy → sell
  const sellFlex = 100 - sell;   // sell → 100

  const buyEl = document.getElementById("rsi-zone-buy");
  const neutEl = document.getElementById("rsi-zone-neutral");
  const sellEl = document.getElementById("rsi-zone-sell");
  const needle = document.getElementById("rsi-needle");
  const statusEl = document.getElementById("rsi-status");

  if (!buyEl) return;

  buyEl.style.flex = buyFlex;
  neutEl.style.flex = neutralFlex;
  sellEl.style.flex = sellFlex;

  /* Needle position as % of container */
  const needlePct = Math.max(0, Math.min(100, rsiValue));
  needle.style.left = `calc(${needlePct}% - 1.5px)`;

  /* Status text */
  let status;
  if (rsiValue < buy) status = `Current RSI: ${rsiValue.toFixed(1)} — In your Buy Zone ✅`;
  else if (rsiValue > sell) status = `Current RSI: ${rsiValue.toFixed(1)} — In your Sell Zone 🔴`;
  else status = `Current RSI: ${rsiValue.toFixed(1)} — Neutral territory ⚖️`;
  statusEl.textContent = status;
}

/* ── Slider event handlers ──────────────────────────── */
function onRiskSliderChange(value) {
  /* Sync the dashboard slider to match */
  const dashSlider = document.getElementById("risk-slider-dash");
  if (dashSlider) dashSlider.value = value;
  applyRiskProfile(value);
}

function syncRiskSliders(value) {
  /* Sync the analyzer sidebar slider to match */
  const analyzerSlider = document.getElementById("risk-slider");
  if (analyzerSlider) analyzerSlider.value = value;
  applyRiskProfile(value);
}

/* ── Initialise slider state on page load ────────────── */
applyRiskProfile(5);

/* ── Risk-aware renderDashboard (calls _renderDashboardCore) */
function renderDashboard(data) {
  _renderDashboardCore(data);

  /* Store for slider re-use */
  _lastAnalysisData = data;

  /* Restore risk warning banner on each new run */
  const rw = document.getElementById("risk-warning");
  if (rw) rw.classList.remove("hidden");

  /* Update RSI meter & risk-adjusted signal */
  const riskLevel = parseInt(document.getElementById("risk-slider-dash")?.value || 5);
  updateRSIMeter(data.signal.rsi, riskLevel);
  updateRiskAdjustedSignal(riskLevel);
}
