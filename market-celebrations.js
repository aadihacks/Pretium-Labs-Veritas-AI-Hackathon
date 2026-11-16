/* Approved market celebrations. Styles remain inside each overlay's shadow root. */
(() => {
  'use strict';
  const volatilitySpeed = 4.6296296295 * 0.8;
  const volatilityHold = 50 / 0.8;
  const volatilityFade = 340 / 0.8;
  const animationDuration = 1450 / volatilitySpeed + volatilityHold + volatilityFade;
  // Remove only the old spin interval; keep every remaining phase at its original speed.
  const reversalDuration = 2300 * (1 - (.62894249 - .19480519));
  const labels = {volatility:'Volatility spike', reversal:'Reversal', sideways:'Sideways', breakout:'Breakout', up:'Up'};
  const keys = Object.fromEntries(Object.entries(labels).map(([key,label]) => [label,key]));
  let cancelActive = null;
  let previousBreakoutContour = null;
  const templates = {
    volatility: `<style>:host{display:block;position:relative;height:100%;overflow:hidden;background:#030812;font-family:Inter,system-ui,sans-serif;} .still{position:absolute;inset:0;pointer-events:none;opacity:.30;} .still svg{width:100%;height:100%;display:block;} 
    :host {
      --navy: #030812;
      --neon-green: #21df7d;
      --neon-red: #ff3657;
      --glow-green: rgba(33, 223, 125, .78);
      --glow-red: rgba(255, 54, 87, .82);
      --trace-width: 7px;
    }
    :host {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--navy);
      overflow: hidden;
    }
    .workspace-mockup {
      display: grid;
      grid-template-columns: 280px 1fr 380px;
      height: 100%;
      filter: blur(2px) grayscale(.5);
      opacity: .4;
    }
    .celebration-overlay {
      position: absolute;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      isolation: isolate;
      background:
        radial-gradient(circle at 28% 38%, rgba(33, 223, 125, .12), transparent 25%),
        radial-gradient(circle at 58% 68%, rgba(255, 54, 87, .18), transparent 28%),
        linear-gradient(155deg, #030812 0%, #091426 50%, #18060d 100%);
      pointer-events: none;
      animation: overlay-fade-in 90ms ease-out both;
    }
    .celebration-grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(142, 166, 200, .09) 1px, transparent 1px),
        linear-gradient(90deg, rgba(142, 166, 200, .09) 1px, transparent 1px);
      background-size: clamp(46px, 7vw, 96px) clamp(42px, 9vh, 78px);
      opacity: .22;
    }
    .trace-svg {
      position: absolute;
      inset: -2%;
      width: 104%;
      height: 104%;
      overflow: visible;
    }
    .trace-segment {
      fill: none;
      stroke-width: var(--trace-width);
      stroke-linecap: round;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
      shape-rendering: geometricPrecision;
    }
    .trace-segment.is-up {
      stroke: var(--neon-green);
      filter: drop-shadow(0 0 7px rgba(33, 223, 125, .48));
    }
    .trace-segment.is-down {
      stroke: var(--neon-red);
      filter: drop-shadow(0 0 8px rgba(255, 54, 87, .54));
    }
    .shine-trail {
      fill: none;
      stroke-width: 13;
      stroke-linecap: round;
      vector-effect: non-scaling-stroke;
      opacity: 0;
    }
    .shine-trail.is-up {
      stroke: var(--neon-green);
      filter: drop-shadow(0 0 7px #fff) drop-shadow(0 0 18px var(--glow-green));
    }
    .shine-trail.is-down {
      stroke: var(--neon-red);
      filter: drop-shadow(0 0 7px #fff) drop-shadow(0 0 20px var(--glow-red));
    }
    .shine-head {
      opacity: 0;
      stroke: #fff;
      stroke-width: 3;
      vector-effect: non-scaling-stroke;
    }
    .shine-head.is-up {
      fill: var(--neon-green);
      filter: drop-shadow(0 0 6px #fff) drop-shadow(0 0 20px var(--glow-green));
    }
    .shine-head.is-down {
      fill: var(--neon-red);
      filter: drop-shadow(0 0 6px #fff) drop-shadow(0 0 22px var(--glow-red));
    }
    .replay-btn {
      position: absolute;
      left: 50%;
      bottom: 24px;
      z-index: 10000;
      transform: translateX(-50%);
      padding: 8px 16px;
      border: 1px solid rgba(255, 255, 255, .2);
      border-radius: 8px;
      background: rgba(3, 8, 18, .72);
      color: #fff;
      font-size: 12px;
      cursor: pointer;
      pointer-events: auto;
      transition: background .2s ease, border-color .2s ease;
    }
    .replay-btn:hover,
    .replay-btn:focus-visible {
      border-color: rgba(255, 255, 255, .45);
      background: rgba(9, 20, 38, .92);
    }
    @keyframes overlay-fade-in {
      from { opacity: 0; transform: scale(1.018); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes overlay-fade-out {
      from { opacity: 1; filter: saturate(1.08); }
      to { opacity: 0; filter: saturate(.65) brightness(.55); }
    }
    .celebration-overlay.is-leaving {
      animation: overlay-fade-out var(--volatility-fade) cubic-bezier(.7, 0, .84, 0) forwards;
    }
    @media (max-width: 600px) {
      .trace-svg { inset: -3% -10%; width: 120%; height: 106%; }
    }
    @media (prefers-reduced-motion: reduce) {
      .celebration-overlay { animation: none; }
      .shine-trail,
      .shine-head { display: none; }
      .celebration-overlay.is-leaving { animation: overlay-fade-out 240ms ease forwards; }
    }
  .trace-svg{inset:-2%;width:104%;height:104%;} .celebration-overlay{animation:none;} .celebration-overlay.is-leaving{animation:overlay-fade-out var(--volatility-fade) cubic-bezier(.7,0,.84,0) forwards;} .still .trace-segment{stroke-width:7px;}</style><div class="still"></div>    <div id="celebration" class="celebration-overlay" role="status" aria-live="assertive" aria-label="Correct volatility spike prediction. A market line surges, holds high, then crashes below its starting range." data-sd-id="13">
      <div class="celebration-grid" data-sd-id="14"></div>
      <svg class="trace-svg" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true" data-sd-id="15">
        <defs>
          <clipPath id="trace-reveal-clip" clipPathUnits="userSpaceOnUse">
            <rect id="trace-reveal-rect" x="-50" y="-20" width="0" height="640"></rect>
          </clipPath>
        </defs>
        <g id="trace-segments" clip-path="url(#trace-reveal-clip)"></g>
        <line id="surge-trail" class="shine-trail is-up"></line>
        <circle id="surge-head" class="shine-head is-up" r="8"></circle>
        <line id="crash-trail" class="shine-trail is-down"></line>
        <circle id="crash-head" class="shine-head is-down" r="8"></circle>
      </svg>
    </div>

`,
    reversal: `<style>:host{display:block;position:relative;height:100%;overflow:hidden;background:#030812;font-family:Inter,system-ui,sans-serif;} .still{position:absolute;inset:0;pointer-events:none;opacity:.30;} .still svg{width:100%;height:100%;display:block;} 
    :host {
      --night: #030812;
      --night-mid: #091426;
      --night-red: #18060d;
      --ink: #f8f3e8;
      --muted: #b9c0cc;
      --line: #2c3850;
      --panel: #0b172d;
      --green: #21df7d;
      --red: #ff3657;
      --gold: #e2bd68;
    }

    * { box-sizing: border-box; }
    :host { background: var(--night); }
    :host { margin: 0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: var(--night); color: var(--ink); }

    .market-grid {
      background-image:
        linear-gradient(rgba(142, 166, 200, .11) 1px, transparent 1px),
        linear-gradient(90deg, rgba(142, 166, 200, .11) 1px, transparent 1px);
      background-size: clamp(46px, 7vw, 96px) clamp(42px, 9vh, 78px);
    }

    .celebration {
      --line-width: min(100%, 180vh);
      --line-width: min(100%, 180dvh);
      position: absolute;
      z-index: 12010;
      inset: 0;
      width: 100%;
      height: 100%;
      height: 100%;
      overflow: hidden;
      isolation: isolate;
      pointer-events: none;
      opacity: 0;
      background:
        radial-gradient(circle at 18% 24%, rgba(33, 223, 125, .13), transparent 26%),
        radial-gradient(circle at 80% 70%, rgba(255, 54, 87, .18), transparent 30%),
        linear-gradient(155deg, var(--night) 0%, var(--night-mid) 48%, var(--night-red) 100%);
    }

    .celebration::before {
      content: "";
      position: absolute;
      inset: 0;
      opacity: .22;
      background-image:
        linear-gradient(rgba(142, 166, 200, .13) 1px, transparent 1px),
        linear-gradient(90deg, rgba(142, 166, 200, .13) 1px, transparent 1px);
      background-size: clamp(46px, 7vw, 96px) clamp(42px, 9vh, 78px);
    }

    .line-anchor {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
    }

    .line-stage {
      width: var(--line-width);
      aspect-ratio: 1200 / 620;
      transform-origin: center;
    }

    .line-spin {
      width: 100%;
      height: 100%;
    }

    .line-stage svg { display: block; width: 100%; height: 100%; overflow: visible; }

    .market-trace {
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 7px;
      stroke: var(--green);
    }

    .leading-flash {
      fill: #fff;
      stroke: var(--green);
      stroke-width: 4;
      opacity: 0;
      filter: drop-shadow(0 0 5px rgba(255,255,255,.98)) drop-shadow(0 0 18px rgba(33,223,125,.92));
    }

    .status-pill {
      position: absolute;
      z-index: 3;
      left: 50%;
      bottom: calc(5.5rem + env(safe-area-inset-bottom, 0px));
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 9px 13px;
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 999px;
      opacity: 0;
      color: rgba(248,243,232,.84);
      background: rgba(3,8,18,.58);
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .14em;
      text-transform: uppercase;
      transform: translate(-50%, 8px);
      backdrop-filter: blur(8px);
    }

    .status-pill span { width: 7px; height: 7px; border-radius: 999px; background: var(--red); box-shadow: 0 0 12px rgba(255,54,87,.9); }

    #replayReversal { bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px)); min-height: 44px; }
    #reversalChoice:focus-visible { outline: 3px solid var(--green); outline-offset: 2px; }

    .celebration.is-playing { animation: overlay-sequence var(--motion-duration) both; }
    .celebration.is-playing .line-stage { animation: seesaw-drop var(--motion-duration) cubic-bezier(.22,.8,.25,1) both; will-change: transform; }
    .celebration.is-playing .market-trace { animation: trace-sequence var(--motion-duration) linear both; }
    .celebration.is-playing .leading-flash { animation: head-visibility var(--motion-duration) linear both; }
    .celebration.is-playing .status-pill { animation: status-sequence var(--motion-duration) cubic-bezier(.16,1,.3,1) both; }

    @keyframes overlay-sequence {
      0.000000% { opacity: 0; transform: scale(1.018); filter: brightness(1); }
      7.049180% { opacity: 1; transform: scale(1); }
      90.163934% { opacity: 1; filter: brightness(1); }
      100.000000% { opacity: 0; filter: brightness(.5) saturate(.35); }
    }

    @keyframes trace-sequence {
      0.000000%, 6.557377% { stroke-dasharray: var(--trace-length); stroke-dashoffset: var(--trace-length); stroke: var(--green); filter: drop-shadow(0 0 7px rgba(33,223,125,.56)) drop-shadow(0 0 17px rgba(33,223,125,.34)); }
      32.786886% { stroke-dasharray: var(--trace-length); stroke-dashoffset: 0; stroke: var(--green); filter: drop-shadow(0 0 9px rgba(33,223,125,.56)); }
      34.426229% { stroke-dasharray: none; stroke-dashoffset: 0; stroke: var(--green); filter: drop-shadow(0 0 9px rgba(33,223,125,.56)); }
      38.147540% { stroke-dashoffset: 0; stroke: var(--red); filter: drop-shadow(0 0 9px rgba(255,54,87,.72)) drop-shadow(0 0 22px rgba(255,54,87,.48)); }
      61.098360% { stroke-dashoffset: 0; stroke: var(--red); filter: drop-shadow(0 0 15px rgba(255,54,87,.92)) drop-shadow(0 0 34px rgba(255,54,87,.62)); }
      100.000000% { stroke-dashoffset: 0; stroke: var(--red); filter: drop-shadow(0 0 7px rgba(255,54,87,.45)); }
    }

    @keyframes seesaw-drop {
      0.000000%, 38.147540% { transform: skewY(0deg); }
      61.098360% { transform: skewY(42deg); }
      69.295082% { transform: skewY(38deg); }
      75.852460%, 100.000000% { transform: skewY(39.3deg); }
    }

    @keyframes head-visibility {
      0.000000%, 6.393443% { opacity: 0; }
      6.557377%, 32.786886% { opacity: 1; }
      34.426229%, 100.000000% { opacity: 0; }
    }

    @keyframes status-sequence {
      0.000000%, 57.819673% { opacity: 0; transform: translate(-50%, 8px); }
      67.655739% { opacity: 1; transform: translate(-50%, 0); }
      90.163934% { opacity: 1; transform: translate(-50%, 0); }
      100.000000% { opacity: 0; transform: translate(-50%, -4px); }
    }

    @media (max-width: 900px) {
      .market-trace { stroke-width: 8px; }
      #previewRoot { height: auto; min-height: 100%; min-height: 100%; overflow: visible; }
      #previewHeader { height: auto; min-height: 4rem; flex-wrap: wrap; gap: .75rem; }
      #previewMain { grid-template-columns: minmax(0, 1fr); height: auto; min-height: 0; padding-bottom: 1rem; }
      #previewChart { min-height: clamp(220px, 45vh, 460px); }
      #replayReversal { position: relative; left: auto; bottom: auto; width: max-content; margin: 0 auto 1.5rem; transform: none; }
    }

    @media (max-width: 480px) {
      .market-trace { stroke-width: 11px; }
      #previewHeader { padding: .75rem; }
      #previewMain { padding: .75rem; gap: .75rem; }
    }

    @media (prefers-reduced-motion: reduce) {
      .celebration.is-playing { animation: reduced-overlay var(--motion-duration) ease both; }
      .celebration.is-playing .line-stage { animation: reduced-drop var(--motion-duration) ease both; }
      .celebration.is-playing .market-trace { animation: reduced-trace var(--motion-duration) ease both; }
      .celebration.is-playing .leading-flash { animation: none; opacity: 0; }
      .celebration.is-playing .status-pill { animation: reduced-status var(--motion-duration) ease both; }
      @keyframes reduced-overlay { 0% { opacity: 0; } 12%, 84% { opacity: 1; } 100% { opacity: 0; } }
      @keyframes reduced-drop { 0%, 58% { transform: skewY(0deg); } 76%, 100% { transform: skewY(39.3deg); } }
      @keyframes reduced-trace { 0%, 46% { stroke-dasharray: none; stroke-dashoffset: 0; stroke: var(--green); } 54%, 100% { stroke-dasharray: none; stroke-dashoffset: 0; stroke: var(--red); } }
      @keyframes reduced-status { 0%, 70% { opacity: 0; } 78%, 88% { opacity: 1; transform: translate(-50%, 0); } 100% { opacity: 0; } }
    }
  .celebration{--line-width:100%;height:100%;} .market-trace{stroke-width:7px;} .status-pill{bottom:12px;font-size:10px;} .line-stage{width:100%;}</style><div class="still"><svg viewBox="0 0 1200 620"><path d="M-40 570 L55 535 L125 550 L205 480 L280 492 L360 410 L435 425 L515 350 L590 362 L675 275 L750 290 L840 205 L920 220 L1010 135 L1100 150 L1240 45" fill="none" stroke="#21df7d" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"></path></svg></div>    <div id="reversalCelebration" class="celebration market-grid" role="status" aria-live="assertive" aria-label="Correct reversal prediction. Market line rises, turns red, then tips downward.">
      <div class="line-anchor" aria-hidden="true">
        <div class="line-stage">
          <div class="line-spin">
            <svg viewBox="0 0 1200 620" preserveAspectRatio="xMidYMid meet">
              <path id="reversalPath" class="market-trace" d="M-40 570 L55 535 L125 550 L205 480 L280 492 L360 410 L435 425 L515 350 L590 362 L675 275 L750 290 L840 205 L920 220 L1010 135 L1100 150 L1240 45"></path>
              <circle id="reversalHead" class="leading-flash" r="9"></circle>
            </svg>
          </div>
        </div>
      </div>
      <div class="status-pill" aria-hidden="true"><span></span>Reversal confirmed</div>
    </div>

`,
    sideways: `<style>:host{display:block;position:relative;height:100%;overflow:hidden;background:#030812;font-family:Inter,system-ui,sans-serif;} .still{position:absolute;inset:0;pointer-events:none;opacity:.30;} .still svg{width:100%;height:100%;display:block;} .correct-sideways-flash {
  position: absolute;
  z-index: 12020;
  inset: 0;
  width: 100%;
  height: 100%;
  height: 100%;
  overflow: hidden;
  isolation: isolate;
  background:
    radial-gradient(circle at 18% 24%, rgba(33, 223, 125, .15), transparent 26%),
    radial-gradient(circle at 82% 74%, rgba(255, 54, 87, .2), transparent 28%),
    linear-gradient(155deg, #030812 0%, #091426 50%, #18060d 100%);
  pointer-events: none;
  animation: correct-sideways-flash-arrive 90ms ease-out both;
}

.correct-sideways-flash::before {
  content: "";
  position: absolute;
  z-index: -1;
  inset: 0;
  opacity: .22;
  background-image:
    linear-gradient(rgba(142, 166, 200, .13) 1px, transparent 1px),
    linear-gradient(90deg, rgba(142, 166, 200, .13) 1px, transparent 1px);
  background-size: clamp(46px, 7vw, 96px) clamp(42px, 9vh, 78px);
}

.correct-sideways-flash.is-leaving {
  animation: correct-sideways-flash-leave var(--sideways-fade) cubic-bezier(.7, 0, .84, 0) forwards;
}

.correct-sideways-flash-market {
  position: absolute;
  z-index: 1;
  inset: -2%;
  width: 104%;
  height: 104%;
  overflow: visible;
}

.correct-sideways-flash-trace {
  fill: none;
  stroke-width: 7;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
  shape-rendering: geometricPrecision;
  filter:
    drop-shadow(0 0 7px rgba(33, 223, 125, .42))
    drop-shadow(0 0 9px rgba(255, 54, 87, .5));
}

.correct-sideways-flash-head {
  fill: #fff;
  stroke: #dce8f7;
  stroke-width: 4;
  opacity: 0;
  vector-effect: non-scaling-stroke;
  filter:
    drop-shadow(0 0 5px rgba(255, 255, 255, .98))
    drop-shadow(0 0 18px rgba(131, 204, 255, .82));
  will-change: opacity;
}

.correct-sideways-guide-group {
  opacity: 0;
  transition: opacity 80ms ease-out;
}

.correct-sideways-guide {
  fill: none;
  stroke: rgba(244, 248, 255, .82);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-dasharray: 7 10;
  vector-effect: non-scaling-stroke;
  filter: drop-shadow(0 0 5px rgba(196, 223, 255, .5));
}

.correct-sideways-guide-arrow {
  fill: #f4f8ff;
  stroke: rgba(8, 21, 43, .72);
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
  filter:
    drop-shadow(0 0 5px rgba(255, 255, 255, .98))
    drop-shadow(0 0 13px rgba(131, 204, 255, .72));
}

@keyframes correct-sideways-flash-arrive {
  from { opacity: 0; transform: scale(1.018); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes correct-sideways-flash-leave {
  from { opacity: 1; filter: saturate(1.08); }
  to { opacity: 0; filter: saturate(.65) brightness(.55); }
}

@media (max-width: 600px) {
  .correct-sideways-flash-market {
    inset: -3% -10%;
    width: 120%;
    height: 106%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .correct-sideways-flash,
  .correct-sideways-guide-group {
    animation: none;
    transition: none;
  }

  .correct-sideways-flash-head {
    opacity: 0 !important;
  }

  .correct-sideways-flash.is-leaving {
    animation: correct-sideways-flash-leave var(--sideways-fade) ease forwards;
  }
}

.correct-sideways-flash-market{inset:-2%;width:104%;height:104%;} .still .correct-sideways-guide-group{opacity:1;}</style><div class="still"></div>`,
    breakout: `
<style>
  :host{display:block;position:relative;height:100%;overflow:hidden;background:#030812;font-family:Inter,system-ui,sans-serif;--rise:#21df7d;--fall:#ff3657;}
  .scene{position:absolute;inset:0;background:radial-gradient(ellipse at 75% 35%,rgba(33,223,125,.07),transparent 65%);}
  svg{display:block;width:100%;height:100%;overflow:hidden;}
  .range{fill:rgba(33,223,125,.045);}
  .floor{stroke:#8092a6;stroke-opacity:.16;stroke-width:2;}
  .barrier{fill:rgba(184,220,232,.32);stroke:rgba(219,247,255,.78);stroke-width:1.5;stroke-linejoin:miter;}
  .cracks{fill:none;stroke:#ebfcff;stroke-width:2;stroke-linecap:round;opacity:0;}
  .trace{fill:none;stroke-width:7;stroke-linejoin:round;stroke-linecap:round;filter:drop-shadow(0 0 7px rgba(33,223,125,.38));}
  .trace.up{stroke:var(--rise);}.trace.down{stroke:var(--fall);}
  .head{fill:#eafff4;filter:drop-shadow(0 0 9px #21df7d);opacity:0;}
  .shock{fill:none;stroke:var(--rise);stroke-width:3;opacity:0;}
  .particles polygon{fill:rgba(197,242,255,.6);stroke:rgba(239,253,255,.9);stroke-width:1.2;stroke-linejoin:miter;}
</style>
<div class="scene">
  <svg viewBox="0 0 1000 625" preserveAspectRatio="none" role="img" aria-label="Price compresses below a glass barrier, breaks through with scattering shards and jagged edges, retests the level, and continues higher.">
    <rect class="range" x="40" y="250" width="690" height="180" rx="3"/>
    <path class="floor" d="M40 430H950"/>
    <g class="barrier">
      <path class="intact" d="M40 244H950V256H40Z"/>
      <g class="broken" opacity="0">
        <path d="M40 244H696L718 247L706 251L722 255L698 256H40Z"/>
        <path d="M764 244H950V256H760L749 252L762 249L744 245Z"/>
      </g>
    </g>
    <path class="cracks" d="M730 244L723 248L735 252L726 256M723 248L708 244M735 252L754 256"/>
    <g class="traces"></g>
    <circle class="shock" cx="730" cy="250" r="0"/>
    <g class="particles" opacity="0"></g>
    <circle class="head" r="6"/>
  </svg>
</div>
`,
    up: `
  <style>
    :host{display:block;position:relative;height:100%;overflow:hidden;background:#030812;font-family:Inter,system-ui,sans-serif;}
    .still{position:absolute;inset:0;pointer-events:none;opacity:.30;}
    .still svg{width:100%;height:100%;display:block;}
    .correct-up-flash {
  position: absolute;
  z-index: 12010;
  inset: 0;
  width: 100%;
  height: 100%;
  height: 100%;
  overflow: hidden;
  isolation: isolate;
  background:
    radial-gradient(circle at 78% 32%, rgba(33, 223, 125, .25), transparent 27%),
    radial-gradient(circle at 18% 22%, rgba(27, 223, 125, .1), transparent 23%),
    linear-gradient(155deg, #030812 0%, #091426 48%, #18060d 100%);
  pointer-events: none;
  animation: correct-up-flash-arrive 90ms ease-out both;
}

.correct-up-flash::before {
  content: "";
  position: absolute;
  z-index: -1;
  inset: 0;
  opacity: .22;
  background-image:
    linear-gradient(rgba(142, 166, 200, .13) 1px, transparent 1px),
    linear-gradient(90deg, rgba(142, 166, 200, .13) 1px, transparent 1px);
  background-size: clamp(46px, 7vw, 96px) clamp(42px, 9vh, 78px);
}

.correct-up-flash.is-leaving {
  animation: correct-up-flash-leave var(--up-fade) cubic-bezier(.7, 0, .84, 0) forwards;
}

.correct-up-flash-market {
  position: absolute;
  z-index: 1;
  inset: -2%;
  width: 104%;
  height: 104%;
  overflow: visible;
}

.correct-up-flash-trace {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
  shape-rendering: geometricPrecision;
  will-change: opacity;
}

.correct-up-flash-trace {
  opacity: 1;
  stroke-width: 7;
  filter:
    drop-shadow(0 0 7px rgba(33, 223, 125, .42))
    drop-shadow(0 0 9px rgba(255, 54, 87, .5));
}

.correct-up-flash-head {
  fill: #fff;
  stroke: #21df7d;
  stroke-width: 4;
  opacity: 0;
  vector-effect: non-scaling-stroke;
  filter:
    drop-shadow(0 0 5px rgba(255, 255, 255, .98))
    drop-shadow(0 0 18px rgba(33, 223, 125, .92));
  will-change: opacity;
}

@keyframes correct-up-flash-arrive {
  from { opacity: 0; transform: scale(1.018); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes correct-up-flash-leave {
  from { opacity: 1; filter: saturate(1.08); }
  to { opacity: 0; filter: saturate(.65) brightness(.55); }
}

@media (max-width: 600px) {
  .correct-up-flash-market {
    inset: -3% -10%;
    width: 120%;
    height: 106%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .correct-up-flash,
  .correct-up-flash-trace,
  .correct-up-flash-head {
    animation: none;
  }

  .correct-up-flash-trace {
    opacity: 1;
  }

  .correct-up-flash-head {
    opacity: 0;
  }

  .correct-up-flash.is-leaving {
    animation: correct-up-flash-leave var(--up-fade) ease forwards;
  }
}
.correct-up-flash-market{inset:-2%;width:104%;height:104%;}

  </style>
  <div class="still"></div>
`,
  };
  const builders = {
    volatility: function(scope, players, requestAnimationFrame, cancelAnimationFrame, setTimeout, clearTimeout) {
const svgNamespace = "http://www.w3.org/2000/svg";
    const overlay = scope.getElementById("celebration");
    const traceGroup = scope.getElementById("trace-segments");
    const traceRevealRect = scope.getElementById("trace-reveal-rect");
    const surgeTrail = scope.getElementById("surge-trail");
    const surgeHead = scope.getElementById("surge-head");
    const crashTrail = scope.getElementById("crash-trail");
    const crashHead = scope.getElementById("crash-head");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const motionSpeed = volatilitySpeed;
    let animationFrame = null;
    let leaveTimer = null;

    const points = [
      [-30, 304], [35, 314], [90, 298], [145, 309], [220, 292],
      [300, 94],
      [345, 108], [390, 91], [435, 104], [480, 96], [525, 110],
      [605, 510],
      [655, 486], [705, 501], [760, 482], [820, 497], [885, 489], [950, 506], [1030, 493]
    ];
    const schedule = [
      [0, 100], [100, 200], [200, 300], [300, 400],
      [400, 650],
      [650, 710], [710, 770], [770, 830], [830, 890], [890, 950],
      [950, 1200],
      [1200, 1236], [1236, 1272], [1272, 1308], [1308, 1344], [1344, 1380], [1380, 1415], [1415, 1450]
    ];

    const segments = points.slice(0, -1).map((point, index) => {
      const nextPoint = points[index + 1];
      const segment = document.createElementNS(svgNamespace, "path");
      const isUp = nextPoint[1] < point[1];
      segment.setAttribute("class", `trace-segment ${isUp ? "is-up" : "is-down"}`);
      segment.setAttribute("d", `M ${point[0]} ${point[1]} L ${nextPoint[0]} ${nextPoint[1]}`);
      traceGroup.appendChild(segment);
      return {
        element: segment,
        from: point,
        to: nextPoint,
        start: schedule[index][0],
        end: schedule[index][1]
      };
    });

    const revealStartX = -50;
    const revealEndX = 1050;

    function setTraceElapsed(elapsed) {
      let revealX = revealStartX;
      segments.forEach(segment => {
        if (elapsed <= segment.start) return;
        const progress = Math.max(0, Math.min(1, (elapsed - segment.start) / (segment.end - segment.start)));
        revealX = Math.max(revealX, segment.from[0] + (segment.to[0] - segment.from[0]) * progress);
      });
      traceRevealRect.setAttribute("width", `${Math.max(0, Math.min(revealEndX, revealX) - revealStartX)}`);
    }

    function setShine(trail, head, start, end, progress) {
      if (progress <= 0 || progress >= 1) {
        trail.style.opacity = "0";
        head.style.opacity = "0";
        return;
      }
      const current = {
        x: start[0] + (end[0] - start[0]) * progress,
        y: start[1] + (end[1] - start[1]) * progress
      };
      const trailingProgress = Math.max(0, progress - .22);
      const trailing = {
        x: start[0] + (end[0] - start[0]) * trailingProgress,
        y: start[1] + (end[1] - start[1]) * trailingProgress
      };
      trail.setAttribute("x1", trailing.x);
      trail.setAttribute("y1", trailing.y);
      trail.setAttribute("x2", current.x);
      trail.setAttribute("y2", current.y);
      head.setAttribute("cx", current.x);
      head.setAttribute("cy", current.y);
      trail.style.opacity = `${Math.min(1, progress * 5, (1 - progress) * 7)}`;
      head.style.opacity = `${Math.min(1, progress * 6, (1 - progress) * 8)}`;
    }

    function resetAnimation() {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (leaveTimer) clearTimeout(leaveTimer);
      overlay.classList.remove("is-leaving");
      traceRevealRect.setAttribute("width", "0");
      [surgeTrail, surgeHead, crashTrail, crashHead].forEach(element => { element.style.opacity = "0"; });
    }

    function playAnimation() {
      resetAnimation();
      leaveTimer = setTimeout(() => overlay.classList.add("is-leaving"), animationDuration - volatilityFade);
      if (reduceMotion) {
        traceRevealRect.setAttribute("width", `${revealEndX - revealStartX}`);
        return;
      }
      const startedAt = performance.now();
      const animate = now => {
        const elapsed = now - startedAt;
        const motionElapsed = elapsed * motionSpeed;
        setTraceElapsed(motionElapsed);
        setShine(surgeTrail, surgeHead, points[4], points[5], (motionElapsed - 400) / 250);
        setShine(crashTrail, crashHead, points[10], points[11], (motionElapsed - 950) / 250);
        if (motionElapsed < 1450) {
          animationFrame = requestAnimationFrame(animate);
          return;
        }
        animationFrame = null;
        traceRevealRect.setAttribute("width", `${revealEndX - revealStartX}`);
      };
      animationFrame = requestAnimationFrame(animate);
    }


    const still = scope.querySelector('.trace-svg').cloneNode(true);
    still.querySelector('defs').remove();
    still.querySelector('g').removeAttribute('clip-path');
    still.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
    scope.querySelector('.still').appendChild(still);
    overlay.style.opacity='0';
    players.volatility=()=>{overlay.style.opacity='';playAnimation();};
    },
    reversal: function(scope, players, requestAnimationFrame, cancelAnimationFrame, setTimeout, clearTimeout) {
const celebration = scope.getElementById("reversalCelebration");
    const reversalPath = scope.getElementById("reversalPath");
    const reversalHead = scope.getElementById("reversalHead");
    // Match the rising trace to its CSS reveal before the existing downward turn.
    const riseStart = 2300 * .03710575;
    const riseDuration = 2300 * (.18552876 - .03710575);
    const headPathLength = reversalPath.getTotalLength();
    reversalPath.style.setProperty("--trace-length", headPathLength);
    let headFrame = 0;

    function moveHead(startTime) {
      function step(time) {
        const progress = Math.min(Math.max((time - startTime) / riseDuration, 0), 1);
        const point = reversalPath.getPointAtLength(headPathLength * progress);
        reversalHead.setAttribute("cx", point.x);
        reversalHead.setAttribute("cy", point.y);
        if (progress < 1) headFrame = requestAnimationFrame(step);
      }
      headFrame = requestAnimationFrame(step);
    }

    function playReversalCelebration() {
      cancelAnimationFrame(headFrame);
      celebration.classList.remove("is-playing");
      void celebration.offsetWidth;
      celebration.classList.add("is-playing");
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const startTime = performance.now();
        moveHead(startTime + riseStart);
      }
    }

    celebration.addEventListener("animationend", event => {
      if (event.target === celebration) celebration.classList.remove("is-playing");
    });
  
players.reversal=playReversalCelebration;
    },
    sideways: function(scope, players, requestAnimationFrame, cancelAnimationFrame, setTimeout, clearTimeout) {
const state = {};

function playCorrectSidewaysCelebration() {
  if (state.__pretiumSidewaysAnimationFrame) {
    cancelAnimationFrame(state.__pretiumSidewaysAnimationFrame);
    state.__pretiumSidewaysAnimationFrame = null;
  }
  if (state.__pretiumDownAnimationFrame) {
    cancelAnimationFrame(state.__pretiumDownAnimationFrame);
    state.__pretiumDownAnimationFrame = null;
  }
  (state.__pretiumSidewaysTimers || []).forEach(timer => clearTimeout(timer));
  state.__pretiumSidewaysTimers = [];
  scope.querySelector(".correct-up-celebration")?.remove();
  scope.querySelector(".correct-down-celebration")?.remove();
  scope.querySelector(".correct-down-flash")?.remove();
  scope.querySelector(".correct-sideways-flash")?.remove();

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const runNumber = (state.__pretiumSidewaysAnimationRun || 0) + 1;
  state.__pretiumSidewaysAnimationRun = runNumber;
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
  const later = (callback, delay) => {
    const timer = setTimeout(callback, delay);
    state.__pretiumSidewaysTimers.push(timer);
    return timer;
  };

  const upperY = 180;
  const lowerY = 420;
  const rangeHeight = lowerY - upperY;
  const rawPoints = [{
    y: upperY + rangeHeight * (.38 + random() * .24),
    stepWeight: .55 + random() * .55
  }];
  const touchCount = 3 + Math.floor(random() * 3);
  let nextBoundary = random() < .5 ? "upper" : "lower";

  for (let touchIndex = 0; touchIndex < touchCount * 2; touchIndex += 1) {
    const isUpper = nextBoundary === "upper";
    const boundaryY = isUpper ? upperY : lowerY;
    const inwardDirection = isUpper ? 1 : -1;

    if (random() < .38) {
      rawPoints.push({
        y: boundaryY + inwardDirection * rangeHeight * (.12 + random() * .1),
        stepWeight: .36 + random() * .4
      });
    }

    rawPoints.push({
      y: boundaryY,
      stepWeight: .34 + random() * .5
    });

    if (touchIndex < touchCount * 2 - 1) {
      const recoilY = boundaryY + inwardDirection * rangeHeight * (.3 + random() * .25);
      rawPoints.push({
        y: recoilY,
        stepWeight: .42 + random() * .65
      });

      if (random() < .3) {
        rawPoints.push({
          y: Math.max(
            upperY + rangeHeight * .08,
            Math.min(
              lowerY - rangeHeight * .08,
              recoilY - inwardDirection * rangeHeight * (.14 + random() * .12)
            )
          ),
          stepWeight: .28 + random() * .38
        });
      }
    }

    nextBoundary = isUpper ? "lower" : "upper";
  }

  const stepWeights = rawPoints.slice(0, -1).map(point => point.stepWeight);
  const totalStepWeight = stepWeights.reduce((total, weight) => total + weight, 0);
  let currentX = -50;
  const points = rawPoints.map((point, index) => {
    if (index === rawPoints.length - 1) return { x: 1050, y: point.y };
    const plottedPoint = { x: currentX, y: point.y };
    currentX += stepWeights[index] / totalStepWeight * 1100;
    return plottedPoint;
  });

  const svgNamespace = "http://www.w3.org/2000/svg";
  const overlay = document.createElement("div");
  overlay.className = "correct-sideways-flash";
  overlay.setAttribute("role", "status");
  overlay.setAttribute("aria-live", "polite");
  overlay.setAttribute(
    "aria-label",
    "Correct sideways prediction. A range-bound market line flashes across the screen and marks support and resistance."
  );

  const marketSvg = document.createElementNS(svgNamespace, "svg");
  marketSvg.classList.add("correct-sideways-flash-market");
  marketSvg.setAttribute("viewBox", "0 0 1000 600");
  marketSvg.setAttribute("preserveAspectRatio", "none");
  marketSvg.setAttribute("aria-hidden", "true");

  const gradientId = `correct-sideways-gradient-${runNumber}`;
  const clipId = `correct-sideways-clip-${runNumber}`;
  const definitions = document.createElementNS(svgNamespace, "defs");
  const traceGradient = document.createElementNS(svgNamespace, "linearGradient");
  traceGradient.setAttribute("id", gradientId);
  traceGradient.setAttribute("gradientUnits", "userSpaceOnUse");
  traceGradient.setAttribute("x1", "-50");
  traceGradient.setAttribute("x2", "1050");
  traceGradient.setAttribute("y1", "0");
  traceGradient.setAttribute("y2", "0");

  points.slice(0, -1).forEach((point, index) => {
    const nextPoint = points[index + 1];
    const color = nextPoint.y < point.y ? "#21df7d" : "#ff3657";
    const startStop = document.createElementNS(svgNamespace, "stop");
    const endStop = document.createElementNS(svgNamespace, "stop");
    startStop.setAttribute("offset", `${(point.x + 50) / 1100 * 100}%`);
    endStop.setAttribute("offset", `${(nextPoint.x + 50) / 1100 * 100}%`);
    startStop.setAttribute("stop-color", color);
    endStop.setAttribute("stop-color", color);
    traceGradient.append(startStop, endStop);
  });

  const revealClip = document.createElementNS(svgNamespace, "clipPath");
  revealClip.setAttribute("id", clipId);
  const revealRect = document.createElementNS(svgNamespace, "rect");
  revealRect.setAttribute("x", "-50");
  revealRect.setAttribute("y", "0");
  revealRect.setAttribute("width", "0");
  revealRect.setAttribute("height", "600");
  revealClip.appendChild(revealRect);
  definitions.append(traceGradient, revealClip);

  const trace = document.createElementNS(svgNamespace, "path");
  trace.classList.add("correct-sideways-flash-trace");
  trace.setAttribute(
    "d",
    points.map((point, index) => `${index ? "L" : "M"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ")
  );
  trace.setAttribute("stroke", `url(#${gradientId})`);
  const revealGroup = document.createElementNS(svgNamespace, "g");
  revealGroup.setAttribute("clip-path", `url(#${clipId})`);
  revealGroup.appendChild(trace);

  const leadingFlash = document.createElementNS(svgNamespace, "circle");
  leadingFlash.classList.add("correct-sideways-flash-head");
  leadingFlash.setAttribute("r", "9");

  const guideGroup = document.createElementNS(svgNamespace, "g");
  guideGroup.classList.add("correct-sideways-guide-group");
  const makeGuide = y => {
    const guide = document.createElementNS(svgNamespace, "line");
    guide.classList.add("correct-sideways-guide");
    guide.setAttribute("x1", "-50");
    guide.setAttribute("x2", "-50");
    guide.setAttribute("y1", y);
    guide.setAttribute("y2", y);
    return guide;
  };
  const makeArrow = y => {
    const arrow = document.createElementNS(svgNamespace, "path");
    arrow.classList.add("correct-sideways-guide-arrow");
    arrow.setAttribute("d", "M -12 -8 L 11 0 L -12 8 Z");
    arrow.setAttribute("transform", `translate(-50 ${y})`);
    return arrow;
  };
  const upperGuide = makeGuide(upperY);
  const lowerGuide = makeGuide(lowerY);
  const upperArrow = makeArrow(upperY);
  const lowerArrow = makeArrow(lowerY);
  guideGroup.append(upperGuide, lowerGuide, upperArrow, lowerArrow);

  marketSvg.append(definitions, revealGroup, guideGroup, leadingFlash);
  overlay.appendChild(marketSvg);

  scope.appendChild(overlay);
  const sidewaysScale = animationDuration / 1760;
  later(() => overlay.classList.add("is-leaving"), 1420 * sidewaysScale);
  later(() => overlay.remove(), animationDuration);
  const snapshot=marketSvg.cloneNode(true);
  snapshot.querySelector('clipPath').remove();
  const snapshotGradient=snapshot.querySelector('linearGradient');
  snapshotGradient.id += '-still';
  snapshot.querySelector('[clip-path]').removeAttribute('clip-path');
  snapshot.querySelector('.correct-sideways-flash-trace').setAttribute('stroke','url(#'+snapshotGradient.id+')');
  snapshot.querySelector('.correct-sideways-flash-head').remove();
  snapshot.querySelectorAll('.correct-sideways-guide').forEach(n=>n.setAttribute('x2','1050'));
  snapshot.querySelectorAll('.correct-sideways-guide-arrow').forEach(n=>n.remove());
  scope.querySelector('.still').replaceChildren(snapshot);


  const setGuides = progress => {
    const x = -50 + 1100 * progress;
    upperGuide.setAttribute("x2", x);
    lowerGuide.setAttribute("x2", x);
    upperArrow.setAttribute("transform", `translate(${x} ${upperY})`);
    lowerArrow.setAttribute("transform", `translate(${x} ${lowerY})`);
  };

  if (reduceMotion) {
    revealRect.setAttribute("width", "1100");
    leadingFlash.style.opacity = "0";
    guideGroup.style.opacity = "1";
    setGuides(1);
    return animationDuration;
  }

  const revealDuration = 760 * sidewaysScale;
  const revealStart = performance.now();
  const animateReveal = now => {
    const progress = Math.max(0, Math.min(1, (now - revealStart) / revealDuration));
    const targetX = -50 + 1100 * progress;
    let pointIndex = 0;
    while (pointIndex < points.length - 2 && points[pointIndex + 1].x < targetX) pointIndex += 1;
    const point = points[pointIndex];
    const nextPoint = points[pointIndex + 1];
    const pointProgress = Math.max(0, Math.min(1, (targetX - point.x) / Math.max(1, nextPoint.x - point.x)));
    const y = point.y + (nextPoint.y - point.y) * pointProgress;
    revealRect.setAttribute("width", `${1100 * progress}`);
    leadingFlash.setAttribute("cx", targetX);
    leadingFlash.setAttribute("cy", y);
    leadingFlash.style.opacity = progress < .94 ? "1" : `${Math.max(0, (1 - progress) / .06)}`;

    if (progress < 1) {
      state.__pretiumSidewaysAnimationFrame = requestAnimationFrame(animateReveal);
      return;
    }

    guideGroup.style.opacity = "1";
    const guideDuration = 560 * sidewaysScale;
    const guideStart = revealStart + revealDuration;
    const animateGuides = guideNow => {
      const guideProgress = Math.max(0, Math.min(1, (guideNow - guideStart) / guideDuration));
      setGuides(guideProgress);
      if (guideProgress < 1) {
        state.__pretiumSidewaysAnimationFrame = requestAnimationFrame(animateGuides);
        return;
      }
      state.__pretiumSidewaysAnimationFrame = null;

    };
    state.__pretiumSidewaysAnimationFrame = requestAnimationFrame(animateGuides);
  };

  state.__pretiumSidewaysAnimationFrame = requestAnimationFrame(animateReveal);
  return animationDuration;
}

players.sideways=playCorrectSidewaysCelebration;
    },
    breakout: function(scope, players, requestAnimationFrame, cancelAnimationFrame, setTimeout, clearTimeout) {
const ns = 'http://www.w3.org/2000/svg';
  const group = scope.querySelector('.traces');
  const head = scope.querySelector('.head');
  const shock = scope.querySelector('.shock');
  const particles = scope.querySelector('.particles');
  const scene = scope.querySelector('.scene');
  const intact = scope.querySelector('.intact');
  const broken = scope.querySelector('.broken');
  const cracks = scope.querySelector('.cracks');
  const range = scope.querySelector('.range');
  let points = [];
  let segments = [];
  let impactTime = 0;
  function resetTrace() {
    const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
    const sampleContour = () => Array.from({length:8}, (_, i) => {
      const x = 40 + 690 * (i + .5) / 8;
      const right = points.findIndex(point => point[0] >= x);
      const [x1, y1] = points[right - 1];
      const [x2, y2] = points[right];
      return y1 + (y2 - y1) * (x - x1) / (x2 - x1);
    });
    let contour;
    for (let attempt = 0; attempt < 24; attempt++) {
      const setupCount = 9 + Math.floor(Math.random() * 10);
      const drift = (Math.random() - .5) * 110;
      const phase = Math.random() * Math.PI * 2;
      const frequency = .6 + Math.random() * 1.4;
      const wave = Math.random() * 30;
      const swing = 22 + Math.random() * 52;
      points = [[40, 264 + Math.random() * 156]];
      for (let i = 1; i < setupCount; i++) {
        const progress = i / setupCount;
        const x = 40 + 690 * progress + (Math.random() - .5) * 276 / setupCount;
        const center = 342 + drift * (progress - .5) + Math.sin(phase + progress * Math.PI * 2 * frequency) * wave;
        let y = clamp(center + (Math.random() - .5) * swing * 2, 264, 420);
        if (Math.abs(y - points.at(-1)[1]) < 12) {
          y = clamp(y + (Math.random() < .5 ? -1 : 1) * (18 + Math.random() * 28), 264, 420);
        }
        points.push([x, y]);
      }
      // Keep the fracture fixed while varying the entire lead-in silhouette.
      points.push([730, 250]);
      contour = sampleContour();
      if (!previousBreakoutContour || contour.reduce((sum, y, i) => sum + Math.abs(y - previousBreakoutContour[i]), 0) / 8 >= 32) break;
      if (attempt === 23) {
        // A bounded fallback also handles a repeatedly identical random source.
        points = [[40, previousBreakoutContour[0] < 342 ? 420 : 264],
          ...previousBreakoutContour.map((y, i) => [40 + 690 * (i + .5) / 8, y < 342 ? 420 : 264]), [730, 250]];
        contour = sampleContour();
      }
    }
    previousBreakoutContour = contour;
    const rallyCount = 4 + Math.floor(Math.random() * 5);
    const retestIndex = 2 + Math.floor(Math.random() * (rallyCount - 2));
    for (let i = 1; i < rallyCount; i++) {
      const progress = i / rallyCount;
      const x = 730 + 240 * progress + (Math.random() - .5) * 96 / rallyCount;
      const y = i === retestIndex ? 250 : clamp(200 - progress * 130 + (Math.random() - .5) * 100, 85, 225);
      points.push([x, y]);
    }
    points.push([970, 35 + Math.random() * 45]);
    // Reserve the final third for the break, retest, and upward continuation.
    impactTime = 2080 + Math.random() * 160;
    const times = points.map(([x]) => x <= 730
      ? (x - 40) / 690 * impactTime
      : impactTime + (x - 730) / 240 * (2820 - impactTime));
    group.replaceChildren();
    segments = points.slice(1).map((end, i) => {
      const start = points[i];
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('class', 'trace ' + (end[1] < start[1] ? 'up' : 'down'));
      path.setAttribute('d', `M${start[0]} ${start[1]}L${end[0]} ${end[1]}`);
      group.appendChild(path);
      const length = Math.hypot(end[0]-start[0],end[1]-start[1]);
      path.style.strokeDasharray = String(length);
      return {path, length, start, end, from:times[i], to:times[i+1]};
    });
  }
  const shards = Array.from({length:18}, (_, i) => {
    const polygon = document.createElementNS(ns,'polygon');
    const size = 5 + (i*7)%14;
    polygon.setAttribute('points',`${-size*.6},${-size*.35} ${size*.7},${-size*.5} ${size*.15},${size*.8}`);
    particles.appendChild(polygon);
    const angle = Math.PI*2*i/18 + .13;
    const velocity = 110 + (i*41)%180;
    return {polygon, vx:Math.cos(angle)*velocity, vy:Math.sin(angle)*velocity-100, spin:(i%2 ? 1 : -1)*(180+(i*31)%380), x:710+(i*17)%47};
  });
  let frame = 0;
  function draw(ms, idle = false) {
    let position = points[0];
    segments.forEach(({path,length,start,end,from,to}) => {
      const progress = Math.min(1,Math.max(0,(ms-from)/(to-from)));
      path.style.strokeDashoffset = String(length*(1-progress));
      path.style.opacity = progress > 0 ? '1' : '0';
      if (progress > 0) position = [start[0]+(end[0]-start[0])*progress,start[1]+(end[1]-start[1])*progress];
    });
    head.setAttribute('cx',position[0]);head.setAttribute('cy',position[1]);
    head.style.opacity = idle || ms >= 2820 ? '0' : '1';
    const burst = Math.min(1,Math.max(0,(ms-impactTime)/440));
    const activeBurst = ms >= impactTime && ms < impactTime+440 && !idle;
    shock.setAttribute('r',String(12+burst*100));
    shock.style.opacity = activeBurst ? String((1-burst)*.8) : '0';
    const shattered = ms >= impactTime;
    intact.setAttribute('opacity',shattered ? '0' : '1');
    broken.setAttribute('opacity',shattered ? '1' : '0');
    cracks.style.opacity = ms >= impactTime-128 && !shattered && !idle ? String((ms-(impactTime-128))/128) : '0';
    const flight = Math.min(1,Math.max(0,(ms-impactTime)/900));
    particles.setAttribute('opacity',shattered && !idle ? String(1-Math.pow(flight,2)) : '0');
    shards.forEach(({polygon,vx,vy,spin,x}) => {
      polygon.setAttribute('transform',`translate(${x+vx*flight} ${250+vy*flight+155*flight*flight}) rotate(${spin*flight})`);
    });
    range.style.opacity = ms < impactTime ? '1' : String(Math.max(0,1-(ms-impactTime)/400));
    scene.style.opacity = idle ? '.3' : String(1-.7*Math.min(1,Math.max(0,(ms-2820)/380)));
  }
  players.breakout = () => {
    cancelAnimationFrame(frame);
    resetTrace();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start=performance.now();
    if(reduced){draw(2820,true);scene.style.opacity='1';}else{draw(0);}
    const tick=now=>{
      const progress=Math.min(1,(now-start)/animationDuration);
      if(reduced){scene.style.opacity=String(1-.7*progress);}else{draw(progress*3200);}
      if(progress<1)frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
  };
    },
    up: function(scope, players, requestAnimationFrame, cancelAnimationFrame, setTimeout, clearTimeout) {
const state = {};
  let timers = [];
  const later = (callback, delay) => {const timer = setTimeout(callback,delay);timers.push(timer);return timer;};
function playCorrectUpCelebration() {
  timers.forEach(clearTimeout);
  timers = [];
  if (state.__pretiumUpAnimationFrame) {
    cancelAnimationFrame(state.__pretiumUpAnimationFrame);
    state.__pretiumUpAnimationFrame = null;
  }
  scope.querySelector(".correct-up-celebration")?.remove();
  scope.querySelector(".correct-up-flash")?.remove();

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const runNumber = (state.__pretiumUpAnimationRun || 0) + 1;
  state.__pretiumUpAnimationRun = runNumber;

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

  points.forEach(point => { point[1] = 600 - point[1]; });
  const svgNamespace = "http://www.w3.org/2000/svg";
  const overlay = document.createElement("div");
  overlay.className = "correct-up-flash";
  overlay.setAttribute("role", "status");
  overlay.setAttribute("aria-live", "assertive");
  overlay.setAttribute("aria-label", "Correct up prediction. A rising market line flashes across the screen.");

  const marketSvg = document.createElementNS(svgNamespace, "svg");
  marketSvg.classList.add("correct-up-flash-market");
  marketSvg.setAttribute("viewBox", "0 0 1000 600");
  marketSvg.setAttribute("preserveAspectRatio", "none");
  marketSvg.setAttribute("aria-hidden", "true");

  const gradientId = `correct-up-flash-gradient-${runNumber}`;
  const clipId = `correct-up-flash-clip-${runNumber}`;
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
  trace.classList.add("correct-up-flash-trace");
  trace.setAttribute("d", pathData);
  trace.setAttribute("stroke", `url(#${gradientId})`);

  const revealGroup = document.createElementNS(svgNamespace, "g");
  revealGroup.setAttribute("clip-path", `url(#${clipId})`);
  revealGroup.appendChild(trace);

  const leadingFlash = document.createElementNS(svgNamespace, "circle");
  leadingFlash.classList.add("correct-up-flash-head");
  leadingFlash.setAttribute("r", "9");

  marketSvg.append(definitions, revealGroup, leadingFlash);
  overlay.appendChild(marketSvg);
  scope.appendChild(overlay);
  const snapshot = marketSvg.cloneNode(true);
  snapshot.querySelector('clipPath').remove();
  snapshot.querySelector('[clip-path]').removeAttribute('clip-path');
  const stillGradient = snapshot.querySelector('linearGradient');
  stillGradient.id += '-still';
  snapshot.querySelector('.correct-up-flash-trace').setAttribute('stroke', 'url(#' + stillGradient.id + ')');
  snapshot.querySelector('.correct-up-flash-head').remove();
  scope.querySelector('.still').replaceChildren(snapshot);

  if (reduceMotion) {
    revealRect.setAttribute("width", "1080");
    leadingFlash.style.opacity = "0";
  } else {
    const revealDuration = 760 / 1460 * animationDuration;
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
        state.__pretiumUpAnimationFrame = requestAnimationFrame(animateReveal);
      } else {
        state.__pretiumUpAnimationFrame = null;
      }
    };
    state.__pretiumUpAnimationFrame = requestAnimationFrame(animateReveal);
  }

  const completionDelay = animationDuration;
  later(() => overlay.classList.add("is-leaving"), 1120 / 1460 * animationDuration);
  later(() => overlay.remove(), completionDelay);
  return completionDelay;
}

  players.up = playCorrectUpCelebration;
    },
  };

  function cancel() {
    if (cancelActive) cancelActive();
  }

  function play(pattern) {
    const key = keys[pattern] || pattern;
    if (!builders[key]) return 0;
    cancel();
    if (window.__pretiumDownAnimationFrame) {
      window.cancelAnimationFrame(window.__pretiumDownAnimationFrame);
      window.__pretiumDownAnimationFrame = null;
    }
    document.querySelectorAll('.correct-up-celebration, .correct-down-celebration, .correct-down-flash, .correct-sideways-flash').forEach(node => node.remove());
    const host = document.createElement('div');
    host.className = 'correct-market-celebration';
    host.dataset.pattern = pattern;
    host.style.cssText = 'position:fixed;inset:0;z-index:12010;pointer-events:none;overflow:hidden;background:#030812;';
    const duration = key === 'reversal'
      ? (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 2300 : reversalDuration)
      : animationDuration;
    host.style.setProperty('--motion-duration', duration + 'ms');
    host.style.setProperty('--volatility-fade', volatilityFade + 'ms');
    host.style.setProperty('--sideways-fade', (340 / 1760 * animationDuration) + 'ms');
    host.style.setProperty('--up-fade', (340 / 1460 * animationDuration) + 'ms');
    const scope = host.attachShadow({mode:'open'});
    scope.innerHTML = templates[key];
    const productionStyle = document.createElement('style');
    productionStyle.textContent = '.still{display:none!important;}';
    scope.appendChild(productionStyle);
    const frames = new Set();
    const timers = new Set();
    let disposed = false;
    const frame = callback => {
      const id = window.requestAnimationFrame(time => {frames.delete(id);if (!disposed) callback(time);});
      frames.add(id);
      return id;
    };
    const unframe = id => {frames.delete(id);window.cancelAnimationFrame(id);};
    const later = (callback, delay) => {
      const id = window.setTimeout(() => {timers.delete(id);if (!disposed) callback();},delay);
      timers.add(id);
      return id;
    };
    const unlater = id => {timers.delete(id);window.clearTimeout(id);};
    const dispose = () => {
      disposed = true;
      frames.forEach(id => window.cancelAnimationFrame(id));
      timers.forEach(id => window.clearTimeout(id));
      frames.clear();timers.clear();host.remove();
      if (cancelActive === dispose) cancelActive = null;
    };
    cancelActive = dispose;
    document.body.appendChild(host);
    try {
      const players = {};
      builders[key](scope,players,frame,unframe,later,unlater);
      players[key]();
      later(dispose,duration);
    } catch (error) {
      dispose();
      throw error;
    }
    return duration;
  }

  window.playCorrectMarketCelebration = play;
  window.cancelCorrectMarketCelebration = cancel;
})();
