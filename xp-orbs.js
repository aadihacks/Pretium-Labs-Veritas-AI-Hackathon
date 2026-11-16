// Shared reward readout and collection scheduling, loaded with the XP effects.
(function (root, factory) {
  const create = factory();
  if (typeof module === "object" && module.exports) module.exports = create;
  else {
    const box = document.querySelector(".xp-metric");
    if (!box) return;
    const labels = { xp: "XP", coins: "Coins", credit: "Credit Score" };
    const readouts = { xp: document.getElementById("xp"), coins: document.getElementById("statusCoins"), credit: document.getElementById("statusCredit") };
    const pauses = new Set();
    function formatRewardValue(value) {
      if (value === null) return "—";
      if (value < 10000) return value.toLocaleString();
      // At most three digits and a suffix; the accessible label retains the exact total.
      const [scale, suffix] = [[1e15, "Q"], [1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]]
        .find(([scale]) => value >= scale * .9995);
      return `${Math.round(value / scale).toLocaleString()}${suffix}`;
    }
    let coinTotal = 0, displayedCoins = null, coinTarget = null, coinFrame = 0;
    const pendingCoins = new Map();
    function paintCoins(animate = true) {
      const target = Math.max(0, Math.round(coinTotal - [...pendingCoins.values()].reduce((sum, value) => sum + value, 0)));
      const motionAllowed = () => document.body.dataset?.animationXp !== "off"
        && !root.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // Paired rewards show XP first. Save the coin tick for its visible turn.
      if (readouts.coins.hidden && animate && motionAllowed()) return;
      if (displayedCoins === null || target < displayedCoins || !animate || !motionAllowed()) {
        if (coinFrame) cancelAnimationFrame(coinFrame);
        coinFrame = 0;
        coinTarget = displayedCoins = target;
        readouts.coins.textContent = formatRewardValue(target);
        return;
      }
      if (target === coinTarget) return;
      if (coinFrame) cancelAnimationFrame(coinFrame);
      coinTarget = target;
      const start = displayedCoins, startedAt = performance.now();
      // Match the XP readout: integer ticks, with a two-second cap for large gains.
      const duration = Math.max(180, Math.min(2000, (target - start) * 18));
      const tick = () => {
        if (!motionAllowed()) return paintCoins(false);
        const progress = Math.max(0, Math.min(1, (performance.now() - startedAt) / duration));
        displayedCoins = Math.round(start + (target - start) * progress);
        readouts.coins.textContent = formatRewardValue(displayedCoins);
        coinFrame = progress < 1 ? requestAnimationFrame(tick) : 0;
      };
      coinFrame = requestAnimationFrame(tick);
    }
    // Reserve each queued reward so ordinary refreshes cannot reveal it before arrival.
    root.prepareCoinReadoutCollection = amount => {
      const token = {};
      pendingCoins.set(token, amount);
      paintCoins(false);
      return {
        arrive(progress) {
          if (!pendingCoins.has(token)) return;
          pendingCoins.set(token, amount * (1 - progress));
          paintCoins();
        },
        finish(animate = true) {
          if (!pendingCoins.delete(token)) return;
          paintCoins(animate);
        }
      };
    };
    root.waitForCoinReadout = done => {
      const wait = () => {
        if (coinFrame) requestAnimationFrame(wait);
        else done();
      };
      wait();
    };
    const status = root.rewardStatus = create({ order: ["xp", "coins", "credit"],
      render(stat, values, animate = true) {
        box.dataset.stat = stat;
        for (const [key, node] of Object.entries(readouts)) {
          node.hidden = key !== stat;
          if (key === "credit") node.textContent = formatRewardValue(values[key]);
        }
        if (!animate) pendingCoins.clear();
        coinTotal = values.coins;
        paintCoins(animate);
        box.querySelector(".xp-label").textContent = labels[stat];
        const summary = Object.keys(labels).map(key => `${labels[key]}: ${values[key] === null ? "not available yet" : values[key].toLocaleString()}`).join(". ");
        box.setAttribute("aria-label", `${summary}. Arrow keys browse stats. Space pauses or resumes cycling.`);
        box.title = `${summary}. Hover or focus to pause. Space toggles automatic cycling.`;
      }
    });
    function pause(reason, value) {
      if (value) pauses.add(reason); else pauses.delete(reason);
      status.pause(pauses.size > 0);
    }
    box.addEventListener("mouseenter", () => pause("hover", true));
    box.addEventListener("mouseleave", () => pause("hover", false));
    box.addEventListener("focus", () => pause("focus", true));
    box.addEventListener("blur", () => pause("focus", false));
    box.addEventListener("keydown", event => {
      if (["ArrowRight", "ArrowLeft"].includes(event.key)) {
        event.preventDefault();
        status.next(event.key === "ArrowLeft" ? -1 : 1);
      } else if ([" ", "Enter"].includes(event.key)) {
        event.preventDefault();
        pause("manual", !pauses.has("manual"));
      }
    });
    // A tap offers the same way to browse as the keyboard, without a hover dependency.
    box.addEventListener("click", () => status.next());
    document.addEventListener("visibilitychange", () => pause("hidden", document.hidden));
    pause("hidden", document.hidden);
  }
})(typeof window === "undefined" ? globalThis : window, function () {
  "use strict";
  return function createRewardStatus({ render, order = ["xp", "coins", "credit"], schedule = setTimeout, unschedule = clearTimeout, cycleMs = 4000, holdMs = 1000 }) {
    let values = { xp: 0, coins: 0, credit: null };
    let current = "xp", owner, paused = false, timer, active = null;
    const queue = [];
    const stop = () => { unschedule(timer); timer = undefined; };
    const paint = (animate = true) => render(current, { ...values }, animate);
    function cycle() {
      stop();
      if (!paused && !active) timer = schedule(() => next(), cycleMs);
    }
    function show(stat) {
      if (!order.includes(stat)) return;
      current = stat;
      paint();
    }
    function next(direction = 1) {
      if (active) return;
      show(order[(order.indexOf(current) + direction + order.length) % order.length]);
      cycle();
    }
    function drain() {
      stop();
      if (active) return;
      const job = queue.shift();
      if (!job) return cycle();
      active = job;
      show(job.stat);
      job.begin(() => {
        if (active !== job || job.finished) return;
        job.finished = true;
        timer = schedule(() => {
          if (active !== job) return;
          active = null;
          if (queue.length) drain();
          else if (paused) paint();
          else next();
        }, holdMs);
      });
    }
    function collect(stat, begin = done => done()) {
      if (!order.includes(stat)) return () => {};
      const job = { stat, begin, finished: false };
      queue.push(job);
      if (!active) drain();
      return () => {
        if (active === job) { stop(); active = null; drain(); }
        else { const index = queue.indexOf(job); if (index >= 0) queue.splice(index, 1); }
      };
    }
    function reset() {
      stop(); active = null; queue.length = 0;
      values = { xp: 0, coins: 0, credit: null };
      owner = undefined;
      current = "xp"; paint(false); cycle();
    }
    function update(incoming, account) {
      const changedOwner = account !== undefined && account !== owner;
      if (changedOwner) { reset(); owner = account; }
      const previous = values;
      values = { ...values, ...incoming };
      paint(!changedOwner);
      // Ordinary XP gains (lessons, Speed, Light/Dark) have no flight callback.
      if (!changedOwner && values.xp > previous.xp && active?.stat !== "xp" && !queue.some(job => job.stat === "xp")) collect("xp");
    }
    function pause(value) {
      paused = value;
      // Never discard a reward's completion timer when focus/visibility changes.
      if (!active) cycle();
    }
    paint(); cycle();
    return { update, collect, reset, pause, show, next };
  };
});

