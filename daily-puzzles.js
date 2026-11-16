// Daily puzzles and attempts are saved in this browser without a database.
const DAILY_SESSION_KEY = "pretiumlabs-daily-session-v1";
const DAILY_PUZZLES_KEY = "pretiumlabs-daily-puzzles-v1";
// This local identity remains stable across reloads; it grants no server access.
const dailyPageTokens = new Map();
let dailyState = { identity: "", ready: false, today: "", firstDate: "", attempts: {}, error: "" };
let dailyRound = null;
const DAILY_LAUNCH_DATE = "2026-11-14";
const dailyPreviewPuzzles = new Map();
let dailyBrowserLoaded = false;

function loadDailyBrowserPuzzles() {
  if (dailyBrowserLoaded) return;
  const saved = readBrowserData(DAILY_PUZZLES_KEY, {});
  if (saved && typeof saved === "object" && !Array.isArray(saved)) {
    Object.entries(saved).forEach(([day, puzzle]) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(day) && Array.isArray(puzzle?.candles) && typeof puzzle.answer === "string") {
        dailyPreviewPuzzles.set(day, puzzle);
      }
    });
  }
  dailyBrowserLoaded = true;
}

function saveDailyBrowserPuzzle(day, puzzle) {
  const next = new Map(dailyPreviewPuzzles);
  next.set(day, puzzle);
  writeBrowserData(DAILY_PUZZLES_KEY, Object.fromEntries(next), true);
  dailyPreviewPuzzles.set(day, puzzle);
}

async function dailyPreviewApi(path, body) {
  loadDailyBrowserPuzzles();
  const today = new Date().toISOString().slice(0, 10);
  const url = new URL(path, "http://preview.local");
  const todayAttempt = dailyPreviewPuzzles.get(today)?.attempt;
  if (url.pathname === "/api/daily/status") {
    const attempts = Object.fromEntries([...dailyPreviewPuzzles].filter(([, puzzle]) => puzzle.attempt)
      .map(([day, puzzle]) => [day, puzzle.attempt]));
    return { today, firstDate: DAILY_LAUNCH_DATE, timezone: "UTC", attempts,
      archiveUnlocked: Boolean(todayAttempt),
      secondsUntilReset: Math.max(1, (Date.parse(`${today}T00:00:00Z`) + 86400000 - Date.now()) / 1000) };
  }
  const day = body?.date || url.searchParams.get("date") || today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(`${day}T00:00:00Z`))
      || new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day
      || day < DAILY_LAUNCH_DATE || day > today) throw new Error("This puzzle date is not available.");
  if (day !== today && !todayAttempt) throw new Error("Complete today's puzzle to unlock the archive.");
  if (!dailyPreviewPuzzles.has(day)) {
    const published = Date.parse(`${day}T00:00:00Z`);
    const dateBefore = days => new Date(published - days * 86400000).toISOString().slice(0, 10);
    const tickers = ["SPY", "QQQ", "BTC-USD", "TLT", "RIVN", "^GSPC", "GC=F"];
    const ticker = tickers[Math.floor(published / 86400000) % tickers.length];
    const chart = await api(`/api/chart?symbol=${encodeURIComponent(ticker)}&start=${dateBefore(130)}&end=${dateBefore(1)}&interval=1d`);
    const candles = chart.candles.slice(-72);
    if (candles.length < 72) throw new Error("Not enough historical market data for this Daily puzzle. Please retry.");
    const answer = answerFor(candles.map((bar, index) => ({ ...bar, ...(index === 0 ? { observedEnd: 46 } : {}) })));
    if (!dailyPreviewPuzzles.has(day)) saveDailyBrowserPuzzle(day, { ...chart, id: `daily-preview:${day}`, date: day, version: "preview",
      timeframe: "3M", interval: "1d", observedEnd: 46, candles, answer, attempt: null,
      sourceNote: "Yahoo Finance historical data. Results are saved in this browser." });
  }
  let puzzle = dailyPreviewPuzzles.get(day);
  let created = false;
  if (body) {
    if (body.puzzleId !== puzzle.id) throw new Error("The puzzle changed. Reload it before answering.");
    if (!["Up", "Down", "Sideways", "Breakout", "Reversal", "Volatility spike"].includes(body.choice)) {
      throw new Error("Choose one of the six available predictions.");
    }
    if (!puzzle.attempt) {
      const attempt = { completed: true, puzzleId: puzzle.id, date: day, ticker: puzzle.ticker,
        choice: body.choice, correct: body.choice === puzzle.answer, answer: puzzle.answer,
        completedAt: new Date().toISOString() };
      puzzle = { ...puzzle, attempt };
      saveDailyBrowserPuzzle(day, puzzle);
      created = true;
    }
  }
  const { answer, ...publicPuzzle } = puzzle;
  publicPuzzle.candles = puzzle.attempt ? puzzle.candles : puzzle.candles.slice(0, puzzle.observedEnd);
  publicPuzzle.candleTimes = puzzle.candles.map(bar => bar.time);
  publicPuzzle.today = today;
  publicPuzzle.firstDate = DAILY_LAUNCH_DATE;
  return body ? { created, puzzle: publicPuzzle } : publicPuzzle;
}

