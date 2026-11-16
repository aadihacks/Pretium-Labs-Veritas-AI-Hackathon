(() => {
  "use strict";
  if (window.PretiumAI) return;

  const key = "pretium-ai-session-v1";
  const features = {
    practice: ["Open Free Play", "/index.html?feature=free"],
    news: ["Open MarketPulse News", "/index.html?feature=news"],
    learn: ["Open Lessons", "/learn/lessons"],
    simulation: ["Open Decision Simulator", "/learn/simulator"],
    paper: ["Open Paper Trading", "/index.html?feature=paper"],
    patterns: ["Open Market Patterns", "/learn/patterns"],
  };
  const prompts = {
    chart: ["Explain this chart", "What patterns should I look for?", "What are the risks?"],
    paper: ["Explain my simulated portfolio", "What does unrealized profit mean?", "What if I invest $1,000?"],
    quant: ["Generate a beginner Quant Lab strategy", "Turn my idea into pseudocode", "Explain entry, exit, and sizing", "How can I spot overfitting?"],
    news: ["Why might this matter to markets?", "What evidence would explain the reaction?"],
    learn: ["Where should I start?", "Where can I practice chart patterns?"],
    lesson: ["Explain this more simply", "Give me an example", "Quiz me on this topic"],
    simulation: ["Explain this simulation", "What if I invest $1,000?"],
    patterns: ["How can I spot a trend?", "Explain support and resistance"],
    progress: ["How should I plan my next practice session?"],
  };
  const fallback = ["What can I practice here?", "What is diversification?"];
  const coachPrompts = [
    ["Draft a strategy", "Generate a beginner Quant Lab strategy. Show pseudocode, runnable code, and explain each rule."],
    ["Plan in pseudocode", "Help me plan a Quant Lab strategy in pseudocode. First ask what behavior I want to test."],
  ];
  const priv = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\bAIza[A-Za-z0-9_-]{30,}\b|\b(?:sk-[A-Za-z0-9_-]{16,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b|\b(?:password|api[ _-]?key|secret key|access token)\s*[:=]\s*\S+|\b\d{3}-\d{2}-\d{4}\b|\b(?:\(\d{3}\)\s*|\d{3}[-.])\d{3}[-.]\d{4}\b|(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/i;
  const knownFeature = value => Object.hasOwn(features, value) ? value : "";

  function load() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(key));
      const turns = Array.isArray(saved?.turns) ? saved.turns.filter(turn =>
        typeof turn?.question === "string" && turn.question.length <= 1000 && !priv.test(turn.question) &&
        typeof turn.answer === "string" && turn.answer.length <= 2200 && !priv.test(turn.answer)
      ).slice(-12) : [];
      return { turns, hidden: saved?.hidden === true, context: saved?.context !== false };
    } catch {
      return { turns: [], hidden: false, context: true };
    }
  }

  let session = load();
  let request, mascot, animationReset, portal;
  const save = () => {
    try { sessionStorage.setItem(key, JSON.stringify(session)); } catch {}
  };
  const clearSession = () => {
    request?.abort();
    request = undefined;
    session = { turns: [], hidden: false, context: true };
    try { sessionStorage.removeItem(key); } catch {}
    portal?.remove();
  };
  window.PretiumAI = { clearSession };

  function inline(target, value) {
    const tokens = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\([^)]+\)/g;
    let start = 0;
    for (const part of value.matchAll(tokens)) {
      target.append(value.slice(start, part.index));
      if (part[4]) target.append(part[4]);
      else {
        const element = document.createElement(part[1] ? "code" : part[2] ? "strong" : "em");
        element.textContent = part[1] || part[2] || part[3];
        target.append(element);
      }
      start = part.index + part[0].length;
    }
    target.append(value.slice(start));
  }

  function markdown(target, text) {
    let list;
    let code;
    for (const line of text.split(/\r?\n/)) {
      if (line.startsWith("```")) {
        list = undefined;
        if (code) code = undefined;
        else {
          code = document.createElement("pre");
          code.dataset.language = line.slice(3).trim().toLowerCase();
          target.append(code);
        }
      } else if (code) code.append(line + "\n");
      else if (!line.trim()) list = undefined;
      else {
        const bullet = line.match(/^\s*(?:([-*+])|(\d+)\.)\s+(.*)$/);
        if (bullet) {
          const kind = bullet[2] ? "OL" : "UL";
          if (list?.tagName !== kind) {
            list = document.createElement(kind);
            if (bullet[2]) list.start = Number(bullet[2]);
            target.append(list);
          }
          const item = document.createElement("li");
          inline(item, bullet[3]);
          list.append(item);
        } else {
          list = undefined;
          const heading = /^#{1,6}\s+/.test(line);
          const quote = /^>\s?/.test(line);
          const block = document.createElement(heading ? "h3" : quote ? "blockquote" : "p");
          inline(block, line.replace(/^#{1,6}\s+|^>\s?/, ""));
          target.append(block);
        }
      }
    }
  }

  async function readStream(response, onDelta) {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Live replies are unavailable in this browser.");
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let pending = "";
    let bytes = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 32_768) break;
        const lines = (pending + decoder.decode(value, { stream: true })).split("\n");
        pending = lines.pop();
        for (const line of lines) {
          const event = JSON.parse(line);
          if (typeof event.error === "string") throw new Error(event.error);
          if (typeof event.answer === "string") return event;
          if (typeof event.delta !== "string") throw new Error("Invalid live reply.");
          onDelta(event.delta);
        }
      }
      throw new Error("The live reply ended early. Send the question again to retry.");
    } finally {
      reader.cancel().catch(() => {});
    }
  }

  function mount() {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "/pretium-ai.css?v=2";
    document.head.append(stylesheet);
    portal = document.createElement("aside");
    portal.className = "pretium-ai";
    portal.setAttribute("aria-label", "Pretium AI assistant");
    portal.hidden = true;
    portal.innerHTML = `
      <section class="pretium-ai-panel" role="dialog" aria-modal="false" aria-labelledby="pretium-ai-title" hidden>
        <header class="pretium-ai-head">
          <div><span aria-hidden="true">✦</span><h2 id="pretium-ai-title">Pretium AI</h2></div>
          <button type="button" data-ai-clear aria-label="Clear conversation">New chat</button>
          <button type="button" data-ai-minimize aria-label="Minimize chat">−</button>
        </header>
        <div class="pretium-ai-log" role="log" aria-label="Conversation" tabindex="0"></div>
        <div class="pretium-ai-suggestions" aria-label="Suggested questions"></div>
        <div class="pretium-ai-coach-actions">
          <button type="button" data-ai-explain>Explain editor code</button>
          <button type="button" data-ai-stop hidden>Stop generation</button>
        </div>
        <p class="pretium-ai-status" role="status"></p>
        <form class="pretium-ai-form">
          <label class="pretium-ai-sr" for="pretium-ai-question">Ask Pretium AI</label>
          <textarea id="pretium-ai-question" rows="2" maxlength="1000" placeholder="Ask a question…"></textarea>
          <button type="submit">Send</button>
        </form>
        <footer class="pretium-ai-privacy">
          <label><input type="checkbox" data-ai-context> Include current page context</label>
          <button type="button" data-ai-hide>Hide assistant</button>
          <p>Google Gemini processes your chat. Leave out personal information and credentials.</p>
        </footer>
      </section>
      <button class="pretium-ai-launch" type="button" aria-haspopup="dialog" aria-expanded="false" aria-label="Open Pretium AI">
        <span class="pretium-ai-fallback" aria-hidden="true">✦</span><canvas aria-hidden="true" hidden></canvas>
      </button>
      <button class="pretium-ai-restore" type="button" hidden>Restore Pretium AI</button>`;
    document.body.append(portal);
    stylesheet.addEventListener("load", () => { if (portal.isConnected) portal.hidden = false; }, { once: true });

    const find = selector => portal.querySelector(selector);
    const panel = find(".pretium-ai-panel");
    const launcher = find(".pretium-ai-launch");
    const restore = find(".pretium-ai-restore");
    const log = find(".pretium-ai-log");
    const suggestions = find(".pretium-ai-suggestions");
    const status = find(".pretium-ai-status");
    const input = find("textarea");
    const include = find("[data-ai-context]");
    const form = find("form");
    const send = find('button[type="submit"]');
    const stop = find("[data-ai-stop]");
    let dock;
    let cleared = false;
    function setDock(target) {
      if (cleared || dock === target) return;
      const wasDocked = !!dock;
      dock = target;
      if (dock) {
        dock.replaceChildren(portal);
        portal.classList.add("pretium-ai-docked");
        panel.removeAttribute("role");
        panel.removeAttribute("aria-modal");
        panel.hidden = false;
        input.placeholder = "Describe a strategy or ask about a rule…";
      } else {
        document.body.append(portal);
        portal.classList.remove("pretium-ai-docked");
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-modal", "false");
        input.placeholder = "Ask a question…";
        close(false);
      }
      if (!request && !session.turns.length && wasDocked !== !!dock) showHistory();
      showSuggestions();
    }
    window.PretiumAI.dock = setDock;
    const clear = window.PretiumAI.clearSession;
    window.PretiumAI.clearSession = () => { cleared = true; clear(); };
    const context = () => {
      try { return window.getPretiumAIContext?.() || { page: "legal" }; } catch { return { page: "other" }; }
    };
    function contextFor(question) {
      const { bars, cash, equity, unrealized, realized, ...page } = context();
      if (bars && /\b(chart|candle\w*|volume|pattern\w*|trend\w*|price|fall|fell|rise|rose|move|support|resistance|indicator\w*)\b/i.test(question)) page.bars = bars;
      if (equity !== undefined && /\b(portfolio|position\w*|balance|equity|returns?|performance|profits?|loss\w*|cash|realized|unrealized)\b/i.test(question)) {
        Object.assign(page, { cash, equity, unrealized, realized });
      }
      return page;
    }
    const theme = () => {
      const fromApp = document.body.dataset.theme || window.pretiumAILearnTheme;
      portal.dataset.theme = fromApp || "light";
    };
    include.checked = session.context;
    launcher.hidden = session.hidden;
    restore.hidden = !session.hidden;
    theme();
    new MutationObserver(theme).observe(document.body, { attributes: true, attributeFilter: ["data-theme"] });
    document.addEventListener("pretium-ai:context", () => {
      theme();
      queueMicrotask(() => {
        setDock(document.getElementById("quantCoachMount"));
        showSuggestions();
      });
    });
    const notifications = document.getElementById("toastRegion");
    const positionForKeyboard = () => {
      const screen = window.visualViewport;
      const active = screen && document.activeElement === input;
      const lift = active ? Math.max(0, innerHeight - screen.height - screen.offsetTop) : 0;
      const notification = !lift && notifications?.getBoundingClientRect();
      const clearance = notification?.height
        ? Math.max(0, Math.min(innerHeight - notification.top + 8, innerHeight * .3)) : 0;
      portal.style.setProperty("--ai-keyboard", lift + "px");
      portal.style.setProperty("--ai-notifications", clearance + "px");
      portal.style.setProperty("--ai-viewport", active ? screen.height + "px" : "100dvh");
    };
    if (notifications) new ResizeObserver(positionForKeyboard).observe(notifications);
    window.visualViewport?.addEventListener("resize", positionForKeyboard);
    input.addEventListener("focus", positionForKeyboard);
    input.addEventListener("blur", positionForKeyboard);

    function showSuggestions() {
      if (panel.hidden) return;
      const items = dock ? coachPrompts : (prompts[context().page] || fallback).map(value => [value, value]);
      const key = items[0][0];
      if (suggestions.dataset.prompts === key) return;
      suggestions.dataset.prompts = key;
      suggestions.replaceChildren(...items.map(([label, value]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.addEventListener("click", () => { input.value = preparedQuestion = value; input.focus(); });
        return button;
      }));
    }

    function setMotion(state, reset = false) {
      launcher.dataset.state = state;
      mascot?.state(state);
      clearTimeout(animationReset);
      if (reset) animationReset = setTimeout(() => setMotion(request ? "thinking" : "idle"), 1100);
    }

    let returnFocus, preparedQuestion;
    function close(focus) {
      panel.hidden = true;
      launcher.setAttribute("aria-expanded", "false");
      launcher.setAttribute("aria-label", "Open Pretium AI");
      if (focus) {
        const target = returnFocus?.isConnected ? returnFocus : launcher.hidden ? restore : launcher;
        target.focus({ preventScroll: true });
      }
      returnFocus = undefined;
    }

    function appendMessage(kind, value, link) {
      const message = document.createElement("div");
      message.className = "pretium-ai-message " + kind;
      const name = document.createElement("span");
      name.className = "pretium-ai-sr";
      name.textContent = kind === "user" ? "You: " : "Pretium AI: ";
      message.append(name);
      if (kind === "user") message.append(value);
      else {
        markdown(message, value);
        for (const block of message.querySelectorAll('pre[data-language="python"], pre[data-language="py"]')) {
          const code = block.textContent.trim();
          if (!/^def (entry|exit|size)\(\):/m.test(code)) continue;
          const apply = document.createElement("button");
          apply.type = "button";
          apply.className = "pretium-ai-use-code";
          apply.textContent = "Replace editor with this code";
          const feedback = document.createElement("p");
          feedback.setAttribute("role", "status");
          apply.addEventListener("click", () => {
            const error = dock?.quantCoach.apply(code);
            feedback.textContent = error || "";
          });
          block.after(apply, feedback);
        }
      }
      if (knownFeature(link)) {
        const action = document.createElement("a");
        [action.textContent, action.href] = features[link];
        action.addEventListener("click", event => {
          if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          close(true);
          if (window.navigatePretiumAIFeature?.(link)) event.preventDefault();
        });
        message.append(action);
      }
      log.append(message);
      return message;
    }

    function showHistory() {
      log.replaceChildren();
      if (!session.turns.length) {
        appendMessage("model", dock ? "Describe a strategy idea. I can turn it into pseudocode, draft the rules, and explain how to test them."
          : "Ask about a chart, a lesson, or where to practice a money skill.");
      }
      for (const turn of session.turns) {
        appendMessage("user", turn.question);
        appendMessage("model", turn.answer, turn.feature);
      }
      log.scrollTop = log.scrollHeight;
    }

    const nearBottom = () => log.scrollHeight - log.scrollTop - log.clientHeight < 48;
    let firstOpen = true;
    function open(question = "", trigger = launcher) {
      if (!portal.isConnected) return false;
      returnFocus = trigger;
      if (question && (!input.value.trim() || input.value === preparedQuestion)) {
        input.value = preparedQuestion = question;
      }
      panel.hidden = false;
      launcher.setAttribute("aria-expanded", "true");
      launcher.setAttribute("aria-label", "Minimize Pretium AI");
      showSuggestions();
      if (firstOpen) {
        firstOpen = false;
        log.scrollTop = log.scrollHeight;
      }
      if (!request) setMotion("opening", true);
      input.focus({ preventScroll: !dock });
      return true;
    }
    window.PretiumAI.open = open;
    launcher.addEventListener("click", () => {
      if (panel.hidden) open();
      else close(true);
    });
    find("[data-ai-minimize]").addEventListener("click", () => close(true));
    panel.addEventListener("keydown", event => {
      if (!dock && event.key === "Escape") { event.stopPropagation(); close(true); }
    });
    find("[data-ai-hide]").addEventListener("click", () => {
      close(false);
      session.hidden = launcher.hidden = true;
      restore.hidden = false;
      mascot?.pause(true);
      save();
      restore.focus({ preventScroll: true });
    });
    restore.addEventListener("click", () => {
      session.hidden = launcher.hidden = false;
      restore.hidden = true;
      mascot?.pause(false);
      save();
      launcher.focus({ preventScroll: true });
    });
    find("[data-ai-clear]").addEventListener("click", () => {
      request?.abort();
      request = undefined;
      session.turns = [];
      save();
      status.textContent = "Conversation cleared.";
      send.disabled = false;
      stop.hidden = true;
      input.value = "";
      setMotion("idle");
      showHistory();
      input.focus();
    });
    include.addEventListener("change", () => { session.context = include.checked; save(); });
    stop.addEventListener("click", () => {
      input.focus();
      request?.abort("stopped");
    });
    find("[data-ai-explain]").addEventListener("click", () => {
      const code = dock?.quantCoach.read();
      if (!code) { status.textContent = "Add a strategy in the editor first."; return; }
      if (input.value.trim() && input.value !== preparedQuestion) {
        status.textContent = "Send or clear your current question before adding editor code.";
        input.focus();
        return;
      }
      const question = "Explain my Quant Lab strategy's entry, exit, and size in plain language.\n\n" + code;
      input.value = preparedQuestion = question.length <= input.maxLength ? question
        : "Explain these Quant Lab rules in plain language.\n\n";
      status.textContent = question.length <= input.maxLength ? "Review the editor code before sending."
        : "Paste the part you want explained. The full draft is too long for one message.";
      input.focus();
    });

    form.addEventListener("submit", async event => {
      event.preventDefault();
      const question = input.value.trim();
      if (request || !question) return;
      if (priv.test(question)) {
        status.textContent = "Remove personal information or credentials before sending.";
        return;
      }
      const follow = nearBottom();
      const pending = appendMessage("user", question);
      const controller = new AbortController();
      const streamed = !!dock;
      const deadline = setTimeout(() => controller.abort(), streamed ? 30_000 : 23_000);
      request = controller;
      input.value = "";
      send.disabled = true;
      stop.hidden = !streamed;
      status.textContent = "Thinking…";
      setMotion("thinking");
      if (follow) log.scrollTop = log.scrollHeight;
      let preview;
      try {
        const messages = session.turns.slice(-3).flatMap(turn => [
          { role: "user", text: turn.question }, { role: "model", text: Array.from(turn.answer).slice(0, 1100).join("") },
        ]);
        messages.push({ role: "user", text: question });
        const envelope = { messages, context: include.checked ? contextFor(question) : null };
        let body = JSON.stringify(envelope);
        const encoder = new TextEncoder();
        while (messages.length > 1 && encoder.encode(body).length > 16_384) {
          messages.splice(0, 2);
          body = JSON.stringify(envelope);
        }
        const response = await fetch("/api/pretium-ai/chat", {
          method: "POST", credentials: "omit", cache: "no-store", signal: controller.signal,
          headers: {
            "Content-Type": "application/json", "X-Pretium-AI": "chat",
            ...(streamed ? { Accept: "application/x-ndjson" } : {}),
          },
          body,
        });
        let partial = "";
        const data = response.ok && response.headers.get("Content-Type")?.startsWith("application/x-ndjson")
          ? await readStream(response, delta => {
            if (request !== controller) return;
            partial += delta;
            if (partial.length > 2200 || priv.test(partial)) throw new Error("The live reply could not be displayed.");
            const followReply = nearBottom();
            if (!preview) {
              preview = document.createElement("div");
              preview.className = "pretium-ai-message model";
              preview.setAttribute("aria-hidden", "true");
              log.append(preview);
            }
            preview.replaceChildren();
            markdown(preview, partial);
            if (followReply) log.scrollTop = log.scrollHeight;
          })
          : await response.json().catch(() => ({}));
        if (request !== controller) return;
        if (!response.ok || typeof data.answer !== "string" || !data.answer.trim() || data.answer.length > 2200 || priv.test(data.answer)) {
          const message = response.status === 429 ? "Pretium AI has reached its request limit. Try again shortly."
            : data.error || "Pretium AI could not answer right now. Try again.";
          throw new Error(message);
        }
        const stay = nearBottom();
        preview?.remove();
        const feature = knownFeature(data.feature);
        session.turns = [...session.turns.slice(-11), { question, answer: data.answer, feature }];
        save();
        appendMessage("model", data.answer, feature);
        status.textContent = "";
        setMotion("responding", true);
        if (stay) log.scrollTop = log.scrollHeight;
      } catch (error) {
        if (request !== controller) return;
        pending.remove();
        if (!input.value) input.value = question;
        status.textContent = controller.signal.reason === "stopped" ? "Generation stopped."
          : controller.signal.aborted ? "Pretium AI took too long. Try again." : error.message;
        setMotion("error", true);
      } finally {
        clearTimeout(deadline);
        preview?.remove();
        if (request === controller) { request = undefined; send.disabled = false; stop.hidden = true; }
      }
    });
    showHistory();
    setDock(document.getElementById("quantCoachMount"));

    const attachMascot = () => {
      import("/pretium-ai-mascot.js?v=1").then(module => {
        if (!portal.isConnected) return;
        const canvas = find("canvas");
        mascot = module.mountMascot(canvas, launcher, find(".pretium-ai-fallback"));
        mascot?.state(launcher.dataset.state || "idle");
        mascot?.pause(session.hidden);
      }).catch(() => {});
    };
    if ("requestIdleCallback" in window) window.requestIdleCallback(attachMascot, { timeout: 1800 });
    else setTimeout(attachMascot, 250);
  }

  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount, { once: true });
})();
