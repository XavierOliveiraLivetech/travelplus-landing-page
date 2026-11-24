"use client";

import { Canvas } from "@react-three/fiber";
import { TravelPlusSymbolModel } from "./TravelPlusSymbolModel";
import styles from "./StepsPlaneFlight.module.css";

/**
 * Same TravelPlus symbol as the features globe, facing right so the flight
 * path rotation can point it along the steps.
 */
export function StoryAirliner() {
  return (
    <Canvas
      className={styles.planeCanvas}
      dpr={[1, 1.75]}
      // The scene never changes (the flight moves and tilts the wrapper with
      // CSS), so draw only on mount / resize instead of 60 times a second.
      frameloop="demand"
      gl={{ alpha: true, antialias: true }}
      camera={{ position: [0.15, 0.55, 3.6], fov: 32 }}
      // The wrapper is rotated with CSS to follow the path. Measure its layout
      // size (offsetWidth/Height), not the rotated bounding box, so the canvas
      // — and the plane — keep the same size at every tilt.
      resize={{ offsetSize: true }}
      style={{ pointerEvents: "none", zIndex: 1 }}
    >
      <ambientLight intensity={1.05} />
      <directionalLight position={[3, 4, 5]} intensity={1.5} />
      <directionalLight position={[-2, -1, -2]} intensity={0.35} />
      <group rotation={[0.12, -Math.PI / 2, 0]} scale={0.62}>
        <TravelPlusSymbolModel />
      </group>
    </Canvas>
  );
}
