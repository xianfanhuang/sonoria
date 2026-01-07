import React, { useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG, THEME_COLORS } from '../constants';
import { VisualizerParams, AudioData } from '../types';

interface VisualizerProps {
  params: VisualizerParams;
  audioData: AudioData;
  worker: Worker | null;
}

const Visualizer: React.FC<VisualizerProps> = ({ params, audioData, worker }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  
  // Use a large buffer for the points
  const maxPoints = CONFIG.MAX_POINTS;
  const positions = useMemo(() => new Float32Array(maxPoints * 3), [maxPoints]);
  const currentPointIndex = useRef(0);

  // Update geometry when worker sends data
  useEffect(() => {
    if (!worker) return;

    const handleMessage = (e: MessageEvent) => {
      const newPoints = e.data.points as Float32Array;
      if (!geometryRef.current) return;

      const positionAttribute = geometryRef.current.attributes.position as THREE.Float32BufferAttribute;
      const array = positionAttribute.array as Float32Array;

      // Append new points to the circular buffer
      const pointCount = newPoints.length / 3;
      
      for (let i = 0; i < newPoints.length; i++) {
        // Simple circular buffer logic
        const index = (currentPointIndex.current * 3 + i) % array.length;
        array[index] = newPoints[i];
      }

      currentPointIndex.current = (currentPointIndex.current + pointCount) % maxPoints;
      
      // Mark for update
      positionAttribute.needsUpdate = true;
    };

    worker.onmessage = handleMessage;
  }, [worker, maxPoints]);

  // Send data to worker every frame & animate
  useFrame(() => {
    if (worker) {
      worker.postMessage({
        sigma: params.sigma,
        rho: params.rho,
        beta: CONFIG.LORENZ.BETA,
        dt: CONFIG.LORENZ.DT,
        steps: CONFIG.LORENZ.STEPS,
        bass: audioData.bass,
        mid: audioData.mid,
        high: audioData.high,
        variant: params.variant
      });
    }

    if (pointsRef.current) {
      const baseColor = new THREE.Color(THEME_COLORS[params.mood]);
      const hsl = { h: 0, s: 0, l: 0 };
      baseColor.getHSL(hsl);
      
      // Shift hue slightly with highs
      const hueShift = (audioData.high / 255) * 0.1;
      (pointsRef.current.material as THREE.PointsMaterial).color.setHSL(hsl.h + hueShift, hsl.s, params.colorblind ? 0.8 : 0.6);
      
      // Rotate the entire system slowly + extra rotation on mid range energy
      const rotationSpeed = 0.001 + (audioData.mid / 255) * 0.01;
      pointsRef.current.rotation.y += rotationSpeed;

      // RHYTHM: Pulse scale based on bass
      // Base scale 1.0, adds up to 0.4 based on bass intensity
      const targetScale = 1.0 + (audioData.bass / 255) * 0.4;
      // Linear interpolation for smooth but punchy motion
      pointsRef.current.scale.lerp({ x: targetScale, y: targetScale, z: targetScale } as any, 0.2);
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
          usage={35048} // DynamicDrawUsage
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.4}
        color={THEME_COLORS[params.mood]}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        sizeAttenuation={false}
        depthWrite={false}
      />
    </points>
  );
};

export default Visualizer;