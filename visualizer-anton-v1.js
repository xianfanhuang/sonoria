/**
 * AntonVisualizer — Three.js Anton 可视化引擎
 *
 * 基于 Three.js 的声波雕塑可视化器。
 * 实现与 HydraVisualizer 兼容的接口，可直接替换 visualizer.js。
 *
 * 设计语言：Anton 克制情绪——暖灰、陶土色、暗金、冷灰蓝
 * 核心机制：PlaneGeometry 顶点位移 + Float32BufferAttribute 粒子系统
 * 环境：纯黑背景 #0a0a0a + Three.js FogExp2 体积雾
 *
 * 暴露：window.AntonVisualizer
 * 接口对齐：viz.start() / viz.stop() / viz.resize()
 *           viz.applyStyle() / viz.getSmartStyle()
 *           viz.useFallback = false
 *
 * 依赖：THREE.js (r128+), BaseVisualizer (visualizer-engine.js)
 */
(function () {
    'use strict';

    if (typeof THREE === 'undefined') {
        console.error('[Anton] Three.js not loaded');
        window.AntonVisualizer = function () {
            this.useFallback = true;
            this.start = this.stop = this.resize = function () {};
        };
        return;
    }

    // ===== 调色板 =====
    var PALETTE = {
        warmGray:    0x8c8273,
        warmGrayL:   0xa39886,
        terraCotta:  0xcc6b4f,
        terraCottaD: 0xa0522d,
        darkGold:    0xb8860b,
        darkGoldL:   0xd4a574,
        coolBlue:    0x6b7b8d,
        coolBlueL:   0x8899aa,
        bg:          0x0a0a0a
    };

    var PALETTE_COLORS = [
        PALETTE.warmGray, PALETTE.warmGrayL,
        PALETTE.terraCotta, PALETTE.terraCottaD,
        PALETTE.darkGold, PALETTE.darkGoldL,
        PALETTE.coolBlue, PALETTE.coolBlueL
    ];

    // ===== AntonVisualizer =====
    function AntonVisualizer(canvas) {
        this.canvas = canvas;
        this.useFallback = false;

        this._running = false;
        this._mode = 'normal';          // 'normal' | 'air-resonance'
        this._animationId = null;
        this._audioBuffer = new Uint8Array(128);

        // Three.js 组件
        this._renderer = null;
        this._scene = null;
        this._camera = null;
        this._mesh = null;
        this._originalPositions = null;
        this._particles = null;
        this._particlePositions = null;
        this._particleVelocities = null;
        this._particleSizes = null;
        this._clock = new THREE.Clock();

        // 动态状态
        this.energy = 0;
        this.low = 0;
        this.mid = 0;
        this.high = 0;
        this._smoothEnergy = 0;
        this._hue = 0;
        this._colorShift = 0;

        this._init();
    }

    // ===== 初始化 =====
    AntonVisualizer.prototype._init = function () {
        var canvas = this.canvas;
        var w = window.innerWidth;
        var h = window.innerHeight;

        // --- 渲染器 ---
        this._renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });
        this._renderer.setSize(w, h);
        this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this._renderer.toneMappingExposure = 1.2;
        this._renderer.outputEncoding = THREE.sRGBEncoding;

        // --- 场景 ---
        this._scene = new THREE.Scene();
        this._scene.background = new THREE.Color(PALETTE.bg);
        this._scene.fog = new THREE.FogExp2(PALETTE.bg, 0.0025);

        // --- 相机 ---
        var aspect = w / h;
        this._camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 100);
        this._camera.position.set(0, 0, 8);
        this._camera.lookAt(0, 0, 0);

        // --- 灯光 ---
        var ambient = new THREE.AmbientLight(0x404060, 0.4);
        this._scene.add(ambient);

        var mainLight = new THREE.DirectionalLight(0xffeedd, 1.0);
        mainLight.position.set(2, 3, 4);
        this._scene.add(mainLight);

        var fillLight = new THREE.DirectionalLight(0x8888cc, 0.4);
        fillLight.position.set(-2, -1, 2);
        this._scene.add(fillLight);

        var rimLight = new THREE.DirectionalLight(0xccaa88, 0.3);
        rimLight.position.set(0, -2, -3);
        this._scene.add(rimLight);

        // --- 声波雕塑（PlaneGeometry 顶点位移） ---
        this._buildMesh();

        // --- 氛围粒子 ---
        this._buildParticles();

        // --- 窗口变化事件 ---
        var self = this;
        window.addEventListener('resize', function () { self.resize(); });
    };

    // ===== 构建声波雕塑网格 =====
    AntonVisualizer.prototype._buildMesh = function () {
        var segX = 72;
        var segY = 72;
        var geo = new THREE.PlaneGeometry(10, 10, segX, segY);

        // 保存原始位置
        var pos = geo.attributes.position.array;
        this._originalPositions = new Float32Array(pos.length);
        for (var i = 0; i < pos.length; i++) {
            this._originalPositions[i] = pos[i];
        }

        // 存储 UV 坐标作为频率映射参考
        var uvs = geo.attributes.uv.array;

        var mat = new THREE.MeshPhysicalMaterial({
            color: PALETTE.warmGray,
            metalness: 0.65,
            roughness: 0.25,
            clearcoat: 0.1,
            clearcoatRoughness: 0.3,
            side: THREE.DoubleSide,
            wireframe: false,
            transparent: false,
            envMapIntensity: 0.6,
            emissive: new THREE.Color(PALETTE.warmGray),
            emissiveIntensity: 0.02
        });

        this._mesh = new THREE.Mesh(geo, mat);
        this._mesh.rotation.x = -0.3;
        this._mesh.rotation.z = 0.1;
        this._scene.add(this._mesh);
    };

    // ===== 构建粒子系统 =====
    AntonVisualizer.prototype._buildParticles = function () {
        var count = 2500;
        var positions = new Float32Array(count * 3);
        var velocities = new Float32Array(count * 3);
        var sizes = new Float32Array(count);
        var colors = new Float32Array(count * 3);

        var radius = 7;
        var palette = PALETTE_COLORS;

        for (var i = 0; i < count; i++) {
            // 球体内随机分布，偏向表面
            var theta = Math.random() * Math.PI * 2;
            var phi = Math.acos(2 * Math.random() - 1);
            var r = radius * Math.cbrt(0.3 + Math.random() * 0.7);

            positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.cos(phi);
            positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

            // 缓慢随机漂移速度
            velocities[i * 3]     = (Math.random() - 0.5) * 0.003;
            velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.003;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.003;

            sizes[i] = 0.01 + Math.random() * 0.04;

            // 粒子颜色从调色板采样
            var c = new THREE.Color(palette[i % palette.length]);
            c.multiplyScalar(0.5 + Math.random() * 0.5);
            colors[i * 3]     = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
        }

        var geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        var mat = new THREE.PointsMaterial({
            size: 0.035,
            vertexColors: true,
            transparent: true,
            opacity: 0.55,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true
        });

        this._particles = new THREE.Points(geo, mat);
        this._particlePositions = positions;
        this._particleVelocities = velocities;
        this._particleSizes = sizes;
        this._scene.add(this._particles);
    };

    // ===== 音频数据读取 =====
    AntonVisualizer.prototype._readAudio = function () {
        var analyser = this.analyser;
        if (!analyser) return false;

        try {
            analyser.getByteFrequencyData(this._audioBuffer);
        } catch (e) {
            return false;
        }

        var data = this._audioBuffer;
        var len = data.length;

        // 计算各频段能量
        var lowSum = 0, midSum = 0, highSum = 0;
        var totalSum = 0;

        for (var i = 0; i < len; i++) {
            var v = data[i];
            totalSum += v;
            if (i < 16) lowSum += v;
            else if (i < 48) midSum += v;
            else highSum += v;
        }

        var nLow = Math.max(1, 16);
        var nMid = Math.max(1, 32);
        var nHigh = Math.max(1, len - 48);

        this.low = lowSum / nLow / 255;
        this.mid = midSum / nMid / 255;
        this.high = highSum / nHigh / 255;
        this.energy = totalSum / len / 255;

        // 平滑能量
        this._smoothEnergy = this._smoothEnergy * 0.85 + this.energy * 0.15;

        return this.energy > 0.01;
    };

    // ===== 更新声波雕塑顶点 =====
    AntonVisualizer.prototype._updateMesh = function (time, dt) {
        if (!this._mesh || !this._originalPositions) return;

        var geo = this._mesh.geometry;
        var pos = geo.attributes.position.array;
        var orig = this._originalPositions;
        var data = this._audioBuffer;
        var hasAudio = this.energy > 0.01;

        var amplitude = this._mode === 'air-resonance' ? 0.6 : 0.35;
        var freqScale = this._mode === 'air-resonance' ? 1.8 : 1.0;
        var speed = this._mode === 'air-resonance' ? 2.5 : 1.0;

        var len = pos.length / 3;

        for (var i = 0; i < len; i++) {
            var idx = i * 3;
            var ox = orig[idx];
            var oy = orig[idx + 1];

            // UV-like 归一化坐标 (-1..1)
            var u = ox / 5;
            var v = oy / 5;

            // 映射到频率 bin
            var binIdx = Math.floor(((u * 0.5 + 0.5) * 0.6 + (v * 0.5 + 0.5) * 0.4) * 64) % 64;
            var freqVal = hasAudio ? data[binIdx] / 255 : 0;

            // 叠加多频率产生丰富纹理
            var extraFreq1 = hasAudio ? data[(binIdx + 16) % 64] / 255 : 0;
            var extraFreq2 = hasAudio ? data[(binIdx + 32) % 64] / 255 : 0;

            // 时间调制
            var tMod = Math.sin(ox * 0.8 + time * speed) * 0.3 +
                       Math.cos(oy * 0.6 + time * speed * 0.7) * 0.3;

            // 位移量（Z 轴）
            var displacement = (freqVal * 0.6 + extraFreq1 * 0.25 + extraFreq2 * 0.15) * amplitude;
            displacement += tMod * 0.04 * (0.5 + this._smoothEnergy * 2);
            displacement = displacement * 1.8 - 0.1; // center around zero

            pos[idx + 2] = displacement;
        }

        geo.attributes.position.needsUpdate = true;
        geo.computeVertexNormals();

        // 材质颜色随能量变化
        var colorLerp = this._smoothEnergy;
        var baseColor = new THREE.Color(PALETTE.warmGray);
        var targetColor = new THREE.Color(PALETTE.terraCotta);
        var matColor = baseColor.clone().lerp(targetColor, colorLerp * 0.4);
        this._mesh.material.color.copy(matColor);

        // 自发光随能量
        var emissiveColor = new THREE.Color(PALETTE.darkGold);
        this._mesh.material.emissive.copy(emissiveColor);
        this._mesh.material.emissiveIntensity = 0.01 + colorLerp * 0.08;
    };

    // ===== 更新粒子系统 =====
    AntonVisualizer.prototype._updateParticles = function (time, dt) {
        if (!this._particles) return;

        var positions = this._particlePositions;
        var vels = this._particleVelocities;
        var count = positions.length / 3;
        var energyBoost = 1 + this._smoothEnergy * 3;
        var airFactor = this._mode === 'air-resonance' ? 2.0 : 1.0;
        var radiusLimit = 8;

        for (var i = 0; i < count; i++) {
            var idx = i * 3;

            // 速度受音频能量影响
            var speedFactor = (0.5 + this._smoothEnergy * 2) * airFactor;

            // 随机漫步 + 音频驱动的涡流
            var vortexZ = this._smoothEnergy * 0.002 * Math.sin(time * 0.5 + i * 0.01);
            var vortexX = this._smoothEnergy * 0.002 * Math.cos(time * 0.5 + i * 0.01);

            vels[idx]     += (Math.random() - 0.5) * 0.001 * speedFactor + vortexX;
            vels[idx + 1] += (Math.random() - 0.5) * 0.001 * speedFactor;
            vels[idx + 2] += (Math.random() - 0.5) * 0.001 * speedFactor + vortexZ;

            // 阻尼
            vels[idx]     *= 0.99;
            vels[idx + 1] *= 0.99;
            vels[idx + 2] *= 0.99;

            // 更新位置
            positions[idx]     += vels[idx] * energyBoost * 60 * dt;
            positions[idx + 1] += vels[idx + 1] * energyBoost * 60 * dt;
            positions[idx + 2] += vels[idx + 2] * energyBoost * 60 * dt;

            // 边界约束——超出半径则回拉
            var px = positions[idx];
            var py = positions[idx + 1];
            var pz = positions[idx + 2];
            var dist = Math.sqrt(px * px + py * py + pz * pz);

            if (dist > radiusLimit) {
                var scale = radiusLimit / dist;
                positions[idx]     *= scale;
                positions[idx + 1] *= scale;
                positions[idx + 2] *= scale;
                // 反向速度并随机化
                vels[idx]     *= -0.5 + (Math.random() - 0.5) * 0.2;
                vels[idx + 1] *= -0.5 + (Math.random() - 0.5) * 0.2;
                vels[idx + 2] *= -0.5 + (Math.random() - 0.5) * 0.2;
            }
        }

        this._particles.geometry.attributes.position.needsUpdate = true;

        // 粒子透明度随能量
        this._particles.material.opacity = 0.3 + this._smoothEnergy * 0.5;

        // 粒子大小随能量
        var sizeScale = 0.6 + this._smoothEnergy * 1.5;
        this._particles.material.size = 0.035 * sizeScale;
    };

    // ===== 动画循环 =====
    AntonVisualizer.prototype._animate = function () {
        if (!this._running) return;

        var self = this;
        this._animationId = requestAnimationFrame(function () {
            self._animate();
        });

        var dt = Math.min(this._clock.getDelta(), 0.05);
        var time = this._clock.elapsedTime;

        // 读取音频数据
        this._readAudio();

        // 更新声波雕塑
        this._updateMesh(time, dt);

        // 更新粒子
        this._updateParticles(time, dt);

        // 缓慢旋转场景
        var rotSpeed = 0.02 + this._smoothEnergy * 0.04;
        if (this._mesh) {
            this._mesh.rotation.y += rotSpeed * dt;
        }

        // 相机轻微呼吸运动（air-resonance 模式更敏感）
        var breatheAmp = this._mode === 'air-resonance' ? 0.3 : 0.1;
        if (this._camera) {
            this._camera.position.x = Math.sin(time * 0.1) * breatheAmp;
            this._camera.position.y = Math.cos(time * 0.07) * breatheAmp * 0.5;
            this._camera.lookAt(0, 0, 0);
        }

        // 渲染
        if (this._renderer && this._scene && this._camera) {
            this._renderer.render(this._scene, this._camera);
        }
    };

    // ===== analyser getter =====
    Object.defineProperty(AntonVisualizer.prototype, 'analyser', {
        get: function () {
            return window.state && window.state.analyser ? window.state.analyser : null;
        }
    });

    // ===== 外部接口 =====

    /**
     * 启动可视化
     */
    AntonVisualizer.prototype.start = function () {
        if (this._running) return;
        this._running = true;
        this._clock.start();
        this._animate();
    };

    /**
     * 停止可视化
     */
    AntonVisualizer.prototype.stop = function () {
        this._running = false;
        if (this._animationId) {
            cancelAnimationFrame(this._animationId);
            this._animationId = null;
        }
        this._clock.stop();
    };

    /**
     * 响应窗口尺寸变化
     */
    AntonVisualizer.prototype.resize = function () {
        if (!this._renderer || !this._camera) return;
        var w = window.innerWidth;
        var h = window.innerHeight;
        this._renderer.setSize(w, h);
        this._camera.aspect = w / h;
        this._camera.updateProjectionMatrix();
    };

    /**
     * 切换模式
     * @param {'normal'|'air-resonance'} mode
     */
    AntonVisualizer.prototype.setMode = function (mode) {
        if (mode === 'normal' || mode === 'air-resonance') {
            this._mode = mode;
        }
    };

    /**
     * 应用风格（与 HydraVisualizer 接口对齐）
     * @param {string} styleId
     */
    AntonVisualizer.prototype.applyStyle = function (styleId) {
        if (styleId === 'air-resonance') {
            this.setMode('air-resonance');
        } else {
            this.setMode('normal');
        }
    };

    /**
     * 智能推荐（与 HydraVisualizer 接口对齐）
     */
    AntonVisualizer.prototype.getSmartStyle = function () {
        var nextMode = this._mode === 'normal' ? 'air-resonance' : 'normal';
        return { id: nextMode, name: nextMode === 'air-resonance' ? '空气共鸣' : '标准' };
    };

    /**
     * 风格网格渲染（与 HydraVisualizer 接口对齐，Anton 版空实现）
     */
    AntonVisualizer.prototype.renderStyleGrid = function () {};

    /**
     * 风格网格更新（与 HydraVisualizer 接口对齐，Anton 版空实现）
     */
    AntonVisualizer.prototype.updateStyleGrid = function () {};

    /**
     * 清理资源
     */
    AntonVisualizer.prototype.dispose = function () {
        this.stop();

        if (this._mesh) {
            this._mesh.geometry.dispose();
            this._mesh.material.dispose();
        }
        if (this._particles) {
            this._particles.geometry.dispose();
            this._particles.material.dispose();
        }
        if (this._renderer) {
            this._renderer.dispose();
        }

        this._scene = null;
        this._camera = null;
        this._renderer = null;
        this._mesh = null;
        this._particles = null;
    };

    window.AntonVisualizer = AntonVisualizer;
})();