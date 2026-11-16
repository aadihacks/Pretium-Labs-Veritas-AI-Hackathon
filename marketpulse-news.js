(() => {
  "use strict";

  const model = window.MarketPulseModel;
  const filters = { forYou: "For You", latest: "Latest", breaking: "Breaking", watchlist: "Watchlist" };
  const expanded = new Set();
  const simulations = new Map();
  const topics = new Set();
  const sourceOptions = { credentials: "omit", referrerPolicy: "no-referrer" };
  let filter = "forYou";
  let catalog, history, preferences, classification, overview;
  let partsRequested = false;
  let loadError = false;
  let overviewRequestedAt = 0;
  let classificationRequestedAt = 0;
  let aiTimer;
  let notice = "";
  let view;
  let activeArticle;

  const publicJson = async path => {
    const response = await fetch(path, sourceOptions);
    if (!response.ok) throw new Error("Public news data unavailable");
    return response.json();
  };
  const action = (key, value, label, pressed) => `<button type="button" data-pulse-action="${key}" data-pulse-value="${view.escape(value)}"${pressed === undefined ? "" : ` aria-pressed="${pressed}"`}>${view.escape(label)}</button>`;
  const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });
  const marketDate = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "America/New_York" });
  const showDate = date => dateFormat.format(new Date(date));
  const percent = value => `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
  const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

  function load() {
    if (partsRequested) return;
    partsRequested = true;
    publicJson("/marketpulse-news.json").then(data => {
      catalog = data;
      preferences = model.createPreferences(() => window.localStorage, catalog);
      refresh();
    }).catch(() => {
      loadError = true;
      refresh();
    });
    publicJson("/marketpulse-history.json").then(data => {
      history = data;
      refresh();
    }).catch(() => { history = null; refresh(); });
  }

  function loadAi() {
    clearTimeout(aiTimer);
    const now = Date.now();
    if (now - classificationRequestedAt >= 60000 && classification?.source !== "gemini") {
      classificationRequestedAt = now;
      publicJson("/api/marketpulse/classifications").then(data => {
        classification = data;
        refresh();
      }).catch(() => { classification = { source: "editorial", reason: "unavailable" }; refresh(); });
    }
    if (now - overviewRequestedAt >= 60000) {
      overviewRequestedAt = now;
      publicJson("/api/marketpulse/overview").then(data => {
        overview = data;
        refresh();
      }).catch(() => { overview = { source: "editorial", reason: "feeds" }; refresh(); });
    }
    aiTimer = setTimeout(() => { if (view?.isCurrent()) loadAi(); }, 10 * 60 * 1000);
  }

  function refresh() {
    if (view?.isCurrent()) render();
  }

  function visibleArticles() {
    const state = preferences.state;
    const now = Date.now();
    let items = catalog.filter(article => !topics.size || topics.has(article.tag));
    if (filter === "watchlist") items = items.filter(article => state.follows.has(article.ticker));
    if (filter === "breaking") items = items.filter(article => article.importance === "high" && article.date
      && Date.parse(article.date) <= now && now - Date.parse(article.date) < 7 * 86400000);
    return filter === "forYou" ? model.rank(items, state, catalog, now) : items.sort(model.compareDates);
  }

  function interpretation(article) {
    const ai = classification?.items?.[article.id];
    if (ai) return { ...ai, source: "Gemini market-impact reading", reference: article.ticker };
    const context = {
      "Rate decision": "Compare the policy decision with prior rate expectations. Changes in the expected path can affect bonds and rate-sensitive stocks.",
      "Earnings release": "Compare management’s outlook with prevailing expectations. A strong past quarter can still coincide with a cautious outlook.",
      "Inflation release": "Inflation surprises can change rate expectations. Inspect the components and revisions before assigning a direction.",
      "Jobs report": "Stronger employment can support spending and also raise expectations for tighter monetary policy.",
      "GDP release": "Growth and inflation signals can pull market expectations in different directions. Compare the release with prior expectations.",
      "Inventory report": "A change in inventories can reflect supply, demand, or timing. Check refinery activity and production for context."
    };
    return {
      source: "Editorial context",
      category: article.tag, tickers: [article.ticker], sectors: article.sectors, eventType: article.eventType,
      direction: "neutral", volatility: "unclear", reference: article.ticker,
      explanation: context[article.eventType] || "Read the underlying release and compare related price data before drawing a directional conclusion.",
      uncertainty: "The headline alone cannot establish what markets expected or how prices reacted.",
      risks: "A release can reinforce existing expectations or change them. Other news and positioning may drive the same move."
    };
  }

  function overviewSection(escape) {
    const today = marketDate.format(new Date());
    const daily = !overview?.date || showDate(overview.date) === today ? overview : undefined;
    const status = {
      "no-headlines": "Today's sources haven’t published any headlines in this briefing yet.",
      feeds: "Today’s headlines couldn’t load.",
      configuration: "Gemini couldn’t connect with the configured key or model.",
      unconfigured: "Gemini needs a server API key to generate an AI response.",
      busy: "Gemini is at its request limit. Try again shortly.",
      unavailable: "Gemini couldn’t complete the request. Try again shortly."
    };
    const reason = daily?.reason;
    const analysisReason = classification?.reason;
    const retry = [reason, analysisReason].some(value => value && value !== "no-headlines");
    return `<section class="news-briefing marketpulse-overview" aria-labelledby="marketpulse-overview-heading">
      <h3 id="marketpulse-overview-heading" tabindex="-1">Today’s market overview</h3>
      <small>${daily?.date ? `<time datetime="${escape(daily.date)}">${escape(today)}</time>` : escape(today)} · U.S. Eastern time${daily?.paragraph ? " · Generated by Gemini" : ""}</small>
      <p role="status">${escape(daily?.paragraph || status[reason] || "Loading today’s market overview…")}</p>
      ${daily?.stories?.length ? `<ul aria-label="Today’s news sources">
        ${daily.stories.map(story => `<li><a data-pulse-source href="${escape(story.url)}" target="_blank" rel="noopener noreferrer">${escape(story.source + " · " + story.title)}</a></li>`).join("")}
      </ul>` : ""}
      ${analysisReason && analysisReason !== reason ? `<p>AI market-impact readings: ${escape(status[analysisReason])}</p>` : ""}
      ${retry ? `<div class="mode-actions news-actions">${action("retry-ai", "", "Retry AI and headlines")}</div>` : ""}
    </section>`;
  }

  const extraEvents = [
    { date: "2026-04-30", tag: "Earnings", ticker: "AAPL", title: "Apple fiscal second-quarter results", source: "Apple Newsroom", url: "https://www.apple.com/newsroom/2026/04/apple-reports-second-quarter-results/" },
    { date: "2026-04-29", tag: "Earnings", ticker: "MSFT", title: "Microsoft fiscal third-quarter results", source: "Microsoft IR", url: "https://www.microsoft.com/en-us/Investor/earnings/FY-2026-Q3/press-release-webcast" },
    { date: "2026-06-10", tag: "Inflation", title: "May 2026 Consumer Price Index", source: "U.S. BLS", url: "https://www.bls.gov/news.release/archives/cpi_06102026.htm" },
    { date: "2026-06-05", tag: "Labor", title: "May 2026 Employment Situation", source: "U.S. BLS", url: "https://www.bls.gov/news.release/archives/empsit_06052026.htm" }
  ];

  function analogs(article) {
    if (!article.date) return [];
    const matching = [...extraEvents, ...catalog, ...(history?.events || [])].filter(event =>
      event.date && event.date < article.date && event.tag === article.tag);
    return matching.sort((a, b) => {
      const relevance = event => Number(event.ticker === article.ticker)
        + 2 * Number(Boolean(event.action && event.action === article.policyAction));
      return relevance(b) - relevance(a) || b.date.localeCompare(a.date);
    }).slice(0, 3);
  }

  function simulation(article, events) {
    const observed = events.find(event => Number.isFinite(event.returnFive));
    if (!observed) return "<p>A historical replay is available when a comparison has measured prices.</p>";
    const choice = simulations.get(article.id);
    const payoff = observed.returnFive / 100 * 1000 * (choice === "buy" ? 1 : choice === "sell" ? -1 : 0);
    return `<section class="marketpulse-analysis">
      <h4>Historical decision simulator</h4>
      <p>Replay ${showDate(observed.date)} with ${usd.format(1000)} of hypothetical EUR/USD exposure. Buy takes a long position, Hold stays in cash, and Sell takes a short position. Fees, financing and slippage are excluded.</p>
      <div class="mode-actions news-actions" role="group" aria-label="Hypothetical decision">
        ${["buy", "hold", "sell"].map(value => action("simulate", `${article.id}|${value}`, value[0].toUpperCase() + value.slice(1), choice === value)).join("")}
      </div>
      ${choice ? `<p role="status">${choice[0].toUpperCase() + choice.slice(1)} would have changed the simulated position by <strong>${usd.format(payoff)}</strong> after five observations. This replay uses a known historical outcome.</p>` : ""}
    </section>`;
  }

  function analysis(article, ai, escape) {
    const events = analogs(article);
    const prediction = article.policyAction && history?.recentModel?.[article.policyAction];
    const historyList = events.map(event => `<li>
      <time datetime="${escape(event.date)}">${showDate(event.date)}</time> ·
      <a href="${escape(event.url)}" target="_blank" rel="noopener noreferrer">${escape(event.title)} · ${escape(event.source)}</a>
      ${Number.isFinite(event.returnFive) ? `<p>EUR/USD · next quote ${percent(event.returnOne)} · five quotes ${percent(event.returnFive)} · annualized realized volatility ${event.volatility.toFixed(2)}%</p>
      <p><strong>${escape(event.pattern)}:</strong> ${escape(event.evidence)}</p>` : "<p>Verified event reference. Measured prices unavailable in this dataset.</p>"}
    </li>`).join("");
    return `<section class="marketpulse-analysis" id="marketpulse-${escape(article.id)}" aria-label="Market impact analysis">
      <h4>Market impact analysis</h4>
      <p><strong>${escape(ai.category)} · ${escape(ai.eventType)}</strong> · Reference: ${escape(ai.reference)}</p>
      <p>Tickers: ${escape(ai.tickers.join(", ") || "Unspecified")} · Sectors: ${escape(ai.sectors.join(", ") || "Unspecified")}</p>
      <p><strong>Interpretation:</strong> ${escape(ai.direction)} · Volatility: ${escape(ai.volatility)}</p>
      <p><strong>Uncertainty:</strong> ${escape(ai.uncertainty)}</p>
      <p><strong>Risks and alternatives:</strong> ${escape(ai.risks)}</p>
      <h4>Similar historical releases</h4>
      ${historyList ? `<ul class="marketpulse-history">${historyList}</ul>` : "<p>No earlier comparable release in the prototype dataset.</p>"}
      ${events.some(event => Number.isFinite(event.returnFive)) ? `<p>Policy comparisons use the noon EUR/USD quote as a proxy. These windows can include unrelated moves. Pattern labels use daily quotes and are educational connections to the six practice patterns. <a href="${escape(history.priceSource)}" target="_blank" rel="noopener noreferrer">Federal Reserve data via FRED</a></p>` : ""}
      ${prediction ? `<p>Historical model for comparable policy decisions: <strong>${escape(prediction)}</strong> for the next EUR/USD quote. Its chronological test scored ${history.evaluation.correct.actionModel}/${history.evaluation.test}, versus ${history.evaluation.correct.trainingMajority}/${history.evaluation.test} for the training-majority baseline.</p>` : ""}
      ${simulation(article, events)}
      <div class="mode-actions news-actions">${action("paper", "", "Open Paper Trading")}</div>
    </section>`;
  }

  function card(article, saved, escape) {
    const ai = interpretation(article);
    const { id, tag, ticker, source, published, title, url, summary, verified, prompt, practice, date } = article;
    const preference = preferences.state;
    const controlling = expanded.has(id);
    return `<article class="news-card">
      <div class="news-source-avatar" aria-hidden="true">${escape(source.split(/\s+/).map(word => word[0]).join("").slice(0, 3))}</div>
      <div class="news-thread-body">
        <div class="news-source-row"><strong>${escape(source)}</strong>${verified ? '<span class="verified-source">✓ Verified source</span>' : ""}
          ${date ? `<time datetime="${escape(date)}">${escape(published)}</time>` : `<span>${escape(published)}</span>`}</div>
        <a class="news-thread-link" data-pulse-open="${escape(id)}" href="${escape(url)}" target="_blank" rel="noopener noreferrer" aria-label="Open original source: ${escape(title)}">
          <span>${escape(tag)} · ${escape(ticker)}</span><h3>${escape(title)}</h3><p>${escape(summary)}</p><b>Read on ${escape(source)} ↗</b>
        </a>
        <div class="marketpulse-summary"><strong>${escape(ai.source)}</strong>
          ${classification?.items?.[id] ? `<p>${escape(ai.reference)} · ${escape(ai.direction)} · Volatility ${escape(ai.volatility)}</p>` : ""}
          <p>${escape(ai.explanation)}</p></div>
        <blockquote class="news-discussion-prompt"><small>Discussion prompt</small>${escape(prompt)}</blockquote>
        <div class="mode-actions news-actions">
          <button type="button" data-news-symbol="${escape(ticker)}">${escape(practice)}</button>
          <button type="button" data-news-save="${escape(id)}">${saved.has(id) ? "Saved to reading list" : "Save to reading list"}</button>
          <button type="button" data-pulse-action="analyze" data-pulse-value="${escape(id)}" aria-expanded="${controlling}" aria-controls="marketpulse-${escape(id)}">${controlling ? "Hide market impact" : "Analyze Market Impact"}</button>
          ${action("follow", ticker, preference.follows.has(ticker) ? `Unfollow ${ticker}` : `Follow ${ticker}`)}
        </div>
        <div class="news-topic-rail marketpulse-reactions" role="group" aria-label="Feedback for this story">
          ${action("like", id, "Like", preference.reactions.get(id) === 1)}
          ${action("dislike", id, "Dislike", preference.reactions.get(id) === -1)}
        </div>
        ${controlling ? analysis(article, ai, escape) : `<div id="marketpulse-${escape(id)}" hidden></div>`}
      </div>
    </article>`;
  }

  function render() {
    const { host, escape, saved } = view;
    const focused = host.contains(document.activeElement) ? document.activeElement : null;
    const focusCard = focused?.closest(".news-card");
    const focusArticle = focusCard?.querySelector("[data-pulse-open]")?.dataset.pulseOpen;
    const privacyOpen = host.querySelector(".marketpulse-privacy")?.open;
    const categories = [...new Set(catalog?.map(article => article.tag))];
    const displayed = catalog ? visibleArticles() : [];
    const empty = filter === "watchlist" ? "Follow a ticker on a story to see its articles here."
      : filter === "breaking" ? "No high-importance stories from the past seven days match these filters."
      : "No stories match these filters.";
    host.innerHTML = `<section class="news-page marketpulse-page">
      <div class="leaderboard-hero news-hero">
        <span>Pretium Labs News · hackathon prototype</span>
        <h2>MarketPulse News</h2>
        <div class="news-trust-strip"><strong>Primary-source market news</strong><span>This project is a prototype and is not financial advice.</span></div>
      </div>
      ${overviewSection(escape)}
      ${catalog ? `<div class="news-topic-rail" role="group" aria-label="News feed">
        ${Object.entries(filters).map(([key, label]) => action("feed", key, label, filter === key)).join("")}
      </div>
      <div class="news-topic-rail" role="group" aria-label="Filter news by category">
        ${action("all", "", "All categories", topics.size === 0)}
        ${categories.map(tag => action("topic", tag, tag, topics.has(tag))).join("")}
      </div>
      <details class="news-briefing marketpulse-privacy"${privacyOpen ? " open" : ""}>
        <summary>Privacy and feed preferences</summary>
        <p>Article opens, likes, dislikes, followed tickers and selected interests stay on this device. By default they disappear on reload. Gemini receives the same public headlines for everyone. Opening an original source visits that publisher. Your reading list lasts until you reload this preview.</p>
        <p>For You weighs recent and important releases, selected interests, followed tickers and local interactions. It keeps a high-importance story near the top and limits repetition when alternatives exist. Latest orders dated stories chronologically.</p>
        <label><input type="checkbox" data-pulse-remember${preferences.persistent ? " checked" : ""}> Save these preferences in this browser across reloads</label>
        <div class="news-topic-rail" role="group" aria-label="Personalize selected interests">
          ${categories.map(tag => action("interest", tag, tag, preferences.state.interests.has(tag))).join("")}
        </div>
        <div class="mode-actions news-actions">${action("reset", "", "Reset Preferences")}</div>
        <p role="status">${escape(notice)}</p>
      </details>
      <div class="news-feed" aria-label="Verified news source threads">${displayed.length ? displayed.map(article => card(article, saved, escape)).join("") : `<p role="status">${escape(empty)}</p>`}</div>`
        : `<p role="status">${loadError ? "The public news catalog could not load." : "Loading public news…"}</p>
          ${loadError ? `<div class="mode-actions news-actions">${action("retry", "", "Retry")}</div>` : ""}`}
      <section class="news-briefing">
        <strong>Your reading list</strong>
        <p>${saved.size ? `${saved.size} source thread${saved.size === 1 ? "" : "s"} saved. Use them as evidence-first warmups before Free Play.` : "No source threads saved yet. Bookmark one to build an evidence-first reading queue."}</p>
      </section>
    </section>`;
    const page = host.querySelector(".marketpulse-page");
    page.addEventListener("click", onClick);
    page.addEventListener("auxclick", onOpen);
    page.querySelector("[data-pulse-remember]")?.addEventListener("change", event => {
      const ok = preferences.remember(event.target.checked);
      notice = ok ? (preferences.persistent ? "Preferences will be saved in this browser." : "Preferences now last until reload.") : "Browser storage is unavailable or could not be cleared.";
      render();
    });
    if (!focused) return;
    const target = focusArticle ? [...page.querySelectorAll("[data-pulse-open]")].find(link => link.dataset.pulseOpen === focusArticle)?.closest(".news-card") : page;
    const replacement = focused.dataset.pulseAction ? [...(target?.querySelectorAll("[data-pulse-action]") || [])]
      .find(button => button.dataset.pulseAction === focused.dataset.pulseAction && button.dataset.pulseValue === focused.dataset.pulseValue)
      : focused.id === "marketpulse-overview-heading" ? page.querySelector("#marketpulse-overview-heading")
      : focused.matches(".marketpulse-privacy > summary") ? page.querySelector(".marketpulse-privacy > summary")
        : focused.matches("[data-pulse-remember]") ? page.querySelector("[data-pulse-remember]")
        : focused.dataset.newsSave ? target?.querySelector("[data-news-save]")
          : focused.dataset.newsSymbol ? target?.querySelector("[data-news-symbol]")
            : focused.dataset.pulseOpen ? target?.querySelector("[data-pulse-open]")
              : focused.matches("[data-pulse-source]") ? [...page.querySelectorAll("[data-pulse-source]")].find(link => link.href === focused.href) : null;
    const fallback = focused.dataset.pulseAction === "retry-ai" ? "#marketpulse-overview-heading"
      : focused.dataset.pulseAction ? '[data-pulse-action="feed"][aria-pressed="true"]' : null;
    (replacement || (fallback && page.querySelector(fallback)))?.focus({ preventScroll: true });
  }

  function onOpen(event) {
    if (event.type === "auxclick" && event.button !== 1) return;
    const link = event.target.closest("[data-pulse-open]");
    if (link) activeArticle = link.dataset.pulseOpen;
    if (link && !preferences.open(link.dataset.pulseOpen)) notice = "Browser storage could not save this change.";
  }

  function onClick(event) {
    onOpen(event);
    const button = event.target.closest("[data-pulse-action]");
    if (!button) return;
    const { pulseAction: key, pulseValue: value } = button.dataset;
    if (key === "paper") {
      view.openPaper();
      return;
    }
    if (key === "retry-ai") {
      overview = undefined;
      classification = classification?.source === "gemini" ? classification : undefined;
      overviewRequestedAt = classificationRequestedAt = 0;
      loadAi();
      render();
      return;
    }
    if (key === "retry") {
      partsRequested = false;
      loadError = false;
      load();
      render();
      return;
    }
    let saved = true;
    if (key === "feed") filter = value;
    if (key === "all") topics.clear();
    if (key === "topic") topics.has(value) ? topics.delete(value) : topics.add(value);
    if (key === "analyze") {
      if (expanded.has(value)) {
        expanded.delete(value);
        if (activeArticle === value) activeArticle = Array.from(expanded).at(-1);
      } else {
        expanded.add(value);
        activeArticle = value;
      }
    }
    if (key === "like" || key === "dislike") saved = preferences.react(value, key === "like" ? 1 : -1);
    if (key === "follow") saved = preferences.follow(value);
    if (key === "interest") saved = preferences.interest(value);
    if (key === "reset") {
      saved = preferences.reset();
      simulations.clear();
      topics.clear();
      filter = "forYou";
      notice = saved ? "Preferences reset." : "Preferences reset in memory. Browser storage could not be cleared.";
    } else if (!saved) notice = "Browser storage could not save this change.";
    if (key === "simulate") {
      const [id, choice] = value.split("|");
      simulations.set(id, choice);
    }
    render();
  }

  window.MarketPulseNews = {
    mount(host, options) {
      view = { host, ...options };
      load();
      loadAi();
      render();
    },
    activeArticle() { return activeArticle; },
    resetFilters() { topics.clear(); activeArticle = undefined; }
  };
})();
