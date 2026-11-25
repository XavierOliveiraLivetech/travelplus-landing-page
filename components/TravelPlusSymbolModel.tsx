"use client";

import { useEffect, useMemo } from "react";
import {
  Box3,
  type BufferGeometry,
  DoubleSide,
  ExtrudeGeometry,
  LatheGeometry,
  MeshStandardMaterial,
  Vector2,
} from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

/** TravelPlus symbol (the "plane" mark), as drawn in the brand SVG. */
const SYMBOL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="171 597 504 276">
<path fill="#965123" d="M513.572,710.633c-61.748,7.259-87.846,9.112-149.536,26.266-14.423-26.751-41.766-75.573-42.604-76.411h42.151l70.769,51.112,79.22-.968Z"/>
<path fill="#d87225" d="M672.411,709.572c0,29.311-23.728,53.084-53.038,53.084h-58.249l-12.841,61.134c-6.002,28.705-34.149,47.083-62.808,41.035l-6.374-1.349,21.169-100.819h-18.424c-178.188,4.421-298.081,64.064-308.782,69.601,8.7-5.63,89.754-54.632,192.518-90.583,39.852-13.942,135.432-30.241,145.621-30.986l13.492-64.296c6.002-28.706,34.149-47.037,62.808-41.035l6.374,1.349-21.587,102.865h100.12Z"/>
</svg>`;

/** SVG units → scene units: the mark is ~1.45 wide, like the old airliner. */
const SCALE = 0.0029;

/** Extrusion of the flat mark (wings, fins), in SVG units. */
const DEPTH = 28;
const BEVEL_THICKNESS = 5;

/**
 * Fuselage: the horizontal bar of the mark (SVG y ≈ 709–763, nose at
 * x ≈ 672) is wrapped in a round body so the plane reads as a cylinder,
 * not a flat cut-out. The radius is a bit over half the bar's height so
 * the extruded slab's edges stay hidden inside it.
 */
const BODY_AXIS_Y = 735.85;
const BODY_RADIUS = 43;
const BODY_COLOR = "#d87225";

/** Tail cone: from its tip (radius 0) to the start of the full-width body. */
const TAIL_TIP_X = 425;
const TAIL_ROOT_X = 545;

/** Side profile of the fuselage as [radius, position along SVG x]. */
function fuselageProfile() {
  const r = BODY_RADIUS;
  const points: Vector2[] = [];
  // Tail cone: one smooth curve (no kinks) from a fine point at the tail to
  // the full radius, like an airliner's tapered tail section.
  const tailSteps = 24;
  for (let i = 0; i <= tailSteps; i += 1) {
    const s = i / tailSteps; // 0 = tip, 1 = root
    const radius = r * Math.pow(1 - Math.pow(1 - s, 1.9), 0.62);
    points.push(new Vector2(radius, TAIL_TIP_X + (TAIL_ROOT_X - TAIL_TIP_X) * s));
  }
  // Rounded nose: half an ellipse past the mark's front edge.
  const noseStart = 668;
  const noseLength = 56;
  const steps = 12;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const angle = (t * Math.PI) / 2;
    points.push(
      new Vector2(r * Math.cos(angle), noseStart + noseLength * Math.sin(angle)),
    );
  }
  return points;
}

function buildFuselage() {
  const geometry = new LatheGeometry(FUSELAGE_PROFILE, 48);
  // Lathe revolves around +Y: lay it along +X (the mark's front), on the bar.
  geometry.rotateZ(-Math.PI / 2);
  geometry.translate(0, BODY_AXIS_Y, DEPTH / 2);
  const material = new MeshStandardMaterial({
    color: BODY_COLOR,
    roughness: 0.38,
    metalness: 0.2,
    side: DoubleSide,
  });
  return { geometry, material };
}

const FUSELAGE_PROFILE = fuselageProfile();

/** Fuselage radius at SVG x (0 outside the body). */
function fuselageRadiusAt(x: number) {
  const pts = FUSELAGE_PROFILE;
  if (x <= pts[0].y || x >= pts[pts.length - 1].y) return 0;
  for (let i = 1; i < pts.length; i += 1) {
    const a = pts[i - 1];
    const b = pts[i];
    if (x <= b.y) {
      const t = b.y > a.y ? (x - a.y) / (b.y - a.y) : 0;
      return a.x + (b.x - a.x) * t;
    }
  }
  return 0;
}

/**
 * Wing / fin thickness. Like a real airliner, the flying surfaces are much
 * thinner than the fuselage: they leave the body at a slim root and thin
 * out to a sharp edge at the tips. Inside the body they stay at the root
 * thickness, so nothing pokes through the round fuselage or its tail cone.
 */
/** Half-thickness at the wing root, in SVG units. */
const ROOT_HALF_THICKNESS = 9;
/** Distance from the body surface over which the surfaces thin out. */
const TAPER_LENGTH = 95;
/** Share of the root thickness left at the very tips. */
const TIP_THICKNESS = 0.2;

/** Distance from (x, y) to the fuselage surface; 0 when inside it. */
function distanceOutsideBody(x: number, y: number) {
  const dy = Math.abs(y - BODY_AXIS_Y);
  const radius = fuselageRadiusAt(x);
  if (radius > 0) return Math.max(0, dy - radius);
  // Behind the tail tip: distance to the tip point.
  const tipX = FUSELAGE_PROFILE[0].y;
  return x < tipX ? Math.hypot(tipX - x, dy) : dy;
}

function taperTowardsTips(geometry: BufferGeometry) {
  const position = geometry.getAttribute("position");
  const midZ = DEPTH / 2;
  const fullHalf = DEPTH / 2 + BEVEL_THICKNESS;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const t = Math.min(1, distanceOutsideBody(x, y) / TAPER_LENGTH);
    // Ease-out: thins quickly off the body, then runs out to a fine edge.
    const eased = 1 - (1 - t) * (1 - t);
    const half = ROOT_HALF_THICKNESS * (1 - (1 - TIP_THICKNESS) * eased);
    position.setZ(i, midZ + (position.getZ(i) - midZ) * (half / fullHalf));
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
}

function buildSymbol() {
  const data = new SVGLoader().parse(SYMBOL_SVG);
  const parts: {
    geometry: BufferGeometry;
    material: MeshStandardMaterial;
  }[] = [];
  for (const path of data.paths) {
    const material = new MeshStandardMaterial({
      color: path.color,
      roughness: 0.4,
      metalness: 0.2,
      side: DoubleSide,
    });
    for (const shape of SVGLoader.createShapes(path)) {
      const geometry = new ExtrudeGeometry(shape, {
        depth: DEPTH,
        bevelEnabled: true,
        bevelThickness: BEVEL_THICKNESS,
        bevelSize: 3,
        bevelSegments: 4,
        curveSegments: 24,
      });
      taperTowardsTips(geometry);
      parts.push({ geometry, material });
    }
  }
  // Centre the mark on the origin so it spins / tilts around its middle.
  // Measured on the flat mark only, so the fuselage keeps the same pivot.
  const box = new Box3();
  for (const { geometry } of parts) {
    geometry.computeBoundingBox();
    if (geometry.boundingBox) box.union(geometry.boundingBox);
  }
  parts.push(buildFuselage());
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
