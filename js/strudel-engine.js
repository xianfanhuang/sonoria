/**
 * Strudel Engine
 * Strudel 实时音乐代码引擎封装
 *
 * 暴露：window.StrudelEngine
 *
 * 关键设计（修复根因）：
 *   - initStrudel(opts) 返回 Promise<Repl>，必须 await
 *   - Repl 实例提供 evaluate(code) / hush() / start() / stop() 等方法
 *   - 错误地调用全局 evaluate/hush 会失败（"Can't find variable: evaluate"）
 *   - 任何代码运行前必须先 await init 完成
 */
(function () {
    'use strict';

    function StrudelEngine() {
        this.repl = null;
        this.readyPromise = null;
        this._init();
    }

    // 初始化：fire-and-forget，但保存 Promise 以便后续 await
    StrudelEngine.prototype._init = function () {
        if (typeof window.initStrudel !== 'function') {
            console.warn('Strudel library not loaded');
            return;
        }
        try {
            this.readyPromise = window.initStrudel({
                prebake: function () {
                    // samples 是 Strudel 提供的全局（如果库支持预烘焙）
                    if (typeof window.samples === 'function') {
                        return window.samples('github:tidalcycles/dirt-samples');
                    }
                }
            }).then(function (repl) {
                // repl 是 Repl 实例（含 evaluate/hush/start/stop）
                this.repl = repl;
                window.SonoriaUtils.showToast('Strudel引擎已就绪');
                return repl;
            }.bind(this)).catch(function (e) {
                console.error('Strudel init failed:', e);
                window.SonoriaUtils.showToast('Strudel初始化失败');
                this.repl = null;
                this.readyPromise = null;
                return null;
            }.bind(this));
        } catch (e) {
            console.error('Strudel sync init error:', e);
        }
    };

    // 等待初始化完成（其他方法内部调用）
    StrudelEngine.prototype._ensureReady = function () {
        var self = this;
        return new Promise(function (resolve) {
            if (self.repl) return resolve(self.repl);
            if (!self.readyPromise) {
                window.SonoriaUtils.showToast('Strudel未就绪');
                return resolve(null);
            }
            self.readyPromise.then(function (repl) { resolve(repl); });
        });
    };

    // 运行 Strudel 代码
    StrudelEngine.prototype.evaluate = function (code) {
        var self = this;
        return this._ensureReady().then(function (repl) {
            if (!repl) return false;
            if (typeof repl.evaluate !== 'function') {
                throw new Error('Repl.evaluate not available');
            }
            return repl.evaluate(code).then(function () {
                window.SonoriaUtils.showToast('音乐生成中');
                return true;
            });
        });
    };

    // 停止所有正在播放的 pattern
    StrudelEngine.prototype.hush = function () {
        if (this.repl && typeof this.repl.hush === 'function') {
            this.repl.hush();
            return true;
        }
        return false;
    };

    StrudelEngine.prototype.isReady = function () {
        return this.repl !== null;
    };

    window.StrudelEngine = StrudelEngine;
})();
