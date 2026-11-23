"use client";

import { useGSAP } from "@gsap/react";
import { Canvas, useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { useLayoutEffect, useRef } from "react";
import type { Group } from "three";
import { AirlinerModel } from "./AirlinerModel";
import styles from "./FeaturesDial.module.css";

gsap.registerPlugin(useGSAP);

/**
 * GSAP has no 3D mesh library, and React has no built-in airplane.
 * The same airliner mesh orbits this globe and flies the steps section.
 * A depth-only sphere matches the SVG globe so the plane slips behind it.
 */
const ORBIT = 1.52;
const TILT = 0.38;
const CAMERA_Z = 7.5;
const CAMERA_FOV = 32;

function OrbitingPlane({
  reduced,
  paused,
}: {
  reduced: boolean;
  paused: boolean;
}) {
  const rig = useRef<Group>(null);
  const angle = useRef(0.9);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  useGSAP(() => {
    if (reduced) return;
    const motion = { a: angle.current };
    const tween = gsap.to(motion, {
      paused,
      a: angle.current + Math.PI * 2,
      duration: 11,
      repeat: -1,
      ease: "none",
      onUpdate: () => {
        angle.current = motion.a;
      },
    });
    tweenRef.current = tween;
    return () => {
      tween.kill();
      tweenRef.current = null;
    };
    // `paused` is applied below without restarting the lap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  useLayoutEffect(() => {
    tweenRef.current?.paused(paused);
  }, [paused]);

  useLayoutEffect(() => {
    rig.current?.traverse((obj) => {
      obj.renderOrder = 2;
    });
  }, []);

  useFrame(() => {
    const group = rig.current;
    if (!group) return;
    const a = angle.current;
    const x = Math.cos(a) * ORBIT;
    const y = Math.sin(a) * Math.sin(TILT) * ORBIT;
    const z = Math.sin(a) * Math.cos(TILT) * ORBIT;
    const dx = -Math.sin(a);
    const dy = Math.cos(a) * Math.sin(TILT);
    const dz = Math.cos(a) * Math.cos(TILT);
    group.position.set(x, y, z);
    // Object3D.lookAt aims +Z at the target; the nose sits on local -Z.
    group.lookAt(x - dx, y - dy, z - dz);
    group.rotateZ(-0.15);
  });

  return (
    <group ref={rig}>
      <group scale={0.44}>
        <AirlinerModel />
      </group>
    </group>
  );
}

function GlobeOccluder() {
  return (
    <mesh renderOrder={-1}>
      <sphereGeometry args={[1.015, 48, 48]} />
      <meshBasicMaterial colorWrite={false} depthWrite />
    </mesh>
  );
}

export function GlobeFlight({
  reduced,
  paused,
}: {
  /** prefers-reduced-motion: the plane stays parked on the globe. */
  reduced: boolean;
  /** The visitor clicked the globe: the plane holds where it is. */
  paused: boolean;
}) {
  const still = reduced || paused;

  return (
    <Canvas
      className={styles.globeCanvas}
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: "180%",
        height: "180%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        overflow: "visible",
        zIndex: 1,
      }}
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: true, premultipliedAlpha: true }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
      camera={{ position: [0, 0.12, CAMERA_Z], fov: CAMERA_FOV }}
      // Nothing moves: only re-render when something changes (e.g. resize).
      frameloop={still ? "demand" : "always"}
    >
      <ambientLight intensity={0.92} />
      <directionalLight position={[4, 5, 6]} intensity={1.45} />
      <directionalLight position={[-4, -2, -3]} intensity={0.4} />
      <GlobeOccluder />
      <OrbitingPlane reduced={reduced} paused={paused} />
    </Canvas>
  );
}
