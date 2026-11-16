// Real-player Competitive. The server owns matching, clocks, charts and results.
const competitiveClient = {
  owner: "", state: { queue: null, match: null }, controller: null, retry: null,
  clock: null, offset: 0, connected: false, busy: false, error: "", chartKey: "", historyKey: "",
  standingsAt: 0, standingsBusy: false, lastServerTime: 0, failures: 0
};

function competitiveNeedsUpdates() {
  const { queue, match } = competitiveClient.state;
  return Boolean(queue || match && !["completed", "cancelled"].includes(match.status));
}

function competitiveUpdateDelay() {
  if (document.hidden) return 5000;
  return competitiveClient.state.match?.status === "active" ? 1000 : 2000;
}

function competitiveFailure(response, payload = {}) {
  const error = new Error(payload.error || "The match server is unavailable. Please retry.");
  error.status = response.status;
  const value = response.headers?.get("Retry-After");
  const seconds = value && !Number.isFinite(Number(value)) ? (Date.parse(value) - Date.now()) / 1000
    : Number(value || payload.retryAfter || 0);
  error.retryAfterMs = Number.isFinite(seconds) ? Math.max(0, Math.min(86400, seconds)) * 1000 : 0;
  return error;
}

function competitiveReconnectDelay(error) {
  competitiveClient.failures = Math.min(competitiveClient.failures + 1, 8);
  const backoff = Math.min(30000, 1500 * 2 ** (competitiveClient.failures - 1));
  return Math.max(error?.retryAfterMs || 0, backoff) + Math.random() * 500;
}

