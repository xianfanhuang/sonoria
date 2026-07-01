/**
 * Visualization Styles & Emotion System v7.0
 * Sonoria — 情感感知可视化风格配置
 *
 * 每种风格定义：
 *   - id, name, nameEn, category, description
 *   - emotion: 对应情感状态 (serene | energized | tender | focused)
 *   - gpuReq, performanceLevel, energyRange, bpmRange
 *   - render(hue, low, mid, high, energy) — Hydra GPU 渲染
 *
 * 情感系统：
 *   serene    → 宁静 (青色)  — 流动、星云、液体类
 *   energized → 活力 (金色)  — 频谱、脉冲、漩涡类
 *   tender    → 温柔 (玫瑰)  — 花朵、微光、柔波类
 *   focused   → 专注 (紫色)  — 神经、几何、矩阵类
 */

window.visualStyles = [
    /* ===================== SERENE ===================== */
    {
        id: 'aurora',
        name: '极光',
        nameEn: 'Aurora',
        category: 'Nature',
        description: 'Flowing colorful light curtains',
        emotion: 'serene',
        gpuReq: 'medium',
        energyRange: [0, 1],
        bpmRange: [60, 180],
        performanceLevel: 2,
        render: function (hue, low, mid, high, energy) {
            this.osc(10, 0.1, function () { return low * 2; })
              .rotate(function () { return window.time * 0.2; })
              .modulate(this.noise(3, 0.5), function () { return energy * 0.5; })
              .color(function () { return hue / 360; }, 0.8, 0.6)
              .blend(this.osc(20, 0.05).color(0.6, 0.8, 1), 0.3)
              .out();
        }
    },
    {
        id: 'nebula',
        name: '星云',
        nameEn: 'Nebula',
        category: 'Cosmos',
        description: 'Drifting cosmic gas clouds',
        emotion: 'serene',
        gpuReq: 'medium',
        energyRange: [0, 0.5],
        bpmRange: [60, 120],
        performanceLevel: 2,
        render: function (hue, low, mid, high, energy) {
            this.osc(5, 0.2, function () { return low; })
              .modulate(this.noise(2, 0.3), 0.5)
              .color(function () { return hue / 360; }, 0.5, 0.9)
              .brightness(function () { return energy * 0.2; })
              .out();
        }
    },
    {
        id: 'liquid',
        name: '液体',
        nameEn: 'Liquid',
        category: 'Fluid',
        description: 'Liquid metal ripples',
        emotion: 'serene',
        gpuReq: 'medium',
        energyRange: [0.2, 0.9],
        bpmRange: [80, 160],
        performanceLevel: 2,
        render: function (hue, low, mid, high, energy) {
            this.gradient()
              .modulate(this.osc(5, 0.1, function () { return high * 3; }), 0.2)
              .color(function () { return hue / 360; }, 0.8, 1)
              .contrast(1.5)
              .brightness(function () { return energy * 0.3; })
              .out();
        }
    },
    {
        id: 'flow',
        name: '流动',
        nameEn: 'Flow',
        category: 'Fluid',
        description: 'Smooth morphing flow fields',
        emotion: 'serene',
        gpuReq: 'high',
        energyRange: [0.2, 0.8],
        bpmRange: [80, 140],
        performanceLevel: 3,
        render: function (hue, low, mid, high, energy) {
            this.noise(3, 0.4)
              .modulate(this.osc(2, 0.1, function () { return mid; }), 0.4)
              .color(function () { return hue / 360; }, 0.6, 0.7)
              .blend(this.noise(4, 0.3).color(function () { return (hue / 360 + 0.1) % 1; }, 0.5, 0.8), 0.3)
              .out();
        }
    },
    {
        id: 'bloom',
        name: '花绽',
        nameEn: 'Bloom',
        category: 'Nature',
        description: 'Organic bloom patterns',
        emotion: 'tender',
        gpuReq: 'medium',
        energyRange: [0, 0.7],
        bpmRange: [60, 120],
        performanceLevel: 2,
        render: function (hue, low, mid, high, energy) {
            this.shape(6, function () { return 0.3 + mid * 0.4; }, 0.3)
              .rotate(function () { return window.time * 0.05; })
              .modulate(this.noise(2, 0.3), function () { return low * 0.3; })
              .color(function () { return (hue + 20) / 360; }, 0.7, 0.8)
              .blend(this.shape(4, function () { return 0.2 + high * 0.3; }).color(function () { return hue / 360; }, 0.5, 0.9), 0.4)
              .out();
        }
    },

    /* ===================== ENERGIZED ===================== */
    {
        id: 'spectrum',
        name: '频谱',
        nameEn: 'Spectrum',
        category: 'Audio',
        description: 'Reactive frequency bars',
        emotion: 'energized',
        gpuReq: 'low',
        energyRange: [0, 1],
        bpmRange: [60, 200],
        performanceLevel: 1,
        render: function (hue, low, mid, high, energy) {
            this.noise(64, 0.05)
              .thresh(function () { return 0.3 + energy * 0.4; })
              .color(function () { return hue / 360; }, 0.9, 0.7)
              .add(this.noise(32, 0.1).thresh(0.6).color(function () { return (hue + 30) / 360; }, 0.7, 1), 0.3)
              .out();
        }
    },
    {
        id: 'pulse',
        name: '脉冲',
        nameEn: 'Pulse',
        category: 'Geometric',
        description: 'Radial burst from center',
        emotion: 'energized',
        gpuReq: 'low',
        energyRange: [0.3, 1],
        bpmRange: [90, 200],
        performanceLevel: 1,
        render: function (hue, low, mid, high, energy) {
            this.shape(12, function () { return 0.5 + low * 0.5; }, 0)
              .scale(function () { return 0.5 + low * 0.7; })
              .repeat(1, 1)
              .color(function () { return hue / 360; }, 0.9, 0.7)
              .contrast(1.3)
              .out();
        }
    },
    {
        id: 'vortex',
        name: '漩涡',
        nameEn: 'Vortex',
        category: 'Fluid',
        description: 'Spinning energy vortex',
        emotion: 'energized',
        gpuReq: 'medium',
        energyRange: [0.4, 1],
        bpmRange: [100, 200],
        performanceLevel: 2,
        render: function (hue, low, mid, high, energy) {
            this.noise(4, 0.3)
              .rotate(function () { return window.time * 0.4 + mid * 0.8; })
              .modulate(this.osc(3, 0.1, function () { return low; }), 0.3)
              .color(function () { return hue / 360; }, 0.8, 0.7)
              .contrast(1.4)
              .out();
        }
    },
    {
        id: 'flame',
        name: '火焰',
        nameEn: 'Flame',
        category: 'Element',
        description: 'Audio-reactive flames',
        emotion: 'tender',
        gpuReq: 'medium',
        energyRange: [0.2, 1],
        bpmRange: [80, 180],
        performanceLevel: 2,
        render: function (hue, low, mid, high, energy) {
            this.noise(4, 0.2)
              .rotate(function () { return window.time * 0.05; })
              .modulate(this.noise(3, function () { return 0.1 + energy * 0.3; }), 0.2)
              .color(function () { return (hue - 20) / 360; }, 0.9, 0.7)
              .brightness(function () { return energy * 0.4; })
              .out();
        }
    },

    /* ===================== FOCUSED ===================== */
    {
        id: 'cosmic',
        name: '宇宙',
        nameEn: 'Cosmic',
        category: 'Cosmos',
        description: 'Infinite starfield particles',
        emotion: 'focused',
        gpuReq: 'low',
        energyRange: [0, 0.7],
        bpmRange: [60, 140],
        performanceLevel: 1,
        render: function (hue, low, mid, high, energy) {
            this.noise(100, 0.1)
              .thresh(function () { return 0.5 + low * 0.5; })
              .scale(1, 1, 2)
              .color(function () { return hue / 360; }, 0.4, 1)
              .add(this.noise(80, 0.2).thresh(0.7).color(function () { return (hue + 60) / 360; }, 0.7, 1), 0.5)
              .out();
        }
    },
    {
        id: 'neural',
        name: '神经',
        nameEn: 'Neural',
        category: 'Digital',
        description: 'Dynamic neural network',
        emotion: 'focused',
        gpuReq: 'high',
        energyRange: [0.3, 1],
        bpmRange: [90, 160],
        performanceLevel: 3,
        render: function (hue, low, mid, high, energy) {
            this.shape(4, 0.02, 0)
              .repeat(20, 20)
              .modulate(this.noise(2, 0.3), function () { return mid * 0.3; })
              .color(function () { return hue / 360; }, 0.7, 0.5)
              .blend(this.shape(3, 0.01).repeat(15, 15).color(function () { return (hue + 40) / 360; }, 0.6, 0.4), 0.4)
              .out();
        }
    },
    {
        id: 'crystal',
        name: '水晶',
        nameEn: 'Crystal',
        category: 'Geometric',
        description: 'Refracting crystal geometry',
        emotion: 'focused',
        gpuReq: 'medium',
        energyRange: [0.2, 0.8],
        bpmRange: [70, 150],
        performanceLevel: 2,
        render: function (hue, low, mid, high, energy) {
            this.shape(6, function () { return 0.1 + mid * 0.15; }, 0)
              .rotate(function () { return window.time * 0.08; })
              .scale(function () { return 0.8 + mid * 0.4; })
              .color(function () { return hue / 360; }, 0.7, 0.8)
              .modulate(this.osc(20, 0.1), 0.02)
              .out();
        }
    },
    {
        id: 'matrix',
        name: '矩阵',
        nameEn: 'Matrix',
        category: 'Digital',
        description: 'Digital rain cascade',
        emotion: 'focused',
        gpuReq: 'low',
        energyRange: [0.1, 0.9],
        bpmRange: [80, 180],
        performanceLevel: 1,
        render: function (hue, low, mid, high, energy) {
            this.noise(200, 0.05)
              .thresh(0.8)
              .color(function () { return hue / 360; }, 0.9, 0.6)
              .add(this.noise(150, 0.1).thresh(0.8).color(function () { return (hue + 30) / 360; }, 0.6, 0.8), 0.4)
              .out();
        }
    }
];

/* Build themes registry for backward compat */
window.themes = window.visualStyles.map(function (st) {
    return {
        id:    st.id,
        name:  st.name,
        nameEn: st.nameEn,
        emotion: st.emotion
    };
});

/* Emotion label map */
window.EMOTION_LABELS = {
    serene:    'Serene',
    energized: 'Energized',
    tender:    'Tender',
    focused:   'Focused'
};
