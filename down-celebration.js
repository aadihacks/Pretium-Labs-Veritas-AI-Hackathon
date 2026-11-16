function playCorrectDownCelebration() {
  window.cancelCorrectMarketCelebration?.();
  if (window.__pretiumDownAnimationFrame) {
    window.cancelAnimationFrame(window.__pretiumDownAnimationFrame);
    window.__pretiumDownAnimationFrame = null;
  }
  document.querySelector(".correct-up-celebration")?.remove();
  document.querySelector(".correct-down-celebration")?.remove();
  document.querySelector(".correct-down-flash")?.remove();

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const runNumber = (window.__pretiumDownAnimationRun || 0) + 1;
  window.__pretiumDownAnimationRun = runNumber;

  const randomSeed = typeof crypto !== "undefined" && crypto.getRandomValues
    ? crypto.getRandomValues(new Uint32Array(1))[0]
    : Date.now();
  let seed = (randomSeed ^ Math.imul(runNumber, 0x9e3779b9)) >>> 0;
  const random = () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };

  const pointCount = 13 + Math.floor(random() * 4);
  const lastSetupIndex = pointCount - 4;
  const reboundIndexes = new Set([
    2 + Math.floor(random() * 3),
    6 + Math.floor(random() * 3)
  ]);
  const points = [[-30, 105 + random() * 80]];
  let previousMoveWasUp = false;

  for (let index = 1; index < pointCount; index += 1) {
    const x = -30 + index * (1060 / (pointCount - 1));
    const previousY = points[index - 1][1];
    const finalDrop = index > lastSetupIndex;
    const rebound = !finalDrop
      && !previousMoveWasUp
      && (reboundIndexes.has(index) || random() < .2);
    let nextY;

    if (finalDrop) {
      nextY = previousY + 72 + random() * 48;
    } else if (rebound) {
      nextY = previousY - (26 + random() * 54);
    } else {
      nextY = previousY + 34 + random() * 58;
    }

    nextY = Math.max(70, Math.min(finalDrop ? 680 : 430, nextY));
    if (Math.abs(nextY - previousY) < 1) {
      nextY = Math.max(70, previousY - (24 + random() * 42));
    }
    points.push([x, nextY]);
    previousMoveWasUp = nextY < previousY;
  }

  const svgNamespace = "http://www.w3.org/2000/svg";
  const overlay = document.createElement("div");
  overlay.className = "correct-down-flash";
  overlay.setAttribute("role", "status");
  overlay.setAttribute("aria-live", "assertive");
  overlay.setAttribute("aria-label", "Correct down prediction. A falling market line flashes across the screen.");

  const marketSvg = document.createElementNS(svgNamespace, "svg");
  marketSvg.classList.add("correct-down-flash-market");
  marketSvg.setAttribute("viewBox", "0 0 1000 600");
  marketSvg.setAttribute("preserveAspectRatio", "none");
  marketSvg.setAttribute("aria-hidden", "true");

  const gradientId = `correct-down-flash-gradient-${runNumber}`;
  const clipId = `correct-down-flash-clip-${runNumber}`;
  const definitions = document.createElementNS(svgNamespace, "defs");
  const traceGradient = document.createElementNS(svgNamespace, "linearGradient");
  traceGradient.setAttribute("id", gradientId);
  traceGradient.setAttribute("gradientUnits", "userSpaceOnUse");
  traceGradient.setAttribute("x1", points[0][0]);
  traceGradient.setAttribute("x2", points[points.length - 1][0]);
  traceGradient.setAttribute("y1", "0");
  traceGradient.setAttribute("y2", "0");

  const firstX = points[0][0];
  const traceWidth = points[points.length - 1][0] - firstX;
  points.slice(0, -1).forEach((point, index) => {
    const nextPoint = points[index + 1];
    const color = nextPoint[1] < point[1] ? "#21df7d" : "#ff3657";
    const startStop = document.createElementNS(svgNamespace, "stop");
    const endStop = document.createElementNS(svgNamespace, "stop");
    startStop.setAttribute("offset", `${(point[0] - firstX) / traceWidth * 100}%`);
    endStop.setAttribute("offset", `${(nextPoint[0] - firstX) / traceWidth * 100}%`);
    startStop.setAttribute("stop-color", color);
    endStop.setAttribute("stop-color", color);
    traceGradient.append(startStop, endStop);
  });
  const revealClip = document.createElementNS(svgNamespace, "clipPath");
  revealClip.setAttribute("id", clipId);
  const revealRect = document.createElementNS(svgNamespace, "rect");
  revealRect.setAttribute("x", "-40");
  revealRect.setAttribute("y", "0");
  revealRect.setAttribute("width", "0");
  revealRect.setAttribute("height", "600");
  revealClip.appendChild(revealRect);
  definitions.append(traceGradient, revealClip);

  const pathData = points
    .map((point, index) => `${index ? "L" : "M"} ${point[0].toFixed(2)} ${point[1].toFixed(2)}`)
    .join(" ");
  const trace = document.createElementNS(svgNamespace, "path");
  trace.classList.add("correct-down-flash-trace");
  trace.setAttribute("d", pathData);
  trace.setAttribute("stroke", `url(#${gradientId})`);

  const revealGroup = document.createElementNS(svgNamespace, "g");
  revealGroup.setAttribute("clip-path", `url(#${clipId})`);
  revealGroup.appendChild(trace);

  const leadingFlash = document.createElementNS(svgNamespace, "circle");
  leadingFlash.classList.add("correct-down-flash-head");
  leadingFlash.setAttribute("r", "9");

  marketSvg.append(definitions, revealGroup, leadingFlash);
  overlay.appendChild(marketSvg);
  document.body.appendChild(overlay);

  if (reduceMotion) {
    revealRect.setAttribute("width", "1080");
    leadingFlash.style.opacity = "0";
  } else {
    const revealDuration = 760;
    const revealStart = performance.now();
    const animateReveal = now => {
      const linearProgress = Math.max(0, Math.min(1, (now - revealStart) / revealDuration));
      const revealProgress = linearProgress;
      const scaledPointIndex = revealProgress * (points.length - 1);
      const pointIndex = Math.min(points.length - 2, Math.floor(scaledPointIndex));
      const pointProgress = scaledPointIndex - pointIndex;
      const point = {
        x: points[pointIndex][0] + (points[pointIndex + 1][0] - points[pointIndex][0]) * pointProgress,
        y: points[pointIndex][1] + (points[pointIndex + 1][1] - points[pointIndex][1]) * pointProgress
      };
      revealRect.setAttribute("width", `${1080 * revealProgress}`);
      leadingFlash.setAttribute("cx", point.x);
      leadingFlash.setAttribute("cy", point.y);
      leadingFlash.style.opacity = linearProgress < .94
        ? "1"
        : `${Math.max(0, (1 - linearProgress) / .06)}`;
      if (linearProgress < 1) {
        window.__pretiumDownAnimationFrame = window.requestAnimationFrame(animateReveal);
      } else {
        window.__pretiumDownAnimationFrame = null;
      }
    };
    window.__pretiumDownAnimationFrame = window.requestAnimationFrame(animateReveal);
  }

  const completionDelay = reduceMotion ? 850 : 1480;
  window.setTimeout(() => overlay.classList.add("is-leaving"), reduceMotion ? 600 : 1120);
  window.setTimeout(() => overlay.remove(), completionDelay);
  return completionDelay;
}
