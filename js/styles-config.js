/**
 * Visualization Styles
 * Hydra 渲染函数（GPU 模式）和风格元数据
 *
 * 每种风格都定义了：
 *   - id, name, category, description（UI 展示）
 *   - gpuReq, energyRange, bpmRange, performanceLevel（智能推荐依据）
 *   - render(hue, low, mid, high, energy)（Hydra 输出）
 *
 * Canvas 2D 降级时，渲染函数不直接使用，但风格 id/name 仍生效
 * （Canvas 2D 渲染器在 visualizer.js 中按 styleId 分支处理）
 */
window.visualStyles = [
    {
        id: 'aurora', name: '极光', category: '自然', gpuReq: 'medium',
        description: '流动的彩色光带',
        energyRange: [0, 1], bpmRange: [60, 180], performanceLevel: 2,
        render: function (hue, low, mid, high, energy) {
            s.osc(10, 0.1, function () { return low * 2; })
              .rotate(function () { return time * 0.2; })
              .modulate(s.noise(3, 0.5), function () { return energy * 0.5; })
              .color(function () { return hue % 360 / 360; }, 0.8, 0.6)
              .blend(s.osc(20, 0.05).color(0.6, 0.8, 1), 0.3)
              .out();
        }
    },
    {
        id: 'cosmic', name: '宇宙', category: '宇宙', gpuReq: 'low',
        description: '闪烁的星空粒子',
        energyRange: [0, 0.7], bpmRange: [60, 140], performanceLevel: 1,
        render: function (hue, low, mid, high, energy) {
            s.noise(100, 0.1)
              .thresh(function () { return 0.5 + low * 0.5; })
              .scale(1, 1, 2)
              .color(0.7, 0.3, 1)
              .add(s.noise(80, 0.2).thresh(0.7).color(0.3, 0.7, 1), 0.5)
              .out();
        }
    },
    {
        id: 'neural', name: '神经', category: '几何', gpuReq: 'high',
        description: '动态神经网络',
        energyRange: [0.3, 1], bpmRange: [90, 160], performanceLevel: 3,
        render: function (hue, low, mid, high, energy) {
            s.shape(4, 0.02, 0)
              .repeat(20, 20)
              .modulate(s.noise(2, 0.3), function () { return mid * 0.3; })
              .color(1, 0.2, 0.4)
              .blend(s.shape(3, 0.01).repeat(15, 15).color(0.8, 0.1, 0.3), 0.4)
              .out();
        }
    },
    {
        id: 'liquid', name: '液体', category: '流体', gpuReq: 'medium',
        description: '液态金属波纹',
        energyRange: [0.2, 0.9], bpmRange: [80, 160], performanceLevel: 2,
        render: function (hue, low, mid, high, energy) {
            s.gradient()
              .modulate(s.osc(5, 0.1, function () { return high * 3; }), 0.2)
              .color(0.5, 0.8, 1)
              .contrast(1.5)
              .brightness(function () { return energy * 0.3; })
              .out();
        }
    },
    {
        id: 'spectrum', name: '频谱', category: '频谱', gpuReq: 'low',
        description: '响应式频谱柱',
        energyRange: [0, 1], bpmRange: [60, 200], performanceLevel: 1,
        render: function (hue, low, mid, high, energy) {
            s.noise(64, 0.05)
              .thresh(function () { return 0.3 + energy * 0.4; })
              .color(function () { return hue % 360 / 360; }, 0.8, 0.6)
              .add(s.noise(32, 0.1).thresh(0.6).color(0.3, 0.7, 1), 0.3)
              .out();
        }
    },
    {
        id: 'nebula', name: '星云', category: '宇宙', gpuReq: 'medium',
        description: '流动的星云气体',
        energyRange: [0, 0.5], bpmRange: [60, 120], performanceLevel: 2,
        render: function (hue, low, mid, high, energy) {
            s.osc(5, 0.2, function () { return low; })
              .modulate(s.noise(2, 0.3), 0.5)
              .color(0.8, 0.3, 0.9)
              .brightness(function () { return energy * 0.2; })
              .out();
        }
    },
    {
        id: 'crystal', name: '水晶', category: '几何', gpuReq: 'medium',
        description: '折射的水晶结构',
        energyRange: [0.2, 0.8], bpmRange: [70, 150], performanceLevel: 2,
        render: function (hue, low, mid, high, energy) {
            s.shape(6, 0.1, 0)
              .rotate(function () { return time * 0.1; })
              .scale(function () { return 0.8 + mid * 0.4; })
              .color(function () { return hue % 360 / 360; }, 0.7, 0.8)
              .out();
        }
    },
    {
        id: 'matrix', name: '矩阵', category: '数字', gpuReq: 'low',
        description: '数字雨效果',
        energyRange: [0.1, 0.9], bpmRange: [80, 180], performanceLevel: 1,
        render: function (hue, low, mid, high, energy) {
            s.noise(200, 0.05)
              .thresh(0.8)
              .color(0, 1, 0)
              .add(s.noise(150, 0.1).thresh(0.8).color(0.8, 0.9, 1), 0.5)
              .out();
        }
    },
    {
        id: 'flow', name: '流动', category: '流体', gpuReq: 'high',
        description: '平滑的流体运动',
        energyRange: [0.2, 0.8], bpmRange: [80, 140], performanceLevel: 3,
        render: function (hue, low, mid, high, energy) {
            s.noise(3, 0.4)
              .modulate(s.osc(2, 0.1, function () { return mid; }), 0.4)
              .color(function () { return hue % 360 / 360; }, 0.6, 0.7)
              .blend(s.noise(4, 0.3).color(function () { return (hue % 360 / 360 + 0.1) % 1; }, 0.5, 0.8), 0.3)
              .out();
        }
    },
    {
        id: 'pulse', name: '脉冲', category: '几何', gpuReq: 'low',
        description: '中心扩散的脉冲波',
        energyRange: [0.3, 1], bpmRange: [90, 160], performanceLevel: 1,
        render: function (hue, low, mid, high, energy) {
            s.shape(10, 0.02, 0)
              .scale(function () { return 0.5 + low * 0.5; })
              .color(function () { return hue % 360 / 360; }, 0.8, 0.6)
              .out();
        }
    },
    {
        id: 'vortex', name: '漩涡', category: '流体', gpuReq: 'medium',
        description: '旋转的能量漩涡',
        energyRange: [0.4, 1], bpmRange: [100, 180], performanceLevel: 2,
        render: function (hue, low, mid, high, energy) {
            s.noise(4, 0.3)
              .rotate(function () { return time * 0.3 + mid * 0.5; })
              .modulate(s.osc(3, 0.1, function () { return low; }), 0.3)
              .color(function () { return hue % 360 / 360; }, 0.7, 0.6)
              .out();
        }
    }
];

window.themes = window.visualStyles.map(function (st) {
    return {
        id: st.id,
        name: st.name,
        color: 'hsl(' + Math.random() * 360 + ', 80%, 60%)'
    };
});
