(() => {
  'use strict';

  /* ---------------------------------------------------------
     CONFIG — fill these in once the token is actually live
  --------------------------------------------------------- */
  const CONFIG = {
    CA: null, // e.g. "3vG7...pump" — once set, CA boxes + live stats will use it
    CHART_URL: null, // dexscreener / pump.fun link
    BUY_URL: null,
    DEX_API: (ca) => `https://api.dexscreener.com/latest/dex/tokens/${ca}`
  };

  /* ---------------------------------------------------------
     COPY TO CLIPBOARD (CA boxes)
  --------------------------------------------------------- */
  function wireCopyButton(btnId, valueId) {
    const btn = document.getElementById(btnId);
    const val = document.getElementById(valueId);
    if (!btn || !val) return;
    btn.addEventListener('click', async () => {
      const text = CONFIG.CA || val.textContent.trim();
      if (!CONFIG.CA) {
        btn.textContent = 'SOON!';
        setTimeout(() => (btn.textContent = 'COPY'), 1200);
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = 'COPIED';
        setTimeout(() => (btn.textContent = 'COPY'), 1200);
      } catch (e) {
        btn.textContent = 'OOPS';
        setTimeout(() => (btn.textContent = 'COPY'), 1200);
      }
    });
  }
  wireCopyButton('copyCa', 'caValue');
  wireCopyButton('copyCaFooter', 'caValueFooter');

  /* ---------------------------------------------------------
     BRINGING THE OFFICE PHOTO TO LIFE
     ---------------------------------------------------------
     The photo is shown with object-fit:cover, so it's cropped
     differently on every screen. We can't pin overlays (his eyes,
     the mug, the keyboard) with plain CSS percentages — those drift
     as soon as the crop changes. Instead we reproduce the cover math
     in JS from the image's real pixel size and re-place every overlay
     in real pixels on load / resize, so they always land exactly on
     the photo no matter the viewport.
  --------------------------------------------------------- */
  const IMG_W = 1792, IMG_H = 592;
  // hand-picked landmark points, in the original photo's pixel space
  const POINTS = {
    eyeL:     { x: 818, y: 247 },
    eyeR:     { x: 914, y: 246 },
    mug:      { x: 657, y: 425 },
    pawL:     { x: 958, y: 422 },
    pawR:     { x: 1015, y: 438 },
    screen:   { x: 1090, y: 355 }
  };

  const officeScene = document.getElementById('office');
  const overlayEls = {
    eyeL: document.querySelector('.eyelid-l'),
    eyeR: document.querySelector('.eyelid-r'),
    mug: document.querySelector('.steam-wrap'),
    pawL: document.querySelector('.paw-l'),
    pawR: document.querySelector('.paw-r'),
    screenGlow: document.getElementById('screenGlow'),
    screenTicker: document.getElementById('screenTicker')
  };

  function computeCoverMap(containerW, containerH) {
    const scale = Math.max(containerW / IMG_W, containerH / IMG_H);
    const dispW = IMG_W * scale, dispH = IMG_H * scale;
    return { scale, offX: (containerW - dispW) / 2, offY: (containerH - dispH) / 2 };
  }

  function placeOverlays() {
    if (!officeScene) return;
    const rect = officeScene.getBoundingClientRect();
    const map = computeCoverMap(rect.width, rect.height);
    const toLocal = (p) => ({ x: map.offX + p.x * map.scale, y: map.offY + p.y * map.scale });

    // left/top only — every overlay's own CSS (or its keyframes) already
    // bakes in the translate(-50%,-50%) centering, so we never touch
    // `transform` here and never fight the running blink/tap animations.
    const setPos = (el, p) => {
      if (!el) return;
      const local = toLocal(p);
      el.style.left = local.x + 'px';
      el.style.top = local.y + 'px';
    };

    setPos(overlayEls.eyeL, POINTS.eyeL);
    setPos(overlayEls.eyeR, POINTS.eyeR);
    setPos(overlayEls.mug, POINTS.mug);
    setPos(overlayEls.pawL, POINTS.pawL);
    setPos(overlayEls.pawR, POINTS.pawR);
    setPos(overlayEls.screenGlow, POINTS.screen);
    setPos(overlayEls.screenTicker, { x: POINTS.screen.x, y: POINTS.screen.y - 55 });
  }

  placeOverlays();
  window.addEventListener('resize', placeOverlays);
  // the photo has its own slow "Ken Burns" zoom, so the cover math technically
  // drifts a hair over time — recomputing occasionally keeps it pixel-tight
  setInterval(placeOverlays, 4000);

  // little ticker of nonsense numbers on the laptop screen, just for flavor
  const tickerEl = overlayEls.screenTicker;
  if (tickerEl) {
    setInterval(() => {
      const up = Math.random() > 0.35;
      const pct = (Math.random() * 9 + 0.1).toFixed(1);
      tickerEl.textContent = (up ? '+' : '-') + pct + '%';
      tickerEl.style.color = up ? '#7bffb0' : '#ff7b8f';
      tickerEl.style.textShadow = up ? '0 0 6px rgba(123,255,176,.8)' : '0 0 6px rgba(255,123,143,.8)';
    }, 900);
  }

  /* ---------------------------------------------------------
     SOUND — a soft synthesized keyboard clack, off by default
  --------------------------------------------------------- */
  let audioCtx = null;
  let soundOn = false;
  let typingLoopStop = null;

  function ctx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function startTypingLoop() {
    const c = ctx();
    let stopped = false;
    const master = c.createGain();
    master.gain.value = 0.0001;
    master.gain.exponentialRampToValueAtTime(0.18, c.currentTime + 0.3);
    master.connect(c.destination);

    function clack(time) {
      if (stopped) return;
      const bufferSize = Math.floor(c.sampleRate * 0.03);
      const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      const src = c.createBufferSource();
      src.buffer = buffer;
      const f = c.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 1200 + Math.random() * 800;
      const g = c.createGain();
      g.gain.setValueAtTime(0.5 + Math.random() * 0.3, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
      src.connect(f).connect(g).connect(master);
      src.start(time);
      src.stop(time + 0.04);
    }

    let nextKey = c.currentTime + 0.1;
    function scheduler() {
      if (stopped) return;
      while (nextKey < c.currentTime + 0.2) {
        clack(nextKey);
        // irregular typing rhythm, occasional short pause
        nextKey += Math.random() < 0.12 ? 0.35 + Math.random() * 0.3 : 0.07 + Math.random() * 0.09;
      }
      requestAnimationFrame(scheduler);
    }
    scheduler();

    return () => {
      stopped = true;
      master.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.2);
      setTimeout(() => master.disconnect(), 350);
    };
  }

  const soundBtn = document.getElementById('soundToggle');
  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? '🔊' : '🔇';
    if (soundOn) {
      ctx().resume();
      typingLoopStop = startTypingLoop();
    } else if (typingLoopStop) {
      typingLoopStop();
      typingLoopStop = null;
    }
  });

  /* ---------------------------------------------------------
     STATS — demo simulation, swaps to real DexScreener data
     automatically once CONFIG.CA is filled in
  --------------------------------------------------------- */
  const statPrice = document.getElementById('statPrice');
  const statMcap = document.getElementById('statMcap');
  const statKeys = document.getElementById('statDistance');
  const statCoffee = document.getElementById('statCoffee');

  let demoPrice = 0.0000042;
  let keysPressed = 0;
  let coffeeDeclined = 0;

  function formatUsd(n) {
    if (n < 0.01) return '$' + n.toFixed(8);
    return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  function tickDemoStats() {
    demoPrice = Math.max(0.0000001, demoPrice * (1 + (Math.random() - 0.42) * 0.06));
    keysPressed += Math.floor(8 + Math.random() * 30);
    if (Math.random() < 0.05) coffeeDeclined += 1;
    if (statPrice) statPrice.textContent = formatUsd(demoPrice);
    if (statMcap) statMcap.textContent = formatUsd(demoPrice * 1_000_000_000);
    if (statKeys) statKeys.textContent = keysPressed.toLocaleString('en-US');
    if (statCoffee) statCoffee.textContent = coffeeDeclined.toLocaleString('en-US');
  }

  async function fetchRealStats() {
    if (!CONFIG.CA) return false;
    try {
      const res = await fetch(CONFIG.DEX_API(CONFIG.CA));
      const data = await res.json();
      const pair = data && data.pairs && data.pairs[0];
      if (!pair) return false;
      if (statPrice) statPrice.textContent = '$' + Number(pair.priceUsd).toFixed(8);
      if (statMcap) statMcap.textContent = formatUsd(pair.fdv || pair.marketCap || 0);
      document.querySelectorAll('#caValue, #caValueFooter').forEach(el => (el.textContent = CONFIG.CA));
      return true;
    } catch (e) {
      return false;
    }
  }

  (async function initStats() {
    const gotReal = await fetchRealStats();
    if (!gotReal) {
      tickDemoStats();
      setInterval(tickDemoStats, 1400);
    } else {
      setInterval(fetchRealStats, 15000);
      setInterval(() => { keysPressed += 15; if (statKeys) statKeys.textContent = keysPressed.toLocaleString('en-US'); }, 1400);
    }
  })();

  if (CONFIG.CHART_URL) {
    document.querySelectorAll('.action-btn.chart').forEach(a => { a.href = CONFIG.CHART_URL; a.textContent = 'CHART'; });
  }
  if (CONFIG.BUY_URL) {
    document.querySelectorAll('.action-btn.buy').forEach(a => { a.href = CONFIG.BUY_URL; });
  }
})();
