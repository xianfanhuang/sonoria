/**
 * WebGL Support Detection
 * 检测 GPU 能力，决定是否使用 WebGL/Hydra 或降级到 Canvas 2D
 *
 * 暴露：window.webglSupport = { available: boolean, level: 0|1|2|3 }
 *   - level 0: 无 WebGL → 强制 Canvas 2D
 *   - level 1: 低端 GPU (PowerVR, Mali-4/T, 旧 Intel HD)
 *   - level 2: 中端 GPU
 *   - level 3: 高端 GPU (Apple, Adreno 6+, Mali-G7+, NVIDIA, AMD)
 */
(function () {
    'use strict';
    var support = { available: false, level: 0 };
    try {
        var canvas = document.createElement('canvas');
        var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            support.available = true;
            var debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            var renderer = debugInfo
                ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
            if (/PowerVR|Mali-4|Mali-T|Intel.*HD.*[0-5]/.test(renderer)) {
                support.level = 1;
            } else if (/Apple GPU|Adreno [6-9]|Mali-G[7-9]|NVIDIA|AMD/.test(renderer)) {
                support.level = 3;
            } else {
                support.level = 2;
            }
        }
    } catch (e) {
        console.log('WebGL detection failed');
    }
    window.webglSupport = support;
})();
