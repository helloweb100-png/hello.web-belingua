/* =====================================================================
   beLingua Learning Center · script.js (v2)
   Dependencias por CDN (todas opcionales: sin ellas la página sigue
   siendo legible y funcional, solo pierde las animaciones de scroll):
     · GSAP + ScrollTrigger → preloader, intro y todo el scroll-motion
     · Lenis               → scroll suave
   Cada animación responde a una pregunta concreta (jerarquía, narrativa,
   feedback o cambio de estado); no hay movimiento "porque sí".
   Índice
     01 Utilidades · 02 Preloader · 03 Intro del hero · 04 Lenis + header
     05 Texto y reveal · 06 Scroll-motion (ScrollTrigger) · 07 UI interactiva
     08 Hero: WebGL, partículas, conversación · 09 Init
   ===================================================================== */
(() => {
    'use strict';

    if (window.__revealFallback) clearTimeout(window.__revealFallback);

    /* ---------- 01 · UTILIDADES ---------- */
    const root = document.documentElement;
    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const easeOut = (t) => 1 - Math.pow(1 - t, 4);

    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const hasGSAP = typeof window.gsap !== 'undefined';
    const hasST = hasGSAP && typeof window.ScrollTrigger !== 'undefined';
    const motionOK = hasST && !reduceMotion; // ¿se puede usar scroll-motion?
    const WA_PHONE = '523222914991';          // WhatsApp · Ing. Ángel Carretino (322 291 4991)

    if (hasST) gsap.registerPlugin(ScrollTrigger);
    if (!motionOK) root.classList.add('no-st'); // CSS de respaldo: todo estático y legible

    let lenis = null;
    let heroVisible = true;
    let menuOpen = false;

    const tween = (dur, fn, ease = easeOut) =>
        new Promise((res) => {
            const t0 = performance.now();
            (function step(now) {
                const p = clamp((now - t0) / dur, 0, 1);
                fn(ease(p));
                p < 1 ? requestAnimationFrame(step) : res();
            })(t0);
        });

    /** Un init que falla no tumba al resto. */
    const safe = (fn, name) => {
        try { fn(); } catch (err) { console.warn('[beLingua] ' + (name || fn.name) + ' falló:', err); }
    };

    /** Observa un punto fijo de la página sin usar listeners de scroll. */
    const watchLine = (topPx, cb) => {
        const s = document.createElement('div');
        s.setAttribute('aria-hidden', 'true');
        s.style.cssText = `position:absolute;left:0;top:${topPx};width:1px;height:1px;pointer-events:none;`;
        document.body.prepend(s);
        new IntersectionObserver(([e]) => cb(!e.isIntersecting && e.boundingClientRect.top < 0)).observe(s);
    };

    /* ---------- 02 · PRELOADER ---------- */
    function runPreloader() {
        const pre = $('#preloader');
        if (!pre) return Promise.resolve();
        if (!hasGSAP || reduceMotion) { pre.remove(); return Promise.resolve(); }

        root.classList.add('is-loading');
        if (lenis) lenis.stop();

        const countEl = $('#loader-count');
        const barEl = $('#loader-bar');
        const statusEl = $('#loader-status');
        const logo = $('.preloader__logo');
        const msgs = [[0, 'Iniciando tu experiencia…'], [30, 'Cargando el método CLT…'], [62, 'Preparando tus clases…'], [92, 'Welcome, bienvenido']];
        const state = { v: 0 };
        let lastMsg = -1;

        const paint = () => {
            const v = Math.round(state.v);
            countEl.textContent = v;
            barEl.style.scale = state.v / 100 + ' 1';
            logo.style.setProperty('--p', state.v + '%');
            let idx = 0;
            msgs.forEach((m, i) => { if (v >= m[0]) idx = i; });
            if (idx !== lastMsg) { lastMsg = idx; statusEl.textContent = msgs[idx][1]; }
        };

        const minTime = 2300;
        const ready = Promise.race([
            Promise.all([
                document.readyState === 'complete' ? 1 : new Promise((r) => addEventListener('load', r, { once: true })),
                document.fonts && document.fonts.ready ? document.fonts.ready : 1,
            ]),
            sleep(5000),
        ]);

        return new Promise((resolve) => {
            gsap.to(state, { v: 88, duration: (minTime / 1000) * 0.82, ease: 'power2.out', onUpdate: paint });
            Promise.all([ready, sleep(minTime)]).then(() => {
                gsap.to(state, {
                    v: 100, duration: 0.5, ease: 'power1.inOut', onUpdate: paint,
                    onComplete: () => {
                        pre.classList.add('is-exiting');
                        const tl = gsap.timeline({ onComplete: () => pre.remove() });
                        tl.to('.preloader__core', { opacity: 0, scale: 0.94, y: -24, duration: 0.55, ease: 'power2.in', delay: 0.25 })
                          .to('.preloader__panel--top', { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '-=0.1')
                          .to('.preloader__panel--bottom', { yPercent: 100, duration: 1.1, ease: 'expo.inOut' }, '<')
                          .add(() => resolve(), '-=0.7');
                    },
                });
            });
        });
    }

    /* ---------- 03 · INTRO DEL HERO ---------- */
    function prepareHeroIntro() {
        if (!hasGSAP || reduceMotion) return;
        gsap.set('.site-header__bar', { y: -40, opacity: 0 });
        gsap.set('.hero__eyebrow', { opacity: 0, y: 20 });
        gsap.set('.hero__title .line__in', { yPercent: 118 });
        gsap.set('.hero__lead', { opacity: 0, y: 24 });
        gsap.set('.hero__cta .btn', { opacity: 0, y: 24 });
        gsap.set('.convo-wrap', { opacity: 0, y: 70, scale: 0.9 });
        gsap.set('.orbit', { opacity: 0, scale: 0.7 });
    }

    function playHeroIntro() {
        const gl = $('#hero-gl');
        if (gl) gl.classList.add('is-on');
        if (!hasGSAP || reduceMotion) return;
        const clear = { clearProps: 'opacity,transform' };
        gsap.timeline({ defaults: { ease: 'expo.out' } })
            .to('.site-header__bar', { y: 0, opacity: 1, duration: 1.2, ...clear }, 0)
            .to('.hero__eyebrow', { y: 0, opacity: 1, duration: 1.1, ...clear }, 0.05)
            .to('.hero__title .line__in', { yPercent: 0, duration: 1.5, stagger: 0.14, clearProps: 'transform' }, 0.12)
            .to('.hero__lead', { y: 0, opacity: 1, duration: 1.2, ...clear }, 0.5)
            .to('.hero__cta .btn', { y: 0, opacity: 1, duration: 1.1, stagger: 0.1, ...clear }, 0.62)
            .to('.orbit', { opacity: 1, scale: 1, duration: 2, ease: 'power3.out', ...clear }, 0.1)
            .to('.convo-wrap', { y: 0, opacity: 1, scale: 1, duration: 1.7, ...clear }, 0.3);
    }

    /* ---------- 04 · LENIS + HEADER + NAVEGACIÓN ---------- */
    function initLenis() {
        if (!motionOK || typeof window.Lenis === 'undefined') return;
        lenis = new window.Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), wheelMultiplier: 0.9, smoothWheel: true });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((t) => lenis.raf(t * 1000));
        gsap.ticker.lagSmoothing(0);
    }

    const scrollToY = (y) => (lenis ? lenis.scrollTo(y, { duration: 1.5 }) : scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' }));
    const scrollToTarget = (el) => (lenis ? lenis.scrollTo(el, { duration: 1.6 }) : el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }));

    function initHeader() {
        const header = $('#header');
        const progress = $('#progress span');
        const dots = $('#dots');

        // Estado del header y barra de progreso
        if (motionOK) {
            ScrollTrigger.create({
                start: 0, end: 'max',
                onUpdate: (self) => {
                    const y = self.scroll();
                    progress.style.scale = self.progress.toFixed(4) + ' 1';
                    header.classList.toggle('is-scrolled', y > 30);
                    if (dots) dots.classList.toggle('is-on', y > innerHeight * 0.55);
                    if (!menuOpen) {
                        if (self.direction === 1 && y > 500) header.classList.add('is-hidden');
                        else if (self.direction === -1) header.classList.remove('is-hidden');
                    }
                },
            });
        } else {
            watchLine('30px', (past) => header.classList.toggle('is-scrolled', past));
            watchLine('55vh', (past) => dots && dots.classList.toggle('is-on', past));
            progress.parentElement.hidden = true;
        }

        // Menú móvil
        const burger = $('#burger');
        const menu = $('#mobile-menu');
        menu.setAttribute('data-lenis-prevent', '');
        const setMenu = (open) => {
            menuOpen = open;
            burger.setAttribute('aria-expanded', String(open));
            burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
            menu.classList.toggle('is-open', open);
            menu.setAttribute('aria-hidden', String(!open));
            document.body.classList.toggle('menu-open', open);
            header.classList.remove('is-hidden');
            if (lenis) open ? lenis.stop() : lenis.start();
            else document.body.style.overflow = open ? 'hidden' : '';
        };
        burger.addEventListener('click', () => setMenu(!menuOpen));
        addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); } });
        matchMedia('(min-width: 1024px)').addEventListener('change', (m) => { if (m.matches && menuOpen) setMenu(false); });

        // Anclas con scroll suave
        document.addEventListener('click', (e) => {
            const a = e.target.closest('a[href^="#"]');
            if (!a) return;
            const id = a.getAttribute('href');
            const target = id.length > 1 ? $(id) : root;
            if (!target) return;
            e.preventDefault();
            if (menuOpen) setMenu(false);
            if (id.length > 1) history.replaceState(null, '', id);
            target === root ? scrollToY(0) : scrollToTarget(target);
        });
        const toTop = $('#to-top');
        if (toTop) toTop.addEventListener('click', () => scrollToY(0));

        // Botón flotante de WhatsApp: aparece tras el preloader y saluda una vez
        const wa = $('#wa-float');
        if (wa) {
            setTimeout(() => wa.classList.add('is-on'), 600);
            setTimeout(() => { wa.classList.add('show-tip'); setTimeout(() => wa.classList.remove('show-tip'), 4200); }, 7000);
        }

        // Qué sección se está viendo → nav y puntos laterales
        const links = $$('[data-spy]');
        const dotLinks = $$('[data-dot]');
        const io = new IntersectionObserver((entries) => {
            entries.forEach((en) => {
                if (!en.isIntersecting) return;
                const id = en.target.dataset.section;
                links.forEach((l) => l.classList.toggle('is-active', l.dataset.spy === id));
                dotLinks.forEach((d) => d.classList.toggle('is-active', d.dataset.dot === id));
            });
        }, { rootMargin: '-42% 0px -55% 0px' });
        $$('[data-section]').forEach((s) => io.observe(s));
    }

    /* ---------- 05 · TEXTO Y REVEAL ---------- */
    /** Titulares: cada palabra sube desde una máscara al entrar en pantalla. */
    function splitHeadings() {
        $$('[data-split]').forEach((el) => {
            const text = el.textContent.trim().replace(/\s+/g, ' ');
            el.setAttribute('aria-label', text);
            el.textContent = '';
            text.split(' ').forEach((w, i, arr) => {
                const outer = document.createElement('span');
                outer.className = 'word';
                outer.setAttribute('aria-hidden', 'true');
                const inner = document.createElement('span');
                inner.className = 'word__in';
                inner.style.setProperty('--i', i);
                inner.textContent = w;
                outer.appendChild(inner);
                el.appendChild(outer);
                if (i < arr.length - 1) el.appendChild(document.createTextNode(' '));
            });
        });
    }

    /** Envuelve cada palabra del párrafo del problema (respeta <mark>). */
    function wrapScrubWords() {
        const el = $('[data-scrub-words]');
        if (!el) return;
        const wrap = (node) => {
            Array.from(node.childNodes).forEach((n) => {
                if (n.nodeType === 3) {
                    const frag = document.createDocumentFragment();
                    n.textContent.split(/(\s+)/).forEach((tok) => {
                        if (!tok) return;
                        if (/^\s+$/.test(tok)) return frag.appendChild(document.createTextNode(' '));
                        const s = document.createElement('span');
                        s.className = 'sw';
                        s.textContent = tok;
                        frag.appendChild(s);
                    });
                    n.replaceWith(frag);
                } else if (n.nodeType === 1) wrap(n);
            });
        };
        wrap(el);
    }

    const fmt = { money: (n) => Math.round(n).toLocaleString('es-MX'), int: (n) => String(Math.round(n)) };

    /** Reveal por IntersectionObserver (estado, no scrub) + precios que cuentan. */
    function initReveal() {
        const counted = new WeakSet();
        const rows = $('.timeline__rows');
        if (rows && !reduceMotion) rows.style.setProperty('--grow', 0);

        const run = (scope) => {
            $$('.plan [data-count]', scope).forEach((el) => {
                if (counted.has(el)) return;
                counted.add(el);
                if (reduceMotion) return;
                const target = parseFloat(el.dataset.count);
                const f = fmt[el.dataset.format] || fmt.int;
                tween(1900, (p) => { el.textContent = f(target * p); });
            });
            if (scope.classList && scope.classList.contains('timeline') && rows) rows.style.setProperty('--grow', 1);
        };

        const io = new IntersectionObserver((entries) => {
            entries.forEach((en) => {
                if (!en.isIntersecting) return;
                const el = en.target;
                el.classList.add('in');
                io.unobserve(el);
                run(el);
                if (el.hasAttribute('data-reveal')) {
                    const d = parseFloat(getComputedStyle(el).getPropertyValue('--d')) || 0;
                    setTimeout(() => el.removeAttribute('data-reveal'), 1250 + d * 110); // libera transiciones propias (hover)
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
        $$('[data-reveal], [data-split], .timeline').forEach((el) => io.observe(el));
    }

    /* ---------- 06 · SCROLL-MOTION (ScrollTrigger) ---------- */

    /** Hero: al bajar, el contenido cede el protagonismo (jerarquía). */
    function initHeroScroll() {
        gsap.timeline({ scrollTrigger: { trigger: '#inicio', start: 'top top', end: 'bottom top', scrub: true } })
            .to('.hero__copy', { yPercent: -12, opacity: 0, ease: 'none' }, 0)
            .to('.hero__visual', { yPercent: -20, scale: 0.9, opacity: 0.15, ease: 'none' }, 0)
            .to('.hero__floor', { yPercent: 25, ease: 'none' }, 0);
    }

    /** Cinta: avanza sola y se acelera, invierte y se inclina según el scroll (velocidad y dirección). */
    function initTicker() {
        const track = $('#ticker-track');
        if (!track) return;
        root.classList.add('js-ticker');
        const row = track.parentElement;
        let x = 0, dir = -1, boost = 0, skew = 0, skewTarget = 0, visible = true;
        new IntersectionObserver((e) => { visible = e[0].isIntersecting; }, { rootMargin: '200px' }).observe(row);

        ScrollTrigger.create({
            start: 0, end: 'max',
            onUpdate: (self) => {
                dir = self.direction === 1 ? -1 : 1;
                const v = self.getVelocity();
                boost = Math.min(Math.abs(v) / 350, 14);
                skewTarget = clamp(v / -300, -9, 9);
            },
        });
        gsap.ticker.add(() => {
            if (!visible) return;
            boost *= 0.93;
            skewTarget *= 0.9;
            skew = lerp(skew, skewTarget, 0.12);
            x += dir * (0.6 + boost);
            const half = track.scrollWidth / 2;
            if (x <= -half) x += half;
            if (x >= 0) x -= half;
            track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
            row.style.transform = Math.abs(skew) > 0.02 ? `skewX(${skew.toFixed(2)}deg)` : '';
        });
    }

    /** El problema: la frase se ilumina palabra por palabra; lo viejo se tacha, lo nuevo se enciende. */
    function initManifesto() {
        const words = $$('.sw');
        if (words.length) {
            gsap.to(words, { opacity: 1, ease: 'none', stagger: 0.12, scrollTrigger: { trigger: '#manifesto-text', start: 'top 82%', end: 'bottom 52%', scrub: true } });
        }
        const st = { trigger: '.versus', scrub: true };
        gsap.to('.strike', { '--s': '100%', ease: 'none', stagger: 0.4, scrollTrigger: { ...st, start: 'top 80%', end: 'top 40%' } });
        gsap.from('.versus__col--new li', { opacity: 0.2, x: 26, ease: 'none', stagger: 0.3, scrollTrigger: { ...st, start: 'top 74%', end: 'top 30%' } });
        gsap.from('.versus__vs', { scale: 0.3, opacity: 0, ease: 'back.out(2)', scrollTrigger: { ...st, start: 'top 80%', end: 'top 55%' } });
    }

    /** Cifras: el anillo y el número avanzan con el scroll. */
    function initStats() {
        $$('.stat').forEach((stat) => {
            const arc = $('.stat__arc', stat);
            const num = $('[data-count]', stat);
            const target = parseFloat(num.dataset.count);
            const suffix = num.dataset.suffix || '';
            arc.style.setProperty('--p', 0);
            num.textContent = '0' + suffix;
            ScrollTrigger.create({
                trigger: stat, start: 'top 90%', end: 'top 50%', scrub: true,
                onUpdate: (self) => {
                    arc.style.setProperty('--p', (self.progress * 100).toFixed(1));
                    num.textContent = Math.round(target * self.progress) + suffix;
                },
            });
        });
    }

    /** Video: el marco crece desde pequeño hasta ocupar todo el ancho. */
    function initFilm() {
        gsap.fromTo('#film-frame', { scale: 0.72, yPercent: 4 }, { scale: 1, yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.film__stage', start: 'top 94%', end: 'top 26%', scrub: true } });
        gsap.fromTo('.film__screen', { borderRadius: 56 }, { borderRadius: 28, ease: 'none', scrollTrigger: { trigger: '.film__stage', start: 'top 94%', end: 'top 26%', scrub: true } });
    }

    /** Método: la sesión avanza paso a paso mientras se hace scroll (la etapa se queda fija). */
    function initMethod() {
        const track = $('#method-track');
        if (!track) return;
        const steps = $$('.mstep');
        const scenes = $$('.scene');
        const pips = $$('.sim__pip');
        const sim = $('#sim');
        const badge = $('#sim-badge');
        const bar = $('#method-progress');
        let current = -1;

        const setStep = (i) => {
            if (i === current) return;
            current = i;
            steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
            scenes.forEach((s, k) => s.classList.toggle('is-active', k === i));
            pips.forEach((s, k) => s.classList.toggle('is-active', k === i));
            sim.dataset.step = i;
            badge.textContent = i + 1 + ' / 4';
        };
        setStep(0);

        ScrollTrigger.create({
            trigger: track, start: 'top top', end: 'bottom bottom',
            onUpdate: (self) => { bar.style.scale = self.progress.toFixed(4) + ' 1'; setStep(clamp(Math.floor(self.progress * 4), 0, 3)); },
        });
        gsap.fromTo(sim, { scale: 0.93, rotationX: 6, transformPerspective: 1200, opacity: 0.6 }, { scale: 1, rotationX: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: track, start: 'top 90%', end: 'top 20%', scrub: true } });

        steps.forEach((el, i) => el.addEventListener('click', () => {
            const total = track.offsetHeight - innerHeight;
            scrollToY(scrollY + track.getBoundingClientRect().top + total * ((i + 0.5) / 4));
        }));
    }

    /** Niveles: la sección se fija y el scroll vertical recorre una ruta horizontal; un trazo se dibuja y activa cada nivel. */
    function initJourney() {
        const pin = $('#journey'), rail = $('#journey-rail'), svg = $('#journey-svg');
        if (!pin || !rail || !svg) return;
        const base = $('#journey-base'), prog = $('#journey-prog'), trav = $('#journey-trav'), grad = $('#journey-grad'), bar = $('#journey-bar');
        const stops = $$('.stop', rail);
        const markers = stops.map((s) => $('.stop__marker', s));
        let total = 0, dist = 0, stopAt = [];

        const build = () => {
            rail.style.transform = 'none';
            const rw = rail.offsetWidth, rh = rail.offsetHeight;
            svg.setAttribute('width', rw); svg.setAttribute('height', rh); svg.setAttribute('viewBox', `0 0 ${rw} ${rh}`);
            // offsetLeft/Top ignoran transforms: la ruta no depende del estado visual de cada tarjeta
            const pts = stops.map((s, i) => [s.offsetLeft + markers[i].offsetLeft + markers[i].offsetWidth / 2, s.offsetTop + markers[i].offsetTop + markers[i].offsetHeight / 2]);
            const pad = Math.min(90, pts[0][0]);
            const all = [[pts[0][0] - pad, pts[0][1]], ...pts, [pts[pts.length - 1][0] + pad, pts[pts.length - 1][1]]];
            let d = `M${all[0][0]},${all[0][1]}`;
            for (let i = 1; i < all.length; i++) {
                const [x0, y0] = all[i - 1], [x1, y1] = all[i], cx = (x0 + x1) / 2;
                d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
            }
            base.setAttribute('d', d); prog.setAttribute('d', d);
            total = prog.getTotalLength();
            prog.style.strokeDasharray = total;
            grad.setAttribute('x1', 0); grad.setAttribute('x2', rw);
            stopAt = pts.map(([px]) => { let lo = 0, hi = total; for (let k = 0; k < 22; k++) { const mid = (lo + hi) / 2; prog.getPointAtLength(mid).x < px ? (lo = mid) : (hi = mid); } return lo / total; });
            dist = Math.max(0, rw - innerWidth);
        };

        const update = (p) => {
            prog.style.strokeDashoffset = total * (1 - p);
            const pt = prog.getPointAtLength(total * p);
            trav.setAttribute('transform', `translate(${pt.x},${pt.y})`);
            rail.style.transform = `translate3d(${(-dist * p).toFixed(1)}px,0,0)`;
            bar.style.scale = p.toFixed(4) + ' 1';
            stops.forEach((s, i) => s.classList.toggle('is-on', i === 0 || p >= stopAt[i] - 0.035));
        };

        build();
        ScrollTrigger.create({
            trigger: pin, start: 'top top', pin: true, anticipatePin: 1, invalidateOnRefresh: true,
            end: () => '+=' + Math.round(Math.max(dist * 1.15, innerHeight * 0.8)),
            onRefreshInit: build,
            onRefresh: (self) => update(self.progress),
            onUpdate: (self) => update(self.progress),
        });
    }

    /** Fotos del bento: se desplazan más despacio que la tarjeta (profundidad). */
    function initBentoParallax() {
        $$('.bento__img').forEach((img) => {
            gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
        });
    }

    /** Historia: la línea se dibuja con el scroll y enciende cada hito al llegar. */
    function initStory() {
        const tv = $('#tv');
        if (!tv) return;
        const line = $('.tv__line', tv);
        const items = $$('.tv__item', tv);
        ScrollTrigger.create({
            trigger: tv, start: 'top 72%', end: 'bottom 62%', scrub: true,
            onUpdate: (self) => {
                const p = self.progress, h = tv.offsetHeight;
                line.style.setProperty('--tp', p.toFixed(4));
                items.forEach((it) => it.classList.toggle('is-on', p >= (it.offsetTop + 22) / h - 0.01));
            },
        });
        const wide = matchMedia('(min-width: 900px)').matches;
        items.forEach((it, i) => {
            gsap.from($('.tv__body', it), {
                opacity: 0, y: wide ? 30 : 40, x: wide ? (i % 2 === 0 ? -40 : 40) : 0, duration: 1, ease: 'power3.out',
                scrollTrigger: { trigger: it, start: 'top 82%', toggleActions: 'play none none none' },
            });
        });
    }

    /** Planes: las barras de duración se dibujan con el scroll (12 vs 24 meses). */
    function initPace() {
        gsap.fromTo('.pace__line i', { scaleX: 0 }, { scaleX: 1, ease: 'none', stagger: 0.3, scrollTrigger: { trigger: '#pace', start: 'top 88%', end: 'top 48%', scrub: true } });
    }

    /** Hojas apiladas: al llegar la siguiente, la sección anterior se aleja y se atenúa. */
    function initSheets() {
        $$('.sheet').forEach((sheet) => {
            const prev = sheet.previousElementSibling;
            const target = prev && (prev.querySelector('.finder') || prev.querySelector('.container'));
            if (!target) return;
            gsap.to(target, { scale: 0.95, opacity: 0.45, transformOrigin: '50% 100%', ease: 'none', scrollTrigger: { trigger: sheet, start: 'top bottom', end: 'top 25%', scrub: true } });
        });
    }

    /** Parallax genérico para manchas de luz y fondos decorativos. */
    function initParallaxY() {
        $$('[data-parallax-y]').forEach((el) => {
            const v = parseFloat(el.dataset.parallaxY) || 0;
            gsap.fromTo(el, { y: -v / 2 }, { y: v / 2, ease: 'none', scrollTrigger: { trigger: el.closest('section') || el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
        });
    }

    /** Footer tipo telón: queda fijo y "Contacto" se levanta para revelarlo (si cabe en pantalla). */
    function initFooterReveal() {
        const footer = $('#footer');
        const giant = $('#footer-giant');
        const main = $('#main');
        if (!footer || !main) return;
        let fixed = false;

        const sync = () => {
            root.classList.remove('footer-fixed');
            root.style.setProperty('--footer-h', '0px');
            const h = footer.offsetHeight;
            fixed = h <= innerHeight * 0.92 && innerWidth >= 900;
            if (fixed) { root.classList.add('footer-fixed'); root.style.setProperty('--footer-h', h + 'px'); }
        };
        sync();

        const trigger = ScrollTrigger.create({
            trigger: fixed ? main : footer,
            start: () => (fixed ? 'bottom bottom' : 'top bottom'),
            end: () => (fixed ? 'bottom bottom-=' + footer.offsetHeight : 'bottom bottom'),
            scrub: true,
            invalidateOnRefresh: true,
            onRefreshInit: sync,
            animation: gsap.timeline({ defaults: { ease: 'none' } })
                .fromTo(giant, { yPercent: 35, opacity: 0.2 }, { yPercent: 0, opacity: 1 }, 0)
                .fromTo('.footer__top', { y: 40, opacity: 0.35 }, { y: 0, opacity: 1 }, 0),
        });
        // si cambia el layout (rotar el móvil, redimensionar) se recalcula
        new ResizeObserver(() => ScrollTrigger.refresh()).observe(footer);
        return trigger;
    }

    /* ---------- 07 · UI INTERACTIVA ---------- */
    /** ¿Dónde empiezo? Orienta al visitante y prepara el mensaje de WhatsApp. */
    function initFinder() {
        const opts = $$('input[name="lvl"]');
        if (!opts.length) return;
        const card = $('#finder-card'), empty = $('#finder-empty');
        const code = $('#finder-code'), name = $('#finder-name'), text = $('#finder-text'), cta = $('#finder-cta');
        const LV = {
            A1: ['Concepts', 'Empiezas en A1: inducción al idioma, con frases muy básicas y cotidianas.'],
            A2: ['Notions', 'Tu punto de partida es A2: comunicación personal, familiar y laboral básica, con un discurso lento y claro.'],
            B1: ['Communicator', 'Tu punto de partida es B1: hablas de temas comunes del trabajo, la escuela o los viajes con un discurso claro.'],
            B2: ['Expert', 'Tu punto de partida es B2: discurso prolongado sobre temas abstractos y textos más largos.'],
        };
        opts.forEach((o) => o.addEventListener('change', () => {
            const [n, t] = LV[o.value];
            code.textContent = o.value;
            name.textContent = 'Nivel ' + o.value + ' · ' + n;
            text.textContent = t;
            cta.href = `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(`Hola beLingua, creo que mi nivel de inglés es ${o.value} (${n}). ¿Me ayudan a confirmarlo?`)}`;
            empty.hidden = true;
            card.hidden = false;
            card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
        }));
    }

    /** Horarios: "Abierto ahora" calculado con la hora de Puerto Vallarta. */
    function initSchedule() {
        const statusEl = $('#open-status');
        if (!statusEl) return;
        const text = $('.status__text', statusEl);
        const nowLine = $('#timeline-now');
        const rows = $('.timeline__rows');
        const WEEK = [[7 * 60, 13 * 60], [16 * 60, 21 * 60]];
        const SAT = [[8 * 60, 15 * 60]];
        const slotsFor = (d) => (d === 0 ? [] : d === 6 ? SAT : WEEK);
        const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        const DAY_IDX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
        const clock = (mins) => { const h = Math.floor(mins / 60), m = mins % 60; return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`; };

        const pvNow = () => {
            const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
            const get = (t) => parts.find((p) => p.type === t).value;
            return { day: DAY_IDX[get('weekday')], mins: (+get('hour') % 24) * 60 + +get('minute') };
        };

        const update = () => {
            const { day, mins } = pvNow();
            $$('.timeline__row').forEach((r) => r.classList.toggle('is-today', r.dataset.days.split(',').map(Number).includes(day)));
            const slots = slotsFor(day);
            const cur = slots.find(([a, b]) => mins >= a && mins < b);
            statusEl.classList.toggle('is-open', !!cur);
            statusEl.classList.toggle('is-closed', !cur);
            if (cur) text.textContent = `Abierto ahora, cerramos a las ${clock(cur[1])}`;
            else {
                const next = slots.find(([a]) => a > mins);
                if (next) text.textContent = `Cerrado por ahora, abrimos hoy a las ${clock(next[0])}`;
                else {
                    let d = 1;
                    while (!slotsFor((day + d) % 7).length) d++;
                    const nd = (day + d) % 7;
                    text.textContent = `Cerrado, abrimos ${d === 1 ? 'mañana' : 'el ' + DAYS[nd]} a las ${clock(slotsFor(nd)[0][0])}`;
                }
            }
            const f = (mins - 7 * 60) / (14 * 60);
            rows.style.setProperty('--f', clamp(f, 0, 1).toFixed(4));
            nowLine.classList.toggle('is-on', day !== 0 && f >= 0 && f <= 1);
        };
        update();
        setInterval(update, 30000);
    }

    function initFaq() {
        const items = $$('.faq__item');
        const set = (item, open) => { item.classList.toggle('is-open', open); $('.faq__q', item).setAttribute('aria-expanded', String(open)); };
        items.forEach((item) => {
            $('.faq__q', item).addEventListener('click', () => {
                const wasOpen = item.classList.contains('is-open');
                items.forEach((o) => set(o, false));
                set(item, !wasOpen);
            });
        });
        if (items[0]) set(items[0], true);
    }

    function initVideo() {
        const video = $('#film-video');
        const btn = $('#film-play');
        const screen = $('.film__screen');
        if (!video || !btn) return;
        btn.addEventListener('click', () => { video.controls = true; video.play().catch(() => { video.controls = true; }); });
        video.addEventListener('play', () => screen.classList.add('is-playing'));
        video.addEventListener('ended', () => { screen.classList.remove('is-playing'); video.controls = false; video.currentTime = 0; });
        new IntersectionObserver((e) => { if (!e[0].isIntersecting && !video.paused) video.pause(); }, { threshold: 0.15 }).observe(video);
    }

    /** Formulario: valida en línea y abre WhatsApp con el mensaje armado. */
    function initForm() {
        const form = $('#contact-form');
        if (!form) return;
        const status = $('#form-status');
        const rules = {
            name: { el: $('#cf-name'), err: $('#cf-name-err'), test: (v) => v.trim().length >= 2, msg: 'Escribe tu nombre (mínimo 2 letras).' },
            level: { el: $('#cf-level'), err: $('#cf-level-err'), test: (v) => !!v, msg: 'Elige tu nivel de inglés.' },
            plan: { el: $('#cf-plan'), err: $('#cf-plan-err'), test: (v) => !!v, msg: 'Elige el plan que te interesa.' },
        };
        const check = (r) => {
            const ok = r.test(r.el.value);
            r.el.closest('.field').classList.toggle('has-error', !ok);
            r.err.textContent = ok ? '' : r.msg;
            r.el.setAttribute('aria-invalid', String(!ok));
            return ok;
        };
        Object.values(rules).forEach((r) => {
            const live = () => r.el.closest('.field').classList.contains('has-error') && check(r);
            r.el.addEventListener('input', live);
            r.el.addEventListener('change', live);
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            status.className = 'form__status';
            const valid = Object.values(rules).map(check).every(Boolean);
            if (!valid) {
                status.textContent = 'Revisa los campos marcados para continuar.';
                status.classList.add('is-err');
                const first = Object.values(rules).find((r) => r.el.closest('.field').classList.contains('has-error'));
                if (first) first.el.focus();
                return;
            }
            const data = new FormData(form);
            const lines = [
                'Hola beLingua.',
                `Soy *${data.get('name').trim()}* y quiero informes para estudiar inglés.`,
                '',
                `- Mi nivel: ${data.get('level')}`,
                `- Plan de interés: ${data.get('plan')}`,
            ];
            if (data.get('time')) lines.push(`- Horario preferido: ${data.get('time')}`);
            const msg = (data.get('message') || '').trim();
            if (msg) lines.push(`- Mi objetivo: "${msg}"`);
            lines.push('', '¿Me pueden compartir horarios, becas y cómo inscribirme?');

            const url = `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(lines.join('\n'))}`;
            const w = window.open(url, '_blank');
            if (w) w.opener = null; else location.href = url;
            status.textContent = 'Listo. Abrimos WhatsApp con tu mensaje para que lo envíes.';
            status.classList.add('is-ok');
        });
    }

    /** Resplandor que sigue al cursor dentro de las tarjetas del bento. */
    function initSpotlight() {
        if (!finePointer) return;
        $$('.spot').forEach((el) => {
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                el.style.setProperty('--mx', e.clientX - r.left + 'px');
                el.style.setProperty('--my', e.clientY - r.top + 'px');
            });
        });
    }

    /** Botones magnéticos y parallax del hero con el mouse (solo punteros finos). */
    function initPointerFX() {
        if (!finePointer || reduceMotion) return;
        $$('[data-magnetic]').forEach((el) => {
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                el.style.translate = `${((e.clientX - (r.left + r.width / 2)) * 0.22).toFixed(1)}px ${((e.clientY - (r.top + r.height / 2)) * 0.3).toFixed(1)}px`;
            });
            el.addEventListener('pointerleave', () => { el.style.translate = ''; });
        });

        const layers = $$('[data-parallax]');
        const m = { nx: 0, ny: 0, px: 0, py: 0 };
        addEventListener('pointermove', (e) => { m.nx = (e.clientX / innerWidth - 0.5) * 2; m.ny = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
        const frame = () => {
            requestAnimationFrame(frame);
            if (!heroVisible) return;
            m.px = lerp(m.px, m.nx, 0.06);
            m.py = lerp(m.py, m.ny, 0.06);
            layers.forEach((l) => {
                const k = parseFloat(l.dataset.parallax) || 1;
                l.style.translate = `${(m.px * k * -14).toFixed(2)}px ${(m.py * k * -14).toFixed(2)}px`;
            });
        };
        requestAnimationFrame(frame);
    }

    /* ---------- 08 · HERO: WEBGL · PARTÍCULAS · CONVERSACIÓN ---------- */
    function initHeroObserver() {
        new IntersectionObserver((e) => { heroVisible = e[0].isIntersecting; }).observe($('#inicio'));
    }

    function initWaves() {
        $$('.wave[data-bars]').forEach((w) => {
            const n = +w.dataset.bars;
            for (let i = 0; i < n; i++) {
                const b = document.createElement('i');
                b.style.setProperty('--i', i);
                b.style.setProperty('--t', (0.7 + Math.random() * 0.9).toFixed(2) + 's');
                w.appendChild(b);
            }
        });
    }

    /** Shader WebGL: aurora fluida azul y naranja que reacciona al mouse. */
    function initHeroGL() {
        const canvas = $('#hero-gl');
        if (!canvas || reduceMotion) return;
        const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
        if (!gl) return;

        const vert = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
        const frag = `
            #ifdef GL_FRAGMENT_PRECISION_HIGH
            precision highp float;
            #else
            precision mediump float;
            #endif
            uniform vec2 u_res; uniform float u_time; uniform vec2 u_mouse;
            float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
            float noise(vec2 p){
                vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
                return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
            }
            float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++){ v += a * noise(p); p = p * 2.03 + 11.7; a *= .5; } return v; }
            void main(){
                vec2 uv = gl_FragCoord.xy / u_res;
                vec2 p = (gl_FragCoord.xy - .5 * u_res) / min(u_res.x, u_res.y);
                float t = u_time * .055;
                vec2 m = (u_mouse - .5) * .5;
                vec2 q = vec2(fbm(p * 1.3 + t), fbm(p * 1.3 - t + 5.2));
                vec2 r = vec2(fbm(p * 1.5 + 3. * q + vec2(1.7, 9.2) + .8 * t + m), fbm(p * 1.5 + 3. * q + vec2(8.3, 2.8) - .6 * t));
                float f = fbm(p * 1.2 + 3. * r);
                vec3 navy   = vec3(.012, .03, .14);
                vec3 blue   = vec3(.08, .25, .95);
                vec3 sky    = vec3(.35, .6, 1.);
                vec3 orange = vec3(1., .33, .02);
                vec3 col = mix(navy, blue, smoothstep(.2, .9, f) * .85);
                col = mix(col, sky, smoothstep(.62, 1., f * length(q)) * .55);
                float side = smoothstep(-.35, .75, p.x * .9 - p.y * .55);
                float glow = smoothstep(.35, 1., length(r)) * smoothstep(.3, .85, f);
                col = mix(col, orange, clamp(glow * side * 1.15, 0., .85));
                col += orange * .22 * pow(smoothstep(.55, 0., distance(uv, vec2(.92, .06))), 2.);
                col *= .86 + .14 * smoothstep(.0, .7, uv.y);
                col *= smoothstep(1.25, .2, distance(uv, vec2(.5, .55)));
                gl_FragColor = vec4(col, 1.);
            }`;

        const mk = (type, src) => {
            const s = gl.createShader(type);
            gl.shaderSource(s, src);
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
            return s;
        };
        const vs = mk(gl.VERTEX_SHADER, vert);
        const fs = mk(gl.FRAGMENT_SHADER, frag);
        if (!vs || !fs) return;
        const prog = gl.createProgram();
        gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
        gl.useProgram(prog);

        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, 'p');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        const uRes = gl.getUniformLocation(prog, 'u_res');
        const uTime = gl.getUniformLocation(prog, 'u_time');
        const uMouse = gl.getUniformLocation(prog, 'u_mouse');

        const scale = finePointer ? 0.5 : 0.36;
        const resize = () => {
            canvas.width = Math.max(2, Math.floor(canvas.clientWidth * scale));
            canvas.height = Math.max(2, Math.floor(canvas.clientHeight * scale));
            gl.viewport(0, 0, canvas.width, canvas.height);
        };
        resize();
        addEventListener('resize', resize);

        const t0 = performance.now();
        let mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5;
        addEventListener('pointermove', (e) => { tx = e.clientX / innerWidth; ty = 1 - e.clientY / innerHeight; }, { passive: true });
        const draw = (now) => {
            requestAnimationFrame(draw);
            if (!heroVisible || document.hidden) return;
            mx = lerp(mx, tx, 0.04); my = lerp(my, ty, 0.04);
            gl.uniform2f(uRes, canvas.width, canvas.height);
            gl.uniform1f(uTime, (now - t0) / 1000);
            gl.uniform2f(uMouse, mx, my);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        };
        requestAnimationFrame(draw);
    }

    /** Constelación de partículas interactiva. */
    function initParticles() {
        const canvas = $('#hero-particles');
        const hero = $('#inicio');
        if (!canvas || reduceMotion) return;
        const ctx = canvas.getContext('2d');
        let W = 0, H = 0, ps = [];
        const mouse = { x: -999, y: -999 };

        const resize = () => {
            const dpr = Math.min(devicePixelRatio || 1, 2);
            W = hero.clientWidth; H = hero.clientHeight;
            canvas.width = W * dpr; canvas.height = H * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const n = clamp(Math.round((W * H) / 15500), 28, 100);
            ps = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35, r: Math.random() * 1.8 + 0.6, hot: Math.random() < 0.28 }));
        };
        resize();
        addEventListener('resize', resize);
        hero.addEventListener('pointermove', (e) => { const r = hero.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; }, { passive: true });
        hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });

        const LINK = finePointer ? 125 : 95;
        const loop = () => {
            requestAnimationFrame(loop);
            if (!heroVisible || document.hidden) return;
            ctx.clearRect(0, 0, W, H);
            for (const p of ps) {
                const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
                if (d2 < 19600) { const d = Math.sqrt(d2) || 1, f = (140 - d) / 140; p.vx += (dx / d) * f * 0.05; p.vy += (dy / d) * f * 0.05; }
                p.vx *= 0.992; p.vy *= 0.992; p.x += p.vx; p.y += p.vy;
                if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
                if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
            }
            for (let i = 0; i < ps.length; i++) {
                const a = ps[i];
                for (let j = i + 1; j < ps.length; j++) {
                    const b = ps[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
                    if (d2 < LINK * LINK) {
                        const o = (1 - Math.sqrt(d2) / LINK) * 0.28;
                        ctx.strokeStyle = a.hot || b.hot ? `rgba(255,122,43,${o})` : `rgba(150,185,255,${o})`;
                        ctx.lineWidth = 0.7;
                        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                    }
                }
            }
            for (const p of ps) {
                ctx.fillStyle = p.hot ? 'rgba(255,138,61,.95)' : 'rgba(190,212,255,.85)';
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
            }
        };
        requestAnimationFrame(loop);
    }

    /** Simulador de conversación del hero: practica inglés en bucle. */
    function initConvo() {
        const body = $('#convo-body');
        const levelEl = $('#convo-level');
        if (!body) return;
        const scripts = [
            { level: 'Level A1 · Introductions', lines: [['t', "Hi! What's your name?"], ['y', 'My name is Ana. Nice to meet you!'], ['t', 'Nice to meet you, Ana! Where do you live?'], ['y', 'I live in Puerto Vallarta.']] },
            { level: 'Level B1 · Daily life', lines: [['t', 'What did you do last weekend?'], ['y', 'I went to the beach with my family.'], ['t', 'Sounds great! Did you speak English?'], ['y', "Yes! And I didn't translate in my head."]] },
            { level: 'Level C1 · Business', lines: [['t', 'How would you describe our new strategy?'], ['y', 'Bold, scalable and customer-driven.'], ['t', 'Perfect. Can you present it on Monday?'], ['y', "Absolutely. I'll have it ready."]] },
        ];
        const add = (who, text) => {
            const m = document.createElement('div');
            m.className = 'msg msg--' + who;
            m.textContent = text;
            body.appendChild(m);
            while (body.children.length > 4) body.firstElementChild.remove();
        };
        const typing = (who) => {
            const m = document.createElement('div');
            m.className = 'msg msg--' + who + ' msg--typing';
            m.innerHTML = '<i></i><i></i><i></i>';
            body.appendChild(m);
            return m;
        };
        const whenVisible = async () => { while (!heroVisible || document.hidden) await sleep(400); };

        if (reduceMotion) { levelEl.textContent = scripts[0].level; scripts[0].lines.forEach(([w, t]) => add(w, t)); return; }
        (async () => {
            await sleep(2600);
            for (let i = 0; ; i = (i + 1) % scripts.length) {
                levelEl.textContent = scripts[i].level;
                for (const [who, text] of scripts[i].lines) {
                    await whenVisible();
                    const dots = typing(who);
                    await sleep(who === 't' ? 950 : 1150);
                    dots.remove();
                    add(who, text);
                    await sleep(1500);
                }
                await sleep(2200);
                $$('.msg', body).forEach((m) => m.classList.add('is-out'));
                await sleep(550);
                body.innerHTML = '';
            }
        })();
    }

    /* ---------- 09 · INIT ---------- */
    function boot() {
        const year = $('#year');
        if (year) year.textContent = new Date().getFullYear();

        safe(initLenis, 'lenis');
        safe(splitHeadings, 'split');
        safe(wrapScrubWords, 'words');
        safe(initWaves, 'waves');
        safe(prepareHeroIntro, 'hero-prep');
        safe(initHeroObserver, 'hero-io');
        safe(initHeader, 'header');
        safe(initReveal, 'reveal');
        safe(initFinder, 'finder');
        safe(initSchedule, 'schedule');
        safe(initFaq, 'faq');
        safe(initVideo, 'video');
        safe(initForm, 'form');
        safe(initSpotlight, 'spotlight');
        safe(initPointerFX, 'pointer');

        if (motionOK) {
            safe(initHeroScroll, 'hero-scroll');
            safe(initTicker, 'ticker');
            safe(initManifesto, 'manifesto');
            safe(initStats, 'stats');
            safe(initFilm, 'film');
            safe(initMethod, 'method');
            safe(initJourney, 'journey');
            safe(initBentoParallax, 'bento');
            safe(initStory, 'story');
            safe(initPace, 'pace');
            safe(initSheets, 'sheets');
            safe(initParallaxY, 'parallax');
            safe(initFooterReveal, 'footer');
        }

        safe(initHeroGL, 'webgl');
        safe(initParticles, 'particles');
        safe(initConvo, 'convo');

        // Con todo el contenido y las fuentes cargadas, recalcula posiciones de ScrollTrigger
        if (hasST) {
            const refresh = () => ScrollTrigger.refresh();
            if (document.readyState === 'complete') setTimeout(refresh, 300); else addEventListener('load', () => setTimeout(refresh, 300), { once: true });
            if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(refresh, 100));
        }

        runPreloader()
            .catch((err) => { console.warn('[beLingua] preloader', err); const p = $('#preloader'); if (p) p.remove(); })
            .then(() => {
                root.classList.remove('is-loading');
                if (lenis) lenis.start();
                playHeroIntro();
                if (hasST) setTimeout(() => ScrollTrigger.refresh(), 600);
            });
    }

    try {
        boot();
    } catch (err) {
        // Último recurso: nunca dejar al usuario frente a una pantalla vacía
        console.error('[beLingua] error de arranque', err);
        root.classList.add('reveal-all', 'no-st');
        const p = $('#preloader');
        if (p) p.remove();
        root.classList.remove('is-loading');
    }
})();
