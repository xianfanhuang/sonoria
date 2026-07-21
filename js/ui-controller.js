/**
 * UI Controller v7.0
 * Sonoria — 界面行为：drawer、Zen模式、手势、键盘、无障碍、风格面板
 *
 * 暴露：window.SonoriaUI
 *   - init(audioEngine, visualizer, strudelEngine)
 *   - toggleDrawer(id)
 *   - enterZenMode() / resetZen()
 *   - runHydra() / resetHydra()
 *   - runStrudel() / stopStrudel()
 *   - randomSmartTheme()
 */
(function () {
    'use strict';

    var _engine  = null;
    var _viz     = null;
    var _strudel = null;

    /* ============================================================
       INIT
    ============================================================ */
    function init(audioEngine, visualizer, strudelEngine) {
        _engine  = audioEngine;
        _viz     = visualizer;
        _strudel = strudelEngine;

        _buildStyleGrid();
        _bindCoreEvents();
        _bindKeyboard();
        _bindGestures();
        _initProgressScrub();
    }

    /* ============================================================
       STYLE GRID BUILDER
    ============================================================ */
    function _buildStyleGrid() {
        var grid = document.getElementById('style-grid');
        if (!grid) return;

        var styles = window.visualStyles || [];
        grid.innerHTML = styles.map(function (s) {
            return '<div class="style-card' +
                (s.id === window.state.mode ? ' active' : '') +
                '" role="option" aria-selected="' + (s.id === window.state.mode) + '"' +
                ' tabindex="0"' +
                ' onclick="window.SonoriaUI.selectStyle(\'' + s.id + '\')"' +
                ' onkeypress="if(event.key===\'Enter\')window.SonoriaUI.selectStyle(\'' + s.id + '\')">' +
                '<div class="style-card-name">' + (s.nameEn || s.name) + '</div>' +
                '<div class="style-card-desc">' + s.description + '</div>' +
                '<div class="style-card-cat">' + (s.category || '') + ' · ' + (s.emotion || '') + '</div>' +
                '</div>';
        }).join('');
    }

    function selectStyle(id) {
        window.state.mode = id;
        _viz && _viz.applyStyle(id);
        _buildStyleGrid();
        window.SonoriaUtils.showToast((function () {
            var s = (window.visualStyles || []).find(function (st) { return st.id === id; });
            return s ? (s.nameEn || s.name) + ' — ' + (s.emotion || '') : id;
        })());
    }

    /* ============================================================
       CORE EVENT BINDING
    ============================================================ */
    function _bindCoreEvents() {
        // Play button
        var mainPlay = document.getElementById('main-play');
        if (mainPlay) {
            mainPlay.addEventListener('click', function (e) {
                e.stopPropagation();
                _engine && _engine.togglePlay();
            });
        }

        // Capsule play
        var capPlay = document.getElementById('capsule-play');
        if (capPlay) {
            capPlay.addEventListener('click', function (e) {
                e.stopPropagation();
                _engine && _engine.togglePlay();
            });
        }

        // Mic button
        var micBtn = document.getElementById('mic-btn');
        if (micBtn) {
            micBtn.addEventListener('click', function () {
                _engine && _engine.toggleMic();
            });
        }

        // File input
        var fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', function (e) {
                _engine && _engine.handleFiles(e.target.files);
            });
        }

        // URL input Enter key
        var urlInput = document.getElementById('url-input');
        if (urlInput) {
            urlInput.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    var url = e.target.value.trim();
                    if (url) _engine && _engine.playUrl(url);
                }
            });
        }

        // Volume slider
        var volSlider = document.getElementById('vol-slider');
        if (volSlider) {
            volSlider.addEventListener('input', function (e) {
                var val = parseFloat(e.target.value);
                if (window.state.gainNode) {
                    window.state.gainNode.gain.value = val;
                }
            });
        }

        // Zen — click on shell background exits zen
        var app = document.getElementById('app');
        if (app) {
            app.addEventListener('click', function () {
                if (app.classList.contains('zen')) {
                    app.classList.remove('zen');
                    resetZen();
                }
            });
        }

        // Card stops propagation (don't close zen when clicking card)
        var card = document.getElementById('card');
        if (card) {
            card.addEventListener('click', function (e) { e.stopPropagation(); });
        }

        // Capsule stops propagation
        var capsule = document.getElementById('capsule');
        if (capsule) {
            capsule.addEventListener('click', function (e) { e.stopPropagation(); });
        }

        // Resize
        window.addEventListener('resize', function () {
            _viz && _viz.resize();
        });

        // Drag-and-drop audio files onto the page
        document.addEventListener('dragover', function (e) { e.preventDefault(); });
        document.addEventListener('drop', function (e) {
            e.preventDefault();
            var files = e.dataTransfer.files;
            if (files.length) _engine && _engine.handleFiles(files);
        });
    }

    /* ============================================================
       KEYBOARD SHORTCUTS
    ============================================================ */
    function _bindKeyboard() {
        document.addEventListener('keydown', function (e) {
            // Ignore when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    _engine && _engine.togglePlay();
                    break;
                case 'ArrowRight':
                    _engine && _engine.playNext();
                    break;
                case 'ArrowLeft':
                    _engine && _engine.playPrev();
                    break;
                case 'KeyZ':
                    enterZenMode();
                    break;
                case 'Escape':
                    var app = document.getElementById('app');
                    if (app && app.classList.contains('zen')) {
                        app.classList.remove('zen');
                        resetZen();
                    }
                    // Close any open drawer
                    document.querySelectorAll('.drawer.open').forEach(function (d) {
                        d.classList.remove('open');
                    });
                    break;
                case 'KeyM':
                    _engine && _engine.toggleMic();
                    break;
                case 'KeyR':
                    randomSmartTheme();
                    break;
            }
        });
    }

    /* ============================================================
       GESTURE (SWIPE)
    ============================================================ */
    function _bindGestures() {
        var touchStartX = 0;
        var touchStartY = 0;
        var touchStartTime = 0;

        document.addEventListener('touchstart', function (e) {
            touchStartX    = e.touches[0].clientX;
            touchStartY    = e.touches[0].clientY;
            touchStartTime = Date.now();
        }, { passive: true });

        document.addEventListener('touchend', function (e) {
            var dx      = e.changedTouches[0].clientX - touchStartX;
            var dy      = e.changedTouches[0].clientY - touchStartY;
            var dt      = Date.now() - touchStartTime;
            var absDx   = Math.abs(dx);
            var absDy   = Math.abs(dy);

            if (dt > 400) return; // too slow
            if (absDx < 40 && absDy < 40) return; // too short

            var app = document.getElementById('app');

            if (absDx > absDy) {
                // Horizontal swipe — change track
                if (dx > 0) {
                    _engine && _engine.playPrev();
                } else {
                    _engine && _engine.playNext();
                }
            } else if (dy < -60 && app) {
                // Swipe up — enter zen
                enterZenMode();
            } else if (dy > 60 && app && app.classList.contains('zen')) {
                // Swipe down — exit zen
                app.classList.remove('zen');
                resetZen();
            }
        }, { passive: true });
    }

    /* ============================================================
       PROGRESS SCRUBBING
    ============================================================ */
    function _initProgressScrub() {
        var wrap = document.getElementById('progress-wrap');
        if (!wrap) return;

        function scrub(clientX) {
            if (!window.state.audioEl || window.state.strudelPlaying) return;
            var rect = wrap.getBoundingClientRect();
            var pct  = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
            var el   = window.state.audioEl;
            if (el && el.duration && !isNaN(el.duration)) {
                el.currentTime = el.duration * pct;
            }
        }

        wrap.addEventListener('click', function (e) { scrub(e.clientX); });

        var dragging = false;
        wrap.addEventListener('mousedown',  function () { dragging = true; });
        window.addEventListener('mouseup',  function () { dragging = false; });
        window.addEventListener('mousemove', function (e) {
            if (dragging) scrub(e.clientX);
        });

        // Touch scrub
        wrap.addEventListener('touchstart', function (e) {
            e.stopPropagation();
        }, { passive: true });
        wrap.addEventListener('touchmove', function (e) {
            e.stopPropagation();
            scrub(e.touches[0].clientX);
        }, { passive: true });
    }

    /* ============================================================
       DRAWER
    ============================================================ */
    function toggleDrawer(id) {
        var target = document.getElementById(id);
        if (!target) return;

        var isOpen = target.classList.contains('open');

        // Close all drawers
        document.querySelectorAll('.drawer').forEach(function (d) {
            d.classList.remove('open');
        });

        // Open target if it was closed
        if (!isOpen) {
            target.classList.add('open');
        }
    }

    /* ============================================================
       ZEN MODE
    ============================================================ */
    function enterZenMode() {
        var app = document.getElementById('app');
        if (app) app.classList.add('zen');
    }

    function resetZen() {
        clearTimeout(window.state.zenTimer);
        var app = document.getElementById('app');
        if (!app || app.classList.contains('zen')) return;
        if (window.state.playing) {
            window.state.zenTimer = setTimeout(enterZenMode, 5000);
        }
    }

    /* ============================================================
       HYDRA CODE
    ============================================================ */
    function runHydra() {
        if (_viz && _viz.useFallback) {
            window.SonoriaUtils.showToast('Canvas mode — Hydra code not available');
            return;
        }
        var code = document.getElementById('hydra-code');
        if (!code) return;
        try {
            /* eslint-disable no-new-func */
            var f = new Function('s', 'o0', 'o1', 'o2', 'o3', 'time', 'window', code.value);
            var s = _viz.synth;
            f(s, s.o0, s.o1, s.o2, s.o3, window.time, window);
            window.SonoriaUtils.showToast('Visual applied');
        } catch (e) {
            window.SonoriaUtils.showToast('Hydra error: ' + e.message);
            console.error('[Sonoria] Hydra error:', e);
        }
    }

    function resetHydra() {
        if (_viz && _viz.useFallback) {
            window.SonoriaUtils.showToast('Canvas mode active');
            return;
        }
        _viz && _viz.applyStyle(window.state.mode);
        window.SonoriaUtils.showToast('Visual reset');
    }

    /* ============================================================
       STRUDEL CODE
    ============================================================ */
    function runStrudel() {
        _engine && _engine.stop(false);
        var code = document.getElementById('strudel-code');
        if (!code) return;
        if (!_strudel) {
            window.SonoriaUtils.showToast('Strudel engine not ready');
            return;
        }
        window.SonoriaUtils.showToast('Generating music...');
        _strudel.evaluate(code.value)
            .then(function (ok) {
                if (ok) {
                    window.state.strudelPlaying = true;
                    _engine && _engine.updateMeta('Strudel Live Code', 'Generative Music');
                    _engine && _engine.startUI();
                    var drawer = document.getElementById('code-drawer');
                    if (drawer) drawer.classList.remove('open');
                    // Switch to energized emotion for generative music
                    _viz && _viz.setEmotion('energized');
                }
            })
            .catch(function (e) {
                window.SonoriaUtils.showToast('Strudel error: ' + e.message);
                console.error('[Sonoria] Strudel error:', e);
            });
    }

    function stopStrudel() {
        if (window.state.strudelPlaying) {
            _strudel && _strudel.hush && _strudel.hush();
            window.state.strudelPlaying = false;
            _engine && _engine.stopUI();
            window.SonoriaUtils.showToast('Generative music stopped');
        }
    }

    /* ============================================================
       SMART THEME
    ============================================================ */
    function randomSmartTheme() {
        var style = _viz && _viz.getSmartStyle();
        if (style) {
            window.state.mode = style.id;
            _buildStyleGrid();
            window.SonoriaUtils.showToast(
                (style.nameEn || style.name) + ' — ' + (style.emotion || '')
            );
        }
    }

    /* ============================================================
       PUBLIC API
    ============================================================ */
    window.SonoriaUI = {
        init:            init,
        toggleDrawer:    toggleDrawer,
        selectStyle:     selectStyle,
        enterZenMode:    enterZenMode,
        resetZen:        resetZen,
        runHydra:        runHydra,
        resetHydra:      resetHydra,
        runStrudel:      runStrudel,
        stopStrudel:     stopStrudel,
        randomSmartTheme: randomSmartTheme
    };
})();
