/**
 * Audio Engine
 * 音频播放核心：URL/文件播放、麦克风、Strudel 协调、播放控制
 *
 * 暴露：window.AudioEngine
 *
 * 关键设计（修复根因）：
 *   - initContext() 返回 Promise，确保 await ctx.resume() 完成后再播放
 *   - Strudel 协调通过依赖注入的 strudelEngine（避免全局 hush 缺失）
 *   - 播放/暂停/切换都先 await resume，防止 autoplay 策略阻断
 *   - v6.0.2: 移除默认 analyser→destination 连接，解决麦克风窜音
 */
(function () {
    'use strict';
    function AudioEngine(viz, strudelEngine) {
        this.viz = viz;
        this.strudel = strudelEngine;
        this._init();
    }
    AudioEngine.prototype._init = function () {
        // AudioContext 懒创建：首次交互时建立
        window.SonoriaUtils.hideLoading();
    };
    // 统一异步 AudioContext 初始化（之前 initContext / initContextAsync 重复定义）
    AudioEngine.prototype.initContext = function () {
        var self = this;
        return new Promise(function (resolve) {
            if (!window.state.ctx) {
                window.state.ctx = new (window.AudioContext || window.webkitAudioContext)();
                window.state.analyser = window.state.ctx.createAnalyser();
                window.state.analyser.fftSize = 2048;
                window.state.analyser.smoothingTimeConstant = 0.8;

                window.state.gainNode = window.state.ctx.createGain();
                window.state.gainNode.connect(window.state.ctx.destination);

                // v6.0.2: 移除默认连接，避免麦克风直通扬声器
                // 音乐播放时手动连接 destination（见 playTrack/_doPlayUrl）
                // Air Resonance 只连 analyser，无声音输出（正确行为）
            }
            if (window.state.ctx.state === 'suspended') {
                window.state.ctx.resume().then(resolve).catch(function (e) {
                    console.warn('AudioContext resume failed:', e);
                    resolve();
                });
            } else {
                resolve();
            }
        });
    };
    AudioEngine.prototype.playUrl = function (url) {
        if (!url) return;
        var self = this;
        this.stop(false);
        window.SonoriaUtils.showToast('正在请求音频流...');
        this.initContext().then(function () {
            self._doPlayUrl(url);
        });
    };
    AudioEngine.prototype._doPlayUrl = function (url) {
        var self = this;
        var fileName = url.split('/').pop().split('?')[0] || 'Network Stream';
        window.state.playlist.push({ name: fileName, src: url, isUrl: true });
        window.state.trackIdx = window.state.playlist.length - 1;
        this.renderPlaylist();
        window.state.audioEl = new Audio();
        window.state.audioEl.crossOrigin = 'anonymous';
        window.state.audioEl.src = url;
        this._setupAudioListeners(window.state.audioEl, fileName);
        window.state.audioEl.play()
            .then(function () {
                self.startUI();
                try {
                    window.state.src = window.state.ctx.createMediaElementSource(
                        window.state.audioEl
                    );
                    window.state.src.connect(window.state.analyser);
                    // v6.0.2: 音乐播放时连接 gainNode (进而连接 destination)
                    window.state.src.connect(window.state.gainNode);
                } catch (e) {
                    console.warn('CORS limitation', e);
                    window.SonoriaUtils.showToast('受源站限制，仅播放音频');
                }
            })
            .catch(function (e) {
                console.error(e);
                window.SonoriaUtils.showToast('无法加载链接 (CORS/404)');
                window.state.playlist.pop();
                self.renderPlaylist();
                self.stopUI();
            });
        var drawer = document.getElementById('input-drawer');
        if (drawer) drawer.classList.remove('open');
        var urlInput = document.getElementById('url-input');
        if (urlInput) urlInput.value = '';
    };
    AudioEngine.prototype._setupAudioListeners = function (el, title) {
        var self = this;
        el.onended = function () { self.playNext(); };
        this._bindEvents(el);
        this.updateMeta(title, 'Network Audio');
        el.onerror = function () {
            window.SonoriaUtils.showToast('链接无效或拒绝访问');
            self.stopUI();
        };
    };
    AudioEngine.prototype.handleFiles = function (files) {
        var self = this;
        var newTracks = Array.from(files).map(function (f) {
            return {
                name: f.name.replace(/\.[^/.]+$/, ''),
                src: URL.createObjectURL(f)
            };
        });
        if (window.state.playlist.length === 0) {
            window.state.playlist = newTracks;
            this.playTrack(0);
        } else {
            window.state.playlist.push.apply(window.state.playlist, newTracks);
            window.SonoriaUtils.showToast('已添加 ' + newTracks.length + ' 首歌曲');
        }
        this.renderPlaylist();
        var drawer = document.getElementById('input-drawer');
        if (drawer && drawer.classList.contains('open')) {
            window.SonoriaUI && window.SonoriaUI.toggleDrawer('input-drawer');
        }
    };
    AudioEngine.prototype.playTrack = function (idx) {
        if (idx < 0 || idx >= window.state.playlist.length) return;
        var self = this;
        window.state.trackIdx = idx;
        var track = window.state.playlist[idx];
        this.stop(false);
        this.initContext().then(function () {
            window.state.audioEl = new Audio(track.src);
            window.state.audioEl.crossOrigin = 'anonymous';
            window.state.audioEl.onended = function () { self.playNext(); };
            try {
                window.state.src = window.state.ctx.createMediaElementSource(
                    window.state.audioEl
                );
                window.state.src.connect(window.state.analyser);
                // v6.0.2: 音乐播放时连接 gainNode (进而连接 destination)
                window.state.src.connect(window.state.gainNode);
            } catch (e) {
                console.warn('Viz connect fail');
            }
            window.state.audioEl.play()
                .then(function () {
                    self._bindEvents(window.state.audioEl);
                    self.updateMeta(
                        track.name,
                        'Track ' + (idx + 1) + ' / ' + window.state.playlist.length
                    );
                    self.startUI();
                    self.renderPlaylist();
                })
                .catch(function (e) {
                    console.error('Play failed:', e);
                    window.SonoriaUtils.showToast('播放失败');
                });
        });
    };
    AudioEngine.prototype.playNext = function () {
        if (window.state.strudelPlaying || window.state.playlist.length === 0) return;
        this.playTrack((window.state.trackIdx + 1) % window.state.playlist.length);
    };
    AudioEngine.prototype.playPrev = function () {
        if (window.state.strudelPlaying || window.state.playlist.length === 0) return;
        this.playTrack(
            (window.state.trackIdx - 1 + window.state.playlist.length) % window.state.playlist.length
        );
    };
    AudioEngine.prototype.toggleMic = function () {
        var self = this;
        if (window.state.mic) { this.stop(); return; }
        this.stop();
        this.initContext().then(function () {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(function (stream) {
                    window.state.micStream = stream;
                    window.state.src = window.state.ctx.createMediaStreamSource(stream);
                    // v6.0.2: Air Resonance 只连 analyser（无 destination），避免窜音
                    window.state.src.connect(window.state.analyser);
                    window.state.mic = true;
                    self.updateMeta('Air Resonance', 'Listening...');
                    var micBtn = window.ui.mic || document.getElementById('mic-btn');
                    if (micBtn) micBtn.classList.add('mic-active');
                    self.startUI();
                })
                .catch(function () {
                    window.SonoriaUtils.showToast('需要麦克风权限');
                });
        });
    };
    AudioEngine.prototype.togglePlay = function () {
        var self = this;
        this.initContext().then(function () {
            if (window.state.mic) { self.toggleMic(); return; }
            if (window.state.strudelPlaying) {
                window.SonoriaUI && window.SonoriaUI.stopStrudel();
                return;
            }
            if (!window.state.audioEl) {
                if (window.state.playlist.length > 0) {
                    self.playTrack(window.state.trackIdx);
                } else {
                    window.SonoriaUI && window.SonoriaUI.toggleDrawer('input-drawer');
                    window.SonoriaUtils.showToast('请添加音乐或运行Strudel代码');
                }
                return;
            }
            if (window.state.playing) {
                window.state.audioEl.pause();
                self.stopUI();
            } else {
                window.state.audioEl.play()
                    .then(function () { self.startUI(); })
                    .catch(function (e) {
                        console.error('Play failed:', e);
                        window.SonoriaUtils.showToast('播放被阻止，请再次点击');
                    });
            }
        });
    };
    AudioEngine.prototype.stop = function (clear) {
        if (clear === undefined) clear = true;
        if (window.state.strudelPlaying) {
            // 用 strudelEngine.hush() 替换全局 hush
            if (this.strudel && this.strudel.hush) {
                this.strudel.hush();
            }
            window.state.strudelPlaying = false;
        }
        if (window.state.audioEl) {
            window.state.audioEl.pause();
            window.state.audioEl = null;
        }
        if (window.state.src) {
            try { window.state.src.disconnect(); } catch (e) { /* noop */ }
            window.state.src = null;
        }
        if (window.state.micStream) {
            window.state.micStream.getTracks().forEach(function (t) { t.stop(); });
            window.state.micStream = null;
        }
        if (window.state.mic) {
            window.state.mic = false;
            var micBtn = window.ui.mic || document.getElementById('mic-btn');
            if (micBtn) micBtn.classList.remove('mic-active');
        }
        if (clear) { this.stopUI(); this.viz.stop(); }
    };
    AudioEngine.prototype._bindEvents = function (el) {
        el.ontimeupdate = function () {
            if (!window.state.playing || window.state.strudelPlaying) return;
            var pct = el.currentTime / el.duration || 0;
            if (window.ui.pFill)        window.ui.pFill.style.width = (pct * 100) + '%';
            if (window.ui.cTime)        window.ui.cTime.innerText = window.SonoriaUtils.fmt(el.currentTime);
            if (window.ui.ringProgress) window.ui.ringProgress.style.strokeDashoffset = 100 - (pct * 100);
        };
        el.onloadedmetadata = function () {
            if (window.ui.tTime) window.ui.tTime.innerText = window.SonoriaUtils.fmt(el.duration);
        };
    };
    AudioEngine.prototype.removeTrack = function (idx) {
        if (idx < 0 || idx >= window.state.playlist.length) return;
        var track = window.state.playlist[idx];

        // Revoke Object URL if it's a local file to prevent memory leak
        if (track.src && track.src.indexOf('blob:') === 0) {
            URL.revokeObjectURL(track.src);
        }

        window.state.playlist.splice(idx, 1);

        if (window.state.trackIdx === idx) {
            this.stop(false);
            if (window.state.playlist.length > 0) {
                window.state.trackIdx = window.state.trackIdx % window.state.playlist.length;
                this.renderPlaylist();
                this.updateMeta('Track Removed', 'Select another track');
            } else {
                window.state.trackIdx = 0;
                this.renderPlaylist();
                this.updateMeta('Sonoria', 'Add music to begin');
            }
        } else {
            if (window.state.trackIdx > idx) {
                window.state.trackIdx--;
            }
            this.renderPlaylist();
        }
        window.SonoriaUtils.showToast('Track removed');
    };
    AudioEngine.prototype.renderPlaylist = function () {
        var plView = window.ui.plView || document.getElementById('playlist-view');
        if (!plView) return;
        if (window.state.playlist.length === 0) {
            plView.innerHTML = '<div class="pl-empty">No tracks yet — add music below</div>';
            return;
        }
        plView.innerHTML = window.state.playlist.map(function (t, i) {
            var isActive = i === window.state.trackIdx;
            return '<div class="pl-item ' + (isActive ? 'active' : '') +
                '" role="option" aria-selected="' + isActive + '"' +
                ' tabindex="0" onclick="engine.playTrack(' + i + ')"' +
                ' onkeypress="if(event.key===\'Enter\')engine.playTrack(' + i + ')">' +
                '<i class="material-icons-round pl-icon">' +
                (isActive ? 'equalizer' : 'music_note') +
                '</i>' +
                '<span class="pl-name">' + t.name + '</span>' +
                '<i class="material-icons-round pl-remove" title="Remove" onclick="event.stopPropagation(); engine.removeTrack(' + i + ')" style="font-size: 18px; opacity: 0.5; padding: 4px;">close</i>' +
                '</div>';
        }).join('');
    };
    AudioEngine.prototype.updateMeta = function (t, a) {
        if (window.ui.title)  window.ui.title.innerText  = t;
        if (window.ui.cText)  window.ui.cText.innerText  = t;
        if (window.ui.artist) window.ui.artist.innerText = a;
    };
    AudioEngine.prototype.startUI = function () {
        window.state.playing = true;
        var btns = window.ui.playBtns || window.ui.playBtn || [];
        btns.forEach(function (b) {
            if (b) b.innerHTML = '<i class="material-icons-round">pause</i>';
        });
        var mainPlay = document.getElementById('main-play');
        if (mainPlay) mainPlay.classList.add('playing');
        if (window.ui.card) window.ui.card.classList.add('breathing');
        this.viz.start();
        window.SonoriaUI && window.SonoriaUI.resetZen();
    };
    AudioEngine.prototype.stopUI = function () {
        window.state.playing = false;
        var btns = window.ui.playBtns || window.ui.playBtn || [];
        btns.forEach(function (b) {
            if (b) b.innerHTML = '<i class="material-icons-round">play_arrow</i>';
        });
        var mainPlay = document.getElementById('main-play');
        if (mainPlay) mainPlay.classList.remove('playing');
        if (window.ui.card) window.ui.card.classList.remove('breathing');
        if (window.ui.shell) window.ui.shell.classList.remove('zen');
        if (window.ui.pFill) window.ui.pFill.style.width = '0%';
        if (window.ui.cTime) window.ui.cTime.innerText = '0:00';
        if (window.ui.tTime) window.ui.tTime.innerText = '0:00';
        if (window.ui.ringProgress) window.ui.ringProgress.style.strokeDashoffset = 100;
    };
    window.AudioEngine = AudioEngine;
})();
