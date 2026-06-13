/**
 * UI Controller
 * UI 行为：drawer 切换、zen 模式、Hydra/Strudel 触发、智能风格推荐
 *
 * 暴露：window.SonoriaUI
 *   - toggleDrawer(id)
 *   - enterZenMode()
 *   - resetZen()
 *   - runHydra()
 *   - resetHydra()
 *   - runStrudel()
 *   - stopStrudel()
 *   - randomSmartTheme()
 *
 * 依赖：window.engine, window.viz, window.strudelEngine, window.state
 */
(function () {
    'use strict';

    var ui = null;       // AudioEngine 实例
    var viz = null;      // HydraVisualizer 实例
    var strudel = null;  // StrudelEngine 实例

    function init(audioEngine, visualizer, strudelEngine) {
        ui = audioEngine;
        viz = visualizer;
        strudel = strudelEngine;
        bindEvents();
    }

    function bindEvents() {
        // 触摸滑动 → 切歌
        document.addEventListener('touchstart', function (e) {
            window.state.touchStartX = e.touches[0].clientX;
        });
        document.addEventListener('touchend', function (e) {
            if (!window.ui.shell.classList.contains('zen')) return;
            var diff = e.changedTouches[0].clientX - window.state.touchStartX;
            if (Math.abs(diff) > 50) randomSmartTheme();
        });

        // 点击 → 退出 zen
        window.ui.shell.addEventListener('click', function () {
            window.ui.shell.classList.remove('zen');
            resetZen();
        });
        window.ui.card.addEventListener('click', function (e) {
            e.stopPropagation();
        });
        document.getElementById('capsule').addEventListener('click', function (e) {
            e.stopPropagation();
        });
        document.getElementById('capsule-play').addEventListener('click', function (e) {
            e.stopPropagation();
            window.engine.togglePlay();
        });

        // 窗口尺寸
        window.addEventListener('resize', function () { viz.resize(); });

        // 主播放/麦克风/文件/URL
        window.ui.playBtns[0].onclick = function (e) {
            e.stopPropagation();
            window.engine.togglePlay();
        };
        window.ui.mic.onclick = function () { window.engine.toggleMic(); };
        document.getElementById('file-input').onchange = function (e) {
            window.engine.handleFiles(e.target.files);
        };
        document.getElementById('url-input').addEventListener('keypress', function (e) {
            if (e.key === 'Enter') window.engine.playUrl(e.target.value.trim());
        });
    }

    function toggleDrawer(id) {
        var el = document.getElementById(id);
        if (!el) return;
        var isOpen = el.classList.contains('open');
        document.querySelectorAll('.drawer').forEach(function (d) {
            d.classList.remove('open');
        });
        if (!isOpen) el.classList.add('open');
    }

    function enterZenMode() {
        window.ui.shell.classList.add('zen');
    }

    function resetZen() {
        clearTimeout(window.state.zenTimer);
        if (window.ui.shell.classList.contains('zen')) return;
        if (window.state.playing) {
            window.state.zenTimer = setTimeout(enterZenMode, 4000);
        }
    }

    function runHydra() {
        if (viz.useFallback) {
            window.SonoriaUtils.showToast('当前使用兼容模式，Hydra代码不可用');
            return;
        }
        var code = document.getElementById('hydra-code').value;
        try {
            /* eslint-disable no-new-func */
            new Function(code)();
            window.SonoriaUtils.showToast('视觉效果已应用');
        } catch (e) {
            window.SonoriaUtils.showToast('Hydra错误: ' + e.message);
            console.error(e);
        }
    }

    function resetHydra() {
        if (viz.useFallback) {
            window.SonoriaUtils.showToast('当前使用兼容模式');
            return;
        }
        viz.applyStyle(window.state.mode);
        window.SonoriaUtils.showToast('已重置为主题预设');
    }

    // 修复：Strudel 用 strudelEngine.evaluate，audio engine 异步 init
    function runStrudel() {
        window.engine.stop(false);
        var code = document.getElementById('strudel-code').value;
        if (!strudel) {
            window.SonoriaUtils.showToast('Strudel引擎未加载');
            return;
        }
        window.SonoriaUtils.showToast('正在生成音乐...');
        strudel.evaluate(code).then(function (ok) {
            if (ok) {
                window.state.strudelPlaying = true;
                window.engine.updateMeta('Strudel Live Code', 'Generative Music');
                window.engine.startUI();
                var drawer = document.getElementById('strudel-drawer');
                if (drawer) drawer.classList.remove('open');
            }
        }).catch(function (e) {
            window.SonoriaUtils.showToast('Strudel错误: ' + e.message);
            console.error(e);
        });
    }

    function stopStrudel() {
        if (window.state.strudelPlaying) {
            if (strudel) strudel.hush();
            window.state.strudelPlaying = false;
            window.engine.stopUI();
            window.SonoriaUtils.showToast('已停止生成');
        }
    }

    function randomSmartTheme() {
        var next = viz.getSmartStyle();
        if (viz.useFallback) {
            window.SonoriaUtils.showToast('兼容模式: ' + next.name);
            window.state.mode = next.id;
        } else {
            viz.applyStyle(next.id);
        }
    }

    window.SonoriaUI = {
        init: init,
        toggleDrawer: toggleDrawer,
        enterZenMode: enterZenMode,
        resetZen: resetZen,
        runHydra: runHydra,
        resetHydra: resetHydra,
        runStrudel: runStrudel,
        stopStrudel: stopStrudel,
        randomSmartTheme: randomSmartTheme
    };
})();
