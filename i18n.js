/* Local website translations. Catalogs contain UI copy only; user text stays local. */
(() => {
  "use strict";
  const storageKey = "financeLabsWebsiteLanguage";
  const languages = [
    ["en", "English"], ["ko", "한국어 — Korean"], ["es", "Español — Spanish"],
    ["fr", "Français — French"], ["zh-CN", "简体中文 — Chinese (Simplified)"],
    ["zh-TW", "繁體中文 — Chinese (Traditional)"], ["tl", "Tagalog — Filipino"],
    ["vi", "Tiếng Việt — Vietnamese"], ["ar", "العربية — Arabic"],
    ["ru", "Русский — Russian"], ["pt", "Português — Portuguese"], ["hi", "हिन्दी — Hindi"],
    ["de", "Deutsch — German"], ["ht", "Kreyòl ayisyen — Haitian Creole"],
    ["pl", "Polski — Polish"], ["ja", "日本語 — Japanese"]
  ];
  const supported = new Set(languages.map(([code]) => code));
  const cache = new Map([["en", {}]]);
  const originals = new WeakMap();
  const attributes = ["aria-label", "aria-description", "aria-valuetext", "aria-roledescription", "title", "placeholder", "alt", "label"];
  const excluded = 'script, style, code, pre, [contenteditable="true"], [translate="no"], .chart-ticker, .chart-company-name, .symbol-result-ticker';
  let language = "en";
  let catalog = {};
  let foldedCatalog = new Map();
  let templates = [];
  let requestId = 0;
  const normalize = value => value.replace(/\s+/g, " ").trim();
  const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  function translate(value) {
    if (typeof value !== "string" || language === "en" || !/[A-Za-z]/.test(value)) return value;
    const key = normalize(value);
    let translated = catalog[key] || foldedCatalog.get(key.toLowerCase());
    if (!translated) {
      const countLabel = /^(\d[\d,.]*) (.+)$/.exec(key);
      const labelCount = /^(.+) (\d[\d,.]*)$/.exec(key);
      if (countLabel && foldedCatalog.has(countLabel[2].toLowerCase())) translated = `${countLabel[1]} ${foldedCatalog.get(countLabel[2].toLowerCase())}`;
      else if (labelCount && foldedCatalog.has(labelCount[1].toLowerCase())) translated = `${foldedCatalog.get(labelCount[1].toLowerCase())} ${labelCount[2]}`;
    }
    if (!translated) {
      for (const template of templates) {
        const match = template.pattern.exec(key);
        if (!match) continue;
        translated = template.value.replace(/\{(\d+)\}/g, (_, index) => match[Number(index) + 1] ?? "");
        break;
      }
    }
    return translated ? value.replace(value.trim(), translated) : value;
  }

  function localizeValue(owner, key, current, write) {
    const saved = originals.get(owner) || {};
    const previous = saved[key];
    const source = previous && previous.output === current ? previous.source : current;
    const output = translate(source);
    saved[key] = { source, output };
    originals.set(owner, saved);
    if (output !== current) write(output);
  }

  function localize(root) {
    if (!root || !root.isConnected) return;
    if (root.nodeType === 3) {
      if (!root.parentElement?.closest(`textarea, ${excluded}`)) localizeValue(root, "text", root.data, value => { root.data = value; });
      return;
    }
    if (root.nodeType !== 1 || root.closest(excluded)) return;
    // An option without an explicit value uses its label as the form value.
    // Freeze that English value before translating its visible label.
    if (root.tagName === "OPTION" && !root.hasAttribute("value")) root.value = root.textContent;
    for (const attribute of attributes) {
      if (root.hasAttribute(attribute)) localizeValue(root, attribute, root.getAttribute(attribute), value => root.setAttribute(attribute, value));
    }
    if (root.tagName === "TEXTAREA") return;
    for (const child of root.childNodes) localize(child);
  }

  const observer = new MutationObserver(records => {
    observer.disconnect();
    const roots = new Set();
    for (const record of records) {
      if (record.type === "childList") record.addedNodes.forEach(node => roots.add(node));
      else roots.add(record.target);
    }
    roots.forEach(localize);
    observe();
  });
  function observe() {
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: attributes });
  }

  async function setLanguage(code, persist = true) {
    if (!supported.has(code)) throw new Error("Unsupported website language");
    const id = ++requestId;
    if (!cache.has(code)) {
      const response = await fetch(`./locales/${code}.json?v=4`, { credentials: "same-origin" });
      if (!response.ok) throw new Error("Language catalog unavailable");
      const data = await response.json();
      if (typeof data !== "object" || !data || Array.isArray(data) || typeof data.Settings !== "string") throw new Error("Invalid language catalog");
      cache.set(code, data);
    }
    if (id !== requestId) return;
    language = code;
    catalog = cache.get(code);
    foldedCatalog = new Map(Object.entries(catalog).map(([key, value]) => [key.toLowerCase(), value]));
    templates = Object.entries(catalog).filter(([key]) => /\{\d+\}/.test(key) && (key.replace(/\{\d+\}/g, "").length >= 8 || key === "{0} price"))
      .sort(([a], [b]) => b.length - a.length).map(([key, value]) => ({
        pattern: new RegExp(`^${key.split(/\{\d+\}/).map(escapeRegex).join("(.+?)")}$`), value
      }));
    document.documentElement.lang = code;
    document.documentElement.dir = ["ar"].includes(code) ? "rtl" : "ltr";
    const picker = document.getElementById("websiteLanguage");
    if (picker) picker.value = code;
    if (persist) {
      try { localStorage.setItem(storageKey, code); } catch { /* Language still works when storage is unavailable. */ }
    }
    observer.disconnect();
    localize(document.documentElement);
    observe();
    document.dispatchEvent(new CustomEvent("websitelanguagechange", { detail: { language: code } }));
  }

  window.siteI18n = Object.freeze({
    get language() { return language; },
    get locale() { return language === "en" ? undefined : language === "tl" ? "fil" : language === "ht" ? "fr-HT" : language; },
    languages,
    t: translate,
    setLanguage,
    languageOptions: () => languages.map(([code, label]) => `<option value="${code}" lang="${code}" dir="auto"${code === language ? " selected" : ""}>${label}</option>`).join("")
  });
  observe();
  let saved = "en";
  try { saved = localStorage.getItem(storageKey) || "en"; } catch { /* Keep the English default. */ }
  if (supported.has(saved) && saved !== "en") setLanguage(saved, false).catch(() => { /* Keep usable English UI if a catalog cannot load. */ });
})();
