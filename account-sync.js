/* Account data is cached in memory; browser values never establish entitlement. */
let accountDataState = { owner: "", ready: false, documents: {}, portfolios: {}, lessons: [] };
let accountDataReady = Promise.resolve();
let accountDocumentWrites = Promise.resolve();
let accountPaperBusy = false;
let pendingPaperOrder = null;
let accountSettingsApplying = false;
let accountDataRevision = 0;
let accountReviewHintViews = 0;
let accountDeletionBusy = false;
let accountDeletionOwner = "";
let accountLedger = { owner: "", scope: "", orders: [], offset: 0, loading: false };

async function accountDataApi(path, body) {
  const owner = supabaseAuthUser?.id;
  const headers = await accountHistoryHeaders();
  if (!owner || !headers.Authorization) throw new Error("Sign in to save account data.");
  if (supabaseAuthUser?.id !== owner) throw new Error("The signed-in account changed.");
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`/api/account-data/${path}`, { method: body ? "POST" : "GET", cache: "no-store",
      headers: { ...headers, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: controller.signal });
    const value = await response.json();
    if (supabaseAuthUser?.id !== owner) throw new Error("The signed-in account changed.");
    if (!response.ok) {
      if (value.code === "account_deleted") void finishDeletedAccount(owner, currentAccount()?.email);
      else if (response.status === 401 && path !== "delete") void supabaseAuthClient.auth.signOut({ scope: "local" });
      const error = new Error(value.error || "Account data could not be saved."); error.status = response.status; throw error;
    }
    return value;
  } finally { clearTimeout(timeout); }
}

function accountDocumentValue(kind) {
  if (kind === "learning") return { activity: learnActivity, legacyCompleted: accountDataState.documents.learning?.value.legacyCompleted || [] };
  if (kind === "news") return [...savedNews];
  if (kind === "quant") return quantConfig;
  if (kind === "workspace") return { symbol: currentSymbol.ticker, timeframe, drawings, drawingHistory };
  return { theme: document.body.dataset.theme, sound: soundEnabled, animations: animationPreferences,
    language: window.siteI18n?.language || "en", randomizer: freePlayRandomSettings,
    accuracyModes: headerAccuracyState.selected, drawingTools: !drawingTools.hidden, reviewHintViews: accountReviewHintViews };
}

function saveAccountDocument(kind) {
  if (typeof hasSavedAccount !== "function" || !hasSavedAccount() || accountSettingsApplying) return;
  const owner = supabaseAuthUser.id, revision = accountDataRevision, value = structuredClone(accountDocumentValue(kind));
  accountDocumentWrites = accountDocumentWrites.then(async () => {
    await accountDataReady;
    if (supabaseAuthUser?.id !== owner || accountDataState.owner !== owner || revision !== accountDataRevision) return false;
    if (!accountDataState.ready) throw new Error("Reconnect before saving account changes.");
    const saved = await accountDataApi("document", { kind, value, version: accountDataState.documents[kind]?.version || 0 });
    if (supabaseAuthUser?.id !== owner) return false;
    accountDataState.documents[kind] = saved;
    return true;
  }).catch(error => {
    if (supabaseAuthUser?.id === owner) {
      showToast(`Account save failed: ${error.message}`);
      void initializeAccountData();
    }
    return false;
  });
  return accountDocumentWrites;
}

