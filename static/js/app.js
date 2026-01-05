/* static/js/app.js */
(function () {
  "use strict";

  const KEY_TIME = "bgm_time";
  const KEY_THEME = "theme";
  const SS_ABOUT_CLICK = "bgm_about_clicked";

  // NEW: nav active + snow
  const KEY_SNOW = "snow_on";

  // ---------- storage helpers ----------
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (_) { } }
  function safeGet(k, d = null) { try { return localStorage.getItem(k) ?? d; } catch (_) { return d; } }
  function safeSSSet(k, v) { try { sessionStorage.setItem(k, v); } catch (_) { } }
  function safeSSGet(k, d = null) { try { return sessionStorage.getItem(k) ?? d; } catch (_) { return d; } }
  function safeSSDel(k) { try { sessionStorage.removeItem(k); } catch (_) { } }

  function saveTime(audio) {
    if (!audio) return;
    safeSet(KEY_TIME, String(audio.currentTime || 0));
  }
  function readTime() {
    const v = parseFloat(safeGet(KEY_TIME, "0") || "0");
    return Number.isFinite(v) ? v : 0;
  }

  // Support baseURL subdir: /LapTrinhMang/about/ => true
  function isAboutPath(pathname) {
    return /\/about\/?$/.test(pathname);
  }

  function getPath() {
    const dp = document.body && document.body.getAttribute("data-path");
    return (dp && typeof dp === "string") ? dp : window.location.pathname;
  }

  // ---------- theme ----------
  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    safeSet(KEY_THEME, theme);
  }
  function getTheme() {
    return safeGet(KEY_THEME, "dark") || "dark";
  }
  function updateThemeUI(btn, icon) {
    const theme = document.documentElement.getAttribute("data-theme") || "dark";
    const isLight = theme === "light";
    if (btn) btn.setAttribute("aria-pressed", String(isLight));
    if (icon) icon.textContent = isLight ? "☀️" : "🌙";
  }

  // ---------- NAV ACTIVE ----------
  function normalizePath(p) {
    if (!p) return "/";
    p = String(p).split("?")[0].split("#")[0];
    if (!p.startsWith("/")) p = "/" + p;
    if (p.length > 1 && !p.endsWith("/")) p += "/";
    return p;
  }

  function updateActiveNav() {
    const cur = normalizePath(getPath());
    const links = document.querySelectorAll(".island a[data-nav]");
    links.forEach((a) => {
      a.classList.remove("is-active");
      try {
        const u = new URL(a.getAttribute("href"), window.location.href);
        const target = normalizePath(u.pathname);

        // Home brand: active chỉ khi đúng path home
        if (a.classList.contains("island-brand")) {
          if (cur === target) a.classList.add("is-active");
          return;
        }

        // Section: active khi đang nằm trong section
        if (target !== "/" && cur.startsWith(target)) a.classList.add("is-active");
      } catch (_) { }
    });
  }

  // ---------- SNOW ----------
  function initSnow() {
    const btn = document.getElementById("snowToggle");

    // tạo canvas 1 lần
    let c = document.getElementById("snowCanvas");
    if (!c) {
      c = document.createElement("canvas");
      c.id = "snowCanvas";
      document.body.appendChild(c);
    }
    const ctx = c.getContext("2d");

    function resize() {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      c.width = Math.floor(window.innerWidth * dpr);
      c.height = Math.floor(window.innerHeight * dpr);
      c.style.width = window.innerWidth + "px";
      c.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    let running = false;
    let raf = 0;
    let flakes = [];

    function seed() {
      const n = Math.min(180, Math.max(60, Math.floor(window.innerWidth / 10)));
      flakes = Array.from({ length: n }).map(() => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: 1 + Math.random() * 2.5,
        v: 0.6 + Math.random() * 1.8,
        w: -0.6 + Math.random() * 1.2
      }));
    }

    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      ctx.fillStyle = "rgba(255,255,255,0.85)";
      for (const f of flakes) {
        f.y += f.v;
        f.x += f.w;

        if (f.y > window.innerHeight + 10) {
          f.y = -10;
          f.x = Math.random() * window.innerWidth;
        }
        if (f.x < -10) f.x = window.innerWidth + 10;
        if (f.x > window.innerWidth + 10) f.x = -10;

        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    }

    function setOn(on) {
      running = !!on;
      safeSet(KEY_SNOW, running ? "1" : "0");

      if (btn) btn.setAttribute("aria-pressed", String(running));
      c.classList.toggle("is-on", running);

      if (running) {
        resize();
        seed();
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(raf);
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    }

    window.addEventListener("resize", () => {
      if (!running) return;
      resize();
      seed();
    });

    const saved = safeGet(KEY_SNOW, "0") === "1";
    setOn(saved);

    if (btn) btn.addEventListener("click", () => setOn(!running));
  }

  // ---------- cert fullscreen viewer ----------
  function initCertViewer() {
    const viewer = document.getElementById("certViewer");
    const img = document.getElementById("certViewerImg");
    if (!viewer || !img) return;

    function openViewer(src, alt) {
      if (!src) return;
      img.src = src;
      img.alt = alt || "Certificate";
      viewer.classList.add("is-open");
      viewer.setAttribute("aria-hidden", "false");
      document.documentElement.style.overflow = "hidden";
    }

    function closeViewer() {
      viewer.classList.remove("is-open");
      viewer.setAttribute("aria-hidden", "true");
      img.removeAttribute("src");
      document.documentElement.style.overflow = "";
    }

    // Delegation: click đúng .cert-open mới mở (không bắt cả card)
    document.addEventListener("click", (e) => {
      const btn = e.target && e.target.closest ? e.target.closest(".cert-open") : null;
      if (!btn) return;

      const card = btn.closest(".cert-card");
      if (!card) return;

      const src =
        card.getAttribute("data-image") ||
        (card.querySelector(".cert-thumb img") ? card.querySelector(".cert-thumb img").src : "");

      if (!src) return;

      const titleEl = card.querySelector(".cert-ov-title");
      const alt = titleEl ? titleEl.textContent.trim() : "Certificate";
      openViewer(src, alt);
    });

    // Click nền tối (viewer) -> đóng, click X -> đóng
    viewer.addEventListener("click", (e) => {
      if (e.target === viewer) closeViewer();
      const closeBtn = e.target && e.target.closest ? e.target.closest("[data-close]") : null;
      if (closeBtn) closeViewer();
    });

    // ESC -> đóng
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && viewer.classList.contains("is-open")) closeViewer();
    });
  }

  // ---------- PJAX ----------
  function initPJAX({ playNow, pauseNow, getStartedBy, setStartedBy }) {
    const main = document.getElementById("appMain");
    if (!main) return;

    function sameOrigin(url) {
      try { return url.origin === window.location.origin; } catch (_) { return false; }
    }

    function shouldHandleLink(a) {
      if (!a) return false;
      if (!a.hasAttribute("data-nav")) return false;
      if (a.target && a.target !== "_self") return false;

      const href = a.getAttribute("href") || "";
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;

      const u = new URL(href, window.location.href);
      if (!sameOrigin(u)) return false;

      return true;
    }

    async function loadPage(url, { push = true } = {}) {
      const u = new URL(url, window.location.href);

      let html = "";
      try {
        const res = await fetch(u.href, { method: "GET", headers: { "X-Requested-With": "pjax" } });
        html = await res.text();
      } catch (_) {
        window.location.href = u.href;
        return;
      }

      const doc = new DOMParser().parseFromString(html, "text/html");
      const nextMain = doc.getElementById("appMain");

      if (!nextMain) {
        window.location.href = u.href;
        return;
      }

      main.innerHTML = nextMain.innerHTML;

      if (doc.title) document.title = doc.title;
      document.body.setAttribute("data-path", u.pathname);

      // NEW: highlight active nav after PJAX
      updateActiveNav();

      if (push) history.pushState({ pjax: true }, "", u.pathname + u.search + u.hash);
      window.scrollTo(0, 0);

      // Rule: rời About thì dừng nếu nhạc auto-start bởi About
      if (!isAboutPath(u.pathname) && getStartedBy() === "about") {
        pauseNow();
        setStartedBy(null);
      }
    }

    document.addEventListener("click", async function (ev) {
      const a = ev.target && ev.target.closest ? ev.target.closest("a") : null;
      if (!shouldHandleLink(a)) return;

      ev.preventDefault();

      const href = a.getAttribute("href");
      const u = new URL(href, window.location.href);

      if (isAboutPath(u.pathname)) {
        safeSSSet(SS_ABOUT_CLICK, "1");
        await playNow("about"); // trong user gesture
      }

      await loadPage(u.href, { push: true });
    });

    window.addEventListener("popstate", function () {
      loadPage(window.location.href, { push: false });
    });

    // Fallback nếu hard-nav mà vẫn muốn thử play khi click About
    const p = getPath();
    const clicked = safeSSGet(SS_ABOUT_CLICK, "0") === "1";
    if (isAboutPath(p) && clicked) {
      safeSSDel(SS_ABOUT_CLICK);
      playNow("about");
    }
  }

  // =========================
  // CONTACT: EmailJS + Copy Email (works with PJAX)
  // =========================
  function initContactFeature() {
    function qs(el, sel) { return el ? el.querySelector(sel) : null; }

    function setHint(form, type, text) {
      const el = qs(form, "[data-contact-hint]") || qs(form, "[data-status]");
      if (!el) return;
      el.setAttribute("data-type", type || "info");
      el.textContent = text || "";
      el.style.display = text ? "block" : "none";
    }

    function setAsideStatus(type, text) {
      const el = document.querySelector("[data-contact-status]");
      if (!el) return;
      el.setAttribute("data-type", type || "info");
      el.textContent = text || "";
    }

    function ensureEmailJs(publicKey) {
      if (typeof emailjs === "undefined") return false;
      try {
        emailjs.init({ publicKey });
        return true;
      } catch (_) {
        return false;
      }
    }

    // Copy email button (LEFT)
    document.addEventListener("click", async function (e) {
      const btn = e.target && e.target.closest ? e.target.closest("[data-copy-email]") : null;
      if (!btn) return;

      const email = btn.getAttribute("data-copy-email") || "";
      if (!email) return;

      try {
        await navigator.clipboard.writeText(email);
        setAsideStatus("success", "Đã copy email.");
        const old = btn.textContent;
        btn.textContent = "Copied";
        setTimeout(() => { btn.textContent = old || "Copy Email"; }, 900);
      } catch (_) {
        // fallback
        const ta = document.createElement("textarea");
        ta.value = email;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setAsideStatus("success", "Đã copy email.");
        const old = btn.textContent;
        btn.textContent = "Copied";
        setTimeout(() => { btn.textContent = old || "Copy Email"; }, 900);
      }
    });

    // Submit form (RIGHT) - EmailJS if configured, else mailto fallback
    document.addEventListener("submit", async function (ev) {
      const form = ev.target && ev.target.matches ? (ev.target.matches("[data-contact-form]") ? ev.target : null) : null;
      if (!form) return;

      ev.preventDefault();

      const to = form.getAttribute("data-to") || "";
      const serviceId = form.getAttribute("data-service") || "";
      const templateId = form.getAttribute("data-template") || "";
      const publicKey = form.getAttribute("data-public") || "";

      const submitBtn = qs(form, 'button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      setHint(form, "info", "Đang gửi...");

      // 1) EmailJS
      if (to && serviceId && templateId && publicKey && ensureEmailJs(publicKey)) {
        try {
          await emailjs.sendForm(serviceId, templateId, form);
          setHint(form, "success", "Tôi đã nhận thông tin của bạn.");
          form.reset();
          if (submitBtn) submitBtn.disabled = false;
          return;
        } catch (err) {
          const msg =
            (err && err.text) ? String(err.text) :
              (err && err.message) ? String(err.message) :
                "Gửi thất bại (không rõ lỗi).";
          console.error("EmailJS error:", err);
          setHint(form, "error", msg);
          if (submitBtn) submitBtn.disabled = false;
          return;
        }
      }

      // 2) mailto fallback
      const name = (qs(form, 'input[name="name"]') || {}).value || "";
      const email = (qs(form, 'input[name="email"]') || {}).value || "";
      const subject = (qs(form, 'input[name="title"]') || {}).value || "Contact";
      const msg = (qs(form, 'textarea[name="message"]') || {}).value || "";

      if (!to) {
        setHint(form, "error", "Thiếu email nhận (Params.email).");
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      const body = `Họ tên: ${name}\nEmail: ${email}\n\nNội dung:\n${msg}`;
      window.location.href =
        `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      setHint(form, "success", "Đã mở ứng dụng mail.");
      if (submitBtn) submitBtn.disabled = false;
    });
  }

  // ---------- main ----------
  document.addEventListener("DOMContentLoaded", function () {
    // THEME
    setTheme(getTheme());
    const themeBtn = document.getElementById("themeToggle");
    const themeIcon = document.getElementById("themeIcon");
    updateThemeUI(themeBtn, themeIcon);
    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        const cur = document.documentElement.getAttribute("data-theme") || "dark";
        const next = cur === "dark" ? "light" : "dark";
        setTheme(next);
        updateThemeUI(themeBtn, themeIcon);
      });
    }

    // MUSIC (KHÔNG return nếu thiếu element)
    const audio = document.getElementById("bgm");
    const musicBtn = document.getElementById("musicToggle");
    const musicIcon = document.getElementById("musicIcon");

    let startedBy = null; // "about" | "manual" | null

    function setStartedBy(v) { startedBy = v; }
    function getStartedBy() { return startedBy; }

    function setMusicUI(isPlaying) {
      if (!musicBtn || !musicIcon) return;
      musicBtn.classList.toggle("is-playing", isPlaying);
      musicBtn.setAttribute("aria-pressed", String(isPlaying));
      musicIcon.textContent = isPlaying ? "⏸" : "▶";
    }

    async function playNow(markStartedBy) {
      if (!audio) { setMusicUI(false); return false; }
      try {
        await audio.play();
        setMusicUI(true);
        if (markStartedBy) startedBy = markStartedBy;
        return true;
      } catch (_) {
        setMusicUI(false);
        return false;
      }
    }

    function pauseNow() {
      if (!audio) { setMusicUI(false); return; }
      try { audio.pause(); } catch (_) { }
      setMusicUI(false);
    }

    // restore time (khi có audio)
    if (audio) {
      const t = readTime();
      const applyTime = () => {
        try { if (Number.isFinite(t) && t > 0) audio.currentTime = t; } catch (_) { }
      };
      if (audio.readyState >= 1) applyTime();
      else audio.addEventListener("loadedmetadata", applyTime, { once: true });

      audio.addEventListener("play", function () { setMusicUI(true); });
      audio.addEventListener("pause", function () { setMusicUI(false); });

      const tick = setInterval(function () { saveTime(audio); }, 800);
      window.addEventListener("pagehide", function () {
        saveTime(audio);
        try { clearInterval(tick); } catch (_) { }
      });
    }

    // Manual toggle
    if (musicBtn && audio) {
      musicBtn.addEventListener("click", async function () {
        if (audio.paused) await playNow("manual");
        else { pauseNow(); startedBy = null; }
      });
    } else {
      setMusicUI(false);
    }

    // NAV ACTIVE (initial)
    updateActiveNav();

    // SNOW (init)
    initSnow();

    // CERT VIEWER
    initCertViewer();

    // CONTACT
    initContactFeature();

    // PJAX
    initPJAX({ playNow, pauseNow, getStartedBy, setStartedBy });
  });

})();
