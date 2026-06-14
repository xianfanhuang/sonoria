/**
 * BaseVisualizer — 统一适配层契约
 *
 * 作为 V6 AudioEngine 与 Three.js 可视化器的桥梁。
 * 所有自定义可视化引擎应实现此接口以确保与 Sonoria 框架兼容。
 *
 * 关键设计：
 *   - 通过 window.state.analyser 读取频域数据（由 AudioEngine.initContext 创建）
 *   - start/stop 控制动画循环
 *   - setMode 切换视觉模式（'normal' | 'air-resonance'）
 *   - analyser getter 返回外部分析器节点
 *
 * 接口对齐参考：
 *   - viz.start() / viz.stop() / viz.resize()
 *   - viz.applyStyle(styleId) / viz.getSmartStyle()
 *   - viz.useFallback (Boolean)
 */
(function () {
    'use strict';

    /**
     * @param {HTMLCanvasElement} canvas - 渲染目标 canvas
     * @param {AudioContext} [audioContext] - 可选 AudioContext（不传则使用 window.state.ctx）
     */
    function BaseVisualizer(canvas, audioContext) {
        this.canvas = canvas;
        this._audioContext = audioContext || null;
        this._running = false;
        this._mode = 'normal';
        this._analyser = null;
        this.useFallback = false;
    }

    /**
     * 连接音频元素（可选实现，子类可覆盖）
     * @param {HTMLAudioElement} audioElement
     */
    BaseVisualizer.prototype.connectAudio = function (audioElement) {
        // 子类可选实现：创建额外的分析器节点
    };

    /**
     * 启动可视化动画循环
     */
    BaseVisualizer.prototype.start = function () {
        this._running = true;
    };

    /**
     * 停止可视化动画循环
     */
    BaseVisualizer.prototype.stop = function () {
        this._running = false;
    };

    /**
     * 切换视觉模式
     * @param {'normal'|'air-resonance'} mode
     */
    BaseVisualizer.prototype.setMode = function (mode) {
        if (mode === 'normal' || mode === 'air-resonance') {
            this._mode = mode;
        }
    };

    /**
     * 清理资源（析构时调用）
     */
    BaseVisualizer.prototype.dispose = function () {
        this.stop();
        this._analyser = null;
    };

    /**
     * 获取分析器节点
     * @returns {AnalyserNode|null}
     */
    Object.defineProperty(BaseVisualizer.prototype, 'analyser', {
        get: function () {
            return window.state && window.state.analyser ? window.state.analyser : this._analyser;
        }
    });

    /**
     * 响应窗口尺寸变化（子类应覆盖）
     */
    BaseVisualizer.prototype.resize = function () {
        // 子类实现
    };

    /**
     * 应用视觉风格/模式（与 HydraVisualizer 接口对齐）
     * @param {string} styleId
     */
    BaseVisualizer.prototype.applyStyle = function (styleId) {
        if (styleId === 'air-resonance') {
            this.setMode('air-resonance');
        } else {
            this.setMode('normal');
        }
    };

    /**
     * 获取智能推荐风格（与 HydraVisualizer 接口对齐）
     * @returns {Object}
     */
    BaseVisualizer.prototype.getSmartStyle = function () {
        return window.visualStyles ? window.visualStyles[0] : { id: 'normal', name: 'normal' };
    };

    /**
     * 渲染风格网格（与 HydraVisualizer 接口对齐）
     */
    BaseVisualizer.prototype.renderStyleGrid = function () {
        // Anton 版无风格网格，空实现防止报错
    };

    /**
     * 更新风格网格（与 HydraVisualizer 接口对齐）
     */
    BaseVisualizer.prototype.updateStyleGrid = function () {
        // Anton 版无风格网格，空实现防止报错
    };

    window.BaseVisualizer = BaseVisualizer;
})();