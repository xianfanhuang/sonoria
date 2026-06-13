/**
 * Sonoria Main Entry
 * 启动顺序：DOM ready → 填充 UI refs → 创建实例 → 绑定事件 → 暴露 window
 *
 * 暴露的全局（兼容 HTML 内联 onclick）：
 *   - window.engine
 *   - window.viz
 *   - window.toggleDrawer / runHydra / resetHydra /
 *     runStrudel / stopStrudel / randomSmartTheme / enterZenMode
 */
(function () {
    'use strict';

    function fillUiRefs() {
        // 此时 DOM 已就绪
        window.ui = {
            shell: document.getElementById('app-shell'),
            card: document.getElementById('card'),
            canvas: document.getElementById('visualizer'),
            playBtns: [
                document.getElementById('main-play'),
                document.getElementById('capsule-play')
            ],
            title: document.getElementById('track-title'),
            artist: document.getElementById('track-artist'),
            cText: document.getElementById('capsule-text'),
            pFill: document.getElementById('progress-fill'),
            cTime: document.getElementById('curr-time'),
            tTime: document.getElementById('total-time'),
            mic: document.getElementById('mic-btn'),
            ringProgress: document.getElementById('ring-progress'),
            ringLogo: document.getElementById('ring-logo'),
            capsuleCore: document.getElementById('capsule-core'),
            plView: document.getElementById('playlist-view'),
            styleGrid: document.getElementById('style-grid')
        };
    }

    function bootstrap() {
        fillUiRefs();

        // 1. 等待 Hydra 库加载（最多 5 秒）
        if (typeof window.Hydra === 'undefined' &&
            (window.webglSupport && window.webglSupport.available)) {
            if (!window._hydraWaitStart) window._hydraWaitStart = Date.now();
            if (Date.now() - window._hydraWaitStart < 5000) {
                return setTimeout(bootstrap, 100);
            }
            console.log('Hydra timeout, using fallback');
            window.webglSupport = { available: false, level: 0 };
        }

        // 2. 创建可视化器（WebGL 优先，失败降级 Canvas 2D）
        var viz = new window.HydraVisualizer(window.ui.canvas);
        window.viz = viz;

        // 3. 创建 Strudel 引擎（异步 init，但不影响主流程）
        var strudelEngine = new window.StrudelEngine();

        // 4. 创建 Audio Engine（依赖 viz 和 strudel）
        var engine = new window.AudioEngine(viz, strudelEngine);
        window.engine = engine;

        // 5. 初始化 UI Controller
        window.SonoriaUI.init(engine, viz, strudelEngine);

        // 6. 暴露 HTML 内联 onclick 所需的全局函数
        exposeGlobals();

        // 7. 等 viz 初始化完，再应用当前风格
        setTimeout(function () {
            viz.applyStyle(window.state.mode);
        }, 600);
    }

    function exposeGlobals() {
        window.toggleDrawer = window.SonoriaUI.toggleDrawer;
        window.runHydra = window.SonoriaUI.runHydra;
        window.resetHydra = window.SonoriaUI.resetHydra;
        window.runStrudel = window.SonoriaUI.runStrudel;
        window.stopStrudel = window.SonoriaUI.stopStrudel;
        window.randomSmartTheme = window.SonoriaUI.randomSmartTheme;
        window.enterZenMode = window.SonoriaUI.enterZenMode;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }
})();
