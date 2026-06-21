/**
 * HydraVisualizer v7.0
 * Sonoria — 沉浸式音乐可视化引擎
 *
 * 架构：
 *   1. Hydra WebGL 模式（GPU 渲染）
 *   2. Canvas 2D 降级模式（全新粒子系统 + 多场景可视化）
 *   3. 情感感知调色（serene / energized / tender / focused）
 *   4. 专辑封面迷你可视化（album-canvas）
 *
 * 暴露：window.HydraVisualizer
 */
(function () {
    'use strict';

    /* ============================================================
       EMOTION PALETTE — 对应 CSS --emotion-color 主题
    ============================================================ */
    var EMOTION_PALETTES = {
        serene:    { h: 174, s: 100, l: 45, rgb: [0, 229, 204] },
        energized: { h: 43,  s: 90,  l: 55, rgb: [240, 180, 41] },
        tender:    { h: 340, s: 100, l: 65, rgb: [255, 107, 157] },
        focused:   { h: 258, s: 85,  l: 68, rgb: [167, 139, 250] }
    };

    var EMOTION_NAMES = ['serene', 'energized', 'tender', 'focused'];

    /* ============================================================
       CONSTRUCTOR
    ============================================================ */
    function HydraVisualizer(canvas) {
        this.canvas      = canvas;
        this.hydra       = null;
        this.useFallback = true;
        this.rafId       = null;
        this.running     = false;
        this.styleId     = 'aurora';

        // Canvas 2D
        this.canvas2d    = null;
        this.ctx2d       = null;

        // Album mini-canvas
        this.albumCanvas = null;
        this.albumCtx    = null;
        this.albumRafId  = null;

        // Particle system
        this.particles   = [];
        this.maxParticles = 140;

        // Emotion state
        this.emotion     = 'serene';
        this._emotionHue = EMOTION_PALETTES.serene.h;
        this._targetHue  = EMOTION_PALETTES.serene.h;

        // Beat detection
        this._lastEnergy = 0;
        this._beatCooldown = 0;
        this._beatFlash  = 0;

        this._init();
    }

    HydraVisualizer.prototype._init = function () {
        // Try Hydra (WebGL)
        if (window.webglSupport && window.webglSupport.available && typeof window.Hydra === 'function') {
            try {
                this.hydra = new window.Hydra({
                    canvas: this.canvas,
                    autoLoop: true,
                    detectAudio: false,
                    width: window.innerWidth,
                    height: window.innerHeight
                });
                this.useFallback = false;
                console.log('[Sonoria] Hydra GPU mode active');
            } catch (e) {
                console.warn('[Sonoria] Hydra init failed, using Canvas 2D:', e);
                this.useFallback = true;
            }
        }

        // Canvas 2D fallback (always initialised — used for album art too)
        this._initCanvas2D();
        this._initAlbumCanvas();
        this._initParticles();

        // If not Hydra, the main canvas IS the 2D canvas
        if (this.useFallback) {
            this.canvas2d = this.canvas;
            this.ctx2d    = this.canvas.getContext('2d');
            this.canvas2d.width  = window.innerWidth;
            this.canvas2d.height = window.innerHeight;
        }
    };

    HydraVisualizer.prototype._initCanvas2D = function () {
        if (!this.useFallback) return;
        // Will be assigned in _init after useFallback is determined
    };

    HydraVisualizer.prototype._initAlbumCanvas = function () {
        var el = document.getElementById('album-canvas');
        if (!el) return;
        this.albumCanvas = el;
        this.albumCtx    = el.getContext('2d');
        el.width  = el.offsetWidth  || 340;
        el.height = el.offsetHeight || 340;
        this._startAlbumLoop();
    };

    /* ============================================================
       PARTICLE SYSTEM INITIALISATION
    ============================================================ */
    HydraVisualizer.prototype._initParticles = function () {
        this.particles = [];
        for (var i = 0; i < this.maxParticles; i++) {
            this.particles.push(this._newParticle(true));
        }
    };

    HydraVisualizer.prototype._newParticle = function (random) {
        var w = window.innerWidth;
        var h = window.innerHeight;
        var angle  = Math.random() * Math.PI * 2;
        var radius = random ? Math.random() * Math.max(w, h) * 0.6 : 0;
        return {
            x:       w / 2 + Math.cos(angle) * radius,
            y:       h / 2 + Math.sin(angle) * radius,
            vx:      (Math.random() - 0.5) * 0.6,
            vy:      (Math.random() - 0.5) * 0.6,
            size:    Math.random() * 2.2 + 0.6,
            opacity: Math.random() * 0.6 + 0.15,
            life:    Math.random(),
            decay:   Math.random() * 0.003 + 0.001,
            hueOff:  (Math.random() - 0.5) * 40
        };
    };

    /* ============================================================
       STYLE APPLICATION
    ============================================================ */
    HydraVisualizer.prototype.applyStyle = function (id) {
        this.styleId = id || 'aurora';
        if (!this.useFallback) {
            this._applyHydraStyle(id);
        }
        // Determine emotion from style
        this._syncEmotionFromStyle(id);
    };

    HydraVisualizer.prototype._syncEmotionFromStyle = function (id) {
        var map = {
            aurora:   'serene',
            nebula:   'serene',
            liquid:   'serene',
            flow:     'serene',
            cosmic:   'focused',
            crystal:  'focused',
            neural:   'focused',
            spectrum: 'energized',
            pulse:    'energized',
            vortex:   'energized',
            matrix:   'focused',
            flame:    'tender',
            bloom:    'tender'
        };
        var next = map[id] || 'serene';
        this.setEmotion(next);
    };

    HydraVisualizer.prototype.setEmotion = function (name) {
        if (!EMOTION_PALETTES[name]) return;
        this.emotion     = name;
        this._targetHue  = EMOTION_PALETTES[name].h;

        // Update DOM emotion badge
        var badge = document.getElementById('emotion-badge');
        var label = document.getElementById('emotion-label');
        var mood  = document.getElementById('capsule-mood');
        if (badge) badge.setAttribute('data-emotion', name);
        if (label) label.textContent = name.charAt(0).toUpperCase() + name.slice(1);
        if (mood)  mood.textContent  = name.charAt(0).toUpperCase() + name.slice(1);

        // Update CSS custom property
        var pal   = EMOTION_PALETTES[name];
        var color = 'hsl(' + pal.h + ', ' + pal.s + '%, ' + pal.l + '%)';
        var glow  = 'rgba(' + pal.rgb[0] + ',' + pal.rgb[1] + ',' + pal.rgb[2] + ',0.4)';
        var dim   = 'rgba(' + pal.rgb[0] + ',' + pal.rgb[1] + ',' + pal.rgb[2] + ',0.13)';
        document.documentElement.style.setProperty('--emotion-color', color);
        document.documentElement.style.setProperty('--emotion-glow',  glow);
        document.documentElement.style.setProperty('--emotion-dim',   dim);
    };

    /* ============================================================
       HYDRA (GPU) STYLE APPLICATION
    ============================================================ */
    HydraVisualizer.prototype._applyHydraStyle = function (id) {
        var styles = window.visualStyles || [];
        var style  = null;
        for (var i = 0; i < styles.length; i++) {
            if (styles[i].id === id) { style = styles[i]; break; }
        }
        if (!style || !style.render) return;

        var pal   = EMOTION_PALETTES[this.emotion] || EMOTION_PALETTES.serene;
        var hue   = pal.h;
        var self  = this;
        var analyser = window.state && window.state.analyser;

        // Live audio data
        var data  = new Uint8Array(analyser ? analyser.frequencyBinCount : 128);

        function getAudioBands() {
            if (!analyser) return { low: 0.3, mid: 0.3, high: 0.3, energy: 0.3 };
            analyser.getByteFrequencyData(data);
            var low = 0, mid = 0, high = 0, n = data.length;
            for (var i = 0; i < n; i++) {
                var v = data[i] / 255;
                if (i < n * 0.15)       low  += v;
                else if (i < n * 0.5)   mid  += v;
                else                    high += v;
            }
            var nL = Math.round(n * 0.15);
            var nM = Math.round(n * 0.35);
            var nH = n - nL - nM;
            low  = low  / nL;
            mid  = mid  / nM;
            high = high / nH;
            return { low: low, mid: mid, high: high, energy: (low + mid + high) / 3 };
        }

        try {
            if (typeof a !== 'undefined' && a.setBins) {
                a.setBins(4);
                a.smoothing = 0.8;
            }
        } catch(e) {}

        try {
            var bands = getAudioBands();
            style.render(hue, bands.low, bands.mid, bands.high, bands.energy);
        } catch (e) {
            console.warn('[Sonoria] Hydra style error:', e);
        }
    };

    /* ============================================================
       SMART STYLE SELECTION
    ============================================================ */
    HydraVisualizer.prototype.getSmartStyle = function () {
        var styles = window.visualStyles || [];
        if (!styles.length) return { id: 'aurora', name: 'Aurora' };
        var perf = (window.state && window.state.devicePerformance) || 2;
        var candidates = styles.filter(function (s) {
            return !s.performanceLevel || s.performanceLevel <= perf + 1;
        });
        if (!candidates.length) candidates = styles;
        var idx   = Math.floor(Math.random() * candidates.length);
        var style = candidates[idx];
        this.applyStyle(style.id);
        return style;
    };

    /* ============================================================
       MAIN VISUALIZER LOOP (Canvas 2D Fallback)
    ============================================================ */
    HydraVisualizer.prototype.start = function () {
        if (this.running) return;
        this.running = true;
        if (!this.useFallback) {
            // Hydra loops automatically; still run 2D effects for album art
            this._startFallbackLoop();
        } else {
            this._startFallbackLoop();
        }
    };

    HydraVisualizer.prototype.stop = function () {
        this.running = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        if (this.useFallback && this.ctx2d) {
            this.ctx2d.clearRect(0, 0, this.canvas2d.width, this.canvas2d.height);
        }
    };

    HydraVisualizer.prototype._startFallbackLoop = function () {
        var self = this;
        function loop() {
            if (!self.running) return;
            self._renderFrame();
            self.rafId = requestAnimationFrame(loop);
        }
        self.rafId = requestAnimationFrame(loop);
    };

    /* ============================================================
       MAIN RENDER FRAME
    ============================================================ */
    HydraVisualizer.prototype._renderFrame = function () {
        var analyser = window.state && window.state.analyser;
        var data     = new Uint8Array(analyser ? analyser.frequencyBinCount : 128);
        if (analyser) analyser.getByteFrequencyData(data);

        // Audio bands
        var n = data.length;
        var low = 0, mid = 0, high = 0;
        for (var i = 0; i < n; i++) {
            var v = data[i] / 255;
            if (i < n * 0.15)      low  += v;
            else if (i < n * 0.5)  mid  += v;
            else                   high += v;
        }
        low  = low  / Math.max(1, Math.round(n * 0.15));
        mid  = mid  / Math.max(1, Math.round(n * 0.35));
        high = high / Math.max(1, n - Math.round(n * 0.5));
        var energy = (low * 0.5 + mid * 0.3 + high * 0.2);

        // Smooth emotion hue
        this._emotionHue += (this._targetHue - this._emotionHue) * 0.02;

        // Beat detection
        this._beatCooldown = Math.max(0, this._beatCooldown - 1);
        this._beatFlash    = Math.max(0, this._beatFlash    - 0.05);
        var energyDelta = energy - this._lastEnergy;
        if (energyDelta > 0.12 && this._beatCooldown === 0) {
            this._beatCooldown = 18;
            this._beatFlash    = 0.6;
        }
        this._lastEnergy = energy * 0.85 + this._lastEnergy * 0.15;

        // Only render 2D canvas in fallback mode
        if (this.useFallback && this.ctx2d) {
            this._render2D(data, low, mid, high, energy);
        }
    };

    /* ============================================================
       CANVAS 2D RENDERER — scene dispatch
    ============================================================ */
    HydraVisualizer.prototype._render2D = function (data, low, mid, high, energy) {
        var styleMap = {
            aurora:   '_sceneAurora',
            cosmic:   '_sceneCosmic',
            neural:   '_sceneNeural',
            liquid:   '_sceneLiquid',
            spectrum: '_sceneSpectrum',
            nebula:   '_sceneNebula',
            crystal:  '_sceneCrystal',
            matrix:   '_sceneMatrix',
            flow:     '_sceneFlow',
            pulse:    '_scenePulse',
            vortex:   '_sceneVortex'
        };
        var scene = styleMap[this.styleId] || '_sceneAurora';
        this[scene](data, low, mid, high, energy);
    };

    /* ============================================================
       SCENE: Aurora Borealis
    ============================================================ */
    HydraVisualizer.prototype._sceneAurora = function (data, low, mid, high, energy) {
        var ctx = this.ctx2d;
        var W   = this.canvas2d.width;
        var H   = this.canvas2d.height;
        var t   = performance.now() * 0.001;
        var hue = this._emotionHue;

        // Fade trail
        ctx.globalAlpha = 0.05 + energy * 0.02;
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;

        // Aurora curtains
        var bands = 6;
        for (var b = 0; b < bands; b++) {
            var bFrac = b / (bands - 1);
            var bHue  = (hue + b * 14 + t * 8) % 360;
            var yBase = H * (0.2 + bFrac * 0.35) + Math.sin(t * 0.4 + b) * H * 0.06;
            var amp   = H * (0.12 + low * 0.2 + b * 0.03);

            ctx.beginPath();
            ctx.moveTo(0, H);

            for (var x = 0; x <= W; x += 4) {
                var nx  = x / W;
                var wave = Math.sin(nx * 4 + t * 0.7 + b * 0.9) * amp
                         + Math.sin(nx * 7 + t * 1.1 + b * 0.5) * amp * 0.35
                         + Math.sin(nx * 11 + t * 0.5 + b * 1.3) * amp * 0.18
                         + (data[Math.floor(nx * data.length * 0.6)] / 255) * amp * 0.5;
                ctx.lineTo(x, yBase + wave);
            }

            ctx.lineTo(W, H);
            ctx.closePath();

            var grad = ctx.createLinearGradient(0, yBase - amp, 0, yBase + amp * 2);
            var alpha = 0.04 + energy * 0.06 + bFrac * 0.02;
            grad.addColorStop(0, 'hsla(' + bHue + ',90%,60%,' + (alpha * 2) + ')');
            grad.addColorStop(0.5, 'hsla(' + ((bHue + 30) % 360) + ',80%,50%,' + alpha + ')');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fill();
        }

        // Particles
        this._renderParticles(ctx, W, H, energy, hue);
    };

    /* ============================================================
       SCENE: Cosmic Starfield
    ============================================================ */
    HydraVisualizer.prototype._sceneCosmic = function (data, low, mid, high, energy) {
        var ctx = this.ctx2d;
        var W   = this.canvas2d.width;
        var H   = this.canvas2d.height;
        var t   = performance.now() * 0.001;
        var hue = this._emotionHue;

        ctx.globalAlpha = 0.08;
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;

        // Stars with audio reaction
        var starCount = 80;
        for (var i = 0; i < starCount; i++) {
            var seed  = i * 137.508;
            var sx    = ((seed * 13.1 + t * 0.3) % W + W) % W;
            var sy    = ((seed * 7.3  + t * 0.1) % H + H) % H;
            var sr    = 0.8 + (i % 5) * 0.4 + (data[i % data.length] / 255) * 2;
            var sa    = 0.3 + (data[i % data.length] / 255) * 0.7;
            var sHue  = (hue + i * 3) % 360;

            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            ctx.fillStyle = 'hsla(' + sHue + ',80%,80%,' + sa + ')';
            ctx.fill();
        }

        // Central nebula
        this._drawNebula(ctx, W / 2, H / 2, W * 0.35 * (1 + energy * 0.3), hue, energy);

        // Orbit ring
        var cx = W / 2, cy = H / 2;
        var r  = Math.min(W, H) * (0.22 + mid * 0.08);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'hsla(' + hue + ',80%,60%,' + (0.1 + energy * 0.2) + ')';
        ctx.lineWidth   = 1;
        ctx.stroke();
    };

    /* ============================================================
       SCENE: Spectrum Bars
    ============================================================ */
    HydraVisualizer.prototype._sceneSpectrum = function (data, low, mid, high, energy) {
        var ctx = this.ctx2d;
        var W   = this.canvas2d.width;
        var H   = this.canvas2d.height;
        var hue = this._emotionHue;
        var t   = performance.now() * 0.001;

        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;

        // Background glow
        var bgGrad = ctx.createRadialGradient(W/2, H, 0, W/2, H*0.5, H * 0.8);
        bgGrad.addColorStop(0, 'hsla(' + hue + ',70%,15%,0.4)');
        bgGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        var barCount = Math.min(64, Math.floor(W / 6));
        var barW     = (W / barCount) * 0.6;
        var gap      = (W / barCount) * 0.4;
        var step     = Math.floor(data.length / barCount);

        for (var i = 0; i < barCount; i++) {
            var val  = 0;
            for (var j = 0; j < step; j++) val += data[i * step + j] / 255;
            val /= step;

            var barH  = val * H * 0.7 + 2;
            var x     = i * (barW + gap) + gap / 2;
            var barHue = (hue + (i / barCount) * 60) % 360;
            var alpha = 0.6 + val * 0.4;

            // Main bar
            var grad = ctx.createLinearGradient(0, H, 0, H - barH);
            grad.addColorStop(0, 'hsla(' + barHue + ',85%,55%,' + alpha + ')');
            grad.addColorStop(1, 'hsla(' + ((barHue + 40) % 360) + ',90%,75%,' + (alpha * 0.5) + ')');

            ctx.fillStyle = grad;
            ctx.beginPath();
            this._roundRect(ctx, x, H - barH, barW, barH, 3);
            ctx.fill();

            // Reflection
            ctx.globalAlpha = 0.12;
            ctx.fillStyle = grad;
            ctx.beginPath();
            this._roundRect(ctx, x, H, barW, barH * 0.3, 3);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    };

    /* ============================================================
       SCENE: Liquid Metal
    ============================================================ */
    HydraVisualizer.prototype._sceneLiquid = function (data, low, mid, high, energy) {
        var ctx = this.ctx2d;
        var W   = this.canvas2d.width;
        var H   = this.canvas2d.height;
        var hue = this._emotionHue;
        var t   = performance.now() * 0.001;

        ctx.globalAlpha = 0.07;
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;

        var layers = 5;
        for (var l = 0; l < layers; l++) {
            var lFrac = l / (layers - 1);
            var lHue  = (hue + l * 20) % 360;
            var yC    = H * (0.3 + lFrac * 0.4);
            var amp   = H * (0.08 + energy * 0.12 + l * 0.02);
            var speed = 0.3 + l * 0.15;

            ctx.beginPath();
            ctx.moveTo(0, H);

            for (var x = 0; x <= W; x += 3) {
                var nx  = x / W;
                var idx = Math.floor(nx * data.length);
                var dv  = data[idx] / 255;
                var y   = yC
                    + Math.sin(nx * 5  + t * speed) * amp
                    + Math.sin(nx * 9  + t * speed * 1.5 + l) * amp * 0.4
                    + Math.sin(nx * 13 + t * speed * 0.7) * amp * 0.2
                    + dv * amp * 0.6;
                ctx.lineTo(x, y);
            }

            ctx.lineTo(W, H);
            ctx.closePath();

            var alpha = 0.03 + energy * 0.04 + l * 0.01;
            var grd = ctx.createLinearGradient(0, yC - amp, 0, yC + amp * 2);
            grd.addColorStop(0, 'hsla(' + lHue + ',100%,70%,' + (alpha * 3) + ')');
            grd.addColorStop(0.4, 'hsla(' + lHue + ',85%,55%,' + alpha + ')');
            grd.addColorStop(1, 'transparent');
            ctx.fillStyle = grd;
            ctx.fill();
        }

        this._renderParticles(ctx, W, H, energy * 0.5, hue);
    };

    /* ============================================================
       SCENE: Nebula Cloud
    ============================================================ */
    HydraVisualizer.prototype._sceneNebula = function (data, low, mid, high, energy) {
        var ctx = this.ctx2d;
        var W   = this.canvas2d.width;
        var H   = this.canvas2d.height;
        var hue = this._emotionHue;
        var t   = performance.now() * 0.001;

        ctx.globalAlpha = 0.06;
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;

        // Multiple cloud layers
        var clouds = [
            { x: W * 0.4, y: H * 0.35, r: W * 0.4, hOff: 0   },
            { x: W * 0.6, y: H * 0.55, r: W * 0.35, hOff: 60  },
            { x: W * 0.5, y: H * 0.5,  r: W * 0.45, hOff: 120 }
        ];

        for (var i = 0; i < clouds.length; i++) {
            var c    = clouds[i];
            var cHue = (hue + c.hOff + t * 3) % 360;
            var cr   = c.r * (0.8 + energy * 0.25 + low * 0.1);
            var cx   = c.x + Math.sin(t * 0.2 + i) * W * 0.04;
            var cy   = c.y + Math.cos(t * 0.15 + i * 1.3) * H * 0.04;
            this._drawNebula(ctx, cx, cy, cr, cHue, energy * 0.4 + 0.05);
        }

        this._renderParticles(ctx, W, H, energy * 0.3, hue);
    };

    /* ============================================================
       SCENE: Crystal Geometry
    ============================================================ */
    HydraVisualizer.prototype._sceneCrystal = function (data, low, mid, high, energy) {
        var ctx = this.ctx2d;
        var W   = this.canvas2d.width;
        var H   = this.canvas2d.height;
        var hue = this._emotionHue;
        var t   = performance.now() * 0.001;

        ctx.globalAlpha = 0.1;
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;

        var cx = W / 2, cy = H / 2;
        var rings = 5;

        for (var ring = 0; ring < rings; ring++) {
            var sides  = 6;
            var r      = (Math.min(W, H) * 0.06) * (ring + 1) * (1 + low * 0.4);
            var rHue   = (hue + ring * 25 + t * 6) % 360;
            var rot    = t * 0.15 * (ring % 2 === 0 ? 1 : -1) + ring * 0.1;
            var alpha  = 0.15 + energy * 0.1 - ring * 0.02;

            ctx.beginPath();
            for (var s = 0; s <= sides; s++) {
                var angle = (s / sides) * Math.PI * 2 + rot;
                var px    = cx + Math.cos(angle) * r;
                var py    = cy + Math.sin(angle) * r;
                if (s === 0) ctx.moveTo(px, py);
                else         ctx.lineTo(px, py);
            }
            ctx.closePath();

            ctx.strokeStyle = 'hsla(' + rHue + ',85%,65%,' + Math.max(0, alpha) + ')';
            ctx.lineWidth   = 1 + ring * 0.3;
            ctx.stroke();

            // Fill inner
            if (ring === 0) {
                var fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
                fg.addColorStop(0, 'hsla(' + rHue + ',90%,70%,' + (energy * 0.3) + ')');
                fg.addColorStop(1, 'transparent');
                ctx.fillStyle = fg;
                ctx.fill();
            }
        }

        this._renderParticles(ctx, W, H, energy * 0.4, hue);
    };

    /* ============================================================
       SCENE: Neural Network
    ============================================================ */
    HydraVisualizer.prototype._sceneNeural = function (data, low, mid, high, energy) {
        var ctx = this.ctx2d;
        var W   = this.canvas2d.width;
        var H   = this.canvas2d.height;
        var hue = this._emotionHue;
        var t   = performance.now() * 0.001;

        ctx.globalAlpha = 0.08;
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;

        // Nodes
        var nodeCount = 18;
        var nodes     = [];
        for (var i = 0; i < nodeCount; i++) {
            var seed  = i * 137.508;
            var a     = (seed * 2.4 + t * 0.08) % (Math.PI * 2);
            var rVal  = Math.min(W, H) * (0.15 + (i % 3) * 0.12 + Math.sin(seed) * 0.1);
            var dv    = data[i % data.length] / 255;
            nodes.push({
                x:    W/2 + Math.cos(a) * rVal,
                y:    H/2 + Math.sin(a) * rVal,
                r:    3 + dv * 5,
                hue:  (hue + i * 12) % 360,
                alpha: 0.4 + dv * 0.6
            });
        }

        // Connections
        for (var i = 0; i < nodeCount; i++) {
            for (var j = i + 1; j < nodeCount; j++) {
                var dx   = nodes[j].x - nodes[i].x;
                var dy   = nodes[j].y - nodes[i].y;
                var dist = Math.sqrt(dx*dx + dy*dy);
                if (dist > Math.min(W, H) * 0.3) continue;
                var alpha = (1 - dist / (Math.min(W, H) * 0.3)) * 0.15 * (1 + energy);
                ctx.beginPath();
                ctx.moveTo(nodes[i].x, nodes[i].y);
                ctx.lineTo(nodes[j].x, nodes[j].y);
                ctx.strokeStyle = 'hsla(' + nodes[i].hue + ',70%,60%,' + alpha + ')';
                ctx.lineWidth   = 0.5;
                ctx.stroke();
            }
        }

        // Nodes
        for (var i = 0; i < nodeCount; i++) {
            var nd = nodes[i];
            var grd = ctx.createRadialGradient(nd.x, nd.y, 0, nd.x, nd.y, nd.r * 3);
            grd.addColorStop(0, 'hsla(' + nd.hue + ',90%,70%,' + nd.alpha + ')');
            grd.addColorStop(1, 'transparent');
            ctx.beginPath();
            ctx.arc(nd.x, nd.y, nd.r * 3, 0, Math.PI * 2);
            ctx.fillStyle = grd;
            ctx.fill();
        }
    };

    /* ============================================================
       SCENE: Matrix Digital Rain
    ============================================================ */
    HydraVisualizer.prototype._sceneMatrix = function (data, low, mid, high, energy) {
        var ctx = this.ctx2d;
        var W   = this.canvas2d.width;
        var H   = this.canvas2d.height;
        var hue = this._emotionHue;

        ctx.globalAlpha = 0.06 + energy * 0.02;
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;

        // Initialize matrix state
        if (!this._matrixCols) {
            var colW = 18;
            this._matrixCols  = Math.floor(W / colW);
            this._matrixDrops = [];
            for (var i = 0; i < this._matrixCols; i++) {
                this._matrixDrops[i] = Math.random() * H;
            }
            this._matrixColW = colW;
        }

        var cW = this._matrixColW;
        var drops = this._matrixDrops;
        var t  = performance.now() * 0.001;

        ctx.font = (cW * 0.7) + 'px "SF Mono", "Fira Code", monospace';

        for (var i = 0; i < drops.length; i++) {
            var dv   = data[i % data.length] / 255;
            var ch   = String.fromCharCode(0x30A0 + Math.random() * 96);
            var cHue = (hue + (dv * 60)) % 360;

            // Head (bright)
            ctx.fillStyle = 'hsla(' + cHue + ',85%,85%,' + (0.7 + dv * 0.3) + ')';
            ctx.fillText(ch, i * cW, drops[i]);

            // Trail
            ctx.fillStyle = 'hsla(' + cHue + ',70%,55%,' + (0.3 + dv * 0.4) + ')';
            ctx.fillText(String.fromCharCode(0x30A0 + Math.random() * 96), i * cW, drops[i] - cW);

            var speed = 1.2 + dv * 3 + energy * 2;
            drops[i] += speed;
            if (drops[i] > H + cW && Math.random() > 0.975) {
                drops[i] = 0;
            }
        }
    };

    /* ============================================================
       SCENE: Flow Field
    ============================================================ */
    HydraVisualizer.prototype._sceneFlow = function (data, low, mid, high, energy) {
        var ctx = this.ctx2d;
        var W   = this.canvas2d.width;
        var H   = this.canvas2d.height;
        var hue = this._emotionHue;
        var t   = performance.now() * 0.001;

        ctx.globalAlpha = 0.04;
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;

        // Flow lines
        var lineCount = 40;
        for (var i = 0; i < lineCount; i++) {
            var seed  = i * 177.3;
            var startX = ((seed * 5.2 + t * 10) % W + W) % W;
            var startY = ((seed * 3.7) % H + H) % H;
            var lHue   = (hue + i * 4 + t * 5) % 360;
            var dv     = data[i % data.length] / 255;
            var alpha  = 0.08 + dv * 0.2 + energy * 0.1;

            ctx.beginPath();
            ctx.moveTo(startX, startY);

            var x = startX, y = startY;
            for (var step = 0; step < 30; step++) {
                var nx   = x / W;
                var ny   = y / H;
                var angle = Math.sin(nx * 4 + t * 0.5) * Math.PI
                          + Math.cos(ny * 3 + t * 0.3) * Math.PI
                          + (data[Math.floor(nx * data.length)] / 255) * Math.PI * 0.5;
                var spd  = 3 + energy * 6;
                x += Math.cos(angle) * spd;
                y += Math.sin(angle) * spd;
                if (x < 0 || x > W || y < 0 || y > H) break;
                ctx.lineTo(x, y);
            }

            ctx.strokeStyle = 'hsla(' + lHue + ',80%,65%,' + alpha + ')';
            ctx.lineWidth   = 0.8 + dv;
            ctx.stroke();
        }
    };

    /* ============================================================
       SCENE: Pulse Rings
    ============================================================ */
    HydraVisualizer.prototype._scenePulse = function (data, low, mid, high, energy) {
        var ctx = this.ctx2d;
        var W   = this.canvas2d.width;
        var H   = this.canvas2d.height;
        var hue = this._emotionHue;
        var t   = performance.now() * 0.001;
        var cx  = W / 2, cy = H / 2;

        ctx.globalAlpha = 0.1;
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;

        // Beat flash
        if (this._beatFlash > 0) {
            var flashGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W,H) * 0.3);
            flashGrd.addColorStop(0, 'hsla(' + hue + ',90%,70%,' + (this._beatFlash * 0.3) + ')');
            flashGrd.addColorStop(1, 'transparent');
            ctx.fillStyle = flashGrd;
            ctx.fillRect(0, 0, W, H);
        }

        // Radial bars
        var bars = 80;
        var maxR = Math.min(W, H) * 0.38;
        for (var i = 0; i < bars; i++) {
            var angle = (i / bars) * Math.PI * 2 - Math.PI / 2;
            var dv    = data[Math.floor(i * data.length / bars)] / 255;
            var r0    = maxR * 0.3;
            var r1    = r0 + dv * maxR * 0.7 + low * maxR * 0.1;
            var bHue  = (hue + i * 2 + t * 10) % 360;
            var alpha = 0.5 + dv * 0.5;

            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(angle) * r0, cy + Math.sin(angle) * r0);
            ctx.lineTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
            ctx.strokeStyle = 'hsla(' + bHue + ',90%,65%,' + alpha + ')';
            ctx.lineWidth   = 2 + dv * 2;
            ctx.stroke();
        }

        // Center glow
        var cGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.3);
        cGrd.addColorStop(0, 'hsla(' + hue + ',90%,70%,' + (0.1 + energy * 0.3) + ')');
        cGrd.addColorStop(1, 'transparent');
        ctx.fillStyle = cGrd;
        ctx.beginPath();
        ctx.arc(cx, cy, maxR * 0.3, 0, Math.PI * 2);
        ctx.fill();
    };

    /* ============================================================
       SCENE: Vortex
    ============================================================ */
    HydraVisualizer.prototype._sceneVortex = function (data, low, mid, high, energy) {
        var ctx = this.ctx2d;
        var W   = this.canvas2d.width;
        var H   = this.canvas2d.height;
        var hue = this._emotionHue;
        var t   = performance.now() * 0.001;
        var cx  = W / 2, cy = H / 2;

        ctx.globalAlpha = 0.07;
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;

        var arms = 3;
        for (var a = 0; a < arms; a++) {
            var aHue = (hue + a * 120) % 360;
            ctx.beginPath();
            var points = 200;

            for (var p = 0; p < points; p++) {
                var frac    = p / points;
                var r       = frac * Math.min(W, H) * 0.45;
                var dv      = data[Math.floor(frac * data.length * 0.7)] / 255;
                var angle   = frac * Math.PI * 6
                            + (a * Math.PI * 2 / arms)
                            + t * (0.5 + energy * 0.8)
                            + dv * 0.5;
                var wobble  = (1 + Math.sin(frac * 12 + t * 2) * 0.15 + dv * 0.2);
                var x = cx + Math.cos(angle) * r * wobble;
                var y = cy + Math.sin(angle) * r * wobble;

                if (p === 0) ctx.moveTo(x, y);
                else         ctx.lineTo(x, y);
            }

            var alpha = 0.25 + energy * 0.3;
            ctx.strokeStyle = 'hsla(' + aHue + ',90%,65%,' + alpha + ')';
            ctx.lineWidth   = 1.5 + energy * 2;
            ctx.stroke();
        }
    };

    /* ============================================================
       SHARED HELPERS
    ============================================================ */
    HydraVisualizer.prototype._drawNebula = function (ctx, cx, cy, r, hue, alpha) {
        var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, 'hsla(' + hue + ',80%,60%,' + (alpha * 3) + ')');
        grad.addColorStop(0.3, 'hsla(' + ((hue + 30) % 360) + ',70%,50%,' + alpha + ')');
        grad.addColorStop(0.7, 'hsla(' + ((hue + 60) % 360) + ',60%,40%,' + (alpha * 0.4) + ')');
        grad.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
    };

    HydraVisualizer.prototype._renderParticles = function (ctx, W, H, energy, hue) {
        var ps = this.particles;
        for (var i = 0; i < ps.length; i++) {
            var p = ps[i];
            p.life -= p.decay;
            if (p.life <= 0) {
                var np = this._newParticle(true);
                ps[i] = np;
                continue;
            }

            // Energy boost
            var boost = 1 + energy * 2;
            p.x += p.vx * boost;
            p.y += p.vy * boost;

            var pHue  = (hue + p.hueOff + performance.now() * 0.01) % 360;
            var alpha = p.opacity * p.life;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = 'hsla(' + pHue + ',80%,70%,' + alpha + ')';
            ctx.fill();
        }
    };

    HydraVisualizer.prototype._roundRect = function (ctx, x, y, w, h, r) {
        if (ctx.roundRect) {
            ctx.roundRect(x, y, w, h, r);
        } else {
            ctx.rect(x, y, w, h);
        }
    };

    /* ============================================================
       ALBUM ART MINI VISUALIZER
    ============================================================ */
    HydraVisualizer.prototype._startAlbumLoop = function () {
        var self = this;
        function loop() {
            self.albumRafId = requestAnimationFrame(loop);
            self._renderAlbum();
        }
        self.albumRafId = requestAnimationFrame(loop);
    };

    HydraVisualizer.prototype._renderAlbum = function () {
        var ctx = this.albumCtx;
        var el  = this.albumCanvas;
        if (!ctx || !el) return;

        var W = el.width;
        var H = el.height;

        // Resize if layout changed
        if (Math.abs(el.offsetWidth - W) > 2) {
            el.width  = el.offsetWidth;
            el.height = el.offsetHeight;
            W = el.width;
            H = el.height;
        }

        var analyser = window.state && window.state.analyser;
        var data     = new Uint8Array(analyser ? analyser.frequencyBinCount : 128);
        if (analyser) analyser.getByteFrequencyData(data);

        var hue = this._emotionHue;
        var t   = performance.now() * 0.001;

        // Idle animation
        var energy = 0;
        if (analyser) {
            for (var i = 0; i < data.length; i++) energy += data[i] / 255;
            energy /= data.length;
        } else {
            energy = 0.15 + Math.sin(t * 1.2) * 0.05;
        }

        // Clear with fade
        ctx.globalAlpha = 0.18;
        ctx.fillStyle   = '#050508';
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;

        // Central circular spectrum
        var cx = W / 2, cy = H / 2;
        var innerR = Math.min(W, H) * 0.28;
        var outerR = Math.min(W, H) * 0.44;
        var bars   = 48;

        for (var i = 0; i < bars; i++) {
            var angle = (i / bars) * Math.PI * 2 - Math.PI / 2;
            var dv    = data[Math.floor(i * data.length / bars)] / 255;
            var rLen  = (outerR - innerR) * dv + 4;
            var bHue  = (hue + i * 3 + t * 10) % 360;
            var alpha = 0.4 + dv * 0.6;

            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
            ctx.lineTo(cx + Math.cos(angle) * (innerR + rLen), cy + Math.sin(angle) * (innerR + rLen));
            ctx.strokeStyle = 'hsla(' + bHue + ',85%,65%,' + alpha + ')';
            ctx.lineWidth   = 2.5;
            ctx.stroke();
        }

        // Center orb
        var orbR  = innerR * 0.5 * (1 + energy * 0.25);
        var orbGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR * 2);
        orbGrd.addColorStop(0, 'hsla(' + hue + ',85%,70%,' + (0.5 + energy * 0.4) + ')');
        orbGrd.addColorStop(0.5, 'hsla(' + ((hue + 30) % 360) + ',70%,55%,' + (0.15 + energy * 0.2) + ')');
        orbGrd.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(cx, cy, orbR * 2, 0, Math.PI * 2);
        ctx.fillStyle = orbGrd;
        ctx.fill();

        // Update waveform bars
        this._updateWaveformBars(data, energy);
    };

    HydraVisualizer.prototype._updateWaveformBars = function (data, energy) {
        var bars = document.querySelectorAll('.waveform-bar');
        if (!bars.length) return;
        var n = bars.length;
        var playing = window.state && window.state.playing;

        for (var i = 0; i < n; i++) {
            var dv = playing
                ? (data[Math.floor(i * data.length / n)] / 255)
                : (0.2 + Math.sin(performance.now() * 0.001 * (1 + i * 0.2)) * 0.15);
            var h  = Math.max(4, dv * 36);
            bars[i].style.height = h + 'px';
            bars[i].style.opacity = playing ? (0.5 + dv * 0.5) : '0.3';
        }
    };

    /* ============================================================
       RESIZE
    ============================================================ */
    HydraVisualizer.prototype.resize = function () {
        if (this.hydra && typeof this.hydra.resize === 'function') {
            this.hydra.resize(window.innerWidth, window.innerHeight);
        }
        if (this.ctx2d && this.canvas2d) {
            this.canvas2d.width  = window.innerWidth;
            this.canvas2d.height = window.innerHeight;
        }
        if (this.albumCanvas) {
            this.albumCanvas.width  = this.albumCanvas.offsetWidth;
            this.albumCanvas.height = this.albumCanvas.offsetHeight;
        }
        // Reset matrix cols on resize
        this._matrixCols = null;
    };

    window.HydraVisualizer = HydraVisualizer;
})();
