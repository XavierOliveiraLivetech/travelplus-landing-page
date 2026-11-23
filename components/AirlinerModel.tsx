const BODY = "#f6f3ee";
const ACCENT = "#d87020";
const WING = "#ece6f8";
const METAL = "#2a2150";

/** Shared 3D airliner. Nose points along local -Z. */
export function AirlinerModel() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.04]}>
        <capsuleGeometry args={[0.13, 0.92, 8, 20]} />
        <meshStandardMaterial color={BODY} roughness={0.32} metalness={0.18} />
      </mesh>
      <mesh position={[0, 0, -0.62]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.13, 0.28, 20]} />
        <meshStandardMaterial color={ACCENT} roughness={0.38} metalness={0.22} />
      </mesh>
      <mesh position={[0, 0.08, -0.46]}>
        <boxGeometry args={[0.12, 0.05, 0.1]} />
        <meshStandardMaterial color={METAL} roughness={0.15} metalness={0.55} />
      </mesh>
      <mesh position={[0, -0.01, 0.02]}>
        <boxGeometry args={[1.55, 0.07, 0.34]} />
        <meshStandardMaterial color={WING} roughness={0.4} metalness={0.12} />
      </mesh>
      <mesh position={[0.46, -0.08, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 0.26, 14]} />
        <meshStandardMaterial color={METAL} roughness={0.28} metalness={0.62} />
      </mesh>
      <mesh position={[-0.46, -0.08, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 0.26, 14]} />
        <meshStandardMaterial color={METAL} roughness={0.28} metalness={0.62} />
      </mesh>
      <mesh position={[0, 0.2, 0.52]}>
        <boxGeometry args={[0.03, 0.34, 0.22]} />
        <meshStandardMaterial color={ACCENT} roughness={0.4} metalness={0.16} />
      </mesh>
      <mesh position={[0, 0.05, 0.56]}>
        <boxGeometry args={[0.55, 0.025, 0.16]} />
        <meshStandardMaterial color={BODY} roughness={0.35} metalness={0.16} />
      </mesh>
    </group>
  );
}
