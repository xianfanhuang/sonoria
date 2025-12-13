// This function converts a function into a Blob URL for Web Worker usage
export const createWorker = () => {
  const workerCode = `
    self.onmessage = function(e) {
        const { sigma, rho, beta, dt, steps, bass, mid, high, variant } = e.data;
        
        let x = 0.1, y = 0, z = 0;
        const points = [];
        
        // Normalize audio data
        const bassNorm = bass / 255;
        const midNorm = mid / 255;
        const highNorm = high / 255;
        
        // Dynamic parameters based on audio
        const adjRho = rho + midNorm * 15;
        const adjDt = dt + bassNorm * 0.005;
        
        for(let i = 0; i < steps; i++) {
            const dx = sigma * (y - x) * adjDt;
            const dy = (x * (adjRho - z) - y) * adjDt;
            const dz = (x * y - beta * z) * adjDt;
            
            x += dx;
            y += dy;
            z += dz;
            
            // Variant logic
            if (variant === 'symmetric' && Math.random() > 0.7) {
                x = -x;
            }
            
            if (variant === 'turbulent') {
                const turbulence = highNorm * 0.1;
                x += (Math.random() - 0.5) * turbulence;
                y += (Math.random() - 0.5) * turbulence;
                z += (Math.random() - 0.5) * turbulence;
            }
            
            // Boundary clamping to prevent infinite growth
            const maxVal = 80;
            x = Math.max(-maxVal, Math.min(maxVal, x));
            y = Math.max(-maxVal, Math.min(maxVal, y));
            z = Math.max(-maxVal, Math.min(maxVal, z));
            
            points.push(x, y, z);
        }
        
        // Return Float32Array for performance
        self.postMessage({ points: new Float32Array(points) });
    };
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};
