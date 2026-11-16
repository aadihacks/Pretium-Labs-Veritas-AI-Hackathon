/* Database-owned cosmetic identity tags; never derive join order from browser metadata. */
(function (root) {
  "use strict";
  const validId = value => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

  function tagHtml(value, { showNumber = false } = {}) {
    if (!(typeof value === "number" || (typeof value === "string" && /^[1-9][0-9]*$/.test(value)))) return "";
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 1) return "";
    // Numbered previews are reserved for tag selection and library views.
    const numberHtml = showNumber ? `<span class="username-tag-number" aria-hidden="true">#${String(number).padStart(3, "0")}</span>` : "";
    return `<span class="username-tag" translate="no" role="img" aria-label="${showNumber ? `OG, join number ${number}` : "OG"}">${numberHtml}<span aria-hidden="true">OG</span></span>`;
  }

  function createStore(client, changed = () => {}) {
    let owner = "", generation = 0;
    const tags = new Map(), requested = new Set();
    return {
      setUser(id) {
        const next = validId(id) ? id : "";
        if (next === owner) return;
        owner = next; generation += 1;
        tags.clear(); requested.clear(); changed();
      },
      html(id) { return owner && validId(id) ? tagHtml(tags.get(id)) : ""; },
      async load(ids) {
        if (!owner || !client) return;
        const missing = [...new Set(ids)].filter(id => validId(id) && !requested.has(id));
        if (!missing.length) return;
        missing.forEach(id => requested.add(id));
        const requestGeneration = generation;
        try {
          // Bound each lookup; do not enumerate the account directory.
          for (let offset = 0; offset < missing.length; offset += 100) {
            const batch = missing.slice(offset, offset + 100);
            const { data, error } = await client.from("member_tags").select("user_id,join_number").in("user_id", batch);
            if (requestGeneration !== generation) return;
            if (error || !Array.isArray(data)) continue;
            const allowed = new Set(batch);
            data.forEach(row => {
              if (allowed.has(row.user_id) && tagHtml(row.join_number)) tags.set(row.user_id, row.join_number);
            });
          }
          if (requestGeneration === generation) changed();
        } catch {
          // A missing migration, expired session or offline lookup never invents a badge.
        }
      }
    };
  }

  function connect(client, document, schedule = callback => setTimeout(callback, 0)) {
    if (!client || !document?.body) return;
    let queued = false, authRevision = 0;
    const store = createStore(client, refresh);
    function refresh() {
      const slots = [...document.querySelectorAll("[data-member-tag]")];
      slots.forEach(slot => {
        const html = store.html(slot.dataset.memberTag);
        if (slot.innerHTML !== html) slot.innerHTML = html;
      });
      void store.load(slots.map(slot => slot.dataset.memberTag));
    }
    function queueRefresh() {
      if (queued) return;
      queued = true;
      schedule(() => { queued = false; refresh(); });
    }
    const observer = new MutationObserver(records => {
      if (records.some(record => record.type === "attributes" || [...record.addedNodes].some(node =>
        node.matches?.("[data-member-tag]") || node.querySelector?.("[data-member-tag]")))) queueRefresh();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-member-tag"] });
    // Do not query Supabase while inside its synchronous auth-state callback.
    client.auth.onAuthStateChange((_event, session) => {
      authRevision += 1;
      const revision = authRevision, id = session?.user?.id || "";
      schedule(() => { if (revision === authRevision) { store.setUser(id); refresh(); } });
    });
    const initialRevision = authRevision;
    void client.auth.getSession().then(({ data, error }) => {
      if (initialRevision !== authRevision) return;
      store.setUser(error ? "" : data.session?.user?.id || ""); refresh();
    }).catch(() => {});
  }

  const api = { tagHtml, createStore, connect };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MemberTags = api;
})(typeof window === "object" ? window : globalThis);