async function initializeAccountData() {
  const owner = supabaseAuthUser?.id || "";
  const firstLoad = accountDataState.owner !== owner || !accountDataState.ready;
  if (accountDataState.owner === owner && accountPaperBusy) return accountDataReady;
  if (accountDataState.owner !== owner) {
    pendingPaperOrder = null;
    accountPaperBusy = false;
    accountLedger = { owner: "", scope: "", orders: [], offset: 0, loading: false };
  }
  const revision = ++accountDataRevision;
  accountDataState = { owner, ready: false, documents: {}, portfolios: {}, lessons: [] };
  accountReviewHintViews = 0;
  if (!owner) return;
  accountDataReady = (async () => {
    try {
      const state = await accountDataApi("state");
      if (supabaseAuthUser?.id !== owner || revision !== accountDataRevision) return;
      accountDataState = { ...state, owner, ready: false };
      // Start missing documents empty; browser leftovers are never imported.
      for (const kind of ["learning", "news", "settings"]) {
        if (state.documents[kind]) continue;
        const value = accountDocumentValue(kind);
        if (kind === "learning") value.legacyCompleted = [...learnProgress];
        let saved;
        try { saved = await accountDataApi("document", { kind, value, version: 0 }); }
        catch (error) {
          if (error.status !== 409) throw error;
          saved = (await accountDataApi("state")).documents[kind];
          if (!saved) throw error;
        }
        if (supabaseAuthUser?.id !== owner || revision !== accountDataRevision) return;
        state.documents[kind] = saved;
      }
      accountSettingsApplying = true;
      try {
        const docs = state.documents;
        if (docs.learning) learnActivity = docs.learning.value.activity || {};
        learnProgress = new Set(state.lessons);
        if (firstLoad) activeLearnChapter = Math.max(0, learnModules.findIndex((_, index) => !learnProgress.has(index)));
        if (docs.news) savedNews = new Set(docs.news.value);
        if (docs.quant) restoreQuantDocument(docs.quant.value, !firstLoad && appMode === "quant");
        if (!docs.quant && typeof DEFAULT_QUANT_CONFIG !== "undefined") quantConfig = structuredClone(DEFAULT_QUANT_CONFIG);
        paperAccount = cleanPaperAccount(state.portfolios.live?.value || emptyPaperAccount());
        const prefs = docs.settings?.value;
        if (prefs) {
          accountReviewHintViews = Math.max(0, Math.min(8, Number(prefs.reviewHintViews) || 0));
          if (["light", "dark", "gamify"].includes(prefs.theme)) { document.body.dataset.theme = prefs.theme; updateThemeToggleLabel(); }
          soundEnabled = prefs.sound === true;
          updateSoundToggle();
          if (prefs.animations) { animationPreferences = prefs.animations; syncAnimationPreferences(); }
          if (prefs.randomizer) freePlayRandomSettings = prefs.randomizer;
          if (Array.isArray(prefs.accuracyModes)) headerAccuracyState.selected = prefs.accuracyModes.filter(m => HEADER_ACCURACY_MODES.includes(m));
          setDrawingToolsOpen(prefs.drawingTools === true, { persist: false });
          if (prefs.language) await window.siteI18n?.setLanguage(prefs.language, false);
        }
      } finally { accountSettingsApplying = false; }
      if (supabaseAuthUser?.id !== owner) return;
      accountDataState.ready = true;
      restoreSavedDrawings();
      updateStats();
      if (["paper", "packs", "learn", "news", "account", "quant"].includes(appMode)) renderModeSurface();
    } catch (error) { if (supabaseAuthUser?.id === owner) showToast(`Account data unavailable: ${error.message}`); }
  })();
  return accountDataReady;
}

function savedPaperScope() { return isEventPackPaper() ? `pack:${activePackId}` : "live"; }

function savedPaperAccount() {
  return cleanPaperAccount(accountDataState.owner === supabaseAuthUser?.id
    ? accountDataState.portfolios[savedPaperScope()]?.value || emptyPaperAccount() : emptyPaperAccount());
}

