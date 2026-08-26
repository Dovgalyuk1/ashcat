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
     SOUND — synthesized with Web Audio API, off by default
  --------------------------------------------------------- */
  let audioCtx = null;
  let soundOn = false;
  let runningLoopStop = null;

  function ctx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function playWhoosh() {
    const c = ctx();
    const dur = 0.9;
    const bufferSize = c.sampleRate * dur;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const noise = c.createBufferSource();
    noise.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, c.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2200, c.currentTime + dur * 0.6);
    filter.frequency.exponentialRampToValueAtTime(300, c.currentTime + dur);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.5, c.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    noise.connect(filter).connect(gain).connect(c.destination);
    noise.start();
    noise.stop(c.currentTime + dur);
  }

  function playMeowYelp() {
    const c = ctx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(340, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, c.currentTime + 0.12);
    osc.frequency.exponentialRampToValueAtTime(520, c.currentTime + 0.3);
    gain.gain.setValueAtTime(0.0001, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.35, c.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.35);
    osc.connect(gain).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.4);
  }

  function startRunningLoop() {
    const c = ctx();
    let stopped = false;
    const master = c.createGain();
    master.gain.value = 0.0001;
    master.gain.exponentialRampToValueAtTime(0.22, c.currentTime + 0.3);
    master.connect(c.destination);

    function footstep(time) {
      if (stopped) return;
      const bufferSize = c.sampleRate * 0.08;
      const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      const src = c.createBufferSource();
      src.buffer = buffer;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 900;
      const g = c.createGain();
      g.gain.setValueAtTime(0.6, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
      src.connect(f).connect(g).connect(master);
      src.start(time);
      src.stop(time + 0.09);
    }

    let nextStep = c.currentTime;
    const interval = 0.23;
    function scheduler() {
      if (stopped) return;
      while (nextStep < c.currentTime + 0.2) {
        footstep(nextStep);
        nextStep += interval;
      }
      requestAnimationFrame(scheduler);
    }
    scheduler();

    return () => {
      stopped = true;
      master.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.25);
      setTimeout(() => master.disconnect(), 400);
    };
  }

  const soundBtn = document.getElementById('soundToggle');
  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? '🔊' : '🔇';
    if (soundOn) {
      ctx().resume();
      if (hasTriggered) runningLoopStop = startRunningLoop();
    } else if (runningLoopStop) {
      runningLoopStop();
      runningLoopStop = null;
    }
  });

  /* ---------------------------------------------------------
     THE TRANSITION — office -> flash -> running
  --------------------------------------------------------- */
  let hasTriggered = false;
  const screenGlow = document.getElementById('screenGlow');
  const flashOverlay = document.getElementById('flashOverlay');
  const runTrigger = document.getElementById('runTrigger');
  const bridgeSection = document.getElementById('bridge');

  function triggerRun() {
    if (hasTriggered) {
      bridgeSection.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    hasTriggered = true;
    screenGlow.classList.add('pumping');
    if (soundOn) playWhoosh();

    setTimeout(() => {
      flashOverlay.classList.add('show');
      if (soundOn) playMeowYelp();
      bridgeSection.scrollIntoView({ behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
    }, 260);

    setTimeout(() => {
      flashOverlay.classList.remove('show');
      if (soundOn) runningLoopStop = startRunningLoop();
    }, 1300);
  }

  runTrigger.addEventListener('click', triggerRun);

  // Autoplay: the site should open like a short animation/video, not wait for
  // a click. Give the visitor a beat to register the office scene and the
  // $ASHCAT title, then run the whole "he sees the candle and bolts" sequence
  // automatically. Manual click/scroll below still work as a no-op-safe fallback.
  setTimeout(() => {
    if (!hasTriggered) triggerRun();
  }, 1500);

  // auto-trigger once the office scene is mostly scrolled past, as a backup path
  let autoArmed = true;
  window.addEventListener('scroll', () => {
    if (!autoArmed || hasTriggered) return;
    const rect = bridgeSection.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.6) {
      autoArmed = false;
      triggerRun();
    }
  }, { passive: true });

  /* ---------------------------------------------------------
     DUST PUFFS at the runner's feet
  --------------------------------------------------------- */
  const dustLayer = document.getElementById('dustLayer');
  setInterval(() => {
    if (!dustLayer) return;
    const puff = document.createElement('div');
    puff.className = 'dust-puff';
    puff.style.left = (Math.random() * 20 - 10) + 'px';
    dustLayer.appendChild(puff);
    setTimeout(() => puff.remove(), 700);
  }, 150);

  /* ---------------------------------------------------------
     SPEED LINES
  --------------------------------------------------------- */
  const speedLayer = document.getElementById('speedlines');
  function spawnSpeedline() {
    if (!speedLayer) return;
    const line = document.createElement('div');
    line.className = 'speedline';
    const top = 15 + Math.random() * 60;
    const width = 60 + Math.random() * 160;
    const dur = 0.7 + Math.random() * 0.9;
    line.style.top = top + '%';
    line.style.right = '-10%';
    line.style.width = width + 'px';
    line.style.animationDuration = dur + 's';
    speedLayer.appendChild(line);
    setTimeout(() => line.remove(), dur * 1000 + 100);
  }
  setInterval(spawnSpeedline, 180);

  /* ---------------------------------------------------------
     FLYING COINS
  --------------------------------------------------------- */
  const coinLayer = document.getElementById('coinsLayer');
  const coinEmojis = ['🪙', '💰', '💵'];
  function spawnCoin() {
    if (!coinLayer) return;
    const coin = document.createElement('div');
    coin.className = 'coin';
    coin.textContent = coinEmojis[Math.floor(Math.random() * coinEmojis.length)];
    coin.style.top = (10 + Math.random() * 55) + '%';
    coin.style.left = (70 + Math.random() * 25) + '%';
    const dur = 3 + Math.random() * 2.5;
    coin.style.animationDuration = dur + 's';
    coinLayer.appendChild(coin);
    setTimeout(() => coin.remove(), dur * 1000 + 100);
  }
  setInterval(spawnCoin, 900);

  /* ---------------------------------------------------------
     STATS — demo simulation, swaps to real DexScreener data
     automatically once CONFIG.CA is filled in
  --------------------------------------------------------- */
  const statPrice = document.getElementById('statPrice');
  const statMcap = document.getElementById('statMcap');
  const statDistance = document.getElementById('statDistance');
  const statCoffee = document.getElementById('statCoffee');

  let demoPrice = 0.0000042;
  let distance = 0;
  let coffee = 3;

  function formatUsd(n) {
    if (n < 0.01) return '$' + n.toFixed(8);
    return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  function tickDemoStats() {
    demoPrice = Math.max(0.0000001, demoPrice * (1 + (Math.random() - 0.42) * 0.06));
    distance += Math.floor(20 + Math.random() * 60);
    if (Math.random() < 0.04) coffee += 1;
    if (statPrice) statPrice.textContent = formatUsd(demoPrice);
    if (statMcap) statMcap.textContent = formatUsd(demoPrice * 1_000_000_000);
    if (statDistance) statDistance.textContent = distance.toLocaleString('en-US') + ' m';
    if (statCoffee) statCoffee.textContent = coffee.toLocaleString('en-US');
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
      setInterval(() => { distance += 40; if (statDistance) statDistance.textContent = distance.toLocaleString('en-US') + ' m'; }, 1400);
    }
  })();

  if (CONFIG.CHART_URL) {
    document.querySelectorAll('.action-btn.chart').forEach(a => { a.href = CONFIG.CHART_URL; a.textContent = 'CHART'; });
  }
  if (CONFIG.BUY_URL) {
    document.querySelectorAll('.action-btn.buy').forEach(a => { a.href = CONFIG.BUY_URL; });
  }
})();
