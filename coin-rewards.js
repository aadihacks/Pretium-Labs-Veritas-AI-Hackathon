(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CoinRewards = api;
})(typeof window === "undefined" ? globalThis : window, function () {
  "use strict";

  const rankedEntryFee = 100;
  const questDefinitions = Object.freeze([
    { id: "free", category: "Free Play", title: "Solve 3 prediction puzzles", target: 3, reward: 50 },
    { id: "correct", category: "Prediction", title: "Make 3 correct calls", target: 3, reward: 75 },
    { id: "daily", category: "Daily", title: "Finish the Daily puzzle", target: 1, reward: 100 }
  ].map(Object.freeze));
  const predictionRewards = Object.freeze({ free: 10, daily: 50, ranked: 25 });
  const integer = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
  function levelReward(increment) {
    if (!Number.isInteger(increment) || increment < 1 || increment > 120) return 0;
    return (increment - 1) % 20 === 0 ? 500 : (increment - 1) % 20 === 8 ? 250 : 0;
  }
  function createWallet({ storage, key, today = () => new Date().toISOString().slice(0, 10) }) {
    function read() {
      let saved;
      try { saved = JSON.parse(storage.getItem(key()) || "null"); } catch {}
      const date = today();
      const day = saved?.day?.date === date ? saved.day : {};
      return {
        version: 1,
        balance: integer(saved?.balance),
        serverRewardTotal: integer(saved?.serverRewardTotal),
        claimedLevels: [...new Set((Array.isArray(saved?.claimedLevels) ? saved.claimedLevels : []).filter(levelReward))],
        seen: [...new Set((Array.isArray(saved?.seen) ? saved.seen : []).filter(id => typeof id === "string" && id.length <= 300))],
        ranked: (Array.isArray(saved?.ranked) ? saved.ranked : []).filter(round =>
          typeof round?.id === "string" && round.id.length <= 280
          && ["open", "settled", "refunded"].includes(round.status)
          && Number.isSafeInteger(round.stake) && round.stake >= 0),
        day: {
          date,
          progress: Object.fromEntries(questDefinitions.map(quest => [quest.id, Math.min(quest.target, integer(day.progress?.[quest.id]))])),
          claimed: [...new Set((Array.isArray(day.claimed) ? day.claimed : []).filter(id => questDefinitions.some(quest => quest.id === id)))]
        }
      };
    }
    function commit(state, amount) {
      if (!Number.isSafeInteger(state.balance + amount) || state.balance + amount < 0) throw new Error("Coin balance limit reached.");
      state.balance += amount;
      // Claims and balance are committed together before any animation begins.
      storage.setItem(key(), JSON.stringify(state));
      return amount;
    }
    function creditServerRewards(total) {
      if (!Number.isSafeInteger(total) || total < 0) return 0;
      const state = read();
      const amount = Math.max(0, total - state.serverRewardTotal);
      state.serverRewardTotal = Math.max(total, state.serverRewardTotal);
      return commit(state, amount);
    }
    function recordPrediction({ mode, id, correct, dailyDate, serverRecorded = false }) {
      if (!Object.prototype.hasOwnProperty.call(predictionRewards, mode) || typeof id !== "string" || !id || id.length > 280) return 0;
      const state = read();
      const identity = `${mode}:${id}`;
      if (state.seen.includes(identity)) return 0;
      state.seen.push(identity);
      if (correct === true) {
        state.day.progress.correct = Math.min(3, state.day.progress.correct + 1);
        if (mode === "free") state.day.progress.free = Math.min(3, state.day.progress.free + 1);
      }
      if (mode === "daily" && dailyDate === state.day.date) state.day.progress.daily = 1;
      return commit(state, correct === true && !serverRecorded ? predictionRewards[mode] : 0);
    }
    function claimLevel(increment, unlockedIncrement) {
      const amount = levelReward(increment);
      if (!amount || !Number.isInteger(unlockedIncrement) || increment > unlockedIncrement) return 0;
      const state = read();
      if (state.claimedLevels.includes(increment)) return 0;
      state.claimedLevels.push(increment);
      return commit(state, amount);
    }
    function claimQuest(id) {
      const quest = questDefinitions.find(item => item.id === id);
      if (!quest) return 0;
      const state = read();
      if (state.day.claimed.includes(id) || state.day.progress[id] < quest.target) return 0;
      state.day.claimed.push(id);
      return commit(state, quest.reward);
    }
    function enterRanked(id) {
      if (typeof id !== "string" || !id || id.length > 280) return false;
      const state = read();
      const existing = state.ranked.find(round => round.id === id);
      if (existing && existing.status !== "refunded") return existing.status === "open";
      if (state.seen.includes(`ranked:${id}`) || state.balance < rankedEntryFee) return false;
      const round = { id, status: "open", stake: 0, choice: "" };
      if (existing) state.ranked[state.ranked.indexOf(existing)] = round;
      else state.ranked.push(round);
      commit(state, -rankedEntryFee);
      return true;
    }
    function lockRanked(id, choice) {
      if (!["Up", "Down", "Sideways"].includes(choice)) return false;
      const state = read();
      const round = state.ranked.find(round => round.id === id && round.status === "open");
      if (!round || (round.choice && round.choice !== choice)) return false;
      round.choice = choice;
      commit(state, 0);
      return true;
    }
    function betRanked(id, amount) {
      if (!Number.isSafeInteger(amount) || amount <= 0 || !Number.isSafeInteger(amount * 2)) return false;
      const state = read();
      const round = state.ranked.find(round => round.id === id && round.status === "open");
      if (!round || round.choice || amount > state.balance + round.stake) return false;
      const difference = round.stake - amount;
      round.stake = amount;
      commit(state, difference);
      return true;
    }
    function settleRanked(id, correct) {
      if (typeof correct !== "boolean") return 0;
      const state = read();
      const round = state.ranked.find(round => round.id === id && round.status === "open");
      if (!round?.choice) return 0;
      round.status = "settled";
      round.correct = correct;
      return commit(state, correct ? round.stake * 2 : 0);
    }
    function refundRanked(id) {
      const state = read();
      const round = state.ranked.find(round => round.id === id && round.status === "open");
      if (!round) return 0;
      round.status = "refunded";
      return commit(state, rankedEntryFee + round.stake);
    }
    function purchase(amount, savePurchase) {
      if (!Number.isSafeInteger(amount) || amount <= 0 || typeof savePurchase !== "function") return false;
      const state = read();
      if (state.balance < amount) return false;
      commit(state, -amount);
      try {
        savePurchase();
      } catch (error) {
        commit(state, amount);
        throw error;
      }
      return true;
    }
    return { read, creditServerRewards, recordPrediction, claimLevel, claimQuest, enterRanked, lockRanked, betRanked, settleRanked, refundRanked, purchase };
  }

  const activeCollections = new Set();
  function cancelCollections() {
    [...activeCollections].forEach(cancel => cancel());
  }
  function playCollection(source, amount, { delay = 0, collection = null } = {}) {
    if (!amount || typeof document === "undefined") return;
    window.refreshRewardStatus?.();
    const showReward = () => window.rewardStatus?.collect("coins");
    if (document.body.dataset.theme !== "gamify" || document.body.dataset.animationXp === "off") { showReward(); return; }
    const visible = rect => rect?.width > 0 && rect?.height > 0 && rect.right > 0 && rect.left < innerWidth
      && rect.bottom > 0 && rect.top < innerHeight;
    const chartRect = document.getElementById("chart")?.getBoundingClientRect();
    let sourceRect = visible(chartRect) ? chartRect : source?.getBoundingClientRect();
    if (!visible(sourceRect)) { showReward(); return; }
    while (activeCollections.size >= 4) activeCollections.values().next().value();
    const readout = window.prepareCoinReadoutCollection?.(amount);
    const target = document.getElementById("xp")?.closest(".xp-metric");
    let timer, frame = 0, field, status, media, changed, ended = false, cancelStatus, finishStatus;
    const cancel = () => {
      if (ended) return;
      ended = true;
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      field?.remove(); status?.remove();
      media?.removeEventListener?.("change", changed);
      readout?.finish(false);
      window.cancelRewardImpact?.(target);
      activeCollections.delete(cancel);
      cancelStatus?.();
    };
    activeCollections.add(cancel);
    const begin = () => {
      if (ended || document.body.dataset.theme !== "gamify" || document.body.dataset.animationXp === "off" || document.hidden) return cancel();
      const liveChartRect = document.getElementById("chart")?.getBoundingClientRect();
      const liveSourceRect = visible(liveChartRect) ? liveChartRect : source?.getBoundingClientRect();
      if (!visible(liveSourceRect)) return cancel();
      sourceRect = liveSourceRect;
      const targetRect = target?.getBoundingClientRect();
      if (!targetRect?.width || !targetRect?.height || targetRect.bottom < 0 || targetRect.top > innerHeight) return cancel();
      status = document.createElement("div");
      status.className = "coin-collection-status";
      status.setAttribute("role", "status");
      status.textContent = `+${amount.toLocaleString()} coins collected`;
      document.body.appendChild(status);
      const finish = () => {
        if (ended) return;
        field?.remove(); field = null;
        readout?.finish();
        finishStatus?.(); finishStatus = null;
        timer = setTimeout(cancel, 1600);
      };
      media = matchMedia("(prefers-reduced-motion: reduce)");
      if (media.matches) return finish();
      field = document.createElement("canvas");
      field.className = "coin-collection-field";
      field.setAttribute("aria-hidden", "true");
      document.body.appendChild(field);
      const ctx = field.getContext("2d");
      if (!ctx) return finish();
      const colors = { gold: "#f3be44", highlight: "#fff0a0", dark: "#97540d", shadow: "#6c410c24" };
      const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
      const start = {
        x: (Math.max(0, sourceRect.left) + Math.min(innerWidth, sourceRect.right)) / 2,
        y: (Math.max(0, sourceRect.top) + Math.min(innerHeight, sourceRect.bottom)) / 2
      };
      const spread = Math.min(sourceRect.width, innerWidth);
      // Keep the approved preview's fixed-step XP attraction and 2x playback.
      const xpPlayback = 2, physicsStep = 1000 / 120;
      function xpFlight(referenceDistance) {
        const samples = [0], delta = physicsStep / 16.667;
        let remaining = referenceDistance, velocity = 0, age = 0;
        while (age < 6000) {
          age += physicsStep;
          if (remaining <= Math.max(12, velocity * delta * 1.4)) { samples.push(1); break; }
          const desiredSpeed = Math.min(28, 3 + age * .03);
          velocity += (desiredSpeed - velocity) * (1 - Math.pow(.9, delta));
          remaining -= velocity * delta;
          samples.push(Math.min(1, 1 - remaining / referenceDistance));
        }
        return samples;
      }
      function flightProgress(samples, age) {
        const position = Math.max(0, age) * xpPlayback / physicsStep, index = Math.floor(position);
        if (index >= samples.length - 1) return 1;
        return samples[index] + (samples[index + 1] - samples[index]) * (position - index);
      }
      const random = (min, max) => min + Math.random() * (max - min);
      const bell = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
      // Project a thick cylinder rotating only about its vertical axis.
      function drawCoin(x, y, radius, angle, scale, alpha) {
        if (scale <= 0 || alpha <= 0) return;
        ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
        const co = Math.cos(angle), si = Math.sin(angle), half = 2.9;
        ctx.save(); ctx.translate(1, radius + 4); ctx.scale(1, .22);
        ctx.fillStyle = colors.shadow;
        ctx.beginPath(); ctx.arc(0, 0, radius * .85, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        const project = (p, z) => ({ x: Math.cos(p) * radius * co + z * si, y: Math.sin(p) * radius });
        const segments = 72;
        for (let i = 0; i < segments; i++) {
          const a = i / segments * Math.PI * 2, b = (i + 1) / segments * Math.PI * 2;
          const normal = -si * Math.cos((a + b) / 2);
          if (normal < -.01) continue;
          const points = [project(a, -half), project(b, -half), project(b, half), project(a, half)];
          ctx.beginPath(); points.forEach((p, j) => j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
          const light = clamp(.34 + normal * .35 - Math.sin((a + b) / 2) * .22, 0, 1);
          ctx.fillStyle = `hsl(39, 85%, ${25 + light * 39}%)`; ctx.fill();
          if (i % 2 === 0) {
            ctx.strokeStyle = "rgba(255,231,128,.55)"; ctx.lineWidth = .65;
            ctx.beginPath(); ctx.moveTo(points[1].x, points[1].y); ctx.lineTo(points[2].x, points[2].y); ctx.stroke();
          }
        }
        ctx.translate((co >= 0 ? half : -half) * si, 0);
        // Blank faces: the rim and metal shading supply all visible detail.
        ctx.scale(Math.max(.001, Math.abs(co)), 1);
        const face = ctx.createLinearGradient(-radius, -radius, radius, radius);
        face.addColorStop(0, colors.highlight); face.addColorStop(.27, colors.gold);
        face.addColorStop(.57, "#ffe488"); face.addColorStop(1, "#cc8a21");
        ctx.fillStyle = face; ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = colors.dark; ctx.lineWidth = 1.1; ctx.stroke();
        ctx.strokeStyle = colors.highlight; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(0, 0, radius - 2, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      const clumps = [{ x: random(-.11, -.06), y: random(-21, 5) },
        { x: random(-.025, .025), y: random(-14, 21) }, { x: random(.065, .115), y: random(-24, 12) }];
      const particles = Array.from({ length: 26 }, (_, index) => {
        const batch = Math.floor(index / 9), clump = clumps[batch];
        const offset = clump.x + bell() * .038, y = clump.y + bell() * 31;
        return { x: start.x + offset * spread, y: start.y + y, r: random(16, 21),
          phase: random(0, Math.PI * 2), speed: random(3.6, 5.2), delay: batch * 65 + random(0, 65),
          leave: random(0, 470), lift: random(14, 38), hit: false,
          flight: xpFlight(Math.hypot((.5 + offset) * 2048 - 530, .54 * 1017 + y - 56.5)) };
      }).sort((a, b) => a.y - b.y);
      let canvasWidth = 0, canvasHeight = 0, pixelRatio = 0;
      const started = collection?.startedAt ?? performance.now();
      const naturalDuration = Math.max(...particles.map(p => p.delay + 650 + p.leave + (p.flight.length - 1) * physicsStep / xpPlayback));
      const playback = collection?.paired && collection.duration > 0 ? naturalDuration / collection.duration : 1;
      let lastImpact = 0, arrived = 0;
      const draw = now => {
        if (ended) return;
        if (document.body.dataset.theme !== "gamify" || document.body.dataset.animationXp === "off" || document.hidden) return cancel();
        const rect = target.getBoundingClientRect();
        const destination = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        if (canvasWidth !== innerWidth || canvasHeight !== innerHeight || pixelRatio !== dpr) {
          canvasWidth = innerWidth; canvasHeight = innerHeight; pixelRatio = dpr;
          field.width = Math.round(canvasWidth * dpr); field.height = Math.round(canvasHeight * dpr);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        let remaining = false;
        for (const p of particles) {
          if (p.hit) continue;
          const elapsed = (now - started) * playback;
          const time = elapsed - p.delay;
          if (time < 0) { remaining = true; continue; }
          const pop = Math.min(1, time / 210), eased = 1 - Math.pow(1 - pop, 3);
          let scale = .16 + .84 * eased;
          let x = clamp(p.x, 24, Math.max(24, innerWidth - 24));
          let y = clamp(p.y, 24, Math.max(24, innerHeight - 24)) + (1 - eased) * p.lift;
          const q = collection?.duration > 0 && now - started >= collection.duration ? 1 : flightProgress(p.flight, time - 650 - p.leave);
          if (q > 0) {
            const cx = x + (destination.x - x) * .35, cy = y - 45;
            x = (1 - q) ** 2 * x + 2 * (1 - q) * q * cx + q ** 2 * destination.x;
            y = (1 - q) ** 2 * y + 2 * (1 - q) * q * cy + q ** 2 * destination.y;
            scale *= 1 - .63 * q;
            if (q === 1) {
              p.hit = true;
              arrived += 1;
              readout?.arrive(arrived / particles.length);
              if (now - lastImpact > 80) {
                lastImpact = now;
                window.playRewardImpact?.(target);
                target.animate?.([{ filter: "brightness(1)" }, { filter: "brightness(1.2)" }, { filter: "brightness(1)" }], { duration: 180 });
              }
              continue;
            }
          }
          drawCoin(x, y, p.r, p.phase + elapsed / 1000 * p.speed, scale, Math.min(1, pop * 4));
          remaining = true;
        }
        if (remaining) frame = requestAnimationFrame(draw); else finish();
      };
      changed = event => { if (event.matches) { cancelAnimationFrame(frame); finish(); } };
      media.addEventListener?.("change", changed);
      frame = requestAnimationFrame(draw);
    };
    if (collection) {
      cancelStatus = collection.add("coins", done => { finishStatus = done; begin(); });
      return;
    }
    timer = setTimeout(() => {
      if (ended) return;
      if (window.rewardStatus) cancelStatus = window.rewardStatus.collect("coins", done => { finishStatus = done; begin(); });
      else begin();
      if (ended) cancelStatus?.();
    }, Math.max(0, delay));
  }
  return { questDefinitions, predictionRewards, rankedEntryFee, levelReward, createWallet, playCollection, cancelCollections };
});
