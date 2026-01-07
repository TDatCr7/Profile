/* static/js/happynewyearbr.js (v2)
   Optimized petals (sprite) + bigger fireworks + theme switch
*/
(function () {
    "use strict";

    function $(sel, root) { return (root || document).querySelector(sel); }
    const rootEl = document.documentElement;

    function isLight() {
        return (rootEl.getAttribute("data-theme") || "dark") === "light";
    }

    function ensureFxRoot() {
        let host = $(".tet-fx");
        if (!host) {
            host = document.createElement("div");
            host.className = "tet-fx";
            host.setAttribute("aria-hidden", "true");
            document.body.prepend(host);
        }
        return host;
    }

    function makeCanvas(className, host) {
        const c = document.createElement("canvas");
        c.className = className;
        host.appendChild(c);
        return c;
    }

    function perfDpr() {
        // cap dpr để mobile mượt
        const raw = Math.max(1, window.devicePixelRatio || 1);
        if (window.innerWidth < 720) return 1;
        return Math.min(1.5, raw);
    }

    function fitCanvas(canvas) {
        const dpr = perfDpr();
        const w = Math.floor(window.innerWidth * dpr);
        const h = Math.floor(window.innerHeight * dpr);
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w; canvas.height = h;
        }
        const ctx = canvas.getContext("2d", { alpha: true });
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return ctx;
    }

    function rand(min, max) { return min + Math.random() * (max - min); }

    // =========================
    // PETALS (Light) - sprite based
    // =========================
    function makePetalSprite(colorA, colorB) {
        const s = 64;
        const c = document.createElement("canvas");
        c.width = s; c.height = s;
        const ctx = c.getContext("2d");

        ctx.translate(s / 2, s / 2);

        const g = ctx.createLinearGradient(0, -24, 0, 24);
        g.addColorStop(0, colorA);
        g.addColorStop(1, colorB);

        // petal ellipse
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 22, 0, 0, Math.PI * 2);
        ctx.fill();

        // highlight
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = "rgba(255,255,255,.70)";
        ctx.beginPath();
        ctx.ellipse(0, -6, 2.5, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // vein
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = "rgba(255,255,255,.85)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.quadraticCurveTo(2, 0, 0, 16);
        ctx.stroke();

        return c;
    }

    function petalsEngine(canvas) {
        let ctx = fitCanvas(canvas);
        let running = true;

        const sprites = [
            makePetalSprite("rgba(255,210,70,.95)", "rgba(255,160,40,.90)"),  // mai vàng
            makePetalSprite("rgba(255,165,200,.92)", "rgba(255,95,150,.88)"), // đào hồng
            makePetalSprite("rgba(255,255,255,.92)", "rgba(255,235,205,.90)") // kem trắng
        ];

        const petals = [];

        function maxPetals() {
            // ít hơn để mượt; desktop nhiều hơn mobile
            const base = window.innerWidth < 720 ? 36 : 58;
            const add = Math.floor(window.innerWidth / 40);
            return Math.min(window.innerWidth < 720 ? 50 : 90, base + add);
        }

        function reseed() {
            petals.length = 0;
            const n = maxPetals();
            for (let i = 0; i < n; i++) {
                const sprite = sprites[(Math.random() * sprites.length) | 0];
                petals.push({
                    sprite,
                    x: rand(-40, window.innerWidth + 40),
                    y: rand(-window.innerHeight, window.innerHeight),
                    vx: rand(-0.22, 0.22),
                    vy: rand(0.65, 1.35),
                    sway: rand(0.5, 1.4),
                    phase: rand(0, Math.PI * 2),
                    rot: rand(0, Math.PI * 2),
                    spin: rand(-0.012, 0.012),
                    size: rand(10, 18),
                    a: rand(0.55, 0.95)
                });
            }
        }

        let last = performance.now();
        function tick(now) {
            if (!running) return;

            const dt = Math.min(40, now - last);
            last = now;

            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

            // không blur pass (đỡ lag) — thay bằng opacity + shadow nhẹ
            for (let i = 0; i < petals.length; i++) {
                const p = petals[i];
                p.phase += 0.0012 * dt * p.sway;

                p.x += (p.vx * dt * 0.06) + Math.sin(p.phase) * 0.35;
                p.y += p.vy * dt * 0.06;
                p.rot += p.spin * dt * 0.06;

                if (p.y > window.innerHeight + 40) {
                    p.y = rand(-140, -20);
                    p.x = rand(-40, window.innerWidth + 40);
                }

                ctx.save();
                ctx.globalAlpha = p.a;
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);

                // shadow nhẹ cho “mịn”
                ctx.shadowBlur = 8;
                ctx.shadowColor = "rgba(255,190,120,.18)";

                const s = p.size;
                ctx.drawImage(p.sprite, -s / 2, -s / 2, s, s);

                ctx.restore();
            }

            requestAnimationFrame(tick);
        }

        function resize() {
            ctx = fitCanvas(canvas);
            reseed();
        }

        reseed();
        requestAnimationFrame(tick);

        return {
            stop() { running = false; },
            start() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); } },
            resize
        };
    }

    // =========================
    // FIREWORKS (Dark) - bigger + higher + denser
    // =========================
    function fireworksEngine(canvas) {
        let ctx = fitCanvas(canvas);
        let running = true;

        const rockets = [];
        const sparks = [];
        const flashes = [];

        function hsl(h, s, l, a) {
            return `hsla(${h}, ${s}%, ${l}%, ${a})`;
        }

        function spawnRocket() {
            const x = rand(window.innerWidth * 0.08, window.innerWidth * 0.92);
            const y = window.innerHeight + 30;

            // target cao hơn
            const ty = rand(window.innerHeight * 0.06, window.innerHeight * 0.32);
            const tx = x + rand(-180, 180);

            rockets.push({
                x, y, tx, ty,
                vx: (tx - x) * 0.006,
                vy: -rand(7.4, 10.0),
                hue: rand(0, 360),
                trail: []
            });
        }

        function burst(x, y, hue) {
            // flash nền
            flashes.push({ x, y, a: 0.55, r: rand(90, 160), hue });

            const count = Math.floor(rand(140, 220));   // nổ nhiều hơn
            const base = hue + rand(-25, 25);

            for (let i = 0; i < count; i++) {
                const ang = rand(0, Math.PI * 2);
                const spd = rand(3.2, 10.5);              // to hơn
                const friction = rand(0.982, 0.990);
                sparks.push({
                    x, y,
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd,
                    a: 1,
                    decay: rand(0.010, 0.017),
                    g: rand(0.050, 0.082),
                    hue: base + rand(-40, 40),
                    lw: rand(1.2, 2.8),
                    friction,
                    trail: []
                });
            }

            // core flash
            sparks.push({
                x, y, vx: 0, vy: 0,
                a: 0.95, decay: 0.07, g: 0,
                hue: base, lw: 14,
                friction: 1,
                trail: []
            });
        }

        function drawTrail(trail, color, lw) {
            if (trail.length < 2) return;
            ctx.strokeStyle = color;
            ctx.lineWidth = lw;
            ctx.beginPath();
            ctx.moveTo(trail[0].x, trail[0].y);
            for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].x, trail[i].y);
            ctx.stroke();
        }

        let last = performance.now();
        let timer = 0;

        function tick(now) {
            if (!running) return;

            const dt = Math.min(32, now - last);
            last = now;

            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            ctx.save();
            ctx.globalCompositeOperation = "lighter";

            // spawn dày hơn + theo wave
            timer += dt;

            /* tăng interval => bắn chậm hơn */
            const interval = window.innerWidth < 720 ? 900 : 650;
            if (timer > interval) {
                timer = 0;
                /* giảm wave => ít quả mỗi lần bắn */
                const wave = window.innerWidth < 720 ? 1 : (Math.random() < 0.7 ? 3 : 3);
                for (let i = 0; i < wave; i++) spawnRocket();
            }

            // flashes
            for (let i = flashes.length - 1; i >= 0; i--) {
                const f = flashes[i];
                f.a -= 0.015 * (dt * 0.06);
                f.r += 0.6 * (dt * 0.06);
                if (f.a <= 0) { flashes.splice(i, 1); continue; }

                const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
                g.addColorStop(0, hsl(f.hue, 100, 70, f.a * 0.22));
                g.addColorStop(1, "rgba(0,0,0,0)");
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
                ctx.fill();
            }

            // rockets
            for (let i = rockets.length - 1; i >= 0; i--) {
                const r = rockets[i];
                r.x += r.vx * dt * 0.9;
                r.y += r.vy * dt * 0.20;
                r.vy += 0.012 * dt;

                r.trail.push({ x: r.x, y: r.y });
                if (r.trail.length > 14) r.trail.shift();

                drawTrail(r.trail, hsl(r.hue, 95, 70, 0.35), 2.2);

                ctx.fillStyle = hsl(r.hue, 98, 72, 0.95);
                ctx.beginPath();
                ctx.arc(r.x, r.y, 2.4, 0, Math.PI * 2);
                ctx.fill();

                if (r.y <= r.ty || r.vy >= -0.25) {
                    burst(r.x, r.y, r.hue);
                    rockets.splice(i, 1);
                }
            }

            // sparks
            for (let i = sparks.length - 1; i >= 0; i--) {
                const p = sparks[i];

                p.trail.push({ x: p.x, y: p.y });
                if (p.trail.length > 16) p.trail.shift();

                p.x += p.vx * dt * 0.06;
                p.y += p.vy * dt * 0.06;

                p.vx *= p.friction;
                p.vy *= p.friction;
                p.vy += p.g * dt * 0.06;

                p.a -= p.decay * (dt * 0.06);
                if (p.a <= 0) { sparks.splice(i, 1); continue; }

                drawTrail(p.trail, hsl(p.hue, 100, 70, Math.max(0, p.a * 0.24)), p.lw);

                ctx.fillStyle = hsl(p.hue, 100, 66, Math.max(0, p.a));
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(1.6, p.lw), 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
            requestAnimationFrame(tick);
        }

        function resize() {
            ctx = fitCanvas(canvas);
            rockets.length = 0;
            sparks.length = 0;
            flashes.length = 0;
        }

        requestAnimationFrame(tick);

        return {
            stop() { running = false; },
            start() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); } },
            resize
        };
    }

    // =========================
    // Boot + theme observer
    // =========================
    function boot() {
        const host = ensureFxRoot();

        // tránh tạo trùng canvas khi PJAX reload
        if (host.__tet_inited) return;
        host.__tet_inited = true;

        const petalsCanvas = makeCanvas("tet-petals", host);
        const fwCanvas = makeCanvas("tet-fireworks", host);

        const petals = petalsEngine(petalsCanvas);
        const fireworks = fireworksEngine(fwCanvas);

        function applyTheme() {
            if (isLight()) {
                petals.start();
                fireworks.stop();
            } else {
                petals.stop();
                fireworks.start();
            }
        }

        applyTheme();

        const mo = new MutationObserver(applyTheme);
        mo.observe(rootEl, { attributes: true, attributeFilter: ["data-theme"] });

        window.addEventListener("resize", function () {
            petals.resize();
            fireworks.resize();
        }, { passive: true });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
