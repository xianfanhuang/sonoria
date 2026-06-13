/**
 * Utilities
 * 通用工具函数
 */
(function () {
    'use strict';

    function showToast(m) {
        var msg = document.getElementById('toast-msg');
        if (msg) msg.innerText = m;
        var t = document.getElementById('toast');
        if (!t) return;
        t.classList.add('show');
        clearTimeout(t._timer);
        t._timer = setTimeout(function () {
            t.classList.remove('show');
        }, 2000);
    }

    function hideLoading() {
        var loader = document.getElementById('loading-indicator');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(function () {
                loader.style.display = 'none';
            }, 500);
        }
    }

    function fmt(s) {
        if (!s || isNaN(s)) return '0:00';
        var m = Math.floor(s / 60);
        var sec = Math.floor(s % 60);
        return m + ':' + (sec < 10 ? '0' : '') + sec;
    }

    window.SonoriaUtils = {
        showToast: showToast,
        hideLoading: hideLoading,
        fmt: fmt
    };
})();
