(() => {
  "use strict";

  const storageKey = "pretium-marketpulse-preferences-v1";
  const empty = () => ({ interests: new Set(), follows: new Set(), opened: new Set(), reactions: new Map() });
  const compareDates = (a, b) => (b.date || "").localeCompare(a.date || "") || a.id.localeCompare(b.id);
  const cleanTicker = value => String(value).trim().toUpperCase();
  const validTicker = value => /^[A-Z0-9.^=/-]{1,16}$/.test(value);

  function rank(articles, state, catalog, now = Date.now()) {
    const tags = new Map();
    const symbols = new Map();
    for (const article of catalog) {
      const weight = (state.opened.has(article.id) ? 1 : 0) + (state.reactions.get(article.id) || 0) * 3;
      tags.set(article.tag, (tags.get(article.tag) || 0) + weight);
      symbols.set(article.ticker, (symbols.get(article.ticker) || 0) + weight);
    }
    const bounded = value => Math.max(-6, Math.min(6, value || 0));
    const score = article => {
      const age = article.date ? Math.max(0, (now - Date.parse(article.date)) / 86400000) : Infinity;
      return 5 * Math.exp(-age / 30) + (article.importance === "high" ? 3 : 0)
        + (state.interests.has(article.tag) ? 6 : 0) + (state.follows.has(article.ticker) ? 7 : 0)
        + bounded(tags.get(article.tag)) + bounded(symbols.get(article.ticker)) / 2
        + (state.reactions.get(article.id) || 0) * 2;
    };
    const candidates = articles.map(article => ({ article, score: score(article) }))
      .sort((a, b) => b.score - a.score || compareDates(a.article, b.article)).map(item => item.article);
    const result = [];
    const counts = new Map();
    const important = candidates.filter(article => article.importance === "high").sort(compareDates)[0];
    if (important) {
      result.push(important);
      counts.set(important.tag, 1);
      candidates.splice(candidates.indexOf(important), 1);
    }
    while (candidates.length && result.length < 6) {
      const index = candidates.findIndex(article => (counts.get(article.tag) || 0) < 2);
      if (index < 0) break;
      const [article] = candidates.splice(index, 1);
      result.push(article);
      counts.set(article.tag, (counts.get(article.tag) || 0) + 1);
    }
    return result.concat(candidates);
  }

  function createPreferences(getStorage, catalog) {
    let state = empty();
    let persistent = false;
    const ids = new Set(catalog.map(article => article.id));
    const categories = new Set(catalog.map(article => article.tag));
    try {
      const saved = JSON.parse(getStorage().getItem(storageKey));
      if (saved?.consent === true) {
        const safeArray = value => Array.isArray(value) ? value.slice(0, 200) : [];
        state = {
          interests: new Set(safeArray(saved.interests).filter(tag => categories.has(tag))),
          follows: new Set(safeArray(saved.follows).filter(ticker => typeof ticker === "string" && validTicker(ticker))),
          opened: new Set(safeArray(saved.opened).filter(id => ids.has(id))),
          reactions: new Map(safeArray(saved.reactions).filter(entry =>
            Array.isArray(entry) && ids.has(entry[0]) && [1, -1].includes(entry[1])))
        };
        persistent = true;
      }
    } catch { /* Storage may be blocked or contain invalid data. */ }
    function persist(allowNewConsent = false) {
      if (!persistent) return true;
      try {
        const storage = getStorage();
        if (!allowNewConsent && JSON.parse(storage.getItem(storageKey))?.consent !== true) {
          persistent = false;
          return true;
        }
        storage.setItem(storageKey, JSON.stringify({
          consent: true, interests: [...state.interests], follows: [...state.follows],
          opened: [...state.opened], reactions: [...state.reactions]
        }));
        return true;
      } catch {
        return false;
      }
    }
    function disable() {
      try {
        getStorage().removeItem(storageKey);
        persistent = false;
        return true;
      } catch {
        return !persistent;
      }
    }
    const toggle = (set, key) => set.has(key) ? set.delete(key) : set.add(key);
    return {
      get state() { return state; },
      get persistent() { return persistent; },
      remember(value) {
        if (!value) return disable();
        persistent = true;
        if (persist(true)) return true;
        persistent = false;
        return false;
      },
      reset() {
        state = empty();
        return disable();
      },
      open(id) {
        if (ids.has(id) && !state.opened.has(id)) {
          state.opened.add(id);
          return persist();
        }
        return true;
      },
      react(id, value) {
        if (!ids.has(id) || ![1, -1].includes(value)) return false;
        if (state.reactions.get(id) === value) state.reactions.delete(id);
        else state.reactions.set(id, value);
        return persist();
      },
      follow(value) {
        const ticker = cleanTicker(value);
        if (!validTicker(ticker)) return false;
        toggle(state.follows, ticker);
        return persist();
      },
      interest(tag) {
        if (!categories.has(tag)) return false;
        toggle(state.interests, tag);
        return persist();
      }
    };
  }

  const api = { compareDates, createPreferences, rank };
  if (typeof module === "object" && module.exports) module.exports = api;
  else window.MarketPulseModel = api;
})();