async function executeSavedPaperOrder(side, extra = {}) {
  if (accountPaperBusy) return;
  if (side === "retry") {
    if (!pendingPaperOrder) return;
    const { id, ...intent } = pendingPaperOrder.request;
    side = intent.side; extra = intent;
  }
  const owner = supabaseAuthUser?.id, scope = savedPaperScope();
  const symbol = normalizeSymbol(document.getElementById("paperSymbolInput")?.value || paperTradingQuote()?.ticker || currentSymbol.ticker);
  const intent = { scope, side, symbol, ...(scope === "live" ? {} : { time: rawCandles[packPaperIndex]?.time }),
    ...(side === "buy" ? { amount: Number(document.getElementById("paperBuyAmount")?.value) } : {}),
    ...(side === "sell" ? { quantity: Number(document.getElementById("paperSellQty")?.value) } : {}), ...extra };
  const signature = JSON.stringify(intent);
  let inputError = null, failed = false;
  if (pendingPaperOrder && pendingPaperOrder.signature !== signature) {
    showToast("Retry the pending order before submitting a different order.");
    return;
  }
  pendingPaperOrder ||= { signature, request: { id: crypto.randomUUID(), ...intent } };
  accountPaperBusy = true;
  try {
    await accountDataReady;
    if (supabaseAuthUser?.id !== owner || !accountDataState.ready) throw new Error("Reconnect before trading.");
    const saved = await accountDataApi("order", pendingPaperOrder.request);
    if (supabaseAuthUser?.id !== owner) return;
    accountDataState.portfolios[scope] = saved;
    accountLedger = { owner: "", scope: "", orders: [], offset: 0, loading: false };
    if (scope === "live") paperAccount = cleanPaperAccount(saved.value);
    pendingPaperOrder = null;
    paperSellAllPending = false;
    showToast(side === "advance" ? "Replay progress saved." : "Paper order saved.");
  } catch (error) {
    failed = true;
    if (supabaseAuthUser?.id === owner) {
      if (error.status >= 400 && error.status < 500) pendingPaperOrder = null;
      if (["buy", "sell"].includes(side) && /larger than|cannot sell|invalid/i.test(error.message)) inputError = error.message;
      showToast(`${error.message}${pendingPaperOrder ? " Retry the same order if its result is uncertain." : ""}`);
    }
  }
  finally {
    if (supabaseAuthUser?.id === owner) {
      accountPaperBusy = false;
      if (savedPaperScope() === scope) {
        renderPaperTradingIfCurrent();
        if (failed && ["buy", "sell"].includes(side)) {
          const input = document.getElementById(side === "buy" ? "paperBuyAmount" : "paperSellQty");
          if (input) input.value = String(side === "buy" ? intent.amount : intent.quantity);
        }
        if (inputError && typeof markPaperOrderFieldInvalid === "function") markPaperOrderFieldInvalid(side, inputError);
      }
    }
  }
}

async function completeSavedLesson(index, answers) {
  const owner = supabaseAuthUser.id;
  try {
    await accountDataReady;
    if (supabaseAuthUser?.id !== owner || accountDataState.owner !== owner || !accountDataState.ready) throw new Error("Reconnect to the original account before saving this lesson.");
    await accountDataApi("lesson", { lesson: index, answers });
    if (supabaseAuthUser?.id !== owner) return;
    learnProgress.add(index);
    completeLearnChapter(index);
  } catch (error) { if (supabaseAuthUser?.id === owner) showToast(error.message); }
}

async function loadSavedPaperLedger() {
  const owner = supabaseAuthUser.id, scope = savedPaperScope();
  if (accountLedger.owner !== owner || accountLedger.scope !== scope) accountLedger = { owner, scope, orders: [], offset: 0, loading: false };
  const state = accountLedger;
  if (state.loading || state.offset === null) return;
  state.loading = true;
  try {
    const page = await accountDataApi(`orders?scope=${encodeURIComponent(scope)}&offset=${state.offset}`);
    if (accountLedger !== state || supabaseAuthUser?.id !== owner || savedPaperScope() !== scope) return;
    state.orders.push(...page.orders.flatMap(order => order.trades));
    state.offset = page.nextOffset;
  } catch (error) { showToast(error.message); }
  finally { state.loading = false; if (accountLedger === state && supabaseAuthUser?.id === owner) renderPaperLedger(); }
}

function restoreSavedDrawings() {
  if (!hasSavedAccount()) return;
  const saved = accountDataState.documents.workspace?.value;
  if (saved?.symbol !== currentSymbol.ticker || saved.timeframe !== timeframe || !Array.isArray(saved.drawings) || !Array.isArray(saved.drawingHistory)) return;
  drawings = saved.drawings; drawingHistory = saved.drawingHistory;
  updateDrawingActions();
}

