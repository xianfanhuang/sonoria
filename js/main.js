/**
 * Sonoria Main Entry v7.0
 * 启动顺序：DOM ready → 填充 UI refs → 创建实例 → 绑定事件 → 暴露 window
 */
(function () {
    'use strict';

    function fillUiRefs() {
        window.ui = {
            shell:        document.getElementById('app'),
            card:         document.getElementById('card'),
            canvas:       document.getElementById('visualizer'),
            playBtns:     [
                document.getElementById('main-play'),
                document.getElementById('capsule-play')
            ],
            // Alias for audio-engine backward compat
            get playBtn() { return this.playBtns; },
            title:        document.getElementById('track-title'),
            artist:       document.getElementById('track-artist'),
            cText:        document.getElementById('capsule-text'),
            pFill:        document.getElementById('progress-fill'),
            cTime:        document.getElementById('curr-time'),
            tTime:        document.getElementById('total-time'),
            mic:          document.getElementById('mic-btn'),
            ringProgress: document.getElementById('ring-progress'),
            ringLogo:     document.getElementById('ring-logo'),
            plView:       document.getElementById('playlist-view'),
            styleGrid:    document.getElementById('style-grid')
        };
    }

    function bootstrap() {
        fillUiRefs();

        // Wait for Hydra library (up to 5s)
        if (typeof window.Hydra === 'undefined' &&
            (window.webglSupport && window.webglSupport.available)) {
            if (!window._hydraWaitStart) window._hydraWaitStart = Date.now();
            if (Date.now() - window._hydraWaitStart < 5000) {
                return setTimeout(bootstrap, 100);
            }
            console.log('[Sonoria] Hydra timeout — using Canvas 2D fallback');
            window.webglSupport = { available: false, level: 0 };
        }

        // 1. Visualizer (WebGL → Canvas 2D fallback)
        var viz = new window.HydraVisualizer(window.ui.canvas);
        window.viz = viz;

        // 2. Strudel engine (async init, non-blocking)
        var strudelEngine = new window.StrudelEngine();

        // 3. Audio Engine
        var engine = new window.AudioEngine(viz, strudelEngine);
        window.engine = engine;

        // 4. UI Controller
        window.SonoriaUI.init(engine, viz, strudelEngine);

        // 5. Expose globals for HTML onclick compat
        exposeGlobals();

        // 6. Apply initial style
        setTimeout(function () {
            viz.applyStyle(window.state.mode);
        }, 500);
    }

    function exposeGlobals() {
        window.toggleDrawer     = window.SonoriaUI.toggleDrawer;
        window.runHydra         = window.SonoriaUI.runHydra;
        window.resetHydra       = window.SonoriaUI.resetHydra;
        window.runStrudel       = window.SonoriaUI.runStrudel;
        window.stopStrudel      = window.SonoriaUI.stopStrudel;
        window.randomSmartTheme = window.SonoriaUI.randomSmartTheme;
        window.enterZenMode     = window.SonoriaUI.enterZenMode;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }
})();
