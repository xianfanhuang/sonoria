/**
 * State Fields
 * 全局状态字段（不查 DOM，DOM refs 在 main.js bootstrap 时填充）
 */
window.state = {
    playing: false,
    mic: false,
    mode: 'aurora',
    zenTimer: null,
    ctx: null,
    analyser: null,
    src: null,
    audioEl: null,
    micStream: null,
    playlist: [],
    trackIdx: 0,
    touchStartX: 0,
    strudelPlaying: false,
    strudelRepl: null,
    strudelReady: null,
    strudelConnected: false,  // v6.0.3: 标记 Strudel 输出是否已连接到 destination
    devicePerformance: (window.webglSupport && window.webglSupport.level) || 2
};

// window.ui 占位（DOM refs 在 main.js bootstrap 时填充）
window.ui = {
    _pending: true
};