async function exportSavedAccountData() {
  const owner = supabaseAuthUser.id;
  try {
    await accountDocumentWrites;
    if (supabaseAuthUser?.id !== owner) throw new Error("The account changed.");
    const state = await accountDataApi("state"), history = [], trades = {};
    let cursor = 0;
    do {
      const page = await accountDataApi(`export-history?offset=${cursor}`);
      if (supabaseAuthUser?.id !== owner) throw new Error("The account changed.");
      history.push(...page.records);
      cursor = page.nextOffset;
    } while (cursor !== null);
    for (const scope of Object.keys(state.portfolios)) {
      trades[scope] = [];
      let offset = 0;
      do {
        const page = await accountDataApi(`orders?scope=${encodeURIComponent(scope)}&offset=${offset}`);
        trades[scope].push(...page.orders);
        offset = page.nextOffset;
      } while (offset !== null);
    }
    const learningArchives = await accountDataApi("learning-archives");
    const submissions = [];
    let submissionOffset = 0;
    do {
      const page = await accountDataApi(`submissions?offset=${submissionOffset}`);
      submissions.push(...page.submissions); submissionOffset = page.nextOffset;
    } while (submissionOffset !== null);
    const summary = await historyApi("summary");
    if (supabaseAuthUser?.id !== owner) throw new Error("The account changed.");
    const payload = { product: "Pretium Labs", version: 2, exportedAt: new Date().toISOString(),
      account: accountPublicProfile(), ...state, history, trades, learningArchives, submissions, summary };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = safeExportFileName();
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Saved account data exported.");
  } catch (error) { if (supabaseAuthUser?.id === owner) showToast(`Export failed: ${error.message}`); }
}

async function submitSavedAccountEdit(form) {
  const owner = supabaseAuthUser.id, account = currentAccount();
  const error = document.getElementById("accountEditError");
  try {
    if (form.dataset.accountEdit === "verify") {
      const password = document.getElementById("accountEditCurrentPassword").value;
      const result = await supabaseAuthClient.auth.signInWithPassword({ email: account.email, password });
      if (result.error || result.data.user?.id !== owner || supabaseAuthUser?.id !== owner) throw new Error("That password could not be verified.");
      renderAccountEditDialog("edit");
      accountEditContent.querySelector("#accountEditEmail")?.focus();
      return;
    }
    const email = normalizeEmail(document.getElementById("accountEditEmail").value);
    const name = document.getElementById("accountEditName").value.trim();
    const password = document.getElementById("accountEditNewPassword").value;
    const confirmation = document.getElementById("accountEditConfirmPassword").value;
    if (!isValidEmail(email) || name.length < 2 || name.length > 70 || containsInappropriateName(name)) throw new Error("Enter a valid name and email.");
    if (password !== confirmation || passwordStrength(password, email, name).passed < passwordStrength(password, email, name).total) throw new Error("Choose a matching password that meets the password requirements.");
    const result = await supabaseAuthClient.auth.updateUser({ email, password, data: { display_name: name } });
    if (result.error) throw result.error;
    if (supabaseAuthUser?.id !== owner) return;
    await synchronizeSupabaseSession((await supabaseAuthClient.auth.getSession()).data.session);
    closeAccountEditDialog(); renderAccountPage(); renderAccountLevel();
    showToast("Account updated. Check your email if an email change needs confirmation.");
  } catch (failure) {
    if (supabaseAuthUser?.id === owner && error) { error.textContent = failure.message; error.hidden = false; }
  }
}

const ACCOUNT_DELETE_PHRASE = "I understand that deleting my account is permanent and cannot be undone.";

function renderPermanentAccountDeletion(step, owner) {
  const title = step === "confirm" ? "Are you sure you want to delete your account?"
    : step === "phrase" ? "Confirm permanent deletion" : "Enter your password";
  const description = step === "confirm"
    ? "This permanently removes your account, profile, progress, portfolios, and saved account data. Your other devices will lose access when they reconnect. Restricted recovery backups may remain until they expire."
    : step === "phrase" ? "Please retype the phrase below in the text box to continue."
    : "Enter your current password to verify your identity. Clicking Delete will permanently delete your account and its saved data.";
  accountEditContent.innerHTML = `<header class="account-edit-head"><h2 id="accountEditTitle">${title}</h2><p>${description}</p></header>
    <form class="account-edit-form account-delete-form" data-account-delete-form data-account-delete-step="${step}" data-account-delete-owner="${escapeHtml(owner)}">
      ${step === "phrase" ? `<p class="account-delete-phrase" id="accountDeletePhrase">${ACCOUNT_DELETE_PHRASE}</p><label><span>Retype the phrase</span><textarea id="accountDeleteConfirm" rows="3" autocomplete="off" spellcheck="false" autocapitalize="off" aria-describedby="accountDeletePhrase accountDeleteError" maxlength="200" required></textarea></label>` : ""}
      ${step === "password" ? `<label><span>Current password</span><input id="accountDeletePassword" type="password" autocomplete="current-password" aria-describedby="accountDeleteError" maxlength="1024" required /></label>` : ""}
      <p class="account-edit-error" id="accountDeleteError" role="alert" hidden></p>
      <div class="account-edit-actions"><button type="submit">Delete</button><button type="button" data-account-edit-cancel>Cancel</button></div>
    </form>`;
  accountEditContent.querySelector(step === "phrase" ? "textarea" : step === "password" ? "input" : "[data-account-edit-cancel]")?.focus();
}