function dailyIdentityKey() { return dailySessionToken(); }

function dailyToday() {
  return dailyState.identity === dailyIdentityKey() && dailyState.today
    ? dailyState.today : new Date().toISOString().slice(0, 10);
}

function dailySessionToken() {
  const key = accountScopedKey(DAILY_SESSION_KEY);
  let token = dailyPageTokens.get(key) || readBrowserData(DAILY_SESSION_KEY, "");
  if (!/^[a-f0-9]{64}$/.test(token || "")) {
    token = [...crypto.getRandomValues(new Uint8Array(32))].map(value => value.toString(16).padStart(2, "0")).join("");
    dailyPageTokens.set(key, token);
    writeBrowserData(DAILY_SESSION_KEY, token);
  }
  return token;
}

async function dailyApi(path, body) { return dailyPreviewApi(path, body); }

async function refreshDailyStatus(month = "") {
  const identity = dailyIdentityKey();
  if (dailyState.identity !== identity) {
    dailyState = { identity, ready: false, today: "", firstDate: "", attempts: {}, error: "" };
  }
  try {
    const data = await dailyApi(`/api/daily/status${month ? `?month=${encodeURIComponent(month)}` : ""}`);
    if (dailyIdentityKey() !== identity) return false;
    dailyState = { identity, ready: true, today: data.today, firstDate: data.firstDate,
      attempts: { ...dailyState.attempts, ...data.attempts }, error: "",
      resetAfter: performance.now() + data.secondsUntilReset * 1000 };
    return true;
  } catch (error) {
    if (dailyIdentityKey() === identity) {
      dailyState.ready = false;
      dailyState.error = error.message;
    }
    return false;
  }
}

function dailyChallengeCandles() {
  if (!dailyRound || dailyRound.identity !== dailyIdentityKey() || dailyRound.data.date !== selectedDailyDate) return [];
  const data = dailyRound.data;
  const last = data.candles[Math.min(data.observedEnd, data.candles.length) - 1];
  return data.candleTimes.map((time, index) => ({ ...(data.candles[index] || {
    time, open: last.close, high: last.close, low: last.close, close: last.close, volume: 0,
    ...(data.historyMasked ? { indexedPrice: true } : {}),
    ...(last.challengeIndex ? { challengeIndex: index + 1 } : {})
  }), date: new Date(time * 1000), future: index >= data.observedEnd, observedEnd: data.observedEnd,
    dailyAnswer: data.attempt?.answer }));
}

function dailyPredictionLocked(choice = "") {
  return !dailyRound || dailyRound.identity !== dailyIdentityKey() || dailyRound.data.date !== selectedDailyDate
    || dailyRound.busy || Boolean(dailyRound.data.attempt)
    || Boolean(dailyRound.pendingChoice && choice !== dailyRound.pendingChoice);
}

function showDailySavedResult() {
  const attempt = dailyRound?.data.attempt;
  if (!attempt) return;
  revealed = true;
  renderChoices();
  document.querySelectorAll(".choices button").forEach(button => {
    const correct = button.dataset.choice === attempt.answer;
    button.dataset.state = correct ? "correct" : "wrong";
    button.classList.toggle("selected", button.dataset.choice === attempt.choice);
    button.classList.toggle("correct", correct);
    button.classList.toggle("wrong", !correct);
    applyPredictionResultColor(button, button.dataset.state);
  });
  revealTag.textContent = "Daily result saved";
  result.innerHTML = `<strong>${attempt.correct ? "Correct call" : "Not this time"}: ${escapeHtml(attempt.answer)}</strong><p>Your prediction: ${escapeHtml(attempt.choice)}. This attempt is already saved.</p><p>${explanationFor(attempt.answer)}</p>`;
  drawChart();
}

