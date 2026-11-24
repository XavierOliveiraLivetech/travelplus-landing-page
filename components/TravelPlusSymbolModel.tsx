"use client";

import { useEffect, useMemo } from "react";
import { Box3, DoubleSide, ExtrudeGeometry, MeshStandardMaterial } from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

/** TravelPlus symbol (the "plane" mark), as drawn in the brand SVG. */
const SYMBOL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="171 597 504 276">
<path fill="#965123" d="M513.572,710.633c-61.748,7.259-87.846,9.112-149.536,26.266-14.423-26.751-41.766-75.573-42.604-76.411h42.151l70.769,51.112,79.22-.968Z"/>
<path fill="#d87225" d="M672.411,709.572c0,29.311-23.728,53.084-53.038,53.084h-58.249l-12.841,61.134c-6.002,28.705-34.149,47.083-62.808,41.035l-6.374-1.349,21.169-100.819h-18.424c-178.188,4.421-298.081,64.064-308.782,69.601,8.7-5.63,89.754-54.632,192.518-90.583,39.852-13.942,135.432-30.241,145.621-30.986l13.492-64.296c6.002-28.706,34.149-47.037,62.808-41.035l6.374,1.349-21.587,102.865h100.12Z"/>
</svg>`;

/** SVG units → scene units: the mark is ~1.45 wide, like the old airliner. */
const SCALE = 0.0029;

function buildSymbol() {
  const data = new SVGLoader().parse(SYMBOL_SVG);
  const parts: { geometry: ExtrudeGeometry; material: MeshStandardMaterial }[] = [];
  for (const path of data.paths) {
    const material = new MeshStandardMaterial({
      color: path.color,
      roughness: 0.4,
      metalness: 0.2,
      side: DoubleSide,
    });
    for (const shape of SVGLoader.createShapes(path)) {
      const geometry = new ExtrudeGeometry(shape, {
        depth: 18,
        bevelEnabled: true,
        bevelThickness: 4,
        bevelSize: 3,
        bevelSegments: 3,
      });
      parts.push({ geometry, material });
    }
  }
  // Centre the mark on the origin so it spins / tilts around its middle.
  const box = new Box3();
  for (const { geometry } of parts) {
    geometry.computeBoundingBox();
    if (geometry.boundingBox) box.union(geometry.boundingBox);
  }
  const cx = (box.min.x + box.max.x) / 2;
  const cy = (box.min.y + box.max.y) / 2;
  const cz = (box.min.z + box.max.z) / 2;
  for (const { geometry } of parts) geometry.translate(-cx, -cy, -cz);
  return parts;
}

/**
 * Extruded TravelPlus symbol. Same frame as the old airliner model: the
 * front of the mark points along local -Z, up is +Y, and the flat face
 * looks along ±X (sideways), so it can be swapped in as-is.
 */
export function TravelPlusSymbolModel() {
  const parts = useMemo(() => buildSymbol(), []);

  useEffect(
    () => () => {
      const materials = new Set<MeshStandardMaterial>();
      for (const { geometry, material } of parts) {
        geometry.dispose();
        materials.add(material);
      }
      materials.forEach((material) => material.dispose());
    },
    [parts],
  );

  return (
    // SVG y points down: flip it. Then turn the mark's front (+X) to -Z.
    <group rotation={[0, Math.PI / 2, 0]}>
      <group scale={[SCALE, -SCALE, SCALE]}>
        {parts.map(({ geometry, material }, i) => (
          <mesh key={i} geometry={geometry} material={material} />
        ))}
      </group>
    </group>
  );
}