(function () {
  if (typeof window === "undefined") return;
  let activeRun = 0;
  const animationSpeed = 2;
  const physicsStep = 1000 / 120;
  // Playback reference: the recorded 2048 x 1017 CSS-pixel desktop viewport.
  // Responsive flight paths share its playback rate and measured XP target.
  const flightReference = { width: 2048, height: 1017, chartLeft: 306, chartWidth: 1312, targetX: 530, targetY: 56.5 };

  // One answer can award two currencies. Queue their readout once, then launch
  // both effects on the same clock; unrelated rewards keep their normal queue.
  window.createRewardCollection = function createRewardCollection({ delay = 0 } = {}) {
    const jobs = new Set();
    let started = false, paired = false, startedAt = 0, duration = 0;
    let cancelStatus, finishStatus, collectedCoins = false;
    const settle = (job, completed) => {
      if (!jobs.delete(job)) return;
      if (completed && job.stat === "coins") collectedCoins = true;
      if (jobs.size) return;
      if (!started) { clearTimeout(timer); cancelStatus?.(); return; }
      finishStatus?.(); finishStatus = null;
      if (collectedCoins) window.rewardStatus?.collect("coins", done => {
        if (window.waitForCoinReadout) window.waitForCoinReadout(done);
        else done();
      });
    };
    const timer = window.setTimeout(() => {
      if (!jobs.size) return;
      const launch = done => {
        started = true; paired = jobs.size > 1; startedAt = performance.now();
        finishStatus = done;
        [...jobs].forEach(job => job.begin(() => settle(job, true)));
      };
      if (window.rewardStatus) cancelStatus = window.rewardStatus.collect([...jobs][0].stat, launch);
      else launch(() => {});
    }, Math.max(0, delay));
    return {
      get paired() { return paired; },
      get startedAt() { return startedAt; },
      get duration() { return duration; },
      setDuration(value) { duration = value; },
      add(stat, begin) {
        const job = { stat, begin }; jobs.add(job);
        return () => settle(job, false);
      }
    };
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const impacts = new WeakMap();
  window.playRewardImpact = function playRewardImpact(target) {
    if (!target || document.body.dataset?.theme !== "gamify" || document.body.dataset?.animationXp === "off"
      || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    impacts.get(target)?.cancel();
    const animation = target.animate?.([
      { transform: "translateY(0)" },
      { transform: "translateY(-3px)", offset: .2 },
      { transform: "translateY(3px)", offset: .4 },
      { transform: "translateY(-2px)", offset: .6 },
      { transform: "translateY(1px)", offset: .8 },
      { transform: "translateY(0)" }
    ], { duration: 220, easing: "ease-out" });
    if (animation) impacts.set(target, animation);
  };
  window.cancelRewardImpact = target => {
    if (!target) return;
    impacts.get(target)?.cancel();
    impacts.delete(target);
  };

  let displayedXp = null;
  let counterTarget = null;
  let counterFrame = 0;

  // Shared by ordinary stat updates and orb arrivals; only the readout animates.
  window.updateXpReadout = function updateXpReadout(value, animate = true) {
    const readout = document.getElementById("xp");
    if (!readout) return;
    const target = Math.max(0, Math.round(Number(value) || 0));
    const motionAllowed = animate && document.body.dataset?.animationXp !== "off"
      && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (displayedXp === null || target < displayedXp || !motionAllowed) {
      if (counterFrame) cancelAnimationFrame(counterFrame);
      counterFrame = 0;
      counterTarget = displayedXp = target;
      readout.textContent = target.toLocaleString();
      return;
    }
    if (target === counterTarget) return;
    if (counterFrame) cancelAnimationFrame(counterFrame);
    counterTarget = target;
    const start = displayedXp;
    const startedAt = performance.now();
    // Small rewards tick through individual integers; large gains finish promptly.
    const duration = clamp((target - start) * 18, 180, 2000);
    const tick = () => {
      if (document.body.dataset?.animationXp === "off"
        || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        window.updateXpReadout(counterTarget, false);
        return;
      }
      const progress = clamp((performance.now() - startedAt) / duration, 0, 1);
      const next = Math.round(start + (target - start) * progress);
      if (next !== displayedXp) {
        displayedXp = next;
        readout.textContent = next.toLocaleString();
      }
      counterFrame = progress < 1 ? requestAnimationFrame(tick) : 0;
    };
    counterFrame = requestAnimationFrame(tick);
  };

  function launchVelocityForDistance(distance, frames, drag, acceleration = 0) {
    let velocityContribution = 0;
    let unitVelocity = 1;
    let accelerationVelocity = 0;
    let accelerationContribution = 0;
    for (let frame = 0; frame < frames; frame += 1) {
      unitVelocity *= drag;
      velocityContribution += unitVelocity;
      accelerationVelocity = accelerationVelocity * drag + acceleration;
      accelerationContribution += accelerationVelocity;
    }
    return (distance - accelerationContribution) / Math.max(.001, velocityContribution);
  }

  function progressWidth(bar) {
    if (!bar) return 0;
    const inlineWidth = Number.parseFloat(bar.style.width);
    if (Number.isFinite(inlineWidth)) return clamp(inlineWidth, 0, 100);
    const trackWidth = bar.parentElement?.getBoundingClientRect().width || 1;
    return clamp(bar.getBoundingClientRect().width / trackWidth * 100, 0, 100);
  }

  window.prepareXpOrbCollection = function prepareXpOrbCollection(source, startXp) {
    if (document.body.dataset?.theme !== "gamify" || document.body.dataset?.animationXp === "off") return null;
    const clickedRect = source?.getBoundingClientRect();
    const chartRect = document.getElementById("chart")?.getBoundingClientRect();
    const sourceRect = chartRect?.width > 0 && chartRect?.height > 0 ? chartRect : clickedRect;
    const bar = document.querySelector("#levelButton .xp span");
    if (!sourceRect || !bar) return null;
    return {
      sourceRect: {
        left: sourceRect.left,
        top: sourceRect.top,
        width: sourceRect.width,
        height: sourceRect.height
      },
      startXp: Math.max(0, Number(startXp) || 0),
      startProgress: progressWidth(bar)
    };
  };

  window.playXpOrbCollection = function playXpOrbCollection(prepared, amount, endXp, options = {}) {
    if (document.body.dataset?.theme !== "gamify" || document.body.dataset?.animationXp === "off") return;
    const gainedXp = Math.max(0, Math.round(Number(amount) || 0));
    const startDelay = Math.max(0, Number(options.delay) || 0);
    const targetTrack = document.querySelector("#levelButton .xp");
    const targetBar = targetTrack?.querySelector("span");
    const xpReadout = document.getElementById("xp");
    const xpMetric = xpReadout?.closest(".xp-metric");
    if (!prepared || !gainedXp || !targetTrack || !targetBar || !xpReadout) return;

    window.cancelXpOrbCollection?.();
    activeRun += 1;
    const run = activeRun;
    document.querySelector(".xp-orb-field")?.remove();
    document.querySelector(".xp-orb-status")?.remove();

    const finalXp = Math.max(prepared.startXp, Number(endXp) || prepared.startXp + gainedXp);
    const finalProgress = progressWidth(targetBar);
    const initialProgress = finalProgress < prepared.startProgress ? 0 : prepared.startProgress;
    const targetRect = targetTrack.getBoundingClientRect();
    let targetPoint = {
      x: targetRect.left + Math.min(targetRect.width - 4, targetRect.width * .72),
      y: targetRect.top + targetRect.height * .5
    };

    let status = null;
    let cancelStatus, finishStatus;

    window.cancelXpOrbCollection = () => {
      if (run !== activeRun) return;
      activeRun += 1;
      window.cancelXpOrbCollection = null;
      document.querySelector(".xp-orb-field")?.remove();
      status?.remove();
      window.updateXpReadout(finalXp, false);
      targetBar.style.width = `${finalProgress}%`;
      targetTrack.classList.remove("xp-orb-collecting", "xp-orb-hit");
      xpReadout.classList.remove("xp-orb-ticking");
      xpMetric?.classList.remove("xp-orb-complete");
      window.cancelRewardImpact(targetTrack);
      window.cancelRewardImpact(xpMetric);
      targetTrack.getAnimations?.().forEach(animation => animation.cancel());
      cancelStatus?.();
    };

    const finish = () => {
      if (run !== activeRun) return;
      window.cancelXpOrbCollection = null;
      window.updateXpReadout(finalXp, !options.collection?.paired);
      targetBar.style.width = `${finalProgress}%`;
      targetTrack.classList.remove("xp-orb-collecting", "xp-orb-hit");
      xpReadout.classList.remove("xp-orb-ticking");
      xpMetric?.classList.add("xp-orb-complete");
      status?.classList.add("is-visible");
      window.setTimeout(() => xpMetric?.classList.remove("xp-orb-complete"), 650 / animationSpeed);
      window.setTimeout(() => status?.classList.remove("is-visible"), 1250 / animationSpeed);
      window.setTimeout(() => status?.remove(), 1550 / animationSpeed);
      finishStatus?.(); finishStatus = null;
    };

    // Hold the old values while the correct-answer takeover owns the screen.
    window.updateXpReadout(prepared.startXp, false);
    targetBar.style.width = `${initialProgress}%`;
    const beginCollection = () => {
      if (run !== activeRun) return;
      const liveChartRect = document.getElementById("chart")?.getBoundingClientRect();
      if (liveChartRect?.width > 0 && liveChartRect?.height > 0) {
        prepared.sourceRect = {
          left: liveChartRect.left,
          top: liveChartRect.top,
          width: liveChartRect.width,
          height: liveChartRect.height
        };
      }
      const liveTargetRect = targetTrack.getBoundingClientRect();
      targetPoint = {
        x: liveTargetRect.left + Math.min(liveTargetRect.width - 4, liveTargetRect.width * .72),
        y: liveTargetRect.top + liveTargetRect.height * .5
      };
      status = document.createElement("div");
      status.className = "xp-orb-status";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      status.textContent = `+${gainedXp.toLocaleString()} XP collected`;
      document.body.appendChild(status);

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        finish();
        return;
      }

      const field = document.createElement("div");
      field.className = "xp-orb-field";
      field.setAttribute("aria-hidden", "true");
      document.body.appendChild(field);
      targetTrack.classList.add("xp-orb-collecting");
      xpReadout.classList.add("xp-orb-ticking");

      const orbCount = clamp(Math.round(12 + gainedXp / 12), 14, 18);
      const midpointY = window.innerHeight * .5;
      const fallLineY = window.innerHeight * .7;
      const emissionPattern = [0, 1, 2, 2];
      const emissionSides = Array.from({ length: orbCount }, (_, index) => emissionPattern[index % emissionPattern.length]);
      const emissionCounts = emissionSides.reduce((counts, side) => {
        counts[side] += 1;
        return counts;
      }, [0, 0, 0]);
      const emittedBySide = [0, 0, 0];
      const particles = [];
      const startedAt = options.collection?.startedAt ?? performance.now();
      let arrived = 0;
      let displayedArrivals = 0;
      let hitAnimation = null;
      let measuring = false;
      const collectOrb = orb => {
        if (!measuring) orb.remove();
        arrived += 1;
      };

      for (let index = 0; index < orbCount; index += 1) {
        const orb = document.createElement("span");
        orb.className = "xp-orb";
        const size = 11 + Math.random() * 7;
        orb.style.setProperty("--orb-size", `${size}px`);
        field.appendChild(orb);

        const emissionSide = emissionSides[index];
        const sideIndex = emittedBySide[emissionSide];
        emittedBySide[emissionSide] += 1;
        const edgeProgress = (sideIndex + .5) / emissionCounts[emissionSide];
        const chartBottom = prepared.sourceRect.top + prepared.sourceRect.height;
        const sideSpawnStartY = Math.max(midpointY, prepared.sourceRect.top);
        const sideSpawnEndY = Math.max(sideSpawnStartY, Math.min(chartBottom - 6, fallLineY - 40));
        const sideSpawnY = sideSpawnStartY + (sideSpawnEndY - sideSpawnStartY) * edgeProgress;
        const spawn = emissionSide === 0
          ? { x: prepared.sourceRect.left, y: sideSpawnY }
          : emissionSide === 1
            ? { x: prepared.sourceRect.left + prepared.sourceRect.width, y: sideSpawnY }
            : {
                x: prepared.sourceRect.left + prepared.sourceRect.width * (.08 + edgeProgress * .84),
                y: clamp(chartBottom, midpointY, fallLineY - 40)
              };
        const origin = {
          x: prepared.sourceRect.left + prepared.sourceRect.width * (.4 + edgeProgress * .2),
          y: prepared.sourceRect.top + prepared.sourceRect.height * (.45 + edgeProgress * .1)
        };
        const edgeDistance = 140 + Math.random() * 220;
        const targetY = midpointY + (fallLineY - midpointY) * (.04 + edgeProgress * .92);
        const scatter = emissionSide === 0
          ? { x: Math.max(10, prepared.sourceRect.left - edgeDistance), y: targetY }
          : emissionSide === 1
            ? { x: Math.min(window.innerWidth - 10, prepared.sourceRect.left + prepared.sourceRect.width + edgeDistance), y: targetY }
            : {
                x: prepared.sourceRect.left + prepared.sourceRect.width * (.12 + edgeProgress * .76),
                y: fallLineY
              };
        const scatterDelay = Math.random() * 90;
        const referenceX = emissionSide === 0
          ? Math.max(10, flightReference.chartLeft - edgeDistance)
          : emissionSide === 1
            ? Math.min(flightReference.width - 10, flightReference.chartLeft + flightReference.chartWidth + edgeDistance)
            : flightReference.chartLeft + flightReference.chartWidth * (.12 + edgeProgress * .76);
        const referenceY = flightReference.height * (emissionSide === 2 ? .7 : .5 + .2 * (.04 + edgeProgress * .92));
        const referenceDistance = Math.hypot(referenceX - flightReference.targetX, referenceY - flightReference.targetY);
        const launchDuration = 540 + Math.random() * 180;
        const settleDuration = 170 + Math.random() * 70;
        const attractionStart = launchDuration + settleDuration;
        const bornAt = scatterDelay;
        const launchX = scatter.x - spawn.x;
        const launchY = scatter.y - spawn.y;
        const launchDrag = .94;
        const launchGravity = .26;
        const launchFrames = Math.max(1, Math.round(launchDuration / 16.667));
        let x = spawn.x;
        let y = spawn.y;
        let velocityX = launchVelocityForDistance(launchX, launchFrames, launchDrag);
        let velocityY = launchVelocityForDistance(launchY, launchFrames, launchDrag, launchGravity);
        let previousFrame = 0;
        let scale = .35;
        let opacity = 0;
        let originBlend = 1;
        let collected = false;
        let attractionScale = 1;

        const animateOrb = now => {
          if (collected) return;
          const age = now - bornAt;
          if (age < 0) return;

          originBlend = Math.pow(1 - clamp(age / launchDuration, 0, 1), 3);
          if (!previousFrame) previousFrame = now;
          const delta = Math.min(32, now - previousFrame) / 16.667;
          const startsAttraction = previousFrame <= bornAt + attractionStart && now > bornAt + attractionStart;
          previousFrame = now;

          if (age <= launchDuration) {
            const drag = Math.pow(launchDrag, delta);
            velocityX *= drag;
            velocityY = velocityY * drag + launchGravity * delta;
            x += velocityX * delta;
            y += velocityY * delta;
            if (y < midpointY) {
              y = midpointY;
              velocityY = Math.max(0, velocityY);
            }
            if (y > fallLineY) {
              y = fallLineY;
              velocityY = 0;
            }
            const arrival = Math.min(1, age / 150);
            scale = .35 + arrival * .72;
            opacity = Math.min(1, age / 70);
          } else if (age <= launchDuration + settleDuration) {
            const settleProgress = (age - launchDuration) / settleDuration;
            const settleDrag = Math.pow(.68, delta);
            const remainingFall = Math.max(0, fallLineY - y);
            const settleGravity = Math.min(.34, .1 + remainingFall * .0012);
            velocityX *= settleDrag;
            velocityY = velocityY * settleDrag + settleGravity * Math.pow(1 - settleProgress, 2) * delta;
            x += velocityX * delta;
            y += velocityY * delta;
            if (y < midpointY) {
              y = midpointY;
              velocityY = Math.max(0, velocityY);
            }
            if (y > fallLineY) {
              y = fallLineY;
              velocityY = 0;
            }
            scale = 1.07;
            opacity = .94;
          } else {
            if (startsAttraction) {
              velocityX = 0;
              velocityY = 0;
              // Normalize once at departure. Layout changes alter the path's
              // length, never the acceleration, arrival time or fade timeline.
              attractionScale = Math.max(.001, Math.hypot(targetPoint.x - x, targetPoint.y - y) / referenceDistance);
            }
            const attractionAge = age - attractionStart;
            const targetX = targetPoint.x - x;
            const targetY = targetPoint.y - y;
            const distance = Math.max(.001, Math.sqrt(targetX * targetX + targetY * targetY));
            const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
            if (distance <= Math.max(12 * attractionScale, speed * delta * 1.4)) {
              collected = true;
              collectOrb(orb);
              return;
            }

            const desiredSpeed = Math.min(28, 3 + attractionAge * .03) * attractionScale;
            const desiredVelocityX = targetX / distance * desiredSpeed;
            const desiredVelocityY = targetY / distance * desiredSpeed;
            const steering = 1 - Math.pow(.9, delta);
            velocityX += (desiredVelocityX - velocityX) * steering;
            velocityY += (desiredVelocityY - velocityY) * steering;
            x += velocityX * delta;
            y += velocityY * delta;
            const referenceRemaining = distance / attractionScale;
            const proximity = 1 - Math.min(1, referenceRemaining / 680);
            scale = 1.07 - proximity * .72;
            opacity = referenceRemaining < 60 ? clamp(referenceRemaining / 60, 0, .94) : .94;
          }
        };
        particles.push({
          update: animateOrb,
          reset() {
            x = spawn.x; y = spawn.y;
            velocityX = launchVelocityForDistance(launchX, launchFrames, launchDrag);
            velocityY = launchVelocityForDistance(launchY, launchFrames, launchDrag, launchGravity);
            previousFrame = 0; scale = .35; opacity = 0; originBlend = 1;
            collected = false; attractionScale = 1;
          },
          render() {
            if (collected) return;
            orb.style.opacity = opacity;
            // Change only the visible origin; rejoin the existing spread before collection.
            const renderedX = x + (origin.x - spawn.x) * originBlend;
            const renderedY = y + (origin.y - spawn.y) * originBlend;
            orb.style.transform = `translate3d(${renderedX - size / 2}px, ${renderedY - size / 2}px, 0) scale(${scale})`;
          }
        });
      }

      if (options.collection?.paired) {
        // Measure this exact flight without painting, then replay unchanged.
        // Coins can use its actual duration instead of guessing an orb deadline.
        measuring = true;
        let duration = 0;
        while (arrived < orbCount && duration < 12000) {
          duration += physicsStep;
          particles.forEach(particle => particle.update(duration));
        }
        if (arrived === orbCount) options.collection.setDuration(duration / animationSpeed);
        particles.forEach(particle => particle.reset());
        arrived = 0; measuring = false;
      }

      let simulationTime = 0;
      const animateCollection = now => {
        if (run !== activeRun) return;
        // Advance physics in small, consistent steps, even after a missed display frame.
        const elapsed = (now - startedAt) * animationSpeed;
        while (simulationTime + physicsStep <= elapsed && arrived < orbCount) {
          simulationTime += physicsStep;
          particles.forEach(particle => particle.update(simulationTime));
        }
        particles.forEach(particle => particle.render());
        if (arrived !== displayedArrivals) {
          displayedArrivals = arrived;
          const completion = arrived / orbCount;
          window.updateXpReadout(Math.round(prepared.startXp + gainedXp * completion));
          targetBar.style.width = `${initialProgress + (finalProgress - initialProgress) * completion}%`;
          window.playRewardImpact(targetTrack);
          window.playRewardImpact(xpMetric);
          // Restart the existing impact effect without a synchronous layout read.
          hitAnimation?.cancel();
          hitAnimation = targetTrack.animate([
            {},
            { filter: "brightness(1.45)", boxShadow: "0 0 0 3px rgba(112, 72, 232, .2), 0 0 18px rgba(35, 141, 228, .75)", offset: .5 },
            {}
          ], { duration: 180 / animationSpeed, easing: "ease-out" });
        }
        if (arrived === orbCount) {
          field.remove();
          finish();
        } else {
          requestAnimationFrame(animateCollection);
        }
      };
      requestAnimationFrame(animateCollection);
    };

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.setTimeout(() => {
        if (run !== activeRun) return;
        document.getElementById("chart")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, Math.max(0, startDelay - 380));
    }
    if (options.collection) {
      cancelStatus = options.collection.add("xp", done => { finishStatus = done; beginCollection(); });
      return;
    }
    window.setTimeout(() => {
      if (run !== activeRun) return;
      if (window.rewardStatus) cancelStatus = window.rewardStatus.collect("xp", done => { finishStatus = done; beginCollection(); });
      else beginCollection();
    }, startDelay);
  };
}());