function openPermanentAccountDeletion() {
  if (!hasSavedAccount() || accountDeletionBusy) return;
  renderPermanentAccountDeletion("confirm", supabaseAuthUser.id);
  openAccessibleModal(accountEditModal);
  accountEditContent.querySelector("[data-account-edit-cancel]")?.focus();
}

async function finishDeletedAccount(owner, email) {
  if (supabaseAuthUser?.id !== owner) return;
  await handleAccountSignout();
}

async function submitPermanentAccountDeletion(form) {
  const owner = supabaseAuthUser?.id, email = currentAccount()?.email;
  if (accountDeletionBusy && accountDeletionOwner === owner) return;
  if (!owner || form.dataset.accountDeleteOwner !== owner) return;
  const step = form.dataset.accountDeleteStep;
  if (step === "confirm") { renderPermanentAccountDeletion("phrase", owner); return; }
  const error = document.getElementById("accountDeleteError");
  if (step === "phrase") {
    const confirmation = document.getElementById("accountDeleteConfirm");
    if (confirmation.value !== ACCOUNT_DELETE_PHRASE) {
      error.hidden = false;
      error.textContent = "Please type the phrase exactly as shown above.";
      confirmation.setAttribute("aria-invalid", "true");
      confirmation.focus();
      return;
    }
    renderPermanentAccountDeletion("password", owner);
    return;
  }
  if (step !== "password") return;
  const password = document.getElementById("accountDeletePassword");
  const submit = form.querySelector('button[type="submit"]');
  if (!password.value) return;
  error.hidden = true;
  submit.disabled = true;
  accountDeletionBusy = true;
  accountDeletionOwner = owner;
  for (const button of form.querySelectorAll("button")) button.disabled = true;
  try {
    await accountDataApi("delete", { confirm: "DELETE", password: password.value });
    await finishDeletedAccount(owner, email);
  } catch (failure) {
    if (supabaseAuthUser?.id === owner) { error.hidden = false; error.textContent = failure.message; password.focus(); }
  } finally {
    if (accountDeletionOwner === owner) { accountDeletionBusy = false; accountDeletionOwner = ""; }
    password.value = "";
    for (const button of form.querySelectorAll("button")) button.disabled = false;
  }
}

window.addEventListener("focus", () => { if (typeof hasSavedAccount === "function" && hasSavedAccount() && !accountPaperBusy) void accountDocumentWrites.then(initializeAccountData); });
document.addEventListener("websitelanguagechange", () => { if (!accountSettingsApplying) saveAccountDocument("settings"); });
for (const type of ["click", "change"]) document.addEventListener(type, event => {
  if (event.target.closest?.("[data-theme-choice], [data-animation-option], #soundToggle, #headerSoundToggle, #accuracyPopover input, #drawingToolsToggle")) {
    setTimeout(() => saveAccountDocument("settings"), 0);
  }
});
document.addEventListener("click", event => { if (event.target.closest?.("[data-account-ledger-more]")) void loadSavedPaperLedger(); });
document.addEventListener("click", event => { if (event.target.closest?.("[data-account-paper-retry]")) void executeSavedPaperOrder("retry"); });
document.addEventListener("submit", event => {
  if (!event.target.matches?.("[data-account-delete-form]")) return;
  event.preventDefault();
  void submitPermanentAccountDeletion(event.target);
});
