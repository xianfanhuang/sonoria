    HydraVisualizer.prototype.resize = function () {
        if (this.hydra && typeof this.hydra.resize === 'function') {
            this.hydra.resize(window.innerWidth, window.innerHeight);
        }
        if (this.ctx2d && this.canvas2d) {
            this.canvas2d.width = window.innerWidth;
            this.canvas2d.height = window.innerHeight;
        }
    };
