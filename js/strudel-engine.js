/**
 * Strudel Engine
 * Strudel 实时音乐代码引擎封装
 *
 * 暴露：window.StrudelEngine
 *
 * 关键设计（v6.0.2 修复）：
 *   - initStrudel(opts) 接收 audioContext 参数，与 Sonoria 共享同一 ctx
 *   - 延迟初始化：第一次 evaluate 时才 init，确保 window.state.ctx 已就绪
 *   - 所有音频统一走 window.state.ctx → analyser → destination
 *   - v6.0.3: 在 initStrudel 的 onReady 回调中显式连接 Strudel 输出到 destination
 *   - 修复 strudel 独立 ctx 导致的"有 viz 无声音"问题
 */
(function () {
    'use strict';
    function StrudelEngine() {
        this.repl = null;
        this.readyPromise = null;
        this._initialized = false;
        // v6.0.2: 延迟初始化，等待第一次 evaluate
    }

    // v6.0.2: 延迟初始化，确保 Sonoria AudioContext 已创建后再 init Strudel
    StrudelEngine.prototype._init = function () {
        if (typeof window.initStrudel !== 'function') {
            console.warn('[Strudel] Library not loaded');
            return;
        }
        if (this._initialized) return;
        this._initialized = true;

        var self = this;

        // 确保 Sonoria AudioContext 已创建（返回 Promise）
        var ensureSonoriaCtx = function () {
            return new Promise(function (resolve) {
                if (window.engine && typeof window.engine.initContext === 'function') {
                    window.engine.initContext().then(function () {
                        resolve(window.state && window.state.ctx);
                    }).catch(function (err) {
                        console.warn('[Strudel] initContext failed:', err);
                        resolve(null);
                    });
                } else {
                    console.warn('[Strudel] engine.initContext not available');
                    resolve(null);
                }
            });
        };

        this.readyPromise = ensureSonoriaCtx().then(function (sonoriaCtx) {
            var opts = {
                prebake: function () {
                    if (typeof window.samples === 'function') {
                        return window.samples('github:tidalcycles/dirt-samples');
                    }
                }
            };

            // v6.0.2 核心修复：传 Sonoria 的 ctx，让 Strudel 音频统一走 analyser
            if (sonoriaCtx) {
                opts.audioContext = sonoriaCtx;
                console.log('[Strudel v6.0.2] Using shared AudioContext');
                
                // v6.0.3: 在初始化完成后，手动确保连接到 destination
                // Strudel 的 repl.synth 是主合成器，需要连接到 analyser 和 destination
                opts.onReady = function (repl) {
                    if (repl && repl.synth) {
                        try {
                            // Strudel synth 输出需要连接到 analyser (用于可视化)
                            if (!repl.synth.destination || repl.synth.destination !== window.state.analyser) {
                                repl.synth.connect(window.state.analyser);
                                console.log('[Strudel v6.0.3] Connected synth to analyser');
                            }
                            // v6.0.3 关键修复：连接到 destination（正确的声音输出路径）
                            if (!window.state.strudelConnected) {
                                repl.synth.connect(window.state.ctx.destination);
                                window.state.strudelConnected = true;
                                console.log('[Strudel v6.0.3] Connected synth to destination ✓ Sound enabled');
                            }
                        } catch (e) {
                            console.warn('[Strudel v6.0.3] Connection setup warning:', e);
                        }
                    }
                };
            } else {
                console.warn('[Strudel v6.0.2] Sonoria ctx not ready, falling back to isolated ctx');
            }

            return window.initStrudel(opts);
        }).then(function (repl) {
            self.repl = repl;
            
            // v6.0.3: 确保 onReady 执行后再显示就绪提示
            if (repl && repl.synth) {
                try {
                    if (!repl.synth.connected) {
                        repl.synth.connect(window.state.analyser);
                        repl.synth.connect(window.state.ctx.destination);
                        window.state.strudelConnected = true;
                        console.log('[Strudel v6.0.3] Secondary connection pass - Sound enabled ✓');
                    }
                } catch (e) {
                    console.warn('[Strudel v6.0.3] Secondary connection failed:', e);
                }
            }
            
            window.SonoriaUtils.showToast('Strudel引擎已就绪');
            return repl;
        }).catch(function (e) {
            console.error('[Strudel] Init failed:', e);
            window.SonoriaUtils.showToast('Strudel初始化失败');
            self.repl = null;
            self.readyPromise = null;
            self._initialized = false;
            return null;
        });
    };

    StrudelEngine.prototype._ensureReady = function () {
        var self = this;
        // v6.0.2: 延迟初始化触发点 - 第一次调用时才开始 init
        if (!self._initialized) {
            self._init();
        }
        return new Promise(function (resolve) {
            if (self.repl) return resolve(self.repl);
            if (!self.readyPromise) {
                window.SonoriaUtils.showToast('Strudel未就绪');
                return resolve(null);
            }
            self.readyPromise.then(function (repl) { resolve(repl); });
        });
    };

    StrudelEngine.prototype.evaluate = function (code) {
        var self = this;
        return this._ensureReady().then(function (repl) {
            if (!repl) return false;
            if (typeof repl.evaluate !== 'function') {
                throw new Error('Repl.evaluate not available');
            }
            return repl.evaluate(code).then(function () {
                // v6.0.3: evaluate 后再确认一次连接状态
                if (repl.synth && !window.state.strudelConnected) {
                    try {
                        repl.synth.connect(window.state.analyser);
                        repl.synth.connect(window.state.ctx.destination);
                        window.state.strudelConnected = true;
                        console.log('[Strudel v6.0.3] Audio routed to destination on evaluate');
                    } catch (e) {
                        console.warn('[Strudel v6.0.3] Post-evaluate connection:', e);
                    }
                }
                window.SonoriaUtils.showToast('音乐生成中');
                return true;
            });
        });
    };

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
