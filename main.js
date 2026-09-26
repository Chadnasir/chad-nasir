/* ============================================================
   CHAD NASIR — Land Advisory
   Motion choreography: MotionSites-grade timing, easing, stagger.
   Vanilla JS. No dependencies.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Environment ---------- */
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE_POINTER = window.matchMedia('(pointer: fine)').matches;
  var TOUCH = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  var SMOOTH = FINE_POINTER && !TOUCH && !REDUCED; // virtual wheel scroll, desktop only

  /* ---------- Helpers ---------- */
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function maxScroll() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  /* ============================================================
     SCRAMBLE — letter-decode effect.
     Titles: 900ms, resolve left-to-right. Hovers: 320ms.
     ============================================================ */
  var GLYPHS = '!<>-_\\/[]{}=+*^?#';
  function scrambleText(el, duration) {
    duration = duration || 900;
    var original = el.getAttribute('data-orig') || el.textContent;
    el.setAttribute('data-orig', original);
    if (REDUCED) { el.textContent = original; return; }
    var chars = original.split('');
    var start = performance.now();
    if (el._scramble) cancelAnimationFrame(el._scramble);
    function frame(now) {
      var p = clamp((now - start) / duration, 0, 1);
      var out = '';
      for (var i = 0; i < chars.length; i++) {
        var c = chars[i];
        if (c === ' ' || c === '\n' || c === '\t') { out += c; continue; }
        var settle = 0.12 + 0.72 * (i / Math.max(chars.length - 1, 1)); // left → right
        out += (p >= settle) ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) el._scramble = requestAnimationFrame(frame);
      else { el.textContent = original; el._scramble = null; }
    }
    el._scramble = requestAnimationFrame(frame);
  }

  /* ============================================================
     LOADER — eased 000→100 counter (~1.6s), curtain exit.
     ============================================================ */
  var loader = document.getElementById('loader');
  var loadNum = document.getElementById('loadNum');
  function runLoader(done) {
    if (REDUCED || !loader) { if (loader) loader.style.display = 'none'; done(); return; }
    var DUR = 1600;
    var start = performance.now();
    function frame(now) {
      var p = clamp((now - start) / DUR, 0, 1);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic — fast start, soft landing
      loadNum.textContent = String(Math.round(eased * 100)).padStart(3, '0');
      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        loadNum.textContent = '100';
        loader.classList.add('done'); // CSS curtain: 0.9s rise
        setTimeout(function () { loader.style.display = 'none'; done(); }, 950);
      }
    }
    requestAnimationFrame(frame);
  }

  /* ============================================================
     HERO CHOREOGRAPHY (MotionSites Pattern A — Staggered Rise)
       0.00s  eyebrow ......... scramble-decode, 0.9s
       0.10s  name words ...... masked rise, 0.9s, cubic-bezier(0.16,1,0.3,1),
                                stagger 0.12s per word
       0.25s  sub lines ....... rise 40px→0 + fade, 0.7s, stagger 0.15s
       0.15s  giant LAND® ..... scale 0.94→1 + fade, 1.4s, gentle settle
       0.50s  meta header ..... fade + slide down, 0.6s
     Total hero window: under 2.5s. Never simultaneous — always staged.
     ============================================================ */
  function prepHero() {
    // Masked word-rise for the hero name (premium over plain fade)
    var h = document.querySelector('.hero-name');
    if (h) {
      var src = h.querySelector('[data-scramble]') || h;
      var text = (src.getAttribute('data-orig') || src.textContent).trim();
      src.removeAttribute('data-scramble');
      h.setAttribute('aria-label', text);
      h.innerHTML = '';
      text.split(/\s+/).forEach(function (word, i) {
        var mask = document.createElement('span');
        mask.className = 'wmask';
        mask.setAttribute('aria-hidden', 'true');
        var inner = document.createElement('span');
        inner.className = 'wmask-in';
        inner.textContent = word;
        inner.style.transitionDelay = (0.10 + i * 0.12).toFixed(2) + 's';
        mask.appendChild(inner);
        h.appendChild(mask);
        h.appendChild(document.createTextNode(' '));
      });
    }
    // Hero sub lines get staged delays (CSS handles the motion)
    var subLines = document.querySelectorAll('.hero-sub [data-reveal]');
    subLines.forEach(function (el, i) {
      el.style.setProperty('--rd', (0.25 + i * 0.15).toFixed(2) + 's');
      el.classList.add('hero-staged');
    });
    // Eyebrow decodes right as the curtain lifts
    var brow = document.querySelector('.hero .eyebrow');
    if (brow) brow.setAttribute('data-scramble-hero', '1');
  }

  function startHero() {
    document.body.classList.add('loaded'); // releases all staged CSS transitions
    var brow = document.querySelector('.hero .eyebrow');
    if (brow) scrambleText(brow, 900);
  }

  /* ---------- Lazy scramble for scroll-triggered titles ---------- */
  function initLazyScramble() {
    var els = document.querySelectorAll('[data-scramble]:not([data-scramble-hero])');
    if (REDUCED || !('IntersectionObserver' in window) || !els.length) {
      els.forEach(function (el) {
        el.setAttribute('data-orig', el.textContent);
      });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          scrambleText(en.target, 900);
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.45 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Nav link hover: quick decode (0.32s) ---------- */
  function initNavScramble() {
    if (REDUCED || TOUCH) return;
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      a.addEventListener('mouseenter', function () { scrambleText(a, 320); });
    });
  }

  /* ============================================================
     CURSOR — dot (fast, 0.35 lerp) + trailing ring (slow, 0.16).
     Ring morphs: hover → 56px, [data-cursor] → 88px VIEW badge.
     Desktop fine-pointer only.
     ============================================================ */
  function initCursor() {
    var dot = document.querySelector('.cursor-dot');
    var ring = document.querySelector('.cursor-ring');
    if (!dot || !ring || !FINE_POINTER || TOUCH || REDUCED) return;
    document.body.classList.add('has-cursor');
    var label = ring.querySelector('.cursor-label');
    var mx = -100, my = -100, dx = -100, dy = -100, rx = -100, ry = -100;
    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
    }, { passive: true });
    (function loop() {
      dx = lerp(dx, mx, 0.35); dy = lerp(dy, my, 0.35);
      rx = lerp(rx, mx, 0.16); ry = lerp(ry, my, 0.16);
      dot.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
      ring.style.transform = 'translate(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px)';
      requestAnimationFrame(loop);
    })();
    document.querySelectorAll('a, button').forEach(function (el) {
      el.addEventListener('mouseenter', function () { ring.classList.add('is-hover'); });
      el.addEventListener('mouseleave', function () { ring.classList.remove('is-hover'); });
    });
    document.querySelectorAll('[data-cursor]').forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        if (label) label.textContent = el.getAttribute('data-cursor');
        ring.classList.add('is-view');
      });
      el.addEventListener('mouseleave', function () {
        if (label) label.textContent = '';
        ring.classList.remove('is-view');
      });
    });
  }

  /* ============================================================
     PACIFIC CLOCK — live, America/Los_Angeles, HH:MM:SS
     ============================================================ */
  function initClock() {
    var clockEl = document.getElementById('clock');
    if (!clockEl) return;
    function tick() {
      try {
        clockEl.textContent = new Date().toLocaleTimeString('en-US', {
          timeZone: 'America/Los_Angeles', hour12: false,
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
      } catch (e) {
        clockEl.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
      }
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ============================================================
     SMOOTH SCROLL — virtual wheel with lerp (desktop, fine pointer).
     Touch / reduced-motion get native scroll. Keyboard jumps sync.
     ============================================================ */
  var target = window.scrollY, current = window.scrollY;
  var wheelIdle = null, wheeling = false;
  function initSmooth() {
    if (!SMOOTH) return;
    document.body.classList.add('smooth');
    window.addEventListener('wheel', function (e) {
      if (e.ctrlKey) return; // pinch-zoom passes through
      if (document.body.classList.contains('lb-open')) return;
      e.preventDefault();
      target = clamp(target + e.deltaY, 0, maxScroll());
      wheeling = true;
      clearTimeout(wheelIdle);
      wheelIdle = setTimeout(function () { wheeling = false; }, 140);
    }, { passive: false });
    (function loop() {
      if (!wheeling && Math.abs(window.scrollY - current) > 4) {
        current = target = window.scrollY; // native jump (keyboard, find, etc.)
      }
      current = lerp(current, target, 0.085);
      if (Math.abs(current - target) > 0.15) {
        window.scrollTo(0, Math.round(current));
      } else if (current !== target) {
        current = target;
        window.scrollTo(0, Math.round(current));
      }
      requestAnimationFrame(loop);
    })();
    window.addEventListener('resize', function () { target = clamp(target, 0, maxScroll()); });
  }

  /* ---------- Anchor navigation ---------- */
  function initAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (!id || id.length < 2) return;
        var t = document.querySelector(id);
        if (!t) return;
        e.preventDefault();
        var y = Math.round(t.getBoundingClientRect().top + window.scrollY);
        if (SMOOTH) {
          target = clamp(y, 0, maxScroll());
        } else if (!REDUCED && 'scrollBehavior' in document.documentElement.style) {
          window.scrollTo({ top: y, behavior: 'smooth' });
        } else {
          window.scrollTo(0, y);
        }
      });
    });
  }

  /* ============================================================
     REVEALS — IntersectionObserver. Stagger delays use human
     variation (0.05 / 0.12 / 0.18 / 0.25s), never uniform.
     ============================================================ */
  function initReveals() {
    var all = document.querySelectorAll('[data-reveal]');
    if (REDUCED || !('IntersectionObserver' in window)) {
      all.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var steps = [0.05, 0.12, 0.18, 0.25];
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    all.forEach(function (el, i) {
      if (el.classList.contains('hero-staged')) return; // released by the hero timeline
      el.style.setProperty('--rd', steps[i % steps.length].toFixed(2) + 's');
      io.observe(el);
    });
  }

  /* ============================================================
     MANIFESTO — scroll-linked word illumination.
     ============================================================ */
  function lightManifesto() {} // no-op until init
  function initManifesto() {
    var man = document.getElementById('manifestoText');
    if (!man || REDUCED) return;
    var words = man.textContent.trim().split(/\s+/);
    man.setAttribute('aria-label', man.textContent.trim());
    man.innerHTML = words.map(function (w) {
      return '<span class="w" aria-hidden="true">' + w + '</span>';
    }).join(' ');
    var ws = man.querySelectorAll('.w');
    lightManifesto = function () {
      var r = man.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = clamp((vh * 0.72 - r.top) / (r.height + vh * 0.35), 0, 1);
      var lit = Math.floor(p * ws.length * 1.05);
      for (var i = 0; i < ws.length; i++) {
        ws[i].classList.toggle('lit', i < lit);
      }
    };
  }

  /* ============================================================
     DEALS — rows expand cinematic media (one open at a time).
     The VIEW pill opens the full-screen lightbox instead.
     ============================================================ */
  var deals = [];
  function initDeals() {
    deals = Array.prototype.slice.call(document.querySelectorAll('[data-deal]'));
    // inner wrapper enables the buttery grid-rows expansion
    document.querySelectorAll('.deal-media').forEach(function (m) {
      var img = m.querySelector('img');
      if (img && !img.parentNode.classList.contains('deal-media-inner')) {
        var inner = document.createElement('div');
        inner.className = 'deal-media-inner';
        m.insertBefore(inner, img);
        inner.appendChild(img);
      }
    });
    deals.forEach(function (deal, i) {
      var row = deal.querySelector('.deal-row');
      row.addEventListener('click', function (e) {
        if (e.target.closest('.view-pill')) { openLB(i); return; }
        var was = deal.classList.contains('open');
        deals.forEach(function (d) { d.classList.remove('open'); });
        if (!was) deal.classList.add('open');
      });
    });
  }

  /* ============================================================
     LIGHTBOX — full-screen case overlay with prev/next.
     ============================================================ */
  var lbIndex = 0;
  function openLB(i) {
    var lb = document.getElementById('lightbox');
    if (!lb || !deals.length) return;
    lbIndex = (i + deals.length) % deals.length;
    var deal = deals[lbIndex];
    var img = deal.querySelector('.deal-media img');
    var lbImg = document.getElementById('lightboxImg');
    lbImg.src = img.getAttribute('src');
    lbImg.alt = img.getAttribute('alt') || '';
    document.getElementById('lightboxTitle').textContent =
      deal.querySelector('.deal-name').textContent.trim();
    var note = deal.querySelector('.deal-note p');
    document.getElementById('lightboxNote').textContent = note ? note.textContent.trim() : '';
    document.getElementById('lightboxCount').textContent = (lbIndex + 1) + ' / ' + deals.length;
    lb.classList.add('show');
    lb.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lb-open');
    target = current = window.scrollY; // freeze the virtual scroller
  }
  function closeLB() {
    var lb = document.getElementById('lightbox');
    if (!lb) return;
    lb.classList.remove('show');
    lb.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lb-open');
  }
  function initLightbox() {
    var lb = document.getElementById('lightbox');
    if (!lb) return;
    lb.querySelectorAll('[data-close]').forEach(function (el) {
      el.addEventListener('click', closeLB);
    });
    var prev = document.getElementById('lbPrev');
    var next = document.getElementById('lbNext');
    if (prev) prev.addEventListener('click', function (e) { e.stopPropagation(); openLB(lbIndex - 1); });
    if (next) next.addEventListener('click', function (e) { e.stopPropagation(); openLB(lbIndex + 1); });
    window.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('show')) return;
      if (e.key === 'Escape') closeLB();
      else if (e.key === 'ArrowRight') openLB(lbIndex + 1);
      else if (e.key === 'ArrowLeft') openLB(lbIndex - 1);
    });
  }

  /* ============================================================
     MAGNETIC — elements pull toward the cursor inside 90px,
     spring back on leave. Click compresses (CSS :active scale).
     ============================================================ */
  function initMagnetic() {
    if (!FINE_POINTER || TOUCH || REDUCED) return;
    document.querySelectorAll('[data-magnetic]').forEach(function (el) {
      var x = 0, y = 0, tx = 0, ty = 0, raf = null;
      function anim() {
        x = lerp(x, tx, 0.18); y = lerp(y, ty, 0.18);
        el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
        if (Math.abs(x - tx) > 0.1 || Math.abs(y - ty) > 0.1) {
          raf = requestAnimationFrame(anim);
        } else {
          raf = null;
          if (tx === 0 && ty === 0) el.style.transform = '';
        }
      }
      function kick() { if (!raf) raf = requestAnimationFrame(anim); }
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        if (Math.hypot(dx, dy) < 90) { tx = dx * 0.35; ty = dy * 0.35; }
        else { tx = 0; ty = 0; }
        kick();
      });
      el.addEventListener('mouseleave', function () { tx = 0; ty = 0; kick(); });
    });
  }

  /* ============================================================
     SCROLL FX — progress bar, header theme over the blue chapter,
     parallax on deal imagery + the giant mark.
     ============================================================ */
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY;
    var max = maxScroll();
    var bar = document.getElementById('progressBar');
    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    var header = document.querySelector('.meta-head');
    var ring = document.querySelector('.cursor-ring');
    var profile = document.querySelector('.profile');
    if (profile && header) {
      var pr = profile.getBoundingClientRect();
      var onBlue = pr.top < 90 && pr.bottom > 90;
      header.classList.toggle('over-blue', onBlue);
      if (ring) ring.classList.toggle('on-blue', onBlue);
    }
    if (!REDUCED) {
      var vh = window.innerHeight;
      document.querySelectorAll('.deal-media-inner img').forEach(function (img) {
        var r = img.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var off = (r.top + r.height / 2 - vh / 2) / vh; // -0.5 … 0.5
        img.style.translate = '0 ' + (-off * 48).toFixed(1) + 'px';
      });
      var giant = document.querySelector('.giant-mark');
      if (giant) {
        var gr = giant.getBoundingClientRect();
        var goff = (gr.top + gr.height / 2 - vh / 2) / vh;
        giant.style.translate = '0 ' + (-goff * 40).toFixed(1) + 'px';
      }
    }
    lightManifesto();
  }
  function requestScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }

  /* ---------- Boot ---------- */
  function init() {
    document.body.classList.add('js');
    prepHero();
    initClock();
    initCursor();
    initNavScramble();
    initLazyScramble();
    initReveals();
    initManifesto();
    initDeals();
    initLightbox();
    initMagnetic();
    initSmooth();
    initAnchors();
    window.addEventListener('scroll', requestScroll, { passive: true });
    window.addEventListener('resize', requestScroll);
    runLoader(function () {
      startHero();
      // release the hero-staged reveals with the choreography, not on scroll
      document.querySelectorAll('.hero-staged').forEach(function (el) { el.classList.add('in'); });
      requestScroll();
    });
    onScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