async function submitDailyPrediction(choice) {
  if (dailyPredictionLocked(choice) || revealed) return;
  const round = dailyRound;
  const requestId = chartRequestId;
  round.busy = true;
  round.pendingChoice = choice;
  renderChoices();
  result.textContent = "Saving your Daily prediction…";
  try {
    const response = await dailyApi("/api/daily/attempt", { date: round.data.date, puzzleId: round.data.id, choice,
      visibility: typeof predictionVisibilityReport === "function" ? predictionVisibilityReport(round.data.id) : undefined });
    if (dailyRound !== round || round.identity !== dailyIdentityKey() || appMode !== "daily" || requestId !== chartRequestId) return;
    round.data = response.puzzle;
    round.busy = false;
    dailyState.attempts[round.data.date] = round.data.attempt;
    const masked = Boolean(rawCandles[0]?.indexedPrice);
    if (masked) restoreHistoricalChartScale(round.data.candles);
    currentSymbol = { ticker: round.data.ticker, name: round.data.name,
      asset: round.data.asset, exchange: round.data.exchange, currency: round.data.currency };
    rawCandles = round.data.candles.map(bar => ({ ...bar, date: new Date(bar.time * 1000) }));
    latestSeries = dailyChallengeCandles();
    if (masked) syncChartMetadata();
    renderChoices();
    if (response.result || response.created) {
      // Only a newly committed attempt enters the existing local XP/Review flow.
      round.grading = true;
      predict(round.data.attempt.choice, document.querySelector(`[data-choice="${round.data.attempt.choice}"]`), response.result || null);
      round.grading = false;
    } else {
      showDailySavedResult();
      renderModeSurface();
    }
  } catch (error) {
    if (dailyRound === round && round.identity === dailyIdentityKey() && appMode === "daily" && requestId === chartRequestId) {
      round.busy = false;
      renderChoices();
      result.textContent = `${error.message} Choose ${round.pendingChoice} again to confirm the same prediction, or reload to check its saved result.`;
    }
  }
}

async function loadDailyPuzzle() {
  const requestId = ++chartRequestId;
  const identity = dailyIdentityKey();
  dailyRound = null;
  rawCandles = [];
  latestSeries = [];
  clearPracticeChoices();
  drawChart();
  setLoading(true, "Loading the saved Daily Puzzle…");
  const current = () => requestId === chartRequestId && appMode === "daily" && identity === dailyIdentityKey();
  try {
    const previousToday = dailyState.today;
    if (!await refreshDailyStatus()) throw new Error(dailyState.error);
    if (!current()) return false;
    if (selectedDailyDate === previousToday && previousToday !== dailyToday()) selectedDailyDate = dailyToday();
    if (!selectedDailyDate || selectedDailyDate > dailyToday() || selectedDailyDate < dailyState.firstDate) selectedDailyDate = dailyToday();
    renderModeSurface();
    const data = await dailyApi(`/api/daily/puzzle?date=${encodeURIComponent(selectedDailyDate)}`);
    if (!current()) return false;
    dailyRound = { data, identity, busy: false, grading: false, pendingChoice: "" };
    if (!data.attempt && typeof trackPredictionVisibility === "function") trackPredictionVisibility(data.id);
    if (data.attempt) dailyState.attempts[data.date] = data.attempt;
    timeframe = data.timeframe;
    const localName = localSymbols.find(([ticker]) => ticker === data.ticker)?.[1];
    currentSymbol = { ticker: data.ticker, name: data.name !== data.ticker ? data.name : localName || data.name,
      asset: data.asset, exchange: data.exchange, currency: data.currency };
    rawCandles = data.candles.map(bar => ({ ...bar, date: new Date(bar.time * 1000) }));
    chartWindowStart = null;
    chartWindowScale = 1;
    loadCurrentSymbol();
    renderModeSurface();
    symbolStatus.textContent = data.version === "preview"
      ? `${data.ticker} · Daily Puzzle ${data.date} · Yahoo Finance historical data · resets at 00:00 UTC`
      : `${data.ticker} · Daily Puzzle ${data.date} · saved historical chart · resets at 00:00 UTC`;
    if (data.attempt) showDailySavedResult();
    else result.textContent = "Make one prediction about the hidden candles. Your answer is saved before the outcome is revealed.";
    return true;
  } catch (error) {
    if (current()) {
      dailyRound = null;
      setLoading(false);
      clearPracticeChoices();
      renderModeSurface();
      showSymbolError("Daily Puzzle", error.message || "Daily Puzzles are unavailable. Please try again.");
      result.textContent = error.message || "Daily Puzzles are unavailable. Please try again.";
    }
    return false;
  }
}

// Recheck the server's date after rollover, including when a sleeping tab wakes.
setInterval(() => {
  if (appMode === "daily" && dailyState.ready && performance.now() >= dailyState.resetAfter && !dailyRound?.busy) {
    selectedDailyDate = "";
    closeDailyCalendar();
    loadDailyPuzzle();
  }
}, 30000);