async function competitiveRequest(path, body, signal) {
  const owner = supabaseAuthUser?.id;
  const headers = await accountHistoryHeaders();
  if (!owner || !headers.Authorization) throw new Error("Sign in to play against other players.");
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 25000);
  try {
    const response = await fetch(`/api/competitive/${path}`, {
      method: body ? "POST" : "GET", cache: "no-store", signal: controller.signal,
      headers: { ...headers, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw competitiveFailure(response, data);
    if (supabaseAuthUser?.id !== owner) throw new Error("Your signed-in account changed.");
    return data;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

function resetCompetitiveConnection() {
  competitiveClient.controller?.abort();
  clearTimeout(competitiveClient.retry);
  clearInterval(competitiveClient.clock);
  Object.assign(competitiveClient, { owner: "", state: { queue: null, match: null }, controller: null,
    retry: null, clock: null, connected: false, busy: false, error: "", chartKey: "", historyKey: "",
    standingsAt: 0, standingsBusy: false, lastServerTime: 0, failures: 0 });
  if (typeof leaderboards !== "undefined") leaderboards.versus = [];
  if (typeof userRank !== "undefined") { userRank.versus = null; userRank.versusWins = "No verified wins"; }
}

async function connectCompetitive() {
  const owner = supabaseAuthUser?.id || "";
  if (competitiveClient.owner !== owner) resetCompetitiveConnection();
  if (!owner || standalonePreview || competitiveClient.controller || competitiveClient.retry) return;
  competitiveClient.owner = owner;
  const controller = new AbortController();
  competitiveClient.controller = controller;
  let retryDelay = 0;
  try {
    receiveCompetitiveState(await competitiveRequest("state", null, controller.signal));
    competitiveClient.failures = 0;
    if (competitiveNeedsUpdates()) retryDelay = competitiveUpdateDelay();
  } catch (error) {
    if (controller.signal.aborted || supabaseAuthUser?.id !== owner) return;
    retryDelay = competitiveReconnectDelay(error);
    competitiveClient.connected = false;
    competitiveClient.error = "Connection interrupted. Reconnecting to your match…";
    updateCompetitiveClock();
    if (appMode === "versus") renderCompetitiveConnectionStatus();
  } finally {
    if (competitiveClient.controller === controller && !controller.signal.aborted) {
      competitiveClient.controller = null;
      if (retryDelay) {
        competitiveClient.retry = setTimeout(() => {
          competitiveClient.retry = null;
          void connectCompetitive();
        }, retryDelay);
      }
    }
  }
}

async function refreshCompetitive() {
  if (!supabaseAuthUser) return;
  try { receiveCompetitiveState(await competitiveRequest("state")); }
  catch (error) { competitiveClient.error = error.message; renderCompetitiveConnectionStatus(); }
}

async function competitiveAction(path, body = {}) {
  if (competitiveClient.busy) return;
  competitiveClient.busy = true;
  let succeeded = false;
  updateCompetitiveClock();
  try {
    receiveCompetitiveState(await competitiveRequest(path, body));
    succeeded = true;
    void connectCompetitive();
  } catch (error) {
    showToast(error.message);
    if (![429, 503].includes(error.status)) await refreshCompetitive(); // Reconcile a possibly committed write.
  } finally {
    competitiveClient.busy = false;
    updateCompetitiveClock();
    if (appMode === "versus") renderCompetitiveSurface();
  }
  return succeeded;
}

function receiveCompetitiveState(data) {
  if (!competitiveClient.owner || supabaseAuthUser?.id !== competitiveClient.owner) return;
  if (!Number.isFinite(data.serverTime) || data.serverTime < competitiveClient.lastServerTime) return;
  competitiveClient.lastServerTime = data.serverTime;
  const previous = competitiveClient.state.match;
  competitiveClient.state = data;
  if (data.match?.status === "active" && typeof trackPredictionVisibility === "function") trackPredictionVisibility(`competitive:${data.match.id}:${data.match.round}`);
  competitiveClient.offset = data.serverTime * 1000 - Date.now();
  competitiveClient.connected = true;
  competitiveClient.error = "";
  if (competitiveNeedsUpdates()) {
    if (!competitiveClient.clock) competitiveClient.clock = setInterval(updateCompetitiveClock, 250);
  } else {
    clearInterval(competitiveClient.clock);
    competitiveClient.clock = null;
    clearTimeout(competitiveClient.retry);
    competitiveClient.retry = null;
  }
  versusQueue = data.queue;
  if (data.match) {
    selectedVersusGameMode = data.match.kind;
    hasSelectedVersusGameMode = true;
    privateRoomCode = data.match.code || "";
  }
  if (appMode === "versus") {
    const active = ["active", "reveal"].includes(data.match?.status);
    if (active !== versusMatchActive || previous?.id !== data.match?.id || previous?.status !== data.match?.status) renderModeSurface();
    else renderCompetitiveSurface();
    applyCompetitiveChart();
  } else if (data.match && previous?.id !== data.match.id) showToast("A real opponent is ready. Open Competitive to ready up.");
  renderCompetitiveWidget();
  updateCompetitiveClock();
  const match = data.match;
  const historyKey = match && ["reveal", "completed"].includes(match.status) ? `${match.id}:${match.round}:${match.status}` : "";
  if (historyKey && competitiveClient.historyKey !== historyKey) {
    competitiveClient.historyKey = historyKey;
    void syncCompetitiveHistory(match.status === "completed");
  }
}

async function syncCompetitiveHistory(complete) {
  const owner = supabaseAuthUser?.id;
  try {
    if (complete) { await initializeAccountHistory(); await refreshCompetitiveStandings(true); }
    else {
      const summary = await historyApi("summary");
      if (supabaseAuthUser?.id !== owner) return;
      applyHistorySummary(summary);
      updateStats();
    }
  } catch { /* Match state remains authoritative; history reconciles on sign-in. */ }
}

function syncCompetitiveWorkspace() {
  if (appMode !== "versus") return;
  const match = competitiveClient.state.match;
  versusMatchActive = ["active", "reveal"].includes(match?.status);
  const me = match?.players.find(player => player.id === match.me);
  const opponent = match?.players.find(player => player.id !== match.me);
  versusState = versusMatchActive ? { matchId: match.id, round: match.round - 1, total: 5,
    you: me?.score || 0, opponent: opponent?.score || 0, opponentName: opponent?.name || "Opponent",
    rounds: [], usedSetups: new Set(), saved: false } : null;
}

function competitiveNow() {
  return (Date.now() + competitiveClient.offset) / 1000;
}

function renderCompetitiveConnectionStatus() {
  const status = document.getElementById("competitiveAvailability");
  if (status && competitiveClient.error) status.textContent = competitiveClient.error;
}

function renderCompetitiveSurface() {
  if (appMode !== "versus") return;
  const { match, queue } = competitiveClient.state;
  const me = match?.players.find(player => player.id === match.me);
  const terminal = ["completed", "cancelled"].includes(match?.status);
  const active = ["active", "reveal"].includes(match?.status);
  const mode = match?.kind || (hasSelectedVersusGameMode ? selectedVersusGameMode : "Game Mode");
  let message = queue ? "Finding another signed-in player. You can browse while you wait."
    : match?.status === "waiting" ? "Both players must ready up before the shared match starts."
    : match?.status === "preparing" ? "Loading the same verified historical charts for both players…"
    : match?.status === "reveal" ? "Round settled. Both players' scores are saved. The next round starts shortly."
    : active ? (match.choice ? "Prediction locked. Waiting for the other player or the round deadline." : "Read the shared chart and lock your prediction before time runs out.")
    : terminal ? match.reason : "Find a real opponent, or create a private room to play with a friend.";
  if (match?.reason && !active) message = match.reason;
  if (!supabaseAuthUser) message = "Sign in to play against another person.";
  if (competitiveClient.error) message = competitiveClient.error;
  const winner = match?.status === "completed" ? !match.winner ? "Draw" : match.winner === match.me ? "You win" : "Opponent wins" : "";
  const roster = match ? `<ul class="mode-list competitive-roster">${match.players.map(player => `<li><span>${escapeHtml(player.name)}${player.id === match.me ? " (You)" : ""}</span><small>${active || terminal ? `${player.score} correct${active ? ` · ${player.answered ? "Locked" : "Reading"}` : ""}` : player.ready ? "Ready" : "Not ready"}${!player.connected ? " · Reconnecting" : ""}</small></li>`).join("")}${match.players.length < 2 ? '<li><span>Open seat</span><small>Share the room code with a friend</small></li>' : ""}</ul>` : "";
  const modeButton = `<div class="game-mode-button"><button class="game-mode-arrow" type="button" data-action="versus-mode-open" aria-label="Open game mode menu" aria-haspopup="dialog" aria-controls="gameModeModal"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v10.17l3.59-3.58a1 1 0 0 1 1.41 0L20.41 11a1 1 0 0 1 0 1.41l-7.7 7.7a1 1 0 0 1-1.42 0l-7.7-7.7a1 1 0 0 1 0-1.41L5 9.59a1 1 0 0 1 1.41 0L10 13.17V3Z" /></svg></button><span class="game-mode-button-label">${escapeHtml(mode)}</span></div>`;
  // Keep the code field intact while a player is typing; stream heartbeats do
  // not rebuild this idle form, and actual state transitions replace it once.
  const typedCode = document.getElementById("privateRoomInput")?.value || "";
  const focused = document.activeElement?.id;
  modeSurface.innerHTML = `<div class="mode-row"><strong>Competitive${active ? ` · Round ${match.round}/5` : ""}</strong><span class="timer" id="versusClock">${winner || (queue ? "Queuing" : "Lobby")}</span></div>
    <p id="competitiveAvailability" role="status">${escapeHtml(message)}</p>
    ${match?.code ? `<div class="lobby-heading"><span>Private room</span><button type="button" class="lobby-room-code" data-action="versus-invite" aria-label="Copy room code ${escapeHtml(match.code)}">${escapeHtml(match.code)}</button></div>` : ""}
    ${roster}
    ${!match && !queue && mode === "Private" ? '<label class="room-code-control"><span>Room code (leave blank to create a room)</span><input id="privateRoomInput" type="text" maxlength="5" placeholder="ROOM CODE" autocomplete="off" /></label>' : ""}
    <div class="mode-actions ${!match && !queue ? "versus-actions" : "lobby-actions"}">
      ${!match && !queue ? `${modeButton}<button data-action="versus-start" ${!supabaseAuthUser || competitiveClient.busy ? "disabled" : ""}>${mode === "Private" ? "Create / join room" : "Find random match"}</button>`
        : match?.status === "waiting" ? `<button data-action="versus-ready" ${me?.ready || competitiveClient.busy ? "disabled" : ""}>${me?.ready ? "Ready" : "I'm ready"}</button><button data-action="competitive-leave">Leave lobby</button>`
        : `<button data-action="competitive-leave">${terminal ? "Back to lobby" : active ? "Forfeit match" : queue ? "Cancel queue" : "Leave lobby"}</button>`}
    </div>${!match && !queue ? versusGameModeCatalogHtml() : ""}`;
  if (document.getElementById("privateRoomInput")) {
    document.getElementById("privateRoomInput").value = typedCode;
    if (focused === "privateRoomInput") document.getElementById("privateRoomInput").focus({ preventScroll: true });
  }
  if (terminal) {
    clearPracticeChoices();
    result.textContent = winner || match.reason;
  }
  updateCompetitiveClock();
}

function applyCompetitiveChart() {
  const match = competitiveClient.state.match;
  if (appMode !== "versus" || !match?.puzzle || !["active", "reveal"].includes(match.status)) return;
  const key = `${match.id}:${match.round}:${Boolean(match.outcome)}:${match.choice || ""}`;
  if (competitiveClient.chartKey === key) return;
  const newRound = !competitiveClient.chartKey.startsWith(`${match.id}:${match.round}:`);
  competitiveClient.chartKey = key;
  const puzzle = match.puzzle;
  currentSymbol = { ticker: puzzle.ticker, name: puzzle.name, asset: puzzle.asset, currency: puzzle.currency, exchange: puzzle.exchange };
  timeframe = puzzle.timeframe;
  chartRequestId += 1; // An older search must not overwrite the shared round.
  const revealingMasked = !newRound && match.outcome && rawCandles[0]?.indexedPrice;
  if (revealingMasked) restoreHistoricalChartScale(match.outcome.candles);
  rawCandles = (match.outcome?.candles || puzzle.candles).map(bar => ({ ...bar, date: new Date(bar.time * 1000) }));
  if (!match.outcome) {
    const last = rawCandles.at(-1);
    // Blank covered future slots, never scored prices or a fabricated outcome.
    rawCandles.push(...Array.from({ length: 26 }, (_, index) => ({ ...last, time: last.time + (index + 1) * 86400,
      date: new Date((last.time + (index + 1) * 86400) * 1000), open: last.close, high: last.close, low: last.close, close: last.close, volume: 0,
      ...(last.challengeIndex ? { challengeIndex: puzzle.observedEnd + index + 1 } : {}) })));
  }
  latestSeries = [];
  if (newRound) loadCurrentSymbol();
  else if (revealingMasked) syncChartMetadata();
  syncAdvancedIntervalsLayout(timeframe);
  document.querySelectorAll("[data-timeframe], #advancedToggle").forEach(control => {
    control.disabled = true;
    if (control.dataset.timeframe) control.classList.toggle("active", control.dataset.timeframe === timeframe);
  });
  revealed = Boolean(match.outcome);
  if (match.outcome) {
    result.innerHTML = `<strong>${match.outcome.correct ? "Correct" : match.choice ? "Incorrect" : "Time expired"}: ${escapeHtml(match.outcome.answer)}</strong><p>Both predictions are settled. ${match.round < 5 ? "The next shared round starts shortly." : "Saving the final match result…"}</p>`;
    revealTag.textContent = "Round settled";
  } else {
    result.innerHTML = `<strong>${match.choice ? "Prediction locked" : "Live head-to-head"}</strong><p>${match.choice ? `Your ${escapeHtml(match.choice)} prediction is saved on the server.` : "Both players see the same chart. The hidden outcome stays on the server until the round settles."}</p>`;
    revealTag.textContent = match.choice ? "Locked" : "Make your prediction";
  }
  renderChoices();
  updateCompetitiveClock();
  resizeChartCanvas();
  drawChart();
}

function updateCompetitiveClock() {
  renderCompetitiveWidget();
  if (appMode !== "versus") return;
  const match = competitiveClient.state.match;
  if (!match || !["active", "reveal"].includes(match.status)) return;
  const now = competitiveNow();
  const clock = document.getElementById("versusClock");
  if (clock) clock.textContent = match.status === "reveal" ? `Next in ${Math.max(0, Math.ceil(match.nextAt - now))}s`
    : now < match.startsAt ? `Starts in ${Math.ceil(match.startsAt - now)}s` : `${Math.max(0, Math.ceil(match.deadline - now))}s`;
  const disabled = competitiveClient.busy || !competitiveClient.connected || match.status !== "active" || Boolean(match.choice) || now < match.startsAt || now >= match.deadline;
  document.querySelectorAll("#choices button").forEach(button => {
    button.disabled = disabled;
    button.classList.toggle("selected", button.dataset.choice === match.choice);
  });
}

function renderCompetitiveWidget() {
  if (!versusQueueWidget) return;
  const { queue, match } = competitiveClient.state;
  const active = Boolean(queue || match && !["completed", "cancelled"].includes(match.status));
  versusQueueWidget.hidden = !active || appMode === "versus";
  document.body.classList.toggle("versus-queue-active", active && appMode !== "versus");
  if (!active) return;
  const label = queue ? "Finding a match" : match.status === "waiting" ? "Opponent found" : "Match in progress";
  document.getElementById("versusQueueMode").textContent = match?.kind || "Public";
  document.getElementById("versusQueueStatus").textContent = label;
  const seconds = queue ? Math.max(0, Math.floor((Date.now() + competitiveClient.offset - queue.startedAt) / 1000)) : 0;
  document.getElementById("versusQueueTime").textContent = queue ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "Live";
  document.getElementById("versusQueueOpen").setAttribute("aria-label", `${label}. Open Competitive`);
  document.getElementById("versusQueueCancel").hidden = !queue;
}

function competitiveJoin() {
  const kind = hasSelectedVersusGameMode && selectedVersusGameMode === "Private" ? "Private" : "Public";
  return competitiveAction("join", { kind, code: kind === "Private" ? cleanRoomCode(document.getElementById("privateRoomInput")?.value || "") : "" });
}

async function refreshCompetitiveStandings(force = false) {
  const owner = supabaseAuthUser?.id;
  if (!owner || competitiveClient.standingsBusy || !force && Date.now() - competitiveClient.standingsAt < 10000) return;
  competitiveClient.standingsBusy = true;
  try {
    const data = await competitiveRequest("leaderboard");
    if (supabaseAuthUser?.id !== owner) return;
    leaderboards.versus = data.rows;
    userRank.versus = data.you.rank;
    userRank.versusWins = `${data.you.wins} ${data.you.wins === 1 ? "win" : "wins"}`;
    competitiveClient.standingsAt = Date.now();
    if (appMode === "leaderboards" && leaderboardScope === "versus") renderLeaderboards("versus");
  } catch { competitiveClient.standingsAt = Date.now(); }
  finally { if (supabaseAuthUser?.id === owner) competitiveClient.standingsBusy = false; }
}

function competitiveReady() {
  const match = competitiveClient.state.match;
  if (match) return competitiveAction("ready", { matchId: match.id });
}

function competitiveAnswer(choice) {
  const match = competitiveClient.state.match;
  if (!match || match.choice || match.status !== "active") return;
  return competitiveAction("answer", { matchId: match.id, round: match.round, choice,
    visibility: typeof predictionVisibilityReport === "function" ? predictionVisibilityReport(`competitive:${match.id}:${match.round}`) : undefined });
}

window.addEventListener("pagehide", () => {
  competitiveClient.controller?.abort();
  clearTimeout(competitiveClient.retry);
  clearInterval(competitiveClient.clock);
  competitiveClient.retry = null;
  competitiveClient.clock = null;
});
window.addEventListener("pageshow", event => { if (event.persisted) { resetCompetitiveConnection(); void connectCompetitive(); } });
window.addEventListener("online", () => { void refreshCompetitive(); void connectCompetitive(); });
