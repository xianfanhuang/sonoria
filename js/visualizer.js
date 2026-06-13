/**
 * Visualizer
 * Hydra (WebGL) + Canvas 2D Fallback 渲染引擎
 *
 * 暴露：window.HydraVisualizer
 *
 * 关键设计：
 *   - WebGL 不可用或上下文丢失 → 自动降级 Canvas 2D
 *   - Canvas 2D 使用独立 canvas 元素（避免 WebGL 上下文冲突）
 *   - setStyle() 统一 WebGL/2D 入口，自动处理切换
 *   - 风格列表来自 window.visualStyles（元数据 + Hydra 渲染）
 */
(function () {
    'use strict';

    function HydraVisualizer(canvas) {
        this.canvas = canvas;
        this.hydra = null;
        this.ctx2d = null;
        this.canvas2d = null;
        this.useFallback = false;
        this.currentStyle = null;
        this.energy = 0;
        this.low = 0;
        this.mid = 0;
        this.high = 0;
        this.hue = 0;
        this.transitioning = false;
        this.audioLoopId = null;
        this.audioBuffer = new Uint8Array(128);
        this.isContextLost = false;
        this._init();
        this.renderStyleGrid();
    }

    HydraVisualizer.prototype._init = function () {
        if (!window.webglSupport || !window.webglSupport.available) {
            console.warn('WebGL not available, using Canvas 2D fallback');
            this.useFallback = true;
            this._initCanvas2D();
            return;
        }

        try {
            this.hydra = new Hydra({
                canvas: this.canvas,
                detectAudio: false,
                enableStreamCapture: false,
                precision: window.webglSupport.level >= 2 ? 'medium' : 'low',
                width: window.innerWidth,
                height: window.innerHeight
            });

            window.hydra = this.hydra;
            window.s = this.hydra.synth;
            window.a = this.hydra.audio;

            var self = this;
            this.canvas.addEventListener('webglcontextlost', function (e) {
                e.preventDefault();
                console.log('WebGL context lost, switching to Canvas 2D fallback');
                self.isContextLost = true;
                self.hydra = null;
                self.useFallback = true;
                self._initCanvas2D();
                window.SonoriaUtils.showToast('已切换到兼容模式');
                if (window.state.playing && !self.audioLoopId) {
                    self.start();
                }
            }, false);

            this.canvas.addEventListener('webglcontextrestored', function () {
                console.log('WebGL context restored');
                self.isContextLost = false;
                self._init();
                if (window.state.playing) self.start();
            }, false);

        } catch (e) {
            console.error('Hydra init failed:', e);
            window.SonoriaUtils.showToast('高级可视化不可用，使用兼容模式');
            this.useFallback = true;
            this._initCanvas2D();
        }
    };

    // Canvas 2D Fallback：独立 canvas 元素，避免 WebGL 上下文冲突
    HydraVisualizer.prototype._initCanvas2D = function () {
        this.useFallback = true;
        if (!this.canvas2d) {
            this.canvas2d = document.createElement('canvas');
            this.canvas2d.id = 'visualizer-2d';
            this.canvas2d.style.position = 'fixed';
            this.canvas2d.style.top = '0';
            this.canvas2d.style.left = '0';
            this.canvas2d.style.width = '100%';
            this.canvas2d.style.height = '100%';
            this.canvas2d.style.zIndex = '1';
            this.canvas2d.style.opacity = '0';
            this.canvas2d.style.transition = 'opacity 0.5s ease';
            this.canvas.parentNode.insertBefore(this.canvas2d, this.canvas.nextSibling);
        }
        this.ctx2d = this.canvas2d.getContext('2d');
        this.canvas2d.width = window.innerWidth;
        this.canvas2d.height = window.innerHeight;
        this.canvas.style.opacity = '0';
        this.canvas2d.style.opacity = '1';
        console.log('Canvas 2D fallback initialized with dedicated canvas');
    };

    HydraVisualizer.prototype.renderCanvas2D = function () {
        if (!this.ctx2d || !window.state.analyser) return;
        var ctx = this.ctx2d;
        var width = this.canvas2d.width;
        var height = this.canvas2d.height;
        var data = this.audioBuffer;
        var style = window.state.mode || 'aurora';
        window.state.analyser.getByteFrequencyData(data);

        var lowEnergy = data.slice(0, 10).reduce(function (a, b) { return a + b; }, 0) / 10;
        var midEnergy = data.slice(10, 40).reduce(function (a, b) { return a + b; }, 0) / 30;
        var highEnergy = data.slice(40, 64).reduce(function (a, b) { return a + b; }, 0) / 24;
        var totalEnergy = data.reduce(function (a, b) { return a + b; }, 0) / data.length;

        switch (style) {
            case 'cosmic':
                ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
                ctx.fillRect(0, 0, width, height);
                this._drawParticles(ctx, width, height, data, lowEnergy);
                break;
            case 'neural':
                ctx.fillStyle = 'rgba(0, 0, 10, 0.25)';
                ctx.fillRect(0, 0, width, height);
                this._drawNeuralNetwork(ctx, width, height, data, midEnergy);
                break;
            case 'liquid':
                ctx.fillStyle = 'rgba(0, 10, 20, 0.2)';
                ctx.fillRect(0, 0, width, height);
                this._drawRipples(ctx, width, height, totalEnergy);
                break;
            case 'spectrum':
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.fillRect(0, 0, width, height);
                this._drawSpectrum(ctx, width, height, data);
                break;
            case 'nebula':
                ctx.fillStyle = 'rgba(10, 0, 20, 0.15)';
                ctx.fillRect(0, 0, width, height);
                this._drawNebula(ctx, width, height, lowEnergy, totalEnergy);
                break;
            case 'crystal':
                ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.fillRect(0, 0, width, height);
                this._drawCrystal(ctx, width, height, midEnergy, highEnergy);
                break;
            case 'matrix':
                ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                ctx.fillRect(0, 0, width, height);
                this._drawMatrix(ctx, width, height, data, highEnergy);
                break;
            case 'pulse':
                ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
                ctx.fillRect(0, 0, width, height);
                this._drawPulse(ctx, width, height, totalEnergy);
                break;
            case 'flow':
                ctx.fillStyle = 'rgba(5, 5, 15, 0.2)';
                ctx.fillRect(0, 0, width, height);
                this._drawFlow(ctx, width, height, data, lowEnergy);
                break;
            case 'aurora':
            default:
                ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.fillRect(0, 0, width, height);
                this._drawAurora(ctx, width, height, data, lowEnergy);
                break;
        }

        this.energy = totalEnergy / 255;
        var scale = 1 + this.energy * 0.35;
        var themeColor = 'hsl(' + this.hue + ', 80%, 60%)';
        window.ui.capsuleCore.style.transform = 'scale(' + scale + ')';
        window.ui.ringLogo.style.color = themeColor;
        window.ui.ringProgress.style.stroke = themeColor;
        window.ui.capsuleCore.style.boxShadow =
            '0 0 ' + (15 + this.energy * 40) + 'px ' + themeColor + '66';
    };

    HydraVisualizer.prototype._drawAurora = function (ctx, width, height, data, energy) {
        var barCount = 64;
        var barWidth = width / barCount;
        var step = Math.floor(data.length / barCount);
        for (var i = 0; i < barCount; i++) {
            var value = data[i * step] || 0;
            var barHeight = (value / 255) * height * 0.7;
            var hue = (i / barCount) * 180 + 180 + this.hue;
            ctx.fillStyle = 'hsla(' + hue + ', 80%, 60%, 0.8)';
            ctx.fillRect(i * barWidth, height - barHeight, barWidth - 2, barHeight);
        }
        var radius = 60 + (energy / 255) * 120;
        var gradient = ctx.createRadialGradient(
            width / 2, height / 2, 0, width / 2, height / 2, radius
        );
        gradient.addColorStop(0, 'hsla(' + (this.hue + 180) + ', 80%, 60%, 0.3)');
        gradient.addColorStop(1, 'hsla(' + (this.hue + 180) + ', 80%, 60%, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    };

    HydraVisualizer.prototype._drawParticles = function (ctx, width, height, data, energy) {
        var particleCount = 50;
        var time = Date.now() / 1000;
        for (var i = 0; i < particleCount; i++) {
            var x = (Math.sin(i * 1.5 + time * 0.5) * 0.5 + 0.5) * width;
            var y = (Math.cos(i * 2.3 + time * 0.3) * 0.5 + 0.5) * height;
            var size = 2 + (data[i % 64] / 255) * 6;
            var hue = (i / particleCount) * 60 + 240 + this.hue;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = 'hsla(' + hue + ', 80%, 70%, ' +
                (0.3 + (energy / 255) * 0.7) + ')';
            ctx.fill();
        }
    };

    HydraVisualizer.prototype._drawNeuralNetwork = function (ctx, width, height, data, energy) {
        var nodes = 20;
        var nodePositions = [];
        var time = Date.now() / 1000;
        for (var i = 0; i < nodes; i++) {
            var angle = (i / nodes) * Math.PI * 2 + time * 0.2;
            var radius = 100 + Math.sin(i * 0.5 + time) * 50;
            nodePositions.push({
                x: width / 2 + Math.cos(angle) * radius,
                y: height / 2 + Math.sin(angle) * radius
            });
        }
        ctx.strokeStyle = 'hsla(340, 80%, 60%, 0.3)';
        ctx.lineWidth = 1;
        for (var ii = 0; ii < nodes; ii++) {
            for (var j = ii + 1; j < nodes; j++) {
                if (Math.random() > 0.85) {
                    ctx.beginPath();
                    ctx.moveTo(nodePositions[ii].x, nodePositions[ii].y);
                    ctx.lineTo(nodePositions[j].x, nodePositions[j].y);
                    ctx.stroke();
                }
            }
        }
        for (var k = 0; k < nodes; k++) {
            var size = 3 + (data[k % 64] / 255) * 5;
            ctx.beginPath();
            ctx.arc(nodePositions[k].x, nodePositions[k].y, size, 0, Math.PI * 2);
            ctx.fillStyle = 'hsla(340, 80%, 60%, 0.9)';
            ctx.fill();
        }
    };

    HydraVisualizer.prototype._drawRipples = function (ctx, width, height, energy) {
        var ripples = 5;
        var time = Date.now() / 1000;
        for (var i = 0; i < ripples; i++) {
            var radius = ((time * 50 + i * 60) % 300);
            var alpha = 1 - (radius / 300);
            var lineWidth = 2 + (energy / 255) * 4;
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'hsla(200, 80%, 60%, ' + alpha * 0.5 + ')';
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        }
    };

    HydraVisualizer.prototype._drawSpectrum = function (ctx, width, height, data) {
        var barCount = 32;
        var barWidth = width / barCount;
        var step = Math.floor(data.length / barCount);
        for (var i = 0; i < barCount; i++) {
            var value = data[i * step] || 0;
            var barHeight = (value / 255) * height * 0.6;
            var hue = (i / barCount) * 360 + this.hue;
            ctx.fillStyle = 'hsla(' + hue + ', 90%, 60%, 0.9)';
            ctx.fillRect(i * barWidth, height / 2 - barHeight / 2, barWidth - 2, barHeight);
        }
    };

    HydraVisualizer.prototype._drawNebula = function (ctx, width, height, lowEnergy, totalEnergy) {
        var time = Date.now() / 2000;
        var gradient = ctx.createRadialGradient(
            width / 2 + Math.sin(time) * 100,
            height / 2 + Math.cos(time) * 50,
            0, width / 2, height / 2, 400
        );
        gradient.addColorStop(0, 'hsla(' + (280 + this.hue) + ', 60%, 50%, ' +
            (lowEnergy / 255 * 0.5) + ')');
        gradient.addColorStop(0.5, 'hsla(' + (300 + this.hue) + ', 50%, 40%, ' +
            (totalEnergy / 255 * 0.3) + ')');
        gradient.addColorStop(1, 'hsla(320, 40%, 20%, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    };

    HydraVisualizer.prototype._drawCrystal = function (ctx, width, height, midEnergy, highEnergy) {
        var time = Date.now() / 1000;
        var sides = 6;
        var radius = 80 + (midEnergy / 255) * 60;
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate(time * 0.3);
        ctx.beginPath();
        for (var i = 0; i <= sides; i++) {
            var angle = (i / sides) * Math.PI * 2;
            var r = radius + Math.sin(i * 2 + time * 2) * 20;
            var x = Math.cos(angle) * r;
            var y = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = 'hsla(' + (this.hue + 320) + ', 80%, 70%, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
        var gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        gradient.addColorStop(0, 'hsla(' + (this.hue + 320) + ', 80%, 60%, ' +
            (highEnergy / 255 * 0.4) + ')');
        gradient.addColorStop(1, 'hsla(' + (this.hue + 320) + ', 80%, 60%, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.restore();
    };

    HydraVisualizer.prototype._drawMatrix = function (ctx, width, height, data, highEnergy) {
        var cols = 20;
        var colWidth = width / cols;
        var time = Date.now() / 100;
        for (var i = 0; i < cols; i++) {
            var dataIndex = i % 64;
            var charHeight = 14;
            var chars = Math.floor((data[dataIndex] / 255) * 20);
            var x = i * colWidth + colWidth / 2;
            for (var j = 0; j < chars; j++) {
                var y = (j * charHeight + time * 50) % height;
                var alpha = 1 - (j / chars);
                ctx.fillStyle = 'hsla(120, 100%, 50%, ' + alpha * (highEnergy / 255) + ')';
                ctx.font = '12px monospace';
                ctx.fillText(
                    String.fromCharCode(0x30A0 + Math.random() * 96),
                    x, y
                );
            }
        }
    };

    HydraVisualizer.prototype._drawPulse = function (ctx, width, height, energy) {
        var pulses = 8;
        var time = Date.now() / 1000;
        var eNorm = energy / 255;
        for (var i = 0; i < pulses; i++) {
            var radius = 30 + i * 40 + Math.sin(time * 2 + i) * 20;
            var lineWidth = 3 + eNorm * 5;
            var alpha = (1 - i / pulses) * (0.3 + eNorm * 0.7);
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'hsla(' + (this.hue + i * 20) + ', 80%, 60%, ' + alpha + ')';
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        }
    };

    HydraVisualizer.prototype._drawFlow = function (ctx, width, height, data, lowEnergy) {
        var waves = 5;
        var time = Date.now() / 1000;
        for (var w = 0; w < waves; w++) {
            ctx.beginPath();
            ctx.moveTo(0, height / 2);
            for (var x = 0; x < width; x += 5) {
                var dataIndex = Math.floor((x / width) * 64) % 64;
                var amplitude = (data[dataIndex] / 255) * 50 * (w + 1) / waves;
                var frequency = 0.01 + w * 0.005;
                var y = height / 2 + Math.sin(x * frequency + time + w) * amplitude;
                ctx.lineTo(x, y);
            }
            ctx.strokeStyle = 'hsla(' + (this.hue + w * 30) + ', 70%, 60%, 0.4)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    };

    HydraVisualizer.prototype.resize = function () {
        if (this.hydra) this.hydra.resize(window.innerWidth, window.innerHeight);
        if (this.ctx2d && this.canvas2d) {
            this.canvas2d.width = window.innerWidth;
            this.canvas2d.height = window.innerHeight;
        }
    };

    HydraVisualizer.prototype.start = function () {
        if (this.useFallback) {
            if (this.canvas2d) this.canvas2d.style.opacity = '1';
            this.updateAudioLoop();
            return;
        }
        if (!this.hydra || this.hydra.isRunning) return;
        this.hydra.render();
        this.updateAudioLoop();
        this.applyStyle(window.state.mode);
    };

    HydraVisualizer.prototype.stop = function () {
        if (this.useFallback) {
            if (this.audioLoopId) {
                cancelAnimationFrame(this.audioLoopId);
                this.audioLoopId = null;
            }
            if (this.ctx2d && this.canvas2d) {
                this.ctx2d.clearRect(0, 0, this.canvas2d.width, this.canvas2d.height);
            }
            return;
        }
        if (!this.hydra || !this.hydra.isRunning) return;
        this.hydra.clear();
        if (this.audioLoopId) {
            cancelAnimationFrame(this.audioLoopId);
            this.audioLoopId = null;
        }
    };

    HydraVisualizer.prototype.updateAudioLoop = function () {
        var self = this;
        if (!window.state.playing && !window.state.mic) return;
        this.audioLoopId = requestAnimationFrame(function () {
            self.updateAudioLoop();
        });

        if (this.useFallback) {
            this.renderCanvas2D();
            this.hue += 0.5;
            return;
        }

        if (!window.state.analyser || !this.hydra) return;
        window.state.analyser.getByteFrequencyData(this.audioBuffer);
        this.energy = this.audioBuffer.slice(0, 30).reduce(function (a, b) {
            return a + b;
        }, 0) / 30 / 255;
        this.low = this.audioBuffer.slice(0, 10).reduce(function (a, b) {
            return a + b;
        }, 0) / 10 / 255;
        this.mid = this.audioBuffer.slice(10, 40).reduce(function (a, b) {
            return a + b;
        }, 0) / 30 / 255;
        this.high = this.audioBuffer.slice(40, 128).reduce(function (a, b) {
            return a + b;
        }, 0) / 88 / 255;
        if (typeof window.a !== 'undefined') {
            window.a.low = this.low;
            window.a.mid = this.mid;
            window.a.high = this.high;
            window.a.energy = this.energy;
        }
        var scale = 1 + this.energy * 0.35;
        var themeColor = this.getCurrentThemeColor();
        window.ui.capsuleCore.style.transform = 'scale(' + scale + ')';
        window.ui.ringLogo.style.color = themeColor;
        window.ui.ringProgress.style.stroke = themeColor;
        window.ui.capsuleCore.style.boxShadow =
            '0 0 ' + (15 + this.energy * 40) + 'px ' + themeColor + '66';
        this.hue += 0.2 + this.energy;
    };

    HydraVisualizer.prototype.getCurrentThemeColor = function () {
        if (window.state.mode === 'aurora') return 'hsl(' + this.hue + ', 80%, 60%)';
        var t = window.themes.find(function (x) { return x.id === window.state.mode; });
        return t ? t.color : '#fff';
    };

    // 统一风格切换接口（WebGL 主动渲染 / Canvas 2D 被动读 state.mode）
    HydraVisualizer.prototype.setStyle = function (styleId) {
        if (this.transitioning) return;
        var self = this;
        var style = window.visualStyles.find(function (st) { return st.id === styleId; });
        if (!style) return;

        this.currentStyle = style;
        window.state.mode = styleId;

        if (this.useFallback) {
            this.updateStyleGrid();
            window.SonoriaUtils.showToast('Canvas模式: ' + style.name);
            return;
        }

        if (window.webglSupport.level < style.performanceLevel) {
            var fallback = window.visualStyles.find(function (st) {
                return st.performanceLevel <= window.webglSupport.level;
            }) || window.visualStyles[0];
            window.SonoriaUtils.showToast('设备性能不足，已切换到 ' + fallback.name);
            return this.setStyle(fallback.id);
        }

        this.transitioning = true;
        this.canvas.style.opacity = '0';
        setTimeout(function () {
            try {
                if (self.hydra) {
                    self.hydra.synth.reset();
                    style.render(self.hue, self.low, self.mid, self.high, self.energy);
                }
            } catch (e) {
                console.error('Style render error:', e);
                window.SonoriaUtils.showToast('风格渲染出错，切换到兼容模式');
                self.useFallback = true;
                self._initCanvas2D();
            }
            self.canvas.style.opacity = '1';
            self.transitioning = false;
            self.updateStyleGrid();
            window.SonoriaUtils.showToast('风格: ' + style.name);
        }, 300);
    };

    // 向后兼容：保留 applyStyle 别名
    HydraVisualizer.prototype.applyStyle = HydraVisualizer.prototype.setStyle;

    HydraVisualizer.prototype.getSmartStyle = function () {
        var self = this;
        var maxPerf = this.useFallback ? 1 : window.webglSupport.level;
        var candidates = window.visualStyles.filter(function (s) {
            var energyMatch = self.energy >= s.energyRange[0] &&
                self.energy <= s.energyRange[1];
            var perfMatch = s.performanceLevel <= maxPerf;
            var notCurrent = s.id !== window.state.mode;
            return energyMatch && perfMatch && notCurrent;
        });
        if (candidates.length === 0) {
            return window.visualStyles.find(function (s) {
                return s.performanceLevel <= maxPerf && s.id !== window.state.mode;
            }) || window.visualStyles[0];
        }
        return candidates[Math.floor(Math.random() * candidates.length)];
    };

    HydraVisualizer.prototype.renderStyleGrid = function () {
        var maxPerf = window.webglSupport.available ? window.webglSupport.level : 1;
        window.ui.styleGrid.innerHTML = window.visualStyles.map(function (s) {
            var disabled = s.performanceLevel > maxPerf ? 'opacity:0.3;' : '';
            return '<div class="style-card ' + (s.id === window.state.mode ? 'active' : '') + '" ' +
                'data-style-id="' + s.id + '" ' +
                'onclick="viz.applyStyle(\'' + s.id + '\'); toggleDrawer(\'styles-drawer\');" ' +
                'style="' + disabled + '">' +
                '<div class="style-name">' + s.name + '</div>' +
                '<div class="style-desc">' + s.description + '</div>' +
                '<div class="style-category">' + s.category + '</div>' +
                '</div>';
        }).join('');
    };

    HydraVisualizer.prototype.updateStyleGrid = function () {
        document.querySelectorAll('.style-card').forEach(function (card) {
            card.classList.toggle('active', card.dataset.styleId === window.state.mode);
        });
    };

    window.HydraVisualizer = HydraVisualizer;
})();
