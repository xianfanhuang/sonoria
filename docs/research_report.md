# Sonoria v3.0 多元资源池方案调研报告

## 1. 调研背景
Sonoria v3.0 旨在从单一的生成式合成音频（v2.1）演进为支持流媒体、AI 生成、以及无版权资源池的多元音频架构，同时通过 Three.js 和 Meyda.js 提升视觉体验。

## 2. 方案对比表

| 维度 | 全球音乐电台 (Radio) | AI 自研声景 (AI Gen) | 无版权资源池 (CC0) |
| :--- | :--- | :--- | :--- |
| **音频来源** | SomaFM, Radio Garden | Tone.js, Magenta.js | FMA, Incompetech |
| **接入技术** | MediaElementAudioSourceNode | Web Audio API / MIDI | AudioBufferSourceNode |
| **稳定性** | 取决于网络，需断线重连 | 极高（本地计算） | 高（CDN 加速） |
| **版权状态** | 第三方授权流 | 完全自主/开源协议 | CC0 / 免版税 |
| **交互性** | 低（仅展示元数据） | 极高（实时参数控制） | 中（可分层混合） |

## 3. 技术栈决策

### 3.1 音频引擎：Tone.js 迁移
- **原因**：原生 Web Audio API 开发效率低，Tone.js 提供了成熟的调度器、合成器组件和效果器链。
- **集成**：通过 `Tone.ExternalAudio` 或 `Tone.Context` 与现有代码共存。

### 3.2 空间音频：PannerNode (HRTF)
- **方案**：利用 Web Audio API 原生 `PannerNode`，设置 `panningModel: 'HRTF'` 实现 3D 空间定位。

### 3.3 特征提取：Meyda.js
- **优势**：比单纯使用 `AnalyserNode` 获取的 `getByteFrequencyData` 更精准。支持 `rms`, `zcr`, `spectralCentroid`, `loudness` 等特征。
- **用途**：驱动 Shader 的复杂变量。

### 3.4 视觉表现：Three.js + Shaders
- **核心**：`BufferGeometry` + `Points` 构建粒子系统。
- **性能**：移动端通过减少粒子数量 (Count) 和简化 Shader 计算进行降级。

## 4. 风险清单

| 风险项 | 等级 | 应对策略 |
| :--- | :--- | :--- |
| **跨域 (CORS)** | 高 | 电台流媒体接入必须支持 CORS，或通过后端 Proxy 转发。 |
| **内存泄漏** | 中 | 切换场景时必须显式销毁 Three.js 资源 (Geometry/Material/Texture) 和 Tone.js 实例。 |
| **移动端性能** | 高 | 设定性能基准测试，WebGL 不可用时自动降级至 v2.1 的 Canvas 2D 引擎。 |
| **API 条款变更** | 低 | 优先选择 SomaFM 等对开发者友好的公共 API，避免深度耦合。 |

## 5. 参考资料
- [SomaFM API Documentation](https://somafm.com/api/)
- [Tone.js Official Docs](https://tonejs.github.io/)
- [Meyda.js Features](https://meyda.js.org/audio-features)
- [Three.js Points Documentation](https://threejs.org/docs/#api/en/objects/Points)
